
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryStat } from '@/lib/khrouj-stats-utils';
import { 
    Globe, 
    ArrowRight, 
    AlertTriangle, 
    UtensilsCrossed, 
    Pizza, 
    Burger, 
    Fish, 
    Soup, 
    Coffee, 
    Flame, 
    Star, 
    Award, 
    Crown,
    Compass,
    MapPin,
    ChevronRight,
    Languages
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CulinaryPassportProps {
    stats: CategoryStat[];
}

const COLORS = ['#f97316', '#eab308', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981'];

const CUISINE_ICONS: Record<string, any> = {
    'Tunisien': UtensilsCrossed,
    'Italien': Pizza,
    'Américain': Burger,
    'Oriental': Flame,
    'Japonaise': Fish,
    'Chinoise': Soup,
    'Français': Coffee,
    'Mexicain': Globe,
    'Thaïlandaise': Leaf,
};

// Fallback for icons
function Leaf(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

export function CulinaryPassport({ stats }: CulinaryPassportProps) {
    const [activeCategory, setActiveCategory] = useState<CategoryStat | null>(null);

    // Explorer Rank Logic
    const getExplorerRank = (count: number) => {
        if (count >= 8) return { label: "Légende Gastronomique", icon: Crown, color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" };
        if (count >= 5) return { label: "Maître du Monde", icon: Globe, color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-200" };
        if (count >= 3) return { label: "Explorateur Gourmand", icon: Compass, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" };
        return { label: "Novice Culinaire", icon: MapPin, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" };
    };

    const rank = getExplorerRank(stats.length);
    const chartData = stats.filter(s => s.percentage > 0);
    const missingInsight = stats.slice(0, 5).find(s => s.daysSinceLastVisit > 10);

    if (stats.length === 0) return null;

    return (
        <>
            <Card className="border-orange-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm group hover:shadow-md transition-all duration-500">
                <CardHeader className="pb-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-b border-orange-100/50 dark:border-slate-800/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                <Languages className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter flex items-center gap-2">
                                    Passeport Culinaire
                                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border-current font-black uppercase tracking-widest", rank.color, rank.bg)}>
                                        Visa Actif
                                    </Badge>
                                </CardTitle>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <rank.icon className={cn("h-3 w-3", rank.color)} />
                                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", rank.color)}>
                                        {rank.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-2xl font-black text-orange-600 leading-none">{stats.length}</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Pays Explorés</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Summary Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b border-orange-100/50 dark:border-slate-800/50">
                        <div className="p-4 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-white to-orange-50/30 dark:from-slate-950 dark:to-slate-900/30">
                            <div className="h-40 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={8}
                                            dataKey="count"
                                            onClick={(data, index) => setActiveCategory(chartData[index])}
                                            cursor="pointer"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={COLORS[index % COLORS.length]} 
                                                    className="stroke-white dark:stroke-slate-900 stroke-2 outline-none" 
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-xl border text-[10px] font-black uppercase tracking-tight">
                                                            <p className="mb-0.5 text-primary">{data.category}</p>
                                                            <p className="text-muted-foreground">{data.count} visites ({data.percentage}%)</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">{chartData.length}</p>
                                    <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-wider">Cuisines</p>
                                </div>
                            </div>
                            {missingInsight && (
                                <div className="mt-2 px-3 py-1 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-full flex items-center gap-2 animate-pulse">
                                    <AlertTriangle className="h-3 w-3 text-red-500" />
                                    <span className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter">
                                        Nostalgie : {missingInsight.category} ({missingInsight.daysSinceLastVisit}j)
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white/30 dark:bg-slate-900/30">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Tampons de Voyage</p>
                            <div className="space-y-3">
                                {stats.slice(0, 4).map((s, idx) => {
                                    const Icon = CUISINE_ICONS[s.category] || UtensilsCrossed;
                                    return (
                                        <div 
                                            key={s.category} 
                                            className="group/item flex items-center justify-between cursor-pointer hover:translate-x-1 transition-transform"
                                            onClick={() => setActiveCategory(s)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-lg flex items-center justify-center border transition-all",
                                                    idx === 0 ? "bg-orange-100 border-orange-200 text-orange-600 shadow-sm" : "bg-slate-50 border-slate-100 text-slate-400"
                                                )}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 tracking-tight">{s.category}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-orange-500" 
                                                                style={{ width: `${s.percentage}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[8px] font-bold text-muted-foreground">{s.count}v</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-3 w-3 text-slate-300 group-hover/item:translate-x-1 transition-transform" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-orange-50/20 dark:bg-slate-950/20 flex items-center justify-between">
                        <div className="flex gap-1">
                            {stats.length > 4 && Array.from({ length: Math.min(5, stats.length - 4) }).map((_, i) => (
                                <div key={i} className="h-1.5 w-1.5 rounded-full bg-orange-200 dark:bg-slate-800" />
                            ))}
                        </div>
                        <button 
                            onClick={() => setActiveCategory(stats[0])}
                            className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                        >
                            Voir Collection <ArrowRight className="h-3 w-3" />
                        </button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!activeCategory} onOpenChange={(open) => !open && setActiveCategory(null)}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-8 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                            {(() => {
                                const Icon = CUISINE_ICONS[activeCategory?.category || ''] || UtensilsCrossed;
                                return <Icon className="h-32 w-32" />;
                            })()}
                        </div>
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                    <Award className="h-6 w-6 text-white" />
                                </div>
                                <DialogTitle className="text-3xl font-black font-headline tracking-tighter uppercase">
                                    TOP {activeCategory?.category}
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-orange-50 text-sm font-medium opacity-90 max-w-[250px]">
                                Vos escales culinaires préférées pour cette cuisine.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-4 bg-white dark:bg-slate-950">
                        {activeCategory?.topPlaces.map((place, idx) => (
                            <div 
                                key={place.name} 
                                className="group relative flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-orange-200 dark:hover:border-orange-500/30 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center font-black text-lg",
                                        idx === 0 ? "bg-amber-100 text-amber-600" :
                                        idx === 1 ? "bg-slate-100 text-slate-500" :
                                        idx === 2 ? "bg-orange-50 text-orange-600" :
                                        "bg-muted text-muted-foreground"
                                    )}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-slate-800 dark:text-slate-100 leading-tight tracking-tight uppercase">{place.name}</p>
                                        <div className="flex flex-col gap-0.5 mt-0.5">
                                            <div className="flex items-center gap-1">
                                                <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-bold text-muted-foreground">{place.count} escales</span>
                                            </div>
                                            {place.specialties.length > 0 && (
                                                <p className="text-[9px] text-orange-600/70 dark:text-orange-400/70 font-black italic uppercase tracking-tighter">
                                                    {place.specialties.join(' • ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {idx === 0 && (
                                    <div className="h-8 w-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20">
                                        <span className="text-sm">🏆</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t flex items-center justify-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Passeport KolYoum - Visa Validé</p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
