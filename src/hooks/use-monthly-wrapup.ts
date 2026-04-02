import { useMemo } from 'react';
import type { UserProfile, VisitLog, SeenMovie } from '@/lib/firebase/firestore';

export type WrapUpStats = {
  monthName: string;
  totalOutings: number;
  topCategory: { name: string; count: number; percentage: number } | null;
  topPlace: { name: string; count: number } | null;
  featuredMomentyImage: string | null;
  featuredMomentyDish: string | null;
  movies?: {
    total: number;
    posters: string[];
    featured: { title: string; poster: string } | null;
  };
  series?: {
    total: number;
    posters: string[];
    featured: { title: string; poster: string } | null;
  };
  totalMovies: number; // Sum of both for Persona
  userPersona: string;
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function getPersona(
  totalOutings: number,
  topCategoryName: string | null,
  totalMovies: number
): string {
  if (totalMovies > totalOutings + 5 && totalMovies > 10) return "Le Cinéphile Casanier 🍿";
  if (totalOutings > 15 && totalMovies < 5) return "L'Aventurier Insatiable 🚀";
  if (topCategoryName === "Brunch") return "Le Bruncher Fou 🥞";
  if (topCategoryName === "Fast Food") return "Le Fan de Comfort Food 🍔";
  if (topCategoryName === "Café") return "Le Pilier de Comptoir ☕";
  return "L'Épicurien Équilibré 🌟";
}

export function useMonthlyWrapUp(user: UserProfile | null, targetDate: Date): WrapUpStats | null {
  return useMemo(() => {
    if (!user) return null;

    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    // 1. Filter visits for the target month
    const monthlyVisits = (user.visits || []).filter((v: VisitLog) => {
      const d = new Date(v.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const totalOutings = monthlyVisits.length;

    // 2. Compute Top Category
    const categoryCounts: Record<string, number> = {};
    const placeCounts: Record<string, number> = {};
    let featuredMomentyImage: string | null = null;
    let featuredMomentyDish: string | null = null;

    monthlyVisits.forEach((v) => {
      // Category count
      const cat = v.category || 'Autre';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      
      // Place count
      const place = v.placeName;
      if (place) placeCounts[place] = (placeCounts[place] || 0) + 1;

      // Extract a featured image from Momenty if available
      if (!featuredMomentyImage && v.momentyImageUrl) {
        featuredMomentyImage = v.momentyImageUrl;
        featuredMomentyDish = v.orderedItem || "Découverte Gourmande";
      }
    });

    let topCategory: { name: string; count: number; percentage: number } | null = null;
    let maxCatCount = 0;
    Object.entries(categoryCounts).forEach(([name, count]) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        topCategory = { name, count, percentage: Math.round((count / totalOutings) * 100) };
      }
    });

    let topPlace: { name: string; count: number } | null = null;
    let maxPlaceCount = 0;
    Object.entries(placeCounts).forEach(([name, count]) => {
      if (count > maxPlaceCount) {
        maxPlaceCount = count;
        topPlace = { name, count };
      }
    });

    // 3. Tfarrej Stats (Separated Movies and Series)
    const filterByDate = (history: any[], dateField: string) => {
        return (history || []).filter((m: any) => {
            if (!m[dateField]) return false;
            const d = new Date(m[dateField]);
            return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });
    };

    const movieHistory = [
        ...filterByDate((user as any).seenMoviesData || [], 'viewedAt'),
        ...filterByDate((user as any).seenMovieHistory || [], 'addedAt')
    ];
    const seriesHistory = [
        ...filterByDate((user as any).seenSeriesData || [], 'viewedAt'),
        ...filterByDate((user as any).seenSeriesHistory || [], 'addedAt')
    ];

    const deduplicate = (list: any[]) => {
        const map = new Map();
        list.forEach(m => map.set(m.title, m));
        return Array.from(map.values());
    };

    const uniqueMovies = deduplicate(movieHistory);
    const uniqueSeries = deduplicate(seriesHistory);

    const getStats = (list: any[]) => {
        if (list.length === 0) return null;
        const posters = list.map(m => m.posterUrl || m.posterPath).filter(Boolean);
        const feat = list[list.length - 1];
        return {
            total: list.length,
            posters: posters as string[],
            featured: feat ? { title: feat.title, poster: feat.posterUrl || feat.posterPath } : null
        };
    };

    const movies = getStats(uniqueMovies);
    const series = getStats(uniqueSeries);
    const totalMovies = uniqueMovies.length + uniqueSeries.length;

    // 4. Determine Persona
    const userPersona = getPersona(totalOutings, topCategory?.name || null, totalMovies);

    // If there's absolutely NO activity, return a ghost persona instead of null
    // so the modal still opens and tells the user something!
    if (totalOutings === 0 && totalMovies === 0) {
        return {
          monthName: `${MONTH_NAMES[targetMonth]} ${targetYear}`,
          totalOutings: 0,
          topCategory: null,
          topPlace: null,
          featuredMomentyImage: null,
          featuredMomentyDish: null,
          totalMovies: 0,
          userPersona: "Le Fantôme Discret 👻"
        };
    }

    return {
      monthName: `${MONTH_NAMES[targetMonth]} ${targetYear}`,
      totalOutings,
      topCategory,
      topPlace,
      featuredMomentyImage,
      featuredMomentyDish,
      movies: movies || undefined,
      series: series || undefined,
      totalMovies,
      userPersona
    };

  }, [user, targetDate]);
}
