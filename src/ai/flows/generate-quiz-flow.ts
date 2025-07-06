'use server';
/**
 * @fileOverview A Genkit flow for generating daily quizzes.
 *
 * - generateQuiz - A function that takes a category and returns a set of questions.
 */

import {ai} from '@/ai/genkit';
import { GenerateQuizInputSchema, GenerateQuizOutputSchema, type GenerateQuizInput, type GenerateQuizOutput } from './generate-quiz-flow.types';

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `Tu es un créateur de quiz expert et un assistant personnel intelligent. Ton objectif est de générer un quiz amusant et stimulant en français pour la catégorie "{{category}}".

Ta tâche est de générer exactement 5 questions uniques et intéressantes pour cette catégorie.
Pour chaque question, fournis 4 options de réponse et assure-toi que la bonne réponse est incluse dans les options.
Les questions doivent être variées en difficulté (facile, moyenne, difficile).

En plus du quiz, génère un titre approprié pour le quiz.

Réponds uniquement en respectant le format de sortie JSON demandé.`,
});

const generateQuizFlow = ai.defineFlow(
  {
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}
