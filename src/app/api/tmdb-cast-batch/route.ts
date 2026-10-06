import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CastMember {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
  order: number; // position in credits (0 = top-billed)
}

interface TitleCredit {
  title: string;
  cast: CastMember[];
  director?: { id: number; name: string; profilePath?: string };
  countryCode?: string;
}

/**
 * POST /api/tmdb-cast-batch
 * Body: { titles: string[], type: 'movie' | 'tv' }
 * Returns: credits per title (cast + director)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { titles, type = 'movie' } = body as { titles: string[]; type: 'movie' | 'tv' };

    if (!titles?.length) {
      return NextResponse.json({ results: {} });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB_API_KEY manquante' }, { status: 500 });
    }

    const endpoint = type === 'tv' ? 'tv' : 'movie';
    const results: Record<string, TitleCredit> = {};

    // Traiter jusqu'aux 100 premiers films par lots de 10 pour respecter les limites TMDB
    const targetTitles = titles.slice(0, 100);
    const CHUNK_SIZE = 10;

    for (let i = 0; i < targetTitles.length; i += CHUNK_SIZE) {
      const chunk = targetTitles.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (title) => {
          try {
            // 1. Search
            const searchRes = await fetch(
              `https://api.themoviedb.org/3/search/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=fr-FR`,
              { headers: { Accept: 'application/json' } }
            );
            if (!searchRes.ok) return;
            const searchData = await searchRes.json();
            const item = searchData.results?.[0];
            if (!item) return;

            // 2. Fetch credits
            const creditsRes = await fetch(
              `https://api.themoviedb.org/3/${endpoint}/${item.id}/credits?api_key=${apiKey}&language=fr-FR`,
              { headers: { Accept: 'application/json' } }
            );
            if (!creditsRes.ok) return;
            const creditsData = await creditsRes.json();

            // Cast members (jusqu'aux 6 premiers avec leur position exacte order)
            const cast: CastMember[] = (creditsData.cast || [])
              .slice(0, 6)
              .map((m: any) => ({
                id: m.id,
                name: m.name,
                character: m.character,
                profilePath: m.profile_path
                  ? `https://image.tmdb.org/t/p/w185${m.profile_path}`
                  : undefined,
                order: m.order ?? 99,
              }));

            // Director from crew
            const director = (creditsData.crew || []).find(
              (c: any) => c.job === 'Director' || c.job === 'Creator'
            );

            // Origin country from TMDB search result (TV ou Film)
            let countryCode: string | undefined = undefined;
            if (Array.isArray(item.origin_country) && item.origin_country.length > 0) {
              countryCode = String(item.origin_country[0]).toUpperCase();
            } else if (item.original_language) {
              const langMap: Record<string, string> = {
                en: 'US',
                fr: 'FR',
                ko: 'KR',
                ja: 'JP',
                es: 'ES',
                it: 'IT',
                de: 'DE',
                ar: 'TN',
                hi: 'IN',
                tr: 'TR',
                pt: 'BR',
                da: 'DK',
                sv: 'SE',
                no: 'NO',
                zh: 'CN',
                cn: 'HK',
                ru: 'RU',
                pl: 'PL',
              };
              countryCode = langMap[item.original_language] || undefined;
            }

            results[title] = {
              title,
              cast,
              director: director
                ? {
                    id: director.id,
                    name: director.name,
                    profilePath: director.profile_path
                      ? `https://image.tmdb.org/t/p/w185${director.profile_path}`
                      : undefined,
                  }
                : undefined,
              countryCode,
            };
          } catch {
            // Skip individual title errors silently
          }
        })
      );
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('tmdb-cast-batch error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
