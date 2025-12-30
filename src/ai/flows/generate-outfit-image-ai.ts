/**
 * Flow de génération d'images via Cloudflare Workers AI.
 * Remplace définitivement Hugging Face et Pollinations.
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
    const cleanDesc = input.itemDescription.replace(/N\/A/g, '').split(/ ou | or |,/i)[0].trim();

    try {
        console.log('Appel Cloudflare AI pour :', cleanDesc);

        const resp = await fetch('/api/generate-outfit-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: cleanDesc,
                gender: input.gender,
                category: input.category
            })
        });

        const data = await resp.json();

        if (!resp.ok) {
            throw new Error(data.error || `Erreur serveur : ${resp.status}`);
        }

        if (data.imageDataUri) {
            return { imageDataUri: data.imageDataUri };
        }

        throw new Error('Le serveur Cloudflare n\'a pas renvoyé d\'image.');

    } catch (error: any) {
        console.error('Erreur finale Image Flow (Cloudflare):', error);
        throw new Error(error.message || 'Échec de la génération de l\'image');
    }
}
