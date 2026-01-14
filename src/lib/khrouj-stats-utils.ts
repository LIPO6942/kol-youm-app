
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

// Helper: Normalize strings for comparsion
const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const CUISINE_MAP: Record<string, string[]> = {
    'Tunisien': ['lablebi', 'kefteji', 'mloukhia', 'couscous', 'brik', 'fricasse', 'chapati', 'ma9loub', 'makloub', 'baguette farcie', 'libanais', 'chawarma', 'sahn tounsi', 'ojja', 'tunisien', 'tunisian'],
    'Thaïlandaise': ['thai', 'pad thai', 'tom yum', 'curry vert', 'massaman', 'som tam'],
    'Japonaise': ['sushi', 'ramen', 'maki', 'sashimi', 'tempura', 'yakitori', 'takoyaki', 'wasabi', 'jap', 'gyoza', 'tonkatsu'],
    'Chinoise': ['chinois', 'chinese', 'nem', 'riz cantonnais', 'wok', 'dim sum', 'canard laque', 'bao', 'spring rolls'],
    'Italien': ['pizza', 'pates', 'pasta', 'lasagne', 'risotto', 'tiramisu', 'spaghetti', 'italien', 'italian'],
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
