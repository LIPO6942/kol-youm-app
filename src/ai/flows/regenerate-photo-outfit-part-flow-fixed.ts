'use server';

/**
 * Flow de fallback pour la régénération de parties d'outfit
 * Utilise des alternatives prédéfinies
 */

import { RegeneratePhotoOutfitPartInputSchema, RegeneratePhotoOutfitPartOutputSchema, type RegeneratePhotoOutfitPartInput, type RegeneratePhotoOutfitPartOutput } from './regenerate-photo-outfit-part-flow.types';

export async function regeneratePhotoOutfitPart(input: RegeneratePhotoOutfitPartInput): Promise<RegeneratePhotoOutfitPartOutput> {
  try {
    const partToChange = input.partToChange;
    const occasion = input.originalInput.occasion?.toLowerCase() || '';
    const weather = input.originalInput.weather?.toLowerCase() || '';
    const gender = input.originalInput.gender?.toLowerCase() || '';
    
    // Alternatives prédéfinies pour chaque partie
    const alternatives = {
      'haut': [
        'T-shirt confortable',
        'Chemise élégante',
        'Pull en coton',
        'Blouse décontractée',
        'Sweat-shirt à capuche',
        'Chemisier sophistiqué',
        'Débardeur sportif',
        'Cardigan chaleureux'
      ],
      'bas': [
        'Jeans slim',
        'Pantalon de costume',
        'Pantalon chino',
        'Jupe droite',
        'Short de sport',
        'Legging confortable',
        'Pantalon cargo',
        'Jupe plissée'
      ],
      'chaussures': [
        'Baskets blanches',
        'Chaussures de ville',
        'Bottines élégantes',
        'Sandales confortables',
        'Escarpins noirs',
        'Chaussures de sport',
        'Derbies en cuir',
        'Sneakers colorées'
      ],
      'accessoires': [
        'Sac à dos en cuir',
        'Sac à main élégant',
        'Ceinture assortie',
        'Montre classique',
        'Écharpe colorée',
        'Bijoux discrets',
        'Lunettes de soleil',
        'Attaché-case professionnel'
      ]
    };
    
    const partAlternatives = alternatives[partToChange as keyof typeof alternatives] || ['Accessoire approprié'];
    
    // Filtrer selon l'occasion
    let filteredAlternatives = [...partAlternatives];
    
    if (occasion.includes('travail') || occasion.includes('professionnel')) {
      if (partToChange === 'haut') {
        filteredAlternatives = ['Chemise blanche', 'Chemisier élégant', 'Pull professionnel'];
      } else if (partToChange === 'bas') {
        filteredAlternatives = ['Pantalon de costume', 'Jupe droite', 'Pantalon professionnel'];
      } else if (partToChange === 'chaussures') {
        filteredAlternatives = ['Chaussures de ville', 'Escarpins noirs', 'Derbies en cuir'];
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Attaché-case professionnel', 'Sac à main élégant', 'Montre classique'];
      }
    } else if (occasion.includes('sport')) {
      if (partToChange === 'haut') {
        filteredAlternatives = ['T-shirt technique', 'Débardeur sportif', 'Sweat-shirt à capuche'];
      } else if (partToChange === 'bas') {
        filteredAlternatives = ['Short de sport', 'Legging confortable', 'Pantalon de sport'];
      } else if (partToChange === 'chaussures') {
        filteredAlternatives = ['Chaussures de sport', 'Baskets confortables', 'Sneakers de running'];
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Bouteille d\'eau', 'Serviette', 'Casquette sportive'];
      }
    } else if (occasion.includes('soirée')) {
      if (partToChange === 'haut') {
        filteredAlternatives = ['Robe élégante', 'Chemisier sophistiqué', 'Top de soirée'];
      } else if (partToChange === 'bas') {
        filteredAlternatives = ['Jupe longue', 'Pantalon de soirée', 'Jupe droite'];
      } else if (partToChange === 'chaussures') {
        filteredAlternatives = ['Escarpins élégants', 'Chaussures de soirée', 'Sandales sophistiquées'];
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Sac à main de soirée', 'Bijoux élégants', 'Écharpe soyeuse'];
      }
    }
    
    // Adapter selon la météo
    if (weather.includes('froid') || weather.includes('pluie')) {
      if (partToChange === 'haut') {
        filteredAlternatives = filteredAlternatives.map(alt => alt.includes('Pull') || alt.includes('Cardigan') ? alt : 'Pull chaud, ' + alt);
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Écharpe chaude', 'Gants', 'Bonnet', ...filteredAlternatives];
      }
    } else if (weather.includes('chaud') || weather.includes('soleil')) {
      if (partToChange === 'haut') {
        filteredAlternatives = filteredAlternatives.map(alt => alt.includes('T-shirt') || alt.includes('Débardeur') ? alt : 'T-shirt léger, ' + alt);
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Lunettes de soleil', 'Chapeau', 'Crème solaire', ...filteredAlternatives];
      }
    }
    
    // Adapter selon le genre
    if (gender === 'femme') {
      if (partToChange === 'bas') {
        filteredAlternatives = filteredAlternatives.map(alt => alt.replace('Pantalon', 'Pantalon féminin'));
      }
      if (partToChange === 'chaussures') {
        filteredAlternatives = filteredAlternatives.map(alt => alt.replace('Chaussures', 'Chaussures féminines'));
      }
    } else if (gender === 'homme') {
      filteredAlternatives = filteredAlternatives.filter(alt => !alt.includes('Jupe') && !alt.includes('Escarpins'));
      if (partToChange === 'bas') {
        filteredAlternatives = filteredAlternatives.map(alt => alt.replace('Jupe', 'Pantalon'));
      }
    }
    
    // Choisir une alternative aléatoire différente de la description actuelle
    const currentDescription = input.currentPartDescription.toLowerCase();
    const differentAlternatives = filteredAlternatives.filter(alt => 
      !alt.toLowerCase().includes(currentDescription) && 
      !currentDescription.includes(alt.toLowerCase())
    );
    
    const selectedAlternative = differentAlternatives.length > 0 
      ? differentAlternatives[Math.floor(Math.random() * differentAlternatives.length)]
      : filteredAlternatives[Math.floor(Math.random() * filteredAlternatives.length)];
    
    return {
      newDescription: selectedAlternative
    };
  } catch (error) {
    console.error('Error in regeneratePhotoOutfitPart:', error);
    
    // Fallback générique
    const fallbacks = {
      'haut': 'T-shirt ou chemise confortable',
      'bas': 'Pantalon ou jean adapté',
      'chaussures': 'Chaussures appropriées',
      'accessoires': 'Accessoires selon vos préférences'
    };
    
    return {
      newDescription: fallbacks[input.partToChange as keyof typeof fallbacks] || 'Accessoire approprié'
    };
  }
}
