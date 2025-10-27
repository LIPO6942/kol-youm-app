'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Eye, ListVideo, Loader2, Film, RotateCcw, Star, Link as LinkIcon, Users, Calendar, Globe, SkipForward } from 'lucide-react';

import { recordMovieSwipe } from '@/ai/flows/movie-preference-learning';
import { generateMovieSuggestions } from '@/ai/flows/generate-movie-suggestions-flow-fixed';
import type { MovieSuggestion } from '@/ai/flows/generate-movie-suggestions-flow.types';
import type { UserProfile } from '@/lib/firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';

const handleAiError = (error: any, toast: any) => {
    const errorMessage = String(error.message || '');
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Nous avons atteint notre limite de requêtes. L'IA se repose un peu, réessayez dans quelques minutes.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) {
         toast({
            variant: 'destructive',
            title: 'L\'IA est en surchauffe !',
            description: "Nos serveurs sont un peu surchargés. Donnez-lui un instant pour reprendre son souffle et réessayez.",
        });
    } else {
         toast({
          variant: 'destructive',
          title: 'Erreur Inattendue',
          description: "Impossible de charger les suggestions de films.",
        });
    }
    console.error('Failed to fetch movie suggestions', error);
};

export default function MovieSwiper({ genre }: { genre: string }) {
  const { user, userProfile } = useAuth();
  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipeLoading, setIsSwipeLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const initialFetchDone = useRef(false);
  
  const fetchMovies = useCallback(() => {
    // We need userProfile to get the list of seen movies.
    if (!userProfile) {
      return;
    }
    setIsSuggestionsLoading(true);
    setCurrentIndex(0);
    setMovies([]);
    
    // Always use the up-to-date list of seen movies from the user's profile.
    const seenMovieTitles = userProfile.seenMovieTitles || [];
    
    generateMovieSuggestions({ genre: genre, count: 7, seenMovieTitles })
      .then((result) => {
        setMovies(result.movies);
      })
      .catch((error) => {
        handleAiError(error, toast);
      })
      .finally(() => {
        setIsSuggestionsLoading(false);
      });
  }, [genre, toast, userProfile]);

  useEffect(() => {
    // This effect ensures we only fetch movies once when the component is ready.
    if (userProfile && !initialFetchDone.current) {
        fetchMovies();
        initialFetchDone.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);


  const handleSwipe = async (swipeDirection: 'left' | 'right') => {
    if (isSwipeLoading || currentIndex >= movies.length || !user) return;

    setIsSwipeLoading(true);
    const movie = movies[currentIndex];
    
    try {
      // The user profile is the single source of truth.
      // We update Firestore, and the onSnapshot listener in useAuth will update the userProfile object.
      const updatePayload: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>> = {
        seenMovieTitles: [movie.title],
      };
      if (swipeDirection === 'right') {
        updatePayload.moviesToWatch = [movie.title];
      }

      await Promise.all([
        recordMovieSwipe({
          userId: user.uid,
          movieId: movie.id,
          swipeDirection,
        }),
        updateUserProfile(user.uid, updatePayload)
      ]);
      
      if (swipeDirection === 'right') {
        toast({
            title: `"${movie.title}" ajouté à votre liste !`,
            description: "Consultez la liste 'À Voir' pour le retrouver."
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'enregistrer votre choix. Veuillez réessayer.",
      });
    } finally {
      setCurrentIndex((prevIndex: number) => prevIndex + 1);
      setIsSwipeLoading(false);
    }
  };

  const handleSkip = () => {
    if (isSwipeLoading || currentIndex >= movies.length) return;
    setCurrentIndex((prevIndex: number) => prevIndex + 1);
  };
  
  const currentMovie = currentIndex < movies.length ? movies[currentIndex] : null;

  // Fetch poster when currentMovie changes
  useEffect(() => {
    const loadPoster = async () => {
      if (!currentMovie) { setPosterUrl(null); return; }
      setPosterLoading(true);
      try {
        const res = await fetch(`/api/movie-poster?title=${encodeURIComponent(currentMovie.title)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('poster_not_found');
        const data = await res.json();
        setPosterUrl(typeof data?.url === 'string' ? data.url : null);
      } catch {
        setPosterUrl(null);
      } finally {
        setPosterLoading(false);
      }
    };
    loadPoster();
  }, [currentMovie]);

  if (isSuggestionsLoading) {
    return (
       <div className="flex justify-center">
            <Card className="relative w-full max-w-sm h-[550px] flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Recherche de films pour vous...</p>
            </Card>
       </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-sm h-[600px]">
        {movies.length === 0 && !isSuggestionsLoading ? (
          <Card className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <CardContent className="p-6">
              <Film className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-bold font-headline mt-4">Aucun film trouvé</h3>
              <p className="text-muted-foreground mt-2">
                Vous avez vu tous les films pour le genre "{genre}" ou il n'y a pas de nouvelles suggestions.
              </p>
              <Button className="mt-4" variant="outline" onClick={fetchMovies}>
                <RotateCcw className="mr-2 h-4 w-4" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : currentMovie ? (
          <Card className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl">
            <CardHeader className="p-6">
                <div className={`${badgeVariants({ variant: 'secondary' })} mb-2 self-start`}>{currentMovie.genre}</div>
                <CardTitle className="font-headline text-3xl leading-tight">{currentMovie.title}</CardTitle>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-400" /> 
                        <span className="font-bold">{currentMovie.rating.toFixed(1)}</span>/10
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> 
                        <span className="font-bold">{currentMovie.year}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4" /> 
                        <span className="font-bold">{currentMovie.country}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between p-6 pt-0">
                <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden bg-muted">
                  {posterLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {posterUrl ? (
                    <Image src={posterUrl} alt={`Affiche de ${currentMovie.title}`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 600px" />
                  ) : (
                    <Image
                      src={`https://placehold.co/600x300/111827/94a3b8?text=${encodeURIComponent(currentMovie.title)}`}
                      alt={`Affiche indisponible: ${currentMovie.title}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 600px"
                    />
                  )}
                </div>
                <div>
                    <h4 className="font-semibold text-sm mb-1">Synopsis</h4>
                    <p className="text-sm text-muted-foreground max-h-24 overflow-y-auto">{currentMovie.synopsis}</p>
                </div>
              
              <Separator className="my-4"/>
              
              <div className="space-y-3">
                 <div>
                    <h4 className="font-semibold text-sm mb-1">Acteurs principaux</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span>{currentMovie.actors.join(', ')}</span>
                    </div>
                 </div>
                <a href={currentMovie.wikipediaUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" className="p-0 h-auto text-sm">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        En savoir plus sur Wikipédia
                    </Button>
                </a>
              </div>
            </CardContent>
             <CardFooter className="p-4 pt-0 grid grid-cols-3 gap-4">
                <Button variant="outline" size="lg" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-14" onClick={() => handleSwipe('left')} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <Eye className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="h-14" onClick={handleSkip} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <SkipForward className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500 h-14" onClick={() => handleSwipe('right')} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <ListVideo className="h-8 w-8" />}
                </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold font-headline">C'est tout pour le moment !</h3>
              <p className="text-muted-foreground mt-2">Vous avez vu toutes les suggestions pour ce genre.</p>
              <Button className="mt-4" onClick={fetchMovies}>
                <RotateCcw className="mr-2 h-4 w-4" /> M'en proposer d'autres
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
