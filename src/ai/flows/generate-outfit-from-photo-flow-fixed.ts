 

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
        bas: 'Pantalon de costume ou jean droit',
        chaussures: 'Chaussures de ville ou baskets',
        accessoires: 'Sac à main ou attaché-case'
      },
      'bas': {
        haut: 'Chemise ou t-shirt élégant',
        chaussures: 'Chaussures assorties',
        accessoires: 'Ceinture et sac'
      },
      'chaussures': {
        haut: 'T-shirt ou chemise',
        bas: 'Pantalon ou jean',
        accessoires: 'Sac et bijoux'
      },
      'accessoires': {
        haut: 'T-shirt ou chemise',
        bas: 'Pantalon ou jean',
        chaussures: 'Chaussures confortables'
      }
    };
    
    const baseSuggestionsRaw = suggestions[baseItemType as keyof typeof suggestions] || suggestions['haut'];
    // Toujours garantir les 4 clés pour éviter les erreurs de type
    const adaptedSuggestions: Record<'haut' | 'bas' | 'chaussures' | 'accessoires', string> = {
      haut: (baseSuggestionsRaw as any).haut || 'T-shirt ou chemise',
      bas: (baseSuggestionsRaw as any).bas || 'Pantalon ou jean',
      chaussures: (baseSuggestionsRaw as any).chaussures || 'Chaussures appropriées',
      accessoires: (baseSuggestionsRaw as any).accessoires || 'Accessoires selon vos préférences'
    };
    
    // Adapter selon l'occasion
    if (occasion.includes('travail') || occasion.includes('professionnel')) {
      adaptedSuggestions.haut = 'Chemise blanche ou chemisier élégant';
      adaptedSuggestions.bas = 'Pantalon de costume ou jupe droite';
      adaptedSuggestions.chaussures = 'Chaussures de ville ou talons';
      adaptedSuggestions.accessoires = 'Attaché-case ou sac professionnel';
    } else if (occasion.includes('sport')) {
      adaptedSuggestions.haut = 'T-shirt technique';
      adaptedSuggestions.bas = 'Short de sport ou legging';
      adaptedSuggestions.chaussures = 'Chaussures de sport';
      adaptedSuggestions.accessoires = 'Bouteille d\'eau et serviette';
    } else if (occasion.includes('soirée')) {
      adaptedSuggestions.haut = 'Robe élégante ou costume de soirée';
      adaptedSuggestions.bas = 'N/A (robe)';
      adaptedSuggestions.chaussures = 'Escarpins ou chaussures de soirée';
      adaptedSuggestions.accessoires = 'Bijoux élégants et sac à main';
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
