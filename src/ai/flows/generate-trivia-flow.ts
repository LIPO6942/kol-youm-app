import { ai } from '../genkit';
import { GenerateTriviaInputSchema, GenerateTriviaOutputSchema } from './generate-trivia-flow.types';

export const generateTriviaFlow = ai.defineFlow(
  {
    name: 'generateTriviaFlow',
    inputSchema: GenerateTriviaInputSchema,
    outputSchema: GenerateTriviaOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: `Génère une anecdote insolite, amusante et surtout VÉRIDIQUE qui permet de "dormir moins bête".
Choisis un sujet original et inattendu (par exemple : science étonnante, histoire méconnue, espace, particularités de la culture tunisienne, animaux, gastronomie).
Évite absolument les anecdotes trop connues (comme "les carottes rendent aimable" ou "la grande muraille de Chine visible depuis l'espace"). Surprends-moi !
La langue doit être le français.
Fournis un titre accrocheur, un contenu de 3-4 phrases, une catégorie pertinente, et un lien Wikipedia (francophone) valide pointant vers l'article détaillant le sujet.`,
      output: {
        schema: GenerateTriviaOutputSchema,
      },
      config: {
        temperature: 0.9, // Higher temp for more variety/creativity
      }
    });

    if (!output) {
      throw new Error('Failed to generate trivia');
    }

    return output;
  }
);
