import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import type { StylistRecommendationResult } from './stylist-rules';

export interface CachedDailyOutfit {
  targetDate: string; // YYYY-MM-DD
  dayMode: 'today' | 'tomorrow';
  gender?: 'Homme' | 'Femme';
  recommendation: StylistRecommendationResult;
  savedAt: number; // Timestamp
  variationIndex: number;
}

const CACHE_PREFIX = 'kolyoum_daily_outfit_';

/**
 * Builds cache key per date and gender
 */
function getCacheKey(targetDate: string, gender: string = 'all'): string {
  return `${CACHE_PREFIX}${targetDate}_${gender}`;
}

/**
 * Retrieves the cached outfit for a specific date and gender
 */
export function getCachedDailyOutfit(
  targetDate: string,
  gender: 'Homme' | 'Femme' = 'Homme'
): CachedDailyOutfit | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getCacheKey(targetDate, gender);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed: CachedDailyOutfit = JSON.parse(raw);
    // Ensure date matches
    if (parsed.targetDate === targetDate) {
      return parsed;
    }
  } catch (error) {
    console.warn('Erreur lecture cache outfit:', error);
  }
  return null;
}

/**
 * Saves or updates daily outfit in local cache
 */
export function saveCachedDailyOutfit(
  targetDate: string,
  gender: 'Homme' | 'Femme' = 'Homme',
  outfitData: CachedDailyOutfit
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCacheKey(targetDate, gender);
    localStorage.setItem(key, JSON.stringify(outfitData));
  } catch (error) {
    console.warn('Erreur sauvegarde cache outfit:', error);
  }
}

/**
 * Clears or invalidates the cached outfit for a given date
 */
export function clearCachedDailyOutfit(
  targetDate: string,
  gender: 'Homme' | 'Femme' = 'Homme'
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCacheKey(targetDate, gender);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Erreur suppression cache outfit:', error);
  }
}
