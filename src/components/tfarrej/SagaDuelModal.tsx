'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { saveSagaRanking, syncSagaRankingWithMonthly, SagaRanking, MovieCategory } from '@/lib/firebase/firestore';
import { guessMovieCategory } from '@/lib/movie-category-utils';
import { CategoryBadge } from '@/components/tfarrej/movie-category-picker';
import { Swords, Trophy, RotateCcw, Check, Sparkles, Star, Calendar, ShieldCheck, Loader2 } from 'lucide-react';

export interface SagaDuelMovie {
  title: string;
  year?: number | null;
  posterUrl?: string | null;
  rating?: number | null;
  category?: MovieCategory;
}

interface SagaDuelModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sagaId: string;
  sagaName: string;
  sagaMovies: SagaDuelMovie[];
  initialRanking?: SagaRanking | null;
  onDuelFinished?: (ranking: SagaRanking) => void;
}

type Pair = [SagaDuelMovie, SagaDuelMovie];

export function SagaDuelModal({
  isOpen,
  onOpenChange,
  sagaId,
  sagaName,
  sagaMovies,
  initialRanking,
  onDuelFinished,
}: SagaDuelModalProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  // Filtrer les films uniques valides
  const movies = useMemo(() => {
    const seen = new Set<string>();
    return sagaMovies.filter(m => {
      const norm = (m.title || '').toLowerCase().trim();
      if (!norm || seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, [sagaMovies]);

  // Scores et paires de duels
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [finalRankedTitles, setFinalRankedTitles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const isVotingRef = useRef(false);

  // Ref pour éviter les doubles initialisations et les réinitialisations intempestives
  const isOpenRef = useRef(isOpen);

  // Initialisation du tournoi
  const startNewTournament = useCallback(() => {
    if (movies.length < 2) return;

    // Générer toutes les paires possibles (Round Robin)
    const allPairs: Pair[] = [];
    for (let i = 0; i < movies.length; i++) {
      for (let j = i + 1; j < movies.length; j++) {
        // Aléatoirement inverser gauche/droite pour équité visuelle
        if (Math.random() > 0.5) {
          allPairs.push([movies[i], movies[j]]);
        } else {
          allPairs.push([movies[j], movies[i]]);
        }
      }
    }

    // Mélanger l'ordre des duels
    allPairs.sort(() => Math.random() - 0.5);

    const initialScores: Record<string, number> = {};
    movies.forEach(m => {
      initialScores[m.title] = 0;
    });

    setPairs(allPairs);
    setCurrentPairIndex(0);
    setScores(initialScores);
    setIsFinished(false);
    setFinalRankedTitles([]);
    isVotingRef.current = false;
  }, [movies]);

  // Déclencher le tournoi UNIQUEMENT quand la modale s'ouvre (transition false -> true)
  useEffect(() => {
    if (isOpen && !isOpenRef.current) {
      isOpenRef.current = true;
      startNewTournament();
    } else if (!isOpen && isOpenRef.current) {
      isOpenRef.current = false;
      setIsFinished(false);
      setCurrentPairIndex(0);
      setScores({});
      setFinalRankedTitles([]);
      isVotingRef.current = false;
    }
  }, [isOpen, startNewTournament]);

  const handleVote = async (winner: SagaDuelMovie) => {
    if (isVotingRef.current || isFinished) return;

    const newScores = {
      ...scores,
      [winner.title]: (scores[winner.title] || 0) + 1,
    };
    setScores(newScores);

    if (currentPairIndex + 1 < pairs.length) {
      setCurrentPairIndex(prev => prev + 1);
    } else {
      isVotingRef.current = true;

      // Tournoi terminé : classer les films par score décroissant
      // En cas d'égalité, départager par la note TMDb ou l'année
      const sorted = [...movies].sort((a, b) => {
        const scoreA = newScores[a.title] || 0;
        const scoreB = newScores[b.title] || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.rating || 0) - (a.rating || 0);
      });

      const rankedTitles = sorted.map(m => m.title);
      setFinalRankedTitles(rankedTitles);
      setIsFinished(true);

      // Sauvegarde dans Firestore et synchronisation avec les classements général et catégorie
      setIsSaving(true);
      try {
        const ranking: SagaRanking = {
          sagaId,
          sagaName,
          rankedTitles,
          updatedAt: Date.now(),
        };

        const effectiveUid = user?.uid || 'guest';
        await saveSagaRanking(effectiveUid, ranking);

        // Synchroniser également l'ordre dans le classement mensuel/général et catégorie
        await syncSagaRankingWithMonthly(effectiveUid, rankedTitles);

        onDuelFinished?.(ranking);

        toast({
          title: '🏆 Classement de la Saga enregistré !',
          description: `"${rankedTitles[0]}" est élu meilleur volet de la saga !`,
          className: 'bg-amber-600 text-white font-bold border-none shadow-lg',
        });
      } catch (e) {
        console.error('Erreur sauvegarde classement saga:', e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const currentPair = pairs[currentPairIndex];
  const progressPercent = pairs.length > 0 ? Math.round((currentPairIndex / pairs.length) * 100) : 0;

  // Résoudre la catégorie d'un film pour l'affichage
  const getMovieCategory = (title: string): MovieCategory => {
    const norm = title.toLowerCase().trim();
    return (userProfile?.movieCategories || {})[norm] || guessMovieCategory(title);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-hidden flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground p-4 sm:p-6">
        <DialogHeader className="pb-2 text-center shrink-0 pr-6">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg sm:text-xl font-headline">
            <Swords className="h-5 w-5 text-amber-400" />
            Duel Spécial : {sagaName}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isFinished
              ? 'Voici votre classement officiel de cette saga !'
              : `Lequel de ces deux volets préférez-vous ? (Duel ${currentPairIndex + 1} sur ${pairs.length})`}
          </DialogDescription>
        </DialogHeader>

        {movies.length < 2 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Vous devez avoir vu au moins 2 films de cette saga pour lancer un duel.
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        ) : !isFinished && currentPair ? (
          <div className="flex-1 flex flex-col justify-between gap-4 py-2 min-h-0">
            {/* Barre de progression */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Progression des votes</span>
                <span>{currentPairIndex + 1} / {pairs.length}</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Arène de duel face-à-face */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch my-auto">
              {[currentPair[0], currentPair[1]].map((movie, idx) => (
                <button
                  key={movie.title + idx}
                  type="button"
                  disabled={isSaving || isVotingRef.current}
                  onClick={() => handleVote(movie)}
                  className="group relative flex flex-col items-center p-2.5 sm:p-4 rounded-2xl border border-border/70 hover:border-amber-400/80 bg-gradient-to-b from-card to-muted/20 hover:to-amber-500/10 transition-all duration-200 shadow-md hover:shadow-amber-500/20 hover:scale-[1.02] text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="relative w-full aspect-[2/3] max-w-[160px] rounded-xl overflow-hidden shadow-lg border border-white/10 mb-2.5 bg-black/40">
                    {movie.posterUrl ? (
                      <Image
                        src={movie.posterUrl}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 640px) 45vw, 200px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🎬
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug mb-1 group-hover:text-amber-300 transition-colors break-words">
                    {movie.title}
                  </h3>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-auto">
                    {movie.year && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" /> {movie.year}
                      </span>
                    )}
                    {movie.rating ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400" /> {movie.rating}
                      </span>
                    ) : null}
                  </div>

                  <div className="w-full mt-2.5 py-1.5 rounded-lg bg-muted/60 group-hover:bg-amber-500 group-hover:text-black font-bold text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Choisir ce volet
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Écran de résultats & Podium */
          <div className="flex-1 overflow-y-auto space-y-3.5 py-2 pr-1 min-h-0">
            <div className="text-center py-1">
              <div className="inline-flex p-3 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 mb-2">
                <Trophy className="h-7 w-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Classement officiel : {sagaName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Podium issu de vos duels en face-à-face
              </p>
            </div>

            {/* Liste ordonnée du podium */}
            <div className="space-y-2">
              {finalRankedTitles.map((title, rankIndex) => {
                const movie = movies.find(m => m.title.toLowerCase().trim() === title.toLowerCase().trim());
                const isGold = rankIndex === 0;
                const isSilver = rankIndex === 1;
                const isBronze = rankIndex === 2;
                const category = getMovieCategory(title);

                const medalColor = isGold
                  ? 'from-amber-500/25 via-yellow-500/15 to-transparent border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                  : isSilver
                  ? 'from-slate-400/20 to-transparent border-slate-300/40 text-slate-200'
                  : isBronze
                  ? 'from-amber-700/20 to-transparent border-amber-600/40 text-amber-400'
                  : 'from-card to-muted/20 border-border/50 text-muted-foreground';

                const badgeBg = isGold
                  ? 'bg-amber-400 text-black font-extrabold shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                  : isSilver
                  ? 'bg-slate-300 text-black font-extrabold'
                  : isBronze
                  ? 'bg-amber-700 text-white font-extrabold'
                  : 'bg-muted text-muted-foreground font-semibold';

                return (
                  <div
                    key={title}
                    className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border bg-gradient-to-r ${medalColor} transition-all`}
                  >
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs shrink-0 ${badgeBg}`}>
                      {rankIndex + 1}
                    </div>

                    {/* Affiche avec dimensions correctes */}
                    <div className="relative w-11 h-16 rounded-md overflow-hidden shadow shrink-0 border border-white/10 bg-black aspect-[2/3]">
                      {movie?.posterUrl ? (
                        <Image
                          src={movie.posterUrl}
                          alt={title}
                          fill
                          sizes="50px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          🎬
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isGold && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                            <Sparkles className="h-3 w-3 text-amber-400" />
                            Champion
                          </span>
                        )}
                        <CategoryBadge category={category} size="sm" />
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug break-words mt-1">
                        {title}
                      </h4>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        {movie?.year && <span>{movie.year}</span>}
                        {movie?.rating ? (
                          <span className="text-amber-400 font-medium">★ {movie.rating}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bannière de confirmation de synchronisation */}
            {finalRankedTitles.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-300">Synchronisation réussie !</div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    <strong>&ldquo;{finalRankedTitles[0]}&rdquo;</strong> est désigné volet n°1 de la saga. Vos classements général et par catégorie ont été synchronisés avec ce résultat.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={startNewTournament}
                disabled={isSaving}
                className="flex-1 gap-1.5 text-xs border-border hover:border-amber-400/50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Rejouer le duel
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Terminer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
