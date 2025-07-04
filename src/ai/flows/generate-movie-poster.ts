'use server';
/**
 * @fileOverview A Genkit flow for generating movie posters.
 *
 * - generateMoviePoster - A function that takes a movie title and synopsis and returns an image data URI.
 */

import {ai} from '@/ai/genkit';
import { GenerateMoviePosterInputSchema, GenerateMoviePosterOutputSchema, type GenerateMoviePosterInput, type GenerateMoviePosterOutput } from './generate-movie-poster.types';


const generateMoviePosterFlow = ai.defineFlow(
  {
    name: 'generateMoviePosterFlow',
    inputSchema: GenerateMoviePosterInputSchema,
    outputSchema: GenerateMoviePosterOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a movie poster for a film titled "${input.title}". The story is about: ${input.synopsis}. The poster should be in a vertical orientation (portrait), cinematic, visually appealing, and include the movie title prominently. Do not include any other text like actor names or taglines.`,
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

export async function generateMoviePoster(input: GenerateMoviePosterInput): Promise<GenerateMoviePosterOutput> {
  return generateMoviePosterFlow(input);
}
