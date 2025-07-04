import {z} from 'genkit';

export const GenerateOutfitImageInputSchema = z.object({
  itemDescription: z.string().describe('A detailed description of the complete outfit to be generated.'),
  gender: z.enum(['Homme', 'Femme']).optional().describe("The user's gender, to tailor the outfit model."),
});
export type GenerateOutfitImageInput = z.infer<typeof GenerateOutfitImageInputSchema>;

export const GenerateOutfitImageOutputSchema = z.object({
  imageDataUri: z.string().describe("An image of the complete outfit as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateOutfitImageOutput = z.infer<typeof GenerateOutfitImageOutputSchema>;
