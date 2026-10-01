import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tmdb-person-credits?id={personId}&type=movie|tv
 * Retourne les 10 films/séries les plus notables de la personne
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';

  if (!id) {
    return NextResponse.json({ error: 'id manquant' }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TMDB_API_KEY manquante' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/person/${id}/combined_credits?api_key=${apiKey}&language=fr-FR`,
      { headers: { Accept: 'application/json' } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur TMDB' }, { status: res.status });
    }

    const data = await res.json();

    // Combiner cast + crew (réalisateur), dédupliquer par id
    const allCredits = [
      ...(data.cast || []),
      ...(data.crew || []).filter((c: any) => c.job === 'Director' || c.job === 'Creator'),
    ];

    const seen = new Set<number>();
    const unique = allCredits.filter((c: any) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    // Filtrer : poster requis + vote_count significatif
    const filtered = unique
      .filter((c: any) => c.poster_path && c.vote_count > 50)
      .sort((a: any, b: any) => b.popularity - a.popularity)
      .slice(0, 10);

    const credits = filtered.map((c: any) => ({
      id: c.id,
      title: c.title || c.name,
      year: c.release_date
        ? new Date(c.release_date).getFullYear()
        : c.first_air_date
        ? new Date(c.first_air_date).getFullYear()
        : null,
      posterPath: c.poster_path
        ? `https://image.tmdb.org/t/p/w185${c.poster_path}`
        : null,
      voteAverage: c.vote_average ? Math.round(c.vote_average * 10) / 10 : null,
      mediaType: c.media_type || type,
      character: c.character || null,
      job: c.job || null,
    }));

    return NextResponse.json({ credits });
  } catch (err) {
    console.error('tmdb-person-credits error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
