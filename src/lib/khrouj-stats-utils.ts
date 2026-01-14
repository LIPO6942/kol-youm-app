
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

export function getWeekendHQ(visits: VisitLog[] = []): WeekendHQResult {
    if (!visits.length) return null;

    const placeStats: Record<string, { weekend: number; total: number; lastDate: number }> = {};

    visits.forEach(visit => {
        // FILTER: ONLY CAFES
        if (visit.category !== 'Café') return;

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
        // Threshold: Min 2 weekend visits
        if (stats.weekend < 2) return;

        const percentage = (stats.weekend / stats.total) * 100;

        // Definition: Mostly visited on weekends (> 50%)
        if (percentage >= 50) {
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

    const categoryStats: Record<string, {
        count: number;
        places: Record<string, number>;
        lastVisit: number
    }> = {};

    let totalCategorized = 0;

    visits.forEach(visit => {
        let cat = visit.category?.trim() || "Autre";
        // Capitalize
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

        if (!categoryStats[cat]) {
            categoryStats[cat] = { count: 0, places: {}, lastVisit: 0 };
        }

        categoryStats[cat].count += 1;
        categoryStats[cat].places[visit.placeName] = (categoryStats[cat].places[visit.placeName] || 0) + 1;
        if (visit.date > categoryStats[cat].lastVisit) {
            categoryStats[cat].lastVisit = visit.date;
        }
        totalCategorized++;
    });

    const now = Date.now();

    const stats: CategoryStat[] = Object.entries(categoryStats).map(([cat, data]) => {
        // Convert places map to sorted array
        const sortedPlaces = Object.entries(data.places)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3) // Top 3
            .map(([name, count]) => ({ name, count }));

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
