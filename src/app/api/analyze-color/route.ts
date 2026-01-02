import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Analyse de couleur via Cloudflare Workers AI (LLaVA)
 * Identifie la couleur dominante et suggère des couleurs assorties.
 */
export async function POST(request: Request) {
    try {
        const { imageUrl } = await request.json();
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

        if (!apiToken || !accountId) {
            return NextResponse.json({ error: 'Configurations Cloudflare manquantes.' }, { status: 500 });
        }

        // Convert Data URI to array of integers depending on what the API expects.
        // Cloudflare AI REST API usually expects an array of integers for 'image' field if not using a worker binding.
        // However, for simplicity via REST, we might need to be careful. 
        // LLaVA on CF accepts: { image: [int array], prompt: string } usually.

        // Check if it's a URL or Base64
        let imageArray;
        if (imageUrl.startsWith('http')) {
            const imgRes = await fetch(imageUrl);
            const arrayBuffer = await imgRes.arrayBuffer();
            imageArray = Array.from(new Uint8Array(arrayBuffer));
        } else {
            const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');
            imageArray = Array.from(new Uint8Array(imageBuffer));
        }

        const model = "@cf/llava-hf/llava-1.5-7b-hf";
        const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const prompt = "Analyze this clothing item color. Return a JSON object with two fields: 'dominantColor' (string, e.g. 'Navy Blue') and 'matches' (array of 3 objects with 'name' and 'hex'). Example: {\"dominantColor\": \"Red\", \"matches\": [{\"name\": \"White\", \"hex\": \"#FFFFFF\"}]}. Do not add any text before or after.";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                image: imageArray,
                prompt: prompt,
                max_tokens: 256 // Short response needed
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Cloudflare LLaVA Error:', response.status, errorText);
            return NextResponse.json({ error: 'Erreur API Cloudflare Workers AI' }, { status: response.status });
        }

        const result: any = await response.json();

        // The output from LLaVA is usually text. We need to parse extracting JSON.
        let description = result.result?.response || "";
        console.log("LLaVA Raw Response:", description);

        // Attempt to extract JSON from the text response
        let jsonResponse;
        try {
            // Find JSON-like structure in the response
            const jsonMatch = description.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonResponse = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found");
            }
        } catch (e) {
            console.warn("Failed to parse LLaVA JSON, using fallback.", e);
            // Fallback if AI fails to give JSON
            jsonResponse = {
                dominantColor: "Unknown",
                matches: []
            };
        }

        return NextResponse.json({
            success: true,
            analysis: jsonResponse
        });

    } catch (error: any) {
        console.error('Color Analysis Error:', error);
        return NextResponse.json(
            { error: 'Échec de l\'analyse couleur', details: error?.message },
            { status: 500 }
        );
    }
}
