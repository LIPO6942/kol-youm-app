import {z} from 'genkit';

export const GenerateMoviePosterInputSchema = z.object({
  title: z.string().describe('The title of the movie.'),
  synopsis: z.string().describe('The synopsis of the movie.'),
});
export type GenerateMoviePosterInput = z.infer<typeof GenerateMoviePosterInputSchema>;

export const GenerateMoviePosterOutputSchema = z.object({
  posterDataUri: z.string().describe("A movie poster image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateMoviePosterOutput = z.infer<typeof GenerateMoviePosterOutputSchema>;
