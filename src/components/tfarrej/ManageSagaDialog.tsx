'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  saveCustomSaga,
  linkMovieToSaga,
  unlinkMovieFromSaga,
  CustomSaga,
  MovieCollectionInfo,
} from '@/lib/firebase/firestore';
import { Film, Plus, Link2, Unlink, Check, Layers, Sparkles } from 'lucide-react';

interface ManageSagaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  targetMovieTitle?: string;
  targetMoviePosterUrl?: string;
  onSagaUpdated?: () => void;
}

export function ManageSagaDialog({
  isOpen,
  onOpenChange,
  targetMovieTitle,
  targetMoviePosterUrl,
  onSagaUpdated,
}: ManageSagaDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'pick_existing' | 'create_new'>('pick_existing');
  const [newSagaName, setNewSagaName] = useState('');
  const [selectedMovies, setSelectedMovies] = useState<string[]>(() => targetMovieTitle ? [targetMovieTitle] : []);
  const [isSaving, setIsSaving] = useState(false);

  const normTarget = useMemo(() => (targetMovieTitle || '').toLowerCase().trim(), [targetMovieTitle]);

  // Saga actuelle du film cible si déjà lié
  const currentSagaId = useMemo(() => {
    if (!normTarget || !userProfile?.movieSagaLinks) return null;
    return userProfile.movieSagaLinks[normTarget] || null;
  }, [normTarget, userProfile?.movieSagaLinks]);

  const currentSaga = useMemo(() => {
    if (!currentSagaId || !userProfile?.customSagas) return null;
    return userProfile.customSagas[currentSagaId] || null;
  }, [currentSagaId, userProfile?.customSagas]);

  // Liste de tous les films de l'utilisateur (vus + à voir) pour sélection
  const allUserMovies = useMemo(() => {
    const seen = (userProfile?.seenMovieTitles || []).filter(Boolean);
    const seenData = (userProfile?.seenMoviesData || []).map(m => m?.title).filter(Boolean);
    const watchlist = (userProfile?.moviesToWatch || []).filter(Boolean);
    return Array.from(new Set([...seen, ...seenData, ...watchlist])).sort((a, b) => a.localeCompare(b));
  }, [userProfile?.seenMovieTitles, userProfile?.seenMoviesData, userProfile?.moviesToWatch]);

  // Sagas existantes
  const existingSagas = useMemo(() => {
    return Object.values(userProfile?.customSagas || {});
  }, [userProfile?.customSagas]);

  // Initialisation à l'ouverture
  React.useEffect(() => {
    if (isOpen) {
      if (targetMovieTitle) {
        setSelectedMovies([targetMovieTitle]);
      } else {
        setSelectedMovies([]);
      }
      setNewSagaName('');
      setMode(existingSagas.length > 0 ? 'pick_existing' : 'create_new');
    }
  }, [isOpen, targetMovieTitle, existingSagas.length]);

  const handleToggleMovieSelection = (title: string) => {
    setSelectedMovies(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleCreateNewSaga = async () => {
    if (!newSagaName.trim()) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez saisir un nom pour la saga.' });
      return;
    }
    if (selectedMovies.length === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez sélectionner au moins un film.' });
      return;
    }

    setIsSaving(true);
    try {
      const sagaId = `custom_${Date.now()}`;
      const newSaga: CustomSaga = {
        id: sagaId,
        name: newSagaName.trim(),
        movieTitles: selectedMovies,
        posterUrl: targetMoviePosterUrl,
        createdAt: Date.now(),
      };

      await saveCustomSaga(user?.uid || 'guest', newSaga);

      toast({
        title: '🎬 Saga créée avec succès !',
        description: `La saga "${newSaga.name}" contient ${selectedMovies.length} film(s).`,
        className: 'bg-indigo-600 text-white font-bold border-none shadow-lg',
      });

      onSagaUpdated?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de créer la saga.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToExistingSaga = async (saga: CustomSaga) => {
    if (!targetMovieTitle) return;
    setIsSaving(true);
    try {
      const colInfo: MovieCollectionInfo = {
        id: saga.id,
        name: saga.name,
        posterUrl: saga.posterUrl || targetMoviePosterUrl,
        isCustom: true,
      };

      await linkMovieToSaga(user?.uid || 'guest', targetMovieTitle, colInfo);

      toast({
        title: '🔗 Film associé !',
        description: `"${targetMovieTitle}" a été ajouté à la saga "${saga.name}".`,
        className: 'bg-emerald-600 text-white font-bold border-none shadow-lg',
      });

      onSagaUpdated?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de lier le film.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlinkCurrentMovie = async () => {
    if (!targetMovieTitle) return;
    setIsSaving(true);
    try {
      await unlinkMovieFromSaga(user?.uid || 'guest', targetMovieTitle);
      toast({
        title: 'Film dissocié',
        description: `"${targetMovieTitle}" a été retiré de sa saga.`,
      });
      onSagaUpdated?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de dissocier le film.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-indigo-400" />
            Lier à une Saga / Trilogie
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {targetMovieTitle
              ? `Associez "${targetMovieTitle}" à une saga pour suivre sa progression et organiser des duels.`
              : 'Regroupez plusieurs films sous une même bannière de franchise ou trilogie.'}
          </DialogDescription>
        </DialogHeader>

        {currentSaga && targetMovieTitle && (
          <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Actuellement lié à :</span>{' '}
              <span className="font-bold text-indigo-300">🎬 {currentSaga.name}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnlinkCurrentMovie}
              disabled={isSaving}
              className="h-7 text-[11px] border-rose-500/40 text-rose-400 hover:bg-rose-500/10 gap-1.5"
            >
              <Unlink className="h-3 w-3" /> Dissocier
            </Button>
          </div>
        )}

        <div className="flex gap-2 p-1 bg-muted/40 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('pick_existing')}
            disabled={existingSagas.length === 0}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mode === 'pick_existing'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            } ${existingSagas.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            Saga existante ({existingSagas.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('create_new')}
            className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
              mode === 'create_new'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            + Nouvelle saga
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 py-1 pr-1">
          {mode === 'pick_existing' ? (
            existingSagas.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Aucune saga personnalisée créée pour le moment.
              </div>
            ) : (
              <div className="space-y-2">
                {existingSagas.map((saga) => {
                  const isLinkedToThis = (saga.movieTitles || []).some(
                    t => t.toLowerCase().trim() === normTarget
                  );
                  return (
                    <button
                      key={saga.id}
                      type="button"
                      onClick={() => handleAddToExistingSaga(saga)}
                      disabled={isSaving || isLinkedToThis}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isLinkedToThis
                          ? 'border-indigo-500/50 bg-indigo-500/10'
                          : 'border-border/60 hover:border-primary/60 hover:bg-muted/40'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-bold text-sm flex items-center gap-1.5 text-foreground truncate">
                          🎬 {saga.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {(saga.movieTitles || []).length} film(s) : {(saga.movieTitles || []).slice(0, 3).join(', ')}
                          {(saga.movieTitles || []).length > 3 ? '...' : ''}
                        </div>
                      </div>
                      {isLinkedToThis ? (
                        <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                          Déjà lié
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Choisir
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Nom de la Saga / Trilogie
                </label>
                <Input
                  placeholder="Ex: Trilogie du Dollar, Saga Mad Max, Univers Nolan..."
                  value={newSagaName}
                  onChange={(e) => setNewSagaName(e.target.value)}
                  className="text-sm bg-muted/20"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Cocher les films à inclure ({selectedMovies.length} sélectionnés)
                  </label>
                </div>
                <ScrollArea className="h-[220px] border border-border/60 rounded-xl p-2 bg-muted/15">
                  <div className="space-y-1">
                    {allUserMovies.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Aucun film dans votre profil.
                      </p>
                    ) : (
                      allUserMovies.map((title) => {
                        const isSelected = selectedMovies.includes(title);
                        return (
                          <button
                            key={title}
                            type="button"
                            onClick={() => handleToggleMovieSelection(title)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between text-left transition-all ${
                              isSelected
                                ? 'bg-primary/20 border border-primary/40 text-primary font-bold'
                                : 'hover:bg-muted/40 text-foreground'
                            }`}
                          >
                            <span className="truncate pr-2">{title}</span>
                            <div
                              className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                                isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              <Button
                onClick={handleCreateNewSaga}
                disabled={isSaving || !newSagaName.trim() || selectedMovies.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2"
              >
                <Sparkles className="h-4 w-4" /> Créer la saga et lier les films
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
