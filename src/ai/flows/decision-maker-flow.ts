'use server';
/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes a list of outing options and returns a single concrete suggestion.
 */

import {ai} from '@/ai/genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput } from './decision-maker-flow.types';

export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'makeDecisionPrompt',
  input: {schema: MakeDecisionInputSchema},
  output: {schema: MakeDecisionOutputSchema},
  prompt: `Tu es un assistant expert de la vie locale à {{city}}, en Tunisie. Ton but est d'aider les utilisateurs indécis à choisir une sortie.

L'utilisateur hésite entre les options suivantes :
{{#each options}}
- {{{this}}}
{{/each}}

Ta tâche est de :
1.  Choisir **une seule** de ces options pour l'utilisateur.
2.  Inventer un nom de lieu **fictif, original et attractif** qui correspond à l'option choisie. Le nom doit sonner authentique et local.
3.  Rédiger une **description courte et engageante** (une ou deux phrases) pour ce lieu, en mettant en avant une spécialité ou une ambiance unique.
4.  Suggérer un **quartier plausible** à {{city}} pour ce lieu.

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
