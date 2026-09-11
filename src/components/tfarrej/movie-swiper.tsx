'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Eye, X, RotateCcw, ChevronRight, Film, Check, HelpCircle, Calendar, Clapperboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { auth } from '@/lib/firebase/client';
import { rejectMovie, addSeenMovieWithDate, addSeenSeriesWithDate, MovieCategory } from '@/lib/firebase/firestore';
import { guessMovieCategory } from '@/lib/movie-category-utils';
import { MovieCategoryPicker } from '@/components/tfarrej/movie-category-picker';
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
  const { user, userProfile, loading: authLoading, forceProfileRefresh } = useAuth();
  const { toast } = useToast();

  // État pour marquer comme vu avec boîte de dialogue date & catégorie
  const [markingSeenMovie, setMarkingSeenMovie] = useState<MovieSuggestion | null>(null);
  const [dateMode, setDateMode] = useState<'none' | 'year' | 'exact'>('none');
  const [approxYear, setApproxYear] = useState<string>('');
  const [exactDate, setExactDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chosenCategory, setChosenCategory] = useState<MovieCategory>('Drame');
  const [isCinema, setIsCinema] = useState(false);
  const [isSubmittingSeen, setIsSubmittingSeen] = useState(false);

  // Ouvrir le dialogue pour marquer comme vu
  const openMarkAsSeen = useCallback((movie: MovieSuggestion) => {
    setMarkingSeenMovie(movie);
    setDateMode('none');
    setApproxYear(movie.year ? String(movie.year) : String(new Date().getFullYear()));
    setExactDate(new Date().toISOString().split('T')[0]);
    setChosenCategory(guessMovieCategory(movie.title, movie.genre ? [movie.genre] : undefined, movie.synopsis));
    setIsCinema(false);
  }, []);

  // Confirmer le visionnage avec date et catégorie
  const handleConfirmMarkAsSeen = async () => {
    if (!markingSeenMovie || !user) return;
    setIsSubmittingSeen(true);
    try {
      let viewedAtTimestamp: number | undefined = undefined;
      if (dateMode === 'year') {
        const y = parseInt(approxYear, 10);
        if (!isNaN(y) && y >= 1900 && y <= 2100) {
          viewedAtTimestamp = new Date(y, 5, 1).getTime(); // Milieu d'année
        }
      } else if (dateMode === 'exact') {
        const d = new Date(exactDate).getTime();
        if (!isNaN(d)) {
          viewedAtTimestamp = d;
        }
      }

      if (type === 'movie') {
        await addSeenMovieWithDate(user.uid, {
          title: markingSeenMovie.title,
          posterUrl: markingSeenMovie.posterUrl || undefined,
          year: markingSeenMovie.year || undefined,
          rating: markingSeenMovie.rating || undefined,
          viewedAt: viewedAtTimestamp,
          category: chosenCategory,
          watchedInCinema: isCinema,
        });
      } else {
        await addSeenSeriesWithDate(user.uid, {
          title: markingSeenMovie.title,
          posterUrl: markingSeenMovie.posterUrl || undefined,
          year: markingSeenMovie.year || undefined,
          rating: markingSeenMovie.rating || undefined,
          viewedAt: viewedAtTimestamp,
          category: chosenCategory,
        });
      }

      forceProfileRefresh?.();

      toast({
        title: `${markingSeenMovie.title} marqué${type === 'tv' ? 'e' : ''} comme vu${type === 'tv' ? 'e' : ''} !`,
        description: viewedAtTimestamp
          ? (dateMode === 'exact' ? `Vu le ${new Date(exactDate).toLocaleDateString('fr-FR')}` : `Vu vers ${approxYear}`)
          : "Ajouté à vos visionnages.",
        className: 'bg-emerald-600 text-white font-bold border-none shadow-lg',
      });

      setMarkingSeenMovie(null);
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error('Erreur mark seen:', err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'enregistrer le visionnage pour le moment.",
      });
    } finally {
      setIsSubmittingSeen(false);
    }
  };

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
      handleAiError(error, toast);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, userProfile, type, yearRange, genre, toast]);

  // Initial fetch and fetch when dependencies change
  useEffect(() => {
    if (user && userProfile && !initialFetchDone.current) {
      initialFetchDone.current = true;
      loadMovies(false);
    }
  }, [user, userProfile, loadMovies]);

  // Load more when reaching near the end
  useEffect(() => {
    if (currentIndex >= movies.length - 2 && !isLoadingMore && movies.length > 0) {
      loadMovies(true);
    }
  }, [currentIndex, movies.length, isLoadingMore, loadMovies]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!user || currentIndex >= movies.length) return;
    const item = movies[currentIndex];

    // Quand l'utilisateur choisit "Vu" (ou swipe gauche) -> ouvrir la boîte de dialogue avec choix de date
    if (direction === 'left') {
      openMarkAsSeen(item);
      return;
    }

    try {
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

      toast({
        title: `${item.title} ajouté à votre liste !`,
        description: `Consultez la liste 'À Voir' pour ${type === 'movie' ? 'le' : 'la'} retrouver.`
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
  }, [user, currentIndex, movies, toast, type, openMarkAsSeen]);

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
                className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 h-11 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                onClick={() => openMarkAsSeen(currentMovie)}
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

      {/* Boîte de dialogue pour marquer comme vu avec option de date approximative */}
      {markingSeenMovie && (
        <Dialog open={Boolean(markingSeenMovie)} onOpenChange={(open) => { if (!open) setMarkingSeenMovie(null); }}>
          <DialogContent className="sm:max-w-[460px] max-h-[85vh] overflow-hidden flex flex-col rounded-2xl bg-card border border-border shadow-2xl text-card-foreground p-4 sm:p-5">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Check className="h-5 w-5 text-emerald-400" />
                Marquer comme Vu{type === 'tv' ? 'e' : ''}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ajouter &ldquo;{markingSeenMovie.title}&rdquo; à vos {type === 'movie' ? 'films vus' : 'séries vues'}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1">
              {/* En-tête miniature de l'œuvre */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/25 border border-border/50">
                {markingSeenMovie.posterUrl && (
                  <div className="relative w-11 h-16 rounded-md overflow-hidden shrink-0 border border-white/10 bg-black aspect-[2/3]">
                    <Image
                      src={markingSeenMovie.posterUrl}
                      alt={markingSeenMovie.title}
                      fill
                      sizes="50px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug break-words">{markingSeenMovie.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {markingSeenMovie.year ? `${markingSeenMovie.year} • ` : ''}{type === 'movie' ? 'Film' : 'Série'}
                  </p>
                </div>
              </div>

              {/* Choix de la date de visionnage */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Quand l&apos;avez-vous vu{type === 'tv' ? 'e' : ''} ?</span>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </label>

                {/* Boutons d'options de date */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/40 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setDateMode('none')}
                    className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
                      dateMode === 'none'
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sans date
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('year')}
                    className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
                      dateMode === 'year'
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Année approx.
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode('exact')}
                    className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
                      dateMode === 'exact'
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Date précise
                  </button>
                </div>

                {/* Champs selon l'option choisie */}
                {dateMode === 'none' && (
                  <p className="text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40">
                    💡 {type === 'movie' ? 'Le film' : 'La série'} sera comptabilisé{type === 'tv' ? 'e' : ''} dans vos visionnages sans date précise.
                  </p>
                )}

                {dateMode === 'year' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Année approximative de visionnage :
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex: 2015, 2021..."
                      value={approxYear}
                      onChange={(e) => setApproxYear(e.target.value)}
                      className="text-sm bg-muted/20"
                    />
                  </div>
                )}

                {dateMode === 'exact' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Date de visionnage :
                    </label>
                    <Input
                      type="date"
                      value={exactDate}
                      onChange={(e) => setExactDate(e.target.value)}
                      className="text-sm bg-muted/20"
                    />
                  </div>
                )}
              </div>

              {/* Sélection de Catégorie */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-foreground">
                  Catégorie :
                </label>
                <MovieCategoryPicker
                  selectedCategory={chosenCategory}
                  onSelectCategory={(cat) => setChosenCategory(cat)}
                  size="sm"
                />
              </div>

              {/* Option Vu au cinéma pour les films */}
              {type === 'movie' && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={isCinema}
                      onChange={(e) => setIsCinema(e.target.checked)}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <Clapperboard className="h-4 w-4 text-violet-400" />
                    <span className="text-xs font-medium text-foreground">Vu au Cinéma 🍿</span>
                  </label>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-border/50 gap-2 sm:gap-0 flex-row justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMarkingSeenMovie(null)}
                disabled={isSubmittingSeen}
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmMarkAsSeen}
                disabled={isSubmittingSeen}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-900/20"
              >
                {isSubmittingSeen ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
