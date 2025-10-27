'use client';

import type React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, ListVideo, Loader2, Film, RotateCcw, Star, Link as LinkIcon, Users, Calendar, Globe, SkipForward } from 'lucide-react';

import { recordMovieSwipe } from '@/ai/flows/movie-preference-learning';
import { generateMovieSuggestions } from '@/ai/flows/generate-movie-suggestions-flow-fixed';
import type { MovieSuggestion } from '@/ai/flows/generate-movie-suggestions-flow.types';
import type { UserProfile } from '@/lib/firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';

// Client-side filtering util
function applyFilters(list: MovieSuggestion[], opts: { minRating: number; country: string; minYear: number }) {
  const ctry = (opts.country || '').toLowerCase().trim();
  return list.filter(m =>
    m.rating >= (opts.minRating || 0) &&
    m.year >= (opts.minYear || 0) &&
    (!ctry || (m.country || '').toLowerCase().includes(ctry))
  );
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

export default function MovieSwiper({ genre }: { genre: string }) {
  const { user, userProfile } = useAuth();
  const [originalMovies, setOriginalMovies] = useState<MovieSuggestion[]>([]);
  const [movies, setMovies] = useState<MovieSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwipeLoading, setIsSwipeLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(true);
  const { toast } = useToast();
  const initialFetchDone = useRef(false);
  // Quick filters
  const [minRating, setMinRating] = useState<number>(0);
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [minYear, setMinYear] = useState<number>(0);
  
  const fetchMovies = useCallback(() => {
    // We need userProfile to get the list of seen movies.
    if (!userProfile) {
      return;
    }
    setIsSuggestionsLoading(true);
    setCurrentIndex(0);
    setMovies([]);
    
    // Always use the up-to-date list of seen movies from the user's profile.
    // Exclude also movies in the watchlist so they don't get suggested again.
    const seen = userProfile.seenMovieTitles || [];
    const watchlist = userProfile.moviesToWatch || [] as string[];
    const dismissed = getDismissedTitles();
    const seenMovieTitles = Array.from(new Set([...(seen as string[]), ...watchlist, ...dismissed]));
    
    generateMovieSuggestions({ genre: genre, count: 7, seenMovieTitles })
      .then((result) => {
        setOriginalMovies(result.movies);
        // apply filters immediately
        const filtered = applyFilters(result.movies, { minRating, country: countryFilter, minYear });
        setMovies(filtered);
      })
      .catch((error) => {
        handleAiError(error, toast);
      })
      .finally(() => {
        setIsSuggestionsLoading(false);
      });
  }, [genre, toast, userProfile, minRating, countryFilter, minYear]);

  useEffect(() => {
    // This effect ensures we only fetch movies once when the component is ready.
    if (userProfile && !initialFetchDone.current) {
        fetchMovies();
        initialFetchDone.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);


  const handleSwipe = async (swipeDirection: 'left' | 'right') => {
    if (isSwipeLoading || currentIndex >= movies.length || !user) return;

    setIsSwipeLoading(true);
    const movie = movies[currentIndex];
    
    try {
      // The user profile is the single source of truth.
      // We update Firestore, and the onSnapshot listener in useAuth will update the userProfile object.
      const updatePayload: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>> = {
        seenMovieTitles: [movie.title],
      };
      if (swipeDirection === 'right') {
        updatePayload.moviesToWatch = [movie.title];
      }

      await Promise.all([
        recordMovieSwipe({
          userId: user.uid,
          movieId: movie.id,
          swipeDirection,
        }),
        updateUserProfile(user.uid, updatePayload)
      ]);
      
      if (swipeDirection === 'right') {
        toast({
            title: `"${movie.title}" ajouté à votre liste !`,
            description: "Consultez la liste 'À Voir' pour le retrouver."
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
      setCurrentIndex((prevIndex: number) => prevIndex + 1);
      setIsSwipeLoading(false);
    }
  };

  const handleSkip = () => {
    if (isSwipeLoading || currentIndex >= movies.length) return;
    const movie = movies[currentIndex];
    if (movie?.title) addDismissedTitle(movie.title);
    if (movie?.title) {
      toast({ title: 'Ignoré', description: `"${movie.title}" ignoré.` });
    }
    setCurrentIndex((prevIndex: number) => prevIndex + 1);
  };
  
  const currentMovie = currentIndex < movies.length ? movies[currentIndex] : null;

  // Posters removed by request; no fetch here.

  // Keyboard shortcuts: Left=Skip, Right=Add to Watchlist
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Avoid interfering with typing in inputs
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && ['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
      if (isSwipeLoading) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // Only act if there is a current movie
        if (currentIndex < movies.length) {
          void handleSwipe('right');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSwipeLoading, currentIndex, movies.length, handleSkip]);

  if (isSuggestionsLoading) {
    return (
       <div className="flex justify-center">
            <Card className="relative w-full max-w-sm h-[550px] flex flex-col items-center justify-center text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Recherche de films pour vous...</p>
            </Card>
       </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div className="relative w-full max-w-sm h-[600px]">
        {/* Filters */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 flex items-center gap-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-lg">
          <select
            className="h-8 rounded border px-2 text-sm"
            value={minRating}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const v = Number(e.target.value); setMinRating(v); setCurrentIndex(0); setMovies(applyFilters(originalMovies, { minRating: v, country: countryFilter, minYear })); }}
            aria-label="Note minimale"
          >
            <option value={0}>Note ≥ 0</option>
            <option value={6}>Note ≥ 6</option>
            <option value={7}>Note ≥ 7</option>
            <option value={8}>Note ≥ 8</option>
            <option value={9}>Note ≥ 9</option>
          </select>
          <input
            className="h-8 rounded border px-2 text-sm flex-1"
            placeholder="Pays (ex: France)"
            value={countryFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const v = e.target.value; setCountryFilter(v); setCurrentIndex(0); setMovies(applyFilters(originalMovies, { minRating, country: v, minYear })); }}
            aria-label="Filtrer par pays"
          />
          <select
            className="h-8 rounded border px-2 text-sm"
            value={minYear}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { const v = Number(e.target.value); setMinYear(v); setCurrentIndex(0); setMovies(applyFilters(originalMovies, { minRating, country: countryFilter, minYear: v })); }}
            aria-label="Année minimale"
          >
            <option value={0}>Année ≥ 0</option>
            <option value={1980}>Année ≥ 1980</option>
            <option value={1990}>Année ≥ 1990</option>
            <option value={2000}>Année ≥ 2000</option>
            <option value={2010}>Année ≥ 2010</option>
            <option value={2020}>Année ≥ 2020</option>
          </select>
        </div>
        {movies.length === 0 && !isSuggestionsLoading ? (
          <Card className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <CardContent className="p-6">
              <Film className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="text-xl font-bold font-headline mt-4">Aucun film trouvé</h3>
              <p className="text-muted-foreground mt-2">
                Vous avez vu tous les films pour le genre "{genre}" ou il n'y a pas de nouvelles suggestions.
              </p>
              <Button className="mt-4" variant="outline" onClick={fetchMovies}>
                <RotateCcw className="mr-2 h-4 w-4" /> Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : currentMovie ? (
          <Card className="absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl pt-10">
            <CardHeader className="p-6">
                <div className={`${badgeVariants({ variant: 'secondary' })} mb-2 self-start`}>{currentMovie.genre}</div>
                <CardTitle className="font-headline text-3xl leading-tight">{currentMovie.title}</CardTitle>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 pt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-amber-400" /> 
                        <span className="font-bold">{currentMovie.rating.toFixed(1)}</span>/10
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" /> 
                        <span className="font-bold">{currentMovie.year}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4" /> 
                        <span className="font-bold">{currentMovie.country}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between p-6 pt-0">
                <div>
                    <h4 className="font-semibold text-sm mb-1">Synopsis</h4>
                    <p className="text-sm text-muted-foreground max-h-24 overflow-y-auto">{currentMovie.synopsis}</p>
                </div>
              
              <Separator className="my-4"/>
              
              <div className="space-y-3">
                 <div>
                    <h4 className="font-semibold text-sm mb-1">Acteurs principaux</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span>{currentMovie.actors.join(', ')}</span>
                    </div>
                 </div>
                <a href={currentMovie.wikipediaUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" className="p-0 h-auto text-sm">
                        <LinkIcon className="mr-2 h-4 w-4" />
                        En savoir plus sur Wikipédia
                    </Button>
                </a>
              </div>
            </CardContent>
             <CardFooter className="p-4 pt-0 grid grid-cols-3 gap-4">
                <Button variant="outline" size="lg" className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-14" onClick={() => handleSwipe('left')} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <Eye className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="h-14" onClick={handleSkip} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <SkipForward className="h-8 w-8" />}
                </Button>
                <Button variant="outline" size="lg" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-500 h-14" onClick={() => handleSwipe('right')} disabled={isSwipeLoading}>
                  {isSwipeLoading ? <Loader2 className="animate-spin" /> : <ListVideo className="h-8 w-8" />}
                </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold font-headline">C'est tout pour le moment !</h3>
              <p className="text-muted-foreground mt-2">Vous avez vu toutes les suggestions pour ce genre.</p>
              <Button className="mt-4" onClick={fetchMovies}>
                <RotateCcw className="mr-2 h-4 w-4" /> M'en proposer d'autres
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
