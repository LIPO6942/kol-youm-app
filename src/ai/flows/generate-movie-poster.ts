'use server';
/**
 * @fileOverview This flow is deprecated and no longer used for movie poster generation.
 * The movie suggestion flow now provides text details directly.
 */

import {z} from 'genkit';
import { GenerateMoviePosterInputSchema, GenerateMoviePosterOutputSchema, type GenerateMoviePosterInput, type GenerateMoviePosterOutput } from './generate-movie-poster.types';

// This function is kept for compatibility but should not be used.
export async function generateMoviePoster(input: GenerateMoviePosterInput): Promise<GenerateMoviePosterOutput> {
  console.warn("generateMoviePoster is deprecated and should not be used.");
  return { posterDataUri: 'data:image/png;base64,' };
}
