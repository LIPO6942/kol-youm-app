'use server';
/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes an outing category and returns a single concrete suggestion.
 */

import {ai} from '@/ai/genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput } from './decision-maker-flow.types';


const prompt = ai.definePrompt({
  name: 'makeDecisionPrompt',
  input: {schema: MakeDecisionInputSchema},
  output: {schema: MakeDecisionOutputSchema},
  prompt: `Tu es un assistant expert de la vie locale à {{city}}, en Tunisie. Ton but est de donner aux utilisateurs une suggestion de sortie unique et créative.

L'utilisateur a choisi la catégorie de sortie suivante : "{{category}}".

Ta tâche est de :
1.  Inventer un nom de lieu **fictif, original et attractif** qui correspond à la catégorie choisie. Le nom doit sonner authentique et local (par ex. pour un café : "Sidi-Bou", "El Foundouk", "Bahr").
2.  Rédiger une **description courte et engageante** (une ou deux phrases) pour ce lieu, en mettant en avant une spécialité ou une ambiance unique.
3.  Suggérer un **quartier plausible** à {{city}} ou sa banlieue pour ce lieu (par ex. "La Marsa", "Sidi Bou Saïd", "Les Berges du Lac 2", "Gammarth", "La Soukra").
4.  Remplir le champ 'chosenOption' du JSON avec la valeur de la catégorie d'entrée ("{{category}}").

Sois créatif et donne une réponse qui donne envie de découvrir l'endroit. Ne suggère que des lieux fictifs. Réponds uniquement en respectant le format de sortie JSON demandé.`,
});

const makeDecisionFlow = ai.defineFlow(
  {
    name: 'makeDecisionFlow',
    inputSchema: MakeDecisionInputSchema,
    outputSchema: MakeDecisionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
