'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryFrequency } from '@/lib/khrouj-stats-utils';
import { Coffee, Sandwich, Pizza, Sun, Mountain, ShoppingBag, Clock, Calendar, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HabitFrequencyProps {
    frequencies: CategoryFrequency[];
    heatmap: number[]; // 0=Mon, 6=Sun
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

export function HabitFrequency({ frequencies, heatmap }: HabitFrequencyProps) {
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

                {/* Horizontal Weekly Heatmap at Footer */}
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Intensité semaine</span>
                        <div className="flex gap-1">
                            {heatmap.map((count, i) => (
                                <div key={i} className="flex flex-col items-center gap-1">
                                    <div
                                        className={cn(
                                            "w-4 h-4 rounded-[3px] transition-colors duration-300",
                                            count === 0 ? "bg-slate-100 dark:bg-slate-800/50" :
                                                count === 1 ? "bg-primary/20" :
                                                    count === 2 ? "bg-primary/50" :
                                                        "bg-primary"
                                        )}
                                    />
                                    <span className="text-[7px] font-bold text-slate-400 uppercase">{DAYS_SHORT[i].charAt(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
