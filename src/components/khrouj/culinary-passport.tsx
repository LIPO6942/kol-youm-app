
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryStat } from '@/lib/khrouj-stats-utils';
import { 
    Globe, 
    ArrowRight,
    ArrowLeft,
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
    Languages,
    X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CulinaryPassportProps {
    stats: CategoryStat[];
}

const COLORS = ['#f97316', '#eab308', '#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#14b8a6', '#f43f5e'];

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

const CUISINE_FLAGS: Record<string, string> = {
    'Tunisien': '🇹🇳',
    'Italien': '🇮🇹',
    'Américain': '🇺🇸',
    'Oriental': '🌙',
    'Japonaise': '🇯🇵',
    'Chinoise': '🇨🇳',
    'Français': '🇫🇷',
    'Mexicain': '🇲🇽',
    'Thaïlandaise': '🇹🇭',
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

// ── Swipeable Carousel Collection ──────────────────────────────────────────────
function CollectionCarousel({ stats, open, onClose }: { stats: CategoryStat[], open: boolean, onClose: () => void }) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const goTo = useCallback((idx: number) => {
        setCurrentIdx(Math.max(0, Math.min(idx, stats.length - 1)));
        setDragOffset(0);
    }, [stats.length]);

    const handlePointerDown = (e: React.PointerEvent) => {
        startX.current = e.clientX;
        setIsDragging(false);
        containerRef.current?.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        if (Math.abs(dx) > 5) setIsDragging(true);
        setDragOffset(dx);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        const threshold = 60;

        if (dx < -threshold && currentIdx < stats.length - 1) {
            goTo(currentIdx + 1);
        } else if (dx > threshold && currentIdx > 0) {
            goTo(currentIdx - 1);
        } else {
            setDragOffset(0);
        }
        startX.current = null;
        setTimeout(() => setIsDragging(false), 50);
    };

    if (!open || stats.length === 0) return null;

    const s = stats[currentIdx];
    const Icon = CUISINE_ICONS[s.category] || UtensilsCrossed;
    const flag = CUISINE_FLAGS[s.category] || '🍽️';
    const color = COLORS[currentIdx % COLORS.length];
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === stats.length - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full sm:max-w-md flex flex-col overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl bg-white dark:bg-slate-950 max-h-[92dvh]">

                {/* Header with gradient */}
                <div
                    className="relative flex flex-col items-center justify-center pt-8 pb-6 px-6 text-white transition-colors duration-500 select-none"
                    style={{ background: `linear-gradient(135deg, ${color}dd, ${color}88)` }}
                    ref={containerRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    {/* Close button */}
                    <button
                        className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4 text-white" />
                    </button>

                    {/* Drag handle pill */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-white/30" />

                    {/* Index counter */}
                    <div className="absolute top-4 left-4 text-[10px] font-black text-white/70 uppercase tracking-widest">
                        {currentIdx + 1} / {stats.length}
                    </div>

                    {/* Big flag / icon */}
                    <div
                        className="text-6xl mb-3 mt-2 drop-shadow-lg transition-all duration-300"
                        style={{ transform: `translateX(${dragOffset * 0.05}px)` }}
                    >
                        {flag}
                    </div>

                    <h2 className="text-3xl font-black tracking-tighter uppercase text-white text-center">
                        {s.category}
                    </h2>

                    <div className="flex items-center gap-3 mt-2">
                        <Badge className="bg-white/20 text-white border-white/30 text-[9px] font-black uppercase tracking-widest backdrop-blur-sm">
                            {s.count} escales
                        </Badge>
                        <Badge className="bg-white/20 text-white border-white/30 text-[9px] font-black uppercase tracking-widest backdrop-blur-sm">
                            {s.percentage}% de ta cuisine
                        </Badge>
                    </div>

                    {/* Swipe hint on first open */}
                    {stats.length > 1 && (
                        <p className="mt-3 text-[9px] font-bold text-white/50 uppercase tracking-widest">
                            ← Swipe pour naviguer →
                        </p>
                    )}
                </div>

                {/* Content: top places */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {s.topPlaces.length > 0 ? (
                        <>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tes Adresses Préférées</p>
                            {s.topPlaces.map((place, idx) => (
                                <div
                                    key={place.name}
                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-transparent hover:border-orange-200 dark:hover:border-orange-500/20 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0",
                                            idx === 0 ? "bg-amber-100 text-amber-600" :
                                            idx === 1 ? "bg-slate-200 text-slate-500" :
                                            "bg-orange-50 text-orange-400"
                                        )}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <div>
                                            <p className="font-black text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-tight">
                                                {place.name}
                                            </p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-bold text-muted-foreground">{place.count} escales</span>
                                            </div>
                                            {place.specialties.length > 0 && (
                                                <p className="text-[9px] text-orange-600/70 dark:text-orange-400/70 font-black italic uppercase tracking-tighter mt-0.5">
                                                    {place.specialties.join(' • ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {idx === 0 && (
                                        <Award className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <UtensilsCrossed className="h-10 w-10 text-slate-200 dark:text-slate-700 mb-3" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Aucune escale enregistrée</p>
                        </div>
                    )}
                </div>

                {/* Footer navigation */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t flex items-center justify-between gap-2">
                    <button
                        onClick={() => goTo(currentIdx - 1)}
                        disabled={isFirst}
                        className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border transition-all",
                            isFirst
                                ? "border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                : "border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 active:scale-95"
                        )}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>

                    {/* Dot indicators */}
                    <div className="flex items-center gap-1.5">
                        {stats.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                className={cn(
                                    "rounded-full transition-all duration-300",
                                    i === currentIdx
                                        ? "h-2 w-5 bg-orange-500"
                                        : "h-2 w-2 bg-slate-200 dark:bg-slate-700 hover:bg-orange-300"
                                )}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => goTo(currentIdx + 1)}
                        disabled={isLast}
                        className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center border transition-all",
                            isLast
                                ? "border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                : "border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 active:scale-95"
                        )}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export function CulinaryPassport({ stats }: CulinaryPassportProps) {
    const [activeCategory, setActiveCategory] = useState<CategoryStat | null>(null);
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);

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
                            onClick={() => setIsCollectionOpen(true)}
                            className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all outline-none"
                        >
                            Voir Collection <ArrowRight className="h-3 w-3" />
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Active Category Detail Dialog (from pie/stamp click) */}
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

            {/* Swipeable Collection Carousel */}
            <CollectionCarousel
                stats={stats}
                open={isCollectionOpen}
                onClose={() => setIsCollectionOpen(false)}
            />
        </>
    );
}
