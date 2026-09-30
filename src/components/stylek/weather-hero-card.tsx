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
  Check, 
  SlidersHorizontal,
  Shirt,
  Loader2,
  Compass
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
  const [isCached, setIsCached] = useState(false);
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

    if (cached) {
      setCurrentRecommendation(cached.recommendation);
      setVariationIndex(cached.variationIndex || 0);
      setIsCached(true);
      // Auto-apply cached outfit
      onApplyOutfit(cached.recommendation.outfit, {
        weatherLabel: `${activeDayWeather.tempMax}°C · ${activeDayWeather.weatherLabel}`,
        occasion: cached.recommendation.occasion,
      });
    } else {
      // Build fresh recommendation
      const fresh = buildStylistRecommendation({
        weather: activeDayWeather,
        gender,
        wardrobe,
        variationIndex: 0,
      });
      setCurrentRecommendation(fresh);
      setVariationIndex(0);
      setIsCached(true);

      // Save in cache
      const payload: CachedDailyOutfit = {
        targetDate,
        dayMode: selectedDay,
        gender,
        recommendation: fresh,
        savedAt: Date.now(),
        variationIndex: 0,
      };
      saveCachedDailyOutfit(targetDate, gender, payload);

      // Auto-apply initial outfit
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
    setIsCached(true);

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

  // Weather icon component helper
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

  const isTomorrow = selectedDay === 'tomorrow';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card/95 to-primary/5 p-5 sm:p-6 shadow-sm backdrop-blur-md transition-all">
      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      {/* Top Header: City & Day Switcher */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {activeDayWeather.cityName}, Tunisie
              </span>
              <span className="text-xs text-muted-foreground font-normal">·</span>
              <span className="text-xs text-muted-foreground font-normal">
                {activeDayWeather.formattedDate}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Stylek Météo-Styliste Personnel
            </p>
          </div>
        </div>

        {/* Day Switcher Toggle */}
        <div className="flex items-center self-start sm:self-auto bg-muted/60 p-1 rounded-xl border border-border/40">
          <button
            type="button"
            onClick={() => setSelectedDay('today')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5',
              selectedDay === 'today'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Aujourd'hui {forecast?.today.tempMax ? `(${forecast.today.tempMax}°)` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDay('tomorrow')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5',
              selectedDay === 'tomorrow'
                ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Demain {forecast?.tomorrow.tempMax ? `(${forecast.tomorrow.tempMax}°)` : ''} ✨</span>
          </button>
        </div>
      </div>

      {/* Main Weather & Stylist Section */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 pt-4 items-center">
        {/* Left Column: Weather Glance */}
        <div className="md:col-span-5 flex flex-col justify-center space-y-2">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-secondary/80 border border-border/50 shadow-xs flex items-center justify-center">
              {renderWeatherIcon(activeDayWeather.weatherIconType, 'h-9 w-9')}
            </div>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-headline text-foreground">
                  {activeDayWeather.tempMax}°C
                </span>
                <span className="text-xs text-muted-foreground">
                  min {activeDayWeather.tempMin}°C
                </span>
              </div>
              <p className="text-sm font-medium text-foreground capitalize">
                {activeDayWeather.weatherLabel}
              </p>
            </div>
          </div>

          {/* Micro weather indicators */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="bg-secondary/60 px-2 py-0.5 rounded-md border border-border/40">
              Ressenti {activeDayWeather.tempApparentMax}°C
            </span>
            {activeDayWeather.precipitationProbMax > 0 && (
              <span className={cn(
                'px-2 py-0.5 rounded-md border',
                activeDayWeather.precipitationProbMax >= 40 
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400' 
                  : 'bg-secondary/60 border-border/40'
              )}>
                💧 Pluie {activeDayWeather.precipitationProbMax}%
              </span>
            )}
            <span className="bg-secondary/60 px-2 py-0.5 rounded-md border border-border/40">
              💨 {activeDayWeather.windSpeedMax} km/h
            </span>
          </div>
        </div>

        {/* Right Column: Stylist Quote & Context Badges */}
        <div className="md:col-span-7 flex flex-col space-y-3">
          {/* Dynamic Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge 
              variant="outline" 
              className="bg-primary/10 text-primary border-primary/25 font-semibold text-[11px] px-2.5 py-0.5 rounded-full"
            >
              {currentRecommendation.dayPace === 'Semaine' ? '📅 Semaine : Posé Chic' : '🌴 Weekend : Décontracté & Sport'}
            </Badge>

            <Badge 
              variant="secondary" 
              className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
            >
              {currentRecommendation.thermalBracket === 'Frais' ? '🧥 15°C Frais · Layering' : `🌡️ ${currentRecommendation.thermalBracket}`}
            </Badge>

            <Badge 
              variant="outline" 
              className="text-[11px] px-2.5 py-0.5 rounded-full text-emerald-600 border-emerald-500/30 bg-emerald-500/10 dark:text-emerald-400 font-medium flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              <span>Tenue du jour prête</span>
            </Badge>
          </div>

          {/* Stylist Advice Quote */}
          <div className="rounded-xl bg-background/70 border border-border/60 p-3 text-xs sm:text-sm text-foreground/90 italic leading-relaxed shadow-2xs">
            <span className="font-semibold text-primary not-italic mr-1.5">💡 Conseil Styliste :</span>
            "{currentRecommendation.stylistAdvice}"
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 pt-4 mt-4 border-t border-border/50">
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

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shirt className="h-3.5 w-3.5 text-primary" />
          <span>Adapté pour : <strong className="text-foreground capitalize">{gender}</strong></span>
        </div>
      </div>
    </div>
  );
}
