/**
 * Base de données locale pour les suggestions - Alternative gratuite aux APIs IA
 * Fonctionne entièrement hors ligne avec des données prédéfinies intelligentes
 */

export interface OutfitSuggestion {
  id: string;
  haut: string;
  bas: string;
  chaussures: string;
  accessoires: string;
  suggestionText: string;
  tags: string[];
  weather: string[];
  occasion: string[];
  gender: string[];
}

export interface MovieSuggestion {
  id: string;
  title: string;
  synopsis: string;
  actors: string[];
  rating: number;
  year: number;
  wikipediaUrl: string;
  genre: string;
  country: string;
  tags: string[];
}

export interface RestaurantSuggestion {
  id: string;
  name: string;
  location: string;
  description: string;
  googleMapsUrl: string;
  category: string;
  zone: string;
  tags: string[];
}

class LocalDatabase {
  private outfitSuggestions: OutfitSuggestion[] = [
    // Tenues décontractées
    {
      id: 'casual-1',
      haut: 'T-shirt blanc basique ou chemise à carreaux',
      bas: 'Jeans slim ou pantalon chino beige',
      chaussures: 'Baskets blanches ou chaussures de toile',
      accessoires: 'Sac à dos en cuir ou sac bandoulière',
      suggestionText: 'Look décontracté et moderne, parfait pour une sortie entre amis ou une balade en ville.',
      tags: ['décontracté', 'moderne', 'confortable'],
      weather: ['ensoleillé', 'nuageux'],
      occasion: ['sortie', 'balade', 'shopping'],
      gender: ['homme', 'femme']
    },
    {
      id: 'casual-2',
      haut: 'Pull en coton ou cardigan',
      bas: 'Jean droit ou pantalon cargo',
      chaussures: 'Bottines ou sneakers',
      accessoires: 'Écharpe colorée et sac à main',
      suggestionText: 'Tenue confortable et stylée, idéale pour une journée détendue.',
      tags: ['confortable', 'stylé', 'polyvalent'],
      weather: ['frais', 'nuageux'],
      occasion: ['sortie', 'rendez-vous', 'travail'],
      gender: ['homme', 'femme']
    },
    // Tenues professionnelles
    {
      id: 'business-1',
      haut: 'Chemise blanche ou chemisier élégant',
      bas: 'Pantalon de costume noir ou jupe droite',
      chaussures: 'Chaussures de ville ou talons noirs',
      accessoires: 'Attaché-case ou sac à main professionnel',
      suggestionText: 'Look professionnel et sophistiqué, parfait pour le travail ou les rendez-vous importants.',
      tags: ['professionnel', 'élégant', 'sophistiqué'],
      weather: ['tous'],
      occasion: ['travail', 'rendez-vous', 'réunion'],
      gender: ['homme', 'femme']
    },
    {
      id: 'business-2',
      haut: 'Blazer ou veste de costume',
      bas: 'Pantalon de costume ou jupe crayon',
      chaussures: 'Chaussures de ville ou escarpins',
      accessoires: 'Montre élégante et sac professionnel',
      suggestionText: 'Tenue business moderne et confiante, idéale pour impressionner.',
      tags: ['business', 'moderne', 'confiant'],
      weather: ['tous'],
      occasion: ['travail', 'présentation', 'entretien'],
      gender: ['homme', 'femme']
    },
    // Tenues sportives
    {
      id: 'sport-1',
      haut: 'T-shirt technique ou débardeur',
      bas: 'Short de sport ou legging',
      chaussures: 'Chaussures de running',
      accessoires: 'Bouteille d\'eau et serviette',
      suggestionText: 'Tenue sportive confortable et fonctionnelle, parfaite pour l\'exercice.',
      tags: ['sport', 'confortable', 'fonctionnel'],
      weather: ['tous'],
      occasion: ['sport', 'gym', 'course'],
      gender: ['homme', 'femme']
    },
    // Tenues de soirée
    {
      id: 'evening-1',
      haut: 'Robe élégante ou costume de soirée',
      bas: 'N/A (robe) ou pantalon de costume',
      chaussures: 'Escarpins ou chaussures de soirée',
      accessoires: 'Bijoux élégants et sac à main',
      suggestionText: 'Tenue de soirée glamour et raffinée, parfaite pour les événements spéciaux.',
      tags: ['soirée', 'glamour', 'raffiné'],
      weather: ['tous'],
      occasion: ['soirée', 'gala', 'mariage'],
      gender: ['homme', 'femme']
    }
  ];

