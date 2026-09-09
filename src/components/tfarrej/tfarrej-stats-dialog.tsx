'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, Film, Tv, Calendar, Layers, Trophy, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { SeenMovie } from '@/lib/firebase/firestore';
import { isTestMovieTitle } from '@/lib/firebase/firestore';
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
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'movie' | 'tv' | 'sagas'>('movie');
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

    const totalWatched = activeTab === 'movie'
        ? totalSeenMovies
        : activeTab === 'tv'
        ? totalSeenSeries
        : sagaStats.length;

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

                    <div className="py-3 text-center">
                        <div className="text-3xl font-bold font-headline">{totalWatched}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                            {activeTab === 'movie'
                                ? 'Films vus au total'
                                : activeTab === 'tv'
                                ? 'Séries vues au total'
                                : 'Sagas entamées'}
                        </div>
                    </div>

                    <TabsContent value="movie" className="flex-1 overflow-y-auto pr-1 space-y-4">
                        <StatsList stats={movieStats} monthNames={monthNames} />
                    </TabsContent>

                    <TabsContent value="tv" className="flex-1 overflow-y-auto pr-1 space-y-4">
                        <StatsList stats={seriesStats} monthNames={monthNames} />
                    </TabsContent>

                    <TabsContent value="sagas" className="flex-1 overflow-y-auto pr-1 space-y-3">
                        {sagaStats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2 text-center">
                                <Layers className="h-8 w-8 opacity-20" />
                                <p className="text-xs">Aucune saga ou trilogie enregistrée pour l'instant.</p>
                                <p className="text-[11px] text-muted-foreground/70">
                                    Ajoutez des films d'une franchise ou liez vos films manuellement pour suivre vos sagas !
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {sagaStats.map((saga) => {
                                    const ranking = userProfile?.sagaRankings?.[saga.id];
                                    return (
                                        <div
                                            key={saga.id}
                                            onClick={() => setInspectSaga({ id: saga.id, name: saga.name, isCustom: saga.isCustom, posterUrl: saga.posterUrl })}
                                            className="p-3 rounded-xl border border-border/70 hover:border-indigo-400/60 bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                                        >
                                            {saga.posterUrl && (
                                                <div className="relative w-10 h-14 rounded-lg overflow-hidden shadow shrink-0 border border-white/10 bg-black aspect-[2/3]">
                                                    <Image
                                                        src={saga.posterUrl}
                                                        alt={saga.name}
                                                        fill
                                                        sizes="45px"
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <div className="font-bold text-xs sm:text-sm text-foreground truncate flex items-center gap-1.5 group-hover:text-indigo-300 transition-colors">
                                                    🎬 {saga.name}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                                    <span className="text-emerald-400 font-semibold">{saga.seenTitles.length} volet(s) vu(s)</span>
                                                    {saga.isCustom && (
                                                        <span className="bg-indigo-500/15 text-indigo-300 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                                            Custom
                                                        </span>
                                                    )}
                                                </div>
                                                {ranking && ranking.rankedTitles.length > 0 && (
                                                    <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1 pt-0.5">
                                                        <Trophy className="h-3 w-3 text-amber-400 shrink-0" />
                                                        <span className="truncate">Favori : {ranking.rankedTitles[0]}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs text-primary group-hover:translate-x-0.5 transition-transform"
                                            >
                                                Voir →
                                            </Button>
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
