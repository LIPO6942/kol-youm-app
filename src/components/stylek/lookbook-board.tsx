'use client';

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
  Glasses,
  Layers,
  Footprints,
  Sparkle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

  // Indice Lunettes de soleil : recommandé par temps ensoleillé ou clair sans forte pluie
  const isSunny = weather.weatherIconType === 'sun' || weather.weatherIconType === 'cloud-sun';
  const needsGlasses = isSunny && weather.precipitationProbMax < 40;

  return (
    <div className="space-y-4 max-w-3xl mx-auto w-full">
      {/* ========================================================================= */}
      {/* 1. HORS CADRE PHOTO (EN DESSUS) : "Ta tenue du jour" + Date & Lieu + Actions */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card/95 to-primary/10 p-3.5 sm:p-4 shadow-xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Gauche : Mention "Ta tenue du jour" + Lieu & Date (Hors photo) */}
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            {/* Mention "Ta tenue du jour" */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#182a44] dark:bg-[#0f1d30] text-white text-xs font-serif italic border border-white/20 shadow-sm">
              <Sparkle className="h-3.5 w-3.5 text-amber-300" />
              Ta tenue du jour
            </span>

            {/* Lieu et Date */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-background/80 border border-border/60 text-foreground text-xs font-medium shadow-2xs">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold">{weather.cityName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{weather.formattedDate}</span>
            </div>
          </div>

          {/* Droite : Switcher Jour, Autre inspiration, Personnaliser */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {/* Day Switcher */}
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
                <Calendar className="h-3 w-3" />
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
                <Sparkles className="h-3 w-3" />
                <span>Demain ✨</span>
              </button>
            </div>

            {/* Bouton Autre inspiration */}
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

            {/* Bouton Personnaliser */}
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

      {/* ========================================================================= */}
      {/* 2. LA PHOTO DU LOOK EN PLEIN CADRE (100% VISIBLE, AUCUNE BANNIÈRE EN BAS) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-secondary/80 shadow-2xl aspect-[3/4] sm:aspect-[4/5] md:aspect-[3/4] w-full flex flex-col justify-start group">
        
        {/* Full-bleed Model Photo */}
        <div className="absolute inset-0 z-0">
          <GeneratedOutfitImage
            description={`${recommendation.outfit.haut}, ${recommendation.outfit.bas}, ${recommendation.outfit.chaussures}`}
            gender={gender}
            category="model"
            objectFit="cover"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
          />

          {/* Dégradé supérieur léger pour la lisibilité de la météo */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        </div>

        {/* ÉLÉMENTS MÉTÉO INCRUSTÉS EN HAUT À DROITE DE LA PHOTO */}
        <div className="relative z-10 p-3.5 sm:p-5 flex justify-end">
          <div className="flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-xl">
            {/* Icône météo */}
            <div className="p-1 rounded-lg bg-white/10 flex items-center justify-center">
              {renderWeatherIcon(weather.weatherIconType, 'h-5 w-5')}
            </div>

            {/* Température & Condition */}
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight font-headline text-white leading-none">
                  {weather.tempMax}°C
                </span>
                <span className="text-[11px] text-white/80 font-medium capitalize">
                  {weather.weatherLabel}
                </span>
              </div>
              <span className="text-[9.5px] text-white/60 leading-none mt-0.5">
                Ressenti {weather.tempApparentMax}°C · Min {weather.tempMin}°C
              </span>
            </div>

            {/* Séparateur discret */}
            <div className="h-6 w-px bg-white/20 mx-0.5" />

            {/* % de pluie & INDICES PARAPLUIE & LUNETTES */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-blue-200">
                💧 {weather.precipitationProbMax}%
              </span>

              {/* Indice Parapluie : parapluie si nécessaire, sinon parapluie barré */}
              {reflexes?.umbrella.needed ? (
                <div 
                  className="p-1 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/30 shadow-xs flex items-center justify-center"
                  title={reflexes.umbrella.text}
                >
                  <Umbrella className="h-3.5 w-3.5 text-blue-300" />
                </div>
              ) : (
                <div 
                  className="p-1 rounded-md bg-white/15 text-white/60 border border-white/20 shadow-xs relative flex items-center justify-center"
                  title="Temps sec : pas besoin de parapluie"
                >
                  <Umbrella className="h-3.5 w-3.5 text-white/50" />
                  {/* Barre diagonale barrant le parapluie */}
                  <span className="absolute w-4 h-[1.5px] bg-rose-400/90 -rotate-45 rounded-full pointer-events-none" />
                </div>
              )}

              {/* Indice Lunettes : lunettes de soleil si ensoleillé, sinon lunettes barrées */}
              {needsGlasses ? (
                <div 
                  className="p-1 rounded-md bg-amber-500/25 text-amber-200 border border-amber-400/30 shadow-xs flex items-center justify-center"
                  title="Soleil / luminosité : lunettes de soleil conseillées"
                >
                  <Glasses className="h-3.5 w-3.5 text-amber-300" />
                </div>
              ) : (
                <div 
                  className="p-1 rounded-md bg-white/15 text-white/60 border border-white/20 shadow-xs relative flex items-center justify-center"
                  title="Ciel couvert ou pluie : pas besoin de lunettes de soleil"
                >
                  <Glasses className="h-3.5 w-3.5 text-white/50" />
                  {/* Barre diagonale barrant les lunettes */}
                  <span className="absolute w-4 h-[1.5px] bg-rose-400/90 -rotate-45 rounded-full pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. EN DESSOUS DE LA PHOTO : LES PIÈCES EN FORMAT 2×2                      */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-primary/20 bg-card p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-border/40">
          <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5 uppercase">
            <Shirt className="h-3.5 w-3.5 text-primary" />
            Les pièces de la tenue (Format 2×2)
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            Packshots studio
          </span>
        </div>

        {/* GRILLE 2×2 PARFAITE EN DESSOUS DE LA PHOTO */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          
          {/* CASE 1 : HAUT */}
          <div className="group rounded-2xl bg-muted/40 hover:bg-muted/60 border border-border/60 p-2.5 sm:p-3 flex flex-col items-center justify-between transition-all shadow-2xs">
            <div className="relative w-full aspect-square max-w-[140px] rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-border/50 shadow-xs">
              {recommendation.packshots?.[0] && (
                <GeneratedOutfitImage
                  description={recommendation.packshots[0].query}
                  gender={gender}
                  category="haut"
                  objectFit="contain"
                />
              )}
            </div>
            <div className="mt-2 text-center w-full">
              <span className="text-[11px] font-bold text-foreground block truncate">
                {recommendation.packshots?.[0]?.label || 'Haut'}
              </span>
              <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Haut
              </span>
            </div>
          </div>

          {/* CASE 2 : BAS */}
          <div className="group rounded-2xl bg-muted/40 hover:bg-muted/60 border border-border/60 p-2.5 sm:p-3 flex flex-col items-center justify-between transition-all shadow-2xs">
            <div className="relative w-full aspect-square max-w-[140px] rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-border/50 shadow-xs">
              {recommendation.packshots?.[1] && (
                <GeneratedOutfitImage
                  description={recommendation.packshots[1].query}
                  gender={gender}
                  category="bas"
                  objectFit="contain"
                />
              )}
            </div>
            <div className="mt-2 text-center w-full">
              <span className="text-[11px] font-bold text-foreground block truncate">
                {recommendation.packshots?.[1]?.label || 'Bas'}
              </span>
              <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Bas
              </span>
            </div>
          </div>

          {/* CASE 3 : CHAUSSURES */}
          <div className="group rounded-2xl bg-muted/40 hover:bg-muted/60 border border-border/60 p-2.5 sm:p-3 flex flex-col items-center justify-between transition-all shadow-2xs">
            <div className="relative w-full aspect-square max-w-[140px] rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-border/50 shadow-xs">
              {recommendation.packshots?.[2] && (
                <GeneratedOutfitImage
                  description={recommendation.packshots[2].query}
                  gender={gender}
                  category="chaussures"
                  objectFit="contain"
                />
              )}
            </div>
            <div className="mt-2 text-center w-full">
              <span className="text-[11px] font-bold text-foreground block truncate">
                {recommendation.packshots?.[2]?.label || 'Chaussures'}
              </span>
              <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Chaussures
              </span>
            </div>
          </div>

          {/* CASE 4 : ACCESSOIRES (SANS CODES COULEURS) */}
          <div className="group rounded-2xl bg-muted/40 hover:bg-muted/60 border border-border/60 p-2.5 sm:p-3 flex flex-col items-center justify-between transition-all shadow-2xs">
            <div className="relative w-full aspect-square max-w-[140px] rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-border/50 shadow-xs">
              {recommendation.packshots?.[3] && (
                <GeneratedOutfitImage
                  description={recommendation.packshots[3].query}
                  gender={gender}
                  category="accessoires"
                  objectFit="contain"
                />
              )}
            </div>
            <div className="mt-2 text-center w-full">
              <span className="text-[11px] font-bold text-foreground block truncate">
                {recommendation.packshots?.[3]?.label || 'Accessoires'}
              </span>
              <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Accessoires
              </span>
            </div>
          </div>

        </div>

        {/* 4. BLOC RÉFLEXES PRATIQUES DU JOUR (VESTE, CHAUSSURES, PARFUM) */}
        {reflexes && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
            {/* Veste & Couches */}
            <div className="p-2 rounded-xl bg-muted/30 border border-border/40 flex items-start space-x-2">
              <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9.5px] uppercase font-bold text-muted-foreground block leading-none mb-0.5">Veste & Couches</span>
                <span className="text-[10.5px] text-foreground/90 leading-tight block">
                  {reflexes.layering}
                </span>
              </div>
            </div>

            {/* Chaussures & Sol */}
            <div className="p-2 rounded-xl bg-muted/30 border border-border/40 flex items-start space-x-2">
              <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Footprints className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9.5px] uppercase font-bold text-muted-foreground block leading-none mb-0.5">Sol & Chaussures</span>
                <span className="text-[10.5px] text-foreground/90 leading-tight block">
                  {reflexes.shoesAlert}
                </span>
              </div>
            </div>

            {/* Parfum */}
            <div className="p-2 rounded-xl bg-muted/30 border border-border/40 flex items-start space-x-2">
              <div className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9.5px] uppercase font-bold text-purple-600 dark:text-purple-400 block leading-none mb-0.5">Parfum</span>
                <span className="text-[10.5px] italic text-muted-foreground leading-tight block">
                  {reflexes.fragranceNotes}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
