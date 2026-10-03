'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryStat } from '@/lib/khrouj-stats-utils';
import { 
    Globe, 
    ArrowRight,
    ArrowLeft,
    UtensilsCrossed, 
    Pizza, 
    Beef, 
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
    X,
    Sparkles,
    Plane,
    Check
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CulinaryPassportProps {
    stats: CategoryStat[];
}

const COLORS = ['#f97316', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#06b6d4', '#10b981', '#f43f5e'];

const CUISINE_ICONS: Record<string, any> = {
    'Tunisien': UtensilsCrossed,
    'Italien': Pizza,
    'Américain': Beef,
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

// Fallback icon for botanical/thai
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
  );
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
    const flag = CUISINE_FLAGS[s.category] || '🍽️';
    const color = COLORS[currentIdx % COLORS.length];
    const isFirst = currentIdx === 0;
    const isLast = currentIdx === stats.length - 1;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full sm:max-w-md flex flex-col overflow-hidden rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl bg-card border border-border/80 max-h-[92dvh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header with gradient & passport badge */}
                <div
                    className="relative flex flex-col items-center justify-center pt-8 pb-7 px-6 text-white transition-colors duration-500 select-none overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${color}ee, ${color}aa)` }}
                    ref={containerRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                >
                    {/* Background travel stamp watermark */}
                    <div className="absolute -right-6 -bottom-6 opacity-15 rotate-12 pointer-events-none">
                        <Globe className="h-44 w-44" />
                    </div>

                    {/* Close button */}
                    <button
                        className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors shadow-sm"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4 text-white" />
                    </button>

                    {/* Drag handle pill */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 h-1 w-12 rounded-full bg-white/40" />

                    {/* Index counter */}
                    <div className="absolute top-4 left-4 text-[10px] font-black text-white/80 uppercase tracking-widest bg-black/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                        {currentIdx + 1} / {stats.length}
                    </div>

                    {/* Big flag */}
                    <div
                        className="text-6xl mb-3 mt-3 drop-shadow-md transition-all duration-300 transform hover:scale-105"
                        style={{ transform: `translateX(${dragOffset * 0.05}px)` }}
                    >
                        {flag}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-white text-center drop-shadow-sm">
                        {s.category}
                    </h2>

                    <div className="flex items-center gap-2 mt-2.5">
                        <Badge className="bg-white/25 hover:bg-white/25 text-white border-white/30 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm px-2.5 py-0.5">
                            {s.count} {s.count > 1 ? 'escales' : 'escale'}
                        </Badge>
                        <Badge className="bg-white/25 hover:bg-white/25 text-white border-white/30 text-[10px] font-black uppercase tracking-wider backdrop-blur-sm px-2.5 py-0.5">
                            {s.percentage}% du carnet
                        </Badge>
                    </div>

                    {/* Swipe hint on first open */}
                    {stats.length > 1 && (
                        <p className="mt-3 text-[9px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                            <span>←</span> Glisser pour feuilleter <span>→</span>
                        </p>
                    )}
                </div>

                {/* Content: top places */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {s.topPlaces.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3 text-primary" /> Vos Adresses Préférées
                                </p>
                                <span className="text-[10px] font-bold text-primary">{s.topPlaces.length} spot{s.topPlaces.length > 1 ? 's' : ''}</span>
                            </div>
                            {s.topPlaces.map((place, idx) => (
                                <div
                                    key={place.name}
                                    className="flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/60 dark:bg-card rounded-2xl border border-border/60 hover:border-primary/30 transition-all shadow-xs"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center font-black text-base shrink-0 shadow-xs",
                                            idx === 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" :
                                            idx === 1 ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
                                            "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300"
                                        )}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-foreground truncate">
                                                {place.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500 shrink-0" />
                                                <span className="text-[10px] font-semibold text-muted-foreground">{place.count} {place.count > 1 ? 'escales' : 'escale'}</span>
                                            </div>
                                            {place.specialties.length > 0 && (
                                                <p className="text-[9px] text-primary font-bold italic truncate mt-0.5">
                                                    {place.specialties.join(' • ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {idx === 0 && (
                                        <Award className="h-5 w-5 text-amber-500 shrink-0 ml-2" />
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mb-2" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aucune adresse enregistrée</p>
                        </div>
                    )}
                </div>

                {/* Footer navigation */}
                <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                    <button
                        onClick={() => goTo(currentIdx - 1)}
                        disabled={isFirst}
                        aria-label="Cuisine précédente"
                        className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center border transition-all",
                            isFirst
                                ? "border-border/40 text-muted-foreground/30 cursor-not-allowed"
                                : "border-border text-foreground hover:bg-muted active:scale-95 shadow-xs"
                        )}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>

                    {/* Dot indicators */}
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] px-1 py-1">
                        {stats.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                aria-label={`Aller à la page ${i + 1}`}
                                className={cn(
                                    "rounded-full transition-all duration-300 shrink-0",
                                    i === currentIdx
                                        ? "h-2 w-6 bg-primary"
                                        : "h-2 w-2 bg-muted-foreground/20 hover:bg-primary/50"
                                )}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => goTo(currentIdx + 1)}
                        disabled={isLast}
                        aria-label="Cuisine suivante"
                        className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center border transition-all",
                            isLast
                                ? "border-border/40 text-muted-foreground/30 cursor-not-allowed"
                                : "border-border text-foreground hover:bg-muted active:scale-95 shadow-xs"
                        )}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Culinary Passport Component ──────────────────────────────────────────
export function CulinaryPassport({ stats }: CulinaryPassportProps) {
    const [activeCategory, setActiveCategory] = useState<CategoryStat | null>(null);
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);

    const getExplorerRank = (count: number) => {
        if (count >= 8) return { label: "Légende Gastronomique", icon: Crown, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" };
        if (count >= 5) return { label: "Maître du Monde", icon: Globe, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" };
        if (count >= 3) return { label: "Explorateur Gourmand", icon: Compass, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" };
        return { label: "Novice Culinaire", icon: MapPin, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" };
    };

    const rank = getExplorerRank(stats.length);
    const chartData = stats.filter(s => s.percentage > 0);
    const missingInsight = stats.slice(0, 5).find(s => s.daysSinceLastVisit > 10);

    if (stats.length === 0) return null;

    return (
        <>
            <Card className="border border-border/70 bg-card/85 backdrop-blur-xl shadow-md hover:shadow-xl transition-all duration-500 rounded-3xl overflow-hidden group">
                {/* Modern Boarding Passport Header */}
                <CardHeader className="pb-4 pt-5 px-5 sm:px-6 bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent border-b border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                            {/* Passport Stamp Emblem */}
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-white shadow-md shadow-primary/25 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300 shrink-0">
                                <Compass className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base sm:text-lg font-black tracking-tight uppercase text-foreground">
                                        Passeport Culinaire
                                    </CardTitle>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Visa Actif
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border", rank.bg, rank.color)}>
                                        <rank.icon className="h-3 w-3" />
                                        <span>{rank.label}</span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">•</span>
                                    <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                                        {stats.length} culture{stats.length > 1 ? 's' : ''} explorée{stats.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Quick action button in header */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                            <span className="text-[11px] text-muted-foreground font-medium sm:hidden">
                                {stats.length} culture{stats.length > 1 ? 's' : ''} explorée{stats.length > 1 ? 's' : ''}
                            </span>
                            <button
                                onClick={() => setIsCollectionOpen(true)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 text-primary transition-all active:scale-95 border border-primary/20"
                            >
                                <Plane className="h-3.5 w-3.5" />
                                <span>Voir Collection</span>
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {/* Modern 2-Column Split */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
                        {/* Left: Interactive Gastronomy Donut */}
                        <div className="p-5 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-card to-muted/20">
                            <div className="h-44 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={48}
                                            outerRadius={70}
                                            paddingAngle={6}
                                            dataKey="count"
                                            onClick={(data, index) => setActiveCategory(chartData[index])}
                                            cursor="pointer"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={COLORS[index % COLORS.length]} 
                                                    className="stroke-card stroke-2 outline-none transition-transform hover:opacity-90" 
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-popover text-popover-foreground p-2.5 rounded-xl shadow-xl border border-border text-xs font-bold">
                                                            <p className="text-primary font-black uppercase tracking-wider">{data.category}</p>
                                                            <p className="text-muted-foreground mt-0.5">{data.count} escale{data.count > 1 ? 's' : ''} ({data.percentage}%)</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <p className="text-2xl font-black text-foreground tracking-tight leading-none">{chartData.length}</p>
                                    <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Cuisines</p>
                                </div>
                            </div>

                            {/* Nostalgia callout or discovery badge */}
                            {missingInsight ? (
                                <div 
                                    onClick={() => setActiveCategory(missingInsight)}
                                    className="mt-3 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-amber-500/15 transition-all text-left max-w-full"
                                >
                                    <span className="text-sm">✈️</span>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 truncate">
                                            Envie d'évasion : <span className="underline">{missingInsight.category}</span>
                                        </p>
                                        <p className="text-[9px] text-muted-foreground">Pas goûté depuis {missingInsight.daysSinceLastVisit} jours</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="h-3 w-3 text-primary" /> Vos escales du monde en un coup d'œil
                                </p>
                            )}
                        </div>

                        {/* Right: Modern Travel Stamps Grid */}
                        <div className="p-5 flex flex-col justify-between space-y-3 bg-card">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                    <Award className="h-3.5 w-3.5 text-primary" /> Tampons d'Escales
                                </p>
                                <span className="text-[10px] font-bold text-muted-foreground">Top découvertes</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {stats.slice(0, 4).map((s, idx) => {
                                    const flag = CUISINE_FLAGS[s.category] || '🍽️';
                                    const color = COLORS[idx % COLORS.length];
                                    return (
                                        <div 
                                            key={s.category} 
                                            className="group/item p-2.5 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-primary/40 cursor-pointer transition-all duration-300 shadow-xs flex flex-col justify-between gap-2"
                                            onClick={() => setActiveCategory(s)}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-xl shrink-0 drop-shadow-xs">{flag}</span>
                                                    <span className="text-xs font-bold text-foreground truncate">{s.category}</span>
                                                </div>
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover/item:translate-x-0.5 group-hover/item:text-primary transition-all shrink-0" />
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                                    <span>{s.count} {s.count > 1 ? 'visites' : 'visite'}</span>
                                                    <span style={{ color }}>{s.percentage}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full transition-all duration-700" 
                                                        style={{ 
                                                            width: `${s.percentage}%`,
                                                            backgroundColor: color
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Quick open all stamps */}
                            <div className="pt-2 flex items-center justify-between border-t border-border/40">
                                <div className="flex items-center gap-1">
                                    {stats.map((_, i) => (
                                        <div 
                                            key={i} 
                                            className={cn(
                                                "h-1.5 rounded-full transition-all",
                                                i < 4 ? "w-3 bg-primary" : "w-1.5 bg-muted-foreground/30"
                                            )} 
                                        />
                                    ))}
                                </div>
                                <button 
                                    onClick={() => setIsCollectionOpen(true)}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-1.5 transition-all outline-none"
                                >
                                    Feuilleter tout ({stats.length}) <ArrowRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active Category Detail Dialog (from pie/stamp click) */}
            <Dialog open={!!activeCategory} onOpenChange={(open) => !open && setActiveCategory(null)}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border border-border shadow-2xl bg-card">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-primary via-orange-500 to-amber-500 p-7 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-15 rotate-12 pointer-events-none">
                            <span className="text-9xl">{CUISINE_FLAGS[activeCategory?.category || ''] || '🍽️'}</span>
                        </div>
                        <DialogHeader className="relative z-10 text-left">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-3xl drop-shadow-sm">{CUISINE_FLAGS[activeCategory?.category || ''] || '🍽️'}</span>
                                <DialogTitle className="text-2xl sm:text-3xl font-black font-headline tracking-tight uppercase text-white">
                                    TOP {activeCategory?.category}
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-white/90 text-xs sm:text-sm font-medium">
                                Vos meilleures escales pour savourer la cuisine {activeCategory?.category}.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Places List */}
                    <div className="p-5 space-y-3 bg-card max-h-[55vh] overflow-y-auto">
                        {activeCategory?.topPlaces && activeCategory.topPlaces.length > 0 ? (
                            activeCategory.topPlaces.map((place, idx) => (
                                <div 
                                    key={place.name} 
                                    className="group relative flex items-center justify-between p-3.5 bg-muted/30 hover:bg-muted/60 rounded-2xl border border-border/60 hover:border-primary/30 transition-all duration-300 shadow-xs"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center font-black text-base shrink-0 shadow-xs",
                                            idx === 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300" :
                                            idx === 1 ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
                                            idx === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300" :
                                            "bg-muted text-muted-foreground"
                                        )}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-foreground truncate">{place.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500 shrink-0" />
                                                <span className="text-[10px] font-semibold text-muted-foreground">{place.count} {place.count > 1 ? 'escales' : 'escale'}</span>
                                            </div>
                                            {place.specialties.length > 0 && (
                                                <p className="text-[9px] text-primary font-bold italic truncate mt-0.5">
                                                    {place.specialties.join(' • ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {idx === 0 && (
                                        <Award className="h-5 w-5 text-amber-500 shrink-0 ml-2" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-muted-foreground text-xs font-medium">
                                Aucune adresse répertoriée pour cette catégorie.
                            </div>
                        )}
                    </div>
                    
                    {/* Visa stamp footer */}
                    <div className="p-3.5 bg-muted/20 border-t border-border/60 flex items-center justify-center gap-1.5">
                        <Check className="h-3 w-3 text-emerald-500" />
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Passeport KolYoum • Visa Validé</p>
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
