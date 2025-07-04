import {z} from 'genkit';

export const SuggestOutfitInputSchema = z.object({
  scheduleKeywords: z
    .string()
    .describe(
      'Keywords from the user schedule, like Meeting, Dinner, or Sports.'
    ),
  weather: z.string().describe('The local weather conditions.'),
  occasion: z
    .string()
    .describe(
      'The occasion for which the outfit is needed, e.g., Professional, Casual, Chic.'
    ),
  preferredColors: z
    .string()
    .describe(
      'A comma separated list of preferred colors. If the user has no preferred colors, pass the string "".'
    )
    .optional(),
    baseItem: z.string().describe('A specific clothing item the user wants to build an outfit around.').optional(),
});
export type SuggestOutfitInput = z.infer<typeof SuggestOutfitInputSchema>;

export const SuggestOutfitOutputSchema = z.object({
  haut: z.string().describe("Description détaillée du haut (ex: 'T-shirt blanc en coton col rond'). Si non applicable (ex: robe), mettre 'N/A'."),
  bas: z.string().describe("Description détaillée du bas (ex: 'Jean slim bleu délavé'). Si non applicable (ex: robe), mettre 'N/A'."),
  chaussures: z.string().describe("Description détaillée des chaussures (ex: 'Baskets blanches en cuir')."),
  accessoires: z.string().describe("Description détaillée des accessoires (ex: 'Montre argentée et sac en bandoulière noir')."),
  suggestionText: z.string().describe("Un paragraphe de résumé engageant en français décrivant la tenue complète et pourquoi elle fonctionne bien pour l'occasion."),
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;
