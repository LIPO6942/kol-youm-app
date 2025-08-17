
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
  prompt: `Tu es un expert en cinéma et un cinéphile passionné. Ton rôle est de générer une liste de suggestions de films **réels** et **existants** pour un utilisateur.

Tes suggestions doivent inclure un mélange de films populaires et de pépites moins connues mais acclamées par la critique, pour garantir la découverte.

Génère une liste de {{count}} films.
**Assure-toi que la note ('rating') de chaque film est impérativement de 7.0 ou plus sur 10.**
**Très important : Tous les films suggérés doivent avoir une année de sortie ('year') égale ou supérieure à 1997.**

{{#if genre}}
Le genre principal des films doit être : "{{genre}}".
{{else}}
Les films doivent appartenir à des genres variés et intéressants (Drame, Comédie, Sci-Fi, Thriller, Mind-Blow, Fantastique, etc.).
{{/if}}

**Instructions cruciales pour la diversité :**
- **Sois créatif et surprenant !** Ne te contente pas des blockbusters les plus évidents. Propose des films de différentes époques et nationalités (tout en respectant la contrainte de l'année).
- **La fraîcheur est la clé.** À chaque nouvelle demande, même pour le même genre, essaie de proposer une liste **complètement différente** de la précédente. Imagine que tu parles à la même personne et que tu ne veux pas la lasser.

{{#if seenMovieTitles}}
**Important :** Il est impératif d'exclure les films suivants de tes suggestions, car l'utilisateur les a déjà vus :
{{#each seenMovieTitles}}
- {{this}}
{{/each}}
{{/if}}

Pour chaque film, fournis des informations **exactes et cohérentes** :
1.  Un 'id' unique (une courte chaîne de caractères aléatoires).
2.  Le 'title' (titre) exact du film.
3.  Une 'synopsis' (synopsis) courte et intrigante (une ou deux phrases).
4.  Une liste 'actors' des 2 ou 3 acteurs principaux **réels** du film.
5.  Un 'rating' (note) estimé sur 10, qui doit être de 7.0 ou plus.
6.  L' 'year' (année) de sortie exacte du film (supérieure ou égale à 1997).
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
