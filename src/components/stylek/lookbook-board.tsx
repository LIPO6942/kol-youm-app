'use client';

import { useState } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  Snowflake, 
  Wind, 
  Sparkles, 
  RotateCcw, 
  MapPin, 
  Calendar, 
  SlidersHorizontal,
  Shirt,
  Umbrella,
  Layers,
  Footprints,
  Sparkle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DayWeather } from '@/lib/weather/open-meteo';
import type { StylistRecommendationResult } from '@/lib/stylek/stylist-rules';
import { GeneratedOutfitImage } from './generated-outfit-image';

interface LookbookBoardProps {
  weather: DayWeather;
  gender?: 'Homme' | 'Femme';
  recommendation: StylistRecommendationResult;
  selectedDay: 'today' | 'tomorrow';
  onSelectDay: (day: 'today' | 'tomorrow') => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onToggleCustomForm?: () => void;
  isCustomFormOpen?: boolean;
}

export function LookbookBoard({
  weather,
  gender = 'Homme',
  recommendation,
  selectedDay,
  onSelectDay,
  onRegenerate,
  isRegenerating,
  onToggleCustomForm,
  isCustomFormOpen,
}: LookbookBoardProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const renderWeatherIcon = (iconType: DayWeather['weatherIconType'], className: string) => {
    switch (iconType) {
      case 'sun':
        return <Sun className={cn('text-amber-500', className)} />;
      case 'cloud-sun':
        return <CloudSun className={cn('text-amber-400', className)} />;
      case 'cloud':
        return <Cloud className={cn('text-slate-400', className)} />;
      case 'rain':
        return <CloudRain className={cn('text-blue-400', className)} />;
      case 'snow':
        return <Snowflake className={cn('text-sky-300', className)} />;
      case 'storm':
        return <Wind className={cn('text-purple-400', className)} />;
      default:
        return <CloudSun className={cn('text-amber-400', className)} />;
    }
  };

  const reflexes = recommendation.lifestyleReflexes;

  // Extract short summary for main outfit
  const mainTop = recommendation.packshots?.[0]?.label || 'Haut chic';
  const mainBottom = recommendation.packshots?.[1]?.label || 'Bas assorti';
  const mainBadgeLabel = `${mainTop} + ${mainBottom.toLowerCase()}`;

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & WEATHER BAR */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card/95 to-primary/10 p-3.5 sm:p-4 shadow-xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Location & Weather Details */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
            <div className="flex items-center space-x-1.5 text-xs text-muted-foreground font-medium shrink-0">
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                <MapPin className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {weather.cityName}
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {weather.formattedDate}
              </span>
            </div>

            <div className="flex items-center space-x-2 pl-2 border-l border-border/50 shrink-0">
              <div className="p-1 rounded-md bg-background border border-border/50 shadow-2xs flex items-center justify-center">
                {renderWeatherIcon(weather.weatherIconType, 'h-4 w-4')}
              </div>
              <span className="text-base sm:text-lg font-extrabold tracking-tight font-headline text-foreground">
                {weather.tempMax}°C
              </span>
              <span className="text-xs font-semibold text-foreground capitalize">
                {weather.weatherLabel}
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                · Ressenti {weather.tempApparentMax}°C (min {weather.tempMin}°C)
              </span>
            </div>

            <Badge 
              variant="outline" 
              className="bg-primary/10 text-primary border-primary/25 font-semibold text-[10px] px-2 py-0.5 rounded-full shrink-0"
            >
              {recommendation.dayPace === 'Semaine' ? '📅 Semaine : Posé Chic' : '🌴 Weekend : Décontracté'}
            </Badge>

            {weather.precipitationProbMax >= 20 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20 shrink-0">
                💧 Pluie {weather.precipitationProbMax}%
              </span>
            )}
          </div>

          {/* Right: Day Switcher & Actions */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border/40">
              <button
                type="button"
                onClick={() => onSelectDay('today')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5',
                  selectedDay === 'today'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Aujourd'hui</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectDay('tomorrow')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5',
                  selectedDay === 'tomorrow'
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Demain ✨</span>
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="text-xs h-8 border-border/70 hover:bg-secondary/70 gap-1.5"
            >
              <RotateCcw className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')} />
              <span className="hidden sm:inline">Autre inspiration</span>
            </Button>

            {onToggleCustomForm && (
              <Button
                size="sm"
                variant={isCustomFormOpen ? "secondary" : "ghost"}
                onClick={onToggleCustomForm}
                className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5"
                title="Personnaliser une occasion spécifique"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Personnaliser</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. THE EDITORIAL LOOKBOOK BOARD (3 COLUMNS) */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-b from-card/90 via-card to-background p-4 sm:p-6 shadow-md backdrop-blur-md">
        {/* Subtle ambient lighting */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          
          {/* ========================================================= */}
          {/* COLONNE GAUCHE (5 cols) : TA TENUE DU JOUR (LOOK PHARE)   */}
          {/* ========================================================= */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            {/* Top Brush Badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#182a44] dark:bg-[#0f1d30] text-white text-xs sm:text-sm font-serif italic tracking-wide shadow-md border border-white/20 -rotate-1 transform transition-transform hover:rotate-0">
                <Sparkle className="h-3.5 w-3.5 text-amber-300" />
                Ta tenue du jour
              </span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Look Principal
              </span>
            </div>

            {/* Main Outfit Photo Card */}
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-border/80 shadow-md bg-secondary/40 flex items-center justify-center group">
              <GeneratedOutfitImage
                description={`${recommendation.outfit.haut}, ${recommendation.outfit.bas}, ${recommendation.outfit.chaussures}`}
                gender={gender}
                category="model"
                objectFit="cover"
              />
              
              {/* Bottom chic label badge */}
              <div className="absolute inset-x-3 bottom-3 z-20">
                <div className="rounded-xl bg-black/70 backdrop-blur-md p-2.5 text-white border border-white/10 shadow-lg text-center space-y-0.5">
                  <p className="text-xs sm:text-sm font-semibold tracking-tight capitalize truncate">
                    {mainBadgeLabel}
                  </p>
                  <p className="text-[10px] text-white/80 line-clamp-1 italic font-light">
                    {recommendation.outfit.suggestionText.replace(/^Look\s+.*?:/i, '').trim()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLONNE CENTRE (2 cols) : LES PIÈCES CLÉS & PALETTE      */}
          {/* ========================================================= */}
          <div className="md:col-span-2 flex flex-col justify-between py-1 space-y-4">
            {/* 3 Packshots des pièces clés */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block text-center">
                Les pièces
              </span>

              {recommendation.packshots && recommendation.packshots.map((packshot, i) => (
                <div key={i} className="group flex flex-col items-center">
                  <div className="relative w-full aspect-square max-w-[110px] mx-auto rounded-xl bg-white dark:bg-slate-900 border border-border/70 shadow-xs overflow-hidden transition-all group-hover:scale-102 group-hover:shadow-sm">
                    <GeneratedOutfitImage
                      description={packshot.query}
                      gender={gender}
                      category={packshot.type}
                      objectFit="contain"
                    />
                  </div>
                  <span className="text-[10.5px] font-medium text-foreground/90 mt-1 text-center line-clamp-1 max-w-[120px]">
                    {packshot.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Palette "Les couleurs" */}
            <div className="pt-2 border-t border-border/50 text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                Les couleurs
              </span>
              <div className="flex items-center justify-center gap-2">
                {recommendation.colorPalette?.map((color, i) => (
                  <div
                    key={i}
                    className="relative group/swatch cursor-pointer"
                    onMouseEnter={() => setActiveTooltip(color.name)}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    <div
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-black/15 dark:border-white/20 shadow-xs transition-transform hover:scale-115 ring-2 ring-transparent hover:ring-primary/40"
                      style={{ backgroundColor: color.hex }}
                    />
                    {activeTooltip === color.name && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded-md bg-black/85 text-white text-[9px] font-medium whitespace-nowrap shadow-md z-30 pointer-events-none">
                        {color.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLONNE DROITE (5 cols) : ALTERNATIVE SIMPLE              */}
          {/* ========================================================= */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            {/* Top Brush Badge */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#182a44] dark:bg-[#0f1d30] text-white text-xs sm:text-sm font-serif italic tracking-wide shadow-md border border-white/20 rotate-1 transform transition-transform hover:rotate-0">
                <Sparkle className="h-3.5 w-3.5 text-sky-300" />
                Alternative simple
              </span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Variante Décontractée
              </span>
            </div>

            {/* Alternative Outfit Photo Card */}
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-border/80 shadow-md bg-secondary/40 flex items-center justify-center group">
              <GeneratedOutfitImage
                description={`${recommendation.alternativeOutfit.haut}, ${recommendation.alternativeOutfit.bas}, ${recommendation.alternativeOutfit.chaussures}`}
                gender={gender}
                category="model"
                objectFit="cover"
              />

              {/* Bottom chic label badge */}
              <div className="absolute inset-x-3 bottom-3 z-20">
                <div className="rounded-xl bg-black/70 backdrop-blur-md p-2.5 text-white border border-white/10 shadow-lg text-center space-y-0.5">
                  <p className="text-xs sm:text-sm font-semibold tracking-tight capitalize truncate">
                    {recommendation.alternativeLabel || 'Variante de la journée'}
                  </p>
                  <p className="text-[10px] text-white/80 line-clamp-1 italic font-light">
                    {recommendation.alternativeOutfit.suggestionText.replace(/^Alternative\s+.*?:/i, '').trim()}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. LIFESTYLE REFLEXES, ACCESSORIES & CHIC QUOTE */}
      <div className="rounded-2xl border border-primary/15 bg-card/70 p-4 sm:p-5 shadow-xs backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Réflexes Météo & Accessoires
          </span>
          <span className="text-[11px] text-muted-foreground italic font-serif">
            "{recommendation.signatureQuote || 'Simple, élégant, efficace.'}"
          </span>
        </div>

        {/* 4 Reflexes Cards */}
        {reflexes && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Parapluie */}
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/50 flex items-start space-x-2.5 shadow-2xs">
              <div className={cn(
                'p-1.5 rounded-lg shrink-0 mt-0.5',
                reflexes.umbrella.needed ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
              )}>
                <Umbrella className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Parapluie</span>
                <span className={cn(
                  'font-medium text-[11px] leading-snug block',
                  reflexes.umbrella.needed ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-foreground/90'
                )}>
                  {reflexes.umbrella.text}
                </span>
              </div>
            </div>

            {/* Veste & Couches */}
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/50 flex items-start space-x-2.5 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Veste & Couches</span>
                <span className="font-medium text-[11px] text-foreground/90 leading-snug block">
                  {reflexes.layering}
                </span>
              </div>
            </div>

            {/* Chaussures */}
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/50 flex items-start space-x-2.5 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Footprints className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Chaussures</span>
                <span className="font-medium text-[11px] text-foreground/90 leading-snug block">
                  {reflexes.shoesAlert}
                </span>
              </div>
            </div>

            {/* Parfum */}
            <div className="p-2.5 rounded-xl bg-background/80 border border-border/50 flex items-start space-x-2.5 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block mb-0.5">Parfum</span>
                <span className="text-[11px] italic text-muted-foreground leading-snug block">
                  {reflexes.fragranceNotes}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Accessoires & Stylist Advice Note */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/30 text-xs">
          <div className="flex items-center gap-2 text-foreground/90">
            <span className="font-semibold text-primary">🎒 Accessoires conseillés :</span>
            <span className="text-muted-foreground">{recommendation.outfit.accessoires}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-start sm:self-center">
            <Shirt className="h-3.5 w-3.5 text-primary" />
            <span>Profil : <strong className="text-foreground capitalize">{gender}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
