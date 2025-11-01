/**
 * Système de fallback intelligent utilisant les données existantes
 * Extrait les données du decision-maker-flow.ts original
 */

export interface RestaurantData {
  name: string;
  zone: string;
  category: string;
}

export interface ZoneData {
  [zone: string]: string[];
}

export interface CategoryData {
  [category: string]: ZoneData;
}

class RestaurantDatabase {
  private data: CategoryData = {
    'Café': {
      'La Soukra': ['Lotus Café', 'Brown and Sugar Coffee', 'First café', 'Caféte du Golf'],
      'El Aouina': ['Minuto di STARTELA', 'BEANS & CO COFFEE HOUSE', 'La Vero café Lounge', 'Sam\'s Café', 'Bleuet', 'Ali\'s Coffee', 'Café Patchwork', 'Infinity Aouina', 'SOHO Coffee', 'Ô Palet', 'Dell\'Angelo Cafè', 'Café Slow X', 'Green Coffee', 'Padova', 'Beans&Co', 'Downtown', 'Barista\'s', 'Pep\'s coffee', 'The One Coffee Lounge', 'InSider L\'Aouina', 'idea lounge', 'Epic Coffee Shop', 'GATSBY', 'Balkon', 'MYKONOS MEMORIES COFFE', 'Café Forever Lounge', 'Pivoine coffee & more', 'Palet Royal', 'Salon De Thé New Day', 'Le Wagram', 'BELLUCCI coffee & more', 'Business bey', 'Restaurant Italien Terrazzino'],
      'Ain Zaghouan Nord': ['Barista\'s', 'Way cup', 'Il fiore del caffe', 'CAFE ROSE COTTAGE', 'La Duchesse', 'Carré Gourmand', 'The W\'s Coffee', 'PlayPresso', 'Coffe shop Copa vida'],
      'Les Berges du Lac 1': ['Pavarotti', 'La Croisette', 'Eric Kayser', 'Biwa', 'Le Bistrot', 'Cosmitto'],
      'Les Berges du Lac 2': ['Hookah Coffee Lounge', 'Côté Jardin', 'Frédéric CASSEL', 'U-TOO Coffee & Grill', 'Kube', 'George V', 'SO BRITISH LAC 2', 'Zanzibar Café', 'Billionaire Café', 'OMEGA Coffee', 'Barista\'s Lac 2', 'The Big Dip'],
      'La Marsa': ['Gourmandise Marsa Corniche', 'A mi chemins', 'North Shore Coffee and Snacks', 'Ivy Coffee Shop & Restaurant', 'Grignotine', 'Saint Tropez', 'La Marsa', 'Le Gourmet', 'Barista\'s', 'Café Victor Hugo H', 'SABATO COFFEE SHOP & RESTAURANT', 'Patchwork', 'Café Calimero', 'Eric Kayser', 'PAUL', 'Blues House and food', 'Café Journal'],
      'Jardins de Carthage': ['TCHOICE CAFE', 'Eleven coffee shop', 'The closet Coffee shop', 'Bestoff coffee', 'The Address', 'Coin d\'alma - Jardins de Carthage', 'La vida', 'boho', 'The Bistrot B&D', 'Metropolitan Coffee Shop', 'The Glory Coffee', 'Athiniôs Coffee', 'Saint Germain JDC', '3M coffee', 'Mille Mercis', 'The Garrison 06', 'Galerie Café', 'The Mayfair Lounge'],
      'Carthage': ['Uranium Café d\'art', 'Barista\'s Carthage Dermech', 'Punic\'Art', 'Café Yam\'s', 'Next One', 'Avra Carthage', 'The Hills', 'Matcha Club | Carthage'],
      'La Goulette/Kram': ['El Aalia', 'Café Restaurant La Plage', 'Wet Flamingo(Bar)'],
      'Mégrine/ Sidi Rzig': ['Fugazi coffee&snack', 'Double Dose', 'Javayou', 'Salon de thé white lounge', 'La Dolce Vita', 'SHOW OFF', 'Wood&ROPES', 'Gourmandise Megrine'],
      'Boumhal': ['Verde Coffee Boumhal', 'The 21 Lounge', 'JOSEPH COFEE LOUNGE', 'Beverly Hills Lounge', 'Di più', 'BISOU', 'Le Parisien', 'Times Square'],
      'El Manar': ['Hillside Resto-Lounge', 'Brooklyn Café', 'Wolf And Rabbit', 'Pantree', 'Vero Gusto', 'Q\'Mug', 'Story coffee', 'Môme Lounge', 'Tirana Café', 'Villa Azzura'],
      'Menzah 9': ['La Verrière - Café Resto', 'LA DOREE', 'Casa De Papel'],
      'Menzah 6': ['3al Kif', 'café 23', 'Le Trait d\'union', 'A casa mia', 'Le Montmartre', 'Sacré Cœur', 'La Seine', 'The 716 Menzah 6', 'Tartes et haricots'],
      'Menzah 5': ['Gourmandise M5', 'Eric Kayser', 'Lv Club', 'Seven S M5', 'Kälo café', 'Nüma coffee & kitchen', 'The Paradise', 'Myplace', 'El Chapo', 'ABUELA\'S CAFE'],
      'Menzah 8': ['Yalova café restaurant & lounge', 'Affogato coffee shop', 'Quick Café'],
      'Ennasr': ['JAGGER', '4 Ever', 'FIVE O\' CLOCK Tea House & Snack', 'Le Baron Café', 'Café Blanc', 'Versailles', 'The COFFEE 777', 'The 616 coffee PLUS', 'Cafe Royal', 'tornados coffee', 'Queen', 'Chesterfield', 'MM Café', 'PROST Coffee', 'Via Vai', 'HERMES CAFE', 'Minions coffee', 'Piacere', 'Vagary tunis', 'Paty coffee lounge', 'Barcelone Coffee'],
      'Mutuelleville / Alain Savary': ['Eric Kayser', 'Café culturel Jaziya', 'La place café & gourmandises']
    },
    'Fast Food': {
      'La Soukra': ['Tredici', 'BiBi', 'Chicken Light', 'Italiano Vero'],
      'El Aouina': ['Om burger', 'El Ostedh', 'Compozz', 'Crispy Naan', 'Wok Time', 'Pimento\'s', 'Icheese', 'Hot Dot', 'Chaneb Tacos', 'Dma9', 'The Corner Italian Food', 'KFC', 'Echemi Aouina', 'Shrimp Burger', 'Benkay Sushi', 'Taco and co', 'My Potato', 'Tsunami Sushi', 'Restaurant l\'artiste', 'Bonfire', 'Bombay', 'Oueld el bey', 'Taquería', 'Sanburg', 'Friends Pasta Bar aouina', 'Restaurant The Hood', 'Machewi Tchiko Fruits de mer', 'Pizzeria Speed\'za', 'Fahita', 'White ghost Burger', 'Shadow burger', 'Tacos band', 'PIZZAGRAM', 'Bannet Saffoud', 'Broche\'zza'],
      'Ain Zaghouan Nord': ['Cozy corner', 'Pizzeria Thapsus 5090', 'BBQ', 'BB Food', 'Restaurant Pasta\'Up'],
      'Les Berges du Lac 1': ['Friends Pasta Bar', 'The Food Court', 'Gino Pizza e Panino', 'Pizza LAGO', 'Pastel Food&Drinks', 'PIÚ Pasta', 'Ben\'s', 'LACantine', 'BIGABOO', 'Papa john\'s', 'hobo lac 1'],
      'Les Berges du Lac 2': ['Sushibox', 'Happy\'s', 'Indonesian Restaurant', 'IT Pizza & Co.'],
      'Jardins de Carthage': ['POPOLARE TRATTORIA', 'Pizzeria & Fast Food Bombay', 'MAC & JO\'S', 'Tcheb\'s', 'Kayu Sushi', 'Restaurant La Cuillère', 'درة الشام', 'Le 45 / Supreme Burger', 'PORTA NIGRA', 'RustiK Burger', 'Route 66', 'Goomba\'s Pizza', 'Regalo Italiano', 'Masaniello Cucina', 'ch\'men di fir'],
      'Carthage': ['too much', 'Baguette Et Baguette'],
      'La Goulette/Kram': ['Ciao!', 'LOS TRADOS', 'Fuego', 'Buon Gusto', 'Food \'n\' mood', 'Vagabondo', 'Pizza Pronto', 'Klitch', 'Big burger 🍔', 'The NINETY-NINE', 'L\'antica pizzeria', 'After'],
      'Menzah 1': ['Mokito', 'Le Zink'],
      'Menzah 5': ['Mustache', 'El Koocha', 'Prego', 'Le Réservoir', 'Pythagor', 'Hamburgasme', 'Compozz\' ElMenzah 5', 'Ma Che Vuoi !', 'Antika'],
      'Menzah 6': ['Ô Four !', 'Bout de pain', 'Pizza Tiburtina', 'Rustica Menzah 6', 'Jam Jem', 'Pizza al métro', 'Restaurant Chef Zhang', 'The Sunny Beans'],
      'Ennasr': ['Echemi', 'Baguette&Baguette', 'Cool tacos', 'HEY BRO', 'POPOLARE TRATTORIA', 'GUSTO PIZZA', 'Ya hala shawarma-يا هلا شاورما', 'FaceFood', 'THE SQUARE', 'Set el cham', 'Le Bambou', 'Lab station (Burger)', 'Greens Trattoria au feu de bois', 'Restaurant Insomnia', 'Ibn chem', 'Tacos Chaneb', 'Señor tacos', 'Olympique TACOSAIS', 'Malibu Ennasr'],
      'La Marsa': ['Doodle Burger Bar', 'Lapero Tapas & Pintxos', 'Smash\'d', 'Pizza Pesto', 'Kenkō food bar', 'Chez Joseph', 'CORNICELLO NAPOLITAIN', 'appello', 'La Pause Fast food', 'Le Fumoir', 'Pizzagram', 'BIG MO - Burger Shack', 'Pizzeria COME Prima La Marsa', 'Andiamo', 'O\'Potatos', 'Panzerotti', 'Bambino', 'BFRIES', 'Uno', 'Sanfour', 'Maakoulet Echem', 'Triade', 'Piccolo Marsa pizzeria', 'Wok Thaï La Marsa', 'Plan B La Marsa', 'SAKURA PASTA', 'GOA INDIANA FOOD', 'D\'lich', 'Benkay Sushi', 'Sushiwan', 'La Bruschetta', 'Machawina', 'Mamma Time'],
      'Mégrine': ['Benkay sushi Megrine', 'Papa Johns Pizza', 'May Food\'s', 'Malibu Food', 'Lilliano', 'Tacos chaneb megrine', 'Class\'croute', 'Juste En Face Megrine', 'Baguette & Baguette Megrine'],
      'Boumhal': ['El Boty', 'CHICK\'N CHIPS Boumhal', 'Montana', 'Di Napoli Boumhel', 'Goomba\'s Pizza Boumhal'],
      'El Manar': ['Restaurant 6019', 'Fringale', 'Woodland Pizza', 'La Padella', 'Restaurant Le DOMAINE']
    },
    'Restaurant': {
      'La Soukra': ['Lorenzia', 'Brown and Sugar Coffee', 'Tredici'],
      'El Aouina': ['Del Capo Restaurant', 'Restaurant Italien Terrazzino', 'Restaurant Grillade Zine El Chem', 'Restaurant Emesa', 'RED Castle aouina', 'WOK Time', 'Slayta Bar à Salade'],
      'Ain Zaghouan Nord': ['Restaurant Thaïlandais House', 'The Nine - Lifestyle Experience'],
      'Les Berges du Lac 1': ['Pasta Cosi', 'Massazi', 'Port Fino', 'Le Safran', 'Chili\'s', 'Antony Lac 1', 'Aqua Lounge', 'KFC LAC 1', 'Ah Table !', 'Le Farfalle', 'CROQUEMBOUCHE', 'FEDERICO', 'Pavarotti Pasta'],
      'Les Berges du Lac 2': ['Via Mercato Lac 2', 'Al Seniour', 'Chef Ayhan Turkich grill rustik', 'K-ZIP', 'La Margherita', 'Bocca Felice', 'Chef Eyad', 'Restaurant L\'Érable', 'Damascino Lac 2', 'L\'olivier bleu'],
      'La Marsa': ['CULT', 'bistro', 'Kimchi', 'Le Golfe', 'Pi', 'La focaccia marsa', 'La Mescla', 'Restaurant La Maison', 'La Piadina', 'La Dokkana House', 'Karam Lobnan', 'DIVERSSO', 'AL SÉNIOUR', 'RESTAURANT L\'ENDROIT', 'Ô Moules', 'The Kitchen Restaurant la Marsa'],
      'Gammarth': ['Restaurante Vicolo', 'L\'italien Gammarth da Davide', 'Restaurant Les Ombrelles', 'Restaurant Les Dunes', 'Restaurant Borago gammarth', 'Le Ritsi', 'Ocean Club', 'Le Grand Bleu', 'Olivia', 'LiBai', 'Restaurant Grec Efimero'],
      'Jardins de Carthage': ['Si sapori italiani', 'Langoustino', 'Hasdrubal de Carthage', 'Peri Peri Restaurant', 'Qian house chinese', 'Barbara', 'Restaurant La Cuillère'],
      'Carthage': ['Rue de Siam Carthage', 'BIRDS', 'Pizza Phone', 'Restaurant Best Friend', 'Tchevap', 'Les Indécis', 'restaurant valentino', 'Restaurant Le Punique'],
      'La Goulette/Kram': ['La Topaze', 'La Mer', 'La Spigola', 'La GALITE', 'Le Café Vert', 'restaurant la paella', 'Resto HEKAYA', 'Le Chalet Goulettois', 'Restaurant The House - الحوش', 'Les 3 Marins', 'Restaurant Flouka', 'Restaurant Waywa', 'La maison de la grillade', 'L\'Aquarius', 'YORK Restaurant & Café', 'Platinium Restaurant'],
      'Mutuelleville / Alain Savary': ['L\'ardoise', 'L\'astragale', 'Alle scale', 'Le Baroque-Restaurant'],
      'Mégrine': ['Tavolino', 'Via mercato Megrine', 'La Bottega restaurant'],
      'Boumhal': ['Papito Resto - Lounge'],
      'El Manar': ['Mashawi Halab', 'Chili\'s American\'s Grill', 'Sultan Ahmet', 'Go! Sushi', 'Pang\'s asian restaurant & sushi bar', 'Route 66'],
      'Menzah 9': ['Damascino Menzah 9', 'Mamma Time'],
      'Menzah 5': ['les dents de la mer'],
      'Ennasr': ['Thaïfood', 'Farm Ranch Pizza Ennasr', 'INSIDE Turkish Restaurant Lounge', 'Café Blackstreet', 'Le safran', 'Restaurant Le Sfaxien- Abou Lezz', 'Momenti Italiani', 'meatopia', 'Wokthaï Ennaser']
    },
    'Brunch': {
      'El Aouina': ['Kalanea&co', 'Ali\'s', 'coffeelicious Lounge', 'Infinity Aouina', 'Downtown Lounge', 'Restaurant Italien Terrazzino', 'Pâtisserie Mio', 'Rozalia coffee&brunch', 'The One Coffee Lounge', 'Moonrise juices and crêpes', 'La Vero café Lounge'],
      'Les Berges du Lac 2': ['Côté Jardin', 'PATCHWORK Café & Restaurant', 'Twiggy', 'Café Lounge The Gate', 'The Big Dip', 'Pinoli Restaurant', 'Kube', 'PALAZZO Café Restaurant', 'George V', '3OO Three Hundred', 'SO BRITISH', 'Hookah Coffee Lounge'],
      'La Marsa': ['Saint Tropez', 'Breizh Bistrot', 'Coin Margoum', 'Yardbirds', 'Gourmandise', 'North Shore Coffee and Snacks', 'Ivy Coffee Shop & Restaurant', 'Blues House and food', 'Café Journal', 'Bonsaï café & restaurant', 'Bistek', 'SABATO COFFEE SHOP & RESTAURANT', 'La Roquette - Salad Bar & Co.'],
      'Menzah 6': ['The 716 Menzah 6', 'A casa mia', 'Tartes et haricots', 'Le Montmartre'],
      'Ennasr': ['JAGGER', 'Café Blanc', 'tornados coffee', 'Café Blackstreet', 'Vagary tunis', 'Paty coffee lounge'],
      'El Manar': ['Restaurant Le DOMAINE', 'Brooklyn Café', 'Wolf And Rabbit', 'Q\'Mug', 'Story coffee']
    }
  };

