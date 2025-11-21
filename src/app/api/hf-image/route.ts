import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { prompt, gender, category } = await request.json();
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing HUGGINGFACE_API_KEY' }, { status: 500 });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const models = [
      'stabilityai/stable-diffusion-xl-base-1.0',  // Plus récent et performant
      'stabilityai/stable-diffusion-2-1',          // Version 2.1
      'runwayml/stable-diffusion-v1-5',            // Version 1.5 stable
      'prompthero/openjourney',                     // Spécialisé dans les images artistiques
      'CompVis/stable-diffusion-v1-4'               // Version 1.4 fiable
    ];
    
    // Désactiver le cache pour éviter les problèmes
    process.env.NEXT_DISABLE_RESPONSE_CACHE = '1';

    const enhancePromptForFashion = (description: string, g?: 'Homme' | 'Femme', cat?: 'haut' | 'bas' | 'chaussures' | 'accessoires') => {
      const singleItemMap: Record<string, { noun: string; extras?: string }> = {
        haut: { noun: 'a single top garment (shirt, t-shirt, sweater, jacket)', extras: 'single garment' },
        bas: { noun: 'a single bottom garment (pants, jeans, skirt, shorts)', extras: 'single garment' },
        chaussures: { noun: 'a single pair of shoes', extras: 'single pair' },
        accessoires: { noun: 'a single fashion accessory (watch, sunglasses, belt, hat)', extras: 'single accessory' },
      };
      const catSpec = cat && singleItemMap[cat] ? `${singleItemMap[cat].noun}, ${singleItemMap[cat].extras}` : 'single clothing item';

      const base = `fashion product photography of ${catSpec}, ${description}, clean white background, e-commerce studio lighting, high quality, detailed, sharp focus`;
      let genderBias = '';
      let negatives = 'no person, no model, no human, no body, mannequin invisible, disembodied apparel, no outfit set, no multiple items, no collage';
      if (g === 'Homme') {
        genderBias = ", men's clothing, male fit, masculine style";
        negatives += ', no female, no woman, no feminine style';
      } else if (g === 'Femme') {
        genderBias = ", women's clothing, female fit, feminine style";
        negatives += ', no male, no man, no masculine style';
      }
      return `${base}${genderBias}, ${negatives}`;
    };

    const body = (inputs: string) => ({
      inputs,
      parameters: {
        num_inference_steps: 20,
        guidance_scale: 7.5,
        width: 512,
        height: 512,
      },
      options: {
        wait_for_model: true,
      },
    });

    const enhanced = enhancePromptForFashion(prompt, gender, category);
    
    // Log du prompt amélioré pour le débogage
    console.log('Enhanced prompt:', enhanced);
    
    // Utiliser le routeur Hugging Face avec l'API v1
    const model = 'stabilityai/stable-diffusion-xl-base-1.0';
    const apiUrl = 'https://router.huggingface.co/v1/images/generations';
    console.log('Using model:', model);
    console.log('API URL:', apiUrl);
    
    try {
      const requestBody = {
        model: model,
        prompt: enhanced,
        n: 1,
        size: '512x512',
        response_format: 'b64_json',
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
      console.log('Response headers:', JSON.stringify(Object.fromEntries(resp.headers.entries())));
      
      if (!resp.ok) {
        // Essayer de lire la réponse comme JSON d'abord
        try {
          const errorJson = await resp.json();
          console.error('Error response (JSON):', errorJson);
          throw new Error(`API error: ${resp.status} - ${JSON.stringify(errorJson)}`);
        } catch (jsonError) {
          // Si ce n'est pas du JSON, lire comme texte
          const errorText = await resp.text().catch(() => 'Failed to read error response');
          console.error('Error response (text):', errorText);
          throw new Error(`API error: ${resp.status} - ${errorText}`);
        }
      }
      
      // Le routeur renvoie toujours du JSON avec une image en base64
      const data = await resp.json();
      console.log('API Response:', JSON.stringify(data).substring(0, 200) + '...');
      
      if (data?.data?.[0]?.b64_json) {
        // Format de réponse attendu avec l'image en base64
        const dataUri = `data:image/png;base64,${data.data[0].b64_json}`;
        console.log('Successfully generated image from b64_json');
        return NextResponse.json({ imageDataUri: dataUri });
      } else if (data?.url) {
        // Si l'API renvoie une URL vers l'image
        console.log('Image URL received, downloading...');
        const imageResponse = await fetch(data.url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image from ${data.url}`);
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUri = `data:image/png;base64,${base64}`;
        console.log('Successfully downloaded and generated image');
        return NextResponse.json({ imageDataUri: dataUri });
      } else {
        console.error('Unexpected response format:', JSON.stringify(data));
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
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Unexpected error', 
        details: error?.message || String(error) 
      }, 
      { status: 500 }
    );
  }
}
