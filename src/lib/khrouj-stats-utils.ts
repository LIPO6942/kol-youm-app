
import { VisitLog, PlaceItem } from "./firebase/firestore";

export type WeekendHQResult = {
    placeName: string;
    weekendVisits: number;
    totalVisits: number;
    percentage: number;
    lastVisitDate: number;
} | null;

export type CategoryStat = {
    category: string;
    count: number;
    percentage: number;
    topPlaces: { name: string; count: number; specialties: string[] }[];
    lastVisit: number;
    // For insights
    daysSinceLastVisit: number;
};

export type CategoryFrequency = {
    category: string;
    averageDays: number;
    count: number;
    lastVisit: number;
};

export type PeriodStats = {
    totalVisits: number;
    byCategory: Record<string, number>;
    averageDaysByCategory: Record<string, number>; // avg days between visits for this cat
    favoriteDay?: string; // New: Name of the most frequent day (e.g., "Samedi")
    monthlyTrend?: {
        value: number; // Percentage
        isIncrease: boolean;
        diff: number; // Raw difference
    };
};

// Helper: Normalize strings for comparsion
const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export function getAvailableYears(): number[] {
    const currentYear = new Date().getFullYear();
    const startYear = 2026;

    // We want current year and up to 2 previous years, but never before 2026
    const years: number[] = [];
    for (let y = currentYear; y >= Math.max(startYear, currentYear - 2); y--) {
        years.push(y);
    }
    return years.sort((a, b) => a - b);
}

const CUISINE_MAP: Record<string, string[]> = {
    'Tunisien': ['lablebi', 'kefteji', 'mloukhia', 'couscous', 'brik', 'fricasse', 'chapati', 'ma9loub', 'makloub', 'baguette farcie', 'libanais', 'chawarma', 'sahn tounsi', 'ojja', 'tunisien', 'tunisian'],
    'Thaïlandaise': ['thai', 'pad thai', 'tom yum', 'curry vert', 'massaman', 'som tam'],
    'Japonaise': ['sushi', 'ramen', 'maki', 'sashimi', 'tempura', 'yakitori', 'takoyaki', 'wasabi', 'jap', 'gyoza', 'tonkatsu'],
    'Chinoise': ['chinois', 'chinese', 'nem', 'riz cantonnais', 'wok', 'dim sum', 'canard laque', 'bao', 'spring rolls'],
    'Italien': ['pizza', 'pates', 'pasta', 'lasagne', 'risotto', 'tiramisu', 'spaghetti', 'italien', 'italian', 'ciabatta', 'ciabata', 'tchabatta', 'tchabata', 'tiabatta', 'tiabata', 'panuzzo', 'panuzo', 'pannuzzo', 'pannozo', 'panuozzo', 'panuzio'],
    'Américain': ['burger', 'cheeseburger', 'fries', 'hot dog', 'wings', 'nuggets', 'milkshake', 'fast food', 'fast-food', 'americain', 'american', 'brunch', 'pancake', 'bagel'],
    'Français': ['crepe', 'croissant', 'omelette', 'quiche', 'fromage', 'baguette', 'francais', 'french', 'raclette', 'fondue', 'tartiflette', 'bistro', 'steak frites'],
    'Mexicain': ['tacos', 'burrito', 'quesadilla', 'fajita', 'nachos', 'guacamole', 'mexicain', 'mexican', 'chili'],
};

function detectCuisine(visit: VisitLog): string | null {
    const item = normalize(visit.orderedItem || "");
    const possibleCats = (visit.possibleCategories || []).map(normalize);
    const cat = normalize(visit.category || "");

    // 0. Explicit exclusion/skip for "Café" (handled in QG, not Passport)
    if (cat.includes('cafe')) return null;

    // 1. Check Ordered Item Keywords
    for (const [cuisine, keywords] of Object.entries(CUISINE_MAP)) {
        if (keywords.some(k => item.includes(k))) return cuisine;
    }

    // 2. Check Category Explicitly
    for (const [cuisine, keywords] of Object.entries(CUISINE_MAP)) {
        if (keywords.some(k => cat.includes(k) || possibleCats.some(pc => pc.includes(k)))) {
            return cuisine;
        }
    }

    // 3. Fallbacks
    if (cat.includes('fast-food') || cat.includes('fast food')) return 'Américain';
    if (cat.includes('brunch')) return 'Américain'; // Broad generalization, but effective for cleaning data

    return null; // Return null if it's just "Restaurant" with no info, or "Café"
}

