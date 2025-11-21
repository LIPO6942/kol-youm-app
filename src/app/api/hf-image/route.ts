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
    
    // Utiliser l'API d'inférence standard avec un seul modèle
    const model = 'black-forest-labs/FLUX.1-schnell';
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    console.log('Using model:', model);
    
    try {
      const requestBody = {
        inputs: enhanced,
        parameters: {
          negative_prompt: 'low quality, blurry, distorted, multiple items, collage, person, human, face, body, female, woman, feminine style',
          num_inference_steps: 20,
          guidance_scale: 7.5,
          width: 512,
          height: 512
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      };
      
      console.log('Request body:', JSON.stringify(requestBody));
      
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', resp.status);
      
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => 'Failed to read error response');
        console.error('API Error:', errorText);
        throw new Error(`API error: ${resp.status} - ${errorText}`);
      }

      // L'API renvoie directement l'image binaire
      const contentType = resp.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        const arrayBuffer = await resp.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUri = `data:${contentType};base64,${base64}`;
        console.log('Successfully generated image');
        return NextResponse.json({ imageDataUri: dataUri });
      } else {
        // Essayer de lire comme JSON en cas d'erreur
        try {
          const errorData = await resp.json();
          console.error('API Error (JSON):', errorData);
          throw new Error(JSON.stringify(errorData));
        } catch (jsonError) {
          const textResponse = await resp.text();
          console.error('API Error (text):', textResponse);
          throw new Error(textResponse);
        }
      }
    } catch (error: any) {
      console.error('Error in image generation:', error);
      return NextResponse.json(
        { 
          error: 'Image generation failed', 
          details: error?.message || String(error) 
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
