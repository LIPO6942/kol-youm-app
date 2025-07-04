'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating intelligent outfit suggestions based on user inputs.
 *
 * - suggestOutfit - A function that takes schedule keywords, weather, and occasion as input and returns an outfit suggestion.
 */

import {ai} from '@/ai/genkit';
import { SuggestOutfitInputSchema, SuggestOutfitOutputSchema, type SuggestOutfitInput, type SuggestOutfitOutput } from './intelligent-outfit-suggestion.types';

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
