
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MovieSwiper from '@/components/tfarrej/movie-swiper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Laugh, Theater, Search, Lightbulb, Rocket, Sparkles, Eye, ListVideo, Settings } from 'lucide-react';
import { MovieListSheet } from '@/components/tfarrej/movie-list-sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const genres = [
  { name: 'Comédie', iconName: 'Laugh', description: 'Pour rire aux éclats.' },
  { name: 'Drame', iconName: 'Theater', description: 'Pour les grandes émotions.' },
  { name: 'Suspense & Thriller', iconName: 'Search', description: 'Pour se ronger les ongles.' },
  { name: 'Mind-Blow', iconName: 'Lightbulb', description: 'Pour retourner le cerveau.' },
  { name: 'Science-Fiction', iconName: 'Rocket', description: 'Pour voyager dans le futur.' },
  { name: 'Découverte', iconName: 'Sparkles', description: 'Pour une surprise totale.' },
];

// This helper component renders the icon statically, which is more reliable for the Next.js bundler.
const GenreIcon = ({ iconName, className }: { iconName: string, className?: string }) => {
  switch (iconName) {
    case 'Laugh': return <Laugh className={className} />;
    case 'Theater': return <Theater className={className} />;
    case 'Search': return <Search className={className} />;
    case 'Lightbulb': return <Lightbulb className={className} />;
    case 'Rocket': return <Rocket className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    default: return null;
  }
};


function TfarrejContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const genreFromUrl = searchParams.get('genre');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [type, setType] = useState<'movie' | 'tv'>('movie');

  useEffect(() => {
    if (genreFromUrl) {
      if (genres.some(g => g.name === genreFromUrl) || genreFromUrl === 'Historique') {
        setSelectedGenre(genreFromUrl);
      }
    }

    // Persist type selection
    const savedType = localStorage.getItem('tfarrej-preference-type');
    if (savedType === 'movie' || savedType === 'tv') {
      setType(savedType);
    }
  }, [genreFromUrl]);

  const handleTypeChange = (newType: string) => {
    const t = newType as 'movie' | 'tv';
    setType(t);
    localStorage.setItem('tfarrej-preference-type', t);
  };

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
              Suggestions de <span className="font-semibold">{type === 'movie' ? 'films' : 'séries'}</span> - {selectedGenre}
            </p>
          </div>
        </div>
        <MovieSwiper key={`${selectedGenre}-${type}`} genre={selectedGenre} type={type} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-headline tracking-tight">Le Tinder du Cinéma</h2>
          <p className="text-muted-foreground">
            "Swipez" pour découvrir votre prochain coup de cœur.
          </p>
        </div>
        <div className="flex gap-2 self-end sm:self-center">
          <Button variant="outline" size="icon" aria-label="Paramètres" onClick={() => router.push('/settings?tab=tfarrej')}>
            <Settings className="h-4 w-4" />
          </Button>
          <MovieListSheet
            trigger={<Button variant="ocean"><ListVideo className="mr-2 h-4 w-4" /> {type === 'movie' ? 'Films à Voir' : 'Séries à Voir'}</Button>}
            title={type === 'movie' ? "Ma Liste 'À Voir'" : "Mes Séries 'À Voir'"}
            description={type === 'movie' ? "Les films mis de côté." : "Les séries mises de côté."}
            listType={type === 'movie' ? "moviesToWatch" : "seriesToWatch"}
            type={type}
          />
          <MovieListSheet
            trigger={<Button variant="default"><Eye className="mr-2 h-4 w-4" /> {type === 'movie' ? 'Films Vus' : 'Séries Vues'}</Button>}
            title={type === 'movie' ? "Mes Films 'Vus'" : "Mes Séries 'Vues'"}
            description={type === 'movie' ? "L'historique des films notés." : "L'historique des séries notées."}
            listType={type === 'movie' ? "seenMovieTitles" : "seenSeriesTitles"}
            type={type}
          />
        </div>
      </div>

      <div className="flex justify-center pb-2">
        <Tabs value={type} className="w-[400px]" onValueChange={handleTypeChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="movie" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">Films</TabsTrigger>
            <TabsTrigger value="tv" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Séries</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="animate-in fade-in-50">
        <CardHeader className="text-center">
          <CardTitle>Quelle est votre humeur ?</CardTitle>
          <CardDescription>Sélectionnez une catégorie de {type === 'movie' ? 'films' : 'séries'}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {genres.map((genre) => (
            <div
              key={genre.name}
              onClick={() => setSelectedGenre(genre.name)}
              className="group flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <CardHeader className="items-center text-center p-4">
                <div className="p-3 bg-primary/10 rounded-full mb-2">
                  <GenreIcon iconName={genre.iconName} className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-md font-semibold">{genre.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-4 pb-4">
                <p className="text-xs text-muted-foreground">{genre.description}</p>
              </CardContent>
            </div>
          )
          )}
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