  private movieSuggestions: MovieSuggestion[] = [
    // Films d'action
    {
      id: 'action-1',
      title: 'John Wick',
      synopsis: 'Un ancien tueur à gages sort de sa retraite pour se venger de ceux qui ont tué son chien.',
      actors: ['Keanu Reeves', 'Ian McShane', 'Willem Dafoe'],
      rating: 8.2,
      year: 2014,
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/John_Wick',
      genre: 'Action',
      country: 'États-Unis',
      tags: ['action', 'vengeance', 'thriller']
    },
    {
      id: 'action-2',
      title: 'Mad Max: Fury Road',
      synopsis: 'Dans un monde post-apocalyptique, Max aide Furiosa à échapper au tyran Immortan Joe.',
      actors: ['Tom Hardy', 'Charlize Theron', 'Nicholas Hoult'],
      rating: 8.1,
      year: 2015,
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/Mad_Max:_Fury_Road',
      genre: 'Action',
      country: 'Australie',
      tags: ['action', 'post-apocalyptique', 'aventure']
    },
    // Films dramatiques
    {
      id: 'drama-1',
      title: 'Parasite',
      synopsis: 'Une famille pauvre infiltre une famille riche en se faisant passer pour des employés qualifiés.',
      actors: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong'],
      rating: 8.6,
      year: 2019,
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/Parasite_(film,_2019)',
      genre: 'Drame',
      country: 'Corée du Sud',
      tags: ['drame', 'thriller', 'social']
    },
    {
      id: 'drama-2',
      title: 'The Social Network',
      synopsis: 'L\'histoire de la création de Facebook et des conflits qui ont suivi.',
      actors: ['Jesse Eisenberg', 'Andrew Garfield', 'Justin Timberlake'],
      rating: 8.0,
      year: 2010,
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/The_Social_Network',
      genre: 'Drame',
      country: 'États-Unis',
      tags: ['drame', 'biographique', 'technologie']
    },
    // Films comiques
    {
      id: 'comedy-1',
      title: 'The Grand Budapest Hotel',
      synopsis: 'Les aventures d\'un concierge d\'hôtel et de son protégé dans l\'Europe d\'entre-deux-guerres.',
      actors: ['Ralph Fiennes', 'Tony Revolori', 'F. Murray Abraham'],
      rating: 8.1,
      year: 2014,
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/The_Grand_Budapest_Hotel',
      genre: 'Comédie',
      country: 'États-Unis',
      tags: ['comédie', 'aventure', 'esthétique']
    },
    {
      id: 'comedy-2',
      title: 'Deadpool',
      synopsis: 'Un mercenaire avec des pouvoirs de guérison rapide cherche à sauver sa petite amie.',
      actors: ['Ryan Reynolds', 'Morena Baccarin', 'T.J. Miller'],
      rating: 8.0,
      year: 2016,
      wikipediaUrl: 'https://fr.wikipedia.org/wiki/Deadpool_(film)',
      genre: 'Comédie',
      country: 'États-Unis',
      tags: ['comédie', 'super-héros', 'action']
    }
  ];

