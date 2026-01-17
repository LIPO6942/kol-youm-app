'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Film, Trash2, Eye, Loader2, Star, ExternalLink, Search, Grid3X3, List, X, Calendar, Plus, Check, ChevronDown } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { moveMovieFromWatchlistToSeen, clearUserMovieList, removeMovieFromList, addSeenMovieWithDate } from '@/lib/firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

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
  listType: 'moviesToWatch' | 'seenMovieTitles';
}

// Add Movie Dialog Component
function AddMovieDialog({ onAdd, isOpen, onOpenChange }: {
  onAdd: (movie: SearchResult, viewedAt: Date) => Promise<void>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<SearchResult | null>(null);
  const [viewedDate, setViewedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = useState(false);

  // Search TMDb
  const searchTMDb = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Erreur recherche TMDb:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchTMDb(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchTMDb]);

  const handleAdd = async () => {
    if (!selectedMovie) return;
    setIsAdding(true);
    try {
      await onAdd(selectedMovie, new Date(viewedDate));
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMovie(null);
      setViewedDate(new Date().toISOString().split('T')[0]);
      onOpenChange(false);
    } finally {
      setIsAdding(false);
    }
  };

  const resetAndClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMovie(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un film vu
          </DialogTitle>
          <DialogDescription>
            Recherchez un film et indiquez quand vous l'avez vu.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un film (FR/EN)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Search Results */}
          {(isSearching || searchResults.length > 0) && (
            <ScrollArea className="flex-1 max-h-[250px] border rounded-lg p-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {searchResults.map(movie => (
                    <button
                      key={movie.id}
                      onClick={() => setSelectedMovie(movie)}
                      className={`relative rounded-lg overflow-hidden aspect-[2/3] transition-all ${selectedMovie?.id === movie.id
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
                          <Film className="h-6 w-6 text-muted-foreground" />
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

          {/* Selected Movie & Date */}
          {selectedMovie && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
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
                      <Film className="h-5 w-5" />
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

              <div className="flex items-center gap-2">
                <Label htmlFor="viewedDate" className="text-sm whitespace-nowrap">Vu le :</Label>
                <Input
                  id="viewedDate"
                  type="date"
                  value={viewedDate}
                  onChange={(e) => setViewedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={resetAndClose}>
            Annuler
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedMovie || isAdding}
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
  onAddManual
}: {
  listType: 'moviesToWatch' | 'seenMovieTitles';
  onMarkAsWatched: (movieTitle: string) => Promise<void>;
  onRemove: (movieTitle: string) => Promise<void>;
  isUpdating: boolean;
  onAddManual: () => void;
}) {
  const { userProfile } = useAuth();
  const [movieDetails, setMovieDetails] = useState<Record<string, MovieDetails>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Constants
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months in milliseconds

  // State for search, filter, and view mode
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showOldMovies, setShowOldMovies] = useState(false);

  const movieTitles = userProfile?.[listType];
  const seenMoviesData = userProfile?.seenMoviesData;
  const sortedMovieTitles = movieTitles ? [...movieTitles].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })) : [];

  // Helper function to check if a movie is older than 6 months
  const isOlderThanSixMonths = useCallback((movieTitle: string) => {
    const seenData = seenMoviesData?.find(m => m.title === movieTitle);
    const viewedAt = seenData?.viewedAt;
    if (!viewedAt) return false;
    return Date.now() - viewedAt > SIX_MONTHS_MS;
  }, [seenMoviesData, SIX_MONTHS_MS]);

  // Extract available years for filtering
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    Object.values(movieDetails).forEach(detail => {
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

  // For seen movies: split into recent and old (>6 months)
  const { recentMovies, oldMovies } = useMemo(() => {
    if (listType !== 'seenMovieTitles') {
      return { recentMovies: filteredMovies, oldMovies: [] as string[] };
    }
    const recent: string[] = [];
    const old: string[] = [];
    filteredMovies.forEach(title => {
      if (isOlderThanSixMonths(title)) {
        old.push(title);
      } else {
        recent.push(title);
      }
    });
    return { recentMovies: recent, oldMovies: old };
  }, [filteredMovies, listType, isOlderThanSixMonths]);

  // Debounced search for TMDb API
  const searchTMDb = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const yearParam = yearFilter !== 'all' ? `&year=${yearFilter}` : '';
      const response = await fetch(`/api/tmdb-search?q=${encodeURIComponent(query)}${yearParam}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Erreur recherche TMDb:', error);
    } finally {
      setIsSearching(false);
    }
  }, [yearFilter]);

  // Debounce search - only for moviesToWatch list (not for seenMovieTitles)
  useEffect(() => {
    // For seen movies, we only do local filtering, no TMDb search
    if (listType === 'seenMovieTitles') {
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

  // Fonction pour récupérer les détails d'un film
  const fetchMovieDetails = async (movieTitle: string) => {
    if (movieDetails[movieTitle]) return;

    setIsLoadingDetails(true);
    try {
      // First check if we have data in seenMoviesData
      const seenData = seenMoviesData?.find(m => m.title === movieTitle);

      const response = await fetch('/api/tmdb-movie-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: movieTitle }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.movie) {
          // Also fetch poster from search API
          const searchRes = await fetch(`/api/tmdb-search?q=${encodeURIComponent(movieTitle)}`);
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
      console.error('Erreur lors de la récupération des détails du film:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Charger les détails pour tous les films
  useEffect(() => {
    if (sortedMovieTitles.length > 0) {
      sortedMovieTitles.forEach(movieTitle => {
        fetchMovieDetails(movieTitle);
      });
    }
  }, [sortedMovieTitles]);

  // Format date for display
  const formatViewedDate = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Render a movie item in list view
  const renderListItem = (movieTitle: string, index: number) => {
    const details = movieDetails[movieTitle];
    const seenData = seenMoviesData?.find(m => m.title === movieTitle);
    const viewedAt = details?.viewedAt || seenData?.viewedAt;

    const isOld = listType === 'seenMovieTitles' && isOlderThanSixMonths(movieTitle);

    return (
      <div key={`${movieTitle}-${index}`} className="flex flex-col p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded group">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              {!isOld && details?.posterUrl ? (
                <div className="flex-shrink-0 w-10 h-14 relative rounded overflow-hidden bg-muted">
                  <Image
                    src={details.posterUrl}
                    alt={movieTitle}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-10 h-14 rounded bg-muted flex items-center justify-center">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-[11px] sm:text-xs font-medium truncate tracking-tight leading-none" title={movieTitle}>
                  {movieTitle}
                </h4>
                {details && (
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {/* Rating hidden for seen list/compact view */}
                    {details.year && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-5 flex-shrink-0">
                        {details.year}
                      </Badge>
                    )}
                    {details.country && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] h-5 truncate max-w-[80px]">
                        {details.country}
                      </Badge>
                    )}
                    {details.wikipediaUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 flex-shrink-0"
                        onClick={() => window.open(details.wikipediaUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
                {/* Show when the movie was watched */}
                {listType === 'seenMovieTitles' && viewedAt && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Vu le {formatViewedDate(viewedAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            {listType === 'moviesToWatch' && (
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

    const isOld = listType === 'seenMovieTitles' && isOlderThanSixMonths(movieTitle);

    return (
      <div
        key={`${movieTitle}-${index}`}
        className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
        title={`${movieTitle}${viewedAt ? ` - Vu le ${formatViewedDate(viewedAt)}` : ''}`}
      >
        {!isOld && details?.posterUrl ? (
          <Image
            src={details.posterUrl}
            alt={movieTitle}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 80px, 100px"
          />
        ) : isOld ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-primary/10 to-primary/5 text-center border-2 border-transparent hover:border-primary/20 transition-all">
            <Film className="h-5 w-5 text-primary mb-1 opacity-50" />
            <p className="text-[10px] sm:text-xs font-semibold leading-tight line-clamp-3 text-foreground/90">
              {movieTitle}
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Overlay with title - Only for non-text tiles (images) */}
        {!isOld && (
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
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {listType === 'moviesToWatch' && (
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onMarkAsWatched(movieTitle); }}
              disabled={isUpdating}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onRemove(movieTitle); }}
            disabled={isUpdating}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
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
          {/* Add Button (only for seenMovieTitles) */}
          {listType === 'seenMovieTitles' && (
            <Button variant="outline" size="sm" onClick={onAddManual} className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          )}

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
                <div className="w-16 h-24 rounded overflow-hidden bg-muted mb-1 relative">
                  {result.posterUrl ? (
                    <Image src={result.posterUrl} alt={result.title} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="h-6 w-6 text-muted-foreground" />
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
              {/* Recent Movies */}
              {listType === 'seenMovieTitles' && recentMovies.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Récemment vus</h3>
                  {recentMovies.map((movieTitle, index) => renderListItem(movieTitle, index))}
                </div>
              )}

              {/* Old Movies (> 6 months) */}
              {listType === 'seenMovieTitles' && oldMovies.length > 0 && (
                <div className="mt-4">
                  {!showOldMovies ? (
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-muted-foreground"
                      onClick={() => setShowOldMovies(true)}
                    >
                      <span>Voir plus ({oldMovies.length} films anciens)</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-sm font-semibold text-muted-foreground">Vus il y a longtemps</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowOldMovies(false)} className="h-6 text-xs">
                          Masquer
                        </Button>
                      </div>
                      {oldMovies.map((movieTitle, index) => renderListItem(movieTitle, index))}
                    </div>
                  )}
                </div>
              )}

              {/* Standard List (Watchlist or Search Results) */}
              {listType !== 'seenMovieTitles' && filteredMovies.length > 0 && (
                filteredMovies.map((movieTitle, index) => renderListItem(movieTitle, index))
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
                      {listType === 'seenMovieTitles' && (
                        <Button variant="outline" size="sm" onClick={onAddManual} className="mt-4 gap-1">
                          <Plus className="h-4 w-4" />
                          Ajouter un film
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
              {listType === 'seenMovieTitles' ? (
                <>
                  {recentMovies.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">Récemment vus</h3>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                        {recentMovies.map((movieTitle, index) => renderGridItem(movieTitle, index))}
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
                          <span>Voir plus ({oldMovies.length} films anciens)</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <h3 className="text-sm font-semibold text-muted-foreground">Vus il y a longtemps</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowOldMovies(false)} className="h-6 text-xs">
                              Masquer
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                            {oldMovies.map((movieTitle, index) => renderGridItem(movieTitle, index))}
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
                      <Film className="h-10 w-10 mb-4" />
                      {searchQuery || yearFilter !== 'all' ? (
                        <p>Aucun film ne correspond à vos critères.</p>
                      ) : (
                        <p>Votre liste est vide.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state for seen list specifically if both empty */}
              {listType === 'seenMovieTitles' && recentMovies.length === 0 && oldMovies.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-[40vh]">
                  <Film className="h-10 w-10 mb-4" />
                  {searchQuery || yearFilter !== 'all' ? (
                    <p>Aucun film ne correspond à vos critères.</p>
                  ) : (
                    <>
                      <p>Votre liste est vide pour le moment.</p>
                      <Button variant="outline" size="sm" onClick={onAddManual} className="mt-4 gap-1">
                        <Plus className="h-4 w-4" />
                        Ajouter un film
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
          {filteredMovies.length} film{filteredMovies.length > 1 ? 's' : ''}
          {(searchQuery || yearFilter !== 'all') && ` (filtré${filteredMovies.length > 1 ? 's' : ''})`}
        </div>
      )}
    </div>
  );
}

export function MovieListSheet({ trigger, title, description, listType }: MovieListSheetProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleMarkAsWatched = async (movieTitle: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await moveMovieFromWatchlistToSeen(user.uid, movieTitle);
      toast({ title: `"${movieTitle}" marqué comme vu.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: "Erreur", description: "Impossible de mettre à jour le film." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async (movieTitle: string) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      await removeMovieFromList(user.uid, listType, movieTitle);
      toast({ title: `"${movieTitle}" supprimé de la liste.` });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le film.' });
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
    if (!user) return;

    await addSeenMovieWithDate(user.uid, {
      title: movie.title,
      viewedAt: viewedAt.getTime(),
      posterUrl: movie.posterUrl || undefined,
      year: movie.year || undefined,
      rating: movie.rating || undefined,
    });

    toast({ title: `"${movie.title}" ajouté aux films vus.` });
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent className="flex flex-col w-[95%] sm:max-w-[90%]">
          <SheetHeader>
            <div className="flex justify-between items-start">
              <div className="pr-4">
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>{description}</SheetDescription>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isClearing}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Vider la liste</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible et videra complètement la liste "{title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleClearList}
                      disabled={isClearing}
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </SheetHeader>
          <MovieListContent
            listType={listType}
            onMarkAsWatched={handleMarkAsWatched}
            onRemove={handleRemove}
            isUpdating={isUpdating}
            onAddManual={() => setIsAddDialogOpen(true)}
          />
        </SheetContent>
      </Sheet>

      <AddMovieDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddMovieManually}
      />
    </>
  );
}