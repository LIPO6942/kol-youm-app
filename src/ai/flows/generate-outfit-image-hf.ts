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
  try {
    const enhanced = enhancePromptForFashion(input.itemDescription, input.gender, input.category);
    const seed = Math.floor(Math.random() * 1000000);

    // On utilise l'URL Pollinations directement depuis le navigateur du client
    // Chaque vêtement utilise une URL légèrement différente pour répartir la charge
    const domains = ['image.pollinations.ai', 'gen.pollinations.ai'];
    const domain = domains[Math.floor(Math.random() * domains.length)];

    // Note: On utilise ?nologo=1 pour éviter le filigrane si possible
    const url = `https://${domain}/prompt/${encodeURIComponent(enhanced)}?width=512&height=512&seed=${seed}&nologo=1&model=turbo`;

    console.log('Fetching image from client:', url);

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Image API error: ${resp.status}`);

    const blob = await resp.blob();

    // Conversion en Data URI pour rester compatible avec le reste de l'app
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return { imageDataUri: dataUri };
  } catch (error) {
    console.error('Erreur lors de la génération d\'image (Client):', error);
    throw error;
  }
}
