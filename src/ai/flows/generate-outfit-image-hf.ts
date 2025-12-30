/**
 * Flow de génération/recherche d'images IA ultra-rapide
 * Utilise Lexica pour la vitesse et la qualité (recherche d'images existantes)
 * et Pollinations en secours (génération à la demande)
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  const query = `${input.itemDescription} fashion photography, ${input.gender === 'Femme' ? "women's style" : "men's style"}, white background, product photo, high quality, realistic`;

  try {
    // 1. Essayer Lexica (Moteur de recherche IA - Instantané et sans limite)
    console.log('Searching Lexica for:', query);
    const lexicaResp = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`);

    if (lexicaResp.ok) {
      const data = await lexicaResp.json();
      if (data.images && data.images.length > 0) {
        // On prend une image au hasard parmi les 10 premières pour varier
        const randomIndex = Math.floor(Math.random() * Math.min(10, data.images.length));
        const imageUrl = data.images[randomIndex].src;

        console.log('Lexica match found:', imageUrl);

        // On télécharge l'image pour la convertir en base64
        const imgResp = await fetch(imageUrl);
        const blob = await imgResp.blob();
        const dataUri = await blobToDataUri(blob);

        return { imageDataUri: dataUri };
      }
    }
  } catch (e) {
    console.warn('Lexica search failed, falling back to Pollinations:', e);
  }

  // 2. Secours : Pollinations avec rotation de modèles pour éviter le Rate Limit
  const models = ['flux', 'turbo', 'unity', 'deliberate'];
  const model = models[Math.floor(Math.random() * models.length)];
  const seed = Math.floor(Math.random() * 1000000);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=512&height=512&seed=${seed}&model=${model}&nologo=1`;

  try {
    console.log('Pollinations fallback triggering with model:', model);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`API Error: ${resp.status}`);

    const blob = await resp.blob();
    if (blob.size < 5000) throw new Error('Received rate limit or error image');

    const dataUri = await blobToDataUri(blob);
    return { imageDataUri: dataUri };
  } catch (error: any) {
    console.error('Final fallback failed:', error);
    throw new Error('Impossible de générer ou trouver une image. Veuillez réessayer.');
  }
}

async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
