import {z} from 'genkit';
import { GenerateOutfitFromPhotoInputSchema } from './generate-outfit-from-photo-flow.types';

export const CurrentOutfitDescriptionsSchema = z.object({
  haut: z.string().describe("Description actuelle du haut."),
  bas: z.string().describe("Description actuelle du bas."),
  chaussures: z.string().describe("Description actuelle des chaussures."),
  accessoires: z.string().describe("Description actuelle des accessoires."),
});

export const RegeneratePhotoOutfitPartInputSchema = z.object({
  originalInput: GenerateOutfitFromPhotoInputSchema.describe('The original user constraints and photo information used to generate the outfit.'),
  currentOutfitDescriptions: CurrentOutfitDescriptionsSchema.describe('The descriptions of the currently suggested outfit parts.'),
  partToChange: z.enum(['haut', 'bas', 'chaussures', 'accessoires']).describe('The specific part of the outfit to regenerate.'),
  currentPartDescription: z.string().describe('The description of the part to be changed, to ensure a new suggestion is provided.'),
});
export type RegeneratePhotoOutfitPartInput = z.infer<typeof RegeneratePhotoOutfitPartInputSchema>;

export const RegeneratePhotoOutfitPartOutputSchema = z.object({
    newDescription: z.string().describe("The new, detailed description for the regenerated outfit part."),
});
export type RegeneratePhotoOutfitPartOutput = z.infer<typeof RegeneratePhotoOutfitPartOutputSchema>;
