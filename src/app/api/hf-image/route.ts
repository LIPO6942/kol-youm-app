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
    
    // Configuration pour Stable Diffusion XL
    const model = 'stabilityai/stable-diffusion-xl-base-1.0';
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    console.log('Using Stable Diffusion XL model with optimized settings');
    
    try {
      const requestBody = {
        inputs: enhanced,
        parameters: {
          // Paramètres optimisés pour SDXL
          negative_prompt: 'low quality, blurry, distorted, multiple items, collage, person, human, face, body, text, watermark, signature, nsfw',
          num_inference_steps: 30,      // Plus d'étapes pour de meilleurs résultats
          guidance_scale: 7.5,          // Bon équilibre entre créativité et fidélité
          width: 1024,                  // Meilleure résolution
          height: 1024,                 // Meilleure résolution
          num_images_per_prompt: 1,
          seed: Math.floor(Math.random() * 1000000),
          output_type: 'png',           // Format de sortie spécifique
          return_dict: false            // Format de réponse plus simple
        },
        options: {
          wait_for_model: true,         // Attendre que le modèle soit chargé
          use_cache: false,             // Ne pas utiliser le cache
          timeout: 90000,               // Timeout à 90 secondes
          use_gpu: true,                // Utiliser le GPU si disponible
          wait_for_model_timeout: 300   // Attendre jusqu'à 5 minutes que le modèle se charge
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

      // Vérifier le type de contenu de la réponse
      const contentType = resp.headers.get('content-type') || '';
      
      // Si c'est une image, la convertir en base64
      if (contentType.startsWith('image/')) {
        try {
          const arrayBuffer = await resp.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUri = `data:${contentType};base64,${base64}`;
          console.log('Successfully generated image');
          return NextResponse.json({ 
            success: true,
            imageDataUri: dataUri 
          });
        } catch (error) {
          console.error('Error processing image response:', error);
          throw new Error('Failed to process the generated image');
        }
      } 
      // Si ce n'est pas une image, essayer de lire comme JSON
      else {
        try {
          const responseData = await resp.json();
          console.log('API Response (JSON):', responseData);
          
          // Vérifier si la réponse contient une erreur
          if (responseData.error) {
            console.error('API Error:', responseData.error);
            throw new Error(responseData.error);
          }
          
          // Si la réponse contient une image en base64
          if (responseData.image) {
            return NextResponse.json({ 
              success: true,
              imageDataUri: `data:image/png;base64,${responseData.image}` 
            });
          }
          
          // Si la réponse est inattendue
          throw new Error('Unexpected response format from API');
          
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          const textResponse = await resp.text();
          console.error('Raw API Response:', textResponse);
          throw new Error(textResponse || 'Failed to parse API response');
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
