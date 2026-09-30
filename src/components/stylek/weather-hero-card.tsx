'use client';

import { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DayWeather, WeatherForecastResult } from '@/lib/weather/open-meteo';
import { getOpenMeteoForecast } from '@/lib/weather/open-meteo';
import { buildStylistRecommendation, type StylistRecommendationResult } from '@/lib/stylek/stylist-rules';
import { 
  getCachedDailyOutfit, 
  saveCachedDailyOutfit, 
  type CachedDailyOutfit 
} from '@/lib/stylek/daily-outfit-cache';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import type { WardrobeItem } from '@/lib/firebase/firestore';
import { GeneratedOutfitImage } from './generated-outfit-image';

interface WeatherHeroCardProps {
  gender?: 'Homme' | 'Femme';
  wardrobe?: WardrobeItem[];
  onApplyOutfit: (outfit: SuggestOutfitOutput, context: { weatherLabel: string; occasion: string }) => void;
  onScrollToForm?: () => void;
}

export function WeatherHeroCard({
  gender = 'Homme',
  wardrobe = [],
  onApplyOutfit,
  onScrollToForm,
}: WeatherHeroCardProps) {
  const [forecast, setForecast] = useState<WeatherForecastResult | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('tomorrow');
  const [currentRecommendation, setCurrentRecommendation] = useState<StylistRecommendationResult | null>(null);
  const [variationIndex, setVariationIndex] = useState(0);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);

  // Fetch weather forecast on mount
  useEffect(() => {
    let isMounted = true;
    async function loadForecast() {
      try {
        setLoadingWeather(true);
        const result = await getOpenMeteoForecast();
        if (isMounted) {
          setForecast(result);
          // By default: if it's evening (> 17h), focus on tomorrow, else today
          const currentHour = new Date().getHours();
          setSelectedDay(currentHour >= 17 ? 'tomorrow' : 'today');
        }
      } catch (err) {
        console.error('Erreur chargement météo Open-Meteo:', err);
      } finally {
        if (isMounted) setLoadingWeather(false);
      }
    }
    loadForecast();
    return () => {
      isMounted = false;
    };
  }, []);

  // Current active day data
  const activeDayWeather: DayWeather | null = forecast
    ? selectedDay === 'tomorrow'
      ? forecast.tomorrow
      : forecast.today
    : null;

  // Process and load recommendation when active day or gender changes
  useEffect(() => {
    if (!activeDayWeather) return;

    const targetDate = activeDayWeather.date;
    const cached = getCachedDailyOutfit(targetDate, gender);

    if (cached && cached.recommendation?.lifestyleReflexes) {
      setCurrentRecommendation(cached.recommendation);
      setVariationIndex(cached.variationIndex || 0);
      onApplyOutfit(cached.recommendation.outfit, {
        weatherLabel: `${activeDayWeather.tempMax}°C · ${activeDayWeather.weatherLabel}`,
        occasion: cached.recommendation.occasion,
      });
    } else {
      const fresh = buildStylistRecommendation({
        weather: activeDayWeather,
        gender,
        wardrobe,
        variationIndex: 0,
      });
      setCurrentRecommendation(fresh);
      setVariationIndex(0);

      const payload: CachedDailyOutfit = {
        targetDate,
        dayMode: selectedDay,
        gender,
        recommendation: fresh,
        savedAt: Date.now(),
        variationIndex: 0,
      };
      saveCachedDailyOutfit(targetDate, gender, payload);

      onApplyOutfit(fresh.outfit, {
        weatherLabel: `${activeDayWeather.tempMax}°C · ${activeDayWeather.weatherLabel}`,
        occasion: fresh.occasion,
      });
    }
  }, [activeDayWeather?.date, selectedDay, gender]);

  // Handle "Proposer une autre inspiration"
  const handleRegenerateVariation = () => {
    if (!activeDayWeather) return;

    setIsGeneratingVariation(true);
    const nextIndex = variationIndex + 1;
    const fresh = buildStylistRecommendation({
      weather: activeDayWeather,
      gender,
      wardrobe,
      variationIndex: nextIndex,
    });

    setVariationIndex(nextIndex);
    setCurrentRecommendation(fresh);

    const payload: CachedDailyOutfit = {
      targetDate: activeDayWeather.date,
      dayMode: selectedDay,
      gender,
      recommendation: fresh,
      savedAt: Date.now(),
      variationIndex: nextIndex,
    };
    saveCachedDailyOutfit(activeDayWeather.date, gender, payload);

    onApplyOutfit(fresh.outfit, {
      weatherLabel: `${activeDayWeather.tempMax}°C · ${activeDayWeather.weatherLabel}`,
      occasion: fresh.occasion,
    });

    setTimeout(() => {
      setIsGeneratingVariation(false);
    }, 250);
  };

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

  if (loadingWeather && !forecast) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card/60 p-6 backdrop-blur-md shadow-sm flex items-center justify-center space-x-3 text-muted-foreground animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium">Consultation des prévisions météo pour votre style...</span>
      </div>
    );
  }

  if (!activeDayWeather || !currentRecommendation) {
    return null;
  }

  // Guaranteed reflexes (with immediate fallback calculation if recommendation lacks it)
  const reflexes = currentRecommendation.lifestyleReflexes || (activeDayWeather ? buildStylistRecommendation({
    weather: activeDayWeather,
    gender,
    wardrobe,
    variationIndex
  }).lifestyleReflexes : null);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/5 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all space-y-3.5">
      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      {/* Top Bar (Single Line): Location, Temp & Weather Condition, Pace Badge & Day Switcher */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border/50">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0">
          {/* Location & Date */}
          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground font-medium shrink-0">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {activeDayWeather.cityName}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {activeDayWeather.formattedDate}
            </span>
          </div>

          {/* Unified Weather Data */}
          <div className="flex items-center space-x-2 pl-2 border-l border-border/50 shrink-0">
            <div className="p-1 rounded-md bg-background border border-border/50 shadow-2xs flex items-center justify-center">
              {renderWeatherIcon(activeDayWeather.weatherIconType, 'h-4 w-4')}
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight font-headline text-foreground">
              {activeDayWeather.tempMax}°C
            </span>
            <span className="text-xs font-semibold text-foreground capitalize">
              {activeDayWeather.weatherLabel}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              · Ressenti {activeDayWeather.tempApparentMax}°C (min {activeDayWeather.tempMin}°C)
            </span>
          </div>

          {/* Pace Badge */}
          <Badge 
            variant="outline" 
            className="bg-primary/10 text-primary border-primary/25 font-semibold text-[10.5px] px-2 py-0.5 rounded-full shrink-0"
          >
            {currentRecommendation.dayPace === 'Semaine' ? '📅 Semaine : Posé Chic' : '🌴 Weekend : Décontracté & Sport'}
          </Badge>
        </div>

        {/* Day Switcher Toggle: Clean, no duplicate temp */}
        <div className="flex items-center self-start sm:self-auto bg-muted/60 p-0.5 rounded-xl border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedDay('today')}
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
            onClick={() => setSelectedDay('tomorrow')}
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
      </div>

      {/* CORE SHOWCASE: Miniature du Look (Gauche) + Bloc « Réflexes Météo & Sillage » (Droite, Côte-à-Côte) */}
      <div className="relative z-10 flex flex-row items-stretch gap-3 sm:gap-4 pt-1">
        {/* 1. VISUAL MINIATURE OF THE OUTFIT */}
        <div className="relative w-24 sm:w-32 md:w-36 aspect-[3/4] shrink-0 rounded-2xl overflow-hidden border border-border/70 shadow-xs bg-secondary/60 flex items-center justify-center group">
          <GeneratedOutfitImage 
            description={currentRecommendation.outfit.suggestionText} 
            gender={gender} 
          />
          <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] text-center font-medium">
            Miniature du look
          </div>
        </div>

        {/* 2. LE BLOC « RÉFLEXES MÉTÉO & SILLAGE » DIRECTEMENT À CÔTÉ DE LA MINIATURE */}
        <div className="flex-1 flex flex-col justify-between min-w-0 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-border/40">
            <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Réflexes Météo & Sillage
            </span>
            {activeDayWeather.precipitationProbMax > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
                💧 Pluie {activeDayWeather.precipitationProbMax}%
              </span>
            )}
          </div>

          {reflexes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs flex-1">
              {/* Parapluie */}
              <div className="p-2 rounded-xl bg-background/70 border border-border/50 flex items-start space-x-2 shadow-2xs">
                <span className="text-base shrink-0 mt-0.5">
                  {reflexes.umbrella.needed ? '🌂' : '☀️'}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none mb-0.5">Parapluie</span>
                  <span className={cn(
                    'font-medium text-[11px] sm:text-xs leading-snug break-words block',
                    reflexes.umbrella.needed ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-foreground/90'
                  )}>
                    {reflexes.umbrella.text}
                  </span>
                </div>
              </div>

              {/* Superposition */}
              <div className="p-2 rounded-xl bg-background/70 border border-border/50 flex items-start space-x-2 shadow-2xs">
                <span className="text-base shrink-0 mt-0.5">🧥</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none mb-0.5">Veste & Couches</span>
                  <span className="font-medium text-[11px] sm:text-xs text-foreground/90 leading-snug break-words block">
                    {reflexes.layering}
                  </span>
                </div>
              </div>

              {/* Chaussures */}
              <div className="p-2 rounded-xl bg-background/70 border border-border/50 flex items-start space-x-2 shadow-2xs">
                <span className="text-base shrink-0 mt-0.5">👞</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block leading-none mb-0.5">Chaussures</span>
                  <span className="font-medium text-[11px] sm:text-xs text-foreground/90 leading-snug break-words block">
                    {reflexes.shoesAlert}
                  </span>
                </div>
              </div>

              {/* Sillage de parfum en petits caractères */}
              <div className="p-2 rounded-xl bg-background/70 border border-border/50 flex items-start space-x-2 shadow-2xs">
                <span className="text-base shrink-0 mt-0.5">✨</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary block leading-none mb-0.5">Sillage & Parfum</span>
                  <span className="text-[10.5px] sm:text-[11px] italic text-muted-foreground leading-snug break-words block">
                    {reflexes.fragranceNotes}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Stylist Advice Quote */}
      <div className="relative z-10 rounded-xl bg-background/80 border border-border/60 p-2.5 sm:p-3 text-xs text-foreground/90 italic leading-snug shadow-2xs">
        <span className="font-semibold text-primary not-italic mr-1.5">💡 Conseil Styliste :</span>
        "{currentRecommendation.stylistAdvice}"
      </div>

      {/* 4. Action Footer */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRegenerateVariation}
            disabled={isGeneratingVariation}
            variant="outline"
            className="text-xs h-8 border-border/70 hover:bg-secondary/70 transition-all gap-1.5"
          >
            <RotateCcw className={cn('h-3.5 w-3.5', isGeneratingVariation && 'animate-spin')} />
            <span>Autre inspiration</span>
          </Button>

          {onScrollToForm && (
            <Button
              size="sm"
              onClick={onScrollToForm}
              variant="ghost"
              className="text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Personnaliser l'activité</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shirt className="h-3.5 w-3.5 text-primary" />
          <span>Profil : <strong className="text-foreground capitalize">{gender}</strong></span>
        </div>
      </div>
    </div>
  );
}
