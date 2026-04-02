import { useMemo } from 'react';
import type { UserProfile, VisitLog, SeenMovie } from '@/lib/firebase/firestore';

export type WrapUpStats = {
  monthName: string;
  totalOutings: number;
  topCategory: { name: string; count: number; percentage: number } | null;
  topPlace: { name: string; count: number } | null;
  topDish: { name: string; count: number } | null;
  topNeighborhood: { name: string; count: number } | null;
  topDay: { name: string; count: number } | null;
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

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

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

    // 2. Compute Top Category, Place, Dish, Neighborhood, Day
    const categoryCounts: Record<string, number> = {};
    const placeCounts: Record<string, number> = {};
    const dishCounts: Record<string, number> = {};
    const neighborhoodCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    
    let featuredMomentyImage: string | null = null;
    let featuredMomentyDish: string | null = null;

    monthlyVisits.forEach((v) => {
      // Category count
      const cat = v.category || 'Autre';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      
      // Place count
      const place = v.placeName;
      if (place) placeCounts[place] = (placeCounts[place] || 0) + 1;

      // Top Dish
      if (v.orderedItem && v.orderedItem !== "Découverte Gourmande") {
        const dish = v.orderedItem.trim();
        dishCounts[dish] = (dishCounts[dish] || 0) + 1;
      }

      // Top Neighborhood (matching via predefinedArea in places)
      const userPlace = (user.places || []).find(p => p.name === v.placeName);
      if (userPlace?.predefinedArea) {
        const area = userPlace.predefinedArea;
        neighborhoodCounts[area] = (neighborhoodCounts[area] || 0) + 1;
      }

      // Top Day
      const dayIndex = new Date(v.date).getDay();
      const dayName = DAY_NAMES[dayIndex];
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;

      // Extract a featured image from Momenty if available
      if (!featuredMomentyImage && v.momentyImageUrl) {
        featuredMomentyImage = v.momentyImageUrl;
        featuredMomentyDish = v.orderedItem || "Découverte Gourmande";
      }
    });

    const getTop = (counts: Record<string, number>): { name: string; count: number } | null => {
        let topItem: { name: string; count: number } | null = null;
        let maxCount = 0;
        Object.entries(counts).forEach(([name, count]) => {
          if (count > maxCount) {
            maxCount = count;
            topItem = { name, count };
          }
        });
        return topItem;
    };

    const topCategoryItem = getTop(categoryCounts);
    const topCategory = topCategoryItem ? { 
        name: topCategoryItem.name, 
        count: topCategoryItem.count, 
        percentage: Math.round((topCategoryItem.count / totalOutings) * 100) 
    } : null;

    const topPlace = getTop(placeCounts);
    const topDish = getTop(dishCounts);
    const topNeighborhood = getTop(neighborhoodCounts);
    const topDay = getTop(dayCounts);

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

    const getTfarrejStats = (list: any[]) => {
        if (list.length === 0) return null;
        const posters = list.map(m => m.posterUrl || m.posterPath).filter(Boolean);
        const feat = list[list.length - 1];
        return {
            total: list.length,
            posters: posters as string[],
            featured: feat ? { title: feat.title, poster: feat.posterUrl || feat.posterPath } : null
        };
    };

    const movies = getTfarrejStats(uniqueMovies);
    const series = getTfarrejStats(uniqueSeries);
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
          topDish: null,
          topNeighborhood: null,
          topDay: null,
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
      topDish,
      topNeighborhood,
      topDay,
      featuredMomentyImage,
      featuredMomentyDish,
      movies: movies || undefined,
      series: series || undefined,
      totalMovies,
      userPersona
    };

  }, [user, targetDate]);
}
