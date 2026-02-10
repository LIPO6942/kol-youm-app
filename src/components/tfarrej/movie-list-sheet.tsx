'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Film, Trash2, Eye, Loader2, Star, ExternalLink, Search, Grid3X3, List, X, Calendar, Plus, Check, ChevronDown, Ticket, Clapperboard, Video, Disc, Tv } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { moveItemFromWatchlistToSeen, clearUserMovieList, removeMovieFromList, addSeenMovieWithDate, addSeenSeriesWithDate, addItemToWatchlist } from '@/lib/firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

// Default Poster Styles
const DEFAULT_POSTERS = [
  { id: 'icon-popcorn', name: 'Popcorn', className: 'bg-red-600', icon: Tv }, // Using Tv as fallback for Popcorn/Screen
  { id: 'icon-ticket', name: 'Ticket', className: 'bg-blue-600', icon: Ticket },
  { id: 'icon-clapper', name: 'Clapper', className: 'bg-emerald-600', icon: Clapperboard },
  { id: 'icon-camera', name: 'Camera', className: 'bg-purple-600', icon: Video },
  { id: 'icon-reel', name: 'Reel', className: 'bg-yellow-500', icon: Disc },
  { id: 'icon-star', name: 'Star', className: 'bg-slate-700', icon: Star },
];

interface MovieDetails {
  title: string;
  rating?: number;
  wikipediaUrl?: string;
  year?: number;
  country?: string;
  posterUrl?: string;
  viewedAt?: number;
}

interface SearchResult {
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  rating: number;
  posterUrl: string | null;
}

interface MovieListSheetProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  listType: 'moviesToWatch' | 'seenMovieTitles' | 'seriesToWatch' | 'seenSeriesTitles';
  type?: 'movie' | 'tv';
}

