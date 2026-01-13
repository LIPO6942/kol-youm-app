
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
};

export function getWeekendHQ(visits: VisitLog[] = []): WeekendHQResult {
    if (!visits.length) return null;

    const placeStats: Record<string, { weekend: number; total: number; lastDate: number }> = {};

    visits.forEach(visit => {
        const date = new Date(visit.date);
        const day = date.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = day === 0 || day === 6;

        const placeLower = visit.placeName.trim(); // Normalize simply by trim, can be more robust if needed

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
        // Threshold: Must have at least 2 weekend visits and predominantly weekend (e.g. > 50%)
        // Adjust threshold as needed. For small data, even 1 might be enough, but let's say minimum 2 total visits.
        if (stats.total < 2) return;

        const percentage = (stats.weekend / stats.total) * 100;

        // Definition of "Weekend HQ": Mostly visited on weekends (> 50%)
        if (percentage >= 50 && stats.weekend > 0) {
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

    const categoryCounts: Record<string, number> = {};
    let totalCategorized = 0;

    visits.forEach(visit => {
        // Fallback for empty category? "Autre"?
        // normalize category
        let cat = visit.category?.trim() || "Autre";
        // Capitalize first letter
        cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();

        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        totalCategorized++;
    });

    const stats: CategoryStat[] = Object.entries(categoryCounts).map(([cat, count]) => ({
        category: cat,
        count,
        percentage: totalCategorized > 0 ? Math.round((count / totalCategorized) * 100) : 0
    }));

    // Sort by count desc
    return stats.sort((a, b) => b.count - a.count);
}
