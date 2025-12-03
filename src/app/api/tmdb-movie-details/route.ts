import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Le titre du film est requis' },
        { status: 400 }
      );
    }

    console.log('Recherche des détails pour:', title);

    // Appel à l'API TMDB pour rechercher le film
    const searchResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=fr-FR`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error('Erreur lors de la recherche du film');
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json(
        { error: 'Film non trouvé' },
        { status: 404 }
      );
    }

    // Prendre le premier résultat (le plus pertinent)
    const movie = searchData.results[0];

    // Récupérer les détails complets du film
    const detailsResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!detailsResponse.ok) {
      throw new Error('Erreur lors de la récupération des détails du film');
    }

    const details = await detailsResponse.json();

    // Formater les données pour le retour
    const formattedMovie = {
      id: details.id,
      title: details.title,
      year: new Date(details.release_date).getFullYear(),
      rating: details.vote_average ? Math.round(details.vote_average * 10) / 10 : undefined,
      synopsis: details.overview || 'Synopsis non disponible.',
      country: details.production_countries?.[0]?.name || 'Inconnu',
      wikipediaUrl: `https://fr.wikipedia.org/wiki/${encodeURIComponent(details.title.replace(/\s+/g, '_'))}`,
      actors: [], // Pourrait être ajouté avec un autre appel API
    };

    console.log('Dét trouvés pour:', title, formattedMovie);

    return NextResponse.json({ 
      success: true,
      movie: formattedMovie 
    });

  } catch (error: any) {
    console.error('Erreur lors de la récupération des détails du film:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération des détails du film' },
      { status: 500 }
    );
  }
}
