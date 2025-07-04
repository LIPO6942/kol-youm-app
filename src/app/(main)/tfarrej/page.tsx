
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MovieSwiper from '@/components/tfarrej/movie-swiper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Laugh, Masks, Search, Lightbulb, Rocket, Sparkles } from 'lucide-react';

function TfarrejContent() {
  const genres = [
    { name: 'Comédie', icon: Laugh, description: 'Pour rire aux éclats.' },
    { name: 'Drame', icon: Masks, description: 'Pour les grandes émotions.' },
    { name: 'Suspense & Thriller', icon: Search, description: 'Pour se ronger les ongles.' },
    { name: 'Mind-Blow', icon: Lightbulb, description: 'Pour retourner le cerveau.' },
    { name: 'Science-Fiction', icon: Rocket, description: 'Pour voyager dans le futur.' },
    { name: 'Découverte', icon: Sparkles, description: 'Pour une surprise totale.' },
  ];

  const searchParams = useSearchParams();
  const genreFromUrl = searchParams.get('genre');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    if (genreFromUrl) {
      // Check if genre from URL is valid
      if (genres.some(g => g.name === genreFromUrl) || genreFromUrl === 'Historique') { // Allow 'Historique' from quiz
         setSelectedGenre(genreFromUrl);
      }
    }
  }, [genreFromUrl, genres]);

  if (selectedGenre) {
    return (
      <div className="space-y-4 animate-in fade-in-50">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setSelectedGenre(null)}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight">Le Tinder du Cinéma</h2>
            <p className="text-muted-foreground">
              Suggestions pour le genre : <span className="font-semibold text-primary">{selectedGenre}</span>
            </p>
          </div>
        </div>
        <MovieSwiper key={selectedGenre} genre={selectedGenre} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight">Le Tinder du Cinéma</h2>
        <p className="text-muted-foreground">
          "Swipez" pour découvrir votre prochain film ou série coup de cœur.
        </p>
      </div>
      <Card className="animate-in fade-in-50">
        <CardHeader className="text-center">
          <CardTitle>Quelle est votre humeur cinématographique ?</CardTitle>
          <CardDescription>Sélectionnez une catégorie pour obtenir des suggestions sur mesure.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {genres.map((genre) => {
            const Icon = genre.icon;
            return (
              <div 
                key={genre.name} 
                onClick={() => setSelectedGenre(genre.name)}
                className="group flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <CardHeader className="items-center text-center p-4">
                  <div className="p-3 bg-primary/10 rounded-full mb-2">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-md font-semibold">{genre.name}</CardTitle>
                </CardHeader>
                 <CardContent className="text-center px-4 pb-4">
                  <p className="text-xs text-muted-foreground">{genre.description}</p>
                </CardContent>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}


export default function TfarrejPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <TfarrejContent />
    </Suspense>
  )
}
