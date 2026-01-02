

/**
 * Flow de fallback pour la régénération de parties d'outfit
 * Utilise des alternatives prédéfinies
 */

import { RegeneratePhotoOutfitPartInputSchema, RegeneratePhotoOutfitPartOutputSchema, type RegeneratePhotoOutfitPartInput, type RegeneratePhotoOutfitPartOutput } from './regenerate-photo-outfit-part-flow.types';

export async function regeneratePhotoOutfitPart(input: RegeneratePhotoOutfitPartInput): Promise<RegeneratePhotoOutfitPartOutput> {
  try {
    const partToChange = input.partToChange;
    const occasion = input.originalInput.occasion?.toLowerCase() || '';
    const scheduleKeywords = input.originalInput.scheduleKeywords?.toLowerCase() || '';
    const weather = input.originalInput.weather?.toLowerCase() || '';
    const gender = input.originalInput.gender?.toLowerCase() || '';

    // Alternatives prédéfinies pour chaque partie
    // (Considérer l'ajustement des listes de base si nécessaire, mais le filtrage fera le gros du travail)
    const alternatives = {
      'haut': [
        'Un t-shirt confortable',
        'Une chemise élégante',
        'Un pull en coton',
        'Une blouse décontractée',
        'Un sweat-shirt à capuche',
        'Un chemisier sophistiqué',
        'Un débardeur sportif',
        'Un cardigan chaleureux'
      ],
      'bas': [
        'Un jean slim',
        'Un pantalon de costume',
        'Un pantalon chino',
        'Une jupe droite',
        'Un short de sport',
        'Un legging confortable',
        'Un pantalon cargo',
        'Une jupe plissée'
      ],
      'chaussures': [
        'Une paire de baskets blanches',
        'Une paire de chaussures de ville',
        'Une paire de bottines élégantes',
        'Une paire de sandales confortables',
        'Une paire d\'escarpins noirs',
        'Une paire de chaussures de sport',
        'Une paire de derbies en cuir',
        'Une paire de sneakers colorées'
      ],
      'accessoires': [
        'Un sac à dos en cuir',
        'Un sac à main élégant',
        'Une ceinture assortie',
        'Une montre classique',
        'Une écharpe colorée',
        'Des bijoux discrets', // Pluriel difficile à éviter parfois mais on peut essayer 'Un bijou discret'
        'Une paire de lunettes de soleil',
        'Un attaché-case professionnel'
      ]
    };

    const partAlternatives = alternatives[partToChange as keyof typeof alternatives] || ['Un accessoire approprié'];

    // Filtrer selon l'occasion et les mots-clés
    let filteredAlternatives = [...partAlternatives];

    const isBusiness = occasion.includes('travail') || occasion.includes('professionnel') || scheduleKeywords.includes('réunion') || scheduleKeywords.includes('bureau');
    const isSport = occasion.includes('sport') || scheduleKeywords.includes('sport') || scheduleKeywords.includes('gym');
    const isEvening = occasion.includes('soirée') || scheduleKeywords.includes('soirée');

    if (isBusiness) {
      if (partToChange === 'haut') {
        filteredAlternatives = ['Une chemise blanche', 'Un chemisier élégant', 'Un pull professionnel'];
      } else if (partToChange === 'bas') {
        filteredAlternatives = ['Un pantalon de costume', 'Une jupe droite', 'Un pantalon professionnel'];
      } else if (partToChange === 'chaussures') {
        filteredAlternatives = ['Une paire de chaussures de ville', 'Une paire d\'escarpins noirs', 'Une paire de derbies en cuir'];
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Un attaché-case professionnel', 'Un sac à main élégant', 'Une montre classique'];
      }
    } else if (isSport) {
      if (partToChange === 'haut') {
        filteredAlternatives = ['Un t-shirt technique', 'Un débardeur sportif', 'Un sweat-shirt à capuche'];
      } else if (partToChange === 'bas') {
        filteredAlternatives = ['Un short de sport', 'Un legging confortable', 'Un pantalon de sport'];
      } else if (partToChange === 'chaussures') {
        filteredAlternatives = ['Une paire de chaussures de sport', 'Une paire de baskets confortables', 'Une paire de running'];
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Une gourde', 'Une serviette', 'Une casquette sportive'];
      }
    } else if (isEvening) {
      if (partToChange === 'haut') {
        filteredAlternatives = ['Une robe élégante', 'Un chemisier sophistiqué', 'Un top de soirée'];
      } else if (partToChange === 'bas') {
        filteredAlternatives = ['Une jupe longue', 'Un pantalon de soirée', 'Une jupe droite'];
      } else if (partToChange === 'chaussures') {
        filteredAlternatives = ['Une paire d\'escarpins élégants', 'Une paire de chaussures de soirée', 'Une paire de sandales sophistiquées'];
      } else if (partToChange === 'accessoires') {
        filteredAlternatives = ['Un sac à main de soirée', 'Un bijou élégant', 'Une écharpe soyeuse'];
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
