import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

export const runtime = 'nodejs';

/**
 * Génération d'images via Hugging Face Inference API
 * Utilise une stratégie Multi-Modèles pour garantir une image
 */
export async function POST(request: Request) {
    try {
        const { prompt, gender, category } = await request.json();
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!apiKey) {
            console.error('HUGGINGFACE_API_KEY is missing');
            return NextResponse.json({ error: 'Clé API Hugging Face manquante' }, { status: 500 });
        }

        // Amélioration du prompt
        const enhancedPrompt = `fashion photography, ${prompt}, ${gender === 'Femme' ? "women's style" : "men's style"}, white background, studio shot, high resolution, realistic clothing item, clean lighting`;

        // Liste de modèles à essayer par ordre de préférence
        const models = [
            "black-forest-labs/FLUX.1-schnell",
            "stabilityai/stable-diffusion-xl-base-1.0",
            "runwayml/stable-diffusion-v1-5"
        ];

        let lastError = '';

        for (const model of models) {
            try {
                console.log(`Trying Hugging Face Model: ${model}`);
                const modelUrl = `https://api-inference.huggingface.co/models/${model}`;

                const response = await fetch(modelUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        inputs: enhancedPrompt,
                        parameters: {
                            // Paramètres spécifiques pour SDXL/FLUX si nécessaire
                            ...(model.includes('FLUX') ? { num_inference_steps: 4 } : {})
                        }
                    }),
                });

                if (response.status === 503) {
                    console.warn(`Model ${model} is loading, skipping to next or retrying...`);
                    lastError = 'Modèle en cours de chargement';
                    continue;
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    console.warn(`Model ${model} failed with status ${response.status}: ${errorText}`);
                    lastError = `Statut ${response.status}`;
                    continue;
                }

                const imageBlob = await response.blob();

                // Si le blob n'est pas une image ou est trop petit (erreur déguisée)
                if (imageBlob.size < 1000) {
                    console.warn(`Model ${model} returned a suspicious small blob`);
                    continue;
                }

                const buffer = await imageBlob.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                const contentType = imageBlob.type || 'image/webp';

                console.log(`Successfully generated image with model: ${model}`);
                return NextResponse.json({
                    success: true,
                    imageDataUri: `data:${contentType};base64,${base64}`,
                    modelUsed: model
                });

            } catch (err: any) {
                console.error(`Error with model ${model}:`, err.message);
                lastError = err.message;
            }
        }

        return NextResponse.json({
            error: `Toutes les tentatives Hugging Face ont échoué. ${lastError}`
        }, { status: 500 });

    } catch (error: any) {
        console.error('Global HF Route Error:', error);
        return NextResponse.json(
            { error: 'Erreur interne du serveur', details: error?.message },
            { status: 500 }
        );
    }
}
