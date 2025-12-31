'use client';

import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Film, Trash2, Eye, Loader2, Star, ExternalLink } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { moveMovieFromWatchlistToSeen, clearUserMovieList, removeMovieFromList } from '@/lib/firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface MovieDetails {
  title: string;
  rating?: number;
  wikipediaUrl?: string;
  year?: number;
  country?: string;
}

interface MovieListSheetProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  listType: 'moviesToWatch' | 'seenMovieTitles';
}

// Composant séparé pour le contenu du Sheet
function MovieListContent({
  listType,
  onMarkAsWatched,
  onRemove,
  isUpdating
}: {
  listType: 'moviesToWatch' | 'seenMovieTitles';
  onMarkAsWatched: (movieTitle: string) => Promise<void>;
  onRemove: (movieTitle: string) => Promise<void>;
  isUpdating: boolean;
}) {
  const { userProfile } = useAuth();
  const [movieDetails, setMovieDetails] = useState<Record<string, MovieDetails>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const movieTitles = userProfile?.[listType];
  const sortedMovieTitles = movieTitles ? [...movieTitles].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })) : [];

  // Fonction pour récupérer les détails d'un film
  const fetchMovieDetails = async (movieTitle: string) => {
    if (movieDetails[movieTitle]) return; // Déjà chargé

    setIsLoadingDetails(true);
    try {
      const response = await fetch('/api/tmdb-movie-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: movieTitle }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Détails du film reçus:', data);
        if (data.movie) {
          setMovieDetails(prev => ({
            ...prev,
            [movieTitle]: {
              title: movieTitle,
              rating: data.movie.rating,
              wikipediaUrl: data.movie.wikipediaUrl,
              year: data.movie.year,
              country: data.movie.country,
            }
          }));
        } else {
          console.log('Aucun film trouvé dans la réponse:', data);
        }
      } else {
        console.error('Erreur API:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du film:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Charger les détails pour les films dans la liste "À Voir"
  useEffect(() => {
    if (listType === 'moviesToWatch' && sortedMovieTitles.length > 0) {
      sortedMovieTitles.forEach(movieTitle => {
        fetchMovieDetails(movieTitle);
      });
    }
  }, [listType, sortedMovieTitles]);

  return (
    <div className="relative flex-grow">
      {isUpdating && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
      <TooltipProvider>
        <ScrollArea className="h-full pr-4">
          <div className="py-4 space-y-2">
            {sortedMovieTitles && sortedMovieTitles.length > 0 ? (
              sortedMovieTitles.map((movieTitle, index) => {
                const details = movieDetails[movieTitle];
                return (
                  <div key={`${movieTitle}-${index}`} className="flex flex-col p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium break-words" style={{ wordBreak: 'break-word' }}>
                          {movieTitle}
                        </h4>

                        {/* Afficher les détails pour la liste "À Voir" */}
                        {listType === 'moviesToWatch' && details && (
                          <div className="flex flex-nowrap items-center gap-2 mt-2 overflow-hidden text-xs text-muted-foreground">
                            {details.rating && (
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{details.rating}/10</span>
                              </div>
                            )}

                            {details.year && (
                              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 flex-shrink-0">
                                {details.year}
                              </Badge>
                            )}

                            {details.country && (
                              <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-5 truncate max-w-[80px]">
                                {details.country}
                              </Badge>
                            )}

                            {details.wikipediaUrl && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={() => window.open(details.wikipediaUrl, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Voir sur Wikipedia</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}

                        {/* Afficher un loader si les détails sont en cours de chargement */}
                        {listType === 'moviesToWatch' && !details && isLoadingDetails && (
                          <div className="flex items-center gap-1 mt-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs text-muted-foreground">Chargement...</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        {listType === 'moviesToWatch' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onMarkAsWatched(movieTitle)}
                                disabled={isUpdating}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Marquer comme vu</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Marquer comme vu</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => onRemove(movieTitle)}
                              disabled={isUpdating}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Supprimer</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Supprimer</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-[50vh]">
                <Film className="h-10 w-10 mb-4" />
                <p>Votre liste est vide pour le moment.</p>
                {listType === 'moviesToWatch' && <p className="text-xs">"Likez" des films pour la remplir !</p>}
              </div>
            )}
          </div>
        </ScrollArea>
      </TooltipProvider>
    </div>
  );
}

export function MovieListSheet({ trigger, title, description, listType }: MovieListSheetProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkAsWatched = async (movieTitle: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await moveMovieFromWatchlistToSeen(user.uid, movieTitle);
      toast({ title: `"${movieTitle}" marqué comme vu.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour le film." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async (movieTitle: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await removeMovieFromList(user.uid, listType, movieTitle);
      toast({ title: `"${movieTitle}" supprimé de la liste.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le film.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearList = async () => {
    if (!user) return;
    setIsClearing(true);
    try {
      await clearUserMovieList(user.uid, listType);
      toast({ title: "Liste vidée avec succès." });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de vider la liste." });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <div className="flex justify-between items-start">
            <div className="pr-4">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" disabled={isClearing}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="sr-only">Vider la liste</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible et videra complètement la liste "{title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleClearList}
                    disabled={isClearing}
                  >
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SheetHeader>
        <MovieListContent
          listType={listType}
          onMarkAsWatched={handleMarkAsWatched}
          onRemove={handleRemove}
          isUpdating={isUpdating}
        />
      </SheetContent>
    </Sheet>
  );
}