'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X, Heart, Loader2, Film, RotateCcw, Star, Link as LinkIcon, Users, Calendar } from 'lucide-react';

import { recordMovieSwipe } from '@/ai/flows/movie-preference-learning';
import type { MovieSwipeInput } from '@/ai/flows/movie-preference-learning.types';
import { generateMovieSuggestions } from '@/ai/flows/generate-movie-suggestions-flow';
import type { MovieSuggestion } from '@/ai/flows/generate-movie-suggestions-flow.types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function MovieSwiper() {
  const searchParams = useSearchParams();
  const genreFilter = searchParams.get('genre');

  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipeLoading, setIsSwipeLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);
  const { toast } = useToast();

  const fetchMovies = useCallback(async () => {
    setIsSuggestionsLoading(true);
    setCurrentIndex(0);
    setMovies([]);
    try {
      const result = await generateMovieSuggestions({ genre: genreFilter || undefined });
      setMovies(result.movies);
    } catch (error) {
      console.error('Failed to fetch movie suggestions', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de charger les suggestions de films.",
      });
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [genreFilter, toast]);

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
            <Card className="relative w-full max-w-sm h-[600px] flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Recherche de nouveaux films...</p>
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
                {genreFilter ? `Aucun film pour le genre "${genreFilter}".` : "La liste de films est vide."}
              </p>
              <Button className="mt-4" variant="outline" onClick={fetchMovies}>
                <RotateCcw className="mr-2 h-4 w-4" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : currentMovie ? (
          <Card className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl">
            <CardHeader className="p-0 relative h-[250px] overflow-hidden">
                <Image
                    src={`https://placehold.co/400x250.png`}
                    data-ai-hint={`${currentMovie.genre} movie`}
                    alt={`Image d'ambiance pour ${currentMovie.title}`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-t-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                     <Badge variant="secondary" className="mb-2">{currentMovie.genre}</Badge>
                     <CardTitle className="font-headline text-3xl">{currentMovie.title}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-4 pt-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-400" /> 
                        <span className="font-bold">{currentMovie.rating.toFixed(1)}</span>/10
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> 
                        <span className="font-bold">{currentMovie.year}</span>
                    </div>
                </div>
              
              <p className="text-sm flex-grow overflow-y-auto mb-4">{currentMovie.synopsis}</p>
              
              <Separator className="my-2"/>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{currentMovie.actors.join(', ')}</span>
                </div>
                <Link href={currentMovie.wikipediaUrl} target="_blank" rel="noopener noreferrer" passHref>
                    <Button variant="link" className="p-0 h-auto text-sm">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Voir sur Wikipédia
                    </Button>
                </Link>
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
              <h3 className="text-xl font-bold font-headline">C'est tout pour aujourd'hui !</h3>
              <p className="text-muted-foreground mt-2">Revenez demain ou réessayez pour de nouvelles suggestions.</p>
              <Button className="mt-4" onClick={fetchMovies}>
                <RotateCcw className="mr-2 h-4 w-4" /> Voir d'autres films
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
