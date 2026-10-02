'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  MOVIE_CATEGORY_CONFIG,
  MovieCategory,
  addMovieToWatchlist,
  addSeriesToWatchlist,
  addSeenMovieWithDate,
  addSeenSeriesWithDate,
  isTestMovieTitle,
} from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { calculateCinematicDna, CategoryDnaScore } from '@/lib/cinematic-dna-utils';
import { CategoryBadge, CATEGORY_HEX_COLORS, MovieCategoryPicker } from '@/components/tfarrej/movie-category-picker';
import { guessMovieCategory } from '@/lib/movie-category-utils';
import {
  Dna,
  Trophy,
  Sparkles,
  Swords,
  Calendar,
  Globe,
  Film,
  Tv,
  Zap,
  Info,
  CheckCircle2,
  Users,
  Loader2,
  Clapperboard,
  BookmarkPlus,
  Eye,
  ExternalLink,
  CalendarDays,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CinematicDnaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonthKey?: string;
  onOpenDuel?: () => void;
  initialMediaType?: 'movie' | 'tv';
}

export function CinematicDnaModal({
  isOpen,
  onOpenChange,
  currentMonthKey,
  onOpenDuel,
  initialMediaType = 'movie',
}: CinematicDnaModalProps) {
  const { user, userProfile, forceProfileRefresh } = useAuth();
  const { toast } = useToast();
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(initialMediaType);
  const [period, setPeriod] = useState<'all' | 'month'>('all');

  // Synchroniser mediaType avec initialMediaType lorsqu'il change
  useEffect(() => {
    if (initialMediaType) {
      setMediaType(initialMediaType);
    }
  }, [initialMediaType]);

  // Mois courant calculé si non fourni
  const effectiveMonthKey = useMemo(() => {
    if (currentMonthKey) return currentMonthKey;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [currentMonthKey]);

  // Calcul du résultat d'ADN selon la période et le média (films ou séries)
  const dna = useMemo(() => {
    return calculateCinematicDna(userProfile, {
      monthKey: period === 'month' ? effectiveMonthKey : undefined,
      mediaType,
    });
  }, [userProfile, period, effectiveMonthKey, mediaType]);

  const activeScores = useMemo(() => {
    return dna.scores.filter(s => s.percentage > 0 || s.points > 0);
  }, [dna.scores]);

  // ── TITRES VUS & WATCHLIST (pour badges sur la filmographie) ─────────────────
  function normalizeTitle(t: string) {
    return t.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  function toDateInputValue(ts: number) {
    const d = new Date(ts);
    return d.toISOString().split('T')[0];
  }

  const seenSet = useMemo(() => {
    const titles = mediaType === 'tv'
      ? (userProfile?.seenSeriesTitles || [])
      : (userProfile?.seenMovieTitles || []);
    return new Set(titles.map(normalizeTitle));
  }, [userProfile, mediaType]);

  const watchSet = useMemo(() => {
    const titles = mediaType === 'tv'
      ? (userProfile?.seriesToWatch || [])
      : (userProfile?.moviesToWatch || []);
    return new Set(titles.map(normalizeTitle));
  }, [userProfile, mediaType]);

  // ── ACTIONS SUR FILMOGRAPHIE (comme sur la bande tendances) ──────────────────
  const [activeFilm, setActiveFilm] = useState<FilmographyItem | null>(null);
  const [actionLoading, setActionLoading] = useState<'watchlist' | 'seen' | null>(null);
  const [dateMode, setDateMode] = useState<'exact' | 'approx'>('exact');
  const [seenDate, setSeenDate] = useState<string>(() => toDateInputValue(Date.now()));
  const [approxYear, setApproxYear] = useState<string>('');
  const [chosenCategory, setChosenCategory] = useState<MovieCategory>('Drame');
  const [watchedInCinema, setWatchedInCinema] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const filmActionPanelRef = useRef<HTMLDivElement>(null);

  // Réinitialiser les états actifs quand la modale se ferme
  useEffect(() => {
    if (!isOpen) {
      setSelectedPerson(null);
      setActiveFilm(null);
      setShowDatePicker(false);
      setWatchedInCinema(false);
    }
  }, [isOpen]);

  const handleAddToWatchlist = async (film: FilmographyItem) => {
    const effectiveUid = user?.uid || userProfile?.uid || 'guest';
    setActionLoading('watchlist');
    try {
      if (mediaType === 'tv' || film.mediaType === 'tv') {
        await addSeriesToWatchlist(effectiveUid, film.title);
      } else {
        await addMovieToWatchlist(effectiveUid, film.title);
      }
      forceProfileRefresh?.();
      toast({
        title: `📌 Ajouté à "À Voir"`,
        description: film.title,
      });
      setActiveFilm(null);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'ajouter à la liste pour le moment.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsSeen = async (film: FilmographyItem) => {
    const effectiveUid = user?.uid || userProfile?.uid || 'guest';
    setActionLoading('seen');

    let viewedAt: number | undefined = undefined;
    if (dateMode === 'exact') {
      const d = new Date(seenDate).getTime();
      viewedAt = !isNaN(d) ? d : Date.now();
    } else {
      const y = parseInt(approxYear, 10);
      if (!isNaN(y) && y >= 1900 && y <= 2100) {
        // Milieu d'année (1er juillet à midi) pour une date approximative
        viewedAt = new Date(y, 6, 1, 12, 0, 0).getTime();
      } else {
        viewedAt = Date.now();
      }
    }

    try {
      if (mediaType === 'tv' || film.mediaType === 'tv') {
        await addSeenSeriesWithDate(effectiveUid, {
          title: film.title,
          viewedAt,
          posterUrl: film.posterPath || undefined,
          year: film.year || undefined,
          category: chosenCategory,
        });
      } else {
        await addSeenMovieWithDate(effectiveUid, {
          title: film.title,
          viewedAt,
          posterUrl: film.posterPath || undefined,
          year: film.year || undefined,
          category: chosenCategory,
          watchedInCinema: watchedInCinema ? true : undefined,
        });
      }
      forceProfileRefresh?.();
      const dateDesc = dateMode === 'exact'
        ? `Vu le ${new Date(viewedAt).toLocaleDateString('fr-FR')}`
        : `Vu vers ${approxYear || new Date(viewedAt).getFullYear()}`;
      toast({
        title: `✅ Marqué comme vu${watchedInCinema ? ' au cinéma 🍿' : ''}`,
        description: `${film.title} (${chosenCategory}) — ${dateDesc}${watchedInCinema ? ' (Séance cinéma)' : ''}`,
      });
      setActiveFilm(null);
      setShowDatePicker(false);
      setWatchedInCinema(false);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'enregistrer le visionnage.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // ── ACTEURS PRÉFÉRÉS & RÔLES ──────────────────────────────────────────────────
  interface ActorRoleDetail {
    film: string;
    rankIndex: number; // 0 = 1er film du classement
    order: number; // 0 = 1er rôle, 1 = 2e rôle, 2 = 3e rôle, etc.
    character?: string;
  }

  interface ActorScore {
    id: number;
    name: string;
    profilePath?: string;
    score: number;
    films: string[]; // top-ranked films this actor appears in
    roles?: ActorRoleDetail[];
    bestOrder?: number; // rôle le plus important (0 = tête d'affiche)
    isDirector?: boolean;
    directorCount?: number;
  }

  function getRoleBadge(order?: number) {
    if (order === undefined || order === null) {
      return { label: 'Second rôle', shortLabel: 'Second rôle', badgeClass: 'bg-white/10 text-white/70 border-white/20' };
    }
    if (order === 0) {
      return { label: '1er rôle (Principal)', shortLabel: '1er rôle', badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-400/50' };
    }
    if (order === 1) {
      return { label: '2nd rôle principal', shortLabel: '2nd rôle', badgeClass: 'bg-purple-500/25 text-purple-300 border-purple-400/50' };
    }
    if (order === 2) {
      return { label: '3e rôle', shortLabel: '3e rôle', badgeClass: 'bg-blue-500/25 text-blue-300 border-blue-400/50' };
    }
    return { label: `${order + 1}e rôle`, shortLabel: 'Second rôle', badgeClass: 'bg-slate-500/25 text-slate-300 border-slate-400/40' };
  }

  interface FilmographyItem {
    id: number;
    title: string;
    year: number | null;
    posterPath: string | null;
    voteAverage: number | null;
    mediaType: string;
    character?: string | null;
    job?: string | null;
  }

  interface PersonBio {
    id: number;
    name: string;
    biography: string;
    birthday?: string | null;
    placeOfBirth?: string | null;
    department?: string | null;
    profilePath?: string | null;
    filmsInYourList?: string[];
    filmography?: FilmographyItem[];
  }

  const [actorData, setActorData] = useState<{
    actors: ActorScore[];
    directors: ActorScore[];
    loading: boolean;
    fetched: boolean;
  }>({ actors: [], directors: [], loading: false, fetched: false });

  const [selectedPerson, setSelectedPerson] = useState<(ActorScore & { bio?: PersonBio; bioLoading?: boolean }) | null>(null);

  const personPanelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  const handlePersonClick = async (person: ActorScore) => {
    setSelectedPerson({ ...person, bioLoading: true });
    setActiveFilm(null);
    setShowDatePicker(false);
    // Scroll vers le panneau bio après le prochain rendu
    setTimeout(() => {
      personPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
    try {
      // Fetch bio + filmographie en parallèle
      const [bioRes, creditsRes] = await Promise.all([
        fetch(`/api/tmdb-person?id=${person.id}`),
        fetch(`/api/tmdb-person-credits?id=${person.id}&type=${mediaType}`),
      ]);

      const bio: PersonBio = bioRes.ok ? await bioRes.json() : {} as PersonBio;
      bio.filmsInYourList = person.films;

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        bio.filmography = creditsData.credits || [];
      }

      setSelectedPerson(prev => prev ? { ...prev, bio, bioLoading: false } : null);
    } catch {
      setSelectedPerson(prev => prev ? { ...prev, bioLoading: false } : null);
    }
  };

  // Top-ranked titles to analyse (élargi jusqu'à 50 films/séries classés et vus, avec exclusion stricte des supprimés)
  const isSeries = mediaType === 'tv';
  const topRankedTitles = useMemo(() => {
    const cleanStr = (s?: any) => String(s || '').toLowerCase().trim().replace(/['’`]/g, "'");
    const rejectedSet = new Set(
      (isSeries ? userProfile?.rejectedSeriesTitles : userProfile?.rejectedMovieTitles || [])
        .map((t: string) => cleanStr(t))
    );
    const seenSet = new Set(
      (isSeries ? userProfile?.seenSeriesTitles : userProfile?.seenMovieTitles || [])
        .filter((t: string) => !isTestMovieTitle(t))
        .map((t: string) => cleanStr(t))
    );
    const allRankings = isSeries
      ? Object.values(userProfile?.seriesRankings || {})
      : Object.values(userProfile?.movieRankings || {});
    const fromLS: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const key = isSeries ? 'kolyoum_series_rankings' : 'kolyoum_movie_rankings';
        const all = localStorage.getItem(key);
        if (all) Object.values(JSON.parse(all)).forEach((r: any) => { if (r?.rankedTitles?.length) fromLS.push(r); });
      } catch {}
    }
    const pickBest = (rankings: any[]) => {
      const valid = rankings.filter(r => r?.rankedTitles?.length > 0);
      if (!valid.length) return null;
      return valid.reduce((b, c) => (c.rankedTitles.length >= b.rankedTitles.length ? c : b));
    };
    const best = pickBest([...allRankings, ...fromLS]);
    const ranked = (best?.rankedTitles || []).filter((t: string) => {
      const c = cleanStr(t);
      return !isTestMovieTitle(c) && !rejectedSet.has(c);
    });

    // Compléter avec les autres œuvres vues valides (non supprimées) si moins de 50
    const seenList = (isSeries ? userProfile?.seenSeriesTitles : userProfile?.seenMovieTitles || [])
      .filter((t: string) => {
        const c = cleanStr(t);
        return !isTestMovieTitle(c) && !rejectedSet.has(c);
      });

    const combined = Array.from(new Set([...ranked, ...seenList]));
    return combined.slice(0, 50) as string[];
  }, [userProfile?.movieRankings, userProfile?.seriesRankings, userProfile?.seenMovieTitles, userProfile?.seenSeriesTitles, userProfile?.rejectedMovieTitles, userProfile?.rejectedSeriesTitles, isSeries]);

  const fetchActors = useCallback(async () => {
    if (!topRankedTitles.length || isFetchingRef.current) return;
    isFetchingRef.current = true;
    setActorData(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/tmdb-cast-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles: topRankedTitles, type: mediaType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Score = (N - rankIndex) where N = number of titles analysed (up to 50)
      // rank 0 (#1 film) → highest score
      const N = topRankedTitles.length;
      const actorMap = new Map<number, ActorScore>();
      const directorMap = new Map<number, ActorScore>();

      topRankedTitles.forEach((title, rankIndex) => {
        const credit = data.results?.[title];
        if (!credit) return;
        const rankScore = N - rankIndex; // #1 = N pts, #N = 1 pt

        // Cast members : barème sévère et hiérarchique selon l'importance du rôle
        // 1er rôle (Lead) : x2.0
        // 2nd rôle principal : x0.80
        // 3e rôle : x0.40
        // Rôles secondaires suivants : x0.20
        (credit.cast || []).forEach((actor: any) => {
          const billingBonus = 
            actor.order === 0 ? 2.0 :
            actor.order === 1 ? 0.80 :
            actor.order === 2 ? 0.40 : 0.20;
          const pts = rankScore * billingBonus;

          const roleDetail: ActorRoleDetail = {
            film: title,
            rankIndex,
            order: actor.order ?? 99,
            character: actor.character,
          };

          const existing = actorMap.get(actor.id);
          if (existing) {
            existing.score += pts;
            if (!existing.films.includes(title)) existing.films.push(title);
            existing.roles = [...(existing.roles || []), roleDetail];
            if (existing.bestOrder === undefined || (actor.order !== undefined && actor.order < existing.bestOrder)) {
              existing.bestOrder = actor.order;
            }
          } else {
            actorMap.set(actor.id, {
              id: actor.id,
              name: actor.name,
              profilePath: actor.profilePath,
              score: pts,
              films: [title],
              roles: [roleDetail],
              bestOrder: actor.order ?? 99,
            });
          }
        });

        // Director / Creator
        if (credit.director) {
          const d = credit.director;
          const roleDetail: ActorRoleDetail = {
            film: title,
            rankIndex,
            order: 0,
            character: mediaType === 'tv' ? 'Créateur / Showrunner' : 'Réalisateur',
          };
          const existing = directorMap.get(d.id);
          if (existing) {
            existing.score += rankScore * 1.5;
            if (!existing.films.includes(title)) existing.films.push(title);
            existing.roles = [...(existing.roles || []), roleDetail];
            existing.directorCount = (existing.directorCount || 1) + 1;
          } else {
            directorMap.set(d.id, {
              id: d.id,
              name: d.name,
              profilePath: d.profilePath,
              score: rankScore * 1.5,
              films: [title],
              roles: [roleDetail],
              isDirector: true,
              directorCount: 1,
            });
          }
        }
      });

      // Application des règles de sévérité et de récurrence sur les acteurs :
      // 1. Les 2èmes et 3èmes rôles purs (aucun 1er rôle) dans 1 seul film subissent un frein strict
      // 2. Les acteurs de 2nd/3e rôles présents dans plusieurs films débloquent le multiplicateur de fidélité pour surclasser les 1ers rôles mono-film
      const processedActors = Array.from(actorMap.values()).map(actor => {
        const filmsCount = actor.films.length;
        const hasLeadRole = actor.roles?.some(r => r.order === 0) || actor.bestOrder === 0;

        // Multiplicateur de récurrence (récompense la présence répétée dans vos films préférés)
        let recurrenceMultiplier = 1.0;
        if (filmsCount >= 4) {
          recurrenceMultiplier = 2.30;
        } else if (filmsCount === 3) {
          recurrenceMultiplier = 1.80;
        } else if (filmsCount === 2) {
          recurrenceMultiplier = 1.40;
        }

        // Frein mono-film sévère pour les rôles secondaires purs (aucun 1er rôle) :
        // Un simple 2e ou 3e rôle dans 1 seul film ne doit pas usurper le Top 10
        let singleSupportingDampener = 1.0;
        if (!hasLeadRole && filmsCount === 1) {
          singleSupportingDampener = 0.65;
        }

        const finalScore = actor.score * recurrenceMultiplier * singleSupportingDampener;
        return {
          ...actor,
          score: Math.round(finalScore * 10) / 10,
        };
      });

      // Tri final des acteurs :
      // Condition d'éligibilité pour les seconds rôles purs :
      // Pour entrer dans le Top 10, un acteur sans aucun 1er rôle doit impérativement avoir au moins 2 films préférés
      const sortedActors = processedActors
        .sort((a, b) => {
          const aHasLead = a.roles?.some(r => r.order === 0) || a.bestOrder === 0;
          const bHasLead = b.roles?.some(r => r.order === 0) || b.bestOrder === 0;
          const aPureSingle = !aHasLead && a.films.length === 1;
          const bPureSingle = !bHasLead && b.films.length === 1;

          // Si l'un est un second rôle mono-film et l'autre a fait ses preuves (1er rôle ou >= 2 films)
          if (aPureSingle && !bPureSingle) return 1;
          if (!aPureSingle && bPureSingle) return -1;

          return b.score - a.score;
        })
        .slice(0, 10);

      // Réalisateurs avec bonus de fidélité pour ceux présents dans plusieurs œuvres
      const sortedDirectors = Array.from(directorMap.values())
        .map(dir => {
          const filmsCount = dir.films.length;
          const mult = filmsCount >= 3 ? 1.5 : filmsCount === 2 ? 1.25 : 1.0;
          return {
            ...dir,
            score: Math.round(dir.score * mult * 10) / 10,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setActorData({ actors: sortedActors, directors: sortedDirectors, loading: false, fetched: true });
    } catch {
      setActorData(prev => ({ ...prev, loading: false, fetched: true }));
    } finally {
      isFetchingRef.current = false;
    }
  }, [topRankedTitles, mediaType]);

  // Reset when mediaType or topRankedTitles changes so it re-fetches
  const topRankedKey = useMemo(() => topRankedTitles.join('|'), [topRankedTitles]);
  useEffect(() => {
    isFetchingRef.current = false;
    setActorData({ actors: [], directors: [], loading: false, fetched: false });
  }, [mediaType, topRankedKey]);

  useEffect(() => {
    if (isOpen && !actorData.fetched && !actorData.loading) {
      fetchActors();
    }
  }, [isOpen, fetchActors, actorData.fetched, actorData.loading]);
  // ─────────────────────────────────────────────────────────────────────────────



  // Helper pour formater l'affiche
  const getPosterUrl = (url?: string) => {
    if (!url || url.startsWith('default:')) return null;
    let finalUrl = url;
    if (!url.startsWith('http')) {
      finalUrl = `https://image.tmdb.org/t/p/w500${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] w-[95vw] max-h-[92vh] overflow-hidden p-0 border border-indigo-500/30 bg-[#0B0C14] text-white shadow-[0_25px_80px_rgba(79,70,229,0.35)] flex flex-col !z-[200] [&>button]:text-white [&>button]:opacity-80 [&>button:hover]:opacity-100 [&>button]:bg-white/10 [&>button]:p-1.5 [&>button]:rounded-full [&>button]:transition-all">
        {/* Header néon holographique */}
        <div className="relative px-4 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-950 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 shadow-[0_0_16px_rgba(99,102,241,0.4)] shrink-0">
            <Dna className="w-5 h-5 animate-pulse" />
          </div>
          <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white flex flex-wrap items-center gap-2">
            <span>{mediaType === 'tv' ? "ADN Télévisuel & Séries" : "ADN Cinématographique"}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[9px] font-mono font-bold tracking-normal">
              pondéré par vos duels
            </span>
          </DialogTitle>
        </div>

        {/* Sélecteur de média & de période */}
        <div className="px-4 sm:px-6 pt-2.5 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 bg-black/40">
          {/* Média Switcher : Films vs Séries */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setMediaType('movie')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mediaType === 'movie'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" />
              Films
            </button>
            <button
              type="button"
              onClick={() => setMediaType('tv')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mediaType === 'tv'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Tv className="w-3 h-3" />
              Séries
            </button>
          </div>

          {/* Sélecteur de période */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 ml-auto">
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                period === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              Tous les temps
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                period === 'month'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Ce mois-ci
            </button>
          </div>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* 1. CARTE D'IDENTITÉ CINÉPHILE (ARCHÉTYPE) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-3xl p-5 sm:p-6 border border-white/15 bg-gradient-to-br ${dna.archetype.gradient} overflow-hidden shadow-2xl`}
          >
            {/* Effet lueur de fond */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {dna.archetype.badge}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white/90 text-[11px] font-semibold">
                  <Zap className="w-3 h-3 text-amber-300" />
                  Éclectisme : {dna.eclecticismIndex}%
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {dna.archetype.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-white/90 mt-0.5">
                  « {dna.archetype.tagline} »
                </p>
              </div>

              <p className="text-xs text-white/80 leading-relaxed max-w-xl bg-black/25 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                {dna.archetype.description}
              </p>
            </div>
          </motion.div>

          {/* 2. ACTEURS & RÉALISATEURS — calcul élargi jusqu'aux 50 premières œuvres */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <h4 className="text-xs font-extrabold text-white/90 uppercase tracking-wider">
                  {mediaType === 'tv' ? 'Acteurs & Créateurs' : 'Acteurs & Réalisateurs'}
                </h4>
                {topRankedTitles.length > 0 && (
                  <span className="text-[10px] text-white/50 font-normal">
                    (Top {topRankedTitles.length} {mediaType === 'tv' ? 'séries' : 'films'})
                  </span>
                )}
              </div>
              {!actorData.fetched && !actorData.loading && (
                <button type="button" onClick={fetchActors}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg transition-all border border-white/10 cursor-pointer">
                  Analyser
                </button>
              )}
            </div>

            {actorData.loading && (
              <div className="flex items-center justify-center gap-2 py-4 text-white/50">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Analyse du casting en cours...</span>
              </div>
            )}

            {actorData.fetched && actorData.actors.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-3">
                <p className="text-xs text-white/40 text-center">Pas assez de données de classement.</p>
                <button
                  type="button"
                  onClick={() => {
                    isFetchingRef.current = false;
                    setActorData({ actors: [], directors: [], loading: false, fetched: false });
                    setTimeout(() => fetchActors(), 100);
                  }}
                  className="text-[10px] font-bold text-indigo-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1 rounded-lg transition-all border border-white/10"
                >
                  🔄 Réessayer
                </button>
              </div>
            )}

            {actorData.actors.length > 0 && (
              <>
                {/* Grille 5×2 acteurs avec affichage explicite du rôle (1er rôle, 2nd rôle...) */}
                <div className="grid grid-cols-5 gap-2">
                  {actorData.actors.map((actor, i) => {
                    const roleBadge = getRoleBadge(actor.bestOrder);
                    return (
                      <button
                        key={actor.id}
                        type="button"
                        onClick={() => handlePersonClick(actor)}
                        className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.09] hover:border-rose-400/40 transition-all text-center group cursor-pointer"
                        title={`Cliquer pour voir le profil · ${roleBadge.label} · ${actor.films.slice(0, 2).join(', ')}`}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white/10 border-2 border-white/15 group-hover:border-rose-400/60 transition-all">
                            {actor.profilePath ? (
                              <img src={`/api/image-proxy?url=${encodeURIComponent(actor.profilePath)}`} alt={actor.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">{i === 0 ? '👑' : '🎭'}</div>
                            )}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 text-[9px] leading-none bg-rose-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-black shadow">{i + 1}</span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-white leading-tight line-clamp-1 w-full">{actor.name}</p>
                        <div className="flex flex-wrap items-center justify-center gap-1 mt-0.5">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border leading-none max-w-full truncate ${roleBadge.badgeClass}`}>
                            {roleBadge.shortLabel}
                          </span>
                          {actor.films.length > 1 && (
                            <span className="text-[7.5px] font-bold px-1 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 leading-none">
                              {actor.films.length} {mediaType === 'tv' ? 'séries' : 'films'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Réalisateurs en ligne */}
                {actorData.directors.length > 0 && (
                  <div>
                    <p className="text-[10px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                      <Clapperboard className="w-3 h-3" />
                      {mediaType === 'tv' ? 'Créateurs / Showrunners' : 'Réalisateurs'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {actorData.directors.map((dir, i) => (
                        <button
                          key={dir.id}
                          type="button"
                          onClick={() => handlePersonClick(dir)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.09] hover:border-amber-400/40 transition-all cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 border border-white/15 shrink-0">
                            {dir.profilePath ? (
                              <img src={`/api/image-proxy?url=${encodeURIComponent(dir.profilePath)}`} alt={dir.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">🎬</div>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-bold text-white">{dir.name}</p>
                            <p className="text-[9px] text-white/40">{dir.films.length} film{dir.films.length > 1 ? 's' : ''}</p>
                          </div>
                          {i === 0 && <span className="text-[10px]">🏆</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mini-panneau bio au clic */}
                {selectedPerson && (
                  <div ref={personPanelRef} className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/60 border border-indigo-400/30 p-4 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPerson(null);
                        setActiveFilm(null);
                        setShowDatePicker(false);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all text-xs"
                    >✕</button>

                    <div className="flex items-start gap-3">
                      <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/10 border border-white/15 shrink-0">
                        {selectedPerson.profilePath ? (
                          <img src={`/api/image-proxy?url=${encodeURIComponent(selectedPerson.profilePath)}`} alt={selectedPerson.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🎭</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm">{selectedPerson.name}</p>
                        {selectedPerson.bioLoading && (
                          <div className="flex items-center gap-1.5 mt-2 text-white/40">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-[10px]">Chargement...</span>
                          </div>
                        )}
                        {selectedPerson.bio && !selectedPerson.bioLoading && (
                          <div className="space-y-1 mt-1">
                            {selectedPerson.bio.birthday && (
                              <p className="text-[10px] text-white/60">
                                🎂 {new Date(selectedPerson.bio.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                {' '}· {new Date().getFullYear() - new Date(selectedPerson.bio.birthday).getFullYear()} ans
                              </p>
                            )}
                            {selectedPerson.bio.placeOfBirth && (
                              <p className="text-[10px] text-white/60">📍 {selectedPerson.bio.placeOfBirth}</p>
                            )}
                            {selectedPerson.bio.department && (
                              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                                {selectedPerson.bio.department}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedPerson.bio?.biography && (
                      <p className="text-[10px] text-white/65 leading-relaxed line-clamp-4">
                        {selectedPerson.bio.biography}
                      </p>
                    )}

                    {/* Détail clair des rôles et films dans votre classement */}
                    {selectedPerson.roles && selectedPerson.roles.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-extrabold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Dans vos favoris ({selectedPerson.roles.length} œuvre{selectedPerson.roles.length > 1 ? 's' : ''})</span>
                            {selectedPerson.films.length > 1 && (
                              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                ⭐ Acteur récurrent ({selectedPerson.films.length} œuvres)
                              </span>
                            )}
                          </p>
                          <span className="text-[9px] text-white/40 font-normal shrink-0">
                            Rang du film & Rôle
                          </span>
                        </div>
                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                          {selectedPerson.roles.map((r, rIdx) => {
                            const badge = getRoleBadge(r.order);
                            return (
                              <div
                                key={rIdx}
                                className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/80 shrink-0">
                                    #{r.rankIndex + 1}
                                  </span>
                                  <span className="font-bold text-white text-[11px] truncate">{r.film}</span>
                                  {r.character && (
                                    <span className="text-[10px] text-indigo-300/80 truncate hidden sm:inline">
                                      ({r.character})
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.badgeClass}`}>
                                  {badge.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : selectedPerson.films.length > 0 ? (
                      <div>
                        <p className="text-[9px] font-extrabold text-white/40 uppercase tracking-wider mb-1">Dans vos favoris</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedPerson.films.slice(0, 5).map(f => (
                            <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.07] border border-white/15 text-white/70">{f}</span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Explication du classement */}
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-400/20 text-[10px] text-indigo-200/90 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>
                        {selectedPerson.isDirector
                          ? `Réalisateur/Créateur présent dans ${selectedPerson.films.length} œuvre(s) de votre top ${topRankedTitles.length}.`
                          : `Classement calculé selon le rang de vos films (top ${topRankedTitles.length}) et l'importance du rôle (1er rôle, 2nd rôle...).`}
                      </span>
                    </div>

                    {/* Filmographie scrollable */}
                    {selectedPerson.bio?.filmography && selectedPerson.bio.filmography.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-extrabold text-white/40 uppercase tracking-wider flex items-center gap-1">
                            🎬 Filmographie notable
                          </p>
                          <span className="text-[9px] text-white/30 italic">
                            Touchez une œuvre pour agir
                          </span>
                        </div>
                        <div
                          className="flex gap-2 overflow-x-auto pb-1 pt-0.5 px-0.5"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {selectedPerson.bio.filmography.map((film) => {
                            const normTitle = normalizeTitle(film.title);
                            const alreadySeen = seenSet.has(normTitle);
                            const inWatchlist = watchSet.has(normTitle);
                            const isActive = activeFilm?.id === film.id;

                            return (
                              <button
                                type="button"
                                key={film.id}
                                onClick={() => {
                                  if (isActive) {
                                    setActiveFilm(null);
                                    setShowDatePicker(false);
                                    setWatchedInCinema(false);
                                  } else {
                                    setActiveFilm(film);
                                    setSeenDate(toDateInputValue(Date.now()));
                                    setApproxYear(film.year ? String(film.year) : String(new Date().getFullYear()));
                                    setChosenCategory(guessMovieCategory(film.title));
                                    setWatchedInCinema(false);
                                    setDateMode('exact');
                                    setShowDatePicker(false);
                                    setTimeout(() => {
                                      filmActionPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    }, 80);
                                  }
                                }}
                                title={`${film.title}${film.year ? ` (${film.year})` : ''}${film.character ? ` — ${film.character}` : film.job ? ` — ${film.job}` : ''}${alreadySeen ? ' — ✓ Déjà vu' : inWatchlist ? ' — 📌 Dans À Voir' : ''} (Cliquez pour agir)`}
                                className={`relative flex-shrink-0 w-12 h-[68px] rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer text-left ${
                                  isActive
                                    ? 'ring-2 ring-indigo-400 border-indigo-400 scale-105 shadow-[0_0_15px_rgba(99,102,241,0.6)] z-10'
                                    : alreadySeen
                                    ? 'border-emerald-400/50 hover:border-emerald-400/80 hover:scale-105'
                                    : inWatchlist
                                    ? 'border-blue-400/50 hover:border-blue-400/80 hover:scale-105'
                                    : 'border-white/10 hover:border-indigo-400/50 hover:scale-105'
                                }`}
                              >
                                {film.posterPath ? (
                                  <img
                                    src={`/api/image-proxy?url=${encodeURIComponent(film.posterPath)}`}
                                    alt={film.title}
                                    className={`w-full h-full object-cover ${alreadySeen ? 'brightness-75' : ''}`}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-[7px] text-white/30 text-center px-0.5 leading-tight">
                                    {film.title}
                                  </div>
                                )}

                                {/* Overlay vu */}
                                {alreadySeen && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-lg" />
                                  </div>
                                )}

                                {/* Overlay watchlist */}
                                {!alreadySeen && inWatchlist && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <div className="text-blue-400 text-sm">📌</div>
                                  </div>
                                )}

                                {/* Note (cachée si overlay vu) */}
                                {film.voteAverage && film.voteAverage > 0 && !alreadySeen && (
                                  <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[7px] font-black text-amber-300 text-center leading-none py-0.5">
                                    ★{film.voteAverage}
                                  </div>
                                )}

                                {/* Badge vu (en bas, par-dessus l'overlay) */}
                                {alreadySeen && (
                                  <div className="absolute bottom-0 inset-x-0 bg-emerald-900/90 text-[7px] font-black text-emerald-300 text-center leading-none py-0.5">
                                    Vu ✓
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Panneau d'action pour le film sélectionné dans la filmographie */}
                        {activeFilm && (
                          <div
                            ref={filmActionPanelRef}
                            className="rounded-xl border border-indigo-400/30 bg-[#0c101c]/95 backdrop-blur-xl p-3 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150"
                          >
                            {/* Header de l'œuvre active */}
                            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                              {activeFilm.posterPath ? (
                                <img
                                  src={`/api/image-proxy?url=${encodeURIComponent(activeFilm.posterPath)}`}
                                  alt={activeFilm.title}
                                  className="w-9 h-13 rounded-md object-cover flex-shrink-0 shadow-md border border-white/10"
                                />
                              ) : (
                                <div className="w-9 h-13 rounded-md bg-white/10 flex items-center justify-center text-xs">🎬</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-black text-white truncate leading-tight">{activeFilm.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-white/60">
                                  {activeFilm.year && <span>{activeFilm.year}</span>}
                                  {activeFilm.voteAverage && activeFilm.voteAverage > 0 && (
                                    <span className="font-bold text-amber-400">★ {activeFilm.voteAverage}</span>
                                  )}
                                  <span className="capitalize">{activeFilm.mediaType === 'tv' ? 'Série' : 'Film'}</span>
                                  {activeFilm.character && (
                                    <span className="text-indigo-300/90 truncate max-w-[140px]" title={`Rôle : ${activeFilm.character}`}>
                                      · {activeFilm.character}
                                    </span>
                                  )}
                                  {activeFilm.job && (
                                    <span className="text-purple-300/90 truncate max-w-[140px]">
                                      · {activeFilm.job}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setActiveFilm(null); setShowDatePicker(false); }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Actions : Ajouter à À Voir / Marquer comme vu / Voir fiche */}
                            <div className="space-y-1.5 pt-0.5">
                              {/* 1. Ajouter à À Voir */}
                              {!seenSet.has(normalizeTitle(activeFilm.title)) && !watchSet.has(normalizeTitle(activeFilm.title)) && (
                                <button
                                  type="button"
                                  onClick={() => handleAddToWatchlist(activeFilm)}
                                  disabled={actionLoading !== null}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/25 border border-blue-400/20 transition-all text-left disabled:opacity-50 group cursor-pointer"
                                >
                                  {actionLoading === 'watchlist' ? (
                                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                                  ) : (
                                    <BookmarkPlus className="w-4 h-4 text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white">Ajouter à "À Voir"</p>
                                    <p className="text-[10px] text-white/50">Mettre de côté pour plus tard</p>
                                  </div>
                                </button>
                              )}

                              {/* Déjà dans À Voir */}
                              {watchSet.has(normalizeTitle(activeFilm.title)) && !seenSet.has(normalizeTitle(activeFilm.title)) && (
                                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
                                  <BookmarkPlus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                  <span>Déjà dans votre liste "À Voir"</span>
                                </div>
                              )}

                              {/* 2. Marquer comme vu */}
                              {!seenSet.has(normalizeTitle(activeFilm.title)) && (
                                <>
                                  {!showDatePicker ? (
                                    <button
                                      type="button"
                                      onClick={() => setShowDatePicker(true)}
                                      disabled={actionLoading !== null}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/25 border border-emerald-400/20 transition-all text-left disabled:opacity-50 group cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white">Marquer comme vu</p>
                                        <p className="text-[10px] text-white/50">Choisir une date de visionnage</p>
                                      </div>
                                    </button>
                                  ) : (
                                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-400/25 space-y-2.5">
                                      <div className="flex items-center gap-2">
                                        <CalendarDays className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                        <p className="text-xs font-bold text-white">Date de visionnage</p>
                                      </div>

                                      {/* Onglets : Date précise vs Année approx */}
                                      <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10">
                                        <button
                                          type="button"
                                          onClick={() => setDateMode('exact')}
                                          className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
                                            dateMode === 'exact'
                                              ? 'bg-emerald-600 text-white shadow-sm'
                                              : 'text-white/60 hover:text-white hover:bg-white/5'
                                          }`}
                                        >
                                          📅 Date précise
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setDateMode('approx');
                                            if (!approxYear && activeFilm.year) {
                                              setApproxYear(String(activeFilm.year));
                                            }
                                          }}
                                          className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
                                            dateMode === 'approx'
                                              ? 'bg-emerald-600 text-white shadow-sm'
                                              : 'text-white/60 hover:text-white hover:bg-white/5'
                                          }`}
                                        >
                                          ⏳ Année approx.
                                        </button>
                                      </div>

                                      {/* Champ selon le mode */}
                                      {dateMode === 'exact' ? (
                                        <div className="space-y-1">
                                          <input
                                            type="date"
                                            value={seenDate}
                                            max={toDateInputValue(Date.now())}
                                            onChange={e => setSeenDate(e.target.value)}
                                            className="w-full rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                                          />
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5">
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="number"
                                              min={1900}
                                              max={new Date().getFullYear()}
                                              placeholder={`Ex: ${activeFilm.year || '2020'}`}
                                              value={approxYear}
                                              onChange={e => setApproxYear(e.target.value)}
                                              className="flex-1 rounded-lg bg-black/60 border border-white/20 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-white/30"
                                            />
                                            {activeFilm.year && (
                                              <button
                                                type="button"
                                                onClick={() => setApproxYear(String(activeFilm.year))}
                                                className="shrink-0 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-semibold text-emerald-300 border border-emerald-400/20 transition-colors cursor-pointer"
                                                title={`Année de sortie du film : ${activeFilm.year}`}
                                              >
                                                Sortie ({activeFilm.year})
                                              </button>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-white/50 leading-tight">
                                            💡 Pratique pour les œuvres vues il y a longtemps sans date exacte.
                                          </p>
                                        </div>
                                      )}

                                      {/* Option Vu au cinéma pour les films */}
                                      {mediaType !== 'tv' && activeFilm.mediaType !== 'tv' && (
                                        <label className="flex items-center gap-2 p-2 rounded-lg bg-black/50 border border-white/10 hover:border-amber-400/40 cursor-pointer transition-colors group">
                                          <input
                                            type="checkbox"
                                            checked={watchedInCinema}
                                            onChange={(e) => setWatchedInCinema(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/30 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-black/60 cursor-pointer"
                                          />
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <Clapperboard className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                            <span className="text-[11px] font-semibold text-white/90 group-hover:text-white">
                                              Vu au cinéma
                                            </span>
                                          </div>
                                          {watchedInCinema && (
                                            <span className="ml-auto text-[9.5px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                                              En salle 🎟️
                                            </span>
                                          )}
                                        </label>
                                      )}

                                      {/* Sélection de la Catégorie (Genre : Thriller, Comédie, Drame...) */}
                                      <div className="space-y-1.5 pt-1 border-t border-white/10">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                                            <span>🏷️</span>
                                            <span>Catégorie du {mediaType === 'tv' ? 'programme' : 'film'} :</span>
                                          </span>
                                          <span className="text-[10px] text-white/60 font-semibold">
                                            {chosenCategory}
                                          </span>
                                        </div>
                                        <MovieCategoryPicker
                                          selectedCategory={chosenCategory}
                                          onSelectCategory={(cat) => setChosenCategory(cat)}
                                          size="sm"
                                        />
                                      </div>

                                      <div className="flex gap-2 pt-0.5">
                                        <button
                                          type="button"
                                          onClick={() => setShowDatePicker(false)}
                                          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-white/60 hover:text-white hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                                        >
                                          Annuler
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMarkAsSeen(activeFilm)}
                                          disabled={actionLoading !== null || (dateMode === 'approx' && (!approxYear || parseInt(approxYear, 10) < 1900))}
                                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                                        >
                                          {actionLoading === 'seen' ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            '✓ Confirmer'
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* Déjà vu */}
                              {seenSet.has(normalizeTitle(activeFilm.title)) && (
                                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                  <span>Déjà vu — dans votre historique</span>
                                </div>
                              )}

                              {/* 3. Voir la fiche TMDB */}
                              <a
                                href={`https://www.themoviedb.org/${activeFilm.mediaType === 'tv' ? 'tv' : 'movie'}/${activeFilm.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 transition-all group cursor-pointer"
                              >
                                <ExternalLink className="w-4 h-4 text-indigo-300 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-white flex items-center gap-1">
                                    <span>Voir la fiche TMDB</span>
                                    <span className="text-[10px] text-white/40">↗</span>
                                  </p>
                                  <p className="text-[10px] text-white/50">Synopsis, casting complet, bande-annonce</p>
                                </div>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </>
            )}
          </div>

          {/* 3. SPECTRE GÉNÉTIQUE VISUEL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white/80 flex items-center gap-1.5">
                <Dna className="w-4 h-4 text-indigo-400" />
                {mediaType === 'tv' ? "Spectre du Génome Séries" : "Spectre du Génome Cinématographique"}
              </span>
              <span className="text-indigo-300 font-mono text-[11px]">
                {dna.totalRankedMovies} {mediaType === 'tv' ? 'série' : 'œuvre'}{dna.totalRankedMovies > 1 ? 's' : ''} analysée{dna.totalRankedMovies > 1 ? 's' : ''}
              </span>
            </div>

            {/* Barre segmentée lumineuse */}
            <div className="h-4 w-full rounded-xl overflow-hidden bg-white/5 border border-white/15 p-0.5 flex gap-0.5 shadow-inner">
              {activeScores.map((score) => {
                const hex = CATEGORY_HEX_COLORS[score.category] || '#6366f1';
                return (
                  <div
                    key={score.category}
                    className="h-full rounded-sm transition-all duration-500 hover:brightness-125 relative group cursor-pointer"
                    style={{
                      width: `${score.percentage}%`,
                      backgroundColor: hex,
                    }}
                    title={`${score.category} : ${score.percentage}%`}
                  />
                );
              })}
            </div>

            {/* Légende rapide des 4 premiers genres */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeScores.slice(0, 4).map((score) => {
                const config = MOVIE_CATEGORY_CONFIG[score.category];
                return (
                  <span
                    key={score.category}
                    className="text-[11px] font-semibold text-white/75 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10"
                  >
                    <span>{config?.emoji}</span>
                    <span>{score.category}</span>
                    <span className="font-bold text-white font-mono">{score.percentage}%</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* 3. PODIUM DES GÈNES PILIERS & LEURS AMBASSADEURS */}
          {dna.dominantGene && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Piliers Fondateurs de votre ADN
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { gene: dna.dominantGene, label: "Gène Dominant", badgeEmoji: "🥇", ring: "border-amber-400/50 bg-amber-500/10" },
                  { gene: dna.secondaryGene, label: "Gène Secondaire", badgeEmoji: "🥈", ring: "border-slate-300/40 bg-slate-500/10" },
                  { gene: dna.tertiaryGene, label: "Gène Émergent", badgeEmoji: "🥉", ring: "border-orange-400/40 bg-orange-500/10" },
                ]
                  .filter(item => Boolean(item.gene))
                  .map(({ gene, label, badgeEmoji, ring }) => {
                    if (!gene) return null;
                    const config = MOVIE_CATEGORY_CONFIG[gene.category];
                    const poster = getPosterUrl(gene.topMoviePosterUrl);

                    return (
                      <div
                        key={gene.category}
                        className={`rounded-2xl p-3 border ${ring} backdrop-blur-md flex flex-col justify-between space-y-2 transition-all hover:scale-[1.02]`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                            {label}
                          </span>
                          <span className="text-base leading-none">{badgeEmoji}</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {poster ? (
                            <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/20 bg-black aspect-[2/3] shadow">
                              <Image
                                src={poster}
                                alt={gene.topMovieTitle || gene.category}
                                fill
                                sizes="45px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-14 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-xl shrink-0">
                              {config?.emoji}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{config?.emoji}</span>
                              <span className="text-xs font-bold text-white truncate">{gene.category}</span>
                            </div>
                            <div className="text-lg font-black font-mono text-white">
                              {gene.percentage}%
                            </div>
                            {gene.topMovieTitle && (
                              <p className="text-[10px] text-white/50 truncate" title={gene.topMovieTitle}>
                                🏆 {gene.topMovieTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4. DÉTAIL COMPLET DES GÈNES EN POURCENTAGES (%) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-white/90 uppercase tracking-wider flex items-center justify-between">
              <span>Répartition Complète du Génome (%)</span>
              <span className="text-[11px] text-white/50 font-normal">Pondération quadratique</span>
            </h4>

            <div className="space-y-2">
              {activeScores.map((item) => {
                const config = MOVIE_CATEGORY_CONFIG[item.category];
                const hex = CATEGORY_HEX_COLORS[item.category] || '#6366f1';

                return (
                  <div
                    key={item.category}
                    className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all flex items-center gap-3"
                  >
                    <span className="text-lg sm:text-xl shrink-0">{config?.emoji}</span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                          <span>{item.category}</span>
                          {item.movieCount > 0 && (
                            <span className="text-[10px] text-white/40 font-normal">
                              ({item.movieCount} {mediaType === 'tv' ? 'série' : 'film'}{item.movieCount > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        <div className="font-black text-sm sm:text-base font-mono text-white flex items-baseline gap-0.5">
                          <span style={{ color: hex }}>{item.percentage}</span>
                          <span className="text-xs text-white/50">%</span>
                        </div>
                      </div>

                      {/* Jauge individuelle colorée */}
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: hex,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bannière explicative sur le mode de calcul */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-white">
                Comment est calculé votre ADN {mediaType === 'tv' ? 'Séries' : 'Cinéphile'} ?
              </p>
              <p className="text-white/70 text-[11px]">
                Contrairement à un simple décompte de {mediaType === 'tv' ? 'séries vues' : 'films vus'}, votre ADN s'appuie sur le <strong>classement de vos duels</strong>. Les {mediaType === 'tv' ? 'séries classées' : 'films classés'} <strong>#1, #2 et #3</strong> reçoivent une pondération exponentielle : vos véritables coups de cœur façonnent vos gènes dominants !
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
          {onOpenDuel && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenDuel();
              }}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md gap-1.5"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Affiner via un Duel {mediaType === 'tv' ? 'Séries' : 'Films'}</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="ml-auto border-white/20 text-white hover:bg-white/10 rounded-xl text-xs font-semibold"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
