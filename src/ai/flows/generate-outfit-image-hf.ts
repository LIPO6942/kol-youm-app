 

/**
 * Flow de génération d'images avec Hugging Face API
 * Utilise Stable Diffusion pour générer des images de vêtements réalistes
 */

import { huggingFaceImageGenerator } from '@/lib/ai/huggingface-image-generator';
import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  try {
    // Appel côté client vers la route API Next (côté serveur) qui utilise HUGGINGFACE_API_KEY
    const resp = await fetch('/api/hf-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input.itemDescription, gender: input.gender, category: input.category })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `HF API route error ${resp.status}`);
    }

    const data = await resp.json();
    const imageDataUri = data?.imageDataUri as string | undefined;
    if (!imageDataUri) throw new Error('No imageDataUri in response');

    return { imageDataUri };
  } catch (error) {
    console.error('Erreur lors de la génération d\'image:', error);
    
    // Fallback vers une image placeholder améliorée
    return {
      imageDataUri: huggingFaceImageGenerator.generateFallbackImage(input.itemDescription)
    };
  }
}
