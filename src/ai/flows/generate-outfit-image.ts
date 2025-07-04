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
      prompt: `Generate a single, photorealistic, full-body image of a complete fashion outfit for a {{gender}}. The outfit is described as: "${input.itemDescription}".
The image should be styled like a high-end fashion editorial. The person wearing the outfit should be on a clean, plain, neutral light gray background. Do not show the person's face. The focus is entirely on the clothing.`,
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
