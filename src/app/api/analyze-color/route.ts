import { NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

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

        const prompt = "You are a fashion stylist. Analyze the clothing item in the image. Identify its dominant color. Then, suggest exactly 5 matching colors to create a stylish outfit. Return strictly a JSON object with this structure: { \"dominantColor\": \"ColorName\", \"matches\": [{ \"name\": \"Name1\", \"hex\": \"#Hex1\" }, { \"name\": \"Name2\", \"hex\": \"#Hex2\" }, { \"name\": \"Name3\", \"hex\": \"#Hex3\" }, { \"name\": \"Name4\", \"hex\": \"#Hex4\" }, { \"name\": \"Name5\", \"hex\": \"#Hex5\" }] }. Do not include markdown formatting or explanation.";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                image: imageArray,
                prompt: prompt,
                max_tokens: 512, // Increased slightly
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
            // Clean up markdown code blocks if present
            description = description.replace(/```json/g, '').replace(/```/g, '');

            // Find JSON-like structure in the response
            const jsonMatch = description.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonResponse = JSON.parse(jsonMatch[0]);

                // Validate structure
                if (!jsonResponse.matches || !Array.isArray(jsonResponse.matches)) {
                    throw new Error("Invalid JSON structure: matches missing or not array");
                }
            } else {
                throw new Error("No JSON found");
            }
        } catch (e) {
            console.warn("Failed to parse LLaVA JSON, using fallback.", e);
            // Fallback if AI fails to give JSON
            jsonResponse = {
                dominantColor: "Non détecté",
                matches: [
                    { name: "Blanc", hex: "#FFFFFF" },
                    { name: "Noir", hex: "#000000" },
                    { name: "Gris", hex: "#808080" },
                    { name: "Beige", hex: "#F5F5DC" },
                    { name: "Bleu Marine", hex: "#000080" }
                ]
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
