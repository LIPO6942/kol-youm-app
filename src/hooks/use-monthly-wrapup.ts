import { useMemo } from 'react';
import { getStoredMovieRanking, type UserProfile, type VisitLog, type SeenMovie, type MonthlyMovieRanking, isTestMovieTitle, type MovieCategory } from '@/lib/firebase/firestore';
import { analyzeMonthlyMovieTastes, MonthlyMovieTasteAnalysis } from '@/lib/movie-genre-analyzer';
import type { DuelMovieItem } from '@/lib/movie-duel-engine';
import { guessMovieCategory } from '@/lib/movie-category-utils';

export type CinemaSession = {
  title: string;
  cinemaPlace?: string;
  date?: number;
  posterUrl?: string;
};

export type KharjetOuting = {
  id: string;
  placeName: string;
  date: number;
  zone?: string;
  note?: string;
  description?: string;
  imageUrl?: string;
  momentyUrl?: string;
  source?: string;
};

export type MomentyMoment = {
  id: string;
  placeName: string;
  category: string;
  imageUrl: string;
  description?: string;
  note?: string;
  date: number;
  momentyUrl?: string;
};

export type WrapUpStats = {
  monthIndex: number; // 0 to 11
  monthName: string;
  totalOutings: number;
  topCategory: { name: string; count: number; percentage: number } | null;
  topPlace: { name: string; count: number } | null;
  topDish: { name: string; count: number } | null;
  topBeverage: { name: string; count: number } | null;
  topNeighborhood: { name: string; count: number } | null;
  topDay: { name: string; count: number } | null;
  featuredMomentyImage: string | null;
  featuredMomentyDish: string | null;
  momentyMoments: MomentyMoment[];
  movies?: {
    total: number;
    titles: string[];
    posters: string[];
    featured: { title: string; poster: string } | null;
    ranking?: MonthlyMovieRanking | null;
    genreAnalysis?: MonthlyMovieTasteAnalysis | null;
    unrankedCount?: number;
    isAllRanked?: boolean;
    hasUpdatesSincePublish?: boolean;
    allMonthMovies?: DuelMovieItem[];
  };
  series?: {
    total: number;
    titles: string[];
    posters: string[];
    featured: { title: string; poster: string } | null;
  };
  cinema?: {
    total: number;
    topCinema: string | null;
    movieTitles: string[];
    venues: string[];
    sessions: CinemaSession[];
  };
  kharjet?: {
    total: number;
    topSpot: string | null;
    topZone: string | null;
    outings: KharjetOuting[];
  };
  totalMovies: number; // Sum of both for Persona
  userPersona: string;
  evolution?: {
    prevTotalOutings: number;
    prevTotalMovies: number;
    outingsDiff: number;
    moviesDiff: number;
    streak: number;
  };
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const FOOD_CATEGORIES = new Set([
  'restaurant', 'restaurants', 'fast food', 'fastfood', 'fast-food',
  'brunch', 'brunchs', 'pâtisserie', 'patisserie', 'boulangerie',
  'snack', 'food', 'street food', 'crêperie', 'creperie', 'pizzeria'
]);

const NON_FOOD_KEYWORDS = [
  'baignade', 'plage', 'mer', 'sunset', 'coucher de soleil', 'randonnée', 'randonnee',
  'balade', 'cinéma', 'cinema', 'shopping', 'hike', 'soirée', 'soiree', 'nature',
  'karting', 'bowling', 'arcade', 'activité', 'activite', 'parc'
];

export function getKharjetThematicImage(
  text: string,
  dateOrMonth?: number | Date | string,
  index: number = 0
): string {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Determine monthly variant (1 or 2) to rotate photos month-to-month and between multiple outings
  let monthIndex = 0;
  if (typeof dateOrMonth === 'number') {
    if (dateOrMonth >= 0 && dateOrMonth <= 11) {
      monthIndex = dateOrMonth;
    } else {
      const d = new Date(dateOrMonth);
      if (!isNaN(d.getTime())) monthIndex = d.getMonth();
    }
  } else if (dateOrMonth instanceof Date) {
    monthIndex = dateOrMonth.getMonth();
  } else if (typeof dateOrMonth === 'string' && dateOrMonth) {
    const d = new Date(dateOrMonth);
    if (!isNaN(d.getTime())) monthIndex = d.getMonth();
  }

  const variant = ((monthIndex + index) % 2 === 0) ? 1 : 2;

  // 1. Nature / Farniente / Détente / Pique-nique / Hamac / Jardin / Parc
  if (
    t.includes('farniente') || t.includes('nature / farniente') || t.includes('detente') ||
    t.includes('relaxation') || t.includes('hamac') || t.includes('repos') || t.includes('chill') ||
    t.includes('pique nique') || t.includes('picnic') || t.includes('jardin') ||
    (t.includes('nature') && !t.includes('randonnee') && !t.includes('rando') && !t.includes('trek') && !t.includes('montagne'))
  ) {
    return variant === 1 ? '/images/kharjet/nature_farniente_1.jpg' : '/images/kharjet/nature_farniente_2.jpg';
  }

  // 2. Sea / Beach / Baignade / Plage / Boat / Crique
  if (
    t.includes('baignade') || t.includes('baign') || t.includes('mer') || t.includes('plage') ||
    t.includes('beach') || t.includes('sea') || t.includes('swim') || t.includes('plongee') ||
    t.includes('bateau') || t.includes('boat') || t.includes('crique') || t.includes('marina') ||
    t.includes('port') || t.includes('falaise') || t.includes('kheireddine') || t.includes('gammarth plage') ||
    t.includes('marsa plage') || t.includes('hammamet') || t.includes('bizerte') || t.includes('kelibia') ||
    t.includes('rafraf') || t.includes('ghar el melh') || t.includes('haouaria') || t.includes('korba') ||
    t.includes('tabarka') || t.includes('djerba') || t.includes('zarzis') || t.includes('mahdia') ||
    t.includes('monastir') || t.includes('sousse') || t.includes('amilcar')
  ) {
    return variant === 1 ? '/images/kharjet/sea_1.jpg' : '/images/kharjet/sea_2.jpg';
  }

  // 3. Nightlife / Soirée / Party / Rooftop / Lounge / Club / Bar
  if (
    t.includes('soiree') || t.includes('soir') || t.includes('night') || t.includes('lounge') ||
    t.includes('bar') || t.includes('club') || t.includes('rooftop') || t.includes('fete') ||
    t.includes('party') || t.includes('cocktail') || t.includes('afterwork') || t.includes('pub') ||
    t.includes('concert') || t.includes('music') || t.includes('dj') || t.includes('boite')
  ) {
    return variant === 1 ? '/images/kharjet/soiree_1.jpg' : '/images/kharjet/soiree_2.jpg';
  }

  // 4. Hiking / Montagne / Randonnée / Forêt / Trek / Camping
  if (
    t.includes('randonnee') || t.includes('rando') || t.includes('montagne') ||
    t.includes('foret') || t.includes('forest') || t.includes('trek') || t.includes('cascade') ||
    t.includes('trail') || t.includes('camping') || t.includes('zaghouan') || t.includes('boukornine') ||
    t.includes('ichkeul') || t.includes('ain draham') || t.includes('beni mtir') || t.includes('kesra')
  ) {
    return variant === 1 ? '/images/kharjet/hiking_1.jpg' : '/images/kharjet/hiking_2.jpg';
  }

  // 5. Default / Balade / Medina / Promenade / Glace / Activité / Autre
  return variant === 1 ? '/images/kharjet/walk_1.jpg' : '/images/kharjet/walk_2.jpg';
}

function isFoodDish(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return !NON_FOOD_KEYWORDS.some(kw => lower.includes(kw));
}

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
  if (topCategoryName === "Kharjet" || topCategoryName === "Balade") return "L'Explorateur d'Escapades 🧭";
  return "L'Épicurien Équilibré 🌟";
}

