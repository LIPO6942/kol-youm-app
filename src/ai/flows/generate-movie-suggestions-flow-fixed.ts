'use server';

/**
 * Flow de fallback simple pour les suggestions de films
 * Utilise une base de données de films populaires
 */

import { GenerateMovieSuggestionsInputSchema, GenerateMovieSuggestionsOutputSchema, type GenerateMovieSuggestionsInput, type GenerateMovieSuggestionsOutput } from './generate-movie-suggestions-flow.types';

const movieDatabase = {
  'Action': [
    { title: 'John Wick', year: 2014, rating: 8.2, country: 'États-Unis', actors: ['Keanu Reeves', 'Ian McShane'], synopsis: 'Un ancien tueur à gages sort de sa retraite pour se venger de ceux qui ont tué son chien.' },
    { title: 'Mad Max: Fury Road', year: 2015, rating: 8.1, country: 'Australie', actors: ['Tom Hardy', 'Charlize Theron'], synopsis: 'Dans un monde post-apocalyptique, Max aide Furiosa à échapper au tyran Immortan Joe.' },
    { title: 'The Raid', year: 2011, rating: 8.0, country: 'Indonésie', actors: ['Iko Uwais', 'Joe Taslim'], synopsis: 'Une unité d\'élite de la police indonésienne doit infiltrer un immeuble contrôlé par un baron de la drogue.' },
    { title: 'Dredd', year: 2012, rating: 7.1, country: 'Royaume-Uni', actors: ['Karl Urban', 'Olivia Thirlby'], synopsis: 'Le juge Dredd et une recrue doivent survivre dans un immeuble contrôlé par des criminels.' },
    { title: 'The Matrix', year: 1999, rating: 8.7, country: 'États-Unis', actors: ['Keanu Reeves', 'Laurence Fishburne'], synopsis: 'Un programmeur découvre que la réalité n\'est qu\'une simulation contrôlée par des machines.' }
  ],
  'Drame': [
    { title: 'Parasite', year: 2019, rating: 8.6, country: 'Corée du Sud', actors: ['Song Kang-ho', 'Lee Sun-kyun'], synopsis: 'Une famille pauvre infiltre une famille riche en se faisant passer pour des employés qualifiés.' },
    { title: 'The Social Network', year: 2010, rating: 8.0, country: 'États-Unis', actors: ['Jesse Eisenberg', 'Andrew Garfield'], synopsis: 'L\'histoire de la création de Facebook et des conflits qui ont suivi.' },
    { title: 'Whiplash', year: 2014, rating: 8.5, country: 'États-Unis', actors: ['Miles Teller', 'J.K. Simmons'], synopsis: 'Un jeune batteur de jazz s\'efforce de devenir le meilleur sous la direction d\'un professeur impitoyable.' },
    { title: 'Her', year: 2013, rating: 8.0, country: 'États-Unis', actors: ['Joaquin Phoenix', 'Scarlett Johansson'], synopsis: 'Un homme tombe amoureux d\'une intelligence artificielle.' },
    { title: 'Moonlight', year: 2016, rating: 7.4, country: 'États-Unis', actors: ['Mahershala Ali', 'Naomie Harris'], synopsis: 'L\'histoire d\'un jeune homme noir qui grandit dans un quartier difficile de Miami.' }
  ],
  'Comédie': [
    { title: 'The Grand Budapest Hotel', year: 2014, rating: 8.1, country: 'États-Unis', actors: ['Ralph Fiennes', 'Tony Revolori'], synopsis: 'Les aventures d\'un concierge d\'hôtel et de son protégé dans l\'Europe d\'entre-deux-guerres.' },
    { title: 'Deadpool', year: 2016, rating: 8.0, country: 'États-Unis', actors: ['Ryan Reynolds', 'Morena Baccarin'], synopsis: 'Un mercenaire avec des pouvoirs de guérison rapide cherche à sauver sa petite amie.' },
    { title: 'The Nice Guys', year: 2016, rating: 7.4, country: 'États-Unis', actors: ['Ryan Gosling', 'Russell Crowe'], synopsis: 'Deux détectives privés enquêtent sur la disparition d\'une jeune femme à Los Angeles en 1977.' },
    { title: 'Superbad', year: 2007, rating: 7.6, country: 'États-Unis', actors: ['Jonah Hill', 'Michael Cera'], synopsis: 'Deux amis tentent d\'acheter de l\'alcool pour une fête avant de partir à l\'université.' },
    { title: 'Hot Fuzz', year: 2007, rating: 7.8, country: 'Royaume-Uni', actors: ['Simon Pegg', 'Nick Frost'], synopsis: 'Un policier londonien est transféré dans un petit village où des meurtres mystérieux se produisent.' }
  ],
  'Suspense & Thriller': [
    { title: 'Gone Girl', year: 2014, rating: 8.1, country: 'États-Unis', actors: ['Ben Affleck', 'Rosamund Pike'], synopsis: 'Un homme devient suspect dans la disparition de sa femme.' },
    { title: 'Prisoners', year: 2013, rating: 8.1, country: 'États-Unis', actors: ['Hugh Jackman', 'Jake Gyllenhaal'], synopsis: 'Un père prend la loi en main quand sa fille est kidnappée.' },
    { title: 'Zodiac', year: 2007, rating: 7.7, country: 'États-Unis', actors: ['Jake Gyllenhaal', 'Robert Downey Jr.'], synopsis: 'L\'enquête sur le tueur en série Zodiac qui terrorisa la région de San Francisco.' },
    { title: 'The Silence of the Lambs', year: 1991, rating: 8.6, country: 'États-Unis', actors: ['Jodie Foster', 'Anthony Hopkins'], synopsis: 'Une jeune agent du FBI consulte un psychiatre cannibale pour attraper un autre tueur en série.' },
    { title: 'Se7en', year: 1995, rating: 8.6, country: 'États-Unis', actors: ['Brad Pitt', 'Morgan Freeman'], synopsis: 'Deux détectives enquêtent sur une série de meurtres basés sur les sept péchés capitaux.' }
  ],
  'Science-Fiction': [
    { title: 'Blade Runner 2049', year: 2017, rating: 8.0, country: 'États-Unis', actors: ['Ryan Gosling', 'Harrison Ford'], synopsis: 'Un jeune agent découvre un secret qui pourrait plonger la société dans le chaos.' },
    { title: 'Interstellar', year: 2014, rating: 8.6, country: 'États-Unis', actors: ['Matthew McConaughey', 'Anne Hathaway'], synopsis: 'Un groupe d\'astronautes voyage à travers un trou de ver pour sauver l\'humanité.' },
    { title: 'Ex Machina', year: 2014, rating: 7.7, country: 'Royaume-Uni', actors: ['Domhnall Gleeson', 'Alicia Vikander'], synopsis: 'Un programmeur est invité à participer à un test d\'intelligence artificielle.' },
    { title: 'Arrival', year: 2016, rating: 7.9, country: 'États-Unis', actors: ['Amy Adams', 'Jeremy Renner'], synopsis: 'Une linguiste est recrutée pour communiquer avec des extraterrestres qui ont atterri sur Terre.' },
    { title: 'District 9', year: 2009, rating: 7.9, country: 'Afrique du Sud', actors: ['Sharlto Copley', 'Jason Cope'], synopsis: 'Un fonctionnaire est infecté par un virus qui le transforme lentement en extraterrestre.' }
  ]
};

export async function generateMovieSuggestions(input: GenerateMovieSuggestionsInput): Promise<GenerateMovieSuggestionsOutput> {
  try {
    const genre = input.genre || 'Drame';
    const movies = movieDatabase[genre as keyof typeof movieDatabase] || movieDatabase['Drame'];
    
    // Filtrer les films déjà vus
    const availableMovies = movies.filter(movie => 
      !input.seenMovieTitles.includes(movie.title)
    );
    
    // Mélanger et prendre le nombre demandé
    const shuffled = [...availableMovies].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, input.count);
    
    return {
      movies: selected.map(movie => ({
        id: Math.random().toString(36).substr(2, 9),
        title: movie.title,
        synopsis: movie.synopsis,
        actors: movie.actors,
        rating: movie.rating,
        year: movie.year,
        wikipediaUrl: `https://fr.wikipedia.org/wiki/${movie.title.replace(/\s+/g, '_')}`,
        genre: genre,
        country: movie.country
      }))
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
