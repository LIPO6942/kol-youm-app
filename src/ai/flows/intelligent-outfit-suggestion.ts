'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating intelligent outfit suggestions based on user inputs.
 *
 * - suggestOutfit - A function that takes schedule keywords, weather, and occasion as input and returns an outfit suggestion.
 */

import {ai} from '@/ai/genkit';
import { SuggestOutfitInputSchema, SuggestOutfitOutputSchema, type SuggestOutfitInput, type SuggestOutfitOutput } from './intelligent-outfit-suggestion.types';

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  prompt: `Vous êtes un assistant styliste personnel IA. Votre réponse doit être exclusivement en français et respecter le format JSON de sortie.

{{#if baseItemPhotoDataUri}}
En vous basant sur la photo de la pièce de base fournie par l'utilisateur, ainsi que ses mots-clés d'agenda, la météo, l'occasion et son genre, créez une tenue complète qui met en valeur cette pièce.
Pièce de base (photo) : {{media url=baseItemPhotoDataUri}}
{{else if baseItem}}
En vous basant sur la pièce de base de l'utilisateur, ses mots-clés d'agenda, la météo, l'occasion et son genre, créez une tenue complète qui la met en valeur.
Pièce de base (description) : {{{baseItem}}}
{{else}}
En vous basant sur les mots-clés de l'agenda de l'utilisateur, la météo, l'occasion et son genre, suggérez une tenue complète.
{{/if}}

Mots-clés de l'agenda : {{{scheduleKeywords}}}
Météo : {{{weather}}}
Occasion : {{{occasion}}}
{{#if gender}}
Genre : {{{gender}}}
{{/if}}
Couleurs préférées : {{#if preferredColors}}{{{preferredColors}}}{{else}}Pas de couleurs préférées{{/if}}

**Instructions impératives :**
1.  **Respect strict du genre :** La tenue doit être **exclusivement** appropriée pour le genre spécifié. Ne suggérez **jamais** de talons ou de jupes pour un homme. Adaptez tous les articles (pantalons, chemises, etc.) au genre.
2.  **Respect des couleurs :** Si des couleurs préférées sont indiquées, la tenue **doit** contenir au moins une de ces couleurs.
3.  **Cohérence avec la pièce de base :** La tenue suggérée doit impérativement incorporer et s'harmoniser parfaitement avec la pièce de base fournie (que ce soit par description ou par photo).

Générez une description détaillée pour chaque catégorie : haut, bas, chaussures, et accessoires.
Si une pièce unique (robe, combinaison) est suggérée, indiquez-le dans les champs appropriés. Par exemple, si vous suggérez une robe, le champ 'haut' décrira la robe, et le champ 'bas' devra être 'N/A'.

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


export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}
