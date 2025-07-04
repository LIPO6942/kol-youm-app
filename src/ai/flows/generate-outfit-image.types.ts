import {z} from 'genkit';

export const GenerateOutfitImageInputSchema = z.object({
  itemDescription: z.string().describe('A description of a single clothing item or accessory, e.g., "blue jeans", "white t-shirt", "leather watch".'),
});
export type GenerateOutfitImageInput = z.infer<typeof GenerateOutfitImageInputSchema>;

export const GenerateOutfitImageOutputSchema = z.object({
  imageDataUri: z.string().describe("An image of the clothing item as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateOutfitImageOutput = z.infer<typeof GenerateOutfitImageOutputSchema>;
