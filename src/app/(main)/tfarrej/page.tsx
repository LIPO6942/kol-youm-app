
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MovieSwiper from '@/components/tfarrej/movie-swiper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Laugh, Theater, Search, Lightbulb, Rocket, Sparkles, Eye, ListVideo, Settings, Loader2, Swords, BarChart3 } from 'lucide-react';
import { MovieListSheet } from '@/components/tfarrej/movie-list-sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TfarrejStatsDialog } from '@/components/tfarrej/tfarrej-stats-dialog';
import { MovieDuelModal } from '@/components/tfarrej/MovieDuelModal';
import { useAuth } from '@/hooks/use-auth';
import type { DuelMovieItem } from '@/lib/movie-duel-engine';
import { getStoredMovieRanking, MonthlyMovieRanking, isTestMovieTitle, backfillMoviePosters } from '@/lib/firebase/firestore';

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


const movieBg = '/images/tfarrej/movies.png';
const seriesBg = '/images/tfarrej/series.png';

function TfarrejContent({ type, setType }: { type: 'movie' | 'tv'; setType: (t: 'movie' | 'tv') => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const genreFromUrl = searchParams.get('genre');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const { userProfile } = useAuth();
  const [isDuelOpen, setIsDuelOpen] = useState(false);
  const [postersCache, setPostersCache] = useState<Record<string, { posterUrl?: string; year?: number; rating?: number }>>({});

  // Mois courant pour le classement
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, [now]);
  const currentMonthName = useMemo(() => now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), [now]);
  const currentMonthIndex = now.getMonth();
  const currentYear = now.getFullYear();

  const [localRanking, setLocalRanking] = useState<MonthlyMovieRanking | null>(() => {
    return getStoredMovieRanking(currentMonthKey, userProfile);
  });

  useEffect(() => {
    const stored = getStoredMovieRanking(currentMonthKey, userProfile);
    if (stored) {
      setLocalRanking(stored);
    }
  }, [currentMonthKey, userProfile]);

  const existingRanking = userProfile?.movieRankings?.[currentMonthKey] || localRanking || getStoredMovieRanking(currentMonthKey, userProfile);

  // Liste de TOUS les films vus par l'utilisateur pour le classement et les duels (aucun film ignoré)
  const monthlySeenMovies: DuelMovieItem[] = useMemo(() => {
    const seenTitles = (userProfile?.seenMovieTitles || []).filter(t => !isTestMovieTitle(t));
    const seenDataList = (userProfile?.seenMoviesData || []).filter(m => !isTestMovieTitle(m?.title));
    const seenHistory = ((userProfile as any)?.seenMovieHistory || []).filter((h: any) => !isTestMovieTitle(h?.title));
    const rankedFromExisting = (existingRanking?.rankedTitles || []).filter(t => !isTestMovieTitle(t));

    // Map de métadonnées pour chaque titre (insensible à la casse)
    const metadataMap = new Map<string, Partial<DuelMovieItem>>();

    // 1. Enrichir avec seenMoviesData
    seenDataList.forEach(m => {
      if (m?.title) {
        metadataMap.set(m.title.toLowerCase().trim(), {
          posterUrl: m.posterUrl,
          year: m.year,
          rating: m.rating,
          watchedInCinema: m.watchedInCinema,
          cinemaPlace: m.cinemaPlace,
          viewedAt: m.viewedAt || m.addedAt,
          genres: m.genres,
        });
      }
    });

    // 2. Enrichir avec seenMovieHistory (affiches TMDb issues du swiper)
    seenHistory.forEach((h: any) => {
      if (h?.title) {
        const key = h.title.toLowerCase().trim();
        const existing = metadataMap.get(key) || {};
        if (!existing.posterUrl && (h.posterPath || h.posterUrl)) {
          existing.posterUrl = h.posterPath || h.posterUrl;
        }
        if (!existing.viewedAt && h.addedAt) {
          existing.viewedAt = h.addedAt;
        }
        metadataMap.set(key, existing);
      }
    });

    // 3. Enrichir avec les visites Cinéma
    const cinemaVisits = (userProfile?.visits || []).filter(v => v.category === 'Cinéma');
    cinemaVisits.forEach(v => {
      if (v.orderedItem) {
        const key = v.orderedItem.toLowerCase().trim();
        const existing = metadataMap.get(key) || {};
        existing.watchedInCinema = true;
        if (!existing.cinemaPlace) existing.cinemaPlace = v.placeName;
        metadataMap.set(key, existing);
      }
    });

    // 4. Ensemble exhaustif et dédupliqué de TOUS les titres vus
    const allUniqueTitles = Array.from(new Set([
      ...seenTitles,
      ...seenDataList.map(m => m.title),
      ...seenHistory.map((h: any) => h.title),
      ...rankedFromExisting,
    ])).filter(t => Boolean(t) && typeof t === 'string' && !isTestMovieTitle(t));

    // 5. Construction de la liste finale pour le duel
    const results: DuelMovieItem[] = allUniqueTitles.map(title => {
      const meta = metadataMap.get(title.toLowerCase().trim()) || {};
      const cached = postersCache[title.toLowerCase().trim()];
      return {
        title,
        posterUrl: meta.posterUrl || cached?.posterUrl,
        year: meta.year || cached?.year,
        rating: meta.rating || cached?.rating,
        watchedInCinema: meta.watchedInCinema,
        cinemaPlace: meta.cinemaPlace,
        viewedAt: meta.viewedAt,
        genres: meta.genres,
      };
    });

    return results;
  }, [userProfile?.seenMovieTitles, userProfile?.seenMoviesData, (userProfile as any)?.seenMovieHistory, userProfile?.visits, existingRanking, postersCache]);

  // Détection et résolution automatique des affiches manquantes
  useEffect(() => {
    const titlesNeedingPosters = monthlySeenMovies
      .filter(m => !m.posterUrl && !isTestMovieTitle(m.title))
      .map(m => m.title);

    if (titlesNeedingPosters.length === 0) return;

    let isCancelled = false;

    async function fetchMissingPosters() {
      try {
        const res = await fetch('/api/movies/posters-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titles: titlesNeedingPosters, type: 'movie' }),
        });

        if (!res.ok) return;
        const data = await res.json();
        if (!data?.posters || isCancelled) return;

        const newMap: Record<string, any> = {};
        Object.entries(data.posters).forEach(([title, p]: [string, any]) => {
          if (p?.posterUrl) {
            newMap[title.toLowerCase().trim()] = p;
          }
        });

        if (Object.keys(newMap).length > 0) {
          setPostersCache(prev => ({ ...prev, ...newMap }));
          const effectiveUid = userProfile?.uid || 'guest';
          await backfillMoviePosters(effectiveUid, data.posters, 'movie');
        }
      } catch (e) {
        console.warn('Erreur chargement affiches page tfarrej:', e);
      }
    }

    fetchMissingPosters();

    return () => {
      isCancelled = true;
    };
  }, [monthlySeenMovies.length, userProfile?.uid]);

  const unrankedCount = useMemo(() => {
    if (!existingRanking) return monthlySeenMovies.length;
    const rankedSet = new Set(existingRanking.rankedTitles);
    return monthlySeenMovies.filter(m => !rankedSet.has(m.title)).length;
  }, [monthlySeenMovies, existingRanking]);

  const hasUnrankedMovies = unrankedCount > 0 && monthlySeenMovies.length >= 2;

  useEffect(() => {
    if (genreFromUrl) {
      if (genres.some(g => g.name === genreFromUrl) || genreFromUrl === 'Historique') {
        setSelectedGenre(genreFromUrl);
      }
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
      <div className="flex flex-col gap-3">
        {/* Ligne 1 : Titre à gauche, Actions utilitaires (Stats & Paramètres) à droite */}
        <div className="flex justify-between items-start gap-2">
          <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight">Le Tinder du Cinéma</h2>
            <p className="text-muted-foreground text-sm">
              "Swipez" pour découvrir votre prochain coup de cœur.
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
            <TfarrejStatsDialog
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-xl border border-border/60 bg-card/60 hover:bg-accent/80 hover:border-border transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center"
                  aria-label="Statistiques de visionnage"
                >
                  <BarChart3 className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              }
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border border-border/60 bg-card/60 hover:bg-accent/80 hover:border-border transition-all duration-200 shadow-sm active:scale-95 flex items-center justify-center"
              aria-label="Paramètres"
              onClick={() => router.push('/settings?tab=tfarrej')}
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Button>
          </div>
        </div>

        {/* Ligne 2 : Grille de boutons d'action parfaitement alignés et calibrés */}
        {type === 'movie' ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full">
            <Button
              variant={hasUnrankedMovies ? "default" : "outline"}
              className={`h-10 px-2 sm:px-4 font-black rounded-xl justify-center transition-all duration-200 active:scale-[0.98] ${
                hasUnrankedMovies
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border border-white/20 shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_22px_rgba(99,102,241,0.5)] animate-pulse'
                  : 'border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-yellow-500/10 hover:from-amber-500/25 hover:to-yellow-500/20 text-amber-600 dark:text-amber-300 shadow-sm hover:shadow hover:border-amber-500/60'
              }`}
              onClick={() => setIsDuelOpen(true)}
              title="Mon classement des films vus"
            >
              <Swords className="mr-1.5 h-4 w-4 flex-shrink-0 text-amber-400 drop-shadow" />
              <span className="truncate">
                {existingRanking ? (hasUnrankedMovies ? "Nouveaux Duels" : "Classement") : "Classement"}
              </span>
              {hasUnrankedMovies && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black leading-none shadow-sm">
                  {unrankedCount}
                </span>
              )}
            </Button>

            <MovieListSheet
              trigger={
                <Button
                  variant="ocean"
                  className="h-10 px-2 sm:px-4 rounded-xl justify-center w-full font-bold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] border border-teal-500/30 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white"
                >
                  <ListVideo className="mr-1.5 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">À Voir</span>
                </Button>
              }
              title="Ma Liste 'À Voir'"
              description="Les films mis de côté."
              listType="moviesToWatch"
              type={type}
            />

            <MovieListSheet
              trigger={
                <Button
                  variant="default"
                  className="h-10 px-2 sm:px-4 rounded-xl justify-center w-full font-bold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] border border-slate-700/40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-700 dark:from-slate-800 dark:to-slate-700 text-white"
                >
                  <Eye className="mr-1.5 h-4 w-4 flex-shrink-0 text-blue-400 dark:text-blue-300" />
                  <span className="truncate">Films Vus</span>
                </Button>
              }
              title="Mes Films 'Vus'"
              description="L'historique des films notés."
              listType="seenMovieTitles"
              type={type}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
            <MovieListSheet
              trigger={
                <Button
                  variant="ocean"
                  className="h-10 px-4 rounded-xl justify-center w-full font-bold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] border border-teal-500/30 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white"
                >
                  <ListVideo className="mr-2 h-4 w-4" />
                  <span className="truncate">Séries à Voir</span>
                </Button>
              }
              title="Mes Séries 'À Voir'"
              description="Les séries mises de côté."
              listType="seriesToWatch"
              type={type}
            />

            <MovieListSheet
              trigger={
                <Button
                  variant="default"
                  className="h-10 px-4 rounded-xl justify-center w-full font-bold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] border border-slate-700/40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-700 dark:from-slate-800 dark:to-slate-700 text-white"
                >
                  <Eye className="mr-2 h-4 w-4 text-blue-400 dark:text-blue-300" />
                  <span className="truncate">Séries Vues</span>
                </Button>
              }
              title="Mes Séries 'Vues'"
              description="L'historique des séries notées."
              listType="seenSeriesTitles"
              type={type}
            />
          </div>
        )}
      </div>

      <div className="flex justify-center pb-2">
        <Tabs value={type} className="w-[400px]" onValueChange={handleTypeChange}>
          <TabsList className="grid w-full grid-cols-2 p-1 rounded-2xl bg-muted/60 backdrop-blur-md border border-border/50">
            <TabsTrigger value="movie" className="rounded-xl font-bold transition-all data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-sm">Films</TabsTrigger>
            <TabsTrigger value="tv" className="rounded-xl font-bold transition-all data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm">Séries</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="relative overflow-hidden border border-border/50 shadow-md animate-in fade-in-50">
        {/* Dynamic cross-fade static backgrounds inside the card */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Movie theme background */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform scale-105"
            style={{ 
              backgroundImage: `url(${movieBg})`,
              opacity: type === 'movie' ? 0.75 : 0 
            }}
          />
          {/* Series theme background */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform scale-105"
            style={{ 
              backgroundImage: `url(${seriesBg})`,
              opacity: type === 'tv' ? 0.75 : 0 
            }}
          />
          {/* Linear gradient overlay to beautifully fade and blend the static artwork */}
          <div className="absolute inset-0 bg-gradient-to-b from-card/80 via-card/15 to-card/85" />
        </div>

        <CardHeader className="relative z-10 text-center">
          <CardTitle>Quelle est votre humeur ?</CardTitle>
          <CardDescription>Sélectionnez une catégorie de {type === 'movie' ? 'films' : 'séries'}.</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 grid gap-4 grid-cols-2 md:grid-cols-3">
          {genres.map((genre) => (
            <div
              key={genre.name}
              onClick={() => setSelectedGenre(genre.name)}
              className="group flex flex-col rounded-lg border border-border/40 bg-card/45 backdrop-blur-md text-card-foreground shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer hover:bg-card/75"
            >
              <CardHeader className="items-center text-center p-4">
                <div className="p-3 bg-primary/10 rounded-full mb-2 group-hover:scale-110 transition-transform duration-300">
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

      <MovieDuelModal
        isOpen={isDuelOpen}
        onOpenChange={setIsDuelOpen}
        monthKey={currentMonthKey}
        monthName={currentMonthName}
        seenMovies={monthlySeenMovies}
        existingRanking={existingRanking}
        onRankingSaved={(saved) => setLocalRanking(saved)}
      />
    </div>
  );
}

export default function TfarrejPage() {
  // Determine the preferred content type (movie or tv) from localStorage
  const [type, setType] = useState<'movie' | 'tv'>('movie');
  useEffect(() => {
    const saved = localStorage.getItem('tfarrej-preference-type');
    if (saved === 'movie' || saved === 'tv') setType(saved);
  }, []);

  return (
    <div className="min-h-screen">
      <Suspense fallback={
        <div className="flex flex-col justify-center items-center h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-sm">Chargement du Tinder du Cinéma...</p>
        </div>
      }>
        <TfarrejContent type={type} setType={setType} />
      </Suspense>
    </div>
  );
}
