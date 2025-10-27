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
      'black-forest-labs/FLUX.1-schnell',
      'stabilityai/sdxl-turbo',
      'stabilityai/stable-diffusion-2-1',
      'runwayml/stable-diffusion-v1-5',
      'CompVis/stable-diffusion-v1-4',
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
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    for (const model of models) {
      try {
        const resp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'image/png',
            'x-use-cache': 'false',
          },
          body: JSON.stringify(body(enhanced)),
          cache: 'no-store',
          // Let the HF API stream the image; we will read as blob
        });

        if (!resp.ok) {
          // Try to parse error body for HF-specific details
          let errMsg = `HF_ERROR_${resp.status}`;
          try {
            const errJson = await resp.json();
            if (errJson?.error) errMsg = String(errJson.error);
          } catch (_) {}
          if (resp.status === 503 || errMsg.includes('loading')) throw new Error('MODEL_LOADING');
          throw new Error(errMsg);
        }

        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const j = await resp.json();
          const msg = String(j?.error || 'HF returned JSON instead of image');
          if (msg.includes('loading')) throw new Error('MODEL_LOADING');
          throw new Error(msg);
        }

        const arrayBuffer = await resp.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const ct = contentType || 'image/png';
        const dataUri = `data:${ct};base64,${base64}`;

        return NextResponse.json({ imageDataUri: dataUri });
      } catch (err) {
        lastError = err;
        // If model is loading, wait and retry up to 2 more times for this model
        if (String(err).includes('MODEL_LOADING')) {
          for (let i = 0; i < 2; i++) {
            await sleep(2000 * (i + 1));
            try {
              const resp2 = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  Accept: 'image/png',
                  'x-use-cache': 'false',
                },
                body: JSON.stringify(body(enhanced)),
                cache: 'no-store',
              });
              if (!resp2.ok) {
                let errMsg2 = `HF_ERROR_${resp2.status}`;
                try { const ej = await resp2.json(); if (ej?.error) errMsg2 = String(ej.error); } catch {}
                if (resp2.status === 503 || errMsg2.includes('loading')) continue; // try next retry or next model
                throw new Error(errMsg2);
              }
              const ct2 = resp2.headers.get('content-type') || '';
              if (ct2.includes('application/json')) {
                const j2 = await resp2.json();
                const msg2 = String(j2?.error || 'HF returned JSON instead of image');
                if (msg2.includes('loading')) continue;
                throw new Error(msg2);
              }
              const buf2 = await resp2.arrayBuffer();
              const b642 = Buffer.from(buf2).toString('base64');
              const ctFinal = ct2 || 'image/png';
              const dataUri2 = `data:${ctFinal};base64,${b642}`;
              return NextResponse.json({ imageDataUri: dataUri2 });
            } catch (retryErr) {
              lastError = retryErr;
              continue;
            }
          }
        }
        continue;
      }
    }

    return NextResponse.json({ error: 'All HF models failed', details: String(lastError) }, { status: 502 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Unexpected error', details: String(error?.message || error) }, { status: 500 });
  }
}
