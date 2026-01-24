import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

interface TMDBSearchResult {
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string;
    vote_average?: number;
}

interface SearchResult {
    id: number;
    title: string;
    originalTitle: string;
    year: number | null;
    rating: number;
    posterUrl: string | null;
}

async function searchTMDB(
    query: string,
    language: string,
    type: 'movie' | 'tv' = 'movie',
    year?: number,
    apiKey?: string,
    bearer?: string
): Promise<TMDBSearchResult[]> {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = new URL(`${TMDB_API_BASE}/search/${endpoint}`);
    url.searchParams.set('query', query);
    url.searchParams.set('language', language);
    url.searchParams.set('include_adult', 'false');

    if (year) {
        if (type === 'movie') {
            url.searchParams.set('year', String(year));
        } else {
            url.searchParams.set('first_air_date_year', String(year));
        }
    }

    if (apiKey) url.searchParams.set('api_key', apiKey);

    const headers: Record<string, string> = {};
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

    try {
        const res = await fetch(url.toString(), { headers, cache: 'no-store' });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data?.results) ? data.results : [];
    } catch {
        return [];
    }
}

function normalizeResult(r: TMDBSearchResult): SearchResult {
    const dateStr = r.release_date || r.first_air_date;
    const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : null;
    return {
        id: r.id,
        title: r.title || r.name || r.original_title || r.original_name || 'Sans titre',
        originalTitle: r.original_title || r.original_name || r.title || r.name || 'Sans titre',
        year: !isNaN(year as number) ? year : null,
        rating: Math.round((r.vote_average || 0) * 10) / 10,
        posterUrl: r.poster_path ? `${TMDB_IMAGE_BASE}/w92${r.poster_path}` : null,
    };
}

export async function GET(req: NextRequest) {
    try {
        const apiKey = process.env.TMDB_API_KEY;
        const bearer = process.env.TMDB_BEARER;

        if (!apiKey && !bearer) {
            return NextResponse.json(
                { error: 'TMDB credentials missing' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || '';
        const type = (searchParams.get('type') as 'movie' | 'tv') || 'movie';
        const yearParam = searchParams.get('year');
        const year = yearParam ? parseInt(yearParam, 10) : undefined;

        console.log(`TMDb search request: type=${type}, query="${query}"`);

        if (!query.trim()) {
            return NextResponse.json({ results: [] });
        }

        // Search in both French and English in parallel
        const [frResults, enResults] = await Promise.all([
            searchTMDB(query, 'fr-FR', type, year, apiKey, bearer),
            searchTMDB(query, 'en-US', type, year, apiKey, bearer),
        ]);

        // Merge and deduplicate by ID
        const seen = new Set<number>();
        const merged: SearchResult[] = [];

        // Prioritize French results first
        for (const r of frResults) {
            if (!seen.has(r.id)) {
                seen.add(r.id);
                merged.push(normalizeResult(r));
            }
        }

        // Add English results that weren't in French
        for (const r of enResults) {
            if (!seen.has(r.id)) {
                seen.add(r.id);
                merged.push(normalizeResult(r));
            }
        }

        // Limit to top 20 results
        const limitedResults = merged.slice(0, 20);

        return NextResponse.json({ results: limitedResults });
    } catch (error: any) {
        console.error('TMDb search error:', error);
        return NextResponse.json(
            { error: error?.message || 'Search failed' },
            { status: 500 }
        );
    }
}
