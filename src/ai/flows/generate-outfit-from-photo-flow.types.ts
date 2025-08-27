import {z} from 'genkit';
import { SuggestOutfitInputSchema } from './intelligent-outfit-suggestion.types';

// The input is very similar to the standard suggestion, but the photo is required.
export const GenerateOutfitFromPhotoInputSchema = SuggestOutfitInputSchema.extend({
    baseItemPhotoDataUri: z
        .string()
        .describe(
        "A photo of the base clothing item, as a data URI or a public URL."
        ),
    baseItemType: z.enum(['haut', 'bas', 'chaussures', 'accessoires']).describe('The type of the base item provided by the user.'),
});
export type GenerateOutfitFromPhotoInput = z.infer<typeof GenerateOutfitFromPhotoInputSchema>;


const OutfitPartSchema = z.object({
    description: z.string().describe("Description détaillée de la pièce suggérée (ex: 'Chemisier en soie blanc cassé'). Si non applicable (ex: pièce fournie par l'utilisateur), mettre 'N/A'."),
});

export const GenerateOutfitFromPhotoOutputSchema = z.object({
  haut: OutfitPartSchema,
  bas: OutfitPartSchema,
  chaussures: OutfitPartSchema,
  accessoires: OutfitPartSchema,
});
export type GenerateOutfitFromPhotoOutput = z.infer<typeof GenerateOutfitFromPhotoOutputSchema>;
