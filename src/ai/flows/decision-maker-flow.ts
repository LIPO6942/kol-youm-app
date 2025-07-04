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
  prompt: `Tu es un expert connaisseur de la vie locale à {{city}} et ses environs (La Marsa, Sidi Bou Saïd, Gammarth, Les Berges du Lac, etc.). Ton but est de donner aux utilisateurs une suggestion de sortie unique et pertinente parmi les meilleurs endroits **réels et existants**.

L'utilisateur a choisi la catégorie de sortie suivante : "{{category}}".

Ta tâche est de :
1.  Choisir **un seul lieu réel, connu et apprécié** qui correspond parfaitement à la catégorie "{{category}}".
2.  Fournir le **nom exact** de ce lieu.
3.  Rédiger une **description courte et engageante** (une ou deux phrases) pour ce lieu, en mettant en avant sa spécialité ou son ambiance unique.
4.  Indiquer son **quartier ou sa ville** précise (par ex. "La Marsa", "Sidi Bou Saïd").
5.  Générer une **URL Google Maps valide et fonctionnelle** qui pointe vers ce lieu. L'URL doit être correctement formée, par exemple : "https://www.google.com/maps/search/?api=1&query=Nom+Du+Lieu,Ville".
6.  Remplir le champ 'chosenOption' du JSON avec la valeur de la catégorie d'entrée ("{{category}}").

Assure-toi que toutes les informations sont exactes et vérifiables. La suggestion doit être de haute qualité. Réponds uniquement en respectant le format de sortie JSON demandé.`,
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
