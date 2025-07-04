'use server';
/**
 * @fileOverview A Genkit flow for generating movie suggestions.
 *
 * - generateMovieSuggestions - A function that returns a list of movies.
 */

import {ai} from '@/ai/genkit';
import { GenerateMovieSuggestionsInputSchema, GenerateMovieSuggestionsOutputSchema, type GenerateMovieSuggestionsInput, type GenerateMovieSuggestionsOutput } from './generate-movie-suggestions-flow.types';

const prompt = ai.definePrompt({
  name: 'generateMovieSuggestionsPrompt',
  input: {schema: GenerateMovieSuggestionsInputSchema},
  output: {schema: GenerateMovieSuggestionsOutputSchema},
  prompt: `Tu es un expert en cinéma et un conteur créatif. Ton rôle est de générer une liste de suggestions de films pour un utilisateur. Les films peuvent être réels ou fictifs, mais doivent être crédibles et intéressants.

Génère une liste de {{count}} films.
{{#if genre}}
Le genre principal des films doit être : "{{genre}}". Tu peux inclure des sous-genres, mais le genre principal doit être respecté.
{{else}}
Les films doivent appartenir à des genres variés (Drame, Comédie, Sci-Fi, Thriller, Historique, Fantastique, etc.).
{{/if}}

Pour chaque film, fournis :
1.  Un 'id' unique (une courte chaîne de caractères aléatoires suffit).
2.  Un 'title' (titre) original et accrocheur.
3.  Une 'synopsis' (synopsis) courte et intrigante (une ou deux phrases).
4.  Un 'genre' principal.

Toutes les réponses doivent être en français. Réponds uniquement en respectant le format de sortie JSON demandé.`,
});

const generateMovieSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateMovieSuggestionsFlow',
    inputSchema: GenerateMovieSuggestionsInputSchema,
    outputSchema: GenerateMovieSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function generateMovieSuggestions(input: GenerateMovieSuggestionsInput): Promise<GenerateMovieSuggestionsOutput> {
  return generateMovieSuggestionsFlow(input);
}
