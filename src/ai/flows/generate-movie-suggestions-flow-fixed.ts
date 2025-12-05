 

/**
 * Flow de fallback simple pour les suggestions de films
 * Utilise une base de données de films populaires
 */

import { GenerateMovieSuggestionsInputSchema, GenerateMovieSuggestionsOutputSchema, type GenerateMovieSuggestionsInput, type GenerateMovieSuggestionsOutput } from './generate-movie-suggestions-flow.types';

interface Movie {
  title: string;
  year: number;
  rating: number;
  country: string;
  actors: string[];
  synopsis: string;
  genre: string;
}

const movieDatabase: Record<string, Movie[]> = {
  'Action': [
    { title: 'John Wick', year: 2014, rating: 8.2, country: 'États-Unis', actors: ['Keanu Reeves', 'Ian McShane'], synopsis: 'Un ancien tueur à gages sort de sa retraite pour se venger de ceux qui ont tué son chien.', genre: 'Action' },
    { title: 'Mad Max: Fury Road', year: 2015, rating: 8.1, country: 'Australie', actors: ['Tom Hardy', 'Charlize Theron'], synopsis: 'Dans un monde post-apocalyptique, Max aide Furiosa à échapper au tyran Immortan Joe.', genre: 'Action' },
    { title: 'The Raid', year: 2011, rating: 8.0, country: 'Indonésie', actors: ['Iko Uwais', 'Joe Taslim'], synopsis: 'Une unité d\'élite de la police indonésienne doit infiltrer un immeuble contrôlé par un baron de la drogue.', genre: 'Action' },
    { title: 'Dredd', year: 2012, rating: 7.1, country: 'Royaume-Uni', actors: ['Karl Urban', 'Olivia Thirlby'], synopsis: 'Le juge Dredd et une recrue doivent survivre dans un immeuble contrôlé par des criminels.', genre: 'Action' },
    { title: 'The Matrix', year: 1999, rating: 8.7, country: 'États-Unis', actors: ['Keanu Reeves', 'Laurence Fishburne'], synopsis: 'Un programmeur découvre que la réalité n\'est qu\'une simulation contrôlée par des machines.', genre: 'Science-Fiction' }
  ],
  'Drame': [
    { title: 'Parasite', year: 2019, rating: 8.6, country: 'Corée du Sud', actors: ['Song Kang-ho', 'Lee Sun-kyun'], synopsis: 'Une famille pauvre infiltre une famille riche en se faisant passer pour des employés qualifiés.', genre: 'Drame' },
    { title: 'The Social Network', year: 2010, rating: 8.0, country: 'États-Unis', actors: ['Jesse Eisenberg', 'Andrew Garfield'], synopsis: 'L\'histoire de la création de Facebook et des conflits qui ont suivi.', genre: 'Drame' },
    { title: 'Whiplash', year: 2014, rating: 8.5, country: 'États-Unis', actors: ['Miles Teller', 'J.K. Simmons'], synopsis: 'Un jeune batteur de jazz s\'efforce de devenir le meilleur sous la direction d\'un professeur impitoyable.', genre: 'Drame' },
    { title: 'Her', year: 2013, rating: 8.0, country: 'États-Unis', actors: ['Joaquin Phoenix', 'Scarlett Johansson'], synopsis: 'Un homme tombe amoureux d\'une intelligence artificielle.', genre: 'Drame' },
    { title: 'Moonlight', year: 2016, rating: 7.4, country: 'États-Unis', actors: ['Mahershala Ali', 'Naomie Harris'], synopsis: 'L\'histoire d\'un jeune homme noir qui grandit dans un quartier difficile de Miami.', genre: 'Drame' }
  ],
  'Comédie': [
    { title: 'The Grand Budapest Hotel', year: 2014, rating: 8.1, country: 'États-Unis', actors: ['Ralph Fiennes', 'Tony Revolori'], synopsis: 'Les aventures d\'un concierge d\'hôtel et de son protégé dans l\'Europe d\'entre-deux-guerres.', genre: 'Comédie' },
    { title: 'Deadpool', year: 2016, rating: 8.0, country: 'États-Unis', actors: ['Ryan Reynolds', 'Morena Baccarin'], synopsis: 'Un mercenaire avec des pouvoirs de guérison rapide cherche à sauver sa petite amie.', genre: 'Comédie' },
    { title: 'The Nice Guys', year: 2016, rating: 7.4, country: 'États-Unis', actors: ['Ryan Gosling', 'Russell Crowe'], synopsis: 'Deux détectives privés enquêtent sur la disparition d\'une jeune femme à Los Angeles en 1977.', genre: 'Comédie' },
    { title: 'Superbad', year: 2007, rating: 7.6, country: 'États-Unis', actors: ['Jonah Hill', 'Michael Cera'], synopsis: 'Deux amis tentent d\'acheter de l\'alcool pour une fête avant de partir à l\'université.', genre: 'Comédie' },
    { title: 'Hot Fuzz', year: 2007, rating: 7.8, country: 'Royaume-Uni', actors: ['Simon Pegg', 'Nick Frost'], synopsis: 'Un policier londonien est transféré dans un petit village où des meurtres mystérieux se produisent.', genre: 'Comédie' }
  ],
  'Thriller': [
    { title: 'Gone Girl', year: 2014, rating: 8.1, country: 'États-Unis', actors: ['Ben Affleck', 'Rosamund Pike'], synopsis: 'Un homme devient suspect dans la disparition de sa femme.', genre: 'Thriller' },
    { title: 'Prisoners', year: 2013, rating: 8.1, country: 'États-Unis', actors: ['Hugh Jackman', 'Jake Gyllenhaal'], synopsis: 'Un père prend la loi en main quand sa fille est kidnappée.', genre: 'Thriller' },
    { title: 'Zodiac', year: 2007, rating: 7.7, country: 'États-Unis', actors: ['Jake Gyllenhaal', 'Robert Downey Jr.'], synopsis: 'L\'enquête sur le tueur en série Zodiac qui terrorisa la région de San Francisco.', genre: 'Thriller' },
    { title: 'The Silence of the Lambs', year: 1991, rating: 8.6, country: 'États-Unis', actors: ['Jodie Foster', 'Anthony Hopkins'], synopsis: 'Une jeune agent du FBI consulte un psychiatre cannibale pour attraper un autre tueur en série.', genre: 'Thriller' },
    { title: 'Se7en', year: 1995, rating: 8.6, country: 'États-Unis', actors: ['Brad Pitt', 'Morgan Freeman'], synopsis: 'Deux détectives enquêtent sur une série de meurtres basés sur les sept péchés capitaux.', genre: 'Thriller' },
    { title: 'Inception', year: 2010, rating: 8.8, country: 'États-Unis', actors: ['Leonardo DiCaprio', 'Joseph Gordon-Levitt'], synopsis: 'Un voleur qui vole des secrets à travers l\'inception des rêves reçoit une mission inverse : implanter une idée dans l\'esprit d\'un PDG.', genre: 'Science-Fiction' },
    { title: 'Fight Club', year: 1999, rating: 8.8, country: 'États-Unis', actors: ['Brad Pitt', 'Edward Norton'], synopsis: 'Un homme déprimé qui souffre d\'insomnie rencontre un vendeur de savon excentrique, et ensemble ils forment un club de combat souterrain.', genre: 'Drame' },
    { title: 'Shutter Island', year: 2010, rating: 8.2, country: 'États-Unis', actors: ['Leonardo DiCaprio', 'Mark Ruffalo'], synopsis: 'Un maréchal américain enquêtant sur la disparition d\'une meurtrière se retrouve piégé dans un hôpital psychiatrique.', genre: 'Thriller psychologique' },
    { title: 'The Prestige', year: 2006, rating: 8.5, country: 'Royaume-Uni', actors: ['Christian Bale', 'Hugh Jackman'], synopsis: 'Deux magiciens de scène rivaux se livrent une compétition féroce pour créer l\'illusion ultime.', genre: 'Thriller' },
    { title: 'Memento', year: 2000, rating: 8.4, country: 'États-Unis', actors: ['Guy Pearce', 'Carrie-Anne Moss'], synopsis: 'Un homme souffrant d\'amnésie utilise des notes et des tatouages pour retrouver l\'assassin de sa femme.', genre: 'Thriller psychologique' }
  ],
  'Science-Fiction': [
    { title: 'Blade Runner 2049', year: 2017, rating: 8.0, country: 'États-Unis', actors: ['Ryan Gosling', 'Harrison Ford'], synopsis: 'Un jeune agent découvre un secret qui pourrait plonger la société dans le chaos.', genre: 'Science-Fiction' },
    { title: 'Interstellar', year: 2014, rating: 8.6, country: 'États-Unis', actors: ['Matthew McConaughey', 'Anne Hathaway'], synopsis: 'Un groupe d\'astronautes voyage à travers un trou de ver pour sauver l\'humanité.', genre: 'Science-Fiction' },
    { title: 'Ex Machina', year: 2014, rating: 7.7, country: 'Royaume-Uni', actors: ['Domhnall Gleeson', 'Alicia Vikander'], synopsis: 'Un programmeur est invité à participer à un test d\'intelligence artificielle.', genre: 'Science-Fiction' },
    { title: 'Arrival', year: 2016, rating: 7.9, country: 'États-Unis', actors: ['Amy Adams', 'Jeremy Renner'], synopsis: 'Une linguiste est recrutée pour communiquer avec des extraterrestres qui ont atterri sur Terre.', genre: 'Science-Fiction' },
    { title: 'District 9', year: 2009, rating: 7.9, country: 'Afrique du Sud', actors: ['Sharlto Copley', 'Jason Cope'], synopsis: 'Un fonctionnaire est infecté par un virus qui le transforme lentement en extraterrestre.', genre: 'Science-Fiction' },
    { title: 'The Sixth Sense', year: 1999, rating: 8.2, country: 'États-Unis', actors: ['Bruce Willis', 'Haley Joel Osment'], synopsis: 'Un garçon qui peut voir les morts communique avec un psychologue troublé.', genre: 'Thriller psychologique' },
    { title: 'Black Swan', year: 2010, rating: 8.0, country: 'États-Unis', actors: ['Natalie Portman', 'Mila Kunis'], synopsis: 'Une ballerine perd la tête quand elle se retrouve en compétition pour un rôle dans \"Le Lac des cygnes\".', genre: 'Drame psychologique' },
    { title: 'Eternal Sunshine of the Spotless Mind', year: 2004, rating: 8.3, country: 'États-Unis', actors: ['Jim Carrey', 'Kate Winslet'], synopsis: 'Un couple subit une procédure pour s\'effacer mutuellement de leur mémoire après une rupture déchirante.', genre: 'Drame' }
  ]
};

