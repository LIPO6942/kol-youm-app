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

    if (cached) {
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

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/5 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all space-y-4">
      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      {/* Top Header: Location & Day Switcher */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {activeDayWeather.cityName}, Tunisie
            </span>
            <span className="text-xs text-muted-foreground font-normal">·</span>
            <span className="text-xs text-muted-foreground font-normal">
              {activeDayWeather.formattedDate}
            </span>
          </div>
        </div>

        {/* Day Switcher Toggle */}
        <div className="flex items-center self-start sm:self-auto bg-muted/60 p-1 rounded-xl border border-border/40">
          <button
            type="button"
            onClick={() => setSelectedDay('today')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5',
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
              'px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5',
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

      {/* Main Section: Visual Miniature of Outfit (Left) + Weather & Stylist Advice (Right) */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-stretch gap-4 sm:gap-5 pt-1">
        {/* VISUAL MINIATURE OF THE OUTFIT */}
        <div className="relative w-28 sm:w-32 aspect-[3/4] shrink-0 rounded-xl overflow-hidden border border-border/70 shadow-xs bg-secondary/60 flex items-center justify-center">
          <GeneratedOutfitImage 
            description={currentRecommendation.outfit.suggestionText} 
            gender={gender} 
          />
          <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] text-center font-medium">
            Miniature du look
          </div>
        </div>

        {/* Weather & Advice Block */}
        <div className="flex-1 flex flex-col justify-between space-y-2.5 w-full">
          {/* Weather Header + Pace Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-secondary/80 border border-border/50 shadow-xs flex items-center justify-center">
                {renderWeatherIcon(activeDayWeather.weatherIconType, 'h-7 w-7')}
              </div>
              <div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline text-foreground">
                    {activeDayWeather.tempMax}°C
                  </span>
                  <span className="text-xs text-muted-foreground">
                    min {activeDayWeather.tempMin}°C
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground capitalize">
                  {activeDayWeather.weatherLabel} · Ressenti {activeDayWeather.tempApparentMax}°C
                </p>
              </div>
            </div>

            {/* Essential Context Badges */}
            <div className="flex items-center gap-1.5">
              <Badge 
                variant="outline" 
                className="bg-primary/10 text-primary border-primary/25 font-semibold text-[11px] px-2.5 py-0.5 rounded-full"
              >
                {currentRecommendation.dayPace === 'Semaine' ? '📅 Semaine : Posé Chic' : '🌴 Weekend : Décontracté & Sport'}
              </Badge>

              {activeDayWeather.precipitationProbMax > 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full',
                    activeDayWeather.precipitationProbMax >= 40 
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400 font-medium' 
                      : 'bg-secondary/60 text-muted-foreground border-border/40'
                  )}
                >
                  💧 {activeDayWeather.precipitationProbMax}%
                </Badge>
              )}
            </div>
          </div>

          {/* Lifestyle & Climate Reflexes (Parapluie, Veste, Chaussures, Parfum) */}
          {currentRecommendation.lifestyleReflexes && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs pt-0.5">
              <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center space-x-2 shadow-2xs">
                <span className="text-sm shrink-0">
                  {currentRecommendation.lifestyleReflexes.umbrella.needed ? '🌂' : '☀️'}
                </span>
                <span className={cn(
                  'font-medium text-xs leading-tight',
                  currentRecommendation.lifestyleReflexes.umbrella.needed ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-foreground/90'
                )}>
                  {currentRecommendation.lifestyleReflexes.umbrella.text}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center space-x-2 shadow-2xs">
                <span className="text-sm shrink-0">🧥</span>
                <span className="font-medium text-xs text-foreground/90 leading-tight">
                  {currentRecommendation.lifestyleReflexes.layering}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center space-x-2 shadow-2xs">
                <span className="text-sm shrink-0">👞</span>
                <span className="font-medium text-xs text-foreground/90 leading-tight">
                  {currentRecommendation.lifestyleReflexes.shoesAlert}
                </span>
              </div>

              {/* Sillage de parfum en petits caractères */}
              <div className="p-2 rounded-xl bg-background/60 border border-border/50 flex items-center space-x-2 shadow-2xs">
                <span className="text-sm shrink-0">✨</span>
                <div className="leading-tight">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary mr-1">Sillage</span>
                  <span className="text-[10.5px] italic text-muted-foreground">
                    {currentRecommendation.lifestyleReflexes.fragranceNotes}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stylist Advice Quote */}
          <div className="rounded-xl bg-background/70 border border-border/60 p-2.5 text-xs text-foreground/90 italic leading-snug shadow-2xs">
            <span className="font-semibold text-primary not-italic mr-1.5">💡 Conseil Styliste :</span>
            "{currentRecommendation.stylistAdvice}"
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
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
      </div>
    </div>
  );
}
