import {z} from 'genkit';
import { SuggestOutfitInputSchema } from './intelligent-outfit-suggestion.types';

// The input is very similar to the standard suggestion, but the photo is required.
export const GenerateOutfitFromPhotoInputSchema = SuggestOutfitInputSchema.extend({
    baseItemPhotoDataUri: z
        .string()
        .describe(
        "A photo of the base clothing item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
});
export type GenerateOutfitFromPhotoInput = z.infer<typeof GenerateOutfitFromPhotoInputSchema>;


const OutfitPartSchema = z.object({
    description: z.string().describe("Description détaillée de la pièce suggérée (ex: 'Chemisier en soie blanc cassé'). Si non applicable (ex: robe), mettre 'N/A'."),
});

export const GenerateOutfitFromPhotoOutputSchema = z.object({
  haut: OutfitPartSchema,
  bas: OutfitPartSchema,
  chaussures: OutfitPartSchema,
  accessoires: OutfitPartSchema,
});
export type GenerateOutfitFromPhotoOutput = z.infer<typeof GenerateOutfitFromPhotoOutputSchema>;
