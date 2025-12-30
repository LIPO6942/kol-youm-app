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

        // Modèle FLUX.1-schnell (Excellent compromis vitesse/qualité)
        const modelUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

        const response = await fetch(modelUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: enhancedPrompt,
                parameters: {
                    num_inference_steps: 4, // Schnell est optimisé pour peu d'étapes
                    guidance_scale: 3.5
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('HF API Error:', response.status, errorText);

            // Si le modèle est en cours de chargement (503), on peut suggérer de réessayer
            if (response.status === 503) {
                return NextResponse.json({ error: 'Le modèle IA se réveille, réessayez dans 30 secondes.' }, { status: 503 });
            }

            return NextResponse.json({ error: 'Erreur API Hugging Face' }, { status: response.status });
        }

        const imageBlob = await response.blob();
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
