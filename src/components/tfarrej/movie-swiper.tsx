'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Eye, X, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

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
  } catch {}
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
}

// Composant de chargement
const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function MovieSwiper({ genre }: { genre: string }) {
  // États de base
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const initialFetchDone = useRef(false);
  
  // État pour le filtre d'année
  const [yearRange, setYearRange] = useState<[number, number]>([1997, new Date().getFullYear()]);
  
  // Hooks d'authentification et toast
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Vérification du côté client
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (!isClient || authLoading) {
      setIsLoading(false);
      return;
    }

    if (!user || !userProfile) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Appel à l'API TMDB pour récupérer des vrais films
        const response = await fetch('/api/tmdb-suggest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            countries: [], // Pas de préférences pays pour le moment
            yearRange: yearRange, // Utiliser le filtre d'année
            minRating: 6, // Note minimale par défaut
            count: 10,
            seenMovieTitles: userProfile?.seenMovieTitles || [],
            genre: genre === 'Historique' ? undefined : genre,
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors du chargement des films');
        }

        const data = await response.json();
        const fetchedMovies = data.movies || [];

        // Transformer les données pour correspondre à l'interface MovieSuggestion
        const movies: MovieSuggestion[] = fetchedMovies.map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          year: movie.year,
          rating: movie.rating,
          genre: genre || 'Général',
          synopsis: movie.synopsis || 'Synopsis non disponible.',
          actors: movie.actors || [],
          country: movie.country || 'Inconnu',
          wikipediaUrl: movie.wikipediaUrl,
        }));

        setMovies(movies);
        setCurrentIndex(0); // Réinitialiser l'index quand on recharge
      } catch (error) {
        console.error('Erreur de chargement:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de charger les films',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isClient, authLoading, user, userProfile, toast, genre, yearRange]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!user || currentIndex >= movies.length) return;

    const action = direction === 'left' ? 'vu' : 'ajouté à votre liste';
    const movie = movies[currentIndex];

    try {
      console.log('handleSwipe appelé avec:', { direction, user: !!user, currentIndex, movieTitle: movies[currentIndex]?.title });
      
      // Enregistrer le film comme vu
      if (direction === 'left') {
        console.log('Ajout aux films vus...');
        // Ajouter aux films vus
        const response = await fetch('/api/user/movies/seen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            movieTitle: movie.title,
          }),
        });

        console.log('Response seen:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur response:', errorText);
          throw new Error('Impossible d\'enregistrer le film comme vu');
        }
        
        const result = await response.json();
        console.log('Result seen:', result);
      } else {
        console.log('Ajout à la liste à voir...');
        // Ajouter à la liste à voir
        const response = await fetch('/api/user/movies/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            movieTitle: movie.title,
          }),
        });

        console.log('Response watchlist:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erreur response:', errorText);
          throw new Error('Impossible d\'ajouter le film à la liste');
        }
        
        const result = await response.json();
        console.log('Result watchlist:', result);
      }

      toast({
        title: `${movie.title} ${action} !`,
        description: direction === 'right' ? "Consultez la liste 'À Voir' pour le retrouver." : undefined
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

  const handleSkip = useCallback(() => {
    if (currentIndex >= movies.length) return;
    const movie = movies[currentIndex];

    try {
      // Ici, vous pourriez ajouter la logique pour ignorer le film
      // Par exemple : await skipMovie(user.uid, movie.id);

      toast({
        title: 'Film ignoré',
        description: `Vous avez ignoré "${movie.title}"`
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
  }, [currentIndex, movies, toast]);

  // Gestion des raccourcis clavier
  useEffect(() => {
    if (!isClient) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe('right');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isClient, handleSkip, handleSwipe]);

  // État de chargement ou utilisateur non connecté
  if (!isClient || authLoading || isLoading) {
    return <LoadingState />;
  }

  // Si l'utilisateur n'est pas connecté
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
            Vous avez parcouru tous les films disponibles dans cette catégorie.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setCurrentIndex(0);
              // Ici, vous pourriez recharger d'autres films si nécessaire
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
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
            Période : {yearRange[0]} - {yearRange[1]}
          </Label>
          <Slider
            value={yearRange}
            onValueChange={(value) => setYearRange(value as [number, number])}
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
        
        <Card className="h-[550px] flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{currentMovie.title} ({currentMovie.year})</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    {currentMovie.rating?.toFixed(1)}/10
                  </span>
                  <span>•</span>
                  <span>{currentMovie.genre}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-grow flex flex-col">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Synopsis</h4>
                <p className="text-sm text-muted-foreground">
                  {currentMovie.synopsis || 'Aucune description disponible'}
                </p>
              </div>
              
              <div className="h-px bg-border my-2" />
              
              {currentMovie.actors && currentMovie.actors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Acteurs principaux</h4>
                  <p className="text-sm text-muted-foreground">
                    {currentMovie.actors.join(', ')}
                  </p>
                </div>
              )}
              
              {currentMovie.country && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Pays :</span> {currentMovie.country}
                </div>
              )}
              
              {currentMovie.wikipediaUrl && (
                <div>
                  <a
                    href={currentMovie.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    En savoir plus sur Wikipedia
                  </a>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="p-4 pt-0 grid grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              size="lg" 
              className="border-destructive text-destructive hover:bg-destructive/10 h-14"
              onClick={() => handleSwipe('left')}
            >
              <Eye className="h-6 w-6" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14"
              onClick={handleSkip}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <Button 
              variant="default" 
              size="lg" 
              className="h-14"
              onClick={() => handleSwipe('right')}
            >
              <span className="text-xl">+</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
