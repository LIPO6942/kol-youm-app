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
        const resp = await fetch(`https://router.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'image/png',
          },
          body: JSON.stringify(body(enhanced)),
        });

        if (!resp.ok) {
          let errMsg = `HF_ERROR_${resp.status}`;
          try {
            const errJson = await resp.json();
            if (errJson?.error) errMsg = String(errJson.error);
          } catch (_) {}
          lastError = errMsg;
          continue;
        }

        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const j = await resp.json();
          const msg = String(j?.error || 'HF returned JSON instead of image');
          lastError = msg;
          continue;
        }

        const arrayBuffer = await resp.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const ct = contentType || 'image/png';
        const dataUri = `data:${ct};base64,${base64}`;

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
