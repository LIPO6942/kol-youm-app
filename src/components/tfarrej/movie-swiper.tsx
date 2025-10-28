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
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState<string>("");
  const CURRENT_YEAR = new Date().getFullYear();
  const [yearRange, setYearRange] = useState<[number, number]>([0, CURRENT_YEAR]);
 
  // Country options: include popular defaults + those derived from current results
  const DEFAULT_COUNTRIES = [
    'France',
    'Italie',
    'Tunisie',
    'Égypte',
    'Corée du Sud',
    'Japon',
    'Allemagne',
    'Espagne',
    'Maroc',
    'Inde',
    'Turquie',
    'Canada',
    'Mexique',
    'Brésil',
    'Chine',
  ];

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of DEFAULT_COUNTRIES) set.add(c);
    for (const m of originalMovies as MovieSuggestion[]) {
      if (m.country) set.add(m.country);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [originalMovies]);

  const filteredCountryOptions = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return countryOptions;
    return countryOptions.filter((c: string) => c.toLowerCase().includes(q));
  }, [countryOptions, countrySearch]);

  const yearBounds = useMemo(() => {
    const years = (originalMovies as MovieSuggestion[]).map((m: MovieSuggestion) => m.year).filter(Boolean as any) as number[];
    const min = years.length ? Math.min(...years) : 1950;
    const max = years.length ? Math.max(...years) : CURRENT_YEAR;
    return [min, max] as [number, number];
  }, [originalMovies]);
 
  
  
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
        countries: selectedCountries,
        yearRange,
        minRating,
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
        const filtered = applyFilters(items, { minRating, countries: selectedCountries, yearRange });
        setMovies(filtered);
      })
      .catch((error) => {
        handleAiError(error, toast);
      })
      .finally(() => {
        setIsSuggestionsLoading(false);
      });
  }, [genre, toast, userProfile, minRating, selectedCountries, yearRange]);

  // Load persisted filters on mount
  useEffect(() => {
    try {
      const r = window.localStorage.getItem('tfarrej_minRating');
      const cArr = window.localStorage.getItem('tfarrej_countries');
      const cLegacy = window.localStorage.getItem('tfarrej_country');
      const y = window.localStorage.getItem('tfarrej_yearRange');
      if (r !== null) setMinRating(Number(r));
      if (cArr) {
        try {
          const parsed = JSON.parse(cArr) as string[];
          if (Array.isArray(parsed)) setSelectedCountries(parsed);
        } catch {}
      } else if (cLegacy !== null) {
        if (cLegacy) setSelectedCountries([cLegacy]);
      }
      if (y) {
        const parsed = JSON.parse(y) as [number, number];
        if (Array.isArray(parsed) && parsed.length === 2) setYearRange(parsed);
      }
    } catch {}
  }, []);

  // Persist filters
  useEffect(() => {
    try {
      window.localStorage.setItem('tfarrej_minRating', String(minRating));
      window.localStorage.setItem('tfarrej_countries', JSON.stringify(selectedCountries));
      window.localStorage.setItem('tfarrej_yearRange', JSON.stringify(yearRange));
    } catch {}
  }, [minRating, selectedCountries, yearRange]);

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
    fetchMovies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minRating, JSON.stringify(selectedCountries), JSON.stringify(yearRange), genre]);


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
        <div className="absolute top-0 left-0 right-0 z-10 px-4 py-2 flex flex-wrap items-center gap-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 rounded-t-lg">
          {/* Note (6 à 10) */}
          <Select
            value={String(minRating)}
            onValueChange={(v: string) => { const num = Number(v); setMinRating(num); setCurrentIndex(0); const filtered = applyFilters(originalMovies, { minRating: num, countries: selectedCountries, yearRange }); setMovies(filtered); }}
          >
            <SelectTrigger className={`${buttonVariants({ variant: 'ocean', size: 'sm' })} h-8 w-full sm:w-auto`} aria-label="Note minimale">
              <SelectValue placeholder="Note" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(6)}>Note ≥ 6</SelectItem>
              <SelectItem value={String(7)}>Note ≥ 7</SelectItem>
              <SelectItem value={String(8)}>Note ≥ 8</SelectItem>
              <SelectItem value={String(9)}>Note ≥ 9</SelectItem>
              <SelectItem value={String(10)}>Note = 10</SelectItem>
            </SelectContent>
          </Select>

          {/* Pays (multi-sélection avec recherche) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-full sm:w-auto">
                {selectedCountries.length > 0 ? `Pays (${selectedCountries.length})` : 'Pays'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <div className="px-2 py-1.5">
                <Input
                  placeholder="Rechercher un pays..."
                  value={countrySearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountrySearch(e.target.value)}
                />
              </div>
              <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); setSelectedCountries([]); setCurrentIndex(0); const filtered = applyFilters(originalMovies, { minRating, countries: [], yearRange }); setMovies(filtered); }}>Tous pays</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e: Event) => { e.preventDefault(); const pool = (countryOptions && countryOptions.length ? countryOptions : DEFAULT_COUNTRIES); const rand = pool[Math.floor(Math.random() * pool.length)]; const next = rand ? [rand] : []; setSelectedCountries(next); setCurrentIndex(0); const filtered = applyFilters(originalMovies, { minRating, countries: next, yearRange }); setMovies(filtered); }}>Au hasard</DropdownMenuItem>
              <DropdownMenuSeparator />
              {filteredCountryOptions.map((c: string) => {
                const checked = selectedCountries.includes(c);
                return (
                  <DropdownMenuCheckboxItem
                    key={c}
                    checked={checked}
                    onCheckedChange={(state: boolean) => {
                      const next = state ? Array.from(new Set([...selectedCountries, c])) : selectedCountries.filter((x: string) => x !== c);
                      setSelectedCountries(next);
                      setCurrentIndex(0);
                      const filtered = applyFilters(originalMovies, { minRating, countries: next, yearRange });
                      setMovies(filtered);
                    }}
                  >
                    {c}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Année (plage mauve) */}
          <div className="flex items-center gap-2 w-full sm:w-64">
            <div className={`${buttonVariants({ variant: 'default', size: 'sm' })} h-8 px-2 flex items-center rounded-md text-xs whitespace-nowrap`}>
              {yearRange[0]} - {yearRange[1]}
            </div>
            <div className="flex-1 px-2">
              <Slider
                value={yearRange as unknown as number[]}
                min={yearBounds[0]}
                max={yearBounds[1]}
                step={1}
                rangeClassName="bg-purple-500"
                thumbClassName="border-purple-500"
                onValueChange={(vals: number[]) => {
                  if (!Array.isArray(vals) || vals.length !== 2) return;
                  const next: [number, number] = [Math.min(vals[0], vals[1]), Math.max(vals[0], vals[1])];
                  setYearRange(next);
                  setCurrentIndex(0);
                  const filtered = applyFilters(originalMovies, { minRating, countries: selectedCountries, yearRange: next });
                  setMovies(filtered);
                }}
              />
            </div>
          </div>

          {/* Fin filtres */}
        </div>
        {/* Fin badges */}
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
