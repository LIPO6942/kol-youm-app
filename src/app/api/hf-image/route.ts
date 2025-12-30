import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { prompt, category } = await request.json();

    // Nettoyage de la requête pour Lexica
    let cleanDesc = prompt ? prompt.replace(/N\/A/g, '').split(/ ou | or |,|;|:/i)[0].trim() : '';

    if (!cleanDesc || cleanDesc.length < 2) {
      cleanDesc = `${category || 'fashion'} clothing`;
    }

    const query = `${cleanDesc} fashion photography, white background, realistic product shot`;
    console.log('Lexica Server Search:', query);

    // Appel à Lexica depuis le serveur (pas de blocage CORS ici)
    const lexicaResp = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`);

    if (lexicaResp.ok) {
      const data = await lexicaResp.json();
      if (data.images && data.images.length > 0) {
        // On prend une image parmi les 15 premières
        const randomIndex = Math.floor(Math.random() * Math.min(15, data.images.length));
        const imageUrl = data.images[randomIndex].src;

        return NextResponse.json({
          success: true,
          imageUrl: imageUrl,
          source: 'Lexica'
        });
      }
    }

    // Fallback ultra-générique sur Lexica
    const fallbackQuery = `${category || 'clothing'} fashion product white background`;
    const fallbackResp = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(fallbackQuery)}`);

    if (fallbackResp.ok) {
      const data = await fallbackResp.json();
      if (data.images && data.images.length > 0) {
        return NextResponse.json({
          success: true,
          imageUrl: data.images[0].src,
          source: 'Lexica Fallback'
        });
      }
    }

    return NextResponse.json({ error: 'Aucune image trouvée sur Lexica' }, { status: 404 });

  } catch (error: any) {
    console.error('Lexica API Bridge Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la recherche d\'image', details: error?.message },
      { status: 500 }
    );
  }
}
