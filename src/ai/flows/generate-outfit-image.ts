'use server';
/**
 * @fileOverview A Genkit flow for generating outfit item images.
 *
 * - generateOutfitImage - A function that takes an item description and returns an image data URI.
 */

import {ai} from '@/ai/genkit';
import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  return generateOutfitImageFlow(input);
}

const generateOutfitImageFlow = ai.defineFlow(
  {
    name: 'generateOutfitImageFlow',
    inputSchema: GenerateOutfitImageInputSchema,
    outputSchema: GenerateOutfitImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a photorealistic image of a single clothing item: ${input.itemDescription}. The item should be presented on a clean, plain, neutral light gray background, as if for a fashion retail website. Do not include any models, mannequins, or other items. Focus only on the described piece of clothing.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media || !media.url) {
        throw new Error('Image generation failed to produce an image.');
    }

    return { imageDataUri: media.url };
  }
);
