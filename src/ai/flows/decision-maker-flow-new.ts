'use server';

/**
 * Nouvelle version du flow de suggestions de restaurants/cafés utilisant des alternatives gratuites
 * Utilise Hugging Face API (gratuit) ou base de données locale en fallback
 */

import { huggingFaceAI } from '@/lib/ai/huggingface';
import { localDatabase } from '@/lib/ai/local-database';
import { DecisionMakerInputSchema, DecisionMakerOutputSchema, type DecisionMakerInput, type DecisionMakerOutput } from './decision-maker-flow.types';

export async function makeDecision(input: DecisionMakerInput): Promise<DecisionMakerOutput> {
  try {
    // Essayer d'abord Hugging Face API (gratuit)
    const aiResponse = await huggingFaceAI.generateRestaurantSuggestions({
      category: input.category,
      city: input.city,
      zones: input.zones,
      seenPlaceNames: input.seenPlaceNames
    });

    return {
      suggestions: aiResponse.suggestions
    };
  } catch (error) {
    console.log('Hugging Face API failed, using local database:', error);
    
    // Fallback vers la base de données locale
    const localSuggestions = localDatabase.findRestaurantSuggestions({
      category: input.category,
      zones: input.zones,
      seenPlaceNames: input.seenPlaceNames
    });

    return {
      suggestions: localSuggestions
    };
  }
}
