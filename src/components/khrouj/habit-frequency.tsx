'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryFrequency } from '@/lib/khrouj-stats-utils';
import { Coffee, Sandwich, Pizza, Sun, Mountain, ShoppingBag, Clock, type LucideIcon } from 'lucide-react';

interface HabitFrequencyProps {
    frequencies: CategoryFrequency[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    'Café': Coffee,
    'Fast Food': Sandwich,
    'Restaurant': Pizza,
    'Brunch': Sun,
    'Balade': Mountain,
    'Shopping': ShoppingBag,
};

export function HabitFrequency({ frequencies }: HabitFrequencyProps) {
    if (frequencies.length === 0) return null;

    return (
        <Card className="border-indigo-100/50 dark:border-indigo-900/30 overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-xl dark:shadow-indigo-500/10 transition-all duration-500 group">
            <CardHeader className="pb-3 border-b border-indigo-50/50 dark:border-indigo-900/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <Clock className="h-5 w-5 animate-pulse" />
                    </div>
                    <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                        Régularité de vos habitudes
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-4 px-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {frequencies.map((f, idx) => {
                        const Icon = CATEGORY_ICONS[f.category] || Clock;
                        return (
                            <div
                                key={f.category}
                                className="group/item relative p-3 rounded-2xl border border-indigo-50/50 dark:border-indigo-900/10 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-50 to-white dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-sm group-hover/item:scale-110 group-hover/item:rotate-3 transition-transform duration-300 border border-indigo-100/20">
                                        <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{f.category}</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mr-0.5">Tous les</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                                                {f.averageDays}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                {f.averageDays === 1 ? 'jour' : 'jours'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    <span className="text-[10px]">🔄</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
