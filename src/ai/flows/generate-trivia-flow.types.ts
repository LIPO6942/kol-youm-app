import {z} from 'genkit';

export const GenerateTriviaInputSchema = z.object({});
export type GenerateTriviaInput = z.infer<typeof GenerateTriviaInputSchema>;

export const GenerateTriviaOutputSchema = z.object({
  title: z.string().describe("Le titre accrocheur de l'anecdote."),
  content: z.string().describe("Le contenu de l'anecdote (surprenant, véridique et détaillé, environ 3-4 phrases)."),
  category: z.string().describe("La catégorie (ex: Culture, Histoire, Science, Espace, Gastronomie, Nature)."),
  sourceUrl: z.string().describe("Un lien Wikipédia francophone valide (ex: https://fr.wikipedia.org/wiki/Sujet) pour lire davantage."),
});
export type GenerateTriviaOutput = z.infer<typeof GenerateTriviaOutputSchema>;
