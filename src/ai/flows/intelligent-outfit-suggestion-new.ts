'use server';

/**
 * Nouvelle version du flow de suggestion de tenues utilisant des alternatives gratuites
 * Utilise Hugging Face API (gratuit) ou base de données locale en fallback
 */

import { huggingFaceAI } from '@/lib/ai/huggingface';
import { localDatabase } from '@/lib/ai/local-database';
import { SuggestOutfitInputSchema, SuggestOutfitOutputSchema, type SuggestOutfitInput, type SuggestOutfitOutput } from './intelligent-outfit-suggestion.types';

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  try {
    // Essayer d'abord Hugging Face API (gratuit)
    const aiResponse = await huggingFaceAI.generateOutfitSuggestion({
      scheduleKeywords: input.scheduleKeywords,
      weather: input.weather,
      occasion: input.occasion,
      preferredColors: input.preferredColors,
      gender: input.gender,
      baseItem: input.baseItem
    });

    return {
      haut: { description: aiResponse.haut },
      bas: { description: aiResponse.bas },
      chaussures: { description: aiResponse.chaussures },
      accessoires: { description: aiResponse.accessoires },
      suggestionText: aiResponse.suggestionText
    };
  } catch (error) {
    console.log('Hugging Face API failed, using local database:', error);
    
    // Fallback vers la base de données locale
    const localSuggestions = localDatabase.findOutfitSuggestions({
      weather: input.weather,
      occasion: input.occasion,
      gender: input.gender,
      preferredColors: input.preferredColors,
      scheduleKeywords: input.scheduleKeywords
    });

    if (localSuggestions.length > 0) {
      // Prendre une suggestion aléatoire
      const randomSuggestion = localSuggestions[Math.floor(Math.random() * localSuggestions.length)];
      return {
        haut: { description: randomSuggestion.haut },
        bas: { description: randomSuggestion.bas },
        chaussures: { description: randomSuggestion.chaussures },
        accessoires: { description: randomSuggestion.accessoires },
        suggestionText: randomSuggestion.suggestionText
      };
    }

    // Dernier fallback avec une suggestion générique
    return {
      haut: { description: "T-shirt ou chemise confortable" },
      bas: { description: "Pantalon ou jean adapté à l'occasion" },
      chaussures: { description: "Chaussures confortables et appropriées" },
      accessoires: { description: "Accessoires selon vos préférences" },
      suggestionText: "Tenue adaptée à votre activité et à la météo"
    };
  }
}
