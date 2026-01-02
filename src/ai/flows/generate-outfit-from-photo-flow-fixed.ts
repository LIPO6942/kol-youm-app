

/**
 * Flow de fallback pour la génération de tenues à partir de photos
 * Utilise des suggestions prédéfinies au lieu de l'IA
 */

import { GenerateOutfitFromPhotoInputSchema, GenerateOutfitFromPhotoOutputSchema, type GenerateOutfitFromPhotoInput, type GenerateOutfitFromPhotoOutput } from './generate-outfit-from-photo-flow.types';

export async function generateOutfitFromPhoto(input: GenerateOutfitFromPhotoInput): Promise<GenerateOutfitFromPhotoOutput> {
  try {
    const baseItemType = input.baseItemType?.toLowerCase() || '';
    const occasion = input.occasion?.toLowerCase() || '';
    const weather = input.weather?.toLowerCase() || '';
    const gender = input.gender?.toLowerCase() || '';

    // Suggestions prédéfinies selon le type de pièce de base
    const suggestions = {
      'haut': {
        bas: 'Un pantalon de costume',
        chaussures: 'Une paire de chaussures de ville',
        accessoires: 'Un sac à dos en cuir'
      },
      'bas': {
        haut: 'Une chemise élégante',
        chaussures: 'Une paire de chaussures assortie',
        accessoires: 'Une ceinture en cuir'
      },
      'chaussures': {
        haut: 'Un t-shirt basique',
        bas: 'Un jean coupe droite',
        accessoires: 'Une montre minimaliste'
      },
      'accessoires': {
        haut: 'Une chemise casual',
        bas: 'Un pantalon chino',
        chaussures: 'Une paire de baskets'
      }
    };

    const baseSuggestionsRaw = suggestions[baseItemType as keyof typeof suggestions] || suggestions['haut'];
    // Toujours garantir les 4 clés pour éviter les erreurs de type
    const adaptedSuggestions: Record<'haut' | 'bas' | 'chaussures' | 'accessoires', string> = {
      haut: (baseSuggestionsRaw as any).haut || 'Une chemise',
      bas: (baseSuggestionsRaw as any).bas || 'Un pantalon',
      chaussures: (baseSuggestionsRaw as any).chaussures || 'Une paire de chaussures',
      accessoires: (baseSuggestionsRaw as any).accessoires || 'Un accessoire'
    };

    // Adapter selon l'occasion
    if (occasion.includes('travail') || occasion.includes('professionnel')) {
      adaptedSuggestions.haut = 'Une chemise blanche';
      adaptedSuggestions.bas = 'Un pantalon de costume';
      adaptedSuggestions.chaussures = 'Une paire de chaussures de ville';
      adaptedSuggestions.accessoires = 'Un attaché-case';
    } else if (occasion.includes('sport')) {
      adaptedSuggestions.haut = 'Un t-shirt technique';
      adaptedSuggestions.bas = 'Un short de sport';
      adaptedSuggestions.chaussures = 'Une paire de chaussures de running';
      adaptedSuggestions.accessoires = 'Une gourde sportive';
    } else if (occasion.includes('soirée')) {
      adaptedSuggestions.haut = 'Une veste de smoking';
      adaptedSuggestions.bas = 'N/A (robe)';
      adaptedSuggestions.chaussures = 'Une paire de chaussures de soirée';
      adaptedSuggestions.accessoires = 'Une pochette élégante';
    }

    // Adapter selon la météo
    if (weather.includes('froid') || weather.includes('pluie')) {
      adaptedSuggestions.haut = 'Pull chaud, ' + adaptedSuggestions.haut;
      adaptedSuggestions.accessoires = 'Écharpe et ' + adaptedSuggestions.accessoires;
    } else if (weather.includes('chaud') || weather.includes('soleil')) {
      adaptedSuggestions.haut = 'T-shirt léger ou ' + adaptedSuggestions.haut;
      adaptedSuggestions.accessoires = 'Lunettes de soleil et ' + adaptedSuggestions.accessoires;
    }

    // Adapter selon le genre
    if (gender === 'femme') {
      if (adaptedSuggestions.bas.includes('pantalon')) {
        adaptedSuggestions.bas = adaptedSuggestions.bas.replace('pantalon', 'pantalon féminin');
      }
      if (adaptedSuggestions.chaussures.includes('chaussures')) {
        adaptedSuggestions.chaussures = adaptedSuggestions.chaussures.replace('chaussures', 'chaussures féminines');
      }
    } else if (gender === 'homme') {
      if (adaptedSuggestions.bas.includes('jupe')) {
        adaptedSuggestions.bas = 'Pantalon de costume';
      }
      if (adaptedSuggestions.chaussures.includes('talons')) {
        adaptedSuggestions.chaussures = 'Chaussures de ville';
      }
    }

    // Retourner les suggestions en excluant la pièce de base
    const result: GenerateOutfitFromPhotoOutput = {
      haut: { description: baseItemType === 'haut' ? 'N/A' : adaptedSuggestions.haut },
      bas: { description: baseItemType === 'bas' ? 'N/A' : adaptedSuggestions.bas },
      chaussures: { description: baseItemType === 'chaussures' ? 'N/A' : adaptedSuggestions.chaussures },
      accessoires: { description: baseItemType === 'accessoires' ? 'N/A' : adaptedSuggestions.accessoires }
    };

    return result;
  } catch (error) {
    console.error('Error in generateOutfitFromPhoto:', error);

    // Fallback générique
    return {
      haut: { description: 'T-shirt ou chemise confortable' },
      bas: { description: 'Pantalon ou jean adapté' },
      chaussures: { description: 'Chaussures appropriées' },
      accessoires: { description: 'Accessoires selon vos préférences' }
    };
  }
}
