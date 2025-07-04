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
  prompt: `Tu es un expert en cinéma. Ton rôle est de générer une liste de suggestions de films **réels** et **existants** pour un utilisateur.

Génère une liste de {{count}} films.
{{#if genre}}
Le genre principal des films doit être : "{{genre}}".
{{else}}
Les films doivent appartenir à des genres variés (Drame, Comédie, Sci-Fi, Thriller, Historique, Fantastique, etc.).
{{/if}}

Pour chaque film, fournis des informations **exactes et cohérentes** :
1.  Un 'id' unique (une courte chaîne de caractères aléatoires).
2.  Le 'title' (titre) exact du film.
3.  Une 'synopsis' (synopsis) courte et intrigante (une ou deux phrases).
4.  Une liste 'actors' des 2 ou 3 acteurs principaux **réels** du film.
5.  Un 'rating' (note) estimé sur 10 (par exemple, 8.2), basé sur sa popularité et sa critique.
6.  L' 'year' (année) de sortie exacte du film.
7.  Une 'wikipediaUrl' : l'URL **valide et fonctionnelle** vers la page Wikipédia du film. Privilégie la page Wikipédia en français si elle existe, sinon en anglais. L'URL doit commencer par "https://fr.wikipedia.org" ou "https://en.wikipedia.org".
8.  Le 'genre' principal du film.
9.  Le 'country' (pays) d'origine du film.

Toutes les réponses doivent être en français. Réponds uniquement en respectant le format de sortie JSON demandé et assure-toi que toutes les informations pour un film donné (titre, acteurs, année, url) sont correctes et se rapportent bien au même film.`,
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