export function getVisitFrequencies(visits: VisitLog[] = []): CategoryFrequency[] {
    if (!visits.length) return [];

    const visitsByCategory: Record<string, number[]> = {};

    visits.forEach(v => {
        if (!visitsByCategory[v.category]) {
            visitsByCategory[v.category] = [];
        }
        visitsByCategory[v.category].push(v.date);
    });

    const frequencies: CategoryFrequency[] = Object.entries(visitsByCategory)
        .map(([category, dates]) => {
            const sortedDates = dates.sort((a, b) => a - b);
            const count = sortedDates.length;
            const lastVisit = sortedDates[count - 1];

            if (count < 2) {
                return { category, averageDays: 0, count, lastVisit };
            }

            const totalDays = (sortedDates[count - 1] - sortedDates[0]) / (1000 * 60 * 60 * 24);
            const averageDays = totalDays / (count - 1);

            return { category, averageDays: Math.round(averageDays), count, lastVisit };
        })
        .filter(f => f.averageDays > 0);

    return frequencies.sort((a, b) => a.averageDays - b.averageDays);
}


export function getWeeklyHeatmap(visits: VisitLog[] = []): number[] {
    const days = new Array(7).fill(0);
    visits.forEach(v => {
        const day = new Date(v.date).getDay();
        // Convert to 0=Mon, 6=Sun (Standard for heatmaps usually starts with Mon)
        const adjustedDay = (day + 6) % 7;
        days[adjustedDay]++;
    });
    return days;
}

export function getMonthlyHeatmap(visits: VisitLog[] = [], year?: number): number[] {
    const targetYear = year || new Date().getFullYear();
    const intensity = new Array(12).fill(0);

    visits.forEach(v => {
        const d = new Date(v.date);
        if (d.getFullYear() === targetYear) {
            intensity[d.getMonth()]++;
        }
    });

    return intensity;
}

export function getYearlyHeatmap(visits: VisitLog[] = [], year?: number): number[] {
    const targetYear = year || new Date().getFullYear();

    const intensity = new Array(12).fill(0);

    visits.forEach(v => {
        const d = new Date(v.date);
        if (d.getFullYear() === targetYear) {
            intensity[d.getMonth()]++;
        }
    });

    return intensity;
}

export function getStatsForPeriod(visits: VisitLog[] = [], period: 'month' | 'year', specificMonth?: number, year?: number): PeriodStats {
    const now = new Date();
    const currentYear = now.getFullYear();
    const targetYear = year !== undefined ? year : currentYear;
    const targetMonth = specificMonth !== undefined ? specificMonth : now.getMonth();

    const filtered = visits.filter(v => {
        const d = new Date(v.date);
        if (period === 'month') {
            return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        }
        return d.getFullYear() === targetYear;
    });

    const byCategory: Record<string, number> = {};
    const categoryDates: Record<string, number[]> = {};

    filtered.forEach(v => {
        byCategory[v.category] = (byCategory[v.category] || 0) + 1;
        if (!categoryDates[v.category]) categoryDates[v.category] = [];
        categoryDates[v.category].push(v.date);
    });

    // Calculate Average Days per category
    const averageDaysByCategory: Record<string, number> = {};
    Object.entries(categoryDates).forEach(([cat, dates]) => {
        if (dates.length < 2) {
            // For small data or single visits in a month, estimate based on period length
            const daysInTarget = period === 'month' ? 30 : 365;
            averageDaysByCategory[cat] = Math.round(daysInTarget / dates.length);
        } else {
            const sorted = dates.sort((a, b) => a - b);
            const totalDays = (sorted[sorted.length - 1] - sorted[0]) / (1000 * 60 * 60 * 24);
            averageDaysByCategory[cat] = Math.max(1, Math.round(totalDays / (dates.length - 1)));
        }
    });

    // Calculate Favorite Day
    const dayCounts = new Array(7).fill(0);
    filtered.forEach(v => {
        const day = new Date(v.date).getDay();
        dayCounts[day]++;
    });

    let maxVisitsOnDay = -1;
    let favoriteDayIdx = -1;
    dayCounts.forEach((count, idx) => {
        if (count > maxVisitsOnDay && count > 0) {
            maxVisitsOnDay = count;
            favoriteDayIdx = idx;
        }
    });

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const favoriteDay = favoriteDayIdx !== -1 ? dayNames[favoriteDayIdx] : undefined;

    // Calculate Monthly Trend
    let monthlyTrend: { value: number; isIncrease: boolean; diff: number } | undefined;
    if (period === 'month') {
        const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
        const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;

        const prevMonthVisits = visits.filter(v => {
            const d = new Date(v.date);
            return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        }).length;

        const diff = filtered.length - prevMonthVisits;
        if (prevMonthVisits > 0) {
            const percentage = Math.round((diff / prevMonthVisits) * 100);
            monthlyTrend = {
                value: Math.abs(percentage),
                isIncrease: diff > 0,
                diff
            };
        } else if (filtered.length > 0) {
            // If previous month had 0 and this one has visits, it's 100% since it's a new activity
            monthlyTrend = {
                value: 100,
                isIncrease: true,
                diff
            };
        }
    }

    const stats: PeriodStats = {
        totalVisits: filtered.length,
        byCategory,
        averageDaysByCategory,
        favoriteDay,
        monthlyTrend
    };

    return stats;
}

