'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryFrequency, getStatsForPeriod, PeriodStats } from '@/lib/khrouj-stats-utils';
import { Coffee, Sandwich, Pizza, Sun, Mountain, ShoppingBag, Clock, Calendar, type LucideIcon, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { VisitLog } from '@/lib/firebase/firestore';

interface HabitFrequencyProps {
    frequencies: CategoryFrequency[];
    heatmap: number[]; // 0=Mon, 6=Sun
    monthlyHeatmap?: number[];
    yearlyHeatmap?: number[];
    visits?: VisitLog[];
}

const CATEGORY_CONFIG: Record<string, {
    icon: LucideIcon,
    color: string,
    bg: string,
    border: string,
    text: string,
    accent: string
}> = {
    'Café': {
        icon: Coffee,
        color: 'text-amber-600',
        bg: 'bg-amber-50/50',
        border: 'border-amber-100',
        text: 'text-amber-900',
        accent: 'bg-amber-500'
    },
    'Fast Food': {
        icon: Sandwich,
        color: 'text-orange-600',
        bg: 'bg-orange-50/50',
        border: 'border-orange-100',
        text: 'text-orange-900',
        accent: 'bg-orange-500'
    },
    'Restaurant': {
        icon: Pizza,
        color: 'text-red-600',
        bg: 'bg-red-50/50',
        border: 'border-red-100',
        text: 'text-red-900',
        accent: 'bg-red-500'
    },
    'Brunch': {
        icon: Sun,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50/50',
        border: 'border-yellow-100',
        text: 'text-yellow-900',
        accent: 'bg-yellow-500'
    },
    'Balade': {
        icon: Mountain,
        color: 'text-green-600',
        bg: 'bg-green-50/50',
        border: 'border-green-100',
        text: 'text-green-900',
        accent: 'bg-green-500'
    },
    'Shopping': {
        icon: ShoppingBag,
        color: 'text-pink-600',
        bg: 'bg-pink-50/50',
        border: 'border-pink-100',
        text: 'text-pink-900',
        accent: 'bg-pink-500'
    },
};

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function HabitFrequency({ frequencies, heatmap, monthlyHeatmap, yearlyHeatmap, visits }: HabitFrequencyProps) {
    if (frequencies.length === 0) return null;

    const now = Date.now();
    const maxVisits = Math.max(...heatmap, 1);

    return (
        <Card className="max-w-xl border-slate-200/60 dark:border-slate-800/60 overflow-hidden bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-lg transition-all duration-500">
            <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400 animate-pulse" />
                    <CardTitle className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        Rythme & Habitudes
                    </CardTitle>
                </div>

                {/* Minatur Heatmap in Header */}
                <div className="flex gap-0.5 items-end h-4">
                    {heatmap.map((count, i) => (
                        <TooltipProvider key={i}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "w-1.5 rounded-t-[1px] transition-all duration-500",
                                            count === 0 ? "bg-slate-200 dark:bg-slate-800 h-1" : "bg-primary h-full opacity-40 hover:opacity-100"
                                        )}
                                        style={{ height: count === 0 ? '4px' : `${Math.max(4, (count / maxVisits) * 100)}%` }}
                                    />
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] py-1 px-2">
                                    {DAYS_SHORT[i]} : {count} sortie{count > 1 ? 's' : ''}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
                <div className="grid grid-cols-1 gap-2">
                    {frequencies.map((f) => {
                        const config = CATEGORY_CONFIG[f.category] || {
                            icon: Clock,
                            color: 'text-slate-600',
                            bg: 'bg-slate-50/50',
                            border: 'border-slate-100',
                            text: 'text-slate-900',
                            accent: 'bg-slate-500'
                        };
                        const Icon = config.icon;

                        // Prediction Logic
                        const nextVisitDate = f.lastVisit + (f.averageDays * 24 * 60 * 60 * 1000);
                        const daysRemaining = Math.max(0, Math.ceil((nextVisitDate - now) / (24 * 60 * 60 * 1000)));
                        const isOverdue = nextVisitDate < now;

                        return (
                            <div
                                key={f.category}
                                className={cn(
                                    "relative flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 group/item",
                                    config.bg,
                                    config.border,
                                    "hover:shadow-md hover:scale-[1.01]"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover/item:rotate-3",
                                        "bg-white dark:bg-slate-900 border border-white/50 dark:border-slate-800"
                                    )}>
                                        <Icon className={cn("h-5 w-5", config.color)} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={cn("text-[10px] font-black uppercase tracking-tight", config.color)}>{f.category}</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                                {f.averageDays}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                {f.averageDays === 1 ? 'jour' : 'jours'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-0.5">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                                        <Calendar className="h-3 w-3 text-slate-400" />
                                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300">
                                            {isOverdue ? (
                                                <span className="text-red-500 animate-pulse">Retard de {Math.abs(daysRemaining)}j</span>
                                            ) : (
                                                `Prochaine : ${daysRemaining === 0 ? "Aujourd'hui" : `dans ${daysRemaining}j`}`
                                            )}
                                        </span>
                                    </div>
                                    {/* Small Progress Bar */}
                                    <div className="w-20 h-1 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                                        <div
                                            className={cn("h-full transition-all duration-1000", config.accent)}
                                            style={{
                                                width: `${Math.min(100, (1 - daysRemaining / f.averageDays) * 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Intensity Sections */}
                <div className="mt-3 space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    {/* Weekly Heatmap */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Intensité semaine</span>
                        <div className="flex gap-0.5">
                            {heatmap.map((count, i) => (
                                <div key={i} className="flex flex-col items-center gap-0.5">
                                    <div
                                        className={cn(
                                            "w-2.5 h-2.5 rounded-[1px] transition-colors duration-300",
                                            count === 0 ? "bg-slate-100 dark:bg-slate-800/50" :
                                                count === 1 ? "bg-primary/30" :
                                                    count === 2 ? "bg-primary/60" :
                                                        "bg-primary"
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly Intensity (Clickable) */}
                    {monthlyHeatmap && (
                        <PeriodStatsDialog visits={visits || []} period="month">
                            <div className="flex items-center justify-between px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors cursor-pointer group">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">Intensité mois</span>
                                    <BarChart3 className="h-2 w-2 text-slate-300 group-hover:text-primary" />
                                </div>
                                <div className="flex gap-px">
                                    {monthlyHeatmap.map((count: number, i: number) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-1.5 h-2.5 rounded-[1px] transition-colors duration-300",
                                                count === 0 ? "bg-slate-100 dark:bg-slate-800/50" :
                                                    count === 1 ? "bg-primary/30" :
                                                        count === 2 ? "bg-primary/60" :
                                                            "bg-primary"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </PeriodStatsDialog>
                    )}

                    {/* Yearly Intensity (Clickable) */}
                    {yearlyHeatmap && (
                        <PeriodStatsDialog visits={visits || []} period="year">
                            <div className="flex items-center justify-between px-1 py-1 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-lg transition-colors cursor-pointer group">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">Intensité année</span>
                                    <TrendingUp className="h-2 w-2 text-slate-300 group-hover:text-primary" />
                                </div>
                                <div className="flex gap-0.5">
                                    {yearlyHeatmap.map((count: number, i: number) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-3 h-2.5 rounded-[1px] transition-colors duration-300",
                                                count === 0 ? "bg-slate-100 dark:bg-slate-800/50" :
                                                    count >= 1 && count <= 3 ? "bg-primary/30" :
                                                        count > 3 && count <= 6 ? "bg-primary/60" :
                                                            "bg-primary"
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </PeriodStatsDialog>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function PeriodStatsDialog({ visits, period, children }: { visits: VisitLog[], period: 'month' | 'year', children: React.ReactNode }) {
    const stats = getStatsForPeriod(visits, period);
    const title = period === 'month' ? "Statistiques du Mois" : "Récapitulatif de l'Année";
    const description = period === 'month'
        ? "Détail de vos sorties sur les 30 derniers jours."
        : "Votre activité sur l'ensemble de l'année en cours.";

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-[350px] rounded-3xl p-6">
                <DialogHeader>
                    <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                        {period === 'month' ? <BarChart3 className="h-6 w-6 text-primary" /> : <TrendingUp className="h-6 w-6 text-primary" />}
                    </div>
                    <DialogTitle className="text-xl font-black font-headline tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-sm font-medium">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-800">
                            <span className="text-2xl font-black text-primary leading-none">{stats.totalVisits}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Visites</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-800">
                            <span className="text-2xl font-black text-primary leading-none">
                                {period === 'month' ? stats.averagePerWeek : stats.averagePerMonth}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {period === 'month' ? 'Par semaine' : 'Par mois'}
                            </span>
                        </div>
                    </div>

                    {/* Breakdown by category */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span>Répartition</span>
                            <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                        </h4>
                        <div className="space-y-1.5">
                            {Object.entries(stats.byCategory)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cat, count]) => {
                                    const config = CATEGORY_CONFIG[cat] || { icon: Clock, color: 'text-slate-600' };
                                    const Icon = config.icon;
                                    const percentage = Math.round((count / stats.totalVisits) * 100);

                                    return (
                                        <div key={cat} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("p-1 rounded-md", config.bg || 'bg-slate-100')}>
                                                    <Icon className={cn("h-3 w-3", config.color)} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-primary">{count}</span>
                                                <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
