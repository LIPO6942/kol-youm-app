'use server';
/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes a list of outing options and returns a single concrete suggestion.
 * - MakeDecisionInput - The input type for the makeDecision function.
 * - MakeDecisionOutput - The return type for the makeDecision function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MakeDecisionInputSchema = z.object({
  options: z
    .array(z.string())
    .describe('A list of options the user is hesitating between, e.g., ["Café", "Brunch", "Restaurant"].'),
  city: z.string().describe('The city where the user is, for context. e.g. "Tunis"'),
});
export type MakeDecisionInput = z.infer<typeof MakeDecisionInputSchema>;

const MakeDecisionOutputSchema = z.object({
  chosenOption: z.string().describe('The chosen option from the input list.'),
  placeName: z.string().describe('A specific, creative, and appealing name for a fictional place that fits the chosen option.'),
  description: z.string().describe('A short, enticing description of the suggested place, highlighting one or two key features. The tone should be friendly and inspiring.'),
  location: z.string().describe('A plausible neighborhood or area within the specified city. e.g., "La Marsa", "Les Berges du Lac 2".'),
});
export type MakeDecisionOutput = z.infer<typeof MakeDecisionOutputSchema>;

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
