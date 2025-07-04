'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Heart, Loader2 } from 'lucide-react';

import { recordMovieSwipe, type MovieSwipeInput } from '@/ai/flows/movie-preference-learning';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const mockMovies = [
  { id: '1', title: 'Inception', synopsis: 'Un voleur qui s\'approprie des secrets d\'entreprise via une technologie de partage de rêves se voit confier la tâche inverse : implanter une idée dans l\'esprit d\'un PDG.', posterUrl: 'https://placehold.co/400x600.png', "data-ai-hint": "movie poster" },
  { id: '2', title: 'Parasite', synopsis: 'Toute la famille de Ki-taek est au chômage, et s’intéresse particulièrement au train de vie de la richissime famille Park. Un jour, leur fils réussit à se faire recommander pour donner des cours particuliers d’anglais chez les Park. C’est le début d’un engrenage incontrôlable, dont personne ne sortira véritablement indemne...', posterUrl: 'https://placehold.co/400x600.png', "data-ai-hint": "thriller movie" },
  { id: '3', title: 'Le Fabuleux Destin d\'Amélie Poulain', synopsis: 'Amélie, une jeune serveuse dans un bar de Montmartre, passe son temps à observer les gens et à laisser son imagination divaguer. Elle s\'est fixé un but : faire le bien de ceux qui l\'entourent. Elle invente alors des stratagèmes pour intervenir incognito dans leur existence.', posterUrl: 'https://placehold.co/400x600.png', "data-ai-hint": "romantic comedy" },
  { id: '4', title: 'La Cité de la peur', synopsis: 'Odile Deray, attachée de presse, vient au Festival de Cannes pour présenter le film "Red is Dead". Les projectionnistes du film sont assassinés les uns après les autres. L\'enquête est menée par le commissaire Bialès.', posterUrl: 'https://placehold.co/400x600.png', "data-ai-hint": "french comedy" },
];

export default function MovieSwiper() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSwipe = async (swipeDirection: 'left' | 'right') => {
    if (isLoading || currentIndex >= mockMovies.length) return;

    setIsLoading(true);
    const movie = mockMovies[currentIndex];
    
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
  
  const currentMovie = currentIndex < mockMovies.length ? mockMovies[currentIndex] : null;

  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-sm h-[600px]">
        {currentMovie ? (
          <Card className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out">
            <CardHeader className="p-0 border-b relative h-3/5">
              <Image
                src={currentMovie.posterUrl}
                alt={`Affiche du film ${currentMovie.title}`}
                layout="fill"
                objectFit="cover"
                className="rounded-t-lg"
                data-ai-hint={currentMovie['data-ai-hint']}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </CardHeader>
            <div className="flex-grow flex flex-col p-4">
              <CardTitle className="font-headline text-2xl">{currentMovie.title}</CardTitle>
              <CardDescription className="mt-2 text-sm flex-grow overflow-y-auto">
                {currentMovie.synopsis}
              </CardDescription>
              <CardFooter className="p-0 pt-4 grid grid-cols-2 gap-4">
                <Button variant="outline" size="lg" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleSwipe('left')} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <X className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500" onClick={() => handleSwipe('right')} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : <Heart className="h-8 w-8" />}
                </Button>
              </CardFooter>
            </div>
          </Card>
        ) : (
          <Card className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold font-headline">C'est tout pour aujourd'hui !</h3>
              <p className="text-muted-foreground mt-2">Revenez demain pour de nouvelles suggestions.</p>
              <Button className="mt-4" onClick={() => setCurrentIndex(0)}>Recommencer</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
