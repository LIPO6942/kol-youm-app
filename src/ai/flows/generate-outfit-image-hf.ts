/**
 * Flow de génération d'images IA (Version 100% Client - Anti-404)
 * Utilise Pollinations.ai avec rotation de modèles et domaines pour éviter les limites.
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  // Liste des modèles pour la rotation (pour éviter le rate limit sur un seul modèle)
  const models = ['flux', 'turbo', 'unity', 'surrealism'];
  const domains = ['image.pollinations.ai', 'gen.pollinations.ai'];

  const maxRetries = 3;
  let lastError = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const model = models[attempt % models.length];
      const domain = domains[attempt % domains.length];
      const seed = Math.floor(Math.random() * 1000000);

      // Amélioration du prompt pour Pollinations
      const cleanDesc = input.itemDescription.split(/ ou | or |,/i)[0].trim();
      const prompt = `fashion photography, ${cleanDesc}, ${input.gender === 'Femme' ? "women's style" : "men's style"}, white background, product photo, realistic, high quality, studio lighting`;

      const url = `https://${domain}/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&model=${model}&nologo=1`;

      console.log(`Generation Attempt ${attempt + 1} (${model}):`, url);

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const blob = await resp.blob();

      // Sécurité : les images de Rate Limit font souvent moins de 10ko
      if (blob.size < 8000) {
        throw new Error('Image too small (likely a rate limit or error image)');
      }

      // Conversion en Data URI
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return { imageDataUri: dataUri };

    } catch (err: any) {
      console.warn(`Attempt ${attempt + 1} failed:`, err.message);
      lastError = err.message;
      // Attendre un peu avant de réessayer un autre modèle
      await new Promise(r => setTimeout(r, 500));
    }
  }

  throw new Error(`Échec de la génération : ${lastError}. Réessayez avec le bouton d'actualisation.`);
}
