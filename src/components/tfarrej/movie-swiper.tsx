'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Eye, X, RotateCcw, ChevronRight, Film } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase/client';
import { rejectMovie } from '@/lib/firebase/firestore';
import Image from 'next/image';

// Client-side filtering util
function applyFilters(list: MovieSuggestion[] = [], opts: { minRating: number; countries: string[]; yearRange: [number, number] }) {
  const selected = (opts.countries || []).map(c => c.toLowerCase().trim()).filter(Boolean);
  const [yMin, yMax] = opts.yearRange || [0, new Date().getFullYear()];
  return list.filter((m: MovieSuggestion) => {
    const inRating = m.rating >= (opts.minRating || 0);
    const inYear = m.year >= (yMin || 0) && m.year <= (yMax || new Date().getFullYear());
    const mCountry = (m.country || '').toLowerCase();
    const inCountry = selected.length === 0 ? true : selected.some(ct => mCountry.includes(ct));
    return inRating && inYear && inCountry;
  });
}

// Dismissed titles persistence (localStorage)
const DISMISSED_KEY = 'tfarrej_dismissed_titles';
function getDismissedTitles(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return raw ? JSON.parse(raw) as string[] : [];
  } catch { return []; }
}
function addDismissedTitle(title: string) {
  if (typeof window === 'undefined') return;
  try {
    const cur = getDismissedTitles();
    if (!cur.includes(title)) {
      const next = [title, ...cur].slice(0, 300);
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    }
  } catch { }
}

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

// Définition du type pour les films
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
  posterUrl?: string;
}

