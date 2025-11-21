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

    let lastError: any = null;
    
    // Log du prompt amélioré pour le débogage
    console.log('Enhanced prompt:', enhanced);
    
    for (const model of models) {
      console.log(`Trying model: ${model}`);
      
      try {
        // Essayer d'abord avec l'API router.huggingface.co/v1/images/generations
        const apiUrl = 'https://api-inference.huggingface.co/models/' + model;
        console.log(`Calling: ${apiUrl}`);
        
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'image/png',
          },
          body: JSON.stringify({
            inputs: enhanced,
            parameters: {
              num_inference_steps: 20,
              guidance_scale: 7.5,
              width: 512,
              height: 512,
            },
            options: { 
              wait_for_model: true,
              use_cache: false
            },
          }),
        });

        console.log(`Response status for ${model}:`, resp.status);
        
        if (!resp.ok) {
          const errorText = await resp.text().catch(() => 'Failed to read error response');
          console.error(`Error with model ${model}:`, errorText);
          lastError = `[${model}] ${resp.status} - ${errorText.substring(0, 200)}`;
          
          // Si c'est une erreur 503 (modèle en cours de chargement), on attend un peu
          if (resp.status === 503) {
            console.log('Model is loading, waiting 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            continue;
          }
          
          continue;
        }

        // Vérifier le type de contenu
        const contentType = resp.headers.get('content-type') || '';
        console.log('Content-Type:', contentType);
        
        // Si c'est du JSON, c'est probablement une erreur
        if (contentType.includes('application/json')) {
          const errorData = await resp.json().catch(() => ({}));
          lastError = `[${model}] ${JSON.stringify(errorData)}`;
          console.error('JSON error response:', errorData);
          continue;
        }
        
        // Si on arrive ici, c'est probablement une image
        try {
          const arrayBuffer = await resp.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUri = `data:image/png;base64,${base64}`;
          console.log(`Successfully generated image with ${model}`);
          return NextResponse.json({ imageDataUri: dataUri });
        } catch (processError) {
          console.error('Error processing image response:', processError);
          lastError = `[${model}] Failed to process image: ${processError}`;
          continue;
        }
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    return NextResponse.json({ error: 'All HF models failed', details: String(lastError) }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Unexpected error', details: String(error?.message || error) }, { status: 500 });
  }
}
