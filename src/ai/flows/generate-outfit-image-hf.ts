/**
 * Flow de génération d'images avec Pollinations.ai (Côté Client)
 * Utilise Pollinations.ai directement pour éviter le Rate Limit du serveur Vercel
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

function enhancePromptForFashion(description: string, gender?: string, category?: string): string {
  let enhanced = `fashion photography, ${description}`;
  if (gender === 'Femme') enhanced += ", women's style";
  else enhanced += ", men's style";

  enhanced += ', clean white background, studio lighting, high quality, realistic, isolated item, clothing product shot';
  return enhanced;
}

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const enhanced = enhancePromptForFashion(input.itemDescription, input.gender, input.category);
      // On change le seed à chaque essai pour forcer un nouveau calcul
      const seed = Math.floor(Math.random() * 1000000) + attempt;

      const domains = ['image.pollinations.ai', 'gen.pollinations.ai'];
      const domain = domains[attempt % domains.length];

      const url = `https://${domain}/prompt/${encodeURIComponent(enhanced)}?width=512&height=512&seed=${seed}&nologo=1&model=turbo`;

      console.log(`Attempt ${attempt + 1}: Fetching from client:`, url);

      const resp = await fetch(url);

      // Si on reçoit une erreur de type "Rate Limit" ou serveur, on attend et on réessaye
      if (!resp.ok) {
        if (resp.status === 429 || resp.status >= 500) {
          throw new Error(`API temporary error: ${resp.status}`);
        }
        throw new Error(`Image API error: ${resp.status}`);
      }

      const blob = await resp.blob();

      // Sécurité : si le blob est trop petit, c'est probablement l'image d'erreur "Rate Limit"
      // L'image de rate limit de Pollinations fait environ 20-30ko
      if (blob.size < 5000) {
        throw new Error('Image too small, likely a rate limit placeholder');
      }

      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      return { imageDataUri: dataUri };
    } catch (error) {
      attempt++;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt >= maxRetries) break;

      // Attente exponentielle pour laisser l'API respirer
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Impossible de générer l\'image après plusieurs tentatives. Veuillez réessayer plus tard.');
}
