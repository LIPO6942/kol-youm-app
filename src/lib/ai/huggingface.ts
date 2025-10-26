/**
 * Hugging Face Inference API - Alternative gratuite à Google Gemini
 * 30,000 requêtes/mois gratuites, pas de carte bancaire requise
 */

interface HuggingFaceResponse {
  generated_text: string;
}

interface HuggingFaceRequest {
  inputs: string;
  parameters?: {
    max_new_tokens?: number;
    temperature?: number;
    return_full_text?: boolean;
  };
}

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';
const MODEL_FALLBACK = 'microsoft/DialoGPT-medium';

export class HuggingFaceAI {
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  private async makeRequest(prompt: string, maxTokens: number = 150): Promise<string> {
    const requestBody: HuggingFaceRequest = {
      inputs: prompt,
      parameters: {
        max_new_tokens: maxTokens,
        temperature: 0.7,
        return_full_text: false,
      },
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(HUGGINGFACE_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const data: HuggingFaceResponse[] = await response.json();
      return data[0]?.generated_text || 'Désolé, je ne peux pas générer de réponse pour le moment.';
    } catch (error) {
      console.error('Hugging Face API error:', error);
      throw new Error('Erreur lors de la génération de contenu IA');
    }
  }

  async generateOutfitSuggestion(input: {
    scheduleKeywords: string;
    weather: string;
    occasion: string;
    preferredColors?: string;
    gender?: string;
    baseItem?: string;
  }): Promise<{
    haut: { description: string };
    bas: { description: string };
    chaussures: { description: string };
    accessoires: { description: string };
    suggestionText: string;
  }> {
    const prompt = `Tu es un styliste expert. Crée une tenue pour:
- Activité: ${input.scheduleKeywords}
- Météo: ${input.weather}
- Occasion: ${input.occasion}
- Couleurs préférées: ${input.preferredColors || 'aucune'}
- Genre: ${input.gender || 'non spécifié'}
${input.baseItem ? `- Pièce de base: ${input.baseItem}` : ''}

Réponds au format JSON:
{
  "haut": "description du haut",
  "bas": "description du bas", 
  "chaussures": "description des chaussures",
  "accessoires": "description des accessoires",
  "suggestionText": "description complète de la tenue"
}`;

    try {
      const response = await this.makeRequest(prompt, 300);
      // Nettoyer la réponse pour extraire le JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Format de réponse invalide');
    } catch (error) {
      // Fallback vers des suggestions prédéfinies
      return this.getFallbackOutfitSuggestion(input);
    }
  }

  async generateMovieSuggestions(input: {
    genre: string;
    count: number;
    seenMovieTitles: string[];
  }): Promise<{
    movies: Array<{
      id: string;
      title: string;
      synopsis: string;
      actors: string[];
      rating: number;
      year: number;
      wikipediaUrl: string;
      genre: string;
      country: string;
    }>;
  }> {
    const prompt = `Tu es un expert cinéma. Suggère ${input.count} films du genre "${input.genre}" que l'utilisateur n'a pas encore vus.
Films déjà vus: ${input.seenMovieTitles.join(', ')}

Réponds au format JSON:
{
  "movies": [
    {
      "id": "unique_id",
      "title": "Titre du film",
      "synopsis": "Résumé court",
      "actors": ["Acteur 1", "Acteur 2"],
      "rating": 8.5,
      "year": 2020,
      "wikipediaUrl": "https://fr.wikipedia.org/wiki/Film",
      "genre": "${input.genre}",
      "country": "Pays"
    }
  ]
}`;

    try {
      const response = await this.makeRequest(prompt, 500);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Format de réponse invalide');
    } catch (error) {
      // Fallback vers des suggestions prédéfinies
      return this.getFallbackMovieSuggestions(input);
    }
  }

  async generateRestaurantSuggestions(input: {
    category: string;
    city: string;
    zones?: string[];
    seenPlaceNames: string[];
  }): Promise<{
    suggestions: Array<{
      placeName: string;
      location: string;
      description: string;
      googleMapsUrl: string;
    }>;
  }> {
    const prompt = `Tu es un guide local expert de ${input.city}. Suggère des ${input.category}s dans les zones: ${input.zones?.join(', ') || 'toute la ville'}.
Évite ces endroits déjà suggérés: ${input.seenPlaceNames.join(', ')}

Réponds au format JSON:
{
  "suggestions": [
    {
      "placeName": "Nom du lieu",
      "location": "Adresse ou zone",
      "description": "Description attractive",
      "googleMapsUrl": "https://maps.google.com/?q=lieu"
    }
  ]
}`;

    try {
      const response = await this.makeRequest(prompt, 400);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Format de réponse invalide');
    } catch (error) {
      // Fallback vers des suggestions prédéfinies
      return this.getFallbackRestaurantSuggestions(input);
    }
  }

  // Méthodes de fallback avec des données prédéfinies
  private getFallbackOutfitSuggestion(input: any) {
    const outfits = {
      casual: {
        haut: "T-shirt confortable ou chemise décontractée",
        bas: "Jeans ou pantalon chino",
        chaussures: "Baskets ou chaussures confortables",
        accessoires: "Sac à dos ou sac bandoulière",
        suggestionText: "Tenue décontractée parfaite pour une sortie détendue"
      },
      formal: {
        haut: "Chemise habillée ou chemisier élégant",
        bas: "Pantalon de costume ou jupe droite",
        chaussures: "Chaussures de ville ou talons",
        accessoires: "Sac à main ou attaché-case",
        suggestionText: "Look professionnel et sophistiqué"
      },
      sport: {
        haut: "T-shirt technique ou débardeur",
        bas: "Short ou legging de sport",
        chaussures: "Chaussures de sport",
        accessoires: "Bouteille d'eau et serviette",
        suggestionText: "Tenue sportive confortable et fonctionnelle"
      }
    };

    const occasion = input.occasion?.toLowerCase() || 'casual';
    const selectedOutfit = outfits[occasion as keyof typeof outfits] || outfits.casual;

    return {
      haut: { description: selectedOutfit.haut },
      bas: { description: selectedOutfit.bas },
      chaussures: { description: selectedOutfit.chaussures },
      accessoires: { description: selectedOutfit.accessoires },
      suggestionText: selectedOutfit.suggestionText
    };
  }

  private getFallbackMovieSuggestions(input: any) {
    const movies = {
      action: [
        { title: "John Wick", year: 2014, rating: 8.2, country: "USA", actors: ["Keanu Reeves", "Ian McShane"] },
        { title: "Mad Max: Fury Road", year: 2015, rating: 8.1, country: "Australie", actors: ["Tom Hardy", "Charlize Theron"] },
        { title: "The Raid", year: 2011, rating: 8.0, country: "Indonésie", actors: ["Iko Uwais", "Joe Taslim"] }
      ],
      drama: [
        { title: "Parasite", year: 2019, rating: 8.6, country: "Corée du Sud", actors: ["Song Kang-ho", "Lee Sun-kyun"] },
        { title: "The Social Network", year: 2010, rating: 8.0, country: "USA", actors: ["Jesse Eisenberg", "Andrew Garfield"] },
        { title: "Whiplash", year: 2014, rating: 8.5, country: "USA", actors: ["Miles Teller", "J.K. Simmons"] }
      ],
      comedy: [
        { title: "The Grand Budapest Hotel", year: 2014, rating: 8.1, country: "USA", actors: ["Ralph Fiennes", "Tony Revolori"] },
        { title: "Deadpool", year: 2016, rating: 8.0, country: "USA", actors: ["Ryan Reynolds", "Morena Baccarin"] },
        { title: "The Nice Guys", year: 2016, rating: 7.4, country: "USA", actors: ["Ryan Gosling", "Russell Crowe"] }
      ]
    };

    const genreMovies = movies[input.genre as keyof typeof movies] || movies.drama;
    const availableMovies = genreMovies.filter(movie => !input.seenMovieTitles.includes(movie.title));
    
    return {
      movies: availableMovies.slice(0, input.count).map(movie => ({
        id: Math.random().toString(36).substr(2, 9),
        title: movie.title,
        synopsis: `Un film ${input.genre} captivant avec une excellente réalisation.`,
        actors: movie.actors,
        rating: movie.rating,
        year: movie.year,
        wikipediaUrl: `https://fr.wikipedia.org/wiki/${movie.title.replace(/\s+/g, '_')}`,
        genre: input.genre,
        country: movie.country
      }))
    };
  }

  private getFallbackRestaurantSuggestions(input: any) {
    const restaurants = {
      'Fast Food': [
        { name: "McDonald's", location: "Centre-ville", description: "Classique et rapide" },
        { name: "KFC", location: "Les Berges du Lac", description: "Poulet croustillant" },
        { name: "Subway", location: "Menzah", description: "Sandwichs frais" }
      ],
      'Café': [
        { name: "Café de la Paix", location: "Centre-ville", description: "Ambiance chaleureuse" },
        { name: "Coffee Shop", location: "La Marsa", description: "Café artisanal" },
        { name: "Le Petit Café", location: "Carthage", description: "Petit déjeuner délicieux" }
      ],
      'Restaurant': [
        { name: "Dar El Jeld", location: "Centre-ville", description: "Cuisine tunisienne traditionnelle" },
        { name: "Le Golfe", location: "La Marsa", description: "Vue sur mer exceptionnelle" },
        { name: "Restaurant du Port", location: "La Goulette", description: "Poissons frais du jour" }
      ]
    };

    const categoryRestaurants = restaurants[input.category as keyof typeof restaurants] || restaurants['Restaurant'];
    const availableRestaurants = categoryRestaurants.filter(resto => !input.seenPlaceNames.includes(resto.name));
    
    return {
      suggestions: availableRestaurants.slice(0, 5).map(resto => ({
        placeName: resto.name,
        location: resto.location,
        description: resto.description,
        googleMapsUrl: `https://maps.google.com/?q=${encodeURIComponent(resto.name + ' ' + resto.location)}`
      }))
    };
  }
}

// Instance globale
export const huggingFaceAI = new HuggingFaceAI();
