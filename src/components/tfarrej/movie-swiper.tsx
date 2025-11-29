'use client';

import type React from 'react'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Eye, ListVideo, Loader2, Film, RotateCcw, Star, Link as LinkIcon, Users, Calendar, Globe, SkipForward, X } from 'lucide-react';

import { recordMovieSwipe } from '@/ai/flows/movie-preference-learning';
import { generateMovieSuggestions } from '@/ai/flows/generate-movie-suggestions-flow-fixed';
import type { MovieSuggestion } from '@/ai/flows/generate-movie-suggestions-flow.types';
import type { UserProfile } from '@/lib/firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { badgeVariants } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useDebounceCallback } from "@/lib/hooks/use-debounce"
import { Movie } from "@/lib/types"
import { Check, Plus, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

// Client-side filtering util
function applyFilters(list: MovieSuggestion[], opts: { minRating: number; countries: string[]; yearRange: [number, number] }) {
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
  const CURRENT_YEAR = new Date().getFullYear();
  const [yearRange, setYearRange] = useState<[number, number]>([1990, CURRENT_YEAR]);
  const [yearStartInput, setYearStartInput] = useState<string>('1990');
  const [yearEndInput, setYearEndInput] = useState<string>(String(CURRENT_YEAR));
 
  // Country filter removed by request; we only display nationality from API

  const yearBounds = useMemo(() => {
    const years = (originalMovies as MovieSuggestion[]).map((m: MovieSuggestion) => m.year).filter(Boolean as any) as number[];
    const min = years.length ? Math.min(...years) : 1950;
    const max = years.length ? Math.max(...years) : CURRENT_YEAR;
    return [min, max] as [number, number];
  }, [originalMovies]);
 
  // Keep text inputs in sync when yearRange changes externally
  useEffect(() => {
    setYearStartInput(String(yearRange[0]));
    setYearEndInput(String(yearRange[1]));
  }, [yearRange[0], yearRange[1]]);
 
  const applyYearStart = useCallback(() => {
    let valNum = parseInt(yearStartInput || String(yearBounds[0]), 10);
    if (isNaN(valNum)) valNum = yearBounds[0];
    const next: [number, number] = [Math.min(Math.max(valNum, yearBounds[0]), yearRange[1]), yearRange[1]];
    setYearRange(next);
    setCurrentIndex(0);
    const filtered = applyFilters(originalMovies, { minRating: 6, countries: [], yearRange: next });
    setMovies(filtered);
  }, [yearStartInput, yearBounds, yearRange[1], originalMovies]);

  const applyYearEnd = useCallback(() => {
    let valNum = parseInt(yearEndInput || String(yearBounds[1]), 10);
    if (isNaN(valNum)) valNum = yearBounds[1];
    const next: [number, number] = [yearRange[0], Math.max(Math.min(valNum, yearBounds[1]), yearRange[0])];
    setYearRange(next);
    setCurrentIndex(0);
    const filtered = applyFilters(originalMovies, { minRating: 6, countries: [], yearRange: next });
    setMovies(filtered);
  }, [yearEndInput, yearBounds, yearRange[0], originalMovies]);
  
  
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
    
    // Fetch from TMDB-backed API with active filters
    fetch('/api/tmdb-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countries: [],
        yearRange,
        minRating: 6,
        count: 12,
        seenMovieTitles,
        genre,
      })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`tmdb-suggest failed: ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data?.movies) ? data.movies as MovieSuggestion[] : [];
        setOriginalMovies(items);
        const filtered = applyFilters(items, { minRating: 6, countries: [], yearRange });
        setMovies(filtered);
      })
      .catch((error) => {
        handleAiError(error, toast);
      })
      .finally(() => {
        setIsSuggestionsLoading(false);
      });
  }, [genre, toast, userProfile, yearRange]);

  // Load persisted filters on mount
  useEffect(() => {
    try {
      const y = window.localStorage.getItem('tfarrej_yearRange');
      if (y) {
        const parsed = JSON.parse(y) as [number, number];
        if (Array.isArray(parsed) && parsed.length === 2) setYearRange(parsed);
      }
    } catch {}
  }, []);

  // Persist filters
  useEffect(() => {
    try {
      window.localStorage.setItem('tfarrej_yearRange', JSON.stringify(yearRange));
    } catch {}
  }, [yearRange]);

  useEffect(() => {
    // This effect ensures we only fetch movies once when the component is ready.
    if (userProfile && !initialFetchDone.current) {
        fetchMovies();
        initialFetchDone.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  // Refetch suggestions when filters change (after initial load)
  useEffect(() => {
    if (!userProfile) return;
    if (!initialFetchDone.current) return;
    // Only refetch on genre change; year filtering is handled client-side for performance
    fetchMovies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre]);


  const handleSwipe = async (swipeDirection: 'left' | 'right') => {
    if (isSwipeLoading || currentIndex >= movies.length || !user) return;

    setIsSwipeLoading(true);
    const movie = movies[currentIndex];
    
    try {
      // The user profile is the single source of truth.
      // We update Firestore, and the onSnapshot listener in useAuth will update the userProfile object.
      const updatePayload: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>> = {};
      // Left = mark as seen; Right = add to watchlist
      if (swipeDirection === 'left') {
        updatePayload.seenMovieTitles = [movie.title];
      } else if (swipeDirection === 'right') {
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

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isYearPopoverOpen, setIsYearPopoverOpen] = useState(false);

  const handleYearRangeChange = (values: number[]) => {
    setYearRange([values[0], values[1]]);
    setSelectedYear(null);
  };

  const handleSpecificYearSelect = (year: number) => {
    setSelectedYear(year === selectedYear ? null : year);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="w-full flex justify-center">
      <div className="relative w-full max-w-sm">
        {/* Filters */}
        <div className="absolute top-0 left-0 right-0 z-10 px-3 py-2 flex flex-wrap items-center gap-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-lg">
          {/* Année (de - à) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">De</span>
              <Input
                type="number"
                inputMode="numeric"
                className="h-8 w-24"
                value={yearStartInput}
                min={yearBounds[0]}
                max={yearRange[1]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setYearStartInput(e.target.value);
                }}
                onBlur={applyYearStart}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { applyYearStart(); } }}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">À</span>
              <Input
                type="number"
                inputMode="numeric"
                className="h-8 w-24"
                value={yearEndInput}
                min={yearRange[0]}
                max={yearBounds[1]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setYearEndInput(e.target.value);
                }}
                onBlur={applyYearEnd}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { applyYearEnd(); } }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm font-medium">Filtrer par année</span>
                <Popover open={isYearPopoverOpen} onOpenChange={setIsYearPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 ml-2">
                      <Calendar className="h-4 w-4" />
                      {selectedYear 
                        ? `Année: ${selectedYear}` 
                        : `Période: ${yearRange[0]} - ${yearRange[1]}`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">Sélectionner une année spécifique</h4>
                      <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                        {years.map(year => (
                          <Button
                            key={year}
                            variant={selectedYear === year ? 'default' : 'outline'}
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              handleSpecificYearSelect(year);
                              setIsYearPopoverOpen(false);
                            }}
                          >
                            {year}
                          </Button>
                        ))}
                      </div>
                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-2">Ou choisir une plage d'années</h4>
                        <div className="px-2">
                          <Slider
                            min={1950}
                            max={currentYear}
                            step={1}
                            value={[yearRange[0], yearRange[1]]}
                            onValueChange={handleYearRangeChange}
                            minStepsBetweenThumbs={1}
                            className="mb-2"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{yearRange[0]}</span>
                            <span>{yearRange[1]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              {currentMovie && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{currentMovie.country}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-1">Synopsis</h4>
              <p className="text-sm text-muted-foreground max-h-24 overflow-y-auto">
                {currentMovie?.synopsis || 'Aucune description disponible'}
              </p>
            </div>
                <Separator className="my-4" />
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
            </>
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
        </Card>
      </div>
    </div>
  );
}
