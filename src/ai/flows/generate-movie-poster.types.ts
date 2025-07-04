import {z} from 'genkit';

/**
 * @fileOverview This file is deprecated and no longer used.
 */

export const GenerateMoviePosterInputSchema = z.object({
  title: z.string().optional(),
  synopsis: z.string().optional(),
});
export type GenerateMoviePosterInput = z.infer<typeof GenerateMoviePosterInputSchema>;

export const GenerateMoviePosterOutputSchema = z.object({
  posterDataUri: z.string().optional(),
});
export type GenerateMoviePosterOutput = z.infer<typeof GenerateMoviePosterOutputSchema>;
