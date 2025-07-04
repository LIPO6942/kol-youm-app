'use server';
/**
 * @fileOverview A Genkit flow for generating daily quizzes.
 *
 * - generateQuiz - A function that takes a category and returns a set of questions and related links.
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

Enfin, génère exactement 2 liens de suggestion pertinents. Ces liens doivent connecter le thème du quiz à d'autres sections de l'application :
- '/stylek' pour les suggestions de style (avec une occasion pertinente, par ex. ?occasion=Chic).
- '/tfarrej' pour les suggestions de films (avec un genre pertinent, par ex. ?genre=Historique).

Pour chaque lien, fournis le texte, l'URL (href) et le nom d'une icône de 'lucide-react' valide (par exemple : 'Film', 'Shirt', 'BookOpen').

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
