'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Eye, X, RotateCcw } from 'lucide-react';
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast"; // Corrected import path
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  // État d'authentification
  const { user, userProfile, loading: authLoading } = useAuth();
  
  // États de base
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { toast } = useToast();
  const initialFetchDone = useRef(false);
  
  // Vérification côté client uniquement
  const [isClient, setIsClient] = useState(false);

  // Vérification du côté client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Chargement initial
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return;
    
    const loadData = async () => {
      if (authLoading) {
        setIsLoading(true);
        return;
      }
      
      // Si l'utilisateur n'est pas connecté, on ne fait rien
      if (!user || !userProfile) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        // Simulation d'un chargement de films
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Données de test
        const testMovies: MovieSuggestion[] = [
          {
            id: '1',
            title: 'Film de test',
            year: 2023,
            rating: 7.5,
            genre: genre || 'Général',
            synopsis: 'Ceci est un film de test pour le débogage.',
            actors: ['Acteur 1', 'Acteur 2'],
            country: 'France'
          },
          {
            id: '2',
            title: 'Autre film',
            year: 2022,
            rating: 8.0,
            genre: genre || 'Général',
            synopsis: 'Un autre film pour tester le composant.',
            actors: ['Acteur 3', 'Acteur 4'],
            country: 'États-Unis'
          }
        ];
        
        setMovies(testMovies);
      } catch (error) {
        console.error('Erreur de chargement:', error);
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de charger les films',
        });
      } finally {
        setIsLoading(false);
        initialFetchDone.current = true;
      }
    };
    
    loadData();
  }, [isClient, authLoading, user, userProfile, toast, genre]);

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

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!user || currentIndex >= movies.length) return;
    
    const action = direction === 'left' ? 'vu' : 'ajouté à votre liste';
    const movie = movies[currentIndex];
    
    try {
      // Ici, vous pourriez ajouter la logique pour enregistrer le swipe
      // Par exemple : await recordMovieSwipe(user.uid, movie.id, direction);
      
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
