/**
 * Flow de recherche d'images via pont serveur (Proxy Lexica)
 * Évite les erreurs CORS et les Rate Limits
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  try {
    // On appelle notre propre API qui fait le pont vers Lexica
    const resp = await fetch('/api/hf-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: input.itemDescription,
        category: input.category
      })
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${resp.status}`);
    }

    const data = await resp.json();

    if (data.imageUrl) {
      // On renvoie l'URL directe (Lexica supporte l'affichage direct via <img>)
      return { imageDataUri: data.imageUrl };
    }

    throw new Error('Aucune image trouvée');
  } catch (error) {
    console.error('Erreur dans generateOutfitImage:', error);
    throw error;
  }
}
