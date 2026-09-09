'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { addItemToWatchlist, isTestMovieTitle, SagaRanking } from '@/lib/firebase/firestore';
import { SagaDuelModal, SagaDuelMovie } from '@/components/tfarrej/SagaDuelModal';
import { ManageSagaDialog } from '@/components/tfarrej/ManageSagaDialog';
import {
  Film,
  Trophy,
  Swords,
  Plus,
  Check,
  Clock,
  Settings2,
  Calendar,
  Star,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface SagaPartItem {
  id?: number | string;
  title: string;
  originalTitle?: string;
  year?: number | null;
  releaseDate?: string;
  rating?: number | null;
  synopsis?: string;
  posterUrl?: string | null;
}

interface SagaDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sagaId: string;
  sagaName: string;
  isCustom?: boolean;
  fallbackPosterUrl?: string;
  onRefresh?: () => void;
}

export function SagaDetailModal({
  isOpen,
  onOpenChange,
  sagaId,
  sagaName,
  isCustom = false,
  fallbackPosterUrl,
  onRefresh,
}: SagaDetailModalProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<{
    id: number | string;
    name: string;
    overview?: string;
    posterUrl?: string | null;
    parts: SagaPartItem[];
  } | null>(null);

  const [isDuelOpen, setIsDuelOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState<Record<string, boolean>>({});

  // Sets des films de l'utilisateur pour vérifier le statut
  const seenSet = useMemo(() => {
    const titles = (userProfile?.seenMovieTitles || []).filter(t => !isTestMovieTitle(t));
    const dataTitles = (userProfile?.seenMoviesData || []).map(m => m?.title).filter(Boolean);
    return new Set([...titles, ...dataTitles].map(t => (t || '').toLowerCase().trim()));
  }, [userProfile?.seenMovieTitles, userProfile?.seenMoviesData]);

  const watchlistSet = useMemo(() => {
    const watchlist = (userProfile?.moviesToWatch || []).filter(t => !isTestMovieTitle(t));
    return new Set(watchlist.map(t => (t || '').toLowerCase().trim()));
  }, [userProfile?.moviesToWatch]);

  // Récupérer les données de la collection (TMDb ou Custom)
  const fetchSagaData = useCallback(async () => {
    if (!isOpen || !sagaId) return;

    // 1. Si c'est une saga personnalisée
    if (isCustom || sagaId.startsWith('custom_')) {
      const customSaga = userProfile?.customSagas?.[sagaId];
      if (customSaga) {
        const parts: SagaPartItem[] = customSaga.movieTitles.map(t => {
          const norm = t.toLowerCase().trim();
          const seenMeta = (userProfile?.seenMoviesData || []).find(
            m => m?.title?.toLowerCase()?.trim() === norm
          );
          return {
            title: t,
            year: seenMeta?.year || null,
            rating: seenMeta?.rating || null,
            posterUrl: seenMeta?.posterUrl || null,
          };
        });

        setCollectionData({
          id: customSaga.id,
          name: customSaga.name,
          posterUrl: customSaga.posterUrl || fallbackPosterUrl,
          parts,
        });
      }
      return;
    }

    // 2. Si c'est une collection TMDb
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tmdb-collection?id=${encodeURIComponent(sagaId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.collection) {
          setCollectionData(data.collection);
        }
      }
    } catch (e) {
      console.error('Erreur chargement collection TMDb:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, sagaId, isCustom, userProfile?.customSagas, userProfile?.seenMoviesData, fallbackPosterUrl]);

  useEffect(() => {
    fetchSagaData();
  }, [fetchSagaData]);

  // Parties de la saga
  const parts = useMemo(() => collectionData?.parts || [], [collectionData]);

  // Films vus dans la saga pour les duels
  const seenParts = useMemo(() => {
    return parts.filter(p => seenSet.has(p.title.toLowerCase().trim()));
  }, [parts, seenSet]);

  // Statistiques de complétion
  const seenCount = seenParts.length;
  const totalCount = parts.length;
  const progressPercent = totalCount > 0 ? Math.round((seenCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && seenCount === totalCount;

  // Classement existant pour cette saga
  const existingRanking: SagaRanking | null = useMemo(() => {
    return userProfile?.sagaRankings?.[sagaId] || null;
  }, [userProfile?.sagaRankings, sagaId]);

  // Ajouter un volet manquant à la liste "À Voir"
  const handleAddToWatchlist = async (part: SagaPartItem) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté.' });
      return;
    }

    setAddingToWatchlist(prev => ({ ...prev, [part.title]: true }));
    try {
      await addItemToWatchlist(user.uid, part.title, 'movie');
      toast({
        title: '🎬 Ajouté à À Voir !',
        description: `"${part.title}" a été ajouté à votre liste À Voir.`,
        className: 'bg-emerald-600 text-white font-bold border-none shadow-lg',
      });
      onRefresh?.();
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'ajouter à la liste." });
    } finally {
      setAddingToWatchlist(prev => ({ ...prev, [part.title]: false }));
    }
  };

  // Préparer les données pour le duel
  const duelMovies: SagaDuelMovie[] = useMemo(() => {
    return seenParts.map(p => ({
      title: p.title,
      year: p.year,
      rating: p.rating,
      posterUrl: p.posterUrl,
    }));
  }, [seenParts]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground p-4 sm:p-6">
          <DialogHeader className="pb-3 border-b border-border/50 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold font-headline text-foreground">
                  🎬 {collectionData?.name || sagaName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {isCustom ? 'Saga personnalisée' : 'Franchise officielle TMDb'} • {totalCount} volet(s)
                </DialogDescription>
              </div>

              {/* Actions d'en-tête */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsManageOpen(true)}
                  className="h-8 text-xs border-border/70 hover:border-indigo-400 gap-1"
                  title="Gérer les films associés"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Gérer</span>
                </Button>
              </div>
            </div>

            {/* Progression de la saga */}
            <div className="pt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1">
                  Progression de visionnage :{' '}
                  <span className="text-foreground font-bold">{seenCount} / {totalCount} vus</span>
                </span>
                <span className={isComplete ? 'text-amber-400 font-bold flex items-center gap-1' : 'text-primary'}>
                  {isComplete && <Trophy className="h-3.5 w-3.5" />}
                  {progressPercent}% {isComplete && '• Complétée !'}
                </span>
              </div>
              <Progress
                value={progressPercent}
                className="h-2 rounded-full bg-muted/30"
              />
            </div>
          </DialogHeader>

          {/* Corps de la modale */}
          <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-4 pr-1">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <span className="text-xs">Chargement des volets de la saga...</span>
              </div>
            ) : parts.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <p>Aucun volet répertorié dans cette saga.</p>
                <Button size="sm" onClick={() => setIsManageOpen(true)} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Ajouter des films
                </Button>
              </div>
            ) : (
              <>
                {/* Carte Duel de Saga si disponible */}
                {seenCount >= 2 && (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-amber-300 flex items-center gap-1.5">
                        <Swords className="h-4 w-4" />
                        Duel Spécial Saga
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {existingRanking
                          ? `🏆 Favori actuel : ${existingRanking.rankedTitles[0]}`
                          : `Déterminez votre volet préféré parmi les ${seenCount} vus !`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsDuelOpen(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shrink-0 gap-1.5 shadow-md shadow-amber-500/20"
                    >
                      <Swords className="h-3.5 w-3.5" />
                      {existingRanking ? 'Rejouer le duel' : 'Lancer le duel'}
                    </Button>
                  </div>
                )}

                {/* Liste des volets ordonnés */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Volets de la Saga ({parts.length})
                  </h4>

                  {parts.map((part, index) => {
                    const norm = part.title.toLowerCase().trim();
                    const isSeen = seenSet.has(norm);
                    const isWatchlist = !isSeen && watchlistSet.has(norm);
                    const isAdding = addingToWatchlist[part.title];

                    return (
                      <div
                        key={part.title + index}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                          isSeen
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : isWatchlist
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-border/50 bg-card/60 hover:bg-muted/20'
                        }`}
                      >
                        {/* Numéro du volet */}
                        <div className="w-5 text-center font-bold text-xs text-muted-foreground shrink-0">
                          {index + 1}
                        </div>

                        {/* Affiche miniature */}
                        <div className="relative w-10 h-14 rounded-lg overflow-hidden shadow shrink-0 border border-white/10 bg-black">
                          {part.posterUrl ? (
                            <Image
                              src={part.posterUrl}
                              alt={part.title}
                              fill
                              sizes="45px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">
                              🎬
                            </div>
                          )}
                        </div>

                        {/* Métadonnées du film */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-foreground truncate flex items-center gap-1.5">
                            <span className="truncate">{part.title}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                            {part.year && (
                              <span className="flex items-center gap-0.5">
                                <Calendar className="h-3 w-3" /> {part.year}
                              </span>
                            )}
                            {part.rating ? (
                              <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-amber-400" /> {part.rating}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Statut & Action */}
                        <div className="shrink-0">
                          {isSeen ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <Check className="h-3 w-3 stroke-[2.5]" /> Vu
                            </span>
                          ) : isWatchlist ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="h-3 w-3" /> À Voir
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddToWatchlist(part)}
                              disabled={isAdding}
                              className="h-7 text-[11px] font-bold border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground gap-1"
                            >
                              {isAdding ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              + À Voir
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modale de Duel Spécial Saga */}
      <SagaDuelModal
        isOpen={isDuelOpen}
        onOpenChange={setIsDuelOpen}
        sagaId={sagaId}
        sagaName={collectionData?.name || sagaName}
        sagaMovies={duelMovies}
        initialRanking={existingRanking}
        onDuelFinished={() => onRefresh?.()}
      />

      {/* Modale de Gestion manuelle de la saga */}
      <ManageSagaDialog
        isOpen={isManageOpen}
        onOpenChange={setIsManageOpen}
        onSagaUpdated={() => {
          fetchSagaData();
          onRefresh?.();
        }}
      />
    </>
  );
}
