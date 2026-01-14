
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
    topPlaces: { name: string; count: number }[];
    lastVisit: number;
    // For insights
    daysSinceLastVisit: number;
};

// Helper: Normalize strings for comparsion
const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const CUISINE_MAP: Record<string, string[]> = {
    'Tunisien': ['lablebi', 'kefteji', 'mloukhia', 'couscous', 'brik', 'fricasse', 'chapati', 'ma9loub', 'makloub', 'baguette farcie', 'libanais', 'chawarma', 'sahn tounsi', 'ojja'],
    'Italien': ['pizza', 'pates', 'pasta', 'lasagne', 'risotto', 'tiramisu', 'spaghetti'],
    'Américain': ['burger', 'cheeseburger', 'fries', 'hot dog', 'wings', 'nuggets', 'milkshake'],
    'Asiatique': ['sushi', 'ramen', 'noodles', 'wok', 'chinois', 'thai', 'nem', 'riz cantonnais'],
    'Français': ['crepe', 'croissant', 'omelette', 'quiche', 'fromage', 'baguette'],
    'Café': ['cafe', 'coffee', 'capucin', 'express', 'the', 'jus', 'croissant'], // Fallback for cafes
};

function detectCuisine(visit: VisitLog): string {
    const item = normalize(visit.orderedItem || "");
    const possibleCats = (visit.possibleCategories || []).map(normalize);
    const cat = normalize(visit.category || "");

    // 1. Check Ordered Item Keywords
    for (const [cuisine, keywords] of Object.entries(CUISINE_MAP)) {
        if (keywords.some(k => item.includes(k))) return cuisine;
    }

    // 2. Check Category Explicitly
    // Add exact matches if your categories are already "Italien", etc.
    const cuisineNames = Object.keys(CUISINE_MAP).map(normalize);
    for (const c of cuisineNames) {
        if (cat.includes(c) || possibleCats.some(pc => pc.includes(c))) {
            // Find original key
            return Object.keys(CUISINE_MAP).find(k => normalize(k) === c) || c;
        }
    }

    // 3. Special Case: Fast Food often implies Tunisian/American depending on context,
    // but without specific item we might default to broader category or keep original.

    // If no specific cuisine detected, return original category formatted
    return visit.category ? (visit.category.charAt(0).toUpperCase() + visit.category.slice(1)) : "Autre";
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
        places: Record<string, number>;
        lastVisit: number
    }> = {};

    let totalCategorized = 0;

    visits.forEach(visit => {
        // Detect Cuisine/Nation instead of just Category
        const cuisine = detectCuisine(visit);

        // Skip "Café" from Culinary Passport? Usually yes, it's about food.
        // Or keep it if user wants to see "Café" as a slice.
        // If user explicitly asked for "Nationnalités", Café might be separate.
        // But let's keep it for completeness unless it overwhelms.

        if (!cuisineStats[cuisine]) {
            cuisineStats[cuisine] = { count: 0, places: {}, lastVisit: 0 };
        }

        cuisineStats[cuisine].count += 1;
        cuisineStats[cuisine].places[visit.placeName] = (cuisineStats[cuisine].places[visit.placeName] || 0) + 1;
        if (visit.date > cuisineStats[cuisine].lastVisit) {
            cuisineStats[cuisine].lastVisit = visit.date;
        }
        totalCategorized++;
    });

    const now = Date.now();

    const stats: CategoryStat[] = Object.entries(cuisineStats).map(([cat, data]) => {
        // Convert places map to sorted array
        const sortedPlaces = Object.entries(data.places)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3) // Top 3
            .map(([name, count]) => ({ name, count }));

        const daysSinceLastVisit = Math.floor((now - data.lastVisit) / (1000 * 60 * 60 * 24));

        return {
            category: cat, // Now this is "Italien", "Tunisien", etc.
            count: data.count,
            percentage: totalCategorized > 0 ? Math.round((data.count / totalCategorized) * 100) : 0,
            topPlaces: sortedPlaces,
            lastVisit: data.lastVisit,
            daysSinceLastVisit
        };
    });

    return stats.sort((a, b) => b.count - a.count);
}
