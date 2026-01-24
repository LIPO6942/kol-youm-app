import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, type = 'movie' } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Le titre est requis' },
        { status: 400 }
      );
    }

    const endpoint = type === 'movie' ? 'movie' : 'tv';
    console.log(`Recherche des détails pour ${type}:`, title);

    // Appel à l'API TMDB pour rechercher le film/série
    const searchResponse = await fetch(
      `https://api.themoviedb.org/3/search/${endpoint}?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=fr-FR`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Erreur lors de la recherche du ${type === 'movie' ? 'film' : 'de la série'}`);
    }

    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json(
        { error: `${type === 'movie' ? 'Film' : 'Série'} non trouvé${type === 'tv' ? 'e' : ''}` },
        { status: 404 }
      );
    }

    // Prendre le premier résultat (le plus pertinent)
    const item = searchData.results[0];

    // Récupérer les détails complets
    const detailsResponse = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${item.id}?api_key=${process.env.TMDB_API_KEY}&language=fr-FR`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!detailsResponse.ok) {
      throw new Error(`Erreur lors de la récupération des détails ${type === 'movie' ? 'du film' : 'de la série'}`);
    }

    const details = await detailsResponse.json();
    const itemTitle = details.title || details.name;
    const dateStr = details.release_date || details.first_air_date;
    const year = dateStr ? new Date(dateStr).getFullYear() : null;

    // Rechercher le lien Wikipedia correct
    let wikipediaUrl = '';
    const wikiTerm = type === 'movie' ? 'film' : 'série télévisée';
    try {
      // Utiliser l'API Wikipedia pour trouver la page correcte
      const wikiQuery = year ? `${itemTitle}_(${year})` : itemTitle;
      const wikiSearchResponse = await fetch(
        `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`,
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

      // Si la recherche spécifique ne fonctionne pas, essayer le titre seul
      if (!wikipediaUrl) {
        const wikiSearchResponse2 = await fetch(
          `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(itemTitle)}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (wikiSearchResponse2.ok) {
          const wikiData2 = await wikiSearchResponse2.json();
          // Vérifier si c'est bien le bon type
          const desc = (wikiData2.description || '').toLowerCase();
          const titleLow = (wikiData2.title || '').toLowerCase();
          if (desc.includes(wikiTerm) || titleLow.includes(wikiTerm) || desc.includes('série') || desc.includes('émission')) {
            wikipediaUrl = wikiData2.content_urls?.desktop?.page || '';
          }
        }
      }

      // Fallback: utiliser le lien de recherche Wikipedia
      if (!wikipediaUrl) {
        wikipediaUrl = `https://fr.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(itemTitle + ' ' + wikiTerm)}`;
      }
    } catch (error) {
      console.log('Erreur lors de la recherche Wikipedia:', error);
      wikipediaUrl = `https://fr.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(itemTitle + ' ' + wikiTerm)}`;
    }

    // Formater les données pour le retour
    const formattedItem = {
      id: details.id,
      title: itemTitle,
      year: year,
      rating: details.vote_average ? Math.round(details.vote_average * 10) / 10 : undefined,
      synopsis: details.overview || 'Synopsis non disponible.',
      country: details.production_countries?.[0]?.name || (details.origin_country?.[0]) || 'Inconnu',
      wikipediaUrl: wikipediaUrl,
      actors: [],
    };

    console.log('Détails trouvés:', formattedItem);

    return NextResponse.json({
      success: true,
      movie: formattedItem
    });

  } catch (error: any) {
    console.error('Erreur API tmdb-movie-details:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de la récupération des détails' },
      { status: 500 }
    );
  }
}

