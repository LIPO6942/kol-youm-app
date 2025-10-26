'use server';

/**
 * Flow de suggestions de restaurants utilisant la base de données existante
 * Utilise les données du decision-maker-flow.ts original
 */

import { restaurantDatabase } from '@/lib/ai/restaurant-database';
import { DecisionMakerInputSchema, DecisionMakerOutputSchema, type DecisionMakerInput, type DecisionMakerOutput } from './decision-maker-flow.types';

export async function makeDecision(input: DecisionMakerInput): Promise<DecisionMakerOutput> {
  try {
    // Utiliser la base de données locale avec les vraies données
    const suggestions = restaurantDatabase.findSuggestions({
      category: input.category,
      zones: input.zones,
      seenPlaceNames: input.seenPlaceNames
    });

    return {
      suggestions
    };
  } catch (error) {
    console.error('Error in makeDecision:', error);
    
    // Fallback avec des suggestions génériques
    return {
      suggestions: [
        {
          placeName: 'Café de la Paix',
          location: 'Centre-ville de Tunis',
          description: 'Ambiance chaleureuse et café d\'excellente qualité',
          googleMapsUrl: 'https://maps.google.com/?q=Café+de+la+Paix+Centre-ville+Tunis'
        }
      ]
    };
  }
}
