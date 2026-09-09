'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  addItemToWatchlist,
  addSeenMovieWithDate,
  removeMovieFromList,
  isTestMovieTitle,
  toggleSagaCompleted,
  SagaRanking,
  MovieCategory,
} from '@/lib/firebase/firestore';
import { guessMovieCategory } from '@/lib/movie-category-utils';
import { MovieCategoryPicker } from '@/components/tfarrej/movie-category-picker';
import { SagaDuelModal, SagaDuelMovie } from '@/components/tfarrej/SagaDuelModal';
import { ManageSagaDialog } from '@/components/tfarrej/ManageSagaDialog';
import {
  Film,
  Trophy,
  Swords,
  Plus,
  Check,
  CheckCircle2,
  Clock,
  Settings2,
  Calendar,
  Star,
  Loader2,
  Sparkles,
  HelpCircle,
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

  // État pour marquer un film comme vu avec date approximative / sans date
  const [markingSeenPart, setMarkingSeenPart] = useState<SagaPartItem | null>(null);
  const [dateMode, setDateMode] = useState<'none' | 'year' | 'exact'>('none');
  const [approxYear, setApproxYear] = useState<string>('');
  const [exactDate, setExactDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chosenCategory, setChosenCategory] = useState<MovieCategory>('Drame');
  const [isSubmittingSeen, setIsSubmittingSeen] = useState(false);

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
  const isManuallyCompleted = Boolean(userProfile?.completedSagas?.[sagaId]);
  const isComplete = isManuallyCompleted || (totalCount > 0 && seenCount >= totalCount);
  const progressPercent = isComplete ? 100 : (totalCount > 0 ? Math.round((seenCount / totalCount) * 100) : 0);


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

  // Ouvrir la boîte de dialogue pour marquer comme vu avec date
  const openMarkAsSeen = (part: SagaPartItem) => {
    setMarkingSeenPart(part);
    setDateMode('none');
    setApproxYear(part.year ? String(part.year) : String(new Date().getFullYear()));
    setExactDate(new Date().toISOString().split('T')[0]);
    setChosenCategory(guessMovieCategory(part.title));
  };

  // Confirmer l'ajout dans les films vus
  const handleConfirmMarkAsSeen = async () => {
    if (!markingSeenPart) return;
    if (!user) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté.' });
      return;
    }

    setIsSubmittingSeen(true);
    try {
      let viewedAtTimestamp: number | undefined = undefined;

      if (dateMode === 'year') {
        const y = parseInt(approxYear, 10);
        if (!isNaN(y) && y >= 1900 && y <= 2100) {
          viewedAtTimestamp = new Date(y, 5, 1).getTime(); // Milieu d'année
        }
      } else if (dateMode === 'exact') {
        const d = new Date(exactDate).getTime();
        if (!isNaN(d)) {
          viewedAtTimestamp = d;
        }
      }

      await addSeenMovieWithDate(user.uid, {
        title: markingSeenPart.title,
        posterUrl: markingSeenPart.posterUrl || undefined,
        year: markingSeenPart.year || undefined,
        rating: markingSeenPart.rating || undefined,
        viewedAt: viewedAtTimestamp,
        category: chosenCategory,
        collection: {
          id: sagaId,
          name: collectionData?.name || sagaName,
          posterUrl: collectionData?.posterUrl || fallbackPosterUrl,
          isCustom,
        },
      });

      // Retirer de la watchlist si le film y figurait
      if (userProfile?.moviesToWatch?.includes(markingSeenPart.title)) {
        await removeMovieFromList(user.uid, 'moviesToWatch', markingSeenPart.title);
      }

      toast({
        title: '🎬 Ajouté aux Films Vus !',
        description: `"${markingSeenPart.title}" a été marqué comme vu avec succès.`,
        className: 'bg-emerald-600 text-white font-bold border-none shadow-lg',
      });

      setMarkingSeenPart(null);
      fetchSagaData();
      onRefresh?.();
    } catch (e) {
      console.error('Erreur addSeenMovieWithDate:', e);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'enregistrer le film." });
    } finally {
      setIsSubmittingSeen(false);
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
          <DialogHeader className="pb-3 border-b border-border/50 shrink-0 pr-8">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0 flex-1">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold font-headline text-foreground leading-tight">
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
                  variant={isComplete ? "secondary" : "outline"}
                  onClick={async () => {
                    const nextState = !isComplete;
                    await toggleSagaCompleted(user?.uid || 'guest', sagaId, nextState);
                    toast({
                      title: nextState ? "Saga marquée comme terminée ! 🏆" : "Saga marquée en cours ⏳",
                      description: nextState 
                        ? `"${collectionData?.name || sagaName}" est désormais classée dans vos sagas terminées.`
                        : `"${collectionData?.name || sagaName}" est désormais classée dans vos sagas entamées.`,
                    });
                    onRefresh?.();
                  }}
                  className={`h-7 px-2 text-xs gap-1 transition-all ${
                    isComplete 
                      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20' 
                      : 'border-border/70 hover:border-emerald-400/80 text-muted-foreground hover:text-emerald-400'
                  }`}
                  title={isComplete ? "Marquer la saga comme en cours" : "Marquer la saga comme terminée (100% vue)"}
                >
                  <Check className={`h-3.5 w-3.5 ${isComplete ? 'stroke-[2.5]' : 'opacity-60'}`} />
                  <span className="hidden sm:inline">{isComplete ? "Terminée" : "Marquer vue"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsManageOpen(true)}
                  className="h-7 px-2 text-xs border-border/70 hover:border-indigo-400 gap-1"
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
                  Progression :{' '}
                  <span className="text-foreground font-bold">{seenCount} / {totalCount} vus</span>
                </span>
                <span className={isComplete ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-amber-400 font-semibold flex items-center gap-1'}>
                  {isComplete ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      100% • Terminée !
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      {progressPercent}% • En cours
                    </>
                  )}
                </span>
              </div>
              <Progress
                value={progressPercent}
                className={`h-2 rounded-full ${isComplete ? '[&>div]:bg-emerald-500 bg-emerald-500/20' : '[&>div]:bg-amber-500 bg-muted/30'}`}
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
                        className={`flex items-center gap-2.5 sm:gap-3 p-2.5 rounded-xl border transition-all ${
                          isSeen
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : isWatchlist
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-border/50 bg-card/60 hover:bg-muted/20'
                        }`}
                      >
                        {/* Numéro du volet */}
                        <div className="w-4 sm:w-5 text-center font-bold text-xs text-muted-foreground shrink-0">
                          {index + 1}
                        </div>

                        {/* Affiche miniature (cliquable pour marquer comme vu) */}
                        <div
                          onClick={() => {
                            if (!isSeen) openMarkAsSeen(part);
                          }}
                          className={`relative w-11 h-16 rounded-lg overflow-hidden shadow shrink-0 border border-white/10 bg-black/40 aspect-[2/3] ${
                            !isSeen ? 'cursor-pointer hover:ring-2 hover:ring-emerald-400 group/poster' : ''
                          }`}
                          title={!isSeen ? "Cliquer pour marquer comme vu" : undefined}
                        >
                          {part.posterUrl ? (
                            <Image
                              src={part.posterUrl}
                              alt={part.title}
                              fill
                              sizes="50px"
                              className="object-cover group-hover/poster:scale-105 transition-transform"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">
                              🎬
                            </div>
                          )}
                          {!isSeen && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
                              <Check className="h-4 w-4 text-emerald-400 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Métadonnées du film */}
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug break-words">
                            {part.title}
                          </h4>
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

                        {/* Statut & Actions */}
                        <div className="shrink-0 flex items-center gap-1 sm:gap-1.5">
                          {isSeen ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                              <Check className="h-3 w-3 stroke-[2.5]" /> Vu
                            </span>
                          ) : (
                            <>
                              {/* Bouton pour marquer comme vu avec date approx / sans date */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMarkAsSeen(part)}
                                className="h-7 px-2 text-[11px] font-bold border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-white gap-1 transition-all whitespace-nowrap"
                                title="Marquer ce film comme déjà vu"
                              >
                                <Check className="h-3 w-3" />
                                <span>Vu</span>
                              </Button>

                              {/* Statut ou Bouton À Voir */}
                              {isWatchlist ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                  <Clock className="h-3 w-3" /> À Voir
                                </span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddToWatchlist(part)}
                                  disabled={isAdding}
                                  className="h-7 px-2 text-[11px] font-bold border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground gap-1 whitespace-nowrap"
                                >
                                  {isAdding ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Plus className="h-3 w-3" />
                                  )}
                                  + À Voir
                                </Button>
                              )}
                            </>
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

      {/* Boîte de dialogue pour marquer comme vu avec option de date approximative */}
      {markingSeenPart && (
        <Dialog open={Boolean(markingSeenPart)} onOpenChange={(open) => { if (!open) setMarkingSeenPart(null); }}>
          <DialogContent className="sm:max-w-[460px] max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground p-4 sm:p-5">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Check className="h-5 w-5 text-emerald-400" />
                Marquer comme Vu
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ajouter &ldquo;{markingSeenPart.title}&rdquo; à vos films vus.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1">
              {/* En-tête miniature du film */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/25 border border-border/50">
                {markingSeenPart.posterUrl && (
                  <div className="relative w-11 h-16 rounded-md overflow-hidden shrink-0 border border-white/10 bg-black aspect-[2/3]">
                    <Image
                      src={markingSeenPart.posterUrl}
                      alt={markingSeenPart.title}
                      fill
                      sizes="50px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug break-words">{markingSeenPart.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {markingSeenPart.year ? `${markingSeenPart.year} • ` : ''}Saga {collectionData?.name || sagaName}
                  </p>
                </div>
              </div>

              {/* Choix de la date de visionnage */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Quand l&apos;avez-vous vu ?</span>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </label>

                {/* Boutons d'options de date */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/40 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDateMode('none')}
                    className={`py-1.5 px-2 rounded-md transition-all text-center ${
                      dateMode === 'none'
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sans date
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('year')}
                    className={`py-1.5 px-2 rounded-md transition-all text-center ${
                      dateMode === 'year'
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Année approx.
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('exact')}
                    className={`py-1.5 px-2 rounded-md transition-all text-center ${
                      dateMode === 'exact'
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Date précise
                  </button>
                </div>

                {/* Champs selon l'option choisie */}
                {dateMode === 'none' && (
                  <p className="text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    💡 Le film sera comptabilisé dans vos films vus sans date de visionnage précise.
                  </p>
                )}

                {dateMode === 'year' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Année approximative de visionnage :
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex: 2015, 2021..."
                      value={approxYear}
                      onChange={(e) => setApproxYear(e.target.value)}
                      className="text-sm bg-muted/20"
                    />
                  </div>
                )}

                {dateMode === 'exact' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Date de visionnage :
                    </label>
                    <Input
                      type="date"
                      value={exactDate}
                      onChange={(e) => setExactDate(e.target.value)}
                      className="text-sm bg-muted/20"
                    />
                  </div>
                )}
              </div>

              {/* Sélection de Catégorie */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-foreground">
                  Catégorie du film :
                </label>
                <MovieCategoryPicker
                  selectedCategory={chosenCategory}
                  onSelectCategory={(cat) => setChosenCategory(cat)}
                  size="sm"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border/50 gap-2 sm:gap-0 flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMarkingSeenPart(null)}
                disabled={isSubmittingSeen}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmMarkAsSeen}
                disabled={isSubmittingSeen}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                {isSubmittingSeen ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Confirmer l&apos;ajout aux Films Vus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
