'use server';

/**
 * Nouvelle version du flow de suggestions de films utilisant des alternatives gratuites
 * Utilise Hugging Face API (gratuit) ou base de données locale en fallback
 */

import { huggingFaceAI } from '@/lib/ai/huggingface';
import { localDatabase } from '@/lib/ai/local-database';
import { GenerateMovieSuggestionsInputSchema, GenerateMovieSuggestionsOutputSchema, type GenerateMovieSuggestionsInput, type GenerateMovieSuggestionsOutput } from './generate-movie-suggestions-flow.types';

export async function generateMovieSuggestions(input: GenerateMovieSuggestionsInput): Promise<GenerateMovieSuggestionsOutput> {
  try {
    // Essayer d'abord Hugging Face API (gratuit)
    const aiResponse = await huggingFaceAI.generateMovieSuggestions({
      genre: input.genre,
      count: input.count,
      seenMovieTitles: input.seenMovieTitles
    });

    return {
      movies: aiResponse.movies
    };
  } catch (error) {
    console.log('Hugging Face API failed, using local database:', error);
    
    // Fallback vers la base de données locale
    const localSuggestions = localDatabase.findMovieSuggestions({
      genre: input.genre,
      seenMovieTitles: input.seenMovieTitles,
      count: input.count
    });

    return {
      movies: localSuggestions
    };
  }
}
