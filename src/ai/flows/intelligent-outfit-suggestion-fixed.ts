'use server';

/**
 * Flow de fallback simple pour les suggestions de tenues
 * Utilise des suggestions prédéfinies intelligentes
 */

import { SuggestOutfitInputSchema, SuggestOutfitOutputSchema, type SuggestOutfitInput, type SuggestOutfitOutput } from './intelligent-outfit-suggestion.types';

const outfitSuggestions = {
  casual: {
    haut: 'T-shirt confortable ou chemise décontractée',
    bas: 'Jeans slim ou pantalon chino',
    chaussures: 'Baskets blanches ou chaussures de toile',
    accessoires: 'Sac à dos en cuir ou sac bandoulière',
    suggestionText: 'Look décontracté et moderne, parfait pour une sortie entre amis ou une balade en ville.'
  },
  business: {
    haut: 'Chemise blanche ou chemisier élégant',
    bas: 'Pantalon de costume ou jupe droite',
    chaussures: 'Chaussures de ville ou talons noirs',
    accessoires: 'Attaché-case ou sac à main professionnel',
    suggestionText: 'Look professionnel et sophistiqué, parfait pour le travail ou les rendez-vous importants.'
  },
  sport: {
    haut: 'T-shirt technique ou débardeur',
    bas: 'Short de sport ou legging',
    chaussures: 'Chaussures de running',
    accessoires: 'Bouteille d\'eau et serviette',
    suggestionText: 'Tenue sportive confortable et fonctionnelle, parfaite pour l\'exercice.'
  },
  evening: {
    haut: 'Robe élégante ou costume de soirée',
    bas: 'N/A (robe) ou pantalon de costume',
    chaussures: 'Escarpins ou chaussures de soirée',
    accessoires: 'Bijoux élégants et sac à main',
    suggestionText: 'Tenue de soirée glamour et raffinée, parfaite pour les événements spéciaux.'
  }
};

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  try {
    // Déterminer le type de tenue basé sur l'occasion et les mots-clés
    let outfitType = 'casual';
    
    const occasion = input.occasion?.toLowerCase() || '';
    const keywords = input.scheduleKeywords?.toLowerCase() || '';
    
    if (occasion.includes('travail') || occasion.includes('professionnel') || keywords.includes('bureau')) {
      outfitType = 'business';
    } else if (occasion.includes('sport') || keywords.includes('gym') || keywords.includes('course')) {
      outfitType = 'sport';
    } else if (occasion.includes('soirée') || occasion.includes('gala') || occasion.includes('mariage')) {
      outfitType = 'evening';
    }

    const suggestion = outfitSuggestions[outfitType as keyof typeof outfitSuggestions];
    
    // Adapter selon la météo
    let adaptedSuggestion = { ...suggestion };
    
    if (input.weather?.toLowerCase().includes('froid') || input.weather?.toLowerCase().includes('pluie')) {
      adaptedSuggestion.haut = 'Pull ou cardigan chaud, ' + adaptedSuggestion.haut;
      adaptedSuggestion.accessoires = 'Écharpe et ' + adaptedSuggestion.accessoires;
    } else if (input.weather?.toLowerCase().includes('chaud') || input.weather?.toLowerCase().includes('soleil')) {
      adaptedSuggestion.haut = 'T-shirt léger ou ' + adaptedSuggestion.haut;
      adaptedSuggestion.accessoires = 'Lunettes de soleil et ' + adaptedSuggestion.accessoires;
    }

    // Adapter selon le genre
    if (input.gender?.toLowerCase() === 'femme') {
      if (outfitType === 'casual') {
        adaptedSuggestion.bas = 'Jeans skinny ou pantalon chino féminin';
        adaptedSuggestion.chaussures = 'Baskets ou chaussures plates confortables';
      }
    } else if (input.gender?.toLowerCase() === 'homme') {
      if (outfitType === 'casual') {
        adaptedSuggestion.bas = 'Jeans droit ou pantalon chino masculin';
        adaptedSuggestion.chaussures = 'Baskets ou chaussures de toile';
      }
    }

    return {
      haut: { description: adaptedSuggestion.haut },
      bas: { description: adaptedSuggestion.bas },
      chaussures: { description: adaptedSuggestion.chaussures },
      accessoires: { description: adaptedSuggestion.accessoires },
      suggestionText: adaptedSuggestion.suggestionText
    };
  } catch (error) {
    console.error('Error in suggestOutfit:', error);
    
    // Fallback générique
    return {
      haut: { description: 'T-shirt ou chemise confortable' },
      bas: { description: 'Pantalon ou jean adapté à l\'occasion' },
      chaussures: { description: 'Chaussures confortables et appropriées' },
      accessoires: { description: 'Accessoires selon vos préférences' },
      suggestionText: 'Tenue adaptée à votre activité et à la météo'
    };
  }
}
