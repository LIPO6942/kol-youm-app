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
    console.log('Pollinations Prompt:', enhanced);

    // Pollinations.ai standard URL
    const seed = Math.floor(Math.random() * 1000000);
    // On utilise le modèle turbo pour plus de rapidité
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=512&height=512&seed=${seed}&model=turbo&nologo=true`;

    console.log('Fetching from Pollinations:', pollinationsUrl);

    const imageResponse = await fetch(pollinationsUrl);

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text().catch(() => 'No error text');
      console.error('Pollinations API Error:', imageResponse.status, errorText);
      throw new Error(`Pollinations API error: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    if (!imageBuffer || imageBuffer.byteLength === 0) {
      throw new Error('Received empty buffer from Pollinations');
    }

    const base64 = Buffer.from(new Uint8Array(imageBuffer)).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const dataUri = `data:${contentType};base64,${base64}`;

    console.log('Pollinations Image obtained successfully, length:', dataUri.length);

    return NextResponse.json({
      success: true,
      imageDataUri: dataUri,
      modelUsed: `Pollinations.ai`,
      debug: { url: pollinationsUrl, size: dataUri.length }
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
