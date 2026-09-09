import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "L'identifiant de collection est requis" }, { status: 400 });
    }

    const apiKey = process.env.TMDB_API_KEY;
    const bearer = process.env.TMDB_BEARER;

    if (!apiKey && !bearer) {
      return NextResponse.json({ error: 'TMDB credentials missing' }, { status: 500 });
    }

    const url = new URL(`${TMDB_API_BASE}/collection/${id}`);
    url.searchParams.set('language', 'fr-FR');
    if (apiKey) url.searchParams.set('api_key', apiKey);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

    const res = await fetch(url.toString(), { headers, next: { revalidate: 3600 } });
    if (!res.ok) {
      return NextResponse.json({ error: 'Collection non trouvée sur TMDb' }, { status: res.status });
    }

    const data = await res.json();

    const parts = (Array.isArray(data.parts) ? data.parts : [])
      .map((p: any) => {
        const year = p.release_date ? parseInt(p.release_date.substring(0, 4), 10) : null;
        return {
          id: p.id,
          title: p.title || p.original_title || 'Sans titre',
          originalTitle: p.original_title || p.title || '',
          year: !isNaN(year as number) ? year : null,
          releaseDate: p.release_date || '',
          rating: p.vote_average ? Math.round(p.vote_average * 10) / 10 : 0,
          synopsis: p.overview || '',
          posterUrl: p.poster_path ? `${TMDB_IMAGE_BASE}/w500${p.poster_path}` : null,
          backdropUrl: p.backdrop_path ? `${TMDB_IMAGE_BASE}/original${p.backdrop_path}` : null,
        };
      })
      .sort((a: any, b: any) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate);
      });

    return NextResponse.json({
      success: true,
      collection: {
        id: data.id,
        name: data.name || 'Saga sans nom',
        overview: data.overview || '',
        posterUrl: data.poster_path ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}` : null,
        backdropUrl: data.backdrop_path ? `${TMDB_IMAGE_BASE}/original${data.backdrop_path}` : null,
        parts,
      },
    });
  } catch (error: any) {
    console.error('Erreur API tmdb-collection:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération de la collection' },
      { status: 500 }
    );
  }
}