// Composant de chargement
const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function MovieSwiper({ genre, type = 'movie' }: { genre: string; type?: 'movie' | 'tv' }) {
  // États de base
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const initialFetchDone = useRef(false);

  // État pour le filtre d'année
  const [yearRange, setYearRange] = useState<[number, number]>([1997, new Date().getFullYear()]);
  const [tempYearRange, setTempYearRange] = useState<[number, number]>([1997, new Date().getFullYear()]);

  // Hooks d'authentification et toast
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Vérification du côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Function to load movies
  const loadMovies = useCallback(async (append: boolean = false) => {
    if (!user || !userProfile) return;

    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch('/api/tmdb-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          countries: userProfile.preferredCountries || [],
          yearRange: yearRange,
          minRating: userProfile.preferredMinRating || 6,
          count: 10,
          seenMovieTitles: type === 'movie' ? (userProfile?.seenMovieTitles || []) : (userProfile?.seenSeriesTitles || []),
          rejectedMovieTitles: type === 'movie' ? (userProfile?.rejectedMovieTitles || []) : (userProfile?.rejectedSeriesTitles || []),
          genre: genre === 'Historique' ? undefined : genre,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des films');
      }

      const data = await response.json();
      const fetchedMovies = data.movies || [];

      const newMovies: MovieSuggestion[] = fetchedMovies.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        year: movie.year,
        rating: movie.rating,
        genre: genre || 'Général',
        synopsis: movie.synopsis || 'Synopsis non disponible.',
        actors: movie.actors || [],
        country: movie.country || 'Inconnu',
        wikipediaUrl: movie.wikipediaUrl,
        posterUrl: movie.posterUrl,
      }));

      if (append) {
        setMovies(prev => [...prev, ...newMovies]);
      } else {
        setMovies(newMovies);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Erreur de chargement:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les films',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, userProfile, yearRange, genre, toast]);

  useEffect(() => {
    if (!isClient || authLoading) {
      setIsLoading(false);
      return;
    }

    if (!user || !userProfile) {
      setIsLoading(false);
      return;
    }

    loadMovies(false);
  }, [isClient, authLoading, user, userProfile, loadMovies]);

  // Load more when getting close to end
  useEffect(() => {
    if (movies.length > 0 && currentIndex >= movies.length - 2 && !isLoadingMore) {
      loadMovies(true);
    }
  }, [currentIndex, movies.length, isLoadingMore, loadMovies]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!user || currentIndex >= movies.length) return;

    const action = direction === 'left' ? 'vu' : 'ajouté à votre liste';
    const item = movies[currentIndex];

    try {
      if (direction === 'left') {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Utilisateur non connecté');

        const token = await currentUser.getIdToken();
        const response = await fetch('/api/user/movies/seen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: user.uid,
            title: item.title,
            type,
          }),
        });

        if (!response.ok) throw new Error(`Impossible d'enregistrer ${type === 'movie' ? 'le film' : 'la série'} comme vu`);
      } else {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Utilisateur non connecté');

        const token = await currentUser.getIdToken();
        const response = await fetch('/api/user/movies/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: user.uid,
            title: item.title,
            type,
          }),
        });

        if (!response.ok) throw new Error(`Impossible d'ajouter ${type === 'movie' ? 'le film' : 'la série'} à la liste`);
      }

      toast({
        title: `${item.title} ${action} !`,
        description: direction === 'right' ? `Consultez la liste 'À Voir' pour ${type === 'movie' ? 'le' : 'la'} retrouver.` : undefined
      });

      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Erreur lors du swipe:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue lors du traitement de votre action.'
      });
    }
  }, [user, currentIndex, movies, toast]);

  const handleReject = useCallback(async () => {
    if (currentIndex >= movies.length) return;
    const movie = movies[currentIndex];

    try {
      if (user) {
        // We'll need to update rejectMovie in firestore.ts as well
        await rejectMovie(user.uid, movie.title, type);
      } else {
        addDismissedTitle(movie.title);
      }

      toast({
        title: `${type === 'movie' ? 'Film' : 'Série'} ignoré${type === 'tv' ? 'e' : ''}`,
        description: `"${movie.title}" ne vous sera plus proposé${type === 'tv' ? 'e' : ''}.`
      });

      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Erreur lors de l\'ignorance du film:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'ignorer ce film pour le moment.'
      });
    }
  }, [currentIndex, movies, toast, user]);

  const handleSkipNext = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

  // Gestion des raccourcis clavier
  useEffect(() => {
    if (!isClient) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleReject();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe('right');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleSkipNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isClient, handleReject, handleSwipe, handleSkipNext]);

  if (!isClient || authLoading || isLoading) {
    return <LoadingState />;
  }

  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-6">
          <h3 className="text-lg font-semibold mb-2">Connexion requise</h3>
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder à cette fonctionnalité.</p>
        </div>
      </div>
    );
  }

  const currentMovie = currentIndex < movies.length ? movies[currentIndex] : null;

  if (!currentMovie) {
    return (
      <div className="flex justify-center">
        <Card className="w-full max-w-sm h-[300px] flex flex-col items-center justify-center text-center p-6">
          <h3 className="text-xl font-semibold mb-2">C'est tout pour le moment !</h3>
          <p className="text-muted-foreground mb-4">
            Vous avez parcouru tous les {type === 'movie' ? 'films disponibles' : 'séries disponibles'}.
          </p>
          <Button
            variant="outline"
            onClick={() => loadMovies(false)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Charger plus de {type === 'movie' ? 'films' : 'séries'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="relative w-full max-w-sm">
        {/* Filtre d'année */}
        <div className="mb-4 p-4 bg-card rounded-lg border">
          <Label className="text-sm font-medium mb-2 block">
            Période : {tempYearRange[0]} - {tempYearRange[1]}
          </Label>
          <Slider
            value={tempYearRange}
            onValueChange={(value) => setTempYearRange(value as [number, number])}
            onValueCommit={(value) => setYearRange(value as [number, number])}
            min={1970}
            max={new Date().getFullYear()}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1970</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-start gap-3">
              {/* Miniature poster */}
              <div className="flex-shrink-0 w-16 h-24 rounded-md overflow-hidden bg-muted relative">
                {currentMovie.posterUrl ? (
                  <Image
                    src={currentMovie.posterUrl}
                    alt={currentMovie.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <CardTitle className="text-base leading-tight">{currentMovie.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{currentMovie.year}</span>
                  <span>•</span>
                  <span className="flex items-center">
                    <span className="text-yellow-500 mr-0.5">★</span>
                    {currentMovie.rating?.toFixed(1)}
                  </span>
                </div>
                {currentMovie.country && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {currentMovie.country}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-1">Synopsis</h4>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {currentMovie.synopsis || 'Aucune description disponible'}
                </p>
              </div>

              {currentMovie.wikipediaUrl && (
                <a
                  href={currentMovie.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline inline-block"
                >
                  En savoir plus →
                </a>
              )}
            </div>
          </CardContent>

          <CardFooter className="p-4 pt-2">
            <div className="w-full grid grid-cols-4 gap-2">
              {/* Déjà vu */}
              <Button
                variant="outline"
                size="sm"
                className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 h-11 flex flex-col items-center justify-center gap-0.5"
                onClick={() => handleSwipe('left')}
                title="Marquer comme vu"
              >
                <Eye className="h-4 w-4" />
                <span className="text-[9px]">Vu</span>
              </Button>

              {/* A voir */}
              <Button
                variant="default"
                size="sm"
                className="h-11 flex flex-col items-center justify-center gap-0.5"
                onClick={() => handleSwipe('right')}
                title="Ajouter à ma liste"
              >
                <span className="text-lg font-bold leading-none">+</span>
                <span className="text-[9px]">À voir</span>
              </Button>

              {/* Suivant */}
              <Button
                variant="outline"
                size="sm"
                className="h-11 flex flex-col items-center justify-center gap-0.5"
                onClick={handleSkipNext}
                title="Film suivant"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="text-[9px]">Suivant</span>
              </Button>

              {/* Ne plus suggérer */}
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive/10 h-11 flex flex-col items-center justify-center gap-0.5"
                onClick={handleReject}
                title="Ne plus suggérer"
              >
                <X className="h-4 w-4" />
                <span className="text-[9px]">Ignorer</span>
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Chargement de plus de {type === 'movie' ? 'films' : 'séries'}...
          </div>
        )}
      </div>
    </div>
  );
}
