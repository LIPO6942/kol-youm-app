import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

export const runtime = 'nodejs';

type Category = 'haut' | 'bas' | 'chaussures' | 'accessoires';
type Gender = 'Homme' | 'Femme' | undefined;

// Fonction pour améliorer le prompt
function enhancePromptForFashion(
  description: string,
  gender?: Gender,
  category?: Category
): string {
  let enhanced = description;

  if (gender === 'Femme') {
    enhanced += ", women's fashion";
  } else {
    enhanced += ", men's fashion";
  }

  enhanced += ', white background, product photo, high quality, realistic';
  return enhanced;
}

export async function POST(request: Request) {
  try {
    const { prompt, gender, category } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const enhanced = enhancePromptForFashion(prompt, gender, category);
    console.log('Pollinations.ai Prompt:', enhanced);

    // Pollinations.ai est rapide, gratuit et ne nécessite pas de polling complexe.
    // On utilise l'endpoint recommandé gen.pollinations.ai
    const seed = Math.floor(Math.random() * 1000000);
    const model = 'flux';
    const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(enhanced)}?width=512&height=512&seed=${seed}&model=${model}&nologo=1&t=${Date.now()}`;

    console.log('Fetching from Pollinations (New Endpoint):', pollinationsUrl);

    // On télécharge l'image pour la renvoyer en base64 (Data URI)
    // Cela évite les problèmes de CSP/CORS et assure que l'image est bien là
    const imageResponse = await fetch(pollinationsUrl);

    if (!imageResponse.ok) {
      throw new Error(`Pollinations API error: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/webp';
    const dataUri = `data:${contentType};base64,${base64}`;

    console.log('Pollinations Image obtained successfully');

    return NextResponse.json({
      success: true,
      imageDataUri: dataUri,
      modelUsed: `Pollinations.ai (${model})`
    });

  } catch (error: any) {
    console.error('Error in Pollinations API route:', error);
    return NextResponse.json(
      {
        error: 'Image generation failed',
        details: error?.message || String(error),
        hint: 'Réessayez dans quelques instants.'
      },
      { status: 500 }
    );
  }
}
