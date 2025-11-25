import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Category = 'haut' | 'bas' | 'chaussures' | 'accessoires';
type Gender = 'Homme' | 'Femme' | undefined;

// Fonction pour améliorer le prompt pour la mode
function enhancePromptForFashion(
  description: string,
  gender?: Gender,
  category?: Category
): string {
  const singleItemMap: Record<string, { noun: string; extras?: string }> = {
    haut: { noun: 'a single top garment (shirt, t-shirt, sweater, jacket)', extras: 'single garment' },
    bas: { noun: 'a single bottom garment (pants, jeans, skirt, shorts)', extras: 'single garment' },
    chaussures: { noun: 'a single pair of shoes', extras: 'single pair' },
    accessoires: { noun: 'a single fashion accessory (watch, sunglasses, belt, hat)', extras: 'single accessory' },
  };

  let enhanced = description;

  // Ajouter des détails en fonction du genre
  if (gender === 'Femme') {
    enhanced += ", women's clothing, female fit, feminine style";
  } else {
    enhanced += ", men's clothing, male fit, masculine style";
  }

  // Ajouter des détails en fonction de la catégorie
  if (category && singleItemMap[category]) {
    const { noun, extras } = singleItemMap[category];
    enhanced += `, ${noun}`;
    if (extras) {
      enhanced += `, ${extras}`;
    }
  }

  // Ajouter des améliorations générales
  enhanced += ', clean white background, e-commerce studio lighting, high quality, detailed, sharp focus';

  // Ajouter des éléments à éviter
  enhanced += ', no person, no model, no human, no body, mannequin invisible, disembodied apparel';
  enhanced += ', no outfit set, no multiple items, no collage';

  if (gender === 'Femme') {
    enhanced += ', no male, no man, no masculine style';
  } else {
    enhanced += ', no female, no woman, no feminine style';
  }

  return enhanced;
}

export async function POST(request: Request) {
  try {
    const { prompt, gender, category } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    // Améliorer le prompt pour la mode
    const enhanced = enhancePromptForFashion(prompt, gender, category);

    console.log('Enhanced prompt:', enhanced);
    console.log('Using Pollinations.ai API (free, no API key needed)');

    try {
      // Pollinations.ai - API gratuite sans clé nécessaire
      // L'API retourne directement l'image
      const pollinationsUrl = new URL('https://image.pollinations.ai/prompt/' + encodeURIComponent(enhanced));

      // Paramètres optionnels
      pollinationsUrl.searchParams.set('width', '512');
      pollinationsUrl.searchParams.set('height', '512');
      pollinationsUrl.searchParams.set('nologo', 'true'); // Pas de watermark
      pollinationsUrl.searchParams.set('enhance', 'true'); // Amélioration automatique

      console.log('Fetching image from Pollinations.ai...');

      const resp = await fetch(pollinationsUrl.toString(), {
        method: 'GET',
      });

      console.log('Pollinations response status:', resp.status);

      if (!resp.ok) {
        throw new Error(`Pollinations API error: ${resp.status}`);
      }

      // Récupérer l'image en tant que buffer
      const imageBuffer = await resp.arrayBuffer();

      if (!imageBuffer || imageBuffer.byteLength === 0) {
        throw new Error('Empty image buffer received from Pollinations');
      }

      // Convertir en base64
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64}`;

      console.log('✅ Successfully generated image, size:', imageBuffer.byteLength, 'bytes');

      return NextResponse.json({
        success: true,
        imageDataUri: dataUri
      });

    } catch (error: any) {
      console.error('❌ Error in image generation:', error);
      console.error('Error details:', error?.message);

      return NextResponse.json(
        {
          error: 'Image generation failed',
          details: error?.message || String(error),
          hint: 'Erreur avec Pollinations.ai. Vérifiez votre connexion internet.'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in API route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
