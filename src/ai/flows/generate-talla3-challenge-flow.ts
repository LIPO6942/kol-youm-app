'use server';
/**
 * @fileOverview A Genkit flow for generating "Talla3" ranking challenges.
 *
 * - generateTalla3Challenges - A function that returns a list of ranking challenges.
 */

import {ai} from '@/ai/genkit';
import { GenerateTalla3ChallengeInputSchema, GenerateTalla3ChallengeOutputSchema, type GenerateTalla3ChallengeInput, type GenerateTalla3ChallengeOutput } from './generate-talla3-challenge-flow.types';

const prompt = ai.definePrompt({
  name: 'generateTalla3ChallengePrompt',
  input: {schema: GenerateTalla3ChallengeInputSchema},
  output: {schema: GenerateTalla3ChallengeOutputSchema},
  prompt: `Tu es un créateur de jeux culturels et de puzzles logiques. Ta mission est de générer une série de défis de classement pour le jeu "Talla3".

Génère une liste de {{count}} défis de classement uniques et intéressants.
Les défis doivent couvrir des catégories variées comme l'Histoire, la Science, le Cinéma, la Géographie, la Technologie, l'Art, etc.

Pour chaque défi :
1.  Crée un 'id' unique (une courte chaîne de caractères aléatoires).
2.  Formule une 'title' (question) claire qui indique ce qui doit être classé (par exemple : "Classez ces inventions par ordre chronologique", "Rangez ces planètes par distance au soleil").
3.  Fournis une liste 'items' des éléments à classer. **Cette liste doit déjà être dans le bon ordre.** L'application se chargera de la mélanger pour l'utilisateur. La liste doit contenir entre 4 et 6 éléments.
4.  Assigne une 'category' pertinente au défi.

Assure-toi que les faits sont exacts et que les ordres de classement sont corrects. Sois créatif pour proposer des défis originaux.
Toutes les réponses doivent être en français. Réponds uniquement en respectant le format de sortie JSON demandé.`,
});

const generateTalla3ChallengesFlow = ai.defineFlow(
  {
    name: 'generateTalla3ChallengesFlow',
    inputSchema: GenerateTalla3ChallengeInputSchema,
    outputSchema: GenerateTalla3ChallengeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function generateTalla3Challenges(input: GenerateTalla3ChallengeInput): Promise<GenerateTalla3ChallengeOutput> {
  return generateTalla3ChallengesFlow(input);
}
