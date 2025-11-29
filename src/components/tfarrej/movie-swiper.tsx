'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Type pour les films
interface MovieSuggestion {
  id: string;
  title: string;
  year: number;
  rating: number;
  genre: string;
  synopsis?: string;
  actors?: string[];
  country?: string;
  wikipediaUrl?: string;
}

// Loading component
const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function MovieSwiper({ genre }: { genre: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load test data
  useEffect(() => {
    const timer = setTimeout(() => {
      setMovies([
        {
          id: '1',
          title: 'Film de test',
          year: 2023,
          rating: 7.5,
          genre: genre || 'Général',
          synopsis: 'Ceci est un film de test pour le débogage.',
          actors: ['Acteur 1', 'Acteur 2'],
          country: 'France'
        }
      ]);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [genre]);

  if (isLoading) {
    return <LoadingState />;
  }

  const currentMovie = movies[currentIndex];

  if (!currentMovie) {
    return (
      <div className="flex justify-center">
        <Card className="w-full max-w-sm h-[300px] flex flex-col items-center justify-center text-center p-6">
          <h3 className="text-xl font-semibold mb-2">C'est tout pour le moment !</h3>
          <p className="text-muted-foreground mb-4">
            Vous avez parcouru tous les films disponibles dans cette catégorie.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-2">
            {currentMovie.title} ({currentMovie.year})
          </h2>
          <p className="text-muted-foreground mb-4">
            {currentMovie.genre} • {currentMovie.country}
          </p>
          
          <div className="aspect-[2/3] bg-muted rounded-md mb-4 flex items-center justify-center">
            <span className="text-muted-foreground">Aperçu du film</span>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Synopsis</h3>
            <p className="text-sm text-muted-foreground">
              {currentMovie.synopsis || 'Aucune description disponible'}
            </p>
          </div>
          
          {currentMovie.actors && currentMovie.actors.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium">Acteurs</h3>
              <p className="text-sm text-muted-foreground">
                {currentMovie.actors.join(', ')}
              </p>
            </div>
          )}
        </div>
      </Card>
      
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>Fonctionnalités de swipe à implémenter</p>
      </div>
    </div>
  );
}