export function getWeekendHQ(visits: VisitLog[] = []): WeekendHQResult {
    if (!visits.length) return null;

    const placeStats: Record<string, { weekend: number; total: number; lastDate: number }> = {};

    visits.forEach(visit => {
        // FILTER: ONLY CAFES (Robust Check)
        const cat = normalize(visit.category || "");
        if (!cat.includes('cafe')) return;

        const date = new Date(visit.date);
        const day = date.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = day === 0 || day === 6;

        const placeLower = visit.placeName.trim();

        if (!placeStats[placeLower]) {
            placeStats[placeLower] = { weekend: 0, total: 0, lastDate: 0 };
        }

        placeStats[placeLower].total += 1;
        if (isWeekend) {
            placeStats[placeLower].weekend += 1;
        }
        if (visit.date > placeStats[placeLower].lastDate) {
            placeStats[placeLower].lastDate = visit.date;
        }
    });

    let bestHQ: WeekendHQResult = null;

    Object.entries(placeStats).forEach(([name, stats]) => {
        // Lower threshold to 1 for small datasets to show SOMETHING
        if (stats.weekend < 1) return;

        const percentage = (stats.weekend / stats.total) * 100;

        // Definition: Mostly visited on weekends (> 40% allows for some flexibility)
        if (percentage >= 40) {
            if (!bestHQ || stats.weekend > bestHQ.weekendVisits) {
                bestHQ = {
                    placeName: name,
                    weekendVisits: stats.weekend,
                    totalVisits: stats.total,
                    percentage: Math.round(percentage),
                    lastVisitDate: stats.lastDate
                };
            }
        }
    });

    return bestHQ;
}


export function getCulinaryPassport(visits: VisitLog[] = []): CategoryStat[] {
    if (!visits.length) return [];

    const cuisineStats: Record<string, {
        count: number;
        places: Record<string, { count: number; items: Record<string, number> }>;
        lastVisit: number
    }> = {};

    let totalCategorized = 0;

    visits.forEach(visit => {
        // Detect Cuisine/Nation
        const cuisine = detectCuisine(visit);

        if (!cuisine) return; // Skip if unrecognized or Cafe

        if (!cuisineStats[cuisine]) {
            cuisineStats[cuisine] = { count: 0, places: {}, lastVisit: 0 };
        }

        cuisineStats[cuisine].count += 1;

        if (!cuisineStats[cuisine].places[visit.placeName]) {
            cuisineStats[cuisine].places[visit.placeName] = { count: 0, items: {} };
        }

        cuisineStats[cuisine].places[visit.placeName].count += 1;

        if (visit.orderedItem) {
            const item = visit.orderedItem.trim();
            cuisineStats[cuisine].places[visit.placeName].items[item] = (cuisineStats[cuisine].places[visit.placeName].items[item] || 0) + 1;
        }

        if (visit.date > cuisineStats[cuisine].lastVisit) {
            cuisineStats[cuisine].lastVisit = visit.date;
        }
        totalCategorized++;
    });

    const now = Date.now();

    const stats: CategoryStat[] = Object.entries(cuisineStats).map(([cat, data]) => {
        // Convert places map to sorted array
        const sortedPlaces = Object.entries(data.places)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3) // Top 3
            .map(([name, placeData]) => {
                // Get top 2 specialties for this place
                const specialties = Object.entries(placeData.items)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([itemName]) => itemName);

                return {
                    name,
                    count: placeData.count,
                    specialties
                };
            });

        const daysSinceLastVisit = Math.floor((now - data.lastVisit) / (1000 * 60 * 60 * 24));

        return {
            category: cat,
            count: data.count,
            percentage: totalCategorized > 0 ? Math.round((data.count / totalCategorized) * 100) : 0,
            topPlaces: sortedPlaces,
            lastVisit: data.lastVisit,
            daysSinceLastVisit
        };
    });

    return stats.sort((a, b) => b.count - a.count);
}
