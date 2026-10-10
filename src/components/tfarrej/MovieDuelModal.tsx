'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Film, Clapperboard, Star, ChevronRight, RotateCcw, X, Rocket, EyeOff, Dna,
  MoreVertical
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
  dismissCandidate,
  removeReferenceFromSession,
  autoResolveSagaDuels,
  createSingleMovieReclassificationSession,
} from '@/lib/movie-duel-engine';
import { useAuth } from '@/hooks/use-auth';
import {
  saveMonthlyMovieRanking,
  getStoredMovieRanking,
  saveMonthlySeriesRanking,
  getStoredSeriesRanking,
  MonthlyMovieRanking,
  isTestMovieTitle,
  backfillMoviePosters,
  removeMovieFromList,
  MovieCategory,
} from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CategoryTabs, CategoryBadge } from '@/components/tfarrej/movie-category-picker';
import { guessMovieCategory } from '@/lib/movie-category-utils';

interface MovieDuelModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: string; // e.g. "2026-09"
  monthName?: string; // e.g. "Septembre 2026"
  seenMovies: DuelMovieItem[]; // All seen movies or series for this month
  existingRanking?: MonthlyMovieRanking | null;
  onRankingSaved?: (ranking: MonthlyMovieRanking) => void;
  initialCategory?: MovieCategory | 'all';
  onOpenDnaModal?: () => void;
  mediaType?: 'movie' | 'tv';
}

