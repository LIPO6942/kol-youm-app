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

    // OBLIGATOIRE : Utiliser le Router Hugging Face (l'API Inference est dépréciée depuis nov 2024)
    const apiUrl = 'https://router.huggingface.co/v1/images/generations';
    console.log('Using Hugging Face Router API (Inference API is deprecated)');

    try {
      // Configuration pour le Router (format OpenAI-compatible)
      const requestBody = {
        model: 'stabilityai/stable-diffusion-xl-base-1.0', // SDXL - Meilleure qualité
        prompt: enhanced,
        n: 1,
        size: '512x512',
        response_format: 'b64_json',
      };

      console.log('Request to Router:', { model: requestBody.model, size: requestBody.size });

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Router response status:', resp.status);

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => 'Failed to read error response');
        console.error('Router API Error:', errorText);

        // Essayer de parser l'erreur JSON
        let errorMessage = `API error ${resp.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorText;
        } catch {
          errorMessage = errorText;
        }

        throw new Error(errorMessage);
      }

      // Le Router renvoie du JSON
      const responseData = await resp.json();
      console.log('Router response received, parsing...');

      // Vérifier si la réponse contient une erreur
      if (responseData.error) {
        console.error('Router returned error:', responseData.error);
        throw new Error(typeof responseData.error === 'string'
          ? responseData.error
          : JSON.stringify(responseData.error));
      }

      // Format attendu : { data: [{ b64_json: "..." }] }
      if (responseData.data && Array.isArray(responseData.data) && responseData.data[0]) {
        const imageData = responseData.data[0];

        // Cas 1: Format b64_json
        if (imageData.b64_json) {
          const dataUri = `data:image/png;base64,${imageData.b64_json}`;
          console.log('✅ Successfully generated image (b64_json format)');
          return NextResponse.json({
            success: true,
            imageDataUri: dataUri
          });
        }

        // Cas 2: Format URL
        if (imageData.url) {
          console.log('Image URL received, downloading...');
          try {
            const imageResponse = await fetch(imageData.url);
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image from URL`);
            }
            const arrayBuffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const dataUri = `data:image/png;base64,${base64}`;
            console.log('✅ Successfully downloaded image from URL');
            return NextResponse.json({
              success: true,
              imageDataUri: dataUri
            });
          } catch (downloadError) {
            console.error('Error downloading image:', downloadError);
            throw new Error('Failed to download the generated image');
          }
        }
      }

      // Format de réponse inattendu
      console.error('Unexpected response format:', JSON.stringify(responseData).substring(0, 500));
      throw new Error('Unexpected response format from Router API');

    } catch (error: any) {
      console.error('❌ Error in image generation:', error);
      console.error('Error details:', error?.message);

      return NextResponse.json(
        {
          error: 'Image generation failed',
          details: error?.message || String(error),
          hint: 'Vérifiez les logs serveur. La clé API doit être valide et vous devez accepter les conditions du modèle sur huggingface.co/black-forest-labs/FLUX.1-schnell'
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
