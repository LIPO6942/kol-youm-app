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
1.  Un 'id' unique (une courte chaîne de caractères aléatoires).
2.  Un 'title' (titre) original et accrocheur.
3.  Une 'synopsis' (synopsis) courte et intrigante (une ou deux phrases).
4.  Une liste 'actors' de 2 ou 3 acteurs principaux (réels ou fictifs crédibles).
5.  Un 'rating' (note) estimé sur 10 (par exemple, 8.2).
6.  Une 'year' (année) de sortie crédible.
7.  Une 'wikipediaUrl' : une URL **valide et fonctionnelle** vers la page Wikipédia d'un film **réel** qui correspond au titre et au genre. Si le film que tu inventes est fictif, trouve un film réel similaire et utilise son URL Wikipédia. Privilégie la page Wikipédia en français si elle existe, sinon en anglais. L'URL doit commencer par "https://fr.wikipedia.org" ou "https://en.wikipedia.org".
8.  Un 'genre' principal.
9.  Un 'country' (pays) d'origine du film.

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
