import { NextResponse } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Category = 'haut' | 'bas' | 'chaussures' | 'accessoires';
type Gender = 'Homme' | 'Femme' | undefined;

// Fonction pour améliorer le prompt
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

  enhanced += ', white background, product photo, high quality, realistic';
  return enhanced;
}

export async function POST(request: Request) {
  try {
    const { prompt, gender, category } = await request.json();
    // On utilise la clé AI Horde définie par l'utilisateur, ou '0000000000' pour le mode anonyme (plus lent)
    const apiKey = process.env.AI_HORDE_API_KEY || '0000000000';

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const enhanced = enhancePromptForFashion(prompt, gender, category);
    console.log('AI Horde Prompt:', enhanced);

    // 1. Soumettre la tâche de génération
    const generateResponse = await fetch('https://stablehorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
        'Client-Agent': 'KolYoumApp:1.0:moslem',
      },
      body: JSON.stringify({
        prompt: enhanced,
        params: {
          n: 1,
          steps: 20,
          width: 512,
          height: 512,
          sampler_name: 'k_euler',
          cfg_scale: 7,
        },
        nsfw: false,
        censor_nsfw: true,
        models: ['ICBINP - I Can\'t Believe It\'s Not Photography'], // Un bon modèle réaliste souvent dispo
        // models: ['stable_diffusion'], // Fallback possible
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('AI Horde Submission Error:', errorText);
      throw new Error(`AI Horde error: ${generateResponse.status} - ${errorText}`);
    }

    const generateData = await generateResponse.json();
    const generationId = generateData.id;
    console.log('AI Horde Job ID:', generationId);

    // 2. Attendre la fin de la génération (Polling)
    let imageUrl = null;
    let attempts = 0;
    const maxAttempts = 40; // ~40-60 secondes max (Vercel timeout est souvent 10-60s selon le plan)

    while (!imageUrl && attempts < maxAttempts) {
      attempts++;
      // Attendre 1.5s entre chaque vérification
      await new Promise(resolve => setTimeout(resolve, 1500));

      const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${generationId}`, {
        method: 'GET',
        headers: {
          'Client-Agent': 'KolYoumApp:1.0:moslem',
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();

        if (statusData.done) {
          // La génération est terminée
          if (statusData.generations && statusData.generations.length > 0) {
            imageUrl = statusData.generations[0].img;
          } else {
            throw new Error('AI Horde finished but returned no image.');
          }
        } else if (statusData.faulted) {
          throw new Error('AI Horde job failed/faulted.');
        } else {
          // Toujours en cours... on continue d'attendre
          // console.log(`Waiting... Queue position: ${statusData.queue_position}, Wait time: ${statusData.wait_time}s`);
        }
      }
    }

    if (!imageUrl) {
      throw new Error('Timeout waiting for AI Horde image generation.');
    }

    console.log('AI Horde Image URL obtained:', imageUrl);

    // 3. Télécharger l'image pour la renvoyer en base64 (pour éviter les problèmes de CORS ou de liens temporaires)
    // Note: AI Horde renvoie souvent l'URL, il faut la fetcher.
    const imageFetch = await fetch(imageUrl);
    const imageBuffer = await imageFetch.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUri = `data:image/webp;base64,${base64}`; // AI Horde renvoie souvent du WebP

    return NextResponse.json({
      success: true,
      imageDataUri: dataUri,
      modelUsed: 'AI Horde'
    });

  } catch (error: any) {
    console.error('Error in AI Horde API route:', error);
    return NextResponse.json(
      {
        error: 'Image generation failed',
        details: error?.message || String(error),
        hint: 'Vérifiez votre clé AI Horde ou réessayez plus tard.'
      },
      { status: 500 }
    );
  }
}
