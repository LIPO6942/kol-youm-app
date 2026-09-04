import { useMemo } from 'react';
import { getStoredMovieRanking, type UserProfile, type VisitLog, type SeenMovie, type MonthlyMovieRanking, isTestMovieTitle } from '@/lib/firebase/firestore';
import { analyzeMonthlyMovieTastes, MonthlyMovieTasteAnalysis } from '@/lib/movie-genre-analyzer';
import type { DuelMovieItem } from '@/lib/movie-duel-engine';

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

    // 1. Filter visits for the target month
    const monthlyVisits = (user.visits || []).filter((v: VisitLog) => {
      const d = new Date(v.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
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
    const watchlistTitles = new Set(((user as any)?.moviesToWatch || []).map((t: string) => (t || '').toLowerCase().trim()));
    const rejectedTitles = new Set(((user as any)?.rejectedMovieTitles || []).map((t: string) => (t || '').toLowerCase().trim()));
    const seriesTitles = new Set([
      ...((user as any)?.seenSeriesTitles || []),
      ...((user as any)?.seriesToWatch || []),
      ...((user as any)?.rejectedSeriesTitles || []),
    ].map((t: string) => (t || '').toLowerCase().trim()));

    const isExcluded = (t: string) => {
      if (!t || typeof t !== 'string') return true;
      const norm = t.toLowerCase().trim();
      if (isTestMovieTitle(norm)) return true;
      if (watchlistTitles.has(norm)) return true;
      if (rejectedTitles.has(norm)) return true;
      if (seriesTitles.has(norm)) return true;
      return false;
    };

    const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const directMonthlyRanking: MonthlyMovieRanking | null = 
      (user as any)?.movieRankings?.[monthKey] || 
      getStoredMovieRanking(monthKey, user) || 
      null;

    const filterByDate = (history: any[], dateField: string) => {
        return (history || []).filter((m: any) => {
            if (!m[dateField]) return false;
            const d = new Date(m[dateField]);
            return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });
    };

    // Map de métadonnées pour chaque titre (insensible à la casse)
    const metadataMap = new Map<string, Partial<DuelMovieItem>>();

    // 1. Enrichir avec seenMoviesData
    ((user as any)?.seenMoviesData || []).forEach((m: any) => {
      if (m?.title && !isExcluded(m.title)) {
        metadataMap.set(m.title.toLowerCase().trim(), {
          posterUrl: m.posterUrl,
          year: m.year,
          rating: m.rating,
          watchedInCinema: m.watchedInCinema,
          cinemaPlace: m.cinemaPlace,
          viewedAt: m.viewedAt || m.addedAt,
          genres: m.genres,
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

    // Construire STRICTEMENT la liste des films vus durant ce mois spécifique :
    // - Films dont la date (viewedAt / addedAt) correspond au mois ciblé
    // - Films vus en salle durant ce mois (cinemaSessions)
    // - Si un classement officiel pour ce mois précis existe déjà, ses films
    const datedMovies = [
      ...filterByDate((user as any).seenMoviesData || [], 'viewedAt'),
      ...filterByDate((user as any).seenMovieHistory || [], 'addedAt'),
    ].filter((m: any) => !isExcluded(m?.title));

    const monthMovieTitlesSet = new Set<string>();
    datedMovies.forEach(m => {
      if (m?.title && typeof m.title === 'string' && !isExcluded(m.title)) {
        monthMovieTitlesSet.add(m.title.trim());
      }
    });

    cinemaSessions.forEach(cs => {
      if (cs.title && typeof cs.title === 'string' && !isExcluded(cs.title) && cs.title !== 'Film au cinéma') {
        monthMovieTitlesSet.add(cs.title.trim());
      }
    });

    if (directMonthlyRanking?.rankedTitles) {
      directMonthlyRanking.rankedTitles.forEach(t => {
        if (t && typeof t === 'string' && !isExcluded(t)) {
          monthMovieTitlesSet.add(t.trim());
        }
      });
    }

    const uniqueMonthTitles = Array.from(monthMovieTitlesSet);

    // Résolution du classement : soit direct pour ce mois, soit dérivé de Tfarrej STRICTEMENT pour les films de ce mois
    let monthlyRanking: MonthlyMovieRanking | null = directMonthlyRanking;

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
        const monthTitlesLower = new Set(uniqueMonthTitles.map(t => t.toLowerCase().trim()));
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
      const meta = metadataMap.get((title || '').toLowerCase().trim()) || {};
      return {
        title,
        posterUrl: meta.posterUrl,
        year: meta.year,
        rating: meta.rating,
        watchedInCinema: meta.watchedInCinema,
        cinemaPlace: meta.cinemaPlace,
        viewedAt: meta.viewedAt,
        genres: meta.genres,
      };
    });

    // Fusion intelligente et déduplication des séances de cinéma (visites IRL + films vus en salle)
    duelItems.forEach((m) => {
      if (m.watchedInCinema) {
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

        if (matchedIndex !== -1) {
          const s = cinemaSessions[matchedIndex];
          s.title = m.title;
          s.cinemaPlace = s.cinemaPlace || m.cinemaPlace;
          s.posterUrl = m.posterUrl || s.posterUrl;
          s.date = s.date || (typeof m.viewedAt === 'number' ? m.viewedAt : undefined);
          (s as any).isPlaceholder = false;
        } else {
          cinemaSessions.push({
            title: m.title,
            cinemaPlace: m.cinemaPlace || 'Cinéma',
            date: typeof m.viewedAt === 'number' ? m.viewedAt : undefined,
            posterUrl: m.posterUrl
          });
        }
      }
    });

    // Calculer les comptes par cinéma et le total réel dédupliqué
    cinemaSessions.forEach(s => {
      if (s.cinemaPlace) {
        cinemaCounts[s.cinemaPlace] = (cinemaCounts[s.cinemaPlace] || 0) + 1;
      }
    });
    const totalCinemaOutings = cinemaSessions.length;
    const topCinemaPlace = getTop(cinemaCounts);

    const seriesHistory = [
      ...filterByDate((user as any).seenSeriesData || [], 'viewedAt'),
      ...filterByDate((user as any).seenSeriesHistory || [], 'addedAt')
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
      total: Math.max(duelItems.length, monthlyRanking?.rankedTitles?.length || 0),
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
    const allCinemaTitles = Array.from(new Set(cinemaSessions.map(s => s.title).filter(Boolean)));
    const allCinemaVenues = Array.from(new Set(cinemaSessions.map(s => s.cinemaPlace).filter(Boolean))) as string[];

    // 4. Determine Persona
    const userPersona = getPersona(totalOutings, topCategory?.name || null, totalMovies);

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
        sessions: cinemaSessions
      } : undefined,
      kharjet: kharjetOutings.length > 0 ? {
        total: kharjetOutings.length,
        topSpot: topKharjetPlace?.name || kharjetOutings[0]?.placeName || null,
        topZone: topKharjetZone?.name || null,
        outings: kharjetOutings
      } : undefined,
      totalMovies,
      userPersona
    };

  }, [user, targetDate, placesWithZones]);
}
