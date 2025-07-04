'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { X, Heart, Loader2, Film } from 'lucide-react';

import { recordMovieSwipe, type MovieSwipeInput } from '@/ai/flows/movie-preference-learning';
import { generateMoviePoster } from '@/ai/flows/generate-movie-poster';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const mockMovies = [
  { id: '1', title: 'Inception', synopsis: 'Un voleur qui s\'approprie des secrets d\'entreprise via une technologie de partage de rêves se voit confier la tâche inverse : implanter une idée dans l\'esprit d\'un PDG.', genre: 'Sci-Fi' },
  { id: '2', title: 'Parasite', synopsis: 'Toute la famille de Ki-taek est au chômage, et s’intéresse particulièrement au train de vie de la richissime famille Park. C’est le début d’un engrenage incontrôlable.', genre: 'Thriller' },
  { id: '3', title: 'Amélie Poulain', synopsis: 'Amélie, une jeune serveuse à Montmartre, s\'invente des stratagèmes pour intervenir incognito dans l\'existence des autres.', genre: 'Comédie' },
  { id: '4', title: 'La Cité de la peur', synopsis: 'Odile Deray, attachée de presse, vient au Festival de Cannes pour présenter le film "Red is Dead". Les projectionnistes sont assassinés les uns après les autres.', genre: 'Comédie' },
  { id: '5', title: 'Gladiator', synopsis: 'Un général romain trahi devient gladiateur pour venger sa famille.', genre: 'Historique' },
  { id: '6', title: 'Le Seigneur des Anneaux', synopsis: 'Un jeune hobbit hérite d\'un anneau puissant qui doit être détruit avant que le seigneur des ténèbres ne s\'en empare.', genre: 'Fantasy' },
  { id: '7', title: 'Forrest Gump', synopsis: 'Les pérégrinations d\'un homme simple d\'esprit à travers plusieurs décennies de l\'histoire américaine.', genre: 'Drame' },
];

export default function MovieSwiper() {
  const searchParams = useSearchParams();
  const genreFilter = searchParams.get('genre');

  const [movies, setMovies] = useState(mockMovies);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosterUrl, setCurrentPosterUrl] = useState<string | null>(null);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const filtered = genreFilter 
      ? mockMovies.filter(m => m.genre === genreFilter)
      : mockMovies;
    
    setMovies(filtered);
    setCurrentIndex(0);
  }, [genreFilter]);

  useEffect(() => {
    const fetchPoster = async () => {
      if (currentIndex >= movies.length) {
        setIsPosterLoading(false);
        return;
      }

      setIsPosterLoading(true);
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
    if (isLoading || isPosterLoading || currentIndex >= movies.length) return;

    setIsLoading(true);
    const movie = movies[currentIndex];
    
    try {
      const input: MovieSwipeInput = {
        userId: 'anonymous-user', // In a real app, this would be the logged-in user's ID
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
      setIsLoading(false);
    }
  };
  
  const currentMovie = currentIndex < movies.length ? movies[currentIndex] : null;

  const resetSwiper = () => {
    const filtered = genreFilter 
      ? mockMovies.filter(m => m.genre === genreFilter)
      : mockMovies;
    setMovies(filtered);
    setCurrentIndex(0);
  };

  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-sm h-[600px]">
        {movies.length === 0 ? (
          <Card className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <CardContent className="p-6">
              <Film className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-bold font-headline mt-4">Aucun film trouvé</h3>
              <p className="text-muted-foreground mt-2">
                {genreFilter ? `Aucun film pour le genre "${genreFilter}".` : "La liste de films est vide."}
              </p>
              <Button className="mt-4" variant="outline" onClick={() => window.location.href = '/tfarrej'}>Voir tous les films</Button>
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
                <Button variant="outline" size="lg" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleSwipe('left')} disabled={isLoading || isPosterLoading}>
                  {(isLoading || isPosterLoading) ? <Loader2 className="animate-spin" /> : <X className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500" onClick={() => handleSwipe('right')} disabled={isLoading || isPosterLoading}>
                  {(isLoading || isPosterLoading) ? <Loader2 className="animate-spin" /> : <Heart className="h-8 w-8" />}
                </Button>
              </CardFooter>
            </div>
          </Card>
        ) : (
          <Card className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold font-headline">C'est tout pour aujourd'hui !</h3>
              <p className="text-muted-foreground mt-2">Revenez demain ou explorez d'autres genres.</p>
              <Button className="mt-4" onClick={resetSwiper}>Recommencer</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
