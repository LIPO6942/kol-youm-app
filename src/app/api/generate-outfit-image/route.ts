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

        // Amélioration du prompt pour un rendu mode professionnel
        const enhancedPrompt = `fashion photography, ${prompt}, ${gender === 'Femme' ? "women's style" : "men's style"}, white background, studio shot, high resolution, realistic clothing item, clean lighting`;

        console.log('Generating with Cloudflare Workers AI:', enhancedPrompt);

        const model = "@cf/bytedance/stable-diffusion-xl-lightning";
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: enhancedPrompt
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
