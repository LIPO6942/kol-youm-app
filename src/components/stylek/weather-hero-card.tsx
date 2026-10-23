'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import { LookbookBoard } from './lookbook-board';

interface WeatherHeroCardProps {
  gender?: 'Homme' | 'Femme';
  wardrobe?: WardrobeItem[];
  onApplyOutfit: (outfit: SuggestOutfitOutput, context: { weatherLabel: string; occasion: string }) => void;
  onScrollToForm?: () => void;
  isCustomFormOpen?: boolean;
}

export function WeatherHeroCard({
  gender = 'Homme',
  wardrobe = [],
  onApplyOutfit,
  onScrollToForm,
  isCustomFormOpen = false,
}: WeatherHeroCardProps) {
  const [forecast, setForecast] = useState<WeatherForecastResult | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
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

    // Schema v5 includes date-based daily rotation & rich accessory variety
    if (cached && cached.recommendation?.lifestyleReflexes && (cached as any).v === 5) {
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

      const payload: CachedDailyOutfit & { v?: number } = {
        targetDate,
        dayMode: selectedDay,
        gender,
        recommendation: fresh,
        savedAt: Date.now(),
        variationIndex: 0,
        v: 5,
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

    const payload: CachedDailyOutfit & { v?: number } = {
      targetDate: activeDayWeather.date,
      dayMode: selectedDay,
      gender,
      recommendation: fresh,
      savedAt: Date.now(),
      variationIndex: nextIndex,
      v: 5,
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

  if (loadingWeather && !forecast) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card/60 p-6 backdrop-blur-md shadow-sm flex items-center justify-center space-x-3 text-muted-foreground animate-pulse">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm font-medium">Composition de votre Lookbook Météo...</span>
      </div>
    );
  }

  if (!activeDayWeather || !currentRecommendation) {
    return null;
  }

  return (
    <LookbookBoard
      weather={activeDayWeather}
      gender={gender}
      recommendation={currentRecommendation}
      selectedDay={selectedDay}
      onSelectDay={setSelectedDay}
      onRegenerate={handleRegenerateVariation}
      isRegenerating={isGeneratingVariation}
      onToggleCustomForm={onScrollToForm}
      isCustomFormOpen={isCustomFormOpen}
    />
  );
}
