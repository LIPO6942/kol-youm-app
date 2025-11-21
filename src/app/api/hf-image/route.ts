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
    
    // Configuration pour le routeur Hugging Face
    const apiUrl = 'https://router.huggingface.co/v1/images/generations';
    console.log('Using Hugging Face Router with optimized settings');
    
    try {
      // Modèle par défaut (gratuit)
      const model = 'stabilityai/stable-diffusion-xl-base-1.0';
      
      const requestBody = {
        model: model,
        prompt: enhanced,
        negative_prompt: 'low quality, blurry, distorted, multiple items, collage, person, human, face, body, text, watermark, signature, nsfw',
        n: 1,                          // Une seule image
        size: '512x512',               // Taille réduite pour économiser des crédits
        num_inference_steps: 15,       // Moins d'étapes pour économiser des crédits
        guidance_scale: 7.5,           // Bon équilibre créativité/fidélité
        response_format: 'b64_json'     // Format de réponse attendu
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

      // Le routeur renvoie toujours du JSON
      const responseData = await resp.json();
      console.log('API Response:', JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Vérifier si la réponse contient une erreur
      if (responseData.error) {
        console.error('API Error:', responseData.error);
        throw new Error(typeof responseData.error === 'string' 
          ? responseData.error 
          : JSON.stringify(responseData.error));
      }
      
      // Vérifier le format de réponse attendu (b64_json)
      if (responseData.data && Array.isArray(responseData.data) && responseData.data[0]?.b64_json) {
        const dataUri = `data:image/png;base64,${responseData.data[0].b64_json}`;
        console.log('Successfully generated image');
        return NextResponse.json({ 
          success: true,
          imageDataUri: dataUri 
        });
      }
      // Vérifier si l'URL de l'image est retournée
      else if (responseData.url) {
        console.log('Image URL received, downloading...');
        try {
          const imageResponse = await fetch(responseData.url);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image from ${responseData.url}`);
          }
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUri = `data:image/png;base64,${base64}`;
          return NextResponse.json({ 
            success: true,
            imageDataUri: dataUri 
          });
        } catch (downloadError) {
          console.error('Error downloading image:', downloadError);
          throw new Error('Failed to download the generated image');
        }
      }
      // Format de réponse inattendu
      else {
        console.error('Unexpected response format:', responseData);
        throw new Error('Unexpected response format from API');
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
