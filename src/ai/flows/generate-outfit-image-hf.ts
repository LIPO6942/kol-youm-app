/**
 * Flow de génération d'images haute qualité via Hugging Face uniquement.
 * Pollinations a été TOTALEMENT supprimé.
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
    const cleanDesc = input.itemDescription.replace(/N\/A/g, '').split(/ ou | or |,/i)[0].trim();

    try {
        console.log('Requesting HF Generation for:', cleanDesc);

        const resp = await fetch('/api/hf-image', {
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

        throw new Error('Aucune image générée par le serveur');

    } catch (error: any) {
        console.error('Final HF Error:', error);
        // Plus de fallback Pollinations ici. On remonte l'erreur pour que l'UI affiche l'état d'erreur propre.
        throw new Error(error.message || 'Échec de la génération IA');
    }
}
