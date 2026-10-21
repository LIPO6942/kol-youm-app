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
        return <Sun className={cn('text-amber-400', className)} />;
      case 'cloud-sun':
        return <CloudSun className={cn('text-amber-300', className)} />;
      case 'cloud':
        return <Cloud className={cn('text-slate-300', className)} />;
      case 'rain':
        return <CloudRain className={cn('text-blue-300', className)} />;
      case 'snow':
        return <Snowflake className={cn('text-sky-200', className)} />;
      case 'storm':
        return <Wind className={cn('text-purple-300', className)} />;
      default:
        return <CloudSun className={cn('text-amber-300', className)} />;
    }
  };

  const reflexes = recommendation.lifestyleReflexes;

  // Extract short summary for main outfit
  const mainTop = recommendation.packshots?.[0]?.label || 'Haut chic';
  const mainBottom = recommendation.packshots?.[1]?.label || 'Bas assorti';
  const mainBadgeLabel = `${mainTop} + ${mainBottom.toLowerCase()}`;

  return (
    <div className="space-y-4">
      {/* HERO MAGAZINE CARD: Full Photo with Weather HUD & 2x2 Floating Pieces */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-secondary/80 shadow-2xl min-h-[640px] sm:min-h-[700px] lg:min-h-[760px] flex flex-col justify-between group">
        
        {/* 1. BACKGROUND FULL-BLEED MODEL PHOTO */}
        <div className="absolute inset-0 z-0">
          <GeneratedOutfitImage
            description={`${recommendation.outfit.haut}, ${recommendation.outfit.bas}, ${recommendation.outfit.chaussures}`}
            gender={gender}
            category="model"
            objectFit="cover"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
          />

          {/* Cinematic lighting gradients to ensure all overlay texts & badges are crystal clear */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/65 pointer-events-none" />
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-transparent to-black/40 pointer-events-none" />
        </div>

        {/* 2. TOP WEATHER & LOCATION HUD (GLASSMORPHIC OVERLAY ON PHOTO) */}
        <div className="relative z-10 p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Top-Left: Location, Date & Day Pace */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Title Badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-serif italic border border-white/20 shadow-lg">
              <Sparkle className="h-3.5 w-3.5 text-amber-300" />
              Ta tenue du jour
            </span>

            {/* City & Date Glass Pill */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white/90 text-xs font-medium shadow-md">
              <MapPin className="h-3 w-3 text-primary" />
              <span>{weather.cityName}</span>
              <span className="text-white/40">·</span>
              <span>{weather.formattedDate}</span>
            </div>

            <Badge 
              variant="outline" 
              className="bg-black/50 backdrop-blur-md text-white border-white/20 text-[10px] px-2.5 py-0.5 rounded-full font-semibold shadow-md"
            >
              {recommendation.dayPace === 'Semaine' ? '📅 Semaine : Posé Chic' : '🌴 Weekend : Décontracté'}
            </Badge>
          </div>

          {/* Top-Right: Weather Condition & Temperature Glass Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-xl">
              <div className="p-1 rounded-lg bg-white/10 flex items-center justify-center">
                {renderWeatherIcon(weather.weatherIconType, 'h-4 w-4')}
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline space-x-1">
                  <span className="text-base sm:text-lg font-black tracking-tight font-headline text-white leading-none">
                    {weather.tempMax}°C
                  </span>
                  <span className="text-[10px] text-white/70 font-medium capitalize">
                    {weather.weatherLabel}
                  </span>
                </div>
                <span className="text-[9.5px] text-white/60 leading-none">
                  Ressenti {weather.tempApparentMax}°C · Min {weather.tempMin}°C
                </span>
              </div>
            </div>

            {weather.precipitationProbMax >= 20 && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-500/30 backdrop-blur-md text-blue-200 font-semibold border border-blue-400/30 shadow-md">
                💧 {weather.precipitationProbMax}% pluie
              </span>
            )}
          </div>
        </div>

        {/* 3. MIDDLE AREA: FLOATING 2x2 GRID OF GARMENT PIECES OVER THE PHOTO */}
        <div className="relative z-10 px-3.5 sm:px-5 flex flex-col lg:flex-row items-end justify-between gap-4 my-auto">
          {/* Left spacer / lifestyle reflexes badge (desktop) */}
          <div className="hidden lg:flex flex-col space-y-2 max-w-xs self-center">
            {reflexes && (
              <div className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 p-3.5 text-white space-y-2 shadow-2xl">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-300" />
                  Réflexes du jour
                </span>
                <div className="space-y-1.5 text-[11px] text-white/90">
                  <p className="flex items-start gap-1.5 leading-snug">
                    <span className="shrink-0">{reflexes.umbrella.needed ? '🌂' : '☀️'}</span>
                    <span className={reflexes.umbrella.needed ? 'text-blue-300 font-semibold' : ''}>
                      {reflexes.umbrella.text}
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5 leading-snug">
                    <span className="shrink-0">🧥</span>
                    <span>{reflexes.layering}</span>
                  </p>
                  <p className="flex items-start gap-1.5 leading-snug">
                    <span className="shrink-0">👞</span>
                    <span>{reflexes.shoesAlert}</span>
                  </p>
                  <p className="flex items-start gap-1.5 leading-snug text-[10.5px] italic text-white/80">
                    <span className="shrink-0">✨</span>
                    <span>{reflexes.fragranceNotes}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: FLOATING 2x2 PIECES GRID */}
          <div className="w-full sm:w-auto max-w-[320px] rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-1">
                <Shirt className="h-3 w-3 text-primary" />
                Les pièces de la tenue
              </span>
              <span className="text-[9px] text-white/60 font-medium">Format 2×2</span>
            </div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Case 1: Haut */}
              <div className="flex flex-col items-center bg-white/95 dark:bg-slate-900/95 rounded-xl p-1.5 border border-white/30 shadow-md transition-transform hover:scale-102">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white">
                  {recommendation.packshots?.[0] && (
                    <GeneratedOutfitImage
                      description={recommendation.packshots[0].query}
                      gender={gender}
                      category="haut"
                      objectFit="contain"
                    />
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 mt-1 text-center line-clamp-1 max-w-[110px]">
                  {recommendation.packshots?.[0]?.label || 'Haut'}
                </span>
                <span className="text-[8.5px] uppercase font-semibold text-slate-500 tracking-wider">Haut</span>
              </div>

              {/* Case 2: Bas */}
              <div className="flex flex-col items-center bg-white/95 dark:bg-slate-900/95 rounded-xl p-1.5 border border-white/30 shadow-md transition-transform hover:scale-102">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white">
                  {recommendation.packshots?.[1] && (
                    <GeneratedOutfitImage
                      description={recommendation.packshots[1].query}
                      gender={gender}
                      category="bas"
                      objectFit="contain"
                    />
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 mt-1 text-center line-clamp-1 max-w-[110px]">
                  {recommendation.packshots?.[1]?.label || 'Bas'}
                </span>
                <span className="text-[8.5px] uppercase font-semibold text-slate-500 tracking-wider">Bas</span>
              </div>

              {/* Case 3: Chaussures */}
              <div className="flex flex-col items-center bg-white/95 dark:bg-slate-900/95 rounded-xl p-1.5 border border-white/30 shadow-md transition-transform hover:scale-102">
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white">
                  {recommendation.packshots?.[2] && (
                    <GeneratedOutfitImage
                      description={recommendation.packshots[2].query}
                      gender={gender}
                      category="chaussures"
                      objectFit="contain"
                    />
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 mt-1 text-center line-clamp-1 max-w-[110px]">
                  {recommendation.packshots?.[2]?.label || 'Chaussures'}
                </span>
                <span className="text-[8.5px] uppercase font-semibold text-slate-500 tracking-wider">Chaussures</span>
              </div>

              {/* Case 4: Accessoires + Palette de couleurs */}
              <div className="flex flex-col justify-between items-center bg-black/60 dark:bg-black/80 rounded-xl p-2 border border-white/20 shadow-md text-white text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 block">
                  Couleurs & Détails
                </span>

                {/* Palette 4 pastilles */}
                <div className="flex items-center justify-center gap-1.5 my-1">
                  {recommendation.colorPalette?.map((color, i) => (
                    <div
                      key={i}
                      className="relative group/swatch cursor-pointer"
                      onMouseEnter={() => setActiveTooltip(color.name)}
                      onMouseLeave={() => setActiveTooltip(null)}
                    >
                      <div
                        className="w-5 h-5 rounded-full border border-white/30 shadow-xs transition-transform hover:scale-115 ring-1 ring-white/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      {activeTooltip === color.name && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded bg-black/90 text-white text-[8px] font-medium whitespace-nowrap shadow-md z-30 pointer-events-none">
                          {color.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Accessoire text snippet */}
                <span className="text-[9.5px] text-white/85 line-clamp-2 leading-tight">
                  {recommendation.outfit.accessoires.split('+')[0].trim()}
                </span>
                <span className="text-[8px] uppercase font-semibold text-white/50 tracking-wider mt-0.5">Accessoires</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. BOTTOM OVERLAY: LOOK TITLE, QUOTE & ACTIONS */}
        <div className="relative z-10 p-3.5 sm:p-5 space-y-2.5">
          <div className="rounded-2xl bg-black/65 backdrop-blur-md p-3 sm:p-4 text-white border border-white/15 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-white capitalize truncate">
                  {mainBadgeLabel}
                </h3>
                <span className="text-white/40 hidden sm:inline">·</span>
                <span className="text-xs text-amber-300/90 italic font-serif hidden sm:inline">
                  "{recommendation.signatureQuote || 'Simple, élégant, efficace.'}"
                </span>
              </div>
              <p className="text-xs text-white/80 line-clamp-2 font-light">
                {recommendation.outfit.suggestionText.replace(/^Look\s+.*?:/i, '').trim()}
              </p>
            </div>

            {/* Bottom Actions: Day Switcher, Autre inspiration, Personnaliser */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              {/* Day Switcher */}
              <div className="flex items-center bg-white/10 p-0.5 rounded-xl border border-white/15">
                <button
                  type="button"
                  onClick={() => onSelectDay('today')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1',
                    selectedDay === 'today'
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-white/80 hover:text-white'
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  <span>Aujourd'hui</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectDay('tomorrow')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1',
                    selectedDay === 'tomorrow'
                      ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                      : 'text-white/80 hover:text-white'
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Demain ✨</span>
                </button>
              </div>

              {/* Autre inspiration */}
              <Button
                size="sm"
                variant="outline"
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="text-xs h-8 bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
              >
                <RotateCcw className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')} />
                <span className="hidden sm:inline">Autre inspiration</span>
              </Button>

              {/* Personnaliser */}
              {onToggleCustomForm && (
                <Button
                  size="sm"
                  variant={isCustomFormOpen ? "secondary" : "ghost"}
                  onClick={onToggleCustomForm}
                  className="text-xs h-8 text-white/90 hover:text-white hover:bg-white/15 gap-1.5"
                  title="Personnaliser une occasion spécifique"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Personnaliser</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
