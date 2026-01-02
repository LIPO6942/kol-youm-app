

/**
 * Flow de fallback simple pour les suggestions de tenues
 * Utilise des suggestions prédéfinies intelligentes
 */

import { SuggestOutfitInputSchema, SuggestOutfitOutputSchema, type SuggestOutfitInput, type SuggestOutfitOutput } from './intelligent-outfit-suggestion.types';

const outfitSuggestions = {
  casual: {
    haut: 'Un t-shirt confortable',
    bas: 'Un jean slim',
    chaussures: 'Une paire de baskets blanches',
    accessoires: 'Un sac à dos en cuir',
    suggestionText: 'Look décontracté et moderne, parfait pour une sortie entre amis ou une balade en ville.'
  },
  business: {
    haut: 'Une chemise blanche',
    bas: 'Un pantalon de costume',
    chaussures: 'Une paire de chaussures de ville',
    accessoires: 'Un attaché-case',
    suggestionText: 'Look professionnel et sophistiqué, parfait pour le travail ou les rendez-vous importants.'
  },
  sport: {
    haut: 'Un t-shirt technique',
    bas: 'Un short de sport',
    chaussures: 'Une paire de chaussures de running',
    accessoires: 'Une gourde',
    suggestionText: 'Tenue sportive confortable et fonctionnelle, parfaite pour l\'exercice.'
  },
  evening: {
    haut: 'Une robe élégante',
    bas: 'N/A (robe)',
    chaussures: 'Une paire d\'escarpins',
    accessoires: 'Une pochette élégante',
    suggestionText: 'Tenue de soirée glamour et raffinée, parfaite pour les événements spéciaux.'
  }
};

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  try {
    // Déterminer le type de tenue basé sur l'occasion et les mots-clés
    let outfitType = 'casual';

    const occasion = input.occasion?.toLowerCase() || '';
    const keywords = input.scheduleKeywords?.toLowerCase() || '';
    const gender = (input.gender || '').toLowerCase();
    const preferredColorsRaw = (input.preferredColors || '').split(',').map((c: string) => c.trim()).filter(Boolean);
    const preferredColor = preferredColorsRaw[0] || '';

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
    if (gender === 'femme') {
      if (outfitType === 'casual') {
        adaptedSuggestion.bas = 'Jeans skinny ou pantalon chino féminin';
        adaptedSuggestion.chaussures = 'Baskets ou chaussures plates confortables';
      }
    } else if (gender === 'homme') {
      if (outfitType === 'casual') {
        adaptedSuggestion.bas = 'Un jean straight';
        adaptedSuggestion.chaussures = 'Une paire de baskets';
      }
    }

    // Appliquer les couleurs préférées si présentes
    if (preferredColor) {
      const colorTag = ` (${preferredColor.toLowerCase()})`;
      adaptedSuggestion.haut = adaptedSuggestion.haut.includes(preferredColor) ? adaptedSuggestion.haut : adaptedSuggestion.haut + colorTag;
      adaptedSuggestion.bas = adaptedSuggestion.bas.includes(preferredColor) ? adaptedSuggestion.bas : adaptedSuggestion.bas + colorTag;
      adaptedSuggestion.chaussures = adaptedSuggestion.chaussures.includes(preferredColor) ? adaptedSuggestion.chaussures : adaptedSuggestion.chaussures + colorTag;
      adaptedSuggestion.accessoires = adaptedSuggestion.accessoires.includes(preferredColor) ? adaptedSuggestion.accessoires : adaptedSuggestion.accessoires + colorTag;
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
