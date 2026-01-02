import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Génération d'images via Cloudflare Workers AI
 * Utilise le modèle Stable Diffusion XL Lightning pour la rapidité
 */
export async function POST(request: Request) {
    try {
        const { prompt, gender, category } = await request.json();
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

        if (!apiToken || !accountId) {
            console.error('Cloudflare configurations missing:', { hasToken: !!apiToken, hasAccountId: !!accountId });
            return NextResponse.json({
                error: 'Configurations Cloudflare manquantes (Token ou Account ID).'
            }, { status: 500 });
        }

        // Amélioration du prompt selon la catégorie pour éviter les portraits et se concentrer sur l'objet
        let focusInstruction = 'one single clothing item, studio shot, isolated on white background';
        const cat = category?.toLowerCase() || '';

        if (cat.includes('chaussure')) {
            focusInstruction = 'one single pair of shoes, side view, macro shot, isolated on pure white background, no box, no human feet';
        } else if (cat.includes('accessoire')) {
            focusInstruction = 'one single accessory object only, macro shot, isolated on pure white background, centered';
        } else if (cat.includes('haut') || cat.includes('bas')) {
            focusInstruction = 'one single garment only, flat lay photography, ghost mannequin, isolated on white background, no person, centered';
        }

        const negativePrompt = "multiple items, collage, grid, many objects, collection, rack, shelf, store, blurry, watermark, text, human body, face, head, feet, hands, model, split view, triptych, two objects";
        // FOCUS INSTRUCTION FIRST: Cloudflare AI model pays more attention to the beginning of the prompt.
        const enhancedPrompt = `${focusInstruction}. ${prompt}, ${gender === 'Femme' ? "women style" : "men style"}, high resolution, professional commercial photography, clean studio lighting`;

        console.log('Generating with Cloudflare Workers AI (Targeted):', enhancedPrompt);

        const model = "@cf/bytedance/stable-diffusion-xl-lightning";
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: enhancedPrompt,
                negative_prompt: negativePrompt
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cloudflare AI Error:', response.status, errorText);
            return NextResponse.json({ error: 'Erreur API Cloudflare Workers AI' }, { status: response.status });
        }

        // Cloudflare renvoie directement le flux binaire de l'image (PNG ou JPEG)
        const imageBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/png';

        console.log('Successfully generated image with Cloudflare');

        return NextResponse.json({
            success: true,
            imageDataUri: `data:${contentType};base64,${base64}`
        });

    } catch (error: any) {
        console.error('Cloudflare API Route Error:', error);
        return NextResponse.json(
            { error: 'Échec de la génération sur Cloudflare', details: error?.message },
            { status: 500 }
        );
    }
}
