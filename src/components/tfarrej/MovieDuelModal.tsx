'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Swords, Trophy, ArrowUp, ArrowDown, Minus, Undo2, Check, Sparkles,
  Film, Clapperboard, Star, ChevronRight, RotateCcw, X, Rocket
} from 'lucide-react';
import {
  DuelMovieItem,
  DuelSessionState,
  createInitialDuelSession,
  createIncrementalDuelSession,
  processDuelDecision,
  undoDuelDecision,
  calculateRankMovements,
  RankMovement,
} from '@/lib/movie-duel-engine';
import { useAuth } from '@/hooks/use-auth';
import { saveMonthlyMovieRanking, getStoredMovieRanking, MonthlyMovieRanking } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface MovieDuelModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string; // e.g. "2026-09"
  monthName?: string; // e.g. "Septembre 2026"
  seenMovies: DuelMovieItem[]; // All seen movies for this month
  existingRanking?: MonthlyMovieRanking | null;
  onRankingSaved?: (ranking: MonthlyMovieRanking) => void;
}

export function MovieDuelModal({
  isOpen,
  onOpenChange,
  monthKey,
  monthName,
  seenMovies,
  existingRanking,
  onRankingSaved,
}: MovieDuelModalProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<DuelSessionState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWinnerSide, setSelectedWinnerSide] = useState<'A' | 'B' | null>(null);

  // Classement effectif (prop direct ou depuis le stockage local/cloud)
  const effectiveExistingRanking = useMemo(() => {
    return existingRanking || getStoredMovieRanking(monthKey, userProfile);
  }, [existingRanking, monthKey, userProfile]);

  // Déterminer s'il s'agit d'un reclassement incrémental ou d'un premier classement
  const { isIncrementalMode, unrankedMovies, rankedTitles } = useMemo(() => {
    const currentRanked = effectiveExistingRanking?.rankedTitles || [];
    if (currentRanked.length > 0) {
      const rankedSet = new Set(currentRanked);
      const unranked = seenMovies.filter(m => !rankedSet.has(m.title));
      return {
        isIncrementalMode: unranked.length > 0,
        unrankedMovies: unranked,
        rankedTitles: currentRanked,
      };
    }
    return {
      isIncrementalMode: false,
      unrankedMovies: seenMovies,
      rankedTitles: [],
    };
  }, [effectiveExistingRanking, seenMovies]);

  // Initialisation de la session de duel à l'ouverture
  useEffect(() => {
    if (!isOpen) {
      setSession(null);
      setSelectedWinnerSide(null);
      return;
    }

    // 1. Si un classement existe déjà et aucun nouveau film en attente : afficher directement le classement finalisé !
    if (effectiveExistingRanking && unrankedMovies.length === 0) {
      const existingCatalog: Record<string, DuelMovieItem> = {};
      seenMovies.forEach(m => { existingCatalog[m.title] = m; });
      effectiveExistingRanking.rankedTitles.forEach(title => {
        if (!existingCatalog[title]) {
          existingCatalog[title] = { title };
        }
      });

      setSession({
        mode: 'incremental',
        sortedTitles: effectiveExistingRanking.rankedTitles,
        pendingItems: [],
        currentCandidate: null,
        low: 0,
        high: 0,
        mid: 0,
        activeDuel: null,
        history: [],
        stepNumber: 0,
        estimatedTotalSteps: 0,
        isFinished: true,
        initialRankedTitles: effectiveExistingRanking.initialRankedTitles || effectiveExistingRanking.rankedTitles,
        newlyAddedTitles: effectiveExistingRanking.newlyAddedTitles || [],
        movieCatalog: existingCatalog,
      });
      return;
    }

    // 2. Mode Incrémental : affronter les nouveaux films vus aux films déjà classés
    if (isIncrementalMode && effectiveExistingRanking && unrankedMovies.length > 0) {
      const existingCatalog: Record<string, DuelMovieItem> = {};
      seenMovies.forEach(m => { existingCatalog[m.title] = m; });
      effectiveExistingRanking.rankedTitles.forEach(title => {
        if (!existingCatalog[title]) {
          existingCatalog[title] = { title };
        }
      });

      const newSession = createIncrementalDuelSession(
        effectiveExistingRanking.rankedTitles,
        unrankedMovies,
        existingCatalog
      );
      setSession(newSession);
      return;
    }

    // 3. Mode Initial : tri complet depuis zéro (si au moins 2 films)
    if (seenMovies.length >= 2) {
      const newSession = createInitialDuelSession(seenMovies);
      setSession(newSession);
      return;
    }

    // 4. Moins de 2 films et aucun classement : session informative
    const emptyCatalog: Record<string, DuelMovieItem> = {};
    seenMovies.forEach(m => { emptyCatalog[m.title] = m; });
    setSession({
      mode: 'initial',
      sortedTitles: seenMovies.map(m => m.title),
      pendingItems: [],
      currentCandidate: null,
      low: 0,
      high: 0,
      mid: 0,
      activeDuel: null,
      history: [],
      stepNumber: 0,
      estimatedTotalSteps: 0,
      isFinished: true,
      initialRankedTitles: seenMovies.map(m => m.title),
      newlyAddedTitles: [],
      movieCatalog: emptyCatalog,
    });
  }, [isOpen, isIncrementalMode, effectiveExistingRanking, unrankedMovies, seenMovies]);

  // Sauvegarde synchrone et persistante (Multi-couches : LocalStorage + IndexedDB + Firestore)
  const executeSaveRanking = useCallback(async (
    targetSession: DuelSessionState,
    options?: { notifyToast?: boolean; closeModal?: boolean }
  ) => {
    if (!targetSession || !targetSession.isFinished) return;

    const effectiveUid = user?.uid || userProfile?.uid || 'guest';
    setIsSaving(true);
    try {
      const now = Date.now();
      const isFirstPublish = !effectiveExistingRanking;

      const rankingPayload: MonthlyMovieRanking = {
        monthKey,
        rankedTitles: targetSession.sortedTitles,
        publishedAt: effectiveExistingRanking?.publishedAt || now,
        updatedAt: now,
        initialRankedTitles: effectiveExistingRanking?.initialRankedTitles || targetSession.sortedTitles,
        newlyAddedTitles: isFirstPublish
          ? []
          : Array.from(new Set([...(effectiveExistingRanking?.newlyAddedTitles || []), ...(targetSession.newlyAddedTitles || [])])),
        hasUpdatesSincePublish: !isFirstPublish && (targetSession.newlyAddedTitles?.length || 0) > 0,
      };

      await saveMonthlyMovieRanking(effectiveUid, rankingPayload);

      if (onRankingSaved) {
        onRankingSaved(rankingPayload);
      }

      if (options?.notifyToast) {
        toast({
          title: isFirstPublish ? "🏆 Classement validé !" : "⚡ Reclassement mis à jour !",
          description: isFirstPublish
            ? "Ton classement officiel est bien sauvegardé pour le Wrap-Up mensuel."
            : `${targetSession.newlyAddedTitles.length} nouveau(x) film(s) intégré(s) avec succès !`,
        });
      }

      if (options?.closeModal) {
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde du classement:", err);
      if (options?.notifyToast) {
        toast({
          title: "Erreur",
          description: "Impossible d'enregistrer le classement.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [user, userProfile, effectiveExistingRanking, monthKey, onRankingSaved, onOpenChange, toast]);

  // Choix utilisateur (Winner: movieA = candidate, movieB = reference)
  const handleChoice = useCallback((side: 'A' | 'B') => {
    if (!session || session.isFinished) return;

    setSelectedWinnerSide(side);

    // Léger délai pour ressentir l'impact visuel
    setTimeout(() => {
      setSelectedWinnerSide(null);
      const winner = side === 'A' ? 'candidate' : 'reference';
      setSession(prev => {
        if (!prev) return null;
        const next = processDuelDecision(prev, winner);
        if (next.isFinished) {
          // Sauvegarde automatique et immédiate dès la fin du duel !
          executeSaveRanking(next, { notifyToast: false, closeModal: false });
        }
        return next;
      });
    }, 180);
  }, [session, executeSaveRanking]);

  // Annuler le dernier duel
  const handleUndo = useCallback(() => {
    if (!session || session.history.length === 0) return;
    setSession(prev => (prev ? undoDuelDecision(prev) : null));
  }, [session]);

  // Raccourcis clavier (Flèche gauche = Film A, Flèche droite = Film B)
  useEffect(() => {
    if (!isOpen || !session || session.isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleChoice('A');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleChoice('B');
      } else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, session, handleChoice, handleUndo]);

  // Calcul des mouvements pour l'animation de classement / déclassement
  const rankMovements: RankMovement[] = useMemo(() => {
    if (!session || !session.isFinished) return [];

    const baseList = effectiveExistingRanking?.initialRankedTitles || session.initialRankedTitles || [];
    return calculateRankMovements(baseList, session.sortedTitles, session.newlyAddedTitles);
  }, [session, effectiveExistingRanking]);

  // Helper pour formater l'affiche
  const getPosterUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('default:')) return null;
    let finalUrl = url;
    if (!url.startsWith('http')) {
      finalUrl = `https://image.tmdb.org/t/p/w500${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
  };

  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[92vh] overflow-hidden p-0 border border-border/40 bg-[#0B0C10] text-white shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col !z-[200]">
        {/* Header néon cinématographique */}
        <div className="relative px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-purple-950/40 to-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 shadow-sm">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                {session.isFinished ? "🏆 Classement Finalisé" : "⚔️ Duel Ciné : Le Grand Choix"}
                {session.mode === 'incremental' && !session.isFinished && (
                  <Badge variant="outline" className="bg-amber-500/20 border-amber-400/40 text-amber-300 text-[10px] font-bold">
                    Reclassement des Nouveaux
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/60">
                {session.isFinished
                  ? `Classement des films vus • ${monthName || monthKey}`
                  : `Vote pour ton film préféré pour affiner la hiérarchie`}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Corps principal : Stage de duel OU Écran de classement animé */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col justify-center items-center relative">
          <AnimatePresence mode="wait">
            {!session.isFinished && session.activeDuel ? (
              <motion.div
                key="duel-stage"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center"
              >
                {/* Barre de progression & étape */}
                <div className="w-full max-w-[560px] mb-3 sm:mb-5 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px] sm:text-xs text-white/60 font-medium">
                    <span className="flex items-center gap-1.5 text-blue-300 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Duel n°{session.stepNumber}
                    </span>
                    <span className="text-white/50">
                      Progression : {Math.min(100, Math.round((session.stepNumber / Math.max(session.stepNumber, session.estimatedTotalSteps)) * 100))}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.round((session.stepNumber / Math.max(session.stepNumber, session.estimatedTotalSteps)) * 100))}%`
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Arène 1 vs 1 : Côte à côte garanti */}
                <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-6 relative items-stretch max-w-[620px]">
                  {/* Carte Film A (Candidat à classer) */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChoice('A')}
                    className={`cursor-pointer rounded-2xl p-2.5 sm:p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between items-center text-center group select-none ${
                      selectedWinnerSide === 'A'
                        ? 'border-blue-400 bg-gradient-to-b from-blue-600/30 via-blue-500/20 to-black/60 shadow-[0_0_40px_rgba(59,130,246,0.55)] scale-[1.03]'
                        : 'border-blue-500/20 hover:border-blue-400/70 bg-gradient-to-b from-blue-950/25 via-white/[0.03] to-black/50 shadow-xl'
                    }`}
                  >
                    {/* Halo lumineux subtil */}
                    <div className="absolute -top-10 -left-10 w-24 sm:w-32 h-24 sm:h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />

                    {/* En-tête de carte */}
                    <div className="w-full flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-[9px] sm:text-[10px] font-extrabold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Film 1
                      </span>
                      <span className="hidden sm:inline-block text-[10px] text-white/40 font-mono">← Gauche</span>
                    </div>

                    {/* Affiche de film */}
                    <div className="relative aspect-[2/3] w-full max-w-[190px] rounded-xl overflow-hidden bg-black/60 shadow-md sm:shadow-lg border border-white/10 group-hover:border-blue-400/50 transition-all">
                      {getPosterUrl(session.activeDuel.movieA.posterUrl) ? (
                        <img
                          src={getPosterUrl(session.activeDuel.movieA.posterUrl)!}
                          alt={session.activeDuel.movieA.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 text-white/40">
                          <Film className="w-8 h-8 sm:w-10 sm:h-10 mb-1 text-blue-400/50" />
                          <span className="text-[10px] sm:text-xs font-semibold line-clamp-2">{session.activeDuel.movieA.title}</span>
                        </div>
                      )}

                      {/* Reflet subtil */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />

                      {session.activeDuel.movieA.watchedInCinema && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-violet-900/90 border border-violet-500/40 text-[8px] sm:text-[9px] font-bold text-violet-200 backdrop-blur-md shadow flex items-center gap-1 z-10">
                          <Clapperboard className="w-2.5 h-2.5" /> Ciné
                        </span>
                      )}
                    </div>

                    {/* Titre & métadonnées */}
                    <div className="w-full mt-2 sm:mt-2.5 flex flex-col items-center">
                      <h4 className="text-xs sm:text-base font-black text-white line-clamp-1 group-hover:text-blue-300 transition-colors w-full px-0.5">
                        {session.activeDuel.movieA.title}
                      </h4>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-xs text-white/50">
                        {session.activeDuel.movieA.year && <span>{session.activeDuel.movieA.year}</span>}
                        {session.activeDuel.movieA.rating && (
                          <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400" /> {session.activeDuel.movieA.rating}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bouton de vote direct */}
                    <Button
                      size="sm"
                      className="mt-2.5 sm:mt-3.5 w-full py-1.5 sm:py-2 text-[11px] sm:text-xs font-black rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/25 active:scale-95 transition-all"
                    >
                      <span className="sm:hidden">Choisir</span>
                      <span className="hidden sm:inline">Préférer ce film</span>
                    </Button>
                  </motion.div>

                  {/* Badge central VS (Visible sur mobile et desktop) */}
                  <div className="absolute left-1/2 top-[38%] sm:top-[40%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 p-[2px] shadow-[0_0_20px_rgba(147,51,234,0.6)]"
                    >
                      <div className="w-full h-full rounded-full bg-[#0B0C10] flex items-center justify-center font-black text-[9px] sm:text-xs tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-white to-purple-300 border border-white/15">
                        VS
                      </div>
                    </motion.div>
                  </div>

                  {/* Carte Film B (Film de référence) */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChoice('B')}
                    className={`cursor-pointer rounded-2xl p-2.5 sm:p-4 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between items-center text-center group select-none ${
                      selectedWinnerSide === 'B'
                        ? 'border-purple-400 bg-gradient-to-b from-purple-600/30 via-purple-500/20 to-black/60 shadow-[0_0_40px_rgba(168,85,247,0.55)] scale-[1.03]'
                        : 'border-purple-500/20 hover:border-purple-400/70 bg-gradient-to-b from-purple-950/25 via-white/[0.03] to-black/50 shadow-xl'
                    }`}
                  >
                    {/* Halo lumineux subtil */}
                    <div className="absolute -top-10 -right-10 w-24 sm:w-32 h-24 sm:h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />

                    {/* En-tête de carte */}
                    <div className="w-full flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-[9px] sm:text-[10px] font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        Film 2
                      </span>
                      <span className="hidden sm:inline-block text-[10px] text-white/40 font-mono">Droite →</span>
                    </div>

                    {/* Affiche de film */}
                    <div className="relative aspect-[2/3] w-full max-w-[190px] rounded-xl overflow-hidden bg-black/60 shadow-md sm:shadow-lg border border-white/10 group-hover:border-purple-400/50 transition-all">
                      {getPosterUrl(session.activeDuel.movieB.posterUrl) ? (
                        <img
                          src={getPosterUrl(session.activeDuel.movieB.posterUrl)!}
                          alt={session.activeDuel.movieB.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-3 text-white/40">
                          <Film className="w-8 h-8 sm:w-10 sm:h-10 mb-1 text-purple-400/50" />
                          <span className="text-[10px] sm:text-xs font-semibold line-clamp-2">{session.activeDuel.movieB.title}</span>
                        </div>
                      )}

                      {/* Reflet subtil */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 pointer-events-none" />

                      {session.activeDuel.movieB.watchedInCinema && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-violet-900/90 border border-violet-500/40 text-[8px] sm:text-[9px] font-bold text-violet-200 backdrop-blur-md shadow flex items-center gap-1 z-10">
                          <Clapperboard className="w-2.5 h-2.5" /> Ciné
                        </span>
                      )}
                    </div>

                    {/* Titre & métadonnées */}
                    <div className="w-full mt-2 sm:mt-2.5 flex flex-col items-center">
                      <h4 className="text-xs sm:text-base font-black text-white line-clamp-1 group-hover:text-purple-300 transition-colors w-full px-0.5">
                        {session.activeDuel.movieB.title}
                      </h4>
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-0.5 text-[10px] sm:text-xs text-white/50">
                        {session.activeDuel.movieB.year && <span>{session.activeDuel.movieB.year}</span>}
                        {session.activeDuel.movieB.rating && (
                          <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400" /> {session.activeDuel.movieB.rating}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bouton de vote direct */}
                    <Button
                      size="sm"
                      className="mt-2.5 sm:mt-3.5 w-full py-1.5 sm:py-2 text-[11px] sm:text-xs font-black rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-md shadow-purple-500/25 active:scale-95 transition-all"
                    >
                      <span className="sm:hidden">Choisir</span>
                      <span className="hidden sm:inline">Préférer ce film</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Barre d'outils du duel (Annuler & indices clavier) */}
                <div className="flex items-center justify-between w-full max-w-[500px] mt-3 sm:mt-5 pt-2.5 sm:pt-3 border-t border-white/10 text-xs text-white/40">
                  <span className="hidden sm:inline">
                    💡 Raccourcis : <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">←</kbd> Film 1 / <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">→</kbd> Film 2
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={session.history.length === 0}
                    className="text-white/60 hover:text-white hover:bg-white/10 ml-auto flex items-center gap-1.5 text-xs py-1 h-8"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Annuler le choix
                  </Button>
                </div>
              </motion.div>
            ) : seenMovies.length < 2 && !existingRanking ? (
              <motion.div
                key="insufficient-stage"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center justify-center p-6 text-center max-w-[420px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30 flex items-center justify-center mb-4 text-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                  <Swords className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">
                  Pas encore assez de films ce mois-ci
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mb-4">
                  Pour comparer tes films en duel et générer ton palmarès officiel du mois ({monthName || monthKey}), tu dois avoir vu au moins 2 films.
                </p>
                <div className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-semibold mb-6 flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-blue-400" />
                  Films vus enregistrés ce mois : <span className="font-bold text-amber-300">{seenMovies.length}</span> / 2
                </div>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-md py-2.5"
                >
                  Compris
                </Button>
              </motion.div>
            ) : (
              /* ÉCRAN DE RÉSULTAT : ANIMATION DE CLASSEMENT ET DÉCLASSEMENT */
              <motion.div
                key="result-stage"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="w-full flex flex-col items-center"
              >
                {/* Podium des 3 premiers */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-black text-white">
                    {session.mode === 'incremental' ? "Classement Réactualisé !" : "Ton Palmarès Officiel !"}
                  </h3>
                </div>
                {/* Badge de confirmation de sauvegarde automatique */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold mb-4 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Classement enregistré et synchronisé</span>
                </motion.div>

                <p className="text-xs text-white/60 text-center max-w-[480px] mb-5">
                  {session.mode === 'incremental'
                    ? "Les nouveaux films ont bousculé les positions ! Observe les montées, descentes et nouvelles entrées ci-dessous."
                    : "Chaque film a trouvé sa place grâce à tes duels. Prêt à publier pour le Wrap-Up ?"}
                </p>

                {/* Liste animée avec Framer Motion layout */}
                <motion.div layout className="w-full max-w-[550px] space-y-2 mb-6">
                  {rankMovements.map((item) => {
                    const movie = session.movieCatalog[item.title];
                    const poster = getPosterUrl(movie?.posterUrl);

                    return (
                      <motion.div
                        key={item.title}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
                          item.currentRank === 1
                            ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                            : item.isNew
                            ? 'bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border-blue-400/40'
                            : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Numéro de rang */}
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                            {item.currentRank === 1 && <span className="text-xl">🥇</span>}
                            {item.currentRank === 2 && <span className="text-xl">🥈</span>}
                            {item.currentRank === 3 && <span className="text-xl">🥉</span>}
                            {item.currentRank > 3 && (
                              <span className="text-white/60 font-bold">#{item.currentRank}</span>
                            )}
                          </div>

                          {/* Mini poster */}
                          <div className="w-8 h-12 rounded-md overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                            {poster ? (
                              <img src={poster} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white/30">
                                <Film className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          {/* Titre & métadonnées */}
                          <div className="min-w-0 text-left">
                            <h4 className="text-sm font-bold text-white truncate max-w-[220px] sm:max-w-[280px]">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-white/50">
                              {movie?.year && <span>{movie.year}</span>}
                              {movie?.watchedInCinema && (
                                <span className="text-violet-300 font-semibold">🎬 Cinéma</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* BADGE D'ANIMATION DE CLASSEMENT / DÉCLASSEMENT */}
                        <div className="flex-shrink-0 flex items-center gap-1.5 pl-2">
                          {item.isNew ? (
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-300 text-xs font-black shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                            >
                              <Rocket className="w-3 h-3 text-blue-300" />
                              Entré #{item.currentRank}
                            </motion.span>
                          ) : item.diff > 0 ? (
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-black shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                              title={`Anciennement #${item.previousRank}`}
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                              +{item.diff}
                            </motion.span>
                          ) : item.diff < 0 ? (
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 text-xs font-black"
                              title={`Anciennement #${item.previousRank}`}
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                              {item.diff}
                            </motion.span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs font-semibold">
                              <Minus className="w-3 h-3" />
                              Stable
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Bouton de confirmation / publication */}
                <div className="w-full max-w-[550px] flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => {
                      if (session) {
                        executeSaveRanking(session, { notifyToast: true, closeModal: true });
                      } else {
                        onOpenChange(false);
                      }
                    }}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold h-12 rounded-2xl shadow-[0_10px_30px_rgba(99,102,241,0.3)] transition-all"
                  >
                    {isSaving ? (
                      "Enregistrement..."
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {effectiveExistingRanking ? "Valider et Fermer" : "Publier pour le Wrap-Up"}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSession(createInitialDuelSession(seenMovies))}
                    className="border-white/20 text-white hover:bg-white/10 rounded-2xl h-12"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recommencer
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
