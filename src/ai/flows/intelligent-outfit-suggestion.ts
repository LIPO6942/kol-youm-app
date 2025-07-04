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
  haut: z.string().describe("Description détaillée du haut (ex: 'T-shirt blanc en coton col rond'). Si non applicable (ex: robe), mettre 'N/A'."),
  bas: z.string().describe("Description détaillée du bas (ex: 'Jean slim bleu délavé'). Si non applicable (ex: robe), mettre 'N/A'."),
  chaussures: z.string().describe("Description détaillée des chaussures (ex: 'Baskets blanches en cuir')."),
  accessoires: z.string().describe("Description détaillée des accessoires (ex: 'Montre argentée et sac en bandoulière noir')."),
  suggestionText: z.string().describe("Un paragraphe de résumé engageant en français décrivant la tenue complète et pourquoi elle fonctionne bien pour l'occasion."),
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  prompt: `Vous êtes un assistant styliste personnel IA. Votre réponse doit être exclusivement en français et respecter le format JSON de sortie.

{{#if baseItem}}
En vous basant sur la pièce de base de l'utilisateur, ses mots-clés d'agenda, la météo et l'occasion, créez une tenue complète qui la met en valeur.
Pièce de base : {{{baseItem}}}
{{else}}
En vous basant sur les mots-clés de l'agenda de l'utilisateur, la météo et l'occasion, suggérez une tenue complète.
{{/if}}

Mots-clés de l'agenda : {{{scheduleKeywords}}}
Météo : {{{weather}}}
Occasion : {{{occasion}}}
Couleurs préférées : {{#if preferredColors}}{{{preferredColors}}}{{else}}Pas de couleurs préférées{{/if}}

Générez une description détaillée pour chaque catégorie : haut, bas, chaussures, et accessoires.
Si une pièce unique (robe, combinaison) est suggérée, indiquez-le dans les champs appropriés. Par exemple, si vous suggérez une robe, le champ 'haut' décrira la robe, et le champ 'bas' devra être 'N/A'.
Si l'utilisateur a spécifié des couleurs préférées, intégrez-les.
{{#if baseItem}}
La tenue suggérée doit incorporer et correspondre à la pièce de base fournie.
{{/if}}

Enfin, rédigez un paragraphe de résumé (suggestionText) qui décrit l'ensemble de la tenue de manière fluide et attrayante.
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
