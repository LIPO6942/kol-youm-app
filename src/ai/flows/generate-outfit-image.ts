'use server';
/**
 * @fileOverview A Genkit flow for generating outfit item images.
 *
 * - generateOutfitImage - A function that takes an item description and returns an image data URI.
 * - GenerateOutfitImageInput - The input type for the generateOutfitImage function.
 * - GenerateOutfitImageOutput - The return type for the generateOutfitImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateOutfitImageInputSchema = z.object({
  itemDescription: z.string().describe('A description of a single clothing item or accessory, e.g., "blue jeans", "white t-shirt", "leather watch".'),
});
export type GenerateOutfitImageInput = z.infer<typeof GenerateOutfitImageInputSchema>;

const GenerateOutfitImageOutputSchema = z.object({
  imageDataUri: z.string().describe("An image of the clothing item as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateOutfitImageOutput = z.infer<typeof GenerateOutfitImageOutputSchema>;

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
