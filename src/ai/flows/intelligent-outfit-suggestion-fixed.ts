

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
    haut: 'Une chemise bien coupée ou polo habillé',
    bas: 'Un pantalon chino ajusté ou jean brut soigné',
    chaussures: 'Une paire de sneakers en cuir blanc ou mocassins souples',
    accessoires: 'Une montre sobre',
    suggestionText: 'Look soigné et contemporain pour le bureau et la vie active de tous les jours.'
  },
  sport: {
    haut: 'Un t-shirt technique respirant ou hoodie léger',
    bas: 'Un pantalon jogger structuré ou short de sport',
    chaussures: 'Une paire de chaussures de running',
    accessoires: 'Une gourde ou casquette',
    suggestionText: 'Tenue sportive confortable et fonctionnelle, parfaite pour bouger.'
  },
  evening: {
    haut: 'Une surchemise en velours ou veste casual chic',
    bas: 'Un pantalon chino sombre ou jean noir épuré',
    chaussures: 'Des bottines chelsea ou baskets en cuir soignées',
    accessoires: 'Une montre en cuir',
    suggestionText: 'Tenue élégante et moderne pour sortir le soir en toute décontraction.'
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
        adaptedSuggestion.bas = 'Jeans ou pantalon chino féminin';
        adaptedSuggestion.chaussures = 'Baskets ou chaussures plates confortables';
      } else if (outfitType === 'evening') {
        adaptedSuggestion.haut = 'Une robe élégante ou blouse satinée';
        adaptedSuggestion.bas = 'Pantalon tailleur fluide ou jupe plissée';
        adaptedSuggestion.chaussures = 'Une paire de babies ou bottines élégantes';
        adaptedSuggestion.accessoires = 'Un sac à main fin';
      }
    } else if (gender === 'homme') {
      if (outfitType === 'casual') {
        adaptedSuggestion.bas = 'Un jean straight ou pantalon chino';
        adaptedSuggestion.chaussures = 'Une paire de sneakers modernes';
      } else if (outfitType === 'evening') {
        adaptedSuggestion.haut = 'Surchemise soignée ou blazer décontracté sur t-shirt uni';
        adaptedSuggestion.bas = 'Pantalon chino sombre ou jean brut';
        adaptedSuggestion.chaussures = 'Sneakers en cuir blanc ou bottines chelsea';
        adaptedSuggestion.accessoires = 'Montre sobre en cuir';
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