export function MovieDuelModal({
  isOpen,
  onOpenChange,
  monthKey,
  monthName,
  seenMovies,
  existingRanking,
  onRankingSaved,
  initialCategory = 'all',
  onOpenDnaModal,
  mediaType = 'movie',
}: MovieDuelModalProps) {
  const isTv = mediaType === 'tv';
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<DuelSessionState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWinnerSide, setSelectedWinnerSide] = useState<'A' | 'B' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MovieCategory | 'all'>(initialCategory || 'all');
  const [reclassifyingCategory, setReclassifyingCategory] = useState<MovieCategory | null>(null);

  // Récupération multi-sources des classements de saga (Profil Firebase + LocalStorage fallback)
  const effectiveSagaRankings = useMemo(() => {
    const fromProfile = userProfile?.sagaRankings || {};
    let fromStorage: Record<string, any> = {};
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('kolyoum_saga_rankings');
        if (raw) fromStorage = JSON.parse(raw);
      } catch {}
    }
    return { ...fromStorage, ...fromProfile };
  }, [userProfile?.sagaRankings]);

  // État du menu contextuel d'action sur un film après appui long
  const [actionMenuMovie, setActionMenuMovie] = useState<{
    title: string;
    currentRank: number;
    posterUrl?: string;
    category?: MovieCategory;
    year?: number;
    rating?: number;
  } | null>(null);

  // Pour animer visuellement le film en cours d'appui long
  const [pressingMovieTitle, setPressingMovieTitle] = useState<string | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Sync category if initialCategory changes
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll au sommet dès que le classement finalisé s'affiche (pour que le #1 soit directement visible)
  useEffect(() => {
    if (session?.isFinished && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [session?.isFinished]);

  // Classement effectif (prop direct ou depuis le stockage local/cloud — tous les mois)
  const effectiveExistingRanking = useMemo(() => {
    const normalizeTitle = (t?: string) => (t || '').toLowerCase().trim().replace(/['’`]/g, "'");
    const rejectedSet = new Set((isTv ? userProfile?.rejectedSeriesTitles : userProfile?.rejectedMovieTitles || []).map(t => normalizeTitle(t)));
    const watchlistSet = new Set((isTv ? userProfile?.seriesToWatch : userProfile?.moviesToWatch || []).map(t => normalizeTitle(t)));

    const sanitize = (r: MonthlyMovieRanking | null): MonthlyMovieRanking | null => {
      if (!r) return null;
      const isValid = (t: string) => {
        if (!t || typeof t !== 'string' || !t.trim()) return false;
        const norm = normalizeTitle(t);
        if (isTestMovieTitle(norm)) return false;
        if (rejectedSet.has(norm)) return false;
        return true;
      };
      return {
        ...r,
        rankedTitles: (r.rankedTitles || []).filter(isValid),
        initialRankedTitles: (r.initialRankedTitles || []).filter(isValid),
        newlyAddedTitles: (r.newlyAddedTitles || []).filter(isValid),
      };
    };

    if (existingRanking) return sanitize(existingRanking);

    // Search across ALL months in profile + localStorage (not just current monthKey)
    const allProfileRankings: MonthlyMovieRanking[] = Object.values(
      isTv ? (userProfile?.seriesRankings || {}) : (userProfile?.movieRankings || {})
    ).filter((r): r is MonthlyMovieRanking => !!(r?.rankedTitles?.length));

    const localStorageRankings: MonthlyMovieRanking[] = [];
    if (typeof window !== 'undefined') {
      try {
        const key = isTv ? 'kolyoum_series_rankings' : 'kolyoum_movie_rankings';
        const all = localStorage.getItem(key);
        if (all) {
          const parsed = JSON.parse(all);
          Object.values(parsed).forEach((r: any) => {
            if (r?.rankedTitles?.length) localStorageRankings.push(r as MonthlyMovieRanking);
          });
        }
      } catch {}
    }

    const candidates = [...allProfileRankings, ...localStorageRankings]
      .map(r => sanitize(r))
      .filter((r): r is MonthlyMovieRanking => !!(r?.rankedTitles?.length));

    if (candidates.length === 0) return null;
    const best = candidates.reduce((b, curr) => {
      const bestCount = b.rankedTitles?.length ?? 0;
      const currCount = curr.rankedTitles?.length ?? 0;
      if (currCount > bestCount) return curr;
      if (currCount === bestCount) {
        return (curr.updatedAt || 0) >= (b.updatedAt || 0) ? curr : b;
      }
      return b;
    });
    return best;
  }, [existingRanking, monthKey, userProfile, isTv, seenMovies]);

  // Filtrer les films/séries de test et enrichir avec leur catégorie
  const validSeenMovies = useMemo(() => {
    const catMap = isTv ? (userProfile?.seriesCategories || {}) : (userProfile?.movieCategories || {});
    const rejectedSet = new Set((isTv ? userProfile?.rejectedSeriesTitles : userProfile?.rejectedMovieTitles || []).map(t => (t || '').toLowerCase().trim()));
    return seenMovies
      .filter(m => !isTestMovieTitle(m.title) && !rejectedSet.has(m.title.toLowerCase().trim()))
      .map(m => {
        const norm = m.title.toLowerCase().trim();
        const cat = m.category || catMap[norm] || guessMovieCategory(m.title, m.genres);
        return { ...m, category: cat };
      });
  }, [seenMovies, userProfile, isTv]);

  // Calcul du nombre de films par catégorie
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<MovieCategory, number>> = {};
    validSeenMovies.forEach(m => {
      if (m.category) {
        counts[m.category] = (counts[m.category] || 0) + 1;
      }
    });
    return counts;
  }, [validSeenMovies]);

  // Déterminer s'il s'agit d'un reclassement incrémental ou d'un premier classement
  const { isIncrementalMode, unrankedMovies, rankedTitles } = useMemo(() => {
    const currentRanked = (effectiveExistingRanking?.rankedTitles || []).filter(t => !isTestMovieTitle(t));
    if (currentRanked.length > 0) {
      // Use normalized lowercase for comparison to avoid case mismatch causing full re-rank
      const rankedSet = new Set(currentRanked.map(t => t.toLowerCase().trim()));
      const unranked = validSeenMovies.filter(m => !rankedSet.has(m.title.toLowerCase().trim()));
      return {
        isIncrementalMode: unranked.length > 0,
        unrankedMovies: unranked,
        rankedTitles: currentRanked,
      };
    }
    return {
      isIncrementalMode: false,
      unrankedMovies: validSeenMovies,
      rankedTitles: [],
    };
  }, [effectiveExistingRanking, validSeenMovies]);

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
      validSeenMovies.forEach(m => { existingCatalog[m.title] = m; });
      (effectiveExistingRanking.rankedTitles || []).filter(t => !isTestMovieTitle(t)).forEach(title => {
        if (!existingCatalog[title]) {
          existingCatalog[title] = { title };
        }
      });

      setSession({
        mode: 'incremental',
        sortedTitles: (effectiveExistingRanking.rankedTitles || []).filter(t => !isTestMovieTitle(t)),
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
        initialRankedTitles: (effectiveExistingRanking.initialRankedTitles || effectiveExistingRanking.rankedTitles || []).filter(t => !isTestMovieTitle(t)),
        newlyAddedTitles: (effectiveExistingRanking.newlyAddedTitles || []).filter(t => !isTestMovieTitle(t)),
        movieCatalog: existingCatalog,
      });
      return;
    }

    // 2. Mode Incrémental : affronter les nouveaux films vus aux films déjà classés
    if (isIncrementalMode && effectiveExistingRanking && unrankedMovies.length > 0) {
      const existingCatalog: Record<string, DuelMovieItem> = {};
      validSeenMovies.forEach(m => { existingCatalog[m.title] = m; });
      (effectiveExistingRanking.rankedTitles || []).filter(t => !isTestMovieTitle(t)).forEach(title => {
        if (!existingCatalog[title]) {
          existingCatalog[title] = { title };
        }
      });

      const newSession = createIncrementalDuelSession(
        (effectiveExistingRanking.rankedTitles || []).filter(t => !isTestMovieTitle(t)),
        unrankedMovies,
        existingCatalog,
        effectiveSagaRankings
      );
      const resolvedSession = autoResolveSagaDuels(newSession, effectiveSagaRankings);
      setSession(resolvedSession);
      if (resolvedSession.isFinished) {
        executeSaveRanking(resolvedSession, { notifyToast: false, closeModal: false });
      }
      return;
    }

    // 3. Mode Initial : tri complet depuis zéro (si au moins 2 films)
    if (validSeenMovies.length >= 2) {
      const newSession = createInitialDuelSession(validSeenMovies, effectiveSagaRankings);
      const resolvedSession = autoResolveSagaDuels(newSession, effectiveSagaRankings);
      setSession(resolvedSession);
      if (resolvedSession.isFinished) {
        executeSaveRanking(resolvedSession, { notifyToast: false, closeModal: false });
      }
      return;
    }

    // 4. Moins de 2 films et aucun classement : session informative
    const emptyCatalog: Record<string, DuelMovieItem> = {};
    validSeenMovies.forEach(m => { emptyCatalog[m.title] = m; });
    setSession({
      mode: 'initial',
      sortedTitles: validSeenMovies.map(m => m.title),
      pendingItems: [],
      currentCandidate: null,
      low: 0,
      high: 0,
      mid: 0,
      activeDuel: null,
      history: [],
      stepNumber: 0,
      estimatedTotalSteps: 0,
      isFinished: false,
      movieCatalog: emptyCatalog,
      initialRankedTitles: validSeenMovies.map(m => m.title),
      newlyAddedTitles: [],
      sagaRankings: effectiveSagaRankings,
    });
  }, [isOpen, effectiveExistingRanking, validSeenMovies, unrankedMovies, isIncrementalMode, effectiveSagaRankings]);

  // Résolution et rétro-remplissage automatique des affiches manquantes pour tous les films du duel
  useEffect(() => {
    if (!isOpen || !session) return;

    const titlesNeedingPosters: string[] = [];
    Object.values(session.movieCatalog || {}).forEach(m => {
      if (!m.posterUrl && m.title && !isTestMovieTitle(m.title)) {
        titlesNeedingPosters.push(m.title);
      }
    });

    if (titlesNeedingPosters.length === 0) return;

    let isCancelled = false;

    async function resolveMissingPosters() {
      try {
        const res = await fetch('/api/movies/posters-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titles: titlesNeedingPosters, type: mediaType }),
        });

        if (!res.ok) return;
        const data = await res.json();
        if (!data?.posters || isCancelled) return;

        const returnedPosters = data.posters;
        const hasAnyFound = Object.values(returnedPosters).some((p: any) => Boolean(p?.posterUrl));
        if (!hasAnyFound) return;

        setSession(prev => {
          if (!prev) return null;
          const updatedCatalog = { ...prev.movieCatalog };
          let changed = false;
          let updatedActiveDuel = prev.activeDuel ? { ...prev.activeDuel } : null;

          Object.entries(returnedPosters).forEach(([title, p]: [string, any]) => {
            if (p?.posterUrl) {
              const normTitle = title.toLowerCase().trim();
              const catalogKey = Object.keys(updatedCatalog).find(k => k.toLowerCase().trim() === normTitle) || title;
              const existing = updatedCatalog[catalogKey] || { title };

              if (!existing.posterUrl) {
                updatedCatalog[catalogKey] = {
                  ...existing,
                  posterUrl: p.posterUrl,
                  year: existing.year || p.year,
                  rating: existing.rating || p.rating,
                };
                changed = true;
              }

              // Mise à jour immédiate du duel actif s'il concerne ce film/série
              if (updatedActiveDuel) {
                if (updatedActiveDuel.movieA.title.toLowerCase().trim() === normTitle && !updatedActiveDuel.movieA.posterUrl) {
                  updatedActiveDuel.movieA = {
                    ...updatedActiveDuel.movieA,
                    posterUrl: p.posterUrl,
                    year: updatedActiveDuel.movieA.year || p.year,
                    rating: updatedActiveDuel.movieA.rating || p.rating,
                  };
                  changed = true;
                }
                if (updatedActiveDuel.movieB.title.toLowerCase().trim() === normTitle && !updatedActiveDuel.movieB.posterUrl) {
                  updatedActiveDuel.movieB = {
                    ...updatedActiveDuel.movieB,
                    posterUrl: p.posterUrl,
                    year: updatedActiveDuel.movieB.year || p.year,
                    rating: updatedActiveDuel.movieB.rating || p.rating,
                  };
                  changed = true;
                }
              }
            }
          });

          if (!changed) return prev;
          return {
            ...prev,
            movieCatalog: updatedCatalog,
            activeDuel: updatedActiveDuel,
          };
        });

        // Enregistrer définitivement les affiches trouvées dans le profil Firestore
        const effectiveUid = user?.uid || userProfile?.uid || 'guest';
        await backfillMoviePosters(effectiveUid, returnedPosters, mediaType);
      } catch (err) {
        console.warn("Erreur résolution affiches duel:", err);
      }
    }

    resolveMissingPosters();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, session?.isFinished, user?.uid, userProfile?.uid, mediaType]);

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

      if (isTv) {
        await saveMonthlySeriesRanking(effectiveUid, rankingPayload);
      } else {
        await saveMonthlyMovieRanking(effectiveUid, rankingPayload);
      }

      if (onRankingSaved) {
        onRankingSaved(rankingPayload);
      }

      if (options?.notifyToast) {
        toast({
          title: isFirstPublish ? "🏆 Classement validé !" : "⚡ Reclassement mis à jour !",
          description: isFirstPublish
            ? `Ton classement officiel est bien sauvegardé pour le Wrap-Up mensuel.`
            : `${targetSession.newlyAddedTitles.length} nouvelle(s) ${isTv ? 'série(s)' : 'film(s)'} intégrée(s) avec succès !`,
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
  }, [user, userProfile, effectiveExistingRanking, monthKey, onRankingSaved, onOpenChange, toast, isTv]);

  // Terminer et réintégrer le duel d'une catégorie dans le classement général
  const handleFinishCategoryDuel = useCallback((finishedCatSession: DuelSessionState, category: MovieCategory) => {
    const currentGlobalRanked = (effectiveExistingRanking?.rankedTitles || []).filter(t => !isTestMovieTitle(t));
    const catOrderedTitles = finishedCatSession.sortedTitles;
    let newGlobalRanked: string[];

    if (currentGlobalRanked.length > 0) {
      const catTitlesSet = new Set(catOrderedTitles);
      let catIdx = 0;
      newGlobalRanked = currentGlobalRanked.map(title => {
        if (catTitlesSet.has(title)) {
          const replacement = catOrderedTitles[catIdx];
          catIdx++;
          return replacement;
        }
        return title;
      });

      // Si certains films de la catégorie n'étaient pas encore dans le classement général
      while (catIdx < catOrderedTitles.length) {
        newGlobalRanked.push(catOrderedTitles[catIdx]);
        catIdx++;
      }
    } else {
      newGlobalRanked = catOrderedTitles;
    }

    const fullCatalog: Record<string, DuelMovieItem> = {};
    validSeenMovies.forEach(m => { fullCatalog[m.title] = m; });
    (effectiveExistingRanking?.rankedTitles || []).forEach(t => {
      if (!fullCatalog[t]) fullCatalog[t] = { title: t };
    });

    const mergedSession: DuelSessionState = {
      ...finishedCatSession,
      sortedTitles: newGlobalRanked,
      isFinished: true,
      movieCatalog: fullCatalog,
      initialRankedTitles: currentGlobalRanked.length > 0 ? currentGlobalRanked : newGlobalRanked,
    };

    setSession(mergedSession);
    setReclassifyingCategory(null);
    executeSaveRanking(mergedSession, { notifyToast: true, closeModal: false });

    toast({
      title: `🏆 Catégorie ${category} reclassée !`,
      description: `La nouvelle hiérarchie des ${isTv ? 'séries' : 'films'} « ${category} » a été intégrée à ton classement général.`,
    });
  }, [effectiveExistingRanking, validSeenMovies, executeSaveRanking, toast, isTv]);

  // Lancer un duel ciblé UNIQUEMENT sur les films d'une catégorie
  const handleStartCategoryDuel = useCallback((category: MovieCategory) => {
    const categoryMovies = validSeenMovies.filter(m => m.category === category);
    if (categoryMovies.length < 2) {
      toast({
        title: isTv ? "Pas assez de séries" : "Pas assez de films",
        description: `Il faut au moins 2 ${isTv ? 'séries' : 'films'} dans la catégorie « ${category} » pour lancer un duel.`,
      });
      return;
    }

    setReclassifyingCategory(category);
    const initial = createInitialDuelSession(categoryMovies, effectiveSagaRankings);
    const resolved = autoResolveSagaDuels(initial, effectiveSagaRankings);

    if (resolved.isFinished) {
      handleFinishCategoryDuel(resolved, category);
    } else {
      setSession(resolved);
    }
  }, [validSeenMovies, effectiveSagaRankings, handleFinishCategoryDuel, toast, isTv]);

  // Abandonner le reclassement de catégorie et restaurer l'état précédent
  const handleCancelCategoryDuel = useCallback(() => {
    setReclassifyingCategory(null);
    const existingCatalog: Record<string, DuelMovieItem> = {};
    validSeenMovies.forEach(m => { existingCatalog[m.title] = m; });
    (effectiveExistingRanking?.rankedTitles || []).filter(t => !isTestMovieTitle(t)).forEach(title => {
      if (!existingCatalog[title]) {
        existingCatalog[title] = { title };
      }
    });

    setSession({
      mode: 'incremental',
      sortedTitles: (effectiveExistingRanking?.rankedTitles || []).filter(t => !isTestMovieTitle(t)),
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
      initialRankedTitles: (effectiveExistingRanking?.initialRankedTitles || effectiveExistingRanking?.rankedTitles || []).filter(t => !isTestMovieTitle(t)),
      newlyAddedTitles: (effectiveExistingRanking?.newlyAddedTitles || []).filter(t => !isTestMovieTitle(t)),
      movieCatalog: existingCatalog,
      sagaRankings: effectiveSagaRankings,
    });
  }, [validSeenMovies, effectiveExistingRanking, effectiveSagaRankings]);

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
        const resolvedNext = autoResolveSagaDuels(next, effectiveSagaRankings);
        if (resolvedNext.isFinished) {
          if (reclassifyingCategory) {
            setTimeout(() => {
              handleFinishCategoryDuel(resolvedNext, reclassifyingCategory);
            }, 0);
          } else {
            // Sauvegarde automatique et immédiate dès la fin du duel !
            executeSaveRanking(resolvedNext, {
              notifyToast: resolvedNext.isSingleReclassification,
              closeModal: false
            });
            if (resolvedNext.isSingleReclassification) {
              toast({
                title: "🎯 Reclassement validé !",
                description: `« ${resolvedNext.reclassifiedTitle || 'Film'} » a trouvé sa nouvelle place !`,
              });
            }
          }
        }
        return resolvedNext;
      });
    }, 180);
  }, [session, reclassifyingCategory, handleFinishCategoryDuel, effectiveSagaRankings, executeSaveRanking, toast]);

  // Annuler le dernier duel
  const handleUndo = useCallback(() => {
    if (!session || session.history.length === 0) return;
    setSession(prev => (prev ? undoDuelDecision(prev) : null));
  }, [session]);

  // Écarter un film/série non vu(e) et le retirer de la liste des vus
  const handleMarkNotWatched = useCallback(async (side: 'A' | 'B') => {
    if (!session || !session.activeDuel) return;
    const targetMovie = side === 'A' ? session.activeDuel.movieA : session.activeDuel.movieB;
    const title = targetMovie.title;

    let nextSession: DuelSessionState;
    if (side === 'A') {
      nextSession = dismissCandidate(session);
    } else {
      nextSession = removeReferenceFromSession(session, title);
    }
    const resolvedNext = autoResolveSagaDuels(nextSession, effectiveSagaRankings);
    setSession(resolvedNext);

    if (resolvedNext.isFinished) {
      if (reclassifyingCategory) {
        handleFinishCategoryDuel(resolvedNext, reclassifyingCategory);
      } else {
        executeSaveRanking(resolvedNext, { notifyToast: false, closeModal: false });
      }
    }

    const effectiveUid = user?.uid || userProfile?.uid || 'guest';
    try {
      await removeMovieFromList(effectiveUid, isTv ? 'seenSeriesTitles' : 'seenMovieTitles', title);
    } catch (err) {
      console.warn("Could not remove item from seen list:", err);
    }

    toast({
      title: `"${title}" retiré${isTv ? 'e' : ''}`,
      description: `Cette ${isTv ? 'série a été retirée' : 'film a été retiré'} du duel et de votre liste de ${isTv ? 'séries vues' : 'films vus'}.`,
    });
  }, [session, reclassifyingCategory, user?.uid, userProfile?.uid, handleFinishCategoryDuel, executeSaveRanking, toast, isTv, effectiveSagaRankings]);

  // Gestionnaires de l'Appui Long (Long Press) sur les films classés
  const handlePointerDownMovie = useCallback((e: React.PointerEvent, item: RankMovement) => {
    if (!session?.isFinished) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    setPressingMovieTitle(item.title);

    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(50); } catch {}
      }
      const catalogItem = session.movieCatalog[item.title];
      setActionMenuMovie({
        title: item.title,
        currentRank: item.currentRank,
        posterUrl: catalogItem?.posterUrl,
        category: item.category,
        year: catalogItem?.year,
        rating: catalogItem?.rating,
      });
      setPressingMovieTitle(null);
      longPressTimerRef.current = null;
    }, 500);
  }, [session]);

  const handlePointerMoveMovie = useCallback((e: React.PointerEvent) => {
    if (touchStartPosRef.current && longPressTimerRef.current) {
      const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
      if (dx > 10 || dy > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        setPressingMovieTitle(null);
      }
    }
  }, []);

  const handlePointerUpMovie = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressingMovieTitle(null);
  }, []);

  // Déclencher le duel de reclassement ciblé pour un film unique
  const handleStartSingleMovieReclassification = useCallback((targetTitle: string) => {
    if (!session) return;
    setActionMenuMovie(null);
    const reclassSession = createSingleMovieReclassificationSession(
      targetTitle,
      session.sortedTitles,
      session.movieCatalog,
      effectiveSagaRankings
    );
    const resolved = autoResolveSagaDuels(reclassSession, effectiveSagaRankings);
    setSession(resolved);
    if (resolved.isFinished) {
      executeSaveRanking(resolved, { notifyToast: true, closeModal: false });
    }
  }, [session, effectiveSagaRankings, executeSaveRanking]);

  // Abandonner le reclassement ciblé et restaurer le classement initial
  const handleCancelSingleReclassification = useCallback(() => {
    if (!session || !session.isSingleReclassification) return;
    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sortedTitles: [...prev.initialRankedTitles],
        isFinished: true,
        activeDuel: null,
        isSingleReclassification: false,
        reclassifiedTitle: undefined,
      };
    });
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

    const normalizeTitle = (t?: string) => (t || '').toLowerCase().trim().replace(/['’`]/g, "'");
    const validSeenSet = new Set(validSeenMovies.map(m => normalizeTitle(m?.title)).filter(Boolean));

    const baseList = session.isSingleReclassification
      ? (session.initialRankedTitles || []).filter(t => !isTestMovieTitle(t))
      : (effectiveExistingRanking?.initialRankedTitles || session.initialRankedTitles || []).filter(t => !isTestMovieTitle(t));
    const sorted = (session.sortedTitles || []).filter(t => !isTestMovieTitle(t));
    const newlyAdded = (session.newlyAddedTitles || []).filter(t => !isTestMovieTitle(t));
    return calculateRankMovements(baseList, sorted, newlyAdded, session.movieCatalog, selectedCategory)
      .filter(item => !isTestMovieTitle(item.title) && (validSeenSet.size === 0 || validSeenSet.has(normalizeTitle(item.title))));
  }, [session, effectiveExistingRanking, selectedCategory, validSeenMovies]);

  // Helper pour formater l'affiche
  const getPosterUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('default:')) return null;
    let finalUrl = url;
    if (!url.startsWith('http')) {
      finalUrl = `https://image.tmdb.org/t/p/w500${url.startsWith('/') ? '' : '/'}${url}`;
    }
    if (finalUrl.includes('/w92/')) {
      finalUrl = finalUrl.replace('/w92/', '/w500/');
    }
    return `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
  };

  if (!session) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[92vh] overflow-hidden p-0 border border-border/40 bg-[#0B0C10] text-white shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col !z-[200] [&>button]:text-white [&>button]:opacity-80 [&>button:hover]:opacity-100 [&>button]:bg-white/10 [&>button]:p-1.5 [&>button]:rounded-full [&>button]:transition-all">
        {/* Header néon cinématographique */}
        <div className="relative px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-purple-950/40 to-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border shadow-sm ${
              reclassifyingCategory
                ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                : 'bg-blue-500/20 border-blue-400/30 text-blue-400'
            }`}>
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                {session.isFinished ? (
                  isTv ? "🏆 Classement Séries Finalisé" : "🏆 Classement Finalisé"
                ) : reclassifyingCategory ? (
                  `⚔️ Duel Exclusif : ${reclassifyingCategory}`
                ) : (
                  isTv ? "⚔️ Duel Séries : Le Grand Choix" : "⚔️ Duel Ciné : Le Grand Choix"
                )}
                {session.isSingleReclassification && !session.isFinished && (
                  <Badge variant="outline" className="bg-indigo-500/20 border-indigo-400/40 text-indigo-300 text-[10px] font-bold animate-pulse">
                    Reclassement Ciblé
                  </Badge>
                )}
                {session.mode === 'incremental' && !session.isFinished && !reclassifyingCategory && !session.isSingleReclassification && (
                  <Badge variant="outline" className="bg-amber-500/20 border-amber-400/40 text-amber-300 text-[10px] font-bold">
                    Reclassement des Nouveaux
                  </Badge>
                )}
                {reclassifyingCategory && !session.isFinished && (
                  <Badge variant="outline" className="bg-purple-500/20 border-purple-400/40 text-purple-300 text-[10px] font-bold animate-pulse">
                    Catégorie Isolée
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/60">
                {session.isFinished
                  ? `Classement des ${isTv ? 'séries vues' : 'films vus'} • ${monthName || monthKey}`
                  : reclassifyingCategory
                  ? `Seul${isTv ? 'es les séries' : 's les films'} de la catégorie ${reclassifyingCategory} s'affrontent ici`
                  : `Vote pour ${isTv ? 'ta série préférée' : 'ton film préféré'} pour affiner la hiérarchie`}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Barre de navigation Général & Catégories */}
        <div className="px-4 py-2 bg-white/[0.03] border-b border-white/10 flex items-center justify-start overflow-x-auto no-scrollbar">
          <CategoryTabs
            selectedCategory={reclassifyingCategory || selectedCategory}
            onSelectCategory={(cat) => {
              if (!reclassifyingCategory) {
                setSelectedCategory(cat);
              }
            }}
            categoryCounts={categoryCounts}
            totalCount={validSeenMovies.length}
            availableCategoriesOnly={session.isFinished}
            size="sm"
          />
        </div>

        {/* Corps principal : Stage de duel OU Écran de classement animé */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col justify-start items-center relative scroll-smooth"
        >
          <AnimatePresence mode="wait">
            {!session.isFinished && session.activeDuel ? (
              <motion.div
                key="duel-stage"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center my-auto"
              >
                {/* Info bulle sur le cycle des duels */}
                {reclassifyingCategory ? (
                  <div className="w-full max-w-[560px] mb-3 px-3 py-2 rounded-xl text-[11px] leading-relaxed flex items-center justify-between gap-2 border bg-purple-500/10 border-purple-400/30 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-purple-400" />
                      <span>
                        <strong>Reclassement ciblé « {reclassifyingCategory} » :</strong> Seul{isTv ? 'es les séries' : 's les films'} de cette catégorie vous sont proposé{isTv ? 'es' : 's'} en duel !
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelCategoryDuel}
                      className="text-[10px] text-purple-300 hover:text-white underline whitespace-nowrap shrink-0 ml-2"
                      title="Annuler ce reclassement et revenir au classement existant"
                    >
                      Abandonner
                    </button>
                  </div>
                ) : session.isSingleReclassification ? (
                  <div className="w-full max-w-[560px] mb-3 px-3.5 py-2.5 rounded-xl text-[11px] leading-relaxed flex items-center justify-between gap-2 border bg-indigo-500/15 border-indigo-400/40 text-indigo-200 shadow-md">
                    <div className="flex items-center gap-2 min-w-0">
                      <Swords className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="truncate">
                        <strong>Reclassement ciblé :</strong> <span className="font-semibold text-white">« {session.reclassifiedTitle || session.currentCandidate?.title} »</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelSingleReclassification}
                      className="text-[11px] text-indigo-300 hover:text-white underline whitespace-nowrap shrink-0 ml-2 font-semibold"
                      title="Annuler le reclassement et conserver le classement initial"
                    >
                      Abandonner
                    </button>
                  </div>
                ) : (
                  <div className={`w-full max-w-[560px] mb-3 px-3 py-2 rounded-xl text-[11px] leading-relaxed flex items-center justify-between gap-2 border ${
                    session.mode === 'incremental'
                      ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                      : 'bg-blue-500/10 border-blue-400/30 text-blue-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${session.mode === 'incremental' ? 'text-amber-400' : 'text-blue-400'}`} />
                      <span>
                        {session.mode === 'incremental' ? (
                          <><strong>Reclassement :</strong> Insertion de <span className="font-semibold text-white">« {session.currentCandidate?.title} »</span> {session.pendingItems.length > 0 && <span className="opacity-75">({session.pendingItems.length} en attente)</span>}</>
                        ) : (
                          <><strong>Premier duel du mois :</strong> {isTv ? "Toutes vos séries sont comparées cette première fois. Ensuite, seuls vos " : "Tous vos films sont comparés cette première fois. Ensuite, seuls vos "}<strong>futurs ajouts</strong> seront départagés !</>
                        )}
                      </span>
                    </div>
                    {session.mode === 'incremental' && session.currentCandidate && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotWatched('A')}
                        className="text-[10px] text-amber-300/80 hover:text-amber-200 underline whitespace-nowrap shrink-0 ml-2"
                        title={isTv ? "Ignorer cette série et passer à la suivante si elle n'a pas été vue" : "Ignorer ce film et passer au suivant s'il n'a pas été vu"}
                      >
                        Passer
                      </button>
                    )}
                  </div>
                )}

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

                {/* Indicateur de phase : Catégorie vs Général */}
                <div className="flex items-center justify-center mb-3 sm:mb-4">
                  {session.isSingleReclassification ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/25 via-indigo-500/25 to-purple-500/25 border border-indigo-400/50 text-indigo-200 text-xs font-black shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                      <Swords className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>🎯 Duel de Reclassement Ciblé</span>
                    </div>
                  ) : reclassifyingCategory ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                      <span>⚔️ Duel Exclusif :</span>
                      <CategoryBadge category={reclassifyingCategory} size="xs" />
                    </div>
                  ) : session.isPodiumDuel && session.podiumBadgeText ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-500/30 to-amber-500/25 border border-amber-400/50 text-amber-200 text-xs font-extrabold shadow-[0_0_20px_rgba(245,158,11,0.35)] animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>{session.podiumBadgeText}</span>
                    </div>
                  ) : session.phase === 'category' || (session.activeDuel && session.activeDuel.movieA.category && session.activeDuel.movieA.category === session.activeDuel.movieB.category) ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs font-bold shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                      <span>⚔️ Duel Intra-Catégorie :</span>
                      <CategoryBadge category={session.currentDuelCategory || session.activeDuel?.movieA.category} size="xs" />
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <span>🏆 Duel Général : Arbitrage inter-catégories</span>
                    </div>
                  )}
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
                        {isTv ? "Série 1" : "Film 1"}
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
                      {session.activeDuel.movieA.category && (
                        <div className="mt-1.5">
                          <CategoryBadge category={session.activeDuel.movieA.category} size="xs" />
                        </div>
                      )}
                    </div>

                    {/* Bouton de vote direct */}
                    <Button
                      size="sm"
                      className="mt-2.5 sm:mt-3.5 w-full py-2 sm:py-2.5 text-[11px] sm:text-xs font-black rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-[0_4px_15px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] border border-white/20 backdrop-blur-sm active:scale-95 transition-all duration-200"
                    >
                      <span className="sm:hidden">Choisir</span>
                      <span className="hidden sm:inline">{isTv ? "Préférer cette série" : "Préférer ce film"}</span>
                    </Button>

                    {/* Option écarter si non vu */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkNotWatched('A');
                      }}
                      className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-red-400/75 hover:text-red-300 flex items-center justify-center gap-1 transition-all py-1 px-1.5 rounded-lg hover:bg-red-500/10 w-full border border-transparent hover:border-red-500/20"
                      title={isTv ? "Retirer cette série si elle n'a pas été vue" : "Retirer ce film s'il n'a pas été vu"}
                    >
                      <EyeOff className="w-3 h-3 text-red-400/80" />
                      <span>{isTv ? "Pas vu cette série" : "Pas vu ce film"}</span>
                    </button>
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
                      {session.isPodiumDuel && session.mid <= 2 ? (
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border border-amber-400/40 text-[9px] sm:text-[10px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                          <span>{session.mid === 0 ? '👑 N°1 Actuel' : session.mid === 1 ? '🥈 N°2 Actuel' : '🥉 N°3 Actuel'}</span>
                        </span>
                      ) : (
                        <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-[9px] sm:text-[10px] font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                          {isTv ? "Série 2" : "Film 2"}
                        </span>
                      )}
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
                      {session.activeDuel.movieB.category && (
                        <div className="mt-1.5">
                          <CategoryBadge category={session.activeDuel.movieB.category} size="xs" />
                        </div>
                      )}
                    </div>

                    {/* Bouton de vote direct */}
                    <Button
                      size="sm"
                      className="mt-2.5 sm:mt-3.5 w-full py-2 sm:py-2.5 text-[11px] sm:text-xs font-black rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-[0_4px_15px_rgba(168,85,247,0.35)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.5)] border border-white/20 backdrop-blur-sm active:scale-95 transition-all duration-200"
                    >
                      <span className="sm:hidden">Choisir</span>
                      <span className="hidden sm:inline">{isTv ? "Préférer cette série" : "Préférer ce film"}</span>
                    </Button>

                    {/* Option écarter si non vu */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkNotWatched('B');
                      }}
                      className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-red-400/75 hover:text-red-300 flex items-center justify-center gap-1 transition-all py-1 px-1.5 rounded-lg hover:bg-red-500/10 w-full border border-transparent hover:border-red-500/20"
                      title={isTv ? "Retirer cette série si elle n'a pas été vue" : "Retirer ce film s'il n'a pas été vu"}
                    >
                      <EyeOff className="w-3 h-3 text-red-400/80" />
                      <span>{isTv ? "Pas vu cette série" : "Pas vu ce film"}</span>
                    </button>
                  </motion.div>
                </div>

                {/* Barre d'outils du duel (Annuler & indices clavier) */}
                <div className="flex items-center justify-between w-full max-w-[500px] mt-3 sm:mt-5 pt-2.5 sm:pt-3 border-t border-white/10 text-xs text-white/40">
                  <span className="hidden sm:inline">
                    💡 Raccourcis : <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">←</kbd> {isTv ? "Série 1" : "Film 1"} / <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">→</kbd> {isTv ? "Série 2" : "Film 2"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUndo}
                    disabled={session.history.length === 0}
                    className="text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-3 ml-auto flex items-center gap-1.5 text-xs py-1 h-8 transition-all active:scale-95 shadow-sm disabled:opacity-30 disabled:pointer-events-none"
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
                  {isTv ? "Pas encore assez de séries ce mois-ci" : "Pas encore assez de films ce mois-ci"}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed mb-4">
                  {isTv
                    ? `Pour comparer tes séries en duel et générer ton palmarès officiel du mois (${monthName || monthKey}), tu dois avoir vu au moins 2 séries.`
                    : `Pour comparer tes films en duel et générer ton palmarès officiel du mois (${monthName || monthKey}), tu dois avoir vu au moins 2 films.`}
                </p>
                <div className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-semibold mb-6 flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-blue-400" />
                  {isTv ? "Séries vues enregistrées ce mois :" : "Films vus enregistrés ce mois :"} <span className="font-bold text-amber-300">{seenMovies.length}</span> / 2
                </div>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold rounded-2xl shadow-[0_8px_25px_rgba(99,102,241,0.35)] hover:shadow-[0_10px_30px_rgba(99,102,241,0.5)] active:scale-95 transition-all py-3 border border-white/10"
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
                    {selectedCategory === 'all'
                      ? (session.mode === 'incremental' ? (isTv ? "Classement Séries Réactualisé !" : "Classement Réactualisé !") : (isTv ? "Ton Palmarès Séries !" : "Ton Palmarès Général !"))
                      : `Palmarès ${selectedCategory} !`}
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
                  {selectedCategory === 'all'
                    ? (session.mode === 'incremental'
                      ? (isTv
                        ? "Les nouvelles séries ont bousculé les positions ! Observe les montées, descentes et nouvelles entrées ci-dessous."
                        : "Les nouveaux films ont bousculé les positions ! Observe les montées, descentes et nouvelles entrées ci-dessous.")
                      : (isTv
                        ? "Chaque série a trouvé sa place grâce à tes duels. Prêt à publier pour le Wrap-Up ?"
                        : "Chaque film a trouvé sa place grâce à tes duels. Prêt à publier pour le Wrap-Up ?"))
                    : `Hiérarchie exclusive de vos ${isTv ? 'séries' : 'films'} ${selectedCategory} pour ce mois (${rankMovements.length} ${isTv ? 'série' : 'film'}${rankMovements.length > 1 ? 's' : ''}).`}
                </p>

                {rankMovements.length === 0 && (
                  <div className="py-8 text-center text-white/50 text-xs flex flex-col items-center gap-2">
                    <span>Aucun{isTv ? 'e série' : ' film'} dans la catégorie « {selectedCategory} » ce mois-ci.</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory('all')}
                      className="text-amber-400 text-xs font-bold"
                    >
                      ← Revenir au classement général
                    </Button>
                  </div>
                )}

                {/* Astuce Appui Long */}
                <div className="w-full max-w-[550px] mb-3 px-3.5 py-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-between gap-2 text-indigo-300 text-xs font-medium shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 animate-pulse" />
                    <span>💡 <strong>Astuce :</strong> Maintiens un appui long sur un {isTv ? 'programme' : 'film'} pour le reclasser.</span>
                  </div>
                  <Badge variant="outline" className="border-indigo-400/40 text-[10px] text-indigo-200 bg-indigo-500/15 shrink-0">
                    Appui long
                  </Badge>
                </div>

                {/* Liste animée avec Framer Motion layout */}
                <motion.div layout className="w-full max-w-[550px] space-y-2 mb-6">
                  {rankMovements.map((item) => {
                    const movie = session.movieCatalog[item.title];
                    const poster = getPosterUrl(movie?.posterUrl);
                    const isPressing = pressingMovieTitle === item.title;

                    return (
                      <motion.div
                        key={item.title}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        onPointerDown={(e) => handlePointerDownMovie(e, item)}
                        onPointerMove={handlePointerMoveMovie}
                        onPointerUp={handlePointerUpMovie}
                        onPointerCancel={handlePointerUpMovie}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActionMenuMovie({
                            title: item.title,
                            currentRank: item.currentRank,
                            posterUrl: movie?.posterUrl,
                            category: item.category || movie?.category,
                            year: movie?.year,
                            rating: movie?.rating,
                          });
                        }}
                        className={`group relative select-none cursor-pointer flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all duration-200 ${
                          isPressing
                            ? 'scale-[0.98] ring-2 ring-indigo-400 bg-indigo-500/25 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                            : item.currentRank === 1
                            ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:border-amber-400/80'
                            : item.currentRank === 2
                            ? 'bg-gradient-to-r from-slate-400/20 via-slate-500/10 to-transparent border-slate-300/40 shadow-[0_0_15px_rgba(203,213,225,0.15)] hover:border-slate-300/70'
                            : item.currentRank === 3
                            ? 'bg-gradient-to-r from-amber-700/20 via-amber-800/10 to-transparent border-amber-600/40 shadow-[0_0_15px_rgba(180,83,9,0.15)] hover:border-amber-600/70'
                            : item.isNew
                            ? 'bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent border-blue-400/40 hover:border-blue-400/70'
                            : 'bg-white/[0.04] border-white/10 hover:border-white/25 hover:bg-white/[0.07]'
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
                            <h4 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[260px]">
                              {item.title}
                            </h4>
                            <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-white/50 mt-0.5">
                              {movie?.year && <span>{movie.year}</span>}
                              {movie?.watchedInCinema && (
                                <span className="text-violet-300 font-semibold">🎬 Cinéma</span>
                              )}
                              <CategoryBadge
                                category={item.category || movie?.category}
                                size={selectedCategory === 'all' ? 'sm' : 'xs'}
                                className="shadow-xs"
                              />
                              {selectedCategory !== 'all' && (
                                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/70 text-[9.5px] font-mono font-semibold leading-none">
                                  #{item.generalRank} Général
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* BADGE D'ANIMATION DE CLASSEMENT / DÉCLASSEMENT & MENU D'ACTIONS */}
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

                          {/* Bouton pour ouvrir le menu d'actions (reclasser ce film) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuMovie({
                                title: item.title,
                                currentRank: item.currentRank,
                                posterUrl: movie?.posterUrl,
                                category: item.category || movie?.category,
                                year: movie?.year,
                                rating: movie?.rating,
                              });
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                            title={`Options pour ${item.title}`}
                            aria-label={`Options pour ${item.title}`}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Boutons d'actions : Reclasser Catégorie, Valider, ADN Ciné & Recommencer */}
                <div className="sticky bottom-0 bg-[#0B0C10]/95 backdrop-blur-md pt-3 pb-1 border-t border-white/10 w-full max-w-[550px] z-20 mt-auto flex flex-col gap-2.5">
                  {/* Option reclassement spécifique à la catégorie sélectionnée */}
                  {selectedCategory !== 'all' && (
                    <Button
                      type="button"
                      onClick={() => handleStartCategoryDuel(selectedCategory as MovieCategory)}
                      disabled={(categoryCounts[selectedCategory as MovieCategory] || 0) < 2}
                      className="w-full h-11 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-[0_4px_20px_rgba(168,85,247,0.35)] border border-purple-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Swords className="w-4 h-4 text-purple-200" />
                      <span>
                        ⚔️ Reclasser uniquement « {selectedCategory} » ({categoryCounts[selectedCategory as MovieCategory] || 0} {isTv ? 'série' : 'film'}{(categoryCounts[selectedCategory as MovieCategory] || 0) > 1 ? 's' : ''})
                      </span>
                    </Button>
                  )}

                  <div className="flex items-center gap-2 w-full">
                    <Button
                      type="button"
                      onClick={() => {
                        if (session) {
                          executeSaveRanking(session, { notifyToast: true, closeModal: true });
                        } else {
                          onOpenChange(false);
                        }
                      }}
                      disabled={isSaving}
                      className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-[0_8px_25px_rgba(99,102,241,0.4)] hover:shadow-[0_12px_32px_rgba(99,102,241,0.55)] border border-white/15 backdrop-blur-md transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enregistrement...
                        </span>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-300 stroke-[3]" />
                          <span>{effectiveExistingRanking ? "Valider et Fermer" : "Publier pour le Wrap-Up"}</span>
                        </>
                      )}
                    </Button>

                    {onOpenDnaModal && (
                      <Button
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenDnaModal();
                        }}
                        className="h-11 px-3 sm:px-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-xs border border-fuchsia-400/30 shadow-[0_4px_18px_rgba(217,70,239,0.35)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                        title={isTv ? "Découvrir mon ADN Télévisuel / Séries" : "Découvrir mon ADN Cinématographique"}
                      >
                        <Dna className="w-4 h-4 text-fuchsia-200 animate-pulse" />
                        <span className="hidden sm:inline">{isTv ? "ADN Séries" : "ADN Ciné"}</span>
                        <span className="sm:hidden">ADN</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const initial = createInitialDuelSession(validSeenMovies, effectiveSagaRankings);
                        const resolved = autoResolveSagaDuels(initial, effectiveSagaRankings);
                        setSession(resolved);
                        if (resolved.isFinished) {
                          executeSaveRanking(resolved, { notifyToast: false, closeModal: false });
                        }
                      }}
                      className="h-11 w-11 p-0 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-white border border-white/20 hover:border-white/40 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-200 active:scale-[0.98] flex items-center justify-center group flex-shrink-0"
                      title="Réinitialiser le classement"
                      aria-label="Réinitialiser le classement"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400 group-hover:-rotate-90 transition-transform duration-300" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>

    {/* Menu d'action au clic ou appui long sur un film : Reclasser ce film */}
    <Dialog
      open={!!actionMenuMovie}
      onOpenChange={(open) => {
        if (!open) setActionMenuMovie(null);
      }}
    >
      <DialogContent className="sm:max-w-md w-[92vw] bg-[#12141D] border border-white/20 text-white p-5 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] !z-[250] flex flex-col gap-4">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/20 border-indigo-400/40 text-indigo-300 text-xs font-bold">
              Rang actuel #{actionMenuMovie?.currentRank}
            </Badge>
            {actionMenuMovie?.category && (
              <CategoryBadge category={actionMenuMovie.category} size="xs" />
            )}
          </div>
          <DialogTitle className="text-lg font-black text-white mt-1">
            {actionMenuMovie?.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            {isTv
              ? "Défie tes autres séries en duel pour repositionner celle-ci dans la hiérarchie."
              : "Défie tes autres films en duel pour repositionner celui-ci dans la hiérarchie."}
          </DialogDescription>
        </DialogHeader>

        {/* Carte aperçu du film sélectionné */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10">
          <div className="w-12 h-16 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10 shadow-md">
            {actionMenuMovie?.posterUrl ? (
              <img
                src={getPosterUrl(actionMenuMovie.posterUrl) || undefined}
                alt={actionMenuMovie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30">
                <Film className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">
              {actionMenuMovie?.title}
            </div>
            <div className="text-xs text-indigo-300 font-semibold mt-0.5">
              Position #{actionMenuMovie?.currentRank} sur {session?.sortedTitles.length || 0}
            </div>
            <p className="text-[11px] text-white/50 mt-1 leading-snug">
              Un duel ciblé va se lancer pour réinsérer ce {isTv ? 'programme' : 'film'} à sa place idéale sans réinitialiser le reste du classement.
            </p>
          </div>
        </div>

        {/* Boutons d'actions */}
        <div className="flex flex-col gap-2 mt-1">
          <Button
            type="button"
            onClick={() => {
              if (actionMenuMovie) {
                handleStartSingleMovieReclassification(actionMenuMovie.title);
              }
            }}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-sm shadow-[0_4px_25px_rgba(99,102,241,0.45)] border border-indigo-400/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Swords className="w-4 h-4 text-indigo-200" />
            <span>Reclasser ce {isTv ? 'programme' : 'film'}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setActionMenuMovie(null)}
            className="w-full h-10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 text-xs font-semibold"
          >
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
);
}