// Mappage des catégories de l'interface vers les genres de films
const categoryToGenres: Record<string, string[]> = {
  'Comédie': ['Comédie', 'Comédie romantique', 'Comédie dramatique'],
  'Drame': ['Drame', 'Drame psychologique', 'Drame historique'],
  'Suspense & Thriller': ['Thriller', 'Suspense', 'Policier', 'Film noir'],
  'Mind-Blow': ['Science-Fiction', 'Thriller psychologique', 'Drame psychologique', 'Horreur psychologique'],
  'Science-Fiction': ['Science-Fiction', 'Fantastique', 'Cyberpunk', 'Space-Opera'],
  'Découverte': ['Drame', 'Comédie', 'Thriller', 'Science-Fiction', 'Documentaire']
};

export async function generateMovieSuggestions(input: GenerateMovieSuggestionsInput): Promise<GenerateMovieSuggestionsOutput> {
  try {
    const category = input.genre || 'Découverte';
    
    // Obtenir les genres correspondant à la catégorie sélectionnée
    const targetGenres = categoryToGenres[category] || ['Drame'];
    
    // Récupérer les films correspondants aux genres cibles
    let filteredMovies: typeof movieDatabase['Drame'] = [];
    
    if (category === 'Découverte') {
      // Pour la catégorie Découverte, mélanger tous les films
      filteredMovies = Object.values(movieDatabase).flat();
    } else if (category === 'Mind-Blow') {
      // Pour Mind-Blow, sélectionner des films avec des intrigues complexes ou des fins inattendues
      const mindBlowTitles = [
        'Inception', 'The Matrix', 'Fight Club', 'Interstellar', 'Shutter Island',
        'The Prestige', 'Memento', 'The Sixth Sense', 'Black Swan', 'Eternal Sunshine of the Spotless Mind'
      ];
      
      filteredMovies = Object.values(movieDatabase)
        .flat()
        .filter(movie => mindBlowTitles.includes(movie.title));
    } else {
      // Pour les autres catégories, utiliser les genres correspondants
      filteredMovies = Object.entries(movieDatabase)
        .filter(([genre]) => targetGenres.includes(genre))
        .flatMap(([, movies]) => movies);
    }
    
    // Filtrer les films déjà vus
    const availableMovies = filteredMovies.filter(movie => 
      !input.seenMovieTitles?.includes(movie.title)
    );
    
    // Mélanger et prendre le nombre demandé
    const shuffled = [...availableMovies].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, input.count);
    
    // Si pas assez de films disponibles, ajouter des films de remplacement
    if (selected.length < input.count) {
      const additionalNeeded = input.count - selected.length;
      const backupMovies = Object.values(movieDatabase)
        .flat()
        .filter(movie => !selected.some(m => m.title === movie.title) && 
                        !input.seenMovieTitles?.includes(movie.title));
      
      const additional = backupMovies
        .sort(() => Math.random() - 0.5)
        .slice(0, additionalNeeded);
      
      selected.push(...additional);
    }
    
    return {
      movies: selected.map(movie => {
        // Déterminer le genre affiché (celui de la catégorie sélectionnée ou le genre d'origine)
        const displayGenre = category !== 'Découverte' && category !== 'Mind-Blow' 
          ? category 
          : movie.genre || 'Divers';
          
        return {
          id: Math.random().toString(36).substr(2, 9),
          title: movie.title,
          synopsis: movie.synopsis,
          actors: movie.actors,
          rating: movie.rating,
          year: movie.year,
          wikipediaUrl: `https://fr.wikipedia.org/wiki/${encodeURIComponent(movie.title.replace(/\s+/g, '_'))}`,
          genre: displayGenre,
          country: movie.country
        };
      })
    };
  } catch (error) {
    console.error('Error in generateMovieSuggestions:', error);
    
    // Fallback avec un film générique
    return {
      movies: [{
        id: 'fallback-1',
        title: 'The Matrix',
        synopsis: 'Un programmeur découvre que la réalité n\'est qu\'une simulation contrôlée par des machines.',
        actors: ['Keanu Reeves', 'Laurence Fishburne'],
        rating: 8.7,
        year: 1999,
        wikipediaUrl: 'https://fr.wikipedia.org/wiki/The_Matrix',
        genre: input.genre || 'Action',
        country: 'États-Unis'
      }]
    };
  }
}
