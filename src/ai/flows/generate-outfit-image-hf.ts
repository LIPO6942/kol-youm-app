
/**
 * Flow de génération d'images avec Hugging Face API
 * Utilise Stable Diffusion pour générer des images de vêtements réalistes
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  try {
    // Appel côté client vers la route API Next (côté serveur) qui utilise HUGGINGFACE_API_KEY
    const resp = await fetch(`/api/hf-image?t=${Date.now()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input.itemDescription, gender: input.gender, category: input.category })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `HF API route error ${resp.status}`);
    }

    const data = await resp.json();
    console.log('Image API Response:', { success: !!data?.imageDataUri, length: data?.imageDataUri?.length });
    const imageDataUri = data?.imageDataUri as string | undefined;
    if (!imageDataUri) throw new Error('No imageDataUri in response');

    return { imageDataUri };
  } catch (error) {
    console.error('Erreur lors de la génération d\'image:', error);
    // Ne pas utiliser de placeholder; propager l'erreur pour que l'UI gère le retry/affichage alternatif
    throw error;
  }
}
