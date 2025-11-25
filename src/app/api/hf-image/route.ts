import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Category = 'haut' | 'bas' | 'chaussures' | 'accessoires';
type Gender = 'Homme' | 'Femme' | undefined;

// Fonction pour améliorer le prompt (version simplifiée)
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

  enhanced += ', white background, product photo, high quality';

  return enhanced;
}

// Liste des modèles à essayer dans l'ordre
const MODELS_TO_TRY = [
  'Lykon/dreamshaper-7',
  'prompthero/openjourney',
  'aiyouthalliance/Free-Image-Generation',
  'stabilityai/stable-diffusion-xl-base-1.0',
];

async function tryGenerateWithModel(model: string, prompt: string, apiKey: string): Promise<ArrayBuffer | null> {
  // Utiliser l'URL du Router Hugging Face
  const apiUrl = `https://router.huggingface.co/models/${model}`;

  console.log(`Trying model: ${model} via Router URL: ${apiUrl}`);

  try {
    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 20,
        }
      }),
    });

    console.log(`Model ${model} response status: ${resp.status}`);

    if (resp.ok) {
      const imageBuffer = await resp.arrayBuffer();
      if (imageBuffer && imageBuffer.byteLength > 0) {
        console.log(`✅ Success with model: ${model}`);
        return imageBuffer;
      }
    } else {
      const errorText = await resp.text().catch(() => '');
      console.log(`Model ${model} failed:`, errorText.substring(0, 200));
    }

    return null;
  } catch (error) {
    console.log(`Model ${model} error:`, error);
    return null;
  }
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

    const enhanced = enhancePromptForFashion(prompt, gender, category);

    console.log('Enhanced prompt:', enhanced);
    console.log('Trying Hugging Face Router API with multiple models...');

    // Essayer chaque modèle dans l'ordre
    for (const model of MODELS_TO_TRY) {
      const imageBuffer = await tryGenerateWithModel(model, enhanced, apiKey);

      if (imageBuffer) {
        // Succès ! Convertir en base64 et retourner
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const dataUri = `data:image/png;base64,${base64}`;

        console.log('✅ Image generated successfully with model:', model);
        console.log('Image size:', imageBuffer.byteLength, 'bytes');

        return NextResponse.json({
          success: true,
          imageDataUri: dataUri,
          modelUsed: model
        });
      }
    }

    // Tous les modèles ont échoué
    console.error('❌ All models failed');
    return NextResponse.json(
      {
        error: 'Image generation failed',
        details: 'All models failed. Check the server logs for details.',
        hint: 'Vérifiez que votre clé API Hugging Face est valide et que vous avez accepté les licences des modèles sur huggingface.co'
      },
      { status: 500 }
    );

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
