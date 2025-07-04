'use server';
/**
 * @fileOverview A Genkit flow for generating movie posters.
 *
 * - generateMoviePoster - A function that takes a movie title and synopsis and returns an image data URI.
 * - GenerateMoviePosterInput - The input type for the generateMoviePoster function.
 * - GenerateMoviePosterOutput - The return type for the generateMoviePoster function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMoviePosterInputSchema = z.object({
  title: z.string().describe('The title of the movie.'),
  synopsis: z.string().describe('The synopsis of the movie.'),
});
export type GenerateMoviePosterInput = z.infer<typeof GenerateMoviePosterInputSchema>;

const GenerateMoviePosterOutputSchema = z.object({
  posterDataUri: z.string().describe("A movie poster image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateMoviePosterOutput = z.infer<typeof GenerateMoviePosterOutputSchema>;

export async function generateMoviePoster(input: GenerateMoviePosterInput): Promise<GenerateMoviePosterOutput> {
  return generateMoviePosterFlow(input);
}

const generateMoviePosterFlow = ai.defineFlow(
  {
    name: 'generateMoviePosterFlow',
    inputSchema: GenerateMoviePosterInputSchema,
    outputSchema: GenerateMoviePosterOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a movie poster for a film titled "${input.title}". 
The story is about: ${input.synopsis}. 
The poster should be in a vertical orientation (portrait), cinematic, visually appealing, and include the movie title prominently. Do not include any other text like actor names or taglines.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media || !media.url) {
        throw new Error('Image generation failed to produce an image.');
    }

    return { posterDataUri: media.url };
  }
);
