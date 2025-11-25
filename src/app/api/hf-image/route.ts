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
    // Par défaut, on utilise le style masculin
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
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'HUGGINGFACE_API_KEY is not set' }, { status: 500 });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    // Désactiver le cache pour éviter les problèmes
    process.env.NEXT_DISABLE_RESPONSE_CACHE = '1';

    // Améliorer le prompt pour la mode
    const enhanced = enhancePromptForFashion(prompt, gender, category);

    // Log du prompt amélioré pour le débogage
    console.log('Enhanced prompt:', enhanced);

    // Utiliser l'API Inference directement (plus fiable que le Router)
    const model = 'black-forest-labs/FLUX.1-schnell'; // Modèle ultra-rapide et gratuit
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;

    console.log(`Using Hugging Face Inference API with model: ${model}`);

    try {
      // Première tentative avec le modèle principal
      let resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'x-wait-for-model': 'true', // Attendre si le modèle est en chargement
        },
        body: JSON.stringify({
          inputs: enhanced,
          parameters: {
            num_inference_steps: 4, // FLUX schnell nécessite 4 steps
            guidance_scale: 0, // FLUX schnell ne supporte pas guidance_scale > 0
          }
        }),
      });

      console.log('Response status:', resp.status);

      // Si le modèle FLUX échoue, utiliser un fallback
      if (!resp.ok) {
        console.log('FLUX model failed, trying fallback: stabilityai/stable-diffusion-2-1');
        const fallbackModel = 'stabilityai/stable-diffusion-2-1';
        const fallbackUrl = `https://api-inference.huggingface.co/models/${fallbackModel}`;

        resp = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'x-wait-for-model': 'true',
          },
          body: JSON.stringify({
            inputs: enhanced,
            parameters: {
              num_inference_steps: 20,
              guidance_scale: 7.5,
            }
          }),
        });

        console.log('Fallback response status:', resp.status);
      }

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => 'Failed to read error response');
        console.error('API Error Response:', errorText);

        // Essayer de parser l'erreur JSON
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || errorText);
        } catch {
          throw new Error(`API error ${resp.status}: ${errorText}`);
        }
      }

      // L'API Inference renvoie directement les bytes de l'image
      const imageBuffer = await resp.arrayBuffer();

      if (!imageBuffer || imageBuffer.byteLength === 0) {
        throw new Error('Empty image buffer received from API');
      }

      // Convertir en base64
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const dataUri = `data:image/png;base64,${base64}`;

      console.log('Successfully generated image, size:', imageBuffer.byteLength, 'bytes');

      return NextResponse.json({
        success: true,
        imageDataUri: dataUri
      });

    } catch (error: any) {
      console.error('Error in image generation:', error);
      console.error('Error stack:', error?.stack);

      return NextResponse.json(
        {
          error: 'Image generation failed',
          details: error?.message || String(error),
          hint: 'Vérifiez que votre clé API Hugging Face est valide et que vous avez accepté les conditions du modèle sur huggingface.co'
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
