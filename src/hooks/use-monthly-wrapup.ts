import { useMemo } from 'react';
import type { UserProfile, VisitLog, SeenMovie } from '@/lib/firebase/firestore';

export type WrapUpStats = {
  monthName: string;
  totalOutings: number;
  topCategory: { name: string; count: number; percentage: number } | null;
  topPlace: { name: string; count: number } | null;
  featuredMomentyImage: string | null;
  featuredMomentyDish: string | null;
  totalMovies: number;
  featuredMovieTitle: string | null;
  featuredMoviePoster: string | null;
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

    // 3. Tfarrej Stats
    // Assuming 'seenMoviesData' exists on userProfile from the latest codebase analysis
    // and holds { title, viewedAt, posterUrl }
    const monthlyMovies = ((user as any).seenMoviesData || []).filter((m: any) => {
        if (!m.viewedAt) return false;
        const d = new Date(m.viewedAt);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
    
    // Fallback search to our recently implemented seenMovieHistory
    const backendHistory = ((user as any).seenMovieHistory || []).filter((m: any) => {
        if (!m.addedAt) return false;
        const d = new Date(m.addedAt);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    // Inclusion des séries (deux formats possibles selon la version de l'app)
    const seriesData = ((user as any).seenSeriesData || []).filter((m: any) => {
        if (!m.viewedAt) return false;
        const d = new Date(m.viewedAt);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const seriesHistory = ((user as any).seenSeriesHistory || []).filter((m: any) => {
        if (!m.addedAt) return false;
        const d = new Date(m.addedAt);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const combinedMovies = [...monthlyMovies, ...backendHistory, ...seriesData, ...seriesHistory];
    const uniqueMoviesMap = new Map();
    combinedMovies.forEach(m => uniqueMoviesMap.set(m.title, m)); // Deduplicate
    const uniqueMonthlyMovies = Array.from(uniqueMoviesMap.values());

    const totalMovies = uniqueMonthlyMovies.length;
    let featuredMovieTitle = null;
    let featuredMoviePoster = null;

    if (totalMovies > 0) {
        const featMovie = uniqueMonthlyMovies[uniqueMonthlyMovies.length - 1]; // Pick the last one added
        featuredMovieTitle = featMovie.title;
        featuredMoviePoster = featMovie.posterUrl || featMovie.posterPath || null;
    }

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
          featuredMovieTitle: null,
          featuredMoviePoster: null,
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
      totalMovies,
      featuredMovieTitle,
      featuredMoviePoster,
      userPersona
    };

  }, [user, targetDate]);
}
