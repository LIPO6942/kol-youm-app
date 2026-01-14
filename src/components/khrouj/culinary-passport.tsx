
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryStat } from '@/lib/khrouj-stats-utils';
import { Globe, ArrowRight, AlertTriangle, UtensilsCrossed } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface CulinaryPassportProps {
    stats: CategoryStat[];
}

const COLORS = ['#f97316', '#eab308', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

export function CulinaryPassport({ stats }: CulinaryPassportProps) {
    const [activeCategory, setActiveCategory] = useState<CategoryStat | null>(null);

    // Filter out tiny categories for the chart to look good
    const chartData = stats.filter(s => s.percentage > 0);

    // Find a category to highlight for "Missing Insight"
    // E.g., a top 5 category not visited in > 30 days
    const missingInsight = stats.slice(0, 5).find(s => s.daysSinceLastVisit > 30);

    if (stats.length === 0) return null;

    return (
        <>
            <Card className="border-orange-100 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all duration-500 bg-gradient-to-br from-orange-50/50 to-white dark:from-slate-900 dark:to-slate-900/50">
                <CardHeader className="pb-0">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                            <Globe className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Passeport Culinaire
                            </CardTitle>
                            {missingInsight && (
                                <p className="text-[10px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 animate-pulse mt-0.5">
                                    🔥 {missingInsight.daysSinceLastVisit} jours sans {missingInsight.category} !
                                </p>
                            )}
                            <div className="flex gap-2 mt-1">
                                {stats.slice(0, 3).map(s => (
                                    <span key={s.category} className="text-[10px] font-medium bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">
                                        {s.percentage}% {s.category}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-2">
                    <div className="h-[180px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={5}
                                    dataKey="count"
                                    onClick={(data, index) => setActiveCategory(chartData[index])}
                                    cursor="pointer"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-white dark:stroke-slate-900 stroke-2" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl border text-xs font-bold">
                                                    <p className="mb-1">{data.category}</p>
                                                    <p className="text-muted-foreground">{data.count} visites ({data.percentage}%)</p>
                                                    <p className="text-[10px] text-primary mt-1">Cliquer pour voir le Top 3</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{stats.length}</p>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Cuisines</p>
                        </div>
                    </div>

                    {/* Insight Banner */}

                </CardContent>
            </Card>

            <Dialog open={!!activeCategory} onOpenChange={(open) => !open && setActiveCategory(null)}>
                <DialogContent className="sm:max-w-xs rounded-3xl">
                    <DialogHeader className="text-center">
                        <div className="mx-auto h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                        </div>
                        <DialogTitle className="text-xl font-black font-headline tracking-tighter uppercase">
                            Top {activeCategory?.category}
                        </DialogTitle>
                        <DialogDescription>
                            Vos adresses préférées pour cette cuisine.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-4">
                        {activeCategory?.topPlaces.map((place, idx) => (
                            <div key={place.name} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-transparent hover:border-primary/20 hover:bg-white transition-all">
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-2xl text-slate-200">#{idx + 1}</span>
                                    <div>
                                        <p className="font-bold text-sm leading-tight">{place.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{place.count} fois</p>
                                    </div>
                                </div>
                                {idx === 0 && <span className="text-lg">🏆</span>}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
