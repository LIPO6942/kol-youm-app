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
      'stabilityai/stable-diffusion-2-1',
      'runwayml/stable-diffusion-v1-5',
    ];

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
    for (const model of models) {
      try {
        // Essayer d'abord avec l'API router.huggingface.co/v1/images/generations
        const apiUrl = 'https://router.huggingface.co/v1/images/generations';
        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            prompt: enhanced,
            n: 1,
            size: '512x512',
            response_format: 'b64_json',
          }),
        });

        if (!resp.ok) {
          // Si erreur, essayer avec l'ancienne méthode comme fallback
          const errorData = await resp.json().catch(() => ({}));
          lastError = errorData?.error?.message || `HF_ERROR_${resp.status}`;
          console.warn(`Failed with router API: ${lastError}, trying fallback...`);
          
          // Fallback: essayer avec l'ancienne méthode
          const fallbackResp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
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
              options: { wait_for_model: true },
            }),
          });

          if (!fallbackResp.ok) {
            const fallbackError = await fallbackResp.text().catch(() => 'Unknown error');
            lastError = `Router: ${lastError} | Fallback: ${fallbackError}`;
            continue;
          }

          // Traitement de la réponse de fallback
          const arrayBuffer = await fallbackResp.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUri = `data:image/png;base64,${base64}`;
          return NextResponse.json({ imageDataUri: dataUri });
        }

        // Traitement de la réponse du routeur
        const data = await resp.json();
        if (!data?.data?.[0]?.b64_json) {
          lastError = 'No image data in response';
          continue;
        }

        // Convertir la réponse base64 en data URI
        const dataUri = `data:image/png;base64,${data.data[0].b64_json}`;
        return NextResponse.json({ imageDataUri: dataUri });
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
