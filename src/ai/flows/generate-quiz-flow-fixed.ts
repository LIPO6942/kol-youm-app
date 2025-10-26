'use server';

/**
 * Flow de fallback pour la génération de quiz
 * Utilise une base de données de questions prédéfinies
 */

import { GenerateQuizInputSchema, GenerateQuizOutputSchema, type GenerateQuizInput, type GenerateQuizOutput } from './generate-quiz-flow.types';

const quizDatabase = {
  'Culture Générale': {
    title: 'Quiz Culture Générale',
    questions: [
      {
        question: 'Quelle est la capitale de l\'Australie ?',
        options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'],
        answer: 'Canberra'
      },
      {
        question: 'Qui a peint "La Joconde" ?',
        options: ['Michel-Ange', 'Léonard de Vinci', 'Raphaël', 'Botticelli'],
        answer: 'Léonard de Vinci'
      },
      {
        question: 'Quel est le plus grand océan du monde ?',
        options: ['Atlantique', 'Pacifique', 'Indien', 'Arctique'],
        answer: 'Pacifique'
      },
      {
        question: 'En quelle année a eu lieu la chute du mur de Berlin ?',
        options: ['1987', '1989', '1991', '1993'],
        answer: '1989'
      },
      {
        question: 'Quel est le symbole chimique de l\'or ?',
        options: ['Au', 'Ag', 'Fe', 'Cu'],
        answer: 'Au'
      }
    ],
    funFact: 'Le saviez-vous ? Le mot "quiz" vient du latin "quis" qui signifie "qui" et était utilisé dans les écoles pour tester les connaissances des élèves.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/Quiz'
  },
  'Cinéma & Séries': {
    title: 'Quiz Cinéma & Séries',
    questions: [
      {
        question: 'Quel acteur joue le rôle de Tony Stark dans les films Marvel ?',
        options: ['Chris Evans', 'Robert Downey Jr.', 'Chris Hemsworth', 'Mark Ruffalo'],
        answer: 'Robert Downey Jr.'
      },
      {
        question: 'Dans quelle série Netflix trouve-t-on Eleven ?',
        options: ['The Crown', 'Stranger Things', 'Ozark', 'Dark'],
        answer: 'Stranger Things'
      },
      {
        question: 'Quel réalisateur a dirigé "Pulp Fiction" ?',
        options: ['Martin Scorsese', 'Quentin Tarantino', 'Steven Spielberg', 'Christopher Nolan'],
        answer: 'Quentin Tarantino'
      },
      {
        question: 'Quel est le nom du personnage principal dans "Breaking Bad" ?',
        options: ['Walter White', 'Jesse Pinkman', 'Saul Goodman', 'Hank Schrader'],
        answer: 'Walter White'
      },
      {
        question: 'Dans quel film trouve-t-on la réplique "May the Force be with you" ?',
        options: ['Star Trek', 'Star Wars', 'Blade Runner', 'Dune'],
        answer: 'Star Wars'
      }
    ],
    funFact: 'Le saviez-vous ? Le premier film jamais projeté au public était "L\'Arrivée d\'un train en gare de La Ciotat" des frères Lumière en 1895.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/L\'Arrivée_d\'un_train_en_gare_de_La_Ciotat'
  },
  'Musique': {
    title: 'Quiz Musique',
    questions: [
      {
        question: 'Quel groupe a chanté "Bohemian Rhapsody" ?',
        options: ['The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd'],
        answer: 'Queen'
      },
      {
        question: 'Quel instrument joue Yo-Yo Ma ?',
        options: ['Violon', 'Violoncelle', 'Piano', 'Flûte'],
        answer: 'Violoncelle'
      },
      {
        question: 'Dans quel pays est né Mozart ?',
        options: ['Allemagne', 'Autriche', 'Italie', 'France'],
        answer: 'Autriche'
      },
      {
        question: 'Quel genre musical est associé à Bob Marley ?',
        options: ['Rock', 'Reggae', 'Jazz', 'Blues'],
        answer: 'Reggae'
      },
      {
        question: 'Quel est le nom de famille de la chanteuse Beyoncé ?',
        options: ['Williams', 'Knowles', 'Carter', 'Beyoncé'],
        answer: 'Knowles'
      }
    ],
    funFact: 'Le saviez-vous ? Le violon Stradivarius le plus cher jamais vendu, le "Messie", a été estimé à plus de 20 millions de dollars.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/Antonio_Stradivari'
  },
  'Histoire & Mythologies': {
    title: 'Quiz Histoire & Mythologies',
    questions: [
      {
        question: 'Qui était le premier empereur romain ?',
        options: ['Jules César', 'Auguste', 'Néron', 'Marc Aurèle'],
        answer: 'Auguste'
      },
      {
        question: 'Dans quelle guerre a eu lieu la bataille de Verdun ?',
        options: ['Guerre de 1870', 'Première Guerre mondiale', 'Seconde Guerre mondiale', 'Guerre de Corée'],
        answer: 'Première Guerre mondiale'
      },
      {
        question: 'Quel dieu grec est associé à la foudre ?',
        options: ['Poséidon', 'Zeus', 'Hadès', 'Apollon'],
        answer: 'Zeus'
      },
      {
        question: 'Qui a découvert l\'Amérique en 1492 ?',
        options: ['Vasco de Gama', 'Christophe Colomb', 'Magellan', 'Marco Polo'],
        answer: 'Christophe Colomb'
      },
      {
        question: 'Quelle dynastie a régné sur la Chine pendant plus de 400 ans ?',
        options: ['Tang', 'Song', 'Ming', 'Qing'],
        answer: 'Ming'
      }
    ],
    funFact: 'Le saviez-vous ? La Grande Muraille de Chine n\'est pas visible depuis l\'espace à l\'œil nu, contrairement à la croyance populaire.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/Grande_muraille_de_Chine'
  },
  'Sciences & Découvertes': {
    title: 'Quiz Sciences & Découvertes',
    questions: [
      {
        question: 'Quelle est la vitesse de la lumière dans le vide ?',
        options: ['300 000 km/s', '150 000 km/s', '450 000 km/s', '600 000 km/s'],
        answer: '300 000 km/s'
      },
      {
        question: 'Quel élément chimique a le symbole "H" ?',
        options: ['Hélium', 'Hydrogène', 'Hafnium', 'Holmium'],
        answer: 'Hydrogène'
      },
      {
        question: 'Qui a formulé la théorie de la relativité ?',
        options: ['Isaac Newton', 'Albert Einstein', 'Stephen Hawking', 'Galilée'],
        answer: 'Albert Einstein'
      },
      {
        question: 'Combien de chromosomes possède l\'être humain ?',
        options: ['23', '46', '48', '50'],
        answer: '46'
      },
      {
        question: 'Quelle est la formule chimique de l\'eau ?',
        options: ['H2O', 'CO2', 'NaCl', 'O2'],
        answer: 'H2O'
      }
    ],
    funFact: 'Le saviez-vous ? Le cerveau humain contient environ 86 milliards de neurones et peut traiter jusqu\'à 70 000 pensées par jour.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/Cerveau_humain'
  },
  'Art & Littérature': {
    title: 'Quiz Art & Littérature',
    questions: [
      {
        question: 'Qui a écrit "Les Misérables" ?',
        options: ['Victor Hugo', 'Émile Zola', 'Gustave Flaubert', 'Honoré de Balzac'],
        answer: 'Victor Hugo'
      },
      {
        question: 'Dans quel musée se trouve "La Joconde" ?',
        options: ['Musée d\'Orsay', 'Louvre', 'Centre Pompidou', 'Musée Rodin'],
        answer: 'Louvre'
      },
      {
        question: 'Quel mouvement artistique est associé à Picasso ?',
        options: ['Impressionnisme', 'Cubisme', 'Surréalisme', 'Expressionnisme'],
        answer: 'Cubisme'
      },
      {
        question: 'Qui a peint "La Nuit étoilée" ?',
        options: ['Monet', 'Van Gogh', 'Cézanne', 'Renoir'],
        answer: 'Van Gogh'
      },
      {
        question: 'Quel écrivain français a écrit "À la recherche du temps perdu" ?',
        options: ['Marcel Proust', 'André Gide', 'Paul Valéry', 'Jean Cocteau'],
        answer: 'Marcel Proust'
      }
    ],
    funFact: 'Le saviez-vous ? Le roman "À la recherche du temps perdu" de Marcel Proust compte plus de 1,2 million de mots, soit environ 3000 pages.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/À_la_recherche_du_temps_perdu'
  }
};

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  try {
    const category = input.category;
    const quizData = quizDatabase[category as keyof typeof quizDatabase];
    
    if (!quizData) {
      // Fallback vers Culture Générale si la catégorie n'est pas trouvée
      return quizDatabase['Culture Générale'];
    }
    
    return quizData;
  } catch (error) {
    console.error('Error in generateQuiz:', error);
    
    // Fallback avec un quiz simple
    return {
      title: 'Quiz de Secours',
      questions: [
        {
          question: 'Quelle est la capitale de la France ?',
          options: ['Lyon', 'Marseille', 'Paris', 'Toulouse'],
          answer: 'Paris'
        },
        {
          question: 'Combien y a-t-il de jours dans une année ?',
          options: ['365', '366', '364', '367'],
          answer: '365'
        }
      ],
      funFact: 'Le saviez-vous ? La France est le pays le plus visité au monde avec plus de 89 millions de touristes par an.',
      funFactUrl: 'https://fr.wikipedia.org/wiki/Tourisme_en_France'
    };
  }
}
