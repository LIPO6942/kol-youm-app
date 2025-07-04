'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { X, Heart, Loader2, Film, RotateCcw } from 'lucide-react';

import { recordMovieSwipe } from '@/ai/flows/movie-preference-learning';
import type { MovieSwipeInput } from '@/ai/flows/movie-preference-learning.types';
import { generateMoviePoster } from '@/ai/flows/generate-movie-poster';
import { generateMovieSuggestions } from '@/ai/flows/generate-movie-suggestions-flow';
import type { MovieSuggestion } from '@/ai/flows/generate-movie-suggestions-flow.types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function MovieSwiper() {
  const searchParams = useSearchParams();
  const genreFilter = searchParams.get('genre');

  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipeLoading, setIsSwipeLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);
  const [currentPosterUrl, setCurrentPosterUrl] = useState<string | null>(null);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
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

  useEffect(() => {
    const fetchPoster = async () => {
      if (currentIndex >= movies.length) {
        setIsPosterLoading(false);
        return;
      }

      setIsPosterLoading(true);
      setCurrentPosterUrl(null);
      const movie = movies[currentIndex];
      try {
        const result = await generateMoviePoster({ title: movie.title, synopsis: movie.synopsis });
        setCurrentPosterUrl(result.posterDataUri);
      } catch (error) {
        console.error('Failed to generate poster', error);
        setCurrentPosterUrl('https://placehold.co/400x600.png');
        toast({
          variant: 'destructive',
          title: 'Erreur de génération d\'image',
          description: "Impossible de créer l'affiche du film.",
        });
      } finally {
        setIsPosterLoading(false);
      }
    };

    if (movies.length > 0) {
      fetchPoster();
    } else {
        setIsPosterLoading(false);
    }
  }, [currentIndex, movies, toast]);

  const handleSwipe = async (swipeDirection: 'left' | 'right') => {
    if (isSwipeLoading || isPosterLoading || currentIndex >= movies.length) return;

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
          <Card className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out">
            <CardHeader className="p-0 border-b relative h-3/5">
              {isPosterLoading ? (
                 <div className="w-full h-full flex items-center justify-center bg-secondary rounded-t-lg">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                 </div>
              ) : currentPosterUrl && (
                <>
                  <Image
                    src={currentPosterUrl}
                    alt={`Affiche du film ${currentMovie.title}`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-t-lg"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </>
              )}
            </CardHeader>
            <div className="flex-grow flex flex-col p-4">
              <CardTitle className="font-headline text-2xl">{currentMovie.title}</CardTitle>
              <CardDescription className="mt-2 text-sm flex-grow overflow-y-auto">
                {currentMovie.synopsis}
              </CardDescription>
              <CardFooter className="p-0 pt-4 grid grid-cols-2 gap-4">
                <Button variant="outline" size="lg" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleSwipe('left')} disabled={isSwipeLoading || isPosterLoading}>
                  {(isSwipeLoading || isPosterLoading) ? <Loader2 className="animate-spin" /> : <X className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500" onClick={() => handleSwipe('right')} disabled={isSwipeLoading || isPosterLoading}>
                  {(isSwipeLoading || isPosterLoading) ? <Loader2 className="animate-spin" /> : <Heart className="h-8 w-8" />}
                </Button>
              </CardFooter>
            </div>
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
