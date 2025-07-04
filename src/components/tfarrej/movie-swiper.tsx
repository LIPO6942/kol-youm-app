'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Heart, Loader2, Film, RotateCcw, Star, Link as LinkIcon, Users, Calendar, Globe } from 'lucide-react';

import { recordMovieSwipe } from '@/ai/flows/movie-preference-learning';
import type { MovieSwipeInput } from '@/ai/flows/movie-preference-learning.types';
import { generateMovieSuggestions } from '@/ai/flows/generate-movie-suggestions-flow';
import type { MovieSuggestion } from '@/ai/flows/generate-movie-suggestions-flow.types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function MovieSwiper({ genre }: { genre: string }) {
  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipeLoading, setIsSwipeLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMovies = useCallback(() => {
    setIsSuggestionsLoading(true);
    setCurrentIndex(0);
    setMovies([]);
    generateMovieSuggestions({ genre: genre, count: 7 })
      .then((result) => {
        setMovies(result.movies);
      })
      .catch((error) => {
        console.error('Failed to fetch movie suggestions', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: "Impossible de charger les suggestions de films.",
        });
      })
      .finally(() => {
        setIsSuggestionsLoading(false);
      });
  }, [genre, toast]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  const handleSwipe = async (swipeDirection: 'left' | 'right') => {
    if (isSwipeLoading || currentIndex >= movies.length) return;

    setIsSwipeLoading(true);
    const movie = movies[currentIndex];
    
    try {
      const input: MovieSwipeInput = {
        userId: 'anonymous-user',
        movieId: movie.id,
        swipeDirection,
      };
      await recordMovieSwipe(input);
      
      if (swipeDirection === 'right') {
        toast({
            title: `"${movie.title}" ajouté à votre liste !`,
            description: "Continuez à swiper pour plus de découvertes."
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
      setCurrentIndex(prevIndex => prevIndex + 1);
      setIsSwipeLoading(false);
    }
  };
  
  const currentMovie = currentIndex < movies.length ? movies[currentIndex] : null;

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
                Aucun film trouvé pour le genre "{genre}".
              </p>
              <Button className="mt-4" variant="outline" onClick={fetchMovies}>
                <RotateCcw className="mr-2 h-4 w-4" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : currentMovie ? (
          <Card className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl">
            <CardHeader className="p-6">
                <Badge variant="secondary" className="mb-2 self-start">{currentMovie.genre}</Badge>
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
             <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-4">
                <Button variant="outline" size="lg" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-14" onClick={() => handleSwipe('left')} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <X className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500 h-14" onClick={() => handleSwipe('right')} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <Heart className="h-8 w-8" />}
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
