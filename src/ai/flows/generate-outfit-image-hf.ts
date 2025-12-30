/**
 * Flow de génération/recherche d'images IA ultra-rapide
 * Utilise Lexica pour la vitesse et la qualité (recherche d'images existantes)
 * et Pollinations en secours (génération à la demande)
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  // Nettoyage de la description pour Lexica 
  // On enlève "N/A" et on ne garde que le premier vêtement suggéré (avant le "ou")
  let cleanDesc = input.itemDescription.replace(/N\/A/g, '').split(/ ou | or |,|;|:/i)[0].trim();

  if (!cleanDesc || cleanDesc.length < 2) {
    cleanDesc = `${input.category} fashion`;
  }

  const query = `${cleanDesc} fashion photography, white background, realistic product shot`;

  try {
    console.log('Testing Lexica Only - Query:', query);
    const lexicaResp = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`);

    if (lexicaResp.ok) {
      const data = await lexicaResp.json();
      if (data.images && data.images.length > 0) {
        // On prend une image parmi les 15 premières
        const randomIndex = Math.floor(Math.random() * Math.min(15, data.images.length));
        const imageUrl = data.images[randomIndex].src;

        console.log('Lexica match found:', imageUrl);

        const imgResp = await fetch(imageUrl);
        const blob = await imgResp.blob();
        const dataUri = await blobToDataUri(blob);

        return { imageDataUri: dataUri };
      }
    }

    // Si rien n'est trouvé, tenter une recherche ultra-générique
    const ultraSimple = `${input.category} clothing product white background`;
    console.log('Lexica fallback (ultra-simple):', ultraSimple);
    const fallbackResp = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(ultraSimple)}`);

    if (fallbackResp.ok) {
      const data = await fallbackResp.json();
      if (data.images && data.images.length > 0) {
        const imageUrl = data.images[0].src;
        const imgResp = await fetch(imageUrl);
        const blob = await imgResp.blob();
        const dataUri = await blobToDataUri(blob);
        return { imageDataUri: dataUri };
      }
    }
  } catch (e) {
    console.error('Lexica search error:', e);
  }

  throw new Error('Aucune image trouvée sur Lexica.');
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
