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

    // Rechercher le lien Wikipedia correct
    let wikipediaUrl = '';
    try {
      // Utiliser l'API Wikipedia pour trouver la page correcte
      const wikiSearchResponse = await fetch(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(details.title)}_${new Date(details.release_date).getFullYear()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (wikiSearchResponse.ok) {
        const wikiData = await wikiSearchResponse.json();
        wikipediaUrl = wikiData.content_urls?.desktop?.page || '';
      }

      // Si la recherche avec année ne fonctionne pas, essayer sans année
      if (!wikipediaUrl) {
        const wikiSearchResponse2 = await fetch(
          `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(details.title)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (wikiSearchResponse2.ok) {
          const wikiData2 = await wikiSearchResponse2.json();
          // Vérifier si c'est bien un film (contient "film" dans la description ou le titre)
          if (wikiData2.description?.toLowerCase().includes('film') || 
              wikiData2.title?.toLowerCase().includes('film')) {
            wikipediaUrl = wikiData2.content_urls?.desktop?.page || '';
          }
        }
      }
    } catch (error) {
      console.log('Erreur lors de la recherche Wikipedia:', error);
      // Fallback: utiliser le lien de recherche Wikipedia
      wikipediaUrl = `https://fr.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(details.title + ' film')}`;
    }

    // Formater les données pour le retour
    const formattedMovie = {
      id: details.id,
      title: details.title,
      year: new Date(details.release_date).getFullYear(),
      rating: details.vote_average ? Math.round(details.vote_average * 10) / 10 : undefined,
      synopsis: details.overview || 'Synopsis non disponible.',
      country: details.production_countries?.[0]?.name || 'Inconnu',
      wikipediaUrl: wikipediaUrl,
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
