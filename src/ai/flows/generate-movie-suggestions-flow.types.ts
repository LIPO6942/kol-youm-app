import {z} from 'genkit';

export const GenerateMovieSuggestionsInputSchema = z.object({
  genre: z.string().optional().describe('The genre of movies to suggest, e.g., "Sci-Fi", "Thriller".'),
  count: z.number().optional().default(7).describe('The number of movie suggestions to generate.'),
});
export type GenerateMovieSuggestionsInput = z.infer<typeof GenerateMovieSuggestionsInputSchema>;

export const MovieSuggestionSchema = z.object({
    id: z.string().describe('A unique ID for the movie, can be a short random string.'),
    title: z.string().describe('The title of the movie.'),
    synopsis: z.string().describe('A short, one or two sentence synopsis of the movie.'),
    actors: z.array(z.string()).describe('A list of 2-3 main actors in the movie.'),
    rating: z.number().min(0).max(10).describe('An estimated movie rating on a scale of 1 to 10.'),
    year: z.number().describe('The release year of the movie.'),
    wikipediaUrl: z.string().describe("A valid URL to the movie's Wikipedia page (French if available, otherwise English)."),
    genre: z.string().describe('The main genre of the movie.'),
});
export type MovieSuggestion = z.infer<typeof MovieSuggestionSchema>;

export const GenerateMovieSuggestionsOutputSchema = z.object({
  movies: z.array(MovieSuggestionSchema).describe('A list of movie suggestions.'),
});
export type GenerateMovieSuggestionsOutput = z.infer<typeof GenerateMovieSuggestionsOutputSchema>;
