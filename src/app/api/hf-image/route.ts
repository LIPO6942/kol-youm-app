import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * API route to proxy Lexica search requests.
 * This avoids CORS issues on the client side.
 */
export async function POST(request: Request) {
  try {
    const { prompt, category } = await request.json();

    // Mapping des catégories pour une meilleure recherche Lexica (en anglais)
    const categoryMapping: Record<string, string> = {
      'haut': 'top clothing shirt',
      'bas': 'pants trousers',
      'chaussures': 'shoes footwear',
      'accessoires': 'fashion accessories'
    };

    const categoryEng = categoryMapping[category?.toLowerCase()] || category || 'clothing';

    // Clean the prompt for better search results
    // We take the first part before common separators
    let cleanDesc = prompt ? prompt.replace(/N\/A/g, '').split(/ ou | or |,|;|:/i)[0].trim() : '';

    if (!cleanDesc || cleanDesc.length < 2) {
      cleanDesc = categoryEng;
    }

    // Narrow search for better relevance
    const query = `${cleanDesc} fashion photography, white background, realistic product shot`;
    console.log('Lexica Server-side Search:', query);

    const lexicaUrl = `https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`;
    const lexicaResp = await fetch(lexicaUrl);

    if (lexicaResp.ok) {
      const data = await lexicaResp.json();
      if (data.images && data.images.length > 0) {
        // Pick one of the top results for variety
        const randomIndex = Math.floor(Math.random() * Math.min(10, data.images.length));
        const imageUrl = data.images[randomIndex].src;

        return NextResponse.json({
          success: true,
          imageUrl: imageUrl, // Lexica image URL is publicly accessible
          source: 'Lexica'
        });
      }
    }

    // Fallback if specific search fails
    const fallbackQuery = `${category || 'fashion'} product, white background`;
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

    return NextResponse.json({ error: 'No image found on Lexica' }, { status: 404 });

  } catch (error: any) {
    console.error('Lexica Bridge Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image', details: error?.message },
      { status: 500 }
    );
  }
}
