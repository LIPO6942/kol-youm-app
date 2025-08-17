'use server';
/**
 * @fileOverview A Genkit flow for generating a single image of a complete outfit.
 *
 * - generateOutfitImage - A function that takes a full outfit description and returns an image data URI.
 */

import {ai} from '@/ai/genkit';
import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

const generateOutfitImageFlow = ai.defineFlow(
  {
    name: 'generateOutfitImageFlow',
    inputSchema: GenerateOutfitImageInputSchema,
    outputSchema: GenerateOutfitImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a photorealistic image of a single fashion item: '${input.itemDescription}'. The item should be presented on a clean, plain, neutral light gray background, as if for a product catalog. Do not show any person or body parts. The focus is entirely on the item itself.`,
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


export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  return generateOutfitImageFlow(input);
}