export function useMonthlyWrapUp(
  user: UserProfile | null,
  targetDate: Date,
  placesWithZones?: { name: string; zone: string }[]
): WrapUpStats | null {
  return useMemo(() => {
    if (!user) return null;

    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    const parseDateSafely = (timestamp?: any): Date | null => {
      if (!timestamp) return null;
      if (typeof timestamp === 'number') {
        const d = new Date(timestamp);
        return isNaN(d.getTime()) ? null : d;
      }
      if (typeof timestamp === 'string') {
        const trimmed = timestamp.trim();
        if (/^\d+$/.test(trimmed)) {
          const d = new Date(Number(trimmed));
          return isNaN(d.getTime()) ? null : d;
        }
        const d = new Date(trimmed);
        return isNaN(d.getTime()) ? null : d;
      }
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? null : timestamp;
      }
      return null;
    };

    const isDateInMonth = (timestamp?: any) => {
      const d = parseDateSafely(timestamp);
      return d !== null && d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    };

    // 1. Filter visits for the target month
    const monthlyVisits = (user.visits || []).filter((v: VisitLog) => {
      return isDateInMonth(v.date);
    });

    const totalOutings = monthlyVisits.length;

    // 2. Compute Top Category, Place, Dish, Beverage, Neighborhood, Day
    const categoryCounts: Record<string, number> = {};
    const placeCounts: Record<string, number> = {};
    const dishCounts: Record<string, number> = {};
    const beverageCounts: Record<string, number> = {};
    const neighborhoodCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    const cinemaCounts: Record<string, number> = {};
    const kharjetPlaceCounts: Record<string, number> = {};
    const kharjetZoneCounts: Record<string, number> = {};

    const cinemaSessions: CinemaSession[] = [];
    const kharjetOutings: KharjetOuting[] = [];
    const momentyMoments: MomentyMoment[] = [];

    let featuredMomentyImage: string | null = null;
    let featuredMomentyDish: string | null = null;

    monthlyVisits.forEach((v) => {
      // Category count
      const rawCat = v.category || 'Autre';
      const catNorm = rawCat.toLowerCase().trim();
      categoryCounts[rawCat] = (categoryCounts[rawCat] || 0) + 1;

      // Cinema specific tracking from visits (déduplication intelligente avec duelItems)
      const isCinemaVisit = catNorm.includes('ciné') || catNorm.includes('cinema');
      if (isCinemaVisit) {
        const rawTitle = (v.orderedItem && !isFoodDish(v.orderedItem)) ? v.orderedItem.trim() : (v.note || '');
        const isPlaceholder = !rawTitle || /^(film(\s+au\s+cin[ée]ma)?|cin[ée]ma|cin[ée]|s[ée]ance)$/i.test(rawTitle.trim());
        cinemaSessions.push({
          title: isPlaceholder ? 'Film au cinéma' : rawTitle,
          cinemaPlace: v.placeName || 'Cinéma',
          date: v.date,
          isPlaceholder,
        } as any);
      }

      // Kharjet specific tracking
      const isKharjetVisit = rawCat === 'Kharjet' || rawCat === 'Balade' || catNorm.includes('kharj');
      if (isKharjetVisit) {
        if (v.placeName) {
          kharjetPlaceCounts[v.placeName] = (kharjetPlaceCounts[v.placeName] || 0) + 1;
        }
        const globalPlace = placesWithZones?.find(p => p.name === v.placeName);
        const area = (v as any).zone || (v as any).cityName || globalPlace?.zone || (user.places || []).find(p => p.name === v.placeName)?.predefinedArea;
        if (area) {
          kharjetZoneCounts[area] = (kharjetZoneCounts[area] || 0) + 1;
        }

        const rawKharjetImg = v.momentyImageUrl || (v as any).photoUrl || (v as any).photoDataUri || (v as any).imageUrl || (v as any).image;
        const kharjetDesc = (v as any).description || v.note || (v.orderedItem && v.orderedItem !== "Découverte Gourmande" ? v.orderedItem : '') || '';

        // Si pas de photo Momenty, attribuer l'image thématique correspondante (baignade/mer, soirée/night, rando/nature, sunset, balade)
        const combinedText = `${v.placeName || ''} ${area || ''} ${kharjetDesc} ${v.orderedItem || ''} ${v.note || ''}`;
        const kharjetImg = rawKharjetImg || getKharjetThematicImage(combinedText, v.date || targetMonth, kharjetOutings.length);

        kharjetOutings.push({
          id: v.id || `${v.date}-${Math.random().toString(36).substr(2, 5)}`,
          placeName: v.placeName || 'Escapade',
          date: v.date,
          zone: area,
          note: v.note,
          description: kharjetDesc,
          imageUrl: kharjetImg,
          momentyUrl: v.momentyUrl,
          source: v.source || (v.momentyUrl || rawKharjetImg ? 'momenty' : 'kolyoum')
        });
      }

      // Place count
      const place = v.placeName;
      if (place) placeCounts[place] = (placeCounts[place] || 0) + 1;

      // Top Dish — STRICTLY culinary categories (excluding Café, Kharjet, Balade, Cinéma, etc.)
      const isFoodCategory = FOOD_CATEGORIES.has(catNorm);
      if (isFoodCategory && v.orderedItem && isFoodDish(v.orderedItem)) {
        const items = v.orderedItem.split(',').map(s => s.trim()).filter(Boolean);
        items.forEach(dish => {
          if (isFoodDish(dish)) {
            dishCounts[dish] = (dishCounts[dish] || 0) + 1;
          }
        });
      }

      // Top Beverage — uniquement les items commandés dans les Cafés
      const isCafeCategory = catNorm === 'café' || catNorm === 'cafe' || catNorm === 'salon de thé' || catNorm === 'coffee';
      if (isCafeCategory && v.orderedItem && v.orderedItem !== "Découverte Gourmande") {
        const items = v.orderedItem.split(',').map(s => s.trim()).filter(Boolean);
        items.forEach(bev => {
          beverageCounts[bev] = (beverageCounts[bev] || 0) + 1;
        });
      }

      // Top Neighborhood — priorité : base Firestore globale, sinon user.places.predefinedArea
      const globalPlace = placesWithZones?.find(p => p.name === v.placeName);
      const area = (v as any).zone || (v as any).cityName || globalPlace?.zone || (user.places || []).find(p => p.name === v.placeName)?.predefinedArea;
      if (area) {
        neighborhoodCounts[area] = (neighborhoodCounts[area] || 0) + 1;
      }

      // Top Day
      const dayIndex = new Date(v.date).getDay();
      const dayName = DAY_NAMES[dayIndex];
      dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;

      // Extract all Momenty moments
      const img = v.momentyImageUrl || (v as any).photoUrl || (v as any).photoDataUri || (v as any).imageUrl || (v as any).image;
      const momentDesc = (v as any).description || v.note || (v.orderedItem && v.orderedItem !== "Découverte Gourmande" && v.orderedItem !== "Moment Momenty" ? v.orderedItem : '') || '';

      if (img || v.source === 'momenty') {
        if (!featuredMomentyImage && img) {
          featuredMomentyImage = img;
        }
        if (!featuredMomentyDish && momentDesc) {
          featuredMomentyDish = momentDesc;
        }

        if (img) {
          momentyMoments.push({
            id: v.id || `${v.date}-${Math.random().toString(36).substr(2, 5)}`,
            placeName: v.placeName || 'Moment capturé',
            category: rawCat,
            imageUrl: img,
            description: momentDesc || v.placeName || 'Moment capturé',
            note: v.note,
            date: v.date,
            momentyUrl: v.momentyUrl
          });
        }
      }
    });

    if (featuredMomentyImage && !featuredMomentyDish) {
      featuredMomentyDish = "Moment Momenty";
    }

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
    const topBeverage = getTop(beverageCounts);
    const topNeighborhood = getTop(neighborhoodCounts);
    const topDay = getTop(dayCounts);
    const topKharjetPlace = getTop(kharjetPlaceCounts);
    const topKharjetZone = getTop(kharjetZoneCounts);

    // 3. Tfarrej Stats (Separated Movies and Series)
    const rejectedTitles = new Set(((user as any)?.rejectedMovieTitles || []).map((t: string) => (t || '').toLowerCase().trim()));
    const isExcluded = (t: string) => {
      if (!t || typeof t !== 'string' || !t.trim()) return true;
      const norm = t.toLowerCase().trim();
      if (isTestMovieTitle(norm)) return true;
      if (rejectedTitles.has(norm)) return true;
      return false;
    };

    const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const directMonthlyRanking: MonthlyMovieRanking | null =
      getStoredMovieRanking(monthKey, user) ||
      (user as any)?.movieRankings?.[monthKey] ||
      null;

    const filterByDate = (history: any[], dateField: string) => {
      return (history || []).filter((m: any) => {
        return isDateInMonth(m?.[dateField]);
      });
    };

    // Map de métadonnées pour chaque titre (insensible à la casse)
    const metadataMap = new Map<string, Partial<DuelMovieItem>>();

    // 1. Enrichir avec seenMoviesData
    ((user as any)?.seenMoviesData || []).forEach((m: any) => {
      if (m?.title && !isExcluded(m.title)) {
        const norm = m.title.toLowerCase().trim();
        metadataMap.set(norm, {
          posterUrl: m.posterUrl,
          year: m.year,
          rating: m.rating,
          watchedInCinema: m.watchedInCinema,
          cinemaPlace: m.cinemaPlace,
          viewedAt: m.viewedAt || m.addedAt,
          genres: m.genres,
          category: m.category || (user as any)?.movieCategories?.[norm],
        });
      }
    });

    // 2. Enrichir avec seenMovieHistory
    ((user as any)?.seenMovieHistory || []).forEach((h: any) => {
      if (h?.title && !isExcluded(h.title)) {
        const key = h.title.toLowerCase().trim();
        const existing = metadataMap.get(key) || {};
        if (!existing.posterUrl && (h.posterPath || h.posterUrl)) {
          existing.posterUrl = h.posterPath || h.posterUrl;
        }
        if (!existing.viewedAt && h.addedAt) {
          existing.viewedAt = h.addedAt;
        }
        metadataMap.set(key, existing);
      }
    });

    // 3. Enrichir avec les visites cinéma
    cinemaSessions.forEach(cs => {
      if (cs.title && !isExcluded(cs.title)) {
        const key = cs.title.toLowerCase().trim();
        const existing = metadataMap.get(key) || {};
        existing.watchedInCinema = true;
        if (cs.cinemaPlace) existing.cinemaPlace = cs.cinemaPlace;
        if (cs.posterUrl && !existing.posterUrl) existing.posterUrl = cs.posterUrl;
        metadataMap.set(key, existing);
      }
    });

    // RÈGLE STRICTE UTILISATEUR POUR LE WRAP-UP DU MOIS :
    // - Un film ne doit apparaître dans ce mois que s'il a STRICTEMENT été vu durant ce mois.
    // - Si l'utilisateur a choisi une date de visionnage (viewedAt) antérieure ou dans un autre mois,
    //   le film est EXCLU de ce mois, même s'il a été marqué/ajouté dans l'application (addedAt) durant ce mois.
    const movieViewMap = new Map<string, { viewedAt?: number; addedAt?: number; inCinemaThisMonth?: boolean }>();

    ((user as any)?.seenMoviesData || []).forEach((m: any) => {
      if (m?.title && !isExcluded(m.title)) {
        const norm = m.title.toLowerCase().trim();
        movieViewMap.set(norm, {
          viewedAt: m.viewedAt ? Number(m.viewedAt) : undefined,
          addedAt: m.addedAt ? Number(m.addedAt) : undefined,
        });
      }
    });

    cinemaSessions.forEach(cs => {
      if (cs.title && cs.date && isDateInMonth(cs.date) && !isExcluded(cs.title)) {
        const norm = cs.title.toLowerCase().trim();
        const existing = movieViewMap.get(norm) || {};
        existing.inCinemaThisMonth = true;
        if (!existing.viewedAt) existing.viewedAt = Number(cs.date);
        movieViewMap.set(norm, existing);
      }
    });

    ((user as any)?.seenMovieHistory || []).forEach((h: any) => {
      if (h?.title && !isExcluded(h.title)) {
        const norm = h.title.toLowerCase().trim();
        // Ne pas écraser si seenMoviesData a déjà une date de visionnage explicite
        if (!movieViewMap.has(norm)) {
          movieViewMap.set(norm, {
            addedAt: h.addedAt ? Number(h.addedAt) : undefined,
          });
        }
      }
    });

    const isMovieViewedInTargetMonth = (title: string): boolean => {
      if (!title || isExcluded(title)) return false;
      const norm = title.toLowerCase().trim();
      const info = movieViewMap.get(norm);
      if (!info) return false;

      // 1. Si une date de visionnage explicite (viewedAt) existe :
      // Elle fait foi absolue. Si elle est en dehors du mois ciblé (ex: date antérieure choisie),
      // le film est STRICTEMENT exclu de ce mois !
      if (info.viewedAt !== undefined && info.viewedAt !== null && !isNaN(info.viewedAt)) {
        return isDateInMonth(info.viewedAt);
      }

      // 2. Si le film a été vu au cinéma durant ce mois ciblé :
      if (info.inCinemaThisMonth) {
        return true;
      }

      // 3. Si AUCUNE date de visionnage n'a jamais été choisie (pas de viewedAt),
      // alors seulement on vérifie si addedAt tombe dans ce mois
      if (info.addedAt !== undefined && info.addedAt !== null && !isNaN(info.addedAt)) {
        return isDateInMonth(info.addedAt);
      }

      return false;
    };

    const monthMovieTitlesSet = new Set<string>();

    // A. Depuis seenMoviesData
    ((user as any)?.seenMoviesData || []).forEach((m: any) => {
      if (m?.title && isMovieViewedInTargetMonth(m.title)) {
        monthMovieTitlesSet.add(m.title.trim());
      }
    });

    // B. Depuis les séances de cinéma du mois
    cinemaSessions.forEach(cs => {
      if (cs.title && cs.title !== 'Film au cinéma' && isMovieViewedInTargetMonth(cs.title)) {
        monthMovieTitlesSet.add(cs.title.trim());
      }
    });

    // C. Depuis seenMovieHistory (uniquement si validé comme vu ce mois-ci)
    ((user as any)?.seenMovieHistory || []).forEach((h: any) => {
      if (h?.title && isMovieViewedInTargetMonth(h.title)) {
        monthMovieTitlesSet.add(h.title.trim());
      }
    });

    // D. Depuis directMonthlyRanking (UNIQUEMENT les films effectivement vus durant ce mois !)
    if (directMonthlyRanking?.rankedTitles) {
      directMonthlyRanking.rankedTitles.forEach(t => {
        if (t && typeof t === 'string' && isMovieViewedInTargetMonth(t)) {
          monthMovieTitlesSet.add(t.trim());
        }
      });
    }

    const uniqueMonthTitles = Array.from(monthMovieTitlesSet);
    const monthTitlesLower = new Set(uniqueMonthTitles.map(t => t.toLowerCase().trim()));

    // Résolution du classement : filtrer STRICTEMENT pour ne contenir que les films vus ce mois
    let monthlyRanking: MonthlyMovieRanking | null = null;
    if (directMonthlyRanking) {
      const filteredRanked = (directMonthlyRanking.rankedTitles || []).filter(t => typeof t === 'string' && monthTitlesLower.has(t.toLowerCase().trim()));
      if (filteredRanked.length > 0) {
        monthlyRanking = {
          ...directMonthlyRanking,
          rankedTitles: filteredRanked,
          initialRankedTitles: (directMonthlyRanking.initialRankedTitles || []).filter(t => typeof t === 'string' && monthTitlesLower.has(t.toLowerCase().trim())),
          newlyAddedTitles: (directMonthlyRanking.newlyAddedTitles || []).filter(t => typeof t === 'string' && monthTitlesLower.has(t.toLowerCase().trim())),
        };
      }
    }

    if (!monthlyRanking && uniqueMonthTitles.length > 0) {
      const allRankings = (user as any)?.movieRankings || {};
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      let sourceRanking = (user as any)?.movieRankings?.[currentMonthKey] || getStoredMovieRanking(currentMonthKey, user);

      if (!sourceRanking) {
        const sortedKeys = Object.keys(allRankings).sort().reverse();
        for (const k of sortedKeys) {
          const r = allRankings[k] || getStoredMovieRanking(k, user);
          if (r?.rankedTitles?.length) {
            sourceRanking = r;
            break;
          }
        }
      }

      if (sourceRanking?.rankedTitles?.length) {
        const derivedTitles = (sourceRanking.rankedTitles || []).filter(t => typeof t === 'string' && monthTitlesLower.has(t.toLowerCase().trim()));
        if (derivedTitles.length > 0) {
          monthlyRanking = {
            monthKey,
            rankedTitles: derivedTitles,
            initialRankedTitles: derivedTitles,
            newlyAddedTitles: [],
            publishedAt: sourceRanking.publishedAt || Date.now(),
            updatedAt: Date.now(),
            movieCatalog: sourceRanking.movieCatalog,
          };
        }
      }
    }

    // DuelMovieItem[] final pour les stats et le modal
    const duelItems: DuelMovieItem[] = uniqueMonthTitles.map(title => {
      const norm = (title || '').toLowerCase().trim();
      const meta = metadataMap.get(norm) || {};
      const cat = meta.category || (user as any)?.movieCategories?.[norm] || guessMovieCategory(title, meta.genres);
      return {
        title,
        posterUrl: meta.posterUrl,
        year: meta.year,
        rating: meta.rating,
        watchedInCinema: meta.watchedInCinema,
        cinemaPlace: meta.cinemaPlace,
        viewedAt: meta.viewedAt,
        genres: meta.genres,
        category: cat,
      };
    });

    // Fusion intelligente et déduplication des séances de cinéma (visites IRL + films vus en salle)
    // STRICTEMENT filtré pour le mois ciblé : aucune séance hors mois ne peut être incluse
    const monthCinemaMovies = [
      ...((user as any)?.seenMoviesData || []).filter((m: any) =>
        m && typeof m === 'object' &&
        (m.watchedInCinema || m.cinemaPlace) &&
        (isDateInMonth(m.viewedAt) || (!m.viewedAt && isDateInMonth(m.addedAt)))
      ),
      ...duelItems.filter(m =>
        Boolean(m?.watchedInCinema) &&
        (isDateInMonth(m.viewedAt) || (!m.viewedAt && isDateInMonth((m as any).addedAt)))
      )
    ];

    const seenCinemaTitlesMap = new Map<string, any>();
    monthCinemaMovies.forEach(m => {
      if (m?.title && typeof m.title === 'string' && !isExcluded(m.title)) {
        const key = m.title.toLowerCase().trim();
        if (key && !seenCinemaTitlesMap.has(key)) {
          seenCinemaTitlesMap.set(key, m);
        }
      }
    });

    // 1. Fusionner avec les séances existantes ou ajouter les films cinéma vus ce mois
    seenCinemaTitlesMap.forEach((m) => {
      const normTitle = (m.title || '').toLowerCase().trim();
      const normPlace = (m.cinemaPlace || '').toLowerCase().trim();

      const matchedIndex = cinemaSessions.findIndex(s => {
        const sTitle = (s.title || '').toLowerCase().trim();
        const sPlace = (s.cinemaPlace || '').toLowerCase().trim();

        if (sTitle === normTitle) return true;
        if ((s as any).isPlaceholder && normPlace && sPlace === normPlace) return true;
        if ((s as any).isPlaceholder && cinemaSessions.length === 1) return true;
        return false;
      });

      const parsedSessionDate = parseDateSafely(m.viewedAt || m.addedAt)?.getTime();

      if (matchedIndex !== -1) {
        const s = cinemaSessions[matchedIndex];
        s.title = m.title;
        s.cinemaPlace = s.cinemaPlace || m.cinemaPlace || 'Cinéma';
        s.posterUrl = m.posterUrl || s.posterUrl;
        s.date = s.date || parsedSessionDate;
        (s as any).isPlaceholder = false;
      } else {
        cinemaSessions.push({
          title: m.title,
          cinemaPlace: m.cinemaPlace || 'Cinéma',
          date: parsedSessionDate,
          posterUrl: m.posterUrl
        });
      }
    });

    // 2. Si après le premier tour il reste des séances placeholder mais qu'on a des films cinéma vus,
    // remplacer le titre placeholder par le film cinéma correspondant de ce mois
    const realCinemaList = Array.from(seenCinemaTitlesMap.values());
    if (realCinemaList.length > 0) {
      cinemaSessions.forEach((s, idx) => {
        if ((s as any).isPlaceholder || s.title === 'Film au cinéma') {
          const fallbackMovie = realCinemaList[idx % realCinemaList.length];
          if (fallbackMovie) {
            s.title = fallbackMovie.title;
            s.cinemaPlace = s.cinemaPlace && s.cinemaPlace !== 'Cinéma' ? s.cinemaPlace : (fallbackMovie.cinemaPlace || s.cinemaPlace);
            s.posterUrl = fallbackMovie.posterUrl || s.posterUrl;
            (s as any).isPlaceholder = false;
          }
        }
      });
    }

    // Filtrer STRICTEMENT les séances de cinéma pour garantir qu'elles appartiennent au mois ciblé
    const validCinemaSessions = cinemaSessions.filter(s => {
      if (s.date) return isDateInMonth(s.date);
      return true;
    });

    // Calculer les comptes par cinéma et le total réel dédupliqué
    validCinemaSessions.forEach(s => {
      if (s.cinemaPlace) {
        cinemaCounts[s.cinemaPlace] = (cinemaCounts[s.cinemaPlace] || 0) + 1;
      }
    });
    const totalCinemaOutings = validCinemaSessions.length;
    const topCinemaPlace = getTop(cinemaCounts);

    const seriesViewMap = new Map<string, { viewedAt?: number; addedAt?: number }>();
    ((user as any)?.seenSeriesData || []).forEach((s: any) => {
      if (s?.title) {
        const norm = s.title.toLowerCase().trim();
        seriesViewMap.set(norm, {
          viewedAt: s.viewedAt ? Number(s.viewedAt) : undefined,
          addedAt: s.addedAt ? Number(s.addedAt) : undefined,
        });
      }
    });

    const isSeriesViewedInTargetMonth = (s: any): boolean => {
      if (!s?.title) return false;
      const norm = s.title.toLowerCase().trim();
      const info = seriesViewMap.get(norm) || {
        viewedAt: s.viewedAt ? Number(s.viewedAt) : undefined,
        addedAt: s.addedAt ? Number(s.addedAt) : undefined,
      };

      if (info.viewedAt !== undefined && info.viewedAt !== null && !isNaN(info.viewedAt)) {
        return isDateInMonth(info.viewedAt);
      }
      if (info.addedAt !== undefined && info.addedAt !== null && !isNaN(info.addedAt)) {
        return isDateInMonth(info.addedAt);
      }
      return false;
    };

    const seriesHistory = [
      ...((user as any).seenSeriesData || []).filter((s: any) => isSeriesViewedInTargetMonth(s)),
      ...((user as any).seenSeriesHistory || []).filter((s: any) => isSeriesViewedInTargetMonth(s))
    ];
    const deduplicateSeries = (list: any[]) => {
      const map = new Map();
      list.forEach(m => {
        if (m?.title) map.set(m.title, m);
      });
      return Array.from(map.values());
    };
    const uniqueSeries = deduplicateSeries(seriesHistory);

    // Calcul précis du statut de classement
    const rankedSet = new Set((monthlyRanking?.rankedTitles || []).filter(t => typeof t === 'string').map(t => t.toLowerCase().trim()));
    const unrankedMovies = duelItems.filter(m => m?.title && typeof m.title === 'string' && !rankedSet.has(m.title.toLowerCase().trim()));
    const unrankedCount = unrankedMovies.length;
    const isAllRanked = Boolean(monthlyRanking && (monthlyRanking.rankedTitles || []).length > 0 && unrankedCount === 0);

    const posters = duelItems.map(m => m.posterUrl).filter(Boolean) as string[];
    const feat = duelItems[duelItems.length - 1];
    const genreAnalysis = analyzeMonthlyMovieTastes(duelItems);
    const hasUpdatesSincePublish = Boolean(monthlyRanking?.hasUpdatesSincePublish);

    const movies = (duelItems.length > 0 || monthlyRanking) ? {
      total: duelItems.length,
      titles: duelItems.map(d => d.title),
      posters,
      featured: feat ? { title: feat.title, poster: feat.posterUrl || '' } : null,
      ranking: monthlyRanking,
      genreAnalysis,
      unrankedCount,
      isAllRanked,
      hasUpdatesSincePublish,
      allMonthMovies: duelItems,
    } : undefined;

    const seriesPosters = uniqueSeries.map((s: any) => s.posterUrl || s.posterPath).filter(Boolean);
    const seriesTitlesList = uniqueSeries.map((s: any) => s.title).filter(Boolean);
    const seriesFeat = uniqueSeries[uniqueSeries.length - 1];
    const series = uniqueSeries.length > 0 ? {
      total: uniqueSeries.length,
      titles: seriesTitlesList as string[],
      posters: seriesPosters as string[],
      featured: seriesFeat ? { title: seriesFeat.title, poster: seriesFeat.posterUrl || seriesFeat.posterPath } : null,
    } : undefined;

    const totalMovies = (movies?.total || duelItems.length) + uniqueSeries.length;

    // Consolidate Cinema Stats
    const allCinemaTitles = Array.from(new Set(validCinemaSessions.map(s => s.title).filter(t => t && t !== 'Film au cinéma')));
    const allCinemaVenues = Array.from(new Set(validCinemaSessions.map(s => s.cinemaPlace).filter(Boolean))) as string[];

    // 4. Determine Persona
    const userPersona = getPersona(totalOutings, topCategory?.name || null, totalMovies);

    // 5. Calcul de l'évolution vs mois précédent (Option D demandée par l'utilisateur)
    const prevDate = new Date(targetYear, targetMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    const isDateInPrevMonth = (timestamp?: any) => {
      const d = parseDateSafely(timestamp);
      return d !== null && d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    };

    const prevMonthlyVisits = (user.visits || []).filter((v: VisitLog) => isDateInPrevMonth(v.date));
    const prevTotalOutings = prevMonthlyVisits.length;

    let prevTotalMovies = 0;
    ((user as any)?.seenMoviesData || []).forEach((m: any) => {
      if (m?.title && !isExcluded(m.title)) {
        if (m.viewedAt && !isNaN(Number(m.viewedAt))) {
          if (isDateInPrevMonth(m.viewedAt)) prevTotalMovies++;
        } else if (m.addedAt && !isNaN(Number(m.addedAt))) {
          if (isDateInPrevMonth(m.addedAt)) prevTotalMovies++;
        }
      }
    });

    const outingsDiff = totalOutings - prevTotalOutings;
    const moviesDiff = (movies?.total || 0) - prevTotalMovies;

    let streak = 0;
    if (totalOutings > 0 || totalMovies > 0) {
      streak = 1;
      for (let i = 1; i <= 12; i++) {
        const checkDate = new Date(targetYear, targetMonth - i, 1);
        const cMonth = checkDate.getMonth();
        const cYear = checkDate.getFullYear();
        const hasOutings = (user.visits || []).some((v: VisitLog) => {
          const d = parseDateSafely(v.date);
          return d !== null && d.getMonth() === cMonth && d.getFullYear() === cYear;
        });
        const hasMovies = ((user as any)?.seenMoviesData || []).some((m: any) => {
          const d = parseDateSafely(m?.viewedAt || m?.addedAt);
          return d !== null && d.getMonth() === cMonth && d.getFullYear() === cYear;
        });
        if (hasOutings || hasMovies) {
          streak++;
        } else {
          break;
        }
      }
    }

    const evolution = {
      prevTotalOutings,
      prevTotalMovies,
      outingsDiff,
      moviesDiff,
      streak,
    };

    // If there's absolutely NO activity, return a ghost persona instead of null
    if (totalOutings === 0 && totalMovies === 0) {
      return {
        monthIndex: targetMonth,
        monthName: `${MONTH_NAMES[targetMonth]} ${targetYear}`,
        totalOutings: 0,
        topCategory: null,
        topPlace: null,
        topDish: null,
        topBeverage: null,
        topNeighborhood: null,
        topDay: null,
        featuredMomentyImage: null,
        featuredMomentyDish: null,
        momentyMoments: [],
        totalMovies: 0,
        userPersona: "Le Fantôme Discret 👻"
      };
    }

    return {
      monthIndex: targetMonth,
      monthName: `${MONTH_NAMES[targetMonth]} ${targetYear}`,
      totalOutings,
      topCategory,
      topPlace,
      topDish,
      topBeverage,
      topNeighborhood,
      topDay,
      featuredMomentyImage,
      featuredMomentyDish,
      momentyMoments,
      movies: movies || undefined,
      series: series || undefined,
      cinema: totalCinemaOutings > 0 ? {
        total: totalCinemaOutings,
        topCinema: topCinemaPlace?.name || allCinemaVenues[0] || null,
        movieTitles: allCinemaTitles,
        venues: allCinemaVenues,
        sessions: validCinemaSessions
      } : undefined,
      kharjet: kharjetOutings.length > 0 ? {
        total: kharjetOutings.length,
        topSpot: topKharjetPlace?.name || kharjetOutings[0]?.placeName || null,
        topZone: topKharjetZone?.name || null,
        outings: kharjetOutings
      } : undefined,
      totalMovies,
      userPersona,
      evolution
    };

  }, [user, targetDate, placesWithZones]);
}