  private restaurantSuggestions: RestaurantSuggestion[] = [
    // Fast Food
    {
      id: 'fastfood-1',
      name: 'McDonald\'s',
      location: 'Centre-ville de Tunis',
      description: 'Classique et rapide, parfait pour un repas sur le pouce',
      googleMapsUrl: 'https://maps.google.com/?q=McDonald\'s+Tunis',
      category: 'Fast Food',
      zone: 'Centre-ville de Tunis',
      tags: ['rapide', 'familial', 'classique']
    },
    {
      id: 'fastfood-2',
      name: 'KFC',
      location: 'Les Berges du Lac',
      description: 'Poulet croustillant et accompagnements délicieux',
      googleMapsUrl: 'https://maps.google.com/?q=KFC+Les+Berges+du+Lac',
      category: 'Fast Food',
      zone: 'Les Berges du Lac 1',
      tags: ['poulet', 'croustillant', 'rapide']
    },
    // Cafés
    {
      id: 'cafe-1',
      name: 'Café de la Paix',
      location: 'Centre-ville de Tunis',
      description: 'Ambiance chaleureuse et café d\'excellente qualité',
      googleMapsUrl: 'https://maps.google.com/?q=Café+de+la+Paix+Tunis',
      category: 'Café',
      zone: 'Centre-ville de Tunis',
      tags: ['traditionnel', 'chaleureux', 'café']
    },
    {
      id: 'cafe-2',
      name: 'Coffee Shop',
      location: 'La Marsa',
      description: 'Café artisanal et pâtisseries maison',
      googleMapsUrl: 'https://maps.google.com/?q=Coffee+Shop+La+Marsa',
      category: 'Café',
      zone: 'La Marsa',
      tags: ['artisanal', 'pâtisseries', 'moderne']
    },
    // Restaurants
    {
      id: 'restaurant-1',
      name: 'Dar El Jeld',
      location: 'Centre-ville de Tunis',
      description: 'Cuisine tunisienne traditionnelle dans un cadre historique',
      googleMapsUrl: 'https://maps.google.com/?q=Dar+El+Jeld+Tunis',
      category: 'Restaurant',
      zone: 'Centre-ville de Tunis',
      tags: ['traditionnel', 'tunisien', 'historique']
    },
    {
      id: 'restaurant-2',
      name: 'Le Golfe',
      location: 'La Marsa',
      description: 'Vue sur mer exceptionnelle et fruits de mer frais',
      googleMapsUrl: 'https://maps.google.com/?q=Le+Golfe+La+Marsa',
      category: 'Restaurant',
      zone: 'La Marsa',
      tags: ['vue mer', 'fruits de mer', 'romantique']
    }
  ];

  // Méthodes de recherche intelligente
  findOutfitSuggestions(criteria: {
    weather?: string;
    occasion?: string;
    gender?: string;
    preferredColors?: string;
    scheduleKeywords?: string;
  }): OutfitSuggestion[] {
    return this.outfitSuggestions.filter(outfit => {
      // Filtrage par météo
      if (criteria.weather && !outfit.weather.includes('tous') && !outfit.weather.includes(criteria.weather.toLowerCase())) {
        return false;
      }
      
      // Filtrage par occasion
      if (criteria.occasion && !outfit.occasion.some(occ => 
        criteria.occasion?.toLowerCase().includes(occ) || occ.includes(criteria.occasion.toLowerCase())
      )) {
        return false;
      }
      
      // Filtrage par genre
      if (criteria.gender && !outfit.gender.includes(criteria.gender.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }

  findMovieSuggestions(criteria: {
    genre?: string;
    seenMovieTitles: string[];
    count: number;
  }): MovieSuggestion[] {
    const availableMovies = this.movieSuggestions.filter(movie => 
      !criteria.seenMovieTitles.includes(movie.title) &&
      (!criteria.genre || movie.genre.toLowerCase() === criteria.genre.toLowerCase())
    );
    
    // Mélanger les résultats pour plus de variété
    return this.shuffleArray(availableMovies).slice(0, criteria.count);
  }

  findRestaurantSuggestions(criteria: {
    category: string;
    zones?: string[];
    seenPlaceNames: string[];
  }): RestaurantSuggestion[] {
    const availableRestaurants = this.restaurantSuggestions.filter(restaurant => 
      !criteria.seenPlaceNames.includes(restaurant.name) &&
      restaurant.category.toLowerCase() === criteria.category.toLowerCase() &&
      (!criteria.zones || criteria.zones.length === 0 || criteria.zones.includes(restaurant.zone))
    );
    
    return this.shuffleArray(availableRestaurants);
  }

  // Méthode utilitaire pour mélanger un tableau
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Méthodes pour ajouter de nouvelles suggestions (pour l'extension future)
  addOutfitSuggestion(suggestion: OutfitSuggestion): void {
    this.outfitSuggestions.push(suggestion);
  }

  addMovieSuggestion(suggestion: MovieSuggestion): void {
    this.movieSuggestions.push(suggestion);
  }

  addRestaurantSuggestion(suggestion: RestaurantSuggestion): void {
    this.restaurantSuggestions.push(suggestion);
  }
}

// Instance globale
export const localDatabase = new LocalDatabase();
