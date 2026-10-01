import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tmdb-trending?type=movie|tv
 * Retourne les 10 films ou séries tendances de la semaine
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'movie';

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TMDB_API_KEY manquante' }, { status: 500 });
  }

  try {
    const endpoint = type === 'tv' ? 'tv' : 'movie';
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/${endpoint}/week?api_key=${apiKey}&language=fr-FR`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur TMDB' }, { status: res.status });
    }

    const data = await res.json();

    const results = (data.results || []).slice(0, 12).map((item: any) => ({
      id: item.id,
      title: item.title || item.name,
      posterPath: item.poster_path
        ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
        : null,
      backdropPath: item.backdrop_path
        ? `https://image.tmdb.org/t/p/w300${item.backdrop_path}`
        : null,
      voteAverage: item.vote_average ? Math.round(item.vote_average * 10) / 10 : null,
      year: item.release_date
        ? new Date(item.release_date).getFullYear()
        : item.first_air_date
        ? new Date(item.first_air_date).getFullYear()
        : null,
      mediaType: item.media_type || endpoint,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error('tmdb-trending error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