  findSuggestions(criteria: {
    category: string;
    zones?: string[];
    seenPlaceNames: string[];
  }): Array<{
    placeName: string;
    location: string;
    description: string;
    googleMapsUrl: string;
  }> {
    const categoryKey = this.normalizeCategory(criteria.category);
    const categoryData = this.data[categoryKey];
    
    if (!categoryData) {
      return [];
    }

    let availablePlaces: Array<{ name: string; zone: string }> = [];

    // Si des zones sont spécifiées, filtrer par zones
    if (criteria.zones && criteria.zones.length > 0) {
      for (const zone of criteria.zones) {
        const normalizedZone = this.normalizeZone(zone);
        const places = categoryData[normalizedZone] || [];
        availablePlaces.push(...places.map(name => ({ name, zone: normalizedZone })));
      }
    } else {
      // Sinon, prendre tous les lieux de la catégorie
      for (const [zone, places] of Object.entries(categoryData)) {
        availablePlaces.push(...places.map(name => ({ name, zone })));
      }
    }

    // Exclure les lieux déjà vus
    const filteredPlaces = availablePlaces.filter(place => 
      !criteria.seenPlaceNames.includes(place.name)
    );

    // Mélanger et ne proposer que 2 suggestions à la fois
    const shuffled = this.shuffleArray(filteredPlaces);
    const selected = shuffled.slice(0, 2);

    return selected.map(place => ({
      placeName: place.name,
      location: place.zone,
      description: this.generateDescription(place.name, categoryKey),
      googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(place.name + ' ' + place.zone + ' Tunis')}`
    }));
  }

  private normalizeCategory(category: string): string {
    const lower = category.toLowerCase();
    if (lower.includes('café') || lower.includes('cafe')) return 'Café';
    if (lower.includes('fast food')) return 'Fast Food';
    if (lower.includes('restaurant')) return 'Restaurant';
    if (lower.includes('brunch')) return 'Brunch';
    return category;
  }

  private normalizeZone(zone: string): string {
    // Mapping des zones pour correspondre aux données
    const zoneMap: { [key: string]: string } = {
      'Les Berges du Lac 1': 'Les Berges du Lac 1',
      'Les Berges du Lac 2': 'Les Berges du Lac 2',
      'Centre-ville de Tunis': 'Centre-ville de Tunis',
      'Mutuelleville / Alain Savary': 'Mutuelleville / Alain Savary',
      'Mégrine/ Sidi Rzig': 'Mégrine/ Sidi Rzig'
    };
    
    return zoneMap[zone] || zone;
  }

  private generateDescription(name: string, category: string): string {
    const descriptions = {
      'Café': [
        'Ambiance chaleureuse et café d\'excellente qualité',
        'Parfait pour se détendre avec un bon café',
        'Café artisanal et pâtisseries maison',
        'Ambiance moderne et confortable',
        'Idéal pour une pause gourmande'
      ],
      'Fast Food': [
        'Rapide et délicieux',
        'Parfait pour un repas sur le pouce',
        'Cuisine savoureuse et rapide',
        'Idéal pour une pause déjeuner',
        'Délicieux et abordable'
      ],
      'Restaurant': [
        'Cuisine raffinée et ambiance soignée',
        'Parfait pour un repas en famille ou entre amis',
        'Cuisine authentique et savoureuse',
        'Ambiance élégante et service impeccable',
        'Idéal pour une occasion spéciale'
      ],
      'Brunch': [
        'Brunch gourmand et généreux',
        'Parfait pour un dimanche matin',
        'Menu varié et délicieux',
        'Ambiance détendue et conviviale',
        'Idéal pour commencer la journée'
      ]
    };

    const categoryDescriptions = descriptions[category as keyof typeof descriptions] || ['Endroit recommandé'];
    return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const restaurantDatabase = new RestaurantDatabase();
