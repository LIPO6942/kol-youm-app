import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing HUGGINGFACE_API_KEY' }, { status: 500 });
    }

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const models = [
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-2-1',
      'CompVis/stable-diffusion-v1-4',
    ];

    const enhancePromptForFashion = (description: string) => {
      const lower = description.toLowerCase();
      let enhanced = `fashion photography, ${description}, clean white background, product shot, high quality, detailed`;
      // negative terms to avoid people
      enhanced += ', no person, no model, no human, clothing item only';
      return enhanced;
    };

    const body = (inputs: string) => ({
      inputs,
      parameters: {
        num_inference_steps: 20,
        guidance_scale: 7.5,
        width: 512,
        height: 512,
      },
    });

    const enhanced = enhancePromptForFashion(prompt);

    let lastError: any = null;
    for (const model of models) {
      try {
        const resp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body(enhanced)),
          // Let the HF API stream the image; we will read as blob
        });

        if (!resp.ok) {
          if (resp.status === 503) throw new Error('MODEL_LOADING');
          throw new Error(`HF_ERROR_${resp.status}`);
        }

        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = blob.type || 'image/png';
        const dataUri = `data:${contentType};base64,${base64}`;

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
