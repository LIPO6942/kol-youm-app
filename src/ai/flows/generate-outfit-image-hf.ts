/**
 * Flow de génération d'images haute qualité via Hugging Face
 * Utilise le modèle FLUX spécifié côté serveur pour un matching précis avec LA PIECE.
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
    // On prend le premier élément de la description pour éviter de perdre l'IA avec des choix multiples
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

        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({}));
            throw new Error(errorData.error || `Erreur serveur : ${resp.status}`);
        }

        const data = await resp.json();

        if (data.imageDataUri) {
            return { imageDataUri: data.imageDataUri };
        }

        throw new Error('Aucune image générée par le serveur');

    } catch (error: any) {
        console.error('Error in HF generateOutfitImage:', error);

        // Fallback Pollinations (direct client) si le serveur HF est saturé
        // Cela permet d'avoir TOUJOURS une image même si le quota HF est atteint
        console.warn('Falling back to Pollinations due to HF error');
        const seed = Math.floor(Math.random() * 1000000);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanDesc + " fashion photography white background")}?width=512&height=512&seed=${seed}&nologo=true&model=flux`;

        return { imageDataUri: pollinationsUrl };
    }
}
