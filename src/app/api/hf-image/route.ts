import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Génération d'images via Hugging Face Inference API
 * Utilise le modèle FLUX.1-schnell pour la rapidité et la qualité
 */
export async function POST(request: Request) {
    try {
        const { prompt, gender, category } = await request.json();
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!apiKey) {
            console.error('HUGGINGFACE_API_KEY is missing');
            return NextResponse.json({ error: 'Configurations IA manquantes' }, { status: 500 });
        }

        // Amélioration du prompt pour un rendu mode professionnel
        const enhancedPrompt = `fashion photography, ${prompt}, ${gender === 'Femme' ? "women's style" : "men's style"}, white background, studio shot, high resolution, realistic clothing item, clean lighting`;

        console.log('Generating with HF (FLUX):', enhancedPrompt);

        // Modèle Stable Diffusion XL (Plus stable sur l'API Inference gratuite)
        const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

        // Tentative avec retry si le modèle charge (503)
        let hfResponse;
        let retries = 0;
        const maxRetries = 2;

        while (retries <= maxRetries) {
            hfResponse = await fetch(modelUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: enhancedPrompt,
                    parameters: {
                        negative_prompt: "blurry, low quality, distorted, deformed, text, watermark",
                        width: 512,
                        height: 512
                    }
                }),
            });

            if (hfResponse.status === 503 && retries < maxRetries) {
                console.log('Model loading (503), waiting 5s...');
                await new Promise(r => setTimeout(r, 5000));
                retries++;
            } else {
                break;
            }
        }

        if (!hfResponse || !hfResponse.ok) {
            const errorText = await hfResponse?.text() || 'Unknown error';
            console.error('HF API Final Error:', hfResponse?.status, errorText);
            return NextResponse.json({
                error: hfResponse?.status === 503 ? 'L\'IA est en train de démarrer, réessayez dans 10 secondes.' : 'Quota Hugging Face atteint ou erreur.'
            }, { status: hfResponse?.status || 500 });
        }

        const imageBlob = await hfResponse.blob();
        const buffer = await imageBlob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = imageBlob.type || 'image/webp';

        return NextResponse.json({
            success: true,
            imageDataUri: `data:${contentType};base64,${base64}`
        });

    } catch (error: any) {
        console.error('HF Route Error:', error);
        return NextResponse.json(
            { error: 'Échec de la génération sur le serveur', details: error?.message },
            { status: 500 }
        );
    }
}
