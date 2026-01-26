'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryFrequency, getAvailableYears, getStatsForPeriod, PeriodStats } from '@/lib/khrouj-stats-utils';
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
    selectedYear: number;
    onYearChange: (year: number) => void;
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
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTHS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export function HabitFrequency({ frequencies, heatmap, monthlyHeatmap, yearlyHeatmap, visits, selectedYear, onYearChange }: HabitFrequencyProps) {
    if (frequencies.length === 0) return null;

    const now = Date.now();
    const maxVisits = Math.max(...heatmap, 1);

    return (
        <Card className="max-w-xl border-slate-200/60 dark:border-slate-800/60 overflow-hidden bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-lg transition-all duration-500">
            <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800/50 flex flex-row items-center justify-between">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400 animate-pulse" />
                        <CardTitle className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            Rythme & Habitudes
                        </CardTitle>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Year Selector */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                        {getAvailableYears().map(y => (
                            <button
                                key={y}
                                onClick={() => onYearChange(y)}
                                className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[9px] font-black transition-all",
                                    selectedYear === y
                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                )}
                            >
                                {y}
                            </button>
                        ))}
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
                                        <div className="flex flex-col -mt-0.5">
                                            <span className="text-[7px] font-bold text-slate-400 uppercase leading-none">Tous les</span>
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

                    {/* Monthly Intensity (Main Dialog Trigger) */}
                    {monthlyHeatmap && (
                        <PeriodStatsDialog visits={visits || []} period="month" initialYear={selectedYear}>
                            <div className="flex items-center justify-between px-1 hover:bg-slate-50 dark:hover:bg-slate-900/50 p-1 rounded-lg transition-colors cursor-pointer group">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">Intensité mensuelle</span>
                                    <BarChart3 className="h-2 w-2 text-slate-300 group-hover:text-primary" />
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <div className="flex gap-0.5">
                                        {monthlyHeatmap.map((count: number, i: number) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "w-2.5 h-2.5 rounded-[1px] transition-colors duration-300",
                                                    count === 0 ? "bg-slate-100 dark:bg-slate-800/50" :
                                                        count >= 1 && count <= 3 ? "bg-primary/30" :
                                                            count > 3 && count <= 6 ? "bg-primary/60" :
                                                                "bg-primary"
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-px w-full justify-between pr-[1px]">
                                        {MONTHS_SHORT.map(m => (
                                            <span key={m} className="text-[5px] font-black text-slate-300 uppercase">{m.charAt(0)}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </PeriodStatsDialog>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function PeriodStatsDialog({ visits, period, children, initialYear }: { visits: VisitLog[], period: 'month' | 'year', children: React.ReactNode, initialYear?: number }) {
    const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = React.useState(initialYear || new Date().getFullYear());
    const stats = getStatsForPeriod(visits, period, period === 'month' ? selectedMonth : undefined, selectedYear);

    const title = period === 'month' ? `Statistiques de ${MONTHS_LONG[selectedMonth]} ${selectedYear}` : `Récapitulatif de l'Année ${selectedYear}`;
    const description = period === 'month'
        ? `Consultez le détail de vos sorties pour ${MONTHS_LONG[selectedMonth]} ${selectedYear}.`
        : `Votre activité sur l'ensemble de l'année ${selectedYear}.`;

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
                    <DialogDescription className="text-xs font-medium">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                {/* Year Selector */}
                <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 mb-2">
                    {getAvailableYears().map(y => (
                        <button
                            key={y}
                            onClick={() => setSelectedYear(y)}
                            className={cn(
                                "flex-1 py-1.5 rounded-lg text-xs font-black transition-all",
                                selectedYear === y
                                    ? "bg-white dark:bg-slate-800 text-primary shadow-sm scale-105"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            )}
                        >
                            {y}
                        </button>
                    ))}
                </div>

                {/* Month Selector Column (Inside Dialog) */}
                {period === 'month' && (
                    <div className="flex flex-wrap gap-1 justify-center py-2 border-b border-slate-100 dark:border-slate-800/50">
                        {MONTHS_SHORT.map((m, idx) => (
                            <button
                                key={m}
                                onClick={() => setSelectedMonth(idx)}
                                className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-black transition-all",
                                    selectedMonth === idx
                                        ? "bg-primary text-white shadow-sm scale-105"
                                        : "bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                )}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-4 pt-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-800">
                            <span className="text-2xl font-black text-primary leading-none">{stats.totalVisits}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Visites</span>
                            {stats.monthlyTrend !== undefined && stats.monthlyTrend.diff !== 0 && (
                                <div className={cn(
                                    "flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded-full text-[8px] font-black",
                                    stats.monthlyTrend.isIncrease ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                )}>
                                    <TrendingUp className={cn("h-2 w-2", !stats.monthlyTrend.isIncrease && "rotate-180")} />
                                    {stats.monthlyTrend.isIncrease ? '+' : '-'}{stats.monthlyTrend.value}% vs mois dernier
                                </div>
                            )}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-800">
                            <span className="text-lg font-black text-primary leading-none truncate w-full px-1">
                                {stats.favoriteDay || '--'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Jour de prédilection
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

                                    const avgDays = stats.averageDaysByCategory[cat] || 0;

                                    return (
                                        <div key={cat} className="space-y-1 group">
                                            <div className="flex items-center justify-between">
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
                                            {avgDays > 0 && (
                                                <div className="pl-7">
                                                    <p className="text-[9px] font-medium text-slate-400 italic">
                                                        Moyenne : <span className="text-primary font-bold lowercase">{cat}</span> tous les <span className="font-bold text-slate-600 dark:text-slate-300">{avgDays} jours</span>
                                                    </p>
                                                </div>
                                            )}
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
