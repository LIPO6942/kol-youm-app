'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, Film, Tv, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { SeenMovie } from '@/lib/firebase/firestore';

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
    const [activeTab, setActiveTab] = useState<'movie' | 'tv'>('movie');

    // Helper to aggregate data
    const aggregateData = (data: SeenMovie[] | undefined): YearlyStats[] => {
        if (!data) return [];

        const statsMap: { [year: number]: YearlyStats } = {};

        data.forEach(item => {
            if (!item.viewedAt) return;

            const date = new Date(item.viewedAt);
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

    const currentStats = activeTab === 'movie' ? movieStats : seriesStats;
    const totalWatched = currentStats.reduce((acc, curr) => acc + curr.total, 0);

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
            <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Statistiques de visionnage
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'movie' | 'tv')} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="movie" className="gap-2">
                            <Film className="h-4 w-4" /> Films
                        </TabsTrigger>
                        <TabsTrigger value="tv" className="gap-2">
                            <Tv className="h-4 w-4" /> Séries
                        </TabsTrigger>
                    </TabsList>

                    <div className="py-4 text-center">
                        <div className="text-3xl font-bold font-headline">{totalWatched}</div>
                        <div className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                            {activeTab === 'movie' ? 'Films vus au total' : 'Séries vues au total'}
                        </div>
                    </div>

                    <TabsContent value="movie" className="flex-1 overflow-y-auto pr-1 space-y-4">
                        <StatsList stats={movieStats} monthNames={monthNames} />
                    </TabsContent>

                    <TabsContent value="tv" className="flex-1 overflow-y-auto pr-1 space-y-4">
                        <StatsList stats={seriesStats} monthNames={monthNames} />
                    </TabsContent>
                </Tabs>
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
