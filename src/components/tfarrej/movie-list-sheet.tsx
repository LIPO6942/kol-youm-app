'use client';

import { useState } from 'react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Film, Trash2, Eye, Loader2 } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { moveMovieFromWatchlistToSeen, clearUserMovieList } from '@/lib/firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MovieListSheetProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  listType: 'moviesToWatch' | 'seenMovieTitles';
}

export function MovieListSheet({ trigger, title, description, listType }: MovieListSheetProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const movieTitles = userProfile?.[listType];
  const sortedMovieTitles = movieTitles ? [...movieTitles].reverse() : [];
  
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

  const handleClearList = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await clearUserMovieList(user.uid, listType);
      toast({ title: "Liste vidée avec succès." });
    } catch (error) {
       console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de vider la liste." });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <div className="flex justify-between items-start">
            <div className="pr-4">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </div>
            {sortedMovieTitles && sortedMovieTitles.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isUpdating}>
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
                          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleClearList}>Confirmer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Vider la liste</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </SheetHeader>
        <div className="relative flex-grow">
          {isUpdating && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
          <ScrollArea className="h-full pr-4">
            <div className="py-4 space-y-2">
              {sortedMovieTitles && sortedMovieTitles.length > 0 ? (
                sortedMovieTitles.map((movieTitle, index) => (
                  <div key={`${movieTitle}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center min-w-0">
                      <Film className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate" title={movieTitle}>{movieTitle}</span>
                    </div>
                    {listType === 'moviesToWatch' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleMarkAsWatched(movieTitle)} disabled={isUpdating}>
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Marquer comme vu</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Marquer comme vu</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-[50vh]">
                    <Film className="h-10 w-10 mb-4" />
                    <p>Votre liste est vide pour le moment.</p>
                    {listType === 'moviesToWatch' && <p className="text-xs">"Likez" des films pour la remplir !</p>}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