// Add Movie Dialog Component
function AddMovieDialog({ onAdd, isOpen, onOpenChange, type = 'movie', mode = 'seen', initialMovie = null }: {
  onAdd: (movie: SearchResult, viewedAt: Date) => Promise<void>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'movie' | 'tv';
  mode?: 'seen' | 'watchlist';
  initialMovie?: SearchResult | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<SearchResult | null>(null);
  const [viewedDate, setViewedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = useState(false);

  // Manual Mode State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualYear, setManualYear] = useState('');
  const [manualPosterVariant, setManualPosterVariant] = useState(DEFAULT_POSTERS[0].id);

  // Set initial movie if provided
  useEffect(() => {
    if (isOpen && initialMovie) {
      setSelectedMovie(initialMovie);
    }
  }, [isOpen, initialMovie]);

  // Search TMDb
  const searchTMDb = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    console.log(`AddMovieDialog searching TMDb: type=${type}, query="${query}"`);
    setIsSearching(true);
    try {
      const response = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}&type=${type}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Erreur recherche TMDb:', error);
    } finally {
      setIsSearching(false);
    }
  }, [type]);

  // Debounce search
  useEffect(() => {
    if (isManualMode) return;
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchTMDb(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchTMDb, isManualMode]);

  // Ensure manual title is pre-filled when switching mode
  useEffect(() => {
    if (isManualMode && searchQuery && !manualTitle) {
      console.log('Auto-filling manual title with:', searchQuery);
      setManualTitle(searchQuery);
    }
  }, [isManualMode, searchQuery]);

  const handleAdd = async (e?: React.MouseEvent) => {
    // Prevent default just in case it's triggered inside a form somehow
    if (e) e.preventDefault();

    console.log('handleAdd clicked', { isManualMode, manualTitle, manualYear, selectedMovie });

    if (isManualMode) {
      if (!manualTitle.trim()) {
        console.warn('Manual title empty');
        return;
      }

      setIsAdding(true);
      try {
        console.log('Processing manual add...');
        const yearInt = manualYear ? parseInt(manualYear, 10) : null;
        const pseudoMovie: SearchResult = {
          id: -Date.now(), // Negative ID to avoid collision
          title: manualTitle,
          originalTitle: manualTitle,
          year: !isNaN(yearInt!) ? yearInt : null, // Handle NaN if parseInt fails
          rating: 0,
          posterUrl: `default:${manualPosterVariant}`
        };

        console.log('Calling onAdd with', pseudoMovie);
        await onAdd(pseudoMovie, new Date(viewedDate));
        console.log('onAdd completed');
        resetAndClose();
      } catch (err) {
        console.error('Error in handleAdd (manual):', err);
      } finally {
        setIsAdding(false);
      }
    } else {
      if (!selectedMovie) return;
      setIsAdding(true);
      try {
        await onAdd(selectedMovie, new Date(viewedDate));
        resetAndClose();
      } catch (err) {
        console.error('Error in handleAdd (search):', err);
      } finally {
        setIsAdding(false);
      }
    }
  };

  const resetAndClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMovie(null);
    setIsManualMode(false);
    setManualTitle('');
    setManualYear('');
    setManualPosterVariant(DEFAULT_POSTERS[0].id);
    setViewedDate(new Date().toISOString().split('T')[0]);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetAndClose(); else onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {isManualMode
              ? 'Ajout manuel'
              : mode === 'watchlist'
                ? `Ajouter à voir (${type === 'movie' ? 'film' : 'série'})`
                : `Ajouter ${type === 'movie' ? 'un film' : 'une série'} vu${type === 'tv' ? 'e' : ''}`}
          </DialogTitle>
          <DialogDescription>
            {isManualMode
              ? `Entrez les détails ${type === 'movie' ? 'du film' : 'de la série'} manuellement.`
              : mode === 'watchlist'
                ? `Recherchez ${type === 'movie' ? 'un film' : 'une série'} à mettre de côté.`
                : `Recherchez ${type === 'movie' ? 'un film' : 'une série'} et indiquez quand vous l'avez vu${type === 'tv' ? 'e' : ''}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {!isManualMode ? (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Rechercher ${type === 'movie' ? 'un film' : 'une série'} (FR/EN)...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Search Results */}
              {(isSearching || searchResults.length > 0) && (
                <ScrollArea className="flex-1 h-[400px] border rounded-lg p-2 bg-muted/20">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pb-4">
                      {searchResults.map(movie => (
                        <button
                          key={movie.id}
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            setSelectedMovie(movie);
                          }}
                          className={`relative rounded-lg overflow-hidden aspect-[2/3] transition-all text-left ${selectedMovie?.id === movie.id
                            ? 'ring-2 ring-primary ring-offset-2'
                            : 'hover:ring-2 hover:ring-muted-foreground'
                            }`}
                        >
                          {movie.posterUrl ? (
                            <Image
                              src={movie.posterUrl}
                              alt={movie.title}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              {type === 'movie' ? <Film className="h-6 w-6 text-muted-foreground" /> : <Tv className="h-6 w-6 text-muted-foreground" />}
                            </div>
                          )}
                          {selectedMovie?.id === movie.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <p className="text-[9px] text-white line-clamp-2 leading-tight">{movie.title}</p>
                            {movie.year && <p className="text-[8px] text-white/70">{movie.year}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}

              {/* Selected Movie */}
              {selectedMovie && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-18 rounded overflow-hidden flex-shrink-0 relative">
                      {selectedMovie.posterUrl ? (
                        <Image
                          src={selectedMovie.posterUrl}
                          alt={selectedMovie.title}
                          width={48}
                          height={72}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          {type === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{selectedMovie.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedMovie.year && `${selectedMovie.year} • `}
                        {selectedMovie.rating > 0 && `⭐ ${selectedMovie.rating}/10`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Entry Toggle Link */}
              <div className="text-center pt-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setManualTitle(searchQuery);
                    setIsManualMode(true);
                  }}
                  className="text-xs text-muted-foreground hover:text-primary underline"
                >
                  {type === 'movie' ? 'Film' : 'Série'} introuvable ? Ajouter "{searchQuery || (type === 'movie' ? 'ce film' : 'cette série')}" {mode === 'watchlist' ? 'à voir' : ''} manuellement
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manualTitle">Titre {type === 'movie' ? 'du film' : 'de la série'}</Label>
                <Input
                  id="manualTitle"
                  placeholder={`Titre ${type === 'movie' ? 'du film' : 'de la série'}`}
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Style de l'affiche</Label>
                <div className="grid grid-cols-6 gap-2">
                  {DEFAULT_POSTERS.map((poster) => {
                    const Icon = poster.icon;
                    return (
                      <button
                        key={poster.id}
                        onClick={() => setManualPosterVariant(poster.id)}
                        className={`h-12 w-full rounded-md ${poster.className} relative border-2 transition-all flex items-center justify-center ${manualPosterVariant === poster.id ? 'border-primary ring-2 ring-primary ring-offset-1' : 'border-transparent hover:scale-105'
                          }`}
                        title={poster.name}
                      >
                        <Icon className="h-5 w-5 text-white/90" />
                        {manualPosterVariant === poster.id && (
                          <div className="absolute -top-2 -right-2 bg-primary rounded-full p-0.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manualYear">Année de sortie (optionnel)</Label>
                <Input
                  id="manualYear"
                  type="number"
                  placeholder="Ex: 2024"
                  value={manualYear}
                  onChange={(e) => setManualYear(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Date Picker (Common - Only for seen mode) */}
          {(selectedMovie || isManualMode) && mode === 'seen' && (
            <div className="space-y-2">
              <Label htmlFor="viewedDate">Vu le :</Label>
              <Input
                id="viewedDate"
                type="date"
                value={viewedDate}
                onChange={(e) => setViewedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={isManualMode ? () => setIsManualMode(false) : resetAndClose}>
            {isManualMode ? 'Retour' : 'Annuler'}
          </Button>
          <Button
            onClick={handleAdd}
            disabled={(!isManualMode && !selectedMovie) || (isManualMode && !manualTitle.trim()) || isAdding}
          >
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Composant séparé pour le contenu du Sheet
function MovieListContent({
  listType,
  onMarkAsWatched,
  onRemove,
  isUpdating,
  onAddManual,
  movieDetails,
  isLoadingDetails,
  type = 'movie'
}: {
  listType: 'moviesToWatch' | 'seenMovieTitles' | 'seriesToWatch' | 'seenSeriesTitles';
  onMarkAsWatched: (movieTitle: string) => Promise<void>;
  onRemove: (movieTitle: string) => Promise<void>;
  isUpdating: boolean;
  onAddManual: (movie?: SearchResult) => void;
  type?: 'movie' | 'tv';
  movieDetails: Record<string, MovieDetails>;
  isLoadingDetails: boolean;
}) {
  const { userProfile } = useAuth();

  // Constants
  const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000; // ~2 years in milliseconds

  // State for search, filter, and view mode
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showOldMovies, setShowOldMovies] = useState(false);

  const movieTitles = userProfile?.[listType] as string[];
  const seenMoviesData = type === 'movie' ? userProfile?.seenMoviesData : userProfile?.seenSeriesData;

  // Sort movies: Recent First (for seen list), Alphabetical otherwise
  const sortedMovieTitles = useMemo(() => {
    if (!movieTitles) return [];
    const isSeenList = listType === 'seenMovieTitles' || listType === 'seenSeriesTitles';

    if (isSeenList && seenMoviesData) {
      // Create a map for fast lookup
      const movieMap = new Map(seenMoviesData.map(m => [m.title, m]));

      return [...movieTitles].sort((a, b) => {
        const movieA = movieMap.get(a);
        const movieB = movieMap.get(b);

        // If viewedAt is available, use it (descending: newest first)
        const dateA = movieA?.viewedAt || 0;
        const dateB = movieB?.viewedAt || 0;

        if (dateA !== dateB) return dateB - dateA;

        // Fallback to title if dates are equal or missing
        return a.localeCompare(b, 'fr', { sensitivity: 'base' });
      });
    }

    // Default alphabetical sort for watchlist
    return [...movieTitles].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [movieTitles, listType, seenMoviesData]);

  // Helper function to check if a movie is older than 2 years
  const isOlderThanTwoYears = useCallback((movieTitle: string) => {
    const seenData = seenMoviesData?.find((m: any) => m.title === movieTitle);
    const viewedAt = seenData?.viewedAt;
    if (!viewedAt) return false;
    return Date.now() - viewedAt > TWO_YEARS_MS;
  }, [seenMoviesData, TWO_YEARS_MS]);

  // Extract available years for filtering
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    (Object.values(movieDetails) as MovieDetails[]).forEach((detail: MovieDetails) => {
      if (detail.year) years.add(detail.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [movieDetails]);

  // Filtered movies based on search and year
  const filteredMovies = useMemo(() => {
    let filtered = sortedMovieTitles;

    // Filter by search query (local filter on loaded movies)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(title =>
        title.toLowerCase().includes(query) ||
        movieDetails[title]?.country?.toLowerCase().includes(query)
      );
    }

    // Filter by year
    if (yearFilter !== 'all') {
      const targetYear = parseInt(yearFilter, 10);
      filtered = filtered.filter(title =>
        movieDetails[title]?.year === targetYear
      );
    }

    return filtered;
  }, [sortedMovieTitles, searchQuery, yearFilter, movieDetails]);

  // For seen movies: split into recent and old (>2 years)
  const { recentMovies, oldMovies } = useMemo(() => {
    const isSeenList = listType === 'seenMovieTitles' || listType === 'seenSeriesTitles';
    if (!isSeenList) {
      return { recentMovies: filteredMovies, oldMovies: [] as string[] };
    }
    const recent: string[] = [];
    const old: string[] = [];
    filteredMovies.forEach((title: string) => {
      if (isOlderThanTwoYears(title)) {
        old.push(title);
      } else {
        recent.push(title);
      }
    });
    return { recentMovies: recent, oldMovies: old };
  }, [filteredMovies, listType, isOlderThanTwoYears]);

  // Debounced search for TMDb API
  const searchTMDb = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const yearParam = yearFilter !== 'all' ? `&year=${yearFilter}` : '';
      const response = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}${yearParam}&type=${type}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Erreur recherche TMDb:', error);
    } finally {
      setIsSearching(false);
    }
  }, [yearFilter, type]);

  // Debounce search - only for moviesToWatch list (not for seenMovieTitles)
  useEffect(() => {
    // For seen movies/series, we only do local filtering, no TMDb search
    if (listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchTMDb(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchTMDb, listType]);

  // No longer needed here as it's lifted to parent

  // Format date for display
  const formatViewedDate = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Render Poster Helper
  const renderPoster = (posterUrl: string | undefined | null, title: string, isOld: boolean = false) => {
    if (posterUrl && posterUrl.startsWith('default:')) {
      const variantId = posterUrl.split(':')[1];
      const variant = DEFAULT_POSTERS.find(p => p.id === variantId) || DEFAULT_POSTERS[0];
      const Icon = variant.icon;

      return (
        <div className={`w-full h-full ${variant.className} flex flex-col items-center justify-center p-1 text-center`}>
          <Icon className="h-8 w-8 text-white/90 mb-1" />
          <p className="text-[9px] text-white font-medium line-clamp-2 leading-tight drop-shadow-sm">{title}</p>
        </div>
      );
    }

    if (posterUrl) {
      return (
        <Image
          src={posterUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="32px"
          unoptimized={posterUrl.startsWith('http')}
        />
      );
    }

    return (
      <div className="flex-shrink-0 rounded bg-muted flex items-center justify-center w-full h-full">
        {type === 'movie' ? (
          <Film className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Tv className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    );
  };

  // Render a movie item in list view
  const renderListItem = (movieTitle: string, index: number) => {
    const details = movieDetails[movieTitle];
    const seenData = seenMoviesData?.find(m => m.title === movieTitle);
    const viewedAt = details?.viewedAt || seenData?.viewedAt;
    const posterUrl = details?.posterUrl || seenData?.posterUrl;

    const isOld = (listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && isOlderThanTwoYears(movieTitle);

    return (
      <div key={`${movieTitle}-${index}`} className="relative flex flex-col p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded group">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-12 relative rounded overflow-hidden bg-muted">
                {renderPoster(posterUrl, movieTitle, isOld)}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <h4 className="text-[11px] sm:text-xs font-medium truncate tracking-tight leading-none" title={movieTitle}>
                    {movieTitle}
                  </h4>
                  {details?.wikipediaUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 flex-shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => window.open(details.wikipediaUrl, '_blank')}
                      title="Wikipedia"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="sr-only">Wikipedia</span>
                    </Button>
                  )}
                </div>
                {details && (
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {!isOld && details.rating && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{details.rating}/10</span>
                      </div>
                    )}
                    {!isOld && details.year && (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-1.5 py-0 text-[10px] h-5 flex-shrink-0">
                        {details.year}
                      </span>
                    )}
                    {!isOld && details.country && (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-transparent border-input border text-foreground hover:bg-accent hover:text-accent-foreground px-1.5 py-0 text-[10px] h-5 truncate max-w-[80px]">
                        {details.country}
                      </span>
                    )}
                  </div>
                )}
                {/* Show when the movie was watched */}
                {(listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && viewedAt && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Vu le {formatViewedDate(viewedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
            {(listType === 'moviesToWatch' || listType === 'seriesToWatch') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onMarkAsWatched(movieTitle)}
                    disabled={isUpdating}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="sr-only">Marquer comme vu</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Marquer comme vu</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  onClick={() => onRemove(movieTitle)}
                  disabled={isUpdating}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Supprimer</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Supprimer</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  // Render a movie item in grid view
  const renderGridItem = (movieTitle: string, index: number) => {
    const details = movieDetails[movieTitle];
    const seenData = seenMoviesData?.find(m => m.title === movieTitle);
    const viewedAt = details?.viewedAt || seenData?.viewedAt;
    const posterUrl = details?.posterUrl || seenData?.posterUrl;

    const isOld = (listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && isOlderThanTwoYears(movieTitle);

    return (
      <div
        key={`${movieTitle}-${index}`}
        className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
        title={`${movieTitle}${viewedAt ? ` - Vu le ${formatViewedDate(viewedAt)}` : ''}`}
      >
        {/* Custom rendering for missing posters in grid view to ensure contrast */}
        {(!posterUrl || (posterUrl && !posterUrl.startsWith('default:') && !posterUrl.startsWith('http'))) ? (
          <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-2 text-center relative">
            {type === 'movie' ? (
              <Film className="h-8 w-8 text-slate-600 mb-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 transform scale-[3]" />
            ) : (
              <Tv className="h-8 w-8 text-slate-600 mb-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 transform scale-[3]" />
            )}
            <p className="text-xs font-semibold text-slate-100 line-clamp-3 leading-tight z-10">{movieTitle}</p>
          </div>
        ) : (
          renderPoster(posterUrl, movieTitle, false) // Force isOld to false for grid view to ensure full size
        )}

        {/* Overlay with title - Only for non-text tiles (images) and NOT defaults who already have text */}
        {(!posterUrl || !posterUrl.startsWith('default:')) && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{movieTitle}</p>
              {details?.year && (
                <p className="text-[9px] text-white/70">{details.year}</p>
              )}
              {viewedAt && (
                <p className="text-[8px] text-white/60 flex items-center gap-0.5 mt-0.5">
                  <Calendar className="h-2 w-2" />
                  {formatViewedDate(viewedAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action buttons on hover */}
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          {(listType === 'moviesToWatch' || listType === 'seriesToWatch') && (
            <Button
              variant="secondary"
              size="icon"
              className="h-5 w-5 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
              onClick={(e) => { e.stopPropagation(); onMarkAsWatched(movieTitle); }}
              disabled={isUpdating}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="h-5 w-5 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()} // Prevent card click
                disabled={isUpdating}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer "{movieTitle}" ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Voulez-vous vraiment retirer ce titre de votre liste ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(movieTitle);
                  }}
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  };


  return (
    <div className="relative flex-1 flex flex-col gap-3 overflow-hidden h-full">
      {isUpdating && <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher (FR/EN)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Add Button (Available for all lists now) */}
          <Button variant="outline" size="sm" onClick={() => onAddManual()} className="gap-1">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>

          {/* Year Filter */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[100px]">
              <Calendar className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Results from TMDb */}
      {searchQuery.length >= 2 && searchResults.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-2 border">
          <p className="text-xs text-muted-foreground mb-2">Résultats TMDb ({searchResults.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {searchResults.slice(0, 8).map(result => (
              <div
                key={result.id}
                className="flex-shrink-0 w-16 text-center cursor-pointer hover:opacity-80"
                title={`${result.title} (${result.year || '?'})`}
              >
                <div
                  className="w-16 h-24 rounded overflow-hidden bg-muted mb-1 relative"
                  onClick={() => onAddManual(result)} // Open dialog with pre-selected movie
                >
                  {result.posterUrl ? (
                    <Image src={result.posterUrl} alt={result.title} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {type === 'movie' ? <Film className="h-6 w-6 text-muted-foreground" /> : <Tv className="h-6 w-6 text-muted-foreground" />}
                    </div>
                  )}
                </div>
                <p className="text-[10px] line-clamp-2 leading-tight">{result.title}</p>
                {result.year && <p className="text-[9px] text-muted-foreground">{result.year}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator for search */}
      {isSearching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Recherche en cours...</span>
        </div>
      )}

      <TooltipProvider>
        <ScrollArea className="flex-1 pr-4">
          {viewMode === 'list' ? (
            <div className="py-2 space-y-1">
              {/* Recent Entries */}
              {(listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && recentMovies.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Récemment vu{type === 'tv' ? 'es' : 's'}</h3>
                  {recentMovies.map((movieTitle: string, index: number) => renderListItem(movieTitle, index))}
                </div>
              )}

              {/* Old Entries (> 6 months) */}
              {(listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && oldMovies.length > 0 && (
                <div className="mt-4">
                  {!showOldMovies ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-muted-foreground"
                      onClick={() => setShowOldMovies(true)}
                    >
                      <span>Voir plus ({oldMovies.length} ancien{type === 'tv' ? 'nes' : 's'} {type === 'movie' ? 'films' : 'titres'})</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-sm font-semibold text-muted-foreground">Vu{type === 'tv' ? 'es' : 's'} il y a longtemps</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowOldMovies(false)} className="h-6 text-xs">
                          Masquer
                        </Button>
                      </div>
                      {oldMovies.map((movieTitle: string, index: number) => renderListItem(movieTitle, index))}
                    </div>
                  )}
                </div>
              )}

              {/* Standard List (Watchlist or Search Results) */}
              {!(listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && filteredMovies.length > 0 && (
                filteredMovies.map((movieTitle: string, index: number) => renderListItem(movieTitle, index))
              )}

              {/* Fallback Empty State */}
              {filteredMovies.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-[40vh]">
                  <Film className="h-10 w-10 mb-4" />
                  {searchQuery || yearFilter !== 'all' ? (
                    <p>Aucun film ne correspond à vos critères.</p>
                  ) : (
                    <>
                      <p>Votre liste est vide pour le moment.</p>
                      {listType === 'moviesToWatch' && <p className="text-xs">"Likez" des films pour la remplir !</p>}
                      {(listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && (
                        <Button variant="outline" size="sm" onClick={onAddManual} className="mt-4 gap-1">
                          <Plus className="h-4 w-4" />
                          Ajouter {type === 'movie' ? 'un film' : 'une série'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-2">
              {/* Grid View Logic */}
              {(listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') ? (
                <>
                  {recentMovies.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Récemment vu{type === 'tv' ? 'es' : 's'}</h3>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {recentMovies.map((movieTitle: string, index: number) => renderGridItem(movieTitle, index))}
                      </div>
                    </div>
                  )}

                  {oldMovies.length > 0 && (
                    <div className="mt-4">
                      {!showOldMovies ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-between text-muted-foreground"
                          onClick={() => setShowOldMovies(true)}
                        >
                          <span>Voir plus ({oldMovies.length} ancien{type === 'tv' ? 'nes' : 's'} {type === 'movie' ? 'films' : 'titres'})</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-sm font-semibold text-muted-foreground">Vu{type === 'tv' ? 'es' : 's'} il y a longtemps</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowOldMovies(false)} className="h-6 text-xs">
                              Masquer
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                            {oldMovies.map((movieTitle: string, index: number) => renderGridItem(movieTitle, index))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {filteredMovies.length > 0 ? (
                    filteredMovies.map((movieTitle, index) => renderGridItem(movieTitle, index))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center text-center text-muted-foreground h-[40vh]">
                      {/* Empty state repeated for grid view safety */}
                      {type === 'movie' ? <Film className="h-10 w-10 mb-4" /> : <Tv className="h-10 w-10 mb-4" />}
                      {searchQuery || yearFilter !== 'all' ? (
                        <p>Aucun {type === 'movie' ? 'film' : 'titre'} ne correspond à vos critères.</p>
                      ) : (
                        <p>Votre liste est vide.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state for seen list specifically if both empty */}
              {(listType === 'seenMovieTitles' || listType === 'seenSeriesTitles') && recentMovies.length === 0 && oldMovies.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-[40vh]">
                  {type === 'movie' ? <Film className="h-10 w-10 mb-4" /> : <Tv className="h-10 w-10 mb-4" />}
                  {searchQuery || yearFilter !== 'all' ? (
                    <p>Aucun {type === 'movie' ? 'film' : 'titre'} ne correspond à vos critères.</p>
                  ) : (
                    <>
                      <p>Votre liste est vide pour le moment.</p>
                      <Button variant="outline" size="sm" onClick={onAddManual} className="mt-4 gap-1">
                        <Plus className="h-4 w-4" />
                        Ajouter {type === 'movie' ? 'un film' : 'une série'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </TooltipProvider>

      {/* Stats */}
      {filteredMovies.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {filteredMovies.length} {type === 'movie' ? 'film' : 'série'}{filteredMovies.length > 1 ? 's' : ''}
          {(searchQuery || yearFilter !== 'all') && ` (filtré${filteredMovies.length > 1 ? 's' : ''})`}
        </div>
      )}
    </div>
  );
}

export function MovieListSheet({ trigger, title, description, listType, type = 'movie' }: MovieListSheetProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [preSelectedMovie, setPreSelectedMovie] = useState<SearchResult | null>(null);
  const [movieDetails, setMovieDetails] = useState<Record<string, MovieDetails>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const isSeenList = listType === 'seenMovieTitles' || listType === 'seenSeriesTitles';
  const addMode: 'seen' | 'watchlist' = isSeenList ? 'seen' : 'watchlist';

  // Fetch movie details logic lifted from MovieListContent
  const seenMoviesData = type === 'movie' ? userProfile?.seenMoviesData : userProfile?.seenSeriesData;
  const movieTitles = (userProfile?.[listType] || []) as string[];

  const fetchMovieDetails = useCallback(async (movieTitle: string) => {
    if (movieDetails[movieTitle]) return;

    setIsLoadingDetails(true);
    try {
      const seenData = (seenMoviesData as any[] | undefined)?.find((m: any) => m.title === movieTitle);
      const response = await fetch('/api/tmdb-movie-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: movieTitle, type }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.movie) {
          const searchRes = await fetch(`/api/tmdb-search?q=${encodeURIComponent(movieTitle)}&type=${type}`);
          let posterUrl = seenData?.posterUrl || undefined;
          if (!posterUrl && searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results?.[0]?.posterUrl) {
              posterUrl = searchData.results[0].posterUrl;
            }
          }

          setMovieDetails(prev => ({
            ...prev,
            [movieTitle]: {
              title: movieTitle,
              rating: data.movie.rating,
              wikipediaUrl: data.movie.wikipediaUrl,
              year: data.movie.year,
              country: data.movie.country,
              posterUrl,
              viewedAt: seenData?.viewedAt,
            }
          }));
        }
      }
    } catch (error) {
      console.error('Erreur détails:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [movieDetails, seenMoviesData, type]);

  useEffect(() => {
    if (movieTitles.length > 0) {
      movieTitles.forEach(title => fetchMovieDetails(title));
    }
  }, [movieTitles, fetchMovieDetails]);
  const handleMarkAsWatched = async (movieTitle: string) => {
    const details = movieDetails[movieTitle];
    const pseudoMovie: SearchResult = {
      id: -Date.now(),
      title: movieTitle,
      originalTitle: movieTitle,
      year: details?.year || null,
      rating: details?.rating || 0,
      posterUrl: details?.posterUrl || null
    };
    openAddDialog(pseudoMovie);
  };

  const handleRemove = async (movieTitle: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await removeMovieFromList(user.uid, listType, movieTitle);
      toast({ title: `"${movieTitle}" supprimé de la liste.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer cet élément.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearList = async () => {
    if (!user) return;
    setIsClearing(true);
    try {
      await clearUserMovieList(user.uid, listType);
      toast({ title: "Liste vidée avec succès." });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de vider la liste." });
    } finally {
      setIsClearing(false);
    }
  };

  const handleAddMovieManually = async (movie: SearchResult, viewedAt: Date) => {
    if (!user) {
      toast({ variant: 'destructive', title: "Erreur", description: "Vous devez être connecté." });
      return;
    }

    try {
      if (type === 'movie') {
        await addSeenMovieWithDate(user.uid, {
          title: movie.title,
          viewedAt: viewedAt.getTime(),
          posterUrl: movie.posterUrl || undefined,
          year: movie.year || undefined,
          rating: movie.rating || undefined,
        });
      } else {
        await addSeenSeriesWithDate(user.uid, {
          title: movie.title,
          viewedAt: viewedAt.getTime(),
          posterUrl: movie.posterUrl || undefined,
          year: movie.year || undefined,
          rating: movie.rating || undefined,
        });
      }

      toast({ title: `"${movie.title}" ajouté aux vus.` });

      // If we are moving from a watchlist, remove it from there
      if (userProfile?.moviesToWatch?.includes(movie.title)) {
        await removeMovieFromList(user.uid, 'moviesToWatch', movie.title);
      } else if (userProfile?.seriesToWatch?.includes(movie.title)) {
        await removeMovieFromList(user.uid, 'seriesToWatch', movie.title);
      }
    } catch (error) {
      console.error('Error in handleAddMovieManually:', error);
      toast({ variant: 'destructive', title: "Erreur", description: `Impossible d'ajouter ${type === 'movie' ? 'le film' : 'la série'}.` });
    }
  };

  const handleAddToWatchlist = async (movie: SearchResult) => {
    if (!user) {
      toast({ variant: 'destructive', title: "Erreur", description: "Vous devez être connecté." });
      return;
    }

    try {
      await addItemToWatchlist(user.uid, movie.title, type);
      toast({ title: `"${movie.title}" ajouté à la liste 'À Voir'.` });
    } catch (error) {
      console.error('Error in handleAddToWatchlist:', error);
      toast({ variant: 'destructive', title: "Erreur", description: `Impossible d'ajouter ${type === 'movie' ? 'le film' : 'la série'}.` });
    }
  };

  const openAddDialog = (movie?: SearchResult) => {
    if (movie) setPreSelectedMovie(movie);
    else setPreSelectedMovie(null);
    setIsAddDialogOpen(true);
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="flex flex-col w-[95%] sm:max-w-[90%] [&>button]:!w-8 [&>button]:!h-8 [&>button>svg]:!w-5 [&>button>svg]:!h-5">
          <SheetHeader>
            <div className="flex justify-between items-start">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  {type === 'movie' ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                  {title}
                </SheetTitle>
                <SheetDescription>{description}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <MovieListContent
            listType={listType}
            onMarkAsWatched={handleMarkAsWatched}
            onRemove={handleRemove}
            isUpdating={isUpdating}
            onAddManual={openAddDialog}
            type={type}
            movieDetails={movieDetails}
            isLoadingDetails={isLoadingDetails}
          />
        </SheetContent>
      </Sheet>

      <AddMovieDialog
        isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setPreSelectedMovie(null);
        }}
        onAdd={addMode === 'seen' ? handleAddMovieManually : handleAddToWatchlist}
        type={type}
        mode={addMode}
        initialMovie={preSelectedMovie}
      />
    </>
  );
}
