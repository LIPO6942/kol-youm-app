'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, Film, Tv, Calendar, Layers, Trophy, Sparkles, CheckCircle2, Clock, Check } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { SeenMovie } from '@/lib/firebase/firestore';
import { isTestMovieTitle, toggleSagaCompleted } from '@/lib/firebase/firestore';
import { SagaDetailModal } from '@/components/tfarrej/SagaDetailModal';

interface TfarrejStatsDialogProps {
    trigger?: React.ReactNode;
}

interface YearlyStats {
    year: number;
    months: { [key: number]: number }; // month index (0-11) -> count
    total: number;
}

export function TfarrejStatsDialog({ trigger }: TfarrejStatsDialogProps) {
    const { user, userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'movie' | 'tv' | 'sagas'>('movie');
    const [sagaFilter, setSagaFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
    const [sagaMetaMap, setSagaMetaMap] = useState<Record<string, { totalParts?: number; releasedParts?: number }>>({});
    const [inspectSaga, setInspectSaga] = useState<{ id: string; name: string; isCustom?: boolean; posterUrl?: string } | null>(null);

    // Helper to aggregate data with valid dates
    const aggregateData = (data: SeenMovie[] | undefined): YearlyStats[] => {
        if (!data) return [];

        const statsMap: { [year: number]: YearlyStats } = {};

        data.forEach(item => {
            if (!item || !item.viewedAt) return;
            if (item.title && isTestMovieTitle(item.title)) return;

            const date = new Date(item.viewedAt);
            if (isNaN(date.getTime())) return;
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11

            if (!statsMap[year]) {
                statsMap[year] = { year, months: {}, total: 0 };
            }

            statsMap[year].total += 1;
            statsMap[year].months[month] = (statsMap[year].months[month] || 0) + 1;
        });

        return Object.values(statsMap).sort((a, b) => b.year - a.year);
    };

    const movieStats = useMemo(() => aggregateData(userProfile?.seenMoviesData), [userProfile?.seenMoviesData]);
    const seriesStats = useMemo(() => aggregateData(userProfile?.seenSeriesData), [userProfile?.seenSeriesData]);

    const totalSeenMovies = useMemo(() => {
        const fromTitles = (Array.isArray(userProfile?.seenMovieTitles) ? userProfile.seenMovieTitles : []).filter(t => typeof t === 'string' && !isTestMovieTitle(t));
        const fromData = (Array.isArray(userProfile?.seenMoviesData) ? userProfile.seenMoviesData : []).map(m => m?.title).filter((t): t is string => Boolean(t && typeof t === 'string' && !isTestMovieTitle(t)));
        const fromVisits = (Array.isArray(userProfile?.visits) ? userProfile.visits : [])
            .filter(v => v && v.category === 'Cinéma' && v.orderedItem && typeof v.orderedItem === 'string' && !isTestMovieTitle(v.orderedItem))
            .map(v => v.orderedItem as string);
        return Array.from(new Set([...fromTitles, ...fromData, ...fromVisits])).length;
    }, [userProfile?.seenMovieTitles, userProfile?.seenMoviesData, userProfile?.visits]);

    const totalSeenSeries = useMemo(() => {
        const fromTitles = (Array.isArray(userProfile?.seenSeriesTitles) ? userProfile.seenSeriesTitles : []).filter(t => typeof t === 'string' && !isTestMovieTitle(t));
        const fromData = (Array.isArray(userProfile?.seenSeriesData) ? userProfile.seenSeriesData : []).map(m => m?.title).filter((t): t is string => Boolean(t && typeof t === 'string' && !isTestMovieTitle(t)));
        return Array.from(new Set([...fromTitles, ...fromData])).length;
    }, [userProfile?.seenSeriesTitles, userProfile?.seenSeriesData]);

    // Statistiques des Sagas & Trilogies
    const sagaStats = useMemo(() => {
        const sagasMap = new Map<string, {
            id: string;
            name: string;
            isCustom?: boolean;
            seenTitles: string[];
            posterUrl?: string;
        }>();

        const seenSet = new Set([
            ...(userProfile?.seenMovieTitles || []).map(t => (t || '').toLowerCase().trim()),
            ...(userProfile?.seenMoviesData || []).map(m => (m?.title || '').toLowerCase().trim()),
        ]);

        // 1. Sagas personnalisées
        Object.values(userProfile?.customSagas || {}).forEach(s => {
            if (!s || !s.id) return;
            const sid = String(s.id);
            const seen = (s.movieTitles || []).filter(t => {
                const norm = (t || '').toLowerCase().trim();
                return seenSet.has(norm);
            });
            sagasMap.set(sid, {
                id: sid,
                name: s.name,
                isCustom: true,
                seenTitles: seen.length > 0 ? seen : (s.movieTitles || []),
                posterUrl: s.posterUrl,
            });
        });

        // 2. Sagas depuis sagaRankings (ex: duel joué, classement officiel enregistré)
        Object.values(userProfile?.sagaRankings || {}).forEach(r => {
            if (!r || !r.sagaId) return;
            const sid = String(r.sagaId);
            const seen = (r.rankedTitles || []).filter(t => {
                const norm = (t || '').toLowerCase().trim();
                return seenSet.has(norm) || (r.rankedTitles || []).includes(t);
            });
            if (!sagasMap.has(sid)) {
                sagasMap.set(sid, {
                    id: sid,
                    name: r.sagaName || 'Saga',
                    isCustom: sid.startsWith('custom_'),
                    seenTitles: seen.length > 0 ? seen : (r.rankedTitles || []),
                });
            } else {
                const existing = sagasMap.get(sid)!;
                if (!existing.name || existing.name === 'Saga') {
                    existing.name = r.sagaName;
                }
                seen.forEach(t => {
                    if (!existing.seenTitles.some(st => st.toLowerCase().trim() === t.toLowerCase().trim())) {
                        existing.seenTitles.push(t);
                    }
                });
            }
        });

        // 3. Sagas depuis movieSagaLinks
        Object.entries(userProfile?.movieSagaLinks || {}).forEach(([movieNorm, sid]) => {
            if (!sid) return;
            const sidStr = String(sid);
            const realTitle = (userProfile?.seenMovieTitles || []).find(t => (t || '').toLowerCase().trim() === movieNorm)
                || (userProfile?.seenMoviesData || []).find(m => m?.title?.toLowerCase()?.trim() === movieNorm)?.title
                || movieNorm;

            if (!sagasMap.has(sidStr)) {
                const custom = userProfile?.customSagas?.[sidStr];
                const ranking = userProfile?.sagaRankings?.[sidStr];
                sagasMap.set(sidStr, {
                    id: sidStr,
                    name: custom?.name || ranking?.sagaName || 'Saga',
                    isCustom: sidStr.startsWith('custom_'),
                    seenTitles: [realTitle],
                    posterUrl: custom?.posterUrl,
                });
            } else {
                const existing = sagasMap.get(sidStr)!;
                if (!existing.seenTitles.some(st => st.toLowerCase().trim() === movieNorm)) {
                    existing.seenTitles.push(realTitle);
                }
            }
        });

        // 4. Collections TMDb depuis seenMoviesData
        (userProfile?.seenMoviesData || []).forEach(m => {
            if (m?.collection && m.collection.id) {
                const colId = String(m.collection.id);
                if (!sagasMap.has(colId)) {
                    sagasMap.set(colId, {
                        id: colId,
                        name: m.collection.name,
                        isCustom: Boolean(m.collection.isCustom),
                        seenTitles: [m.title],
                        posterUrl: m.collection.posterUrl || m.posterUrl,
                    });
                } else {
                    const existing = sagasMap.get(colId)!;
                    if (!existing.posterUrl && (m.collection.posterUrl || m.posterUrl)) {
                        existing.posterUrl = m.collection.posterUrl || m.posterUrl;
                    }
                    if (!existing.seenTitles.some(st => st.toLowerCase().trim() === m.title.toLowerCase().trim())) {
                        existing.seenTitles.push(m.title);
                    }
                }
            }
        });

        // Résoudre les affiches manquantes depuis seenMoviesData si possible
        sagasMap.forEach(item => {
            if (!item.posterUrl) {
                const match = (userProfile?.seenMoviesData || []).find(m =>
                    item.seenTitles.some(st => st.toLowerCase().trim() === (m?.title || '').toLowerCase().trim()) && m?.posterUrl
                );
                if (match?.posterUrl) {
                    item.posterUrl = match.posterUrl;
                }
            }
        });

        return Array.from(sagasMap.values()).sort((a, b) => b.seenTitles.length - a.seenTitles.length);
    }, [userProfile?.customSagas, userProfile?.sagaRankings, userProfile?.movieSagaLinks, userProfile?.seenMoviesData, userProfile?.seenMovieTitles]);

    // Récupérer les métadonnées de collection TMDb pour savoir si la franchise est complète
    useEffect(() => {
        if (activeTab !== 'sagas') return;

        sagaStats.forEach(async (saga) => {
            if (saga.isCustom) return;
            const cacheKey = `tmdb_col_meta_${saga.id}`;
            if (typeof window !== 'undefined') {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        setSagaMetaMap(prev => prev[saga.id] ? prev : ({ ...prev, [saga.id]: parsed }));
                        return;
                    } catch (e) {}
                }
            }

            try {
                const res = await fetch(`/api/tmdb-collection?id=${encodeURIComponent(saga.id)}`);
                if (res.ok) {
                    const data = await res.json();
                    const parts = (data.collection?.parts || []) as any[];
                    const now = Date.now();
                    const releasedParts = parts.filter(p => !p.releaseDate || new Date(p.releaseDate).getTime() <= now);
                    const meta = {
                        totalParts: parts.length,
                        releasedParts: releasedParts.length,
                    };
                    if (typeof window !== 'undefined') {
                        sessionStorage.setItem(cacheKey, JSON.stringify(meta));
                    }
                    setSagaMetaMap(prev => ({ ...prev, [saga.id]: meta }));
                }
            } catch (err) {
                console.warn(`Erreur fetch collection ${saga.id}:`, err);
            }
        });
    }, [activeTab, sagaStats]);

    // Calcul de l'état "Entamée" vs "Terminée" pour chaque saga
    const enrichedSagaStats = useMemo(() => {
        return sagaStats.map(saga => {
            const custom = userProfile?.customSagas?.[saga.id];
            const meta = sagaMetaMap[saga.id];

            const totalCount = saga.isCustom
                ? (custom?.movieTitles?.length || saga.seenTitles.length)
                : (meta?.totalParts || saga.seenTitles.length);

            const releasedCount = saga.isCustom
                ? totalCount
                : (meta?.releasedParts !== undefined ? meta.releasedParts : totalCount);

            const seenCount = saga.seenTitles.length;

            // Une saga est terminée si :
            // 1. Manuellement marquée terminée dans userProfile.completedSagas
            // 2. Ou tous les volets enregistrés/connus ont été vus (seenCount >= totalCount)
            // 3. Ou tous les volets déjà sortis ont été vus (seenCount >= releasedCount)
            const isCompleted = Boolean(
                userProfile?.completedSagas?.[saga.id] ||
                (totalCount > 0 && seenCount >= totalCount) ||
                (meta?.releasedParts !== undefined && releasedCount > 0 && seenCount >= releasedCount)
            );

            const progressPercent = totalCount > 0
                ? Math.min(100, Math.round((seenCount / totalCount) * 100))
                : 100;

            return {
                ...saga,
                totalCount,
                releasedCount,
                isCompleted,
                progressPercent,
            };
        });
    }, [sagaStats, userProfile?.customSagas, userProfile?.completedSagas, sagaMetaMap]);

    const inProgressSagas = useMemo(() => enrichedSagaStats.filter(s => !s.isCompleted), [enrichedSagaStats]);
    const completedSagas = useMemo(() => enrichedSagaStats.filter(s => s.isCompleted), [enrichedSagaStats]);
    const inProgressCount = inProgressSagas.length;
    const completedCount = completedSagas.length;

    const displayedSagas = useMemo(() => {
        if (sagaFilter === 'in_progress') return inProgressSagas;
        if (sagaFilter === 'completed') return completedSagas;
        return enrichedSagaStats;
    }, [sagaFilter, inProgressSagas, completedSagas, enrichedSagaStats]);

    const totalWatched = activeTab === 'movie'
        ? totalSeenMovies
        : activeTab === 'tv'
        ? totalSeenSeries
        : enrichedSagaStats.length;

    const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <BarChart3 className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Statistiques de visionnage
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'movie' | 'tv' | 'sagas')} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="movie" className="gap-1.5 text-xs">
                            <Film className="h-3.5 w-3.5" /> Films
                        </TabsTrigger>
                        <TabsTrigger value="tv" className="gap-1.5 text-xs">
                            <Tv className="h-3.5 w-3.5" /> Séries
                        </TabsTrigger>
                        <TabsTrigger value="sagas" className="gap-1.5 text-xs">
                            <Layers className="h-3.5 w-3.5" /> Sagas
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'sagas' ? (
                        <div className="py-2.5 px-1 space-y-2.5">
                            {/* Deux cartes distinctes : Sagas entamées & Sagas terminées */}
                            <div className="grid grid-cols-2 gap-2.5 max-w-[360px] mx-auto">
                                <div 
                                    onClick={() => setSagaFilter(prev => prev === 'in_progress' ? 'all' : 'in_progress')}
                                    className={`cursor-pointer p-2.5 rounded-xl border transition-all text-center select-none ${
                                        sagaFilter === 'in_progress' 
                                            ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/40' 
                                            : 'bg-muted/30 border-border/60 hover:bg-muted/50 hover:border-amber-500/30'
                                    }`}
                                >
                                    <div className="text-2xl font-bold font-headline text-amber-400 flex items-center justify-center gap-1.5">
                                        <Clock className="h-4.5 w-4.5 text-amber-400" />
                                        {inProgressCount}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                                        Sagas entamées
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setSagaFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                                    className={`cursor-pointer p-2.5 rounded-xl border transition-all text-center select-none ${
                                        sagaFilter === 'completed' 
                                            ? 'bg-emerald-500/15 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40' 
                                            : 'bg-muted/30 border-border/60 hover:bg-muted/50 hover:border-emerald-500/30'
                                    }`}
                                >
                                    <div className="text-2xl font-bold font-headline text-emerald-400 flex items-center justify-center gap-1.5">
                                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                                        {completedCount}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                                        Sagas terminées
                                    </div>
                                </div>
                            </div>

                            {/* Filtres sous forme de pilules */}
                            <div className="flex items-center justify-center gap-1.5 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => setSagaFilter('all')}
                                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                                        sagaFilter === 'all'
                                            ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                            : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                                    }`}
                                >
                                    Toutes ({enrichedSagaStats.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSagaFilter('in_progress')}
                                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                                        sagaFilter === 'in_progress'
                                            ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                                            : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                                    }`}
                                >
                                    ⏳ Entamées ({inProgressCount})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSagaFilter('completed')}
                                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${
                                        sagaFilter === 'completed'
                                            ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                                            : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                                    }`}
                                >
                                    ✅ Terminées ({completedCount})
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-3 text-center">
                            <div className="text-3xl font-bold font-headline">{totalWatched}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                                {activeTab === 'movie'
                                    ? 'Films vus au total'
                                    : 'Séries vues au total'}
                            </div>
                        </div>
                    )}

                    <TabsContent value="movie" className="flex-1 overflow-y-auto pr-1 space-y-4">
                        <StatsList stats={movieStats} monthNames={monthNames} />
                    </TabsContent>

                    <TabsContent value="tv" className="flex-1 overflow-y-auto pr-1 space-y-4">
                        <StatsList stats={seriesStats} monthNames={monthNames} />
                    </TabsContent>

                    <TabsContent value="sagas" className="flex-1 overflow-y-auto pr-1 space-y-3">
                        {displayedSagas.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 text-center">
                                {sagaFilter === 'completed' ? (
                                    <>
                                        <CheckCircle2 className="h-8 w-8 text-emerald-400/40" />
                                        <p className="text-xs">Aucune saga terminée pour l'instant.</p>
                                        <p className="text-[11px] text-muted-foreground/70">
                                            Complétez tous les volets d'une franchise ou marquez-la comme terminée avec le bouton ✓ !
                                        </p>
                                    </>
                                ) : sagaFilter === 'in_progress' ? (
                                    <>
                                        <Clock className="h-8 w-8 text-amber-400/40" />
                                        <p className="text-xs">Aucune saga en cours.</p>
                                        <p className="text-[11px] text-muted-foreground/70">
                                            Toutes vos sagas répertoriées sont terminées !
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Layers className="h-8 w-8 opacity-20" />
                                        <p className="text-xs">Aucune saga ou trilogie enregistrée pour l'instant.</p>
                                        <p className="text-[11px] text-muted-foreground/70">
                                            Ajoutez des films d'une franchise ou liez vos films manuellement pour suivre vos sagas !
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {displayedSagas.map((saga) => {
                                    const ranking = userProfile?.sagaRankings?.[saga.id];
                                    return (
                                        <div
                                            key={saga.id}
                                            onClick={() => setInspectSaga({ id: saga.id, name: saga.name, isCustom: saga.isCustom, posterUrl: saga.posterUrl })}
                                            className="p-3 rounded-xl border border-border/70 hover:border-indigo-400/60 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                                        >
                                            {saga.posterUrl && (
                                                <div className="relative w-11 h-16 rounded-lg overflow-hidden shadow shrink-0 border border-white/10 bg-black aspect-[2/3]">
                                                    <Image
                                                        src={saga.posterUrl}
                                                        alt={saga.name}
                                                        fill
                                                        sizes="50px"
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-1.5 min-w-0 flex-1">
                                                <div className="font-bold text-xs sm:text-sm text-foreground truncate flex items-center gap-1.5 group-hover:text-indigo-300 transition-colors">
                                                    🎬 {saga.name}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {saga.isCompleted ? (
                                                        <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                                                            Terminée • {saga.seenTitles.length}/{saga.totalCount} vus
                                                        </span>
                                                    ) : (
                                                        <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                            <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                                                            En cours • {saga.seenTitles.length}/{saga.totalCount} vus ({saga.progressPercent}%)
                                                        </span>
                                                    )}

                                                    {saga.isCustom && (
                                                        <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                                            Custom
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Barre de progression visuelle */}
                                                <div className="w-full bg-muted/50 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                            saga.isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                                                        }`}
                                                        style={{ width: `${saga.progressPercent}%` }}
                                                    />
                                                </div>

                                                {ranking && ranking.rankedTitles.length > 0 && (
                                                    <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1 pt-0.5">
                                                        <Trophy className="h-3 w-3 text-amber-400 shrink-0" />
                                                        <span className="truncate">Favori : {ranking.rankedTitles[0]}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={`h-8 w-8 rounded-lg ${
                                                        saga.isCompleted 
                                                            ? 'text-emerald-400 hover:text-amber-400 hover:bg-amber-500/10' 
                                                            : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10'
                                                    }`}
                                                    title={saga.isCompleted ? 'Marquer comme en cours' : 'Marquer comme terminée (100% vue)'}
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const nextState = !saga.isCompleted;
                                                        await toggleSagaCompleted(user?.uid || 'guest', saga.id, nextState);
                                                    }}
                                                >
                                                    <Check className={`h-4 w-4 ${saga.isCompleted ? 'stroke-[2.5]' : 'opacity-40'}`} />
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs text-primary group-hover:translate-x-0.5 transition-transform px-2"
                                                >
                                                    Voir →
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>


                {inspectSaga && (
                    <SagaDetailModal
                        isOpen={!!inspectSaga}
                        onOpenChange={(open) => { if (!open) setInspectSaga(null); }}
                        sagaId={inspectSaga.id}
                        sagaName={inspectSaga.name}
                        isCustom={inspectSaga.isCustom}
                        fallbackPosterUrl={inspectSaga.posterUrl}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function StatsList({ stats, monthNames }: { stats: YearlyStats[], monthNames: string[] }) {
    if (stats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <Calendar className="h-8 w-8 opacity-20" />
                <p className="text-sm">Aucune donnée disponible</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {stats.map((yearStat) => (
                <div key={yearStat.year} className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-lg">{yearStat.year}</h3>
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {yearStat.total} {yearStat.total > 1 ? 'total' : 'total'}
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        {Object.entries(yearStat.months)
                            .sort((a, b) => parseInt(b[0]) - parseInt(a[0])) // Descending months
                            .map(([monthIndex, count]) => (
                                <div key={monthIndex} className="flex items-center text-sm">
                                    <span className="w-24 text-muted-foreground">{monthNames[parseInt(monthIndex)]}</span>
                                    <div className="flex-1 mx-2 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary/60 rounded-full"
                                            style={{ width: `${Math.min((count / yearStat.total) * 100 * 1.5, 100)}%` }} // * 1.5 to make bars more visible even for small counts
                                        />
                                    </div>
                                    <span className="w-6 text-right font-medium">{count}</span>
                                </div>
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
