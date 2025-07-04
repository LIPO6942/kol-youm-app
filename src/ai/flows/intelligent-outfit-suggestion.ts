'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating intelligent outfit suggestions based on user inputs.
 *
 * - suggestOutfit - A function that takes schedule keywords, weather, and occasion as input and returns an outfit suggestion.
 * - SuggestOutfitInput - The input type for the suggestOutfit function.
 * - SuggestOutfitOutput - The return type for the suggestOutfit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOutfitInputSchema = z.object({
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

const SuggestOutfitOutputSchema = z.object({
  outfitSuggestion: z.string().describe('Une suggestion de tenue en français basée sur les entrées.'),
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  prompt: `Vous êtes un assistant styliste personnel IA. Votre réponse doit être exclusivement en français.

{{#if baseItem}}
En vous basant sur la pièce de base de l'utilisateur, ses mots-clés d'agenda, la météo et l'occasion, suggérez une tenue complète qui complète la pièce de base.
Pièce de base : {{{baseItem}}}
{{else}}
En vous basant sur les mots-clés de l'agenda de l'utilisateur, la météo et l'occasion, suggérez une tenue appropriée.
{{/if}}

Mots-clés de l'agenda : {{{scheduleKeywords}}}
Météo : {{{weather}}}
Occasion : {{{occasion}}}
Couleurs préférées : {{#if preferredColors}}{{{preferredColors}}}{{else}}Pas de couleurs préférées{{/if}}

Suggérez une tenue complète, incluant le haut, le bas, les chaussures et les accessoires. Fournissez des détails tels que la couleur, la matière et le style.
Si l'utilisateur a spécifié des couleurs préférées, suivez ses instructions de près. S'il n'a pas spécifié de couleurs préférées, suggérez des tenues avec des couleurs généralement appropriées et à la mode.
{{#if baseItem}}
La tenue suggérée doit incorporer et correspondre à la pièce de base fournie. Par exemple, si la pièce de base est un haut, suggérez un bas, des chaussures et des accessoires. Si la pièce de base est une pièce unique comme une robe, suggérez des chaussures et des accessoires.
{{/if}}

La description de la tenue doit être concise et facile à lire.

Suggestion de tenue :
`,
});

const suggestOutfitFlow = ai.defineFlow(
  {
    name: 'suggestOutfitFlow',
    inputSchema: SuggestOutfitInputSchema,
    outputSchema: SuggestOutfitOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
