'use server';
/**
 * @fileOverview A Genkit flow for regenerating a specific part of an outfit suggestion.
 *
 * - regenerateOutfitPart - A function that takes an existing outfit, the part to change, and original constraints, and returns a new outfit.
 */

import {ai} from '@/ai/genkit';
import { RegenerateOutfitPartInputSchema, RegenerateOutfitPartOutputSchema, type RegenerateOutfitPartInput, type RegenerateOutfitPartOutput } from './regenerate-outfit-part-flow.types';

const prompt = ai.definePrompt({
  name: 'regenerateOutfitPartPrompt',
  input: {schema: RegenerateOutfitPartInputSchema},
  output: {schema: RegenerateOutfitPartOutputSchema},
  prompt: `Vous êtes un assistant styliste personnel IA expert. Votre réponse doit être exclusivement en français et respecter le format JSON de sortie.

L'utilisateur n'est pas satisfait de la suggestion pour "{{partToChange}}" dans la tenue suivante. Votre mission est de proposer une **nouvelle alternative** pour cette partie UNIQUEMENT, tout en vous assurant qu'elle s'harmonise parfaitement avec le reste de la tenue et respecte les contraintes initiales.

**Contraintes initiales de l'utilisateur :**
- Mots-clés de l'agenda : {{{originalConstraints.scheduleKeywords}}}
- Météo : {{{originalConstraints.weather}}}
- Occasion : {{{originalConstraints.occasion}}}
{{#if originalConstraints.gender}}
- Genre : {{{originalConstraints.gender}}}
{{/if}}
- Couleurs préférées : {{#if originalConstraints.preferredColors}}{{{originalConstraints.preferredColors}}}{{else}}Pas de couleurs préférées{{/if}}
{{#if originalConstraints.baseItem}}
- Pièce de base : {{{originalConstraints.baseItem}}}
{{/if}}

**Tenue actuelle :**
- Haut: {{currentOutfit.haut}}
- Bas: {{currentOutfit.bas}}
- Chaussures: {{currentOutfit.chaussures}}
- Accessoires: {{currentOutfit.accessoires}}

**Votre tâche :**
1.  Gardez les parties de la tenue que l'utilisateur aime (celles qui ne sont pas "{{partToChange}}") **exactement comme elles sont**.
2.  Générez une **nouvelle description détaillée** pour la partie "{{partToChange}}". Cette nouvelle suggestion doit être **différente de l'actuelle**.
3.  Assurez-vous que la nouvelle pièce est cohérente avec le genre et les couleurs préférées, si spécifiées.
4.  Mettez à jour le paragraphe de résumé ('suggestionText') pour décrire la nouvelle tenue complète de manière fluide et attrayante. Le résumé doit inclure la description de toutes les pièces, y compris celles qui n'ont pas changé.
`,
});

const regenerateOutfitPartFlow = ai.defineFlow(
  {
    name: 'regenerateOutfitPartFlow',
    inputSchema: RegenerateOutfitPartInputSchema,
    outputSchema: RegenerateOutfitPartOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function regenerateOutfitPart(input: RegenerateOutfitPartInput): Promise<RegenerateOutfitPartOutput> {
  return regenerateOutfitPartFlow(input);
}
