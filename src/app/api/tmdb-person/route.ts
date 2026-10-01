import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/tmdb-person?id=123
 * Returns biography, birthday, place_of_birth, known_for_department, profile_path
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'TMDB_API_KEY manquante' }, { status: 500 });

    const res = await fetch(
      `https://api.themoviedb.org/3/person/${id}?api_key=${apiKey}&language=fr-FR`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json({ error: 'Personne non trouvée' }, { status: 404 });

    const data = await res.json();

    return NextResponse.json({
      id: data.id,
      name: data.name,
      biography: data.biography || '',
      birthday: data.birthday || null,
      placeOfBirth: data.place_of_birth || null,
      department: data.known_for_department || null,
      profilePath: data.profile_path
        ? `https://image.tmdb.org/t/p/w300${data.profile_path}`
        : null,
      popularity: data.popularity || 0,
    });
  } catch (err) {
    console.error('tmdb-person error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
