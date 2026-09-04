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

interface ResolvedPoster {
    posterUrl: string | null;
    year: number | null;
    rating: number | null;
    id: number | null;
}

async function searchSingleMovie(
    query: string,
    type: 'movie' | 'tv',
    apiKey?: string,
    bearer?: string
): Promise<ResolvedPoster | null> {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    const headers: Record<string, string> = {};
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

    // 1. Try French first, then English fallback
    const languages = ['fr-FR', 'en-US'];
    for (const lang of languages) {
        try {
            const url = new URL(`${TMDB_API_BASE}/search/${endpoint}`);
            url.searchParams.set('query', cleanQuery);
            url.searchParams.set('language', lang);
            url.searchParams.set('include_adult', 'false');
            if (apiKey) url.searchParams.set('api_key', apiKey);

            const res = await fetch(url.toString(), { headers, cache: 'no-store' });
            if (!res.ok) continue;
            const data = await res.json();
            const results: TMDBSearchResult[] = data?.results || [];

            if (results.length > 0) {
                // Find first result with a poster, or fallback to first result
                const withPoster = results.find(r => Boolean(r.poster_path)) || results[0];
                const dateStr = withPoster.release_date || withPoster.first_air_date;
                const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) : null;

                return {
                    id: withPoster.id,
                    posterUrl: withPoster.poster_path ? `${TMDB_IMAGE_BASE}/w500${withPoster.poster_path}` : null,
                    year: !isNaN(year as number) ? year : null,
                    rating: withPoster.vote_average ? Math.round(withPoster.vote_average * 10) / 10 : null,
                };
            }
        } catch (e) {
            console.warn(`Error searching TMDb for "${cleanQuery}" (${lang}):`, e);
        }
    }

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.TMDB_API_KEY;
        const bearer = process.env.TMDB_BEARER;

        if (!apiKey && !bearer) {
            return NextResponse.json(
                { error: 'TMDB credentials missing' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { titles, type = 'movie' } = body;

        if (!Array.isArray(titles) || titles.length === 0) {
            return NextResponse.json({ posters: {} });
        }

        const uniqueTitles = Array.from(new Set(titles.map((t: string) => String(t || '').trim()))).filter(Boolean);
        const posters: Record<string, ResolvedPoster> = {};

        // Process in chunks of 5 parallel requests to remain fast and safe
        const CHUNK_SIZE = 5;
        for (let i = 0; i < uniqueTitles.length; i += CHUNK_SIZE) {
            const chunk = uniqueTitles.slice(i, i + CHUNK_SIZE);
            await Promise.all(
                chunk.map(async (title) => {
                    const result = await searchSingleMovie(title, type, apiKey, bearer);
                    if (result) {
                        posters[title] = result;
                    }
                })
            );
        }

        return NextResponse.json({ success: true, posters });
    } catch (error: any) {
        console.error('Error in posters-batch API:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to fetch posters batch' },
            { status: 500 }
        );
    }
}
