import {z} from 'genkit';
import { SuggestOutfitInputSchema, SuggestOutfitOutputSchema } from './intelligent-outfit-suggestion.types';

export const RegenerateOutfitPartInputSchema = z.object({
  originalConstraints: SuggestOutfitInputSchema.describe('The original user constraints used to generate the outfit.'),
  currentOutfit: SuggestOutfitOutputSchema.describe('The current outfit suggestion.'),
  partToChange: z.enum(['haut', 'bas', 'chaussures', 'accessoires']).describe('The specific part of the outfit to regenerate.'),
});
export type RegenerateOutfitPartInput = z.infer<typeof RegenerateOutfitPartInputSchema>;

export const RegenerateOutfitPartOutputSchema = SuggestOutfitOutputSchema;
export type RegenerateOutfitPartOutput = z.infer<typeof RegenerateOutfitPartOutputSchema>;
