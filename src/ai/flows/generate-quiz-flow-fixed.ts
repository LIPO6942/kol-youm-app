'use server';

/**
 * Flow de fallback pour la génération de quiz
 * Utilise une base de données de questions prédéfinies de 15 questions par catégorie
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
      },
      {
        question: 'Quel est le plus long fleuve du monde ?',
        options: ['L\'Amazone', 'Le Nil', 'Le Mississippi', 'Le Yangzi Jiang'],
        answer: 'Le Nil'
      },
      {
        question: 'Quel pays européen a la forme caractéristique d\'une botte ?',
        options: ['L\'Espagne', 'La Grèce', 'L\'Italie', 'Le Portugal'],
        answer: 'L\'Italie'
      },
      {
        question: 'Quel monument tunisien exceptionnel est un grand amphithéâtre romain classé à l\'UNESCO ?',
        options: ['Le Pont de Bizerte', 'L\'Amphithéâtre d\'El Jem', 'Le Phare de Sidi Bou Saïd', 'L\'Horloge de Tunis'],
        answer: 'L\'Amphithéâtre d\'El Jem'
      },
      {
        question: 'Quel est l\'oiseau national de la Tunisie, symbole de noblesse ?',
        options: ['Le faucon pèlerin', 'L\'hirondelle', 'L\'aigle royal', 'La cigogne'],
        answer: 'Le faucon pèlerin'
      },
      {
        question: 'Combien de fuseaux horaires existe-t-il en Russie ?',
        options: ['9', '10', '11', '12'],
        answer: '11'
      },
      {
        question: 'Quelle île tunisienne est surnommée "l\'île des Flamants roses" ?',
        options: ['Kerkennah', 'Djerba', 'La Galite', 'Kuriat'],
        answer: 'Djerba'
      },
      {
        question: 'Qui a écrit le célèbre conte poétique et philosophique "Le Petit Prince" ?',
        options: ['Victor Hugo', 'Jules Verne', 'Antoine de Saint-Exupéry', 'Albert Camus'],
        answer: 'Antoine de Saint-Exupéry'
      },
      {
        question: 'Dans quel pays d\'Asie du Sud-Est se trouve le complexe de temples d\'Angkor Wat ?',
        options: ['La Thaïlande', 'Le Cambodge', 'Le Viêt Nam', 'L\'Indonésie'],
        answer: 'Le Cambodge'
      },
      {
        question: 'Quel est le plus grand désert du monde (chaud ou froid confondus) ?',
        options: ['Le Sahara', 'Le désert de Gobi', 'L\'Antarctique', 'Le désert du Kalahari'],
        answer: 'L\'Antarctique'
      },
      {
        question: 'Quelle monnaie officielle est utilisée au Japon ?',
        options: ['Le Yuan', 'Le Won', 'Le Yen', 'Le Ringgit'],
        answer: 'Le Yen'
      }
    ],
    funFact: 'Le saviez-vous ? Le mot "quiz" vient du latin "quis" qui signifie "qui" et était utilisé dans les écoles pour tester les connaissances.',
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
        question: 'Dans quelle série Netflix trouve-t-on le personnage d\'Eleven ?',
        options: ['The Crown', 'Stranger Things', 'Ozark', 'Dark'],
        answer: 'Stranger Things'
      },
      {
        question: 'Quel réalisateur a dirigé le film culte "Pulp Fiction" ?',
        options: ['Martin Scorsese', 'Quentin Tarantino', 'Steven Spielberg', 'Christopher Nolan'],
        answer: 'Quentin Tarantino'
      },
      {
        question: 'Quel est le nom du personnage principal de la série "Breaking Bad" ?',
        options: ['Walter White', 'Jesse Pinkman', 'Saul Goodman', 'Hank Schrader'],
        answer: 'Walter White'
      },
      {
        question: 'Dans quel film légendaire trouve-t-on la réplique "Que la Force soit avec toi" ?',
        options: ['Star Trek', 'Star Wars', 'Blade Runner', 'Dune'],
        answer: 'Star Wars'
      },
      {
        question: 'Quel film tunisien a été nominé historique aux Oscars dans la catégorie meilleur film international en 2021 ?',
        options: ['Un fils', 'Dachra', 'L\'Homme qui a vendu sa peau', 'Hedi, un vent de liberté'],
        answer: 'L\'Homme qui a vendu sa peau'
      },
      {
        question: 'Quel réalisateur tunisien a réalisé le premier film d\'horreur tunisien à succès "Dachra" ?',
        options: ['Abdelhamid Bouchnak', 'Nouri Bouzid', 'Kaouther Ben Hania', 'Nejib Belkadhi'],
        answer: 'Abdelhamid Bouchnak'
      },
      {
        question: 'Quel acteur incarne le personnage de Jack Dawson dans le film "Titanic" ?',
        options: ['Brad Pitt', 'Johnny Depp', 'Leonardo DiCaprio', 'Matt Damon'],
        answer: 'Leonardo DiCaprio'
      },
      {
        question: 'Dans quelle série télévisée comique tunisienne culte trouve-t-on le personnage attachant de "Sboui" ?',
        options: ['Nsibti Laaziza', 'Choufli Hal', 'Maktoub', 'El Khawa'],
        answer: 'Choufli Hal'
      },
      {
        question: 'Qui a réalisé le film de science-fiction complexe "Inception" ?',
        options: ['Steven Spielberg', 'Christopher Nolan', 'Ridley Scott', 'James Cameron'],
        answer: 'Christopher Nolan'
      },
      {
        question: 'Quelle série de science-fiction met en scène l\'affrontement pour la planète de sable Arrakis ?',
        options: ['Dune', 'Star Wars', 'Star Trek', 'Interstellar'],
        answer: 'Dune'
      },
      {
        question: 'Quel film coréen a fait l\'histoire en remportant l\'Oscar du meilleur film en 2020 ?',
        options: ['1917', 'Parasite', 'Joker', 'Once Upon a Time in Hollywood'],
        answer: 'Parasite'
      },
      {
        question: 'Qui joue le rôle de Neo dans la trilogie originale de la saga "Matrix" ?',
        options: ['Laurence Fishburne', 'Keanu Reeves', 'Brad Pitt', 'Tom Cruise'],
        answer: 'Keanu Reeves'
      },
      {
        question: 'Quelle actrice britannique incarne la brillante Hermione Granger dans la saga "Harry Potter" ?',
        options: ['Emma Watson', 'Kristen Stewart', 'Jennifer Lawrence', 'Saoirse Ronan'],
        answer: 'Emma Watson'
      },
      {
        question: 'Quel film détient le record du plus grand succès au box-office mondial de tous les temps ?',
        options: ['Avengers: Endgame', 'Avatar', 'Titanic', 'Star Wars VII : Le Réveil de la Force'],
        answer: 'Avatar'
      }
    ],
    funFact: 'Le saviez-vous ? Le premier film jamais projeté au public était "L\'Arrivée d\'un train en gare de La Ciotat" des frères Lumière en 1895.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/L\'Arrivée_d\'un_train_en_gare_de_La_Ciotat'
  },
  'Musique': {
    title: 'Quiz Musique',
    questions: [
      {
        question: 'Quel groupe de rock britannique légendaire a chanté "Bohemian Rhapsody" ?',
        options: ['The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd'],
        answer: 'Queen'
      },
      {
        question: 'Quel instrument de musique classique joue le virtuose Yo-Yo Ma ?',
        options: ['Le Violon', 'Le Violoncelle', 'Le Piano', 'La Flûte traversière'],
        answer: 'Le Violoncelle'
      },
      {
        question: 'Dans quel pays européen est né le génie de la musique Wolfgang Amadeus Mozart ?',
        options: ['L\'Allemagne', 'L\'Autriche', 'L\'Italie', 'La France'],
        answer: 'L\'Autriche'
      },
      {
        question: 'Quel genre musical jamaïcain est mondialement associé à Bob Marley ?',
        options: ['Le Rock', 'Le Reggae', 'Le Jazz', 'Le Blues'],
        answer: 'Le Reggae'
      },
      {
        question: 'Quel est le nom de famille de la chanteuse américaine Beyoncé ?',
        options: ['Williams', 'Knowles', 'Carter', 'Beyoncé'],
        answer: 'Knowles'
      },
      {
        question: 'Qui est considéré historiquement comme l\'un des plus grands maîtres du Malouf tunisien au XXe siècle ?',
        options: ['Ali Riahi', 'Khemaïs Tarnane', 'Hedi Jouini', 'Lotfi Bouchnak'],
        answer: 'Khemaïs Tarnane'
      },
      {
        question: 'Quelle chanson célèbre de Hedi Jouini critique avec humour les jaloux et célèbre la liberté ?',
        options: ['Lamouni lli gharou mini', 'Taht el Yasmina fel الليل', 'Samra ya samra', 'Hobbi yétbaddel w yétjaddel'],
        answer: 'Lamouni lli gharou mini'
      },
      {
        question: 'Quel compositeur allemand, devenu sourd, a écrit la majestueuse Neuvième Symphonie ?',
        options: ['Johann Sebastian Bach', 'Wolfgang Amadeus Mozart', 'Ludwig van Beethoven', 'Franz Schubert'],
        answer: 'Ludwig van Beethoven'
      },
      {
        question: 'Quel chanteur et danseur américain d\'exception est surnommé "The King of Pop" ?',
        options: ['Elvis Presley', 'Michael Jackson', 'Prince', 'Freddie Mercury'],
        answer: 'Michael Jackson'
      },
      {
        question: 'Quel instrument traditionnel à cordes pincées, très populaire en Tunisie, est le roi de la musique arabe ?',
        options: ['Le Oud', 'Le Qanun', 'Le Nay', 'Le Mezoued'],
        answer: 'Le Oud'
      },
      {
        question: 'Quel groupe de rock progressif a sorti l\'album mythique "The Dark Side of the Moon" ?',
        options: ['Pink Floyd', 'The Beatles', 'Led Zeppelin', 'The Rolling Stones'],
        answer: 'Pink Floyd'
      },
      {
        question: 'Quelle chanteuse britannique à voix puissante a sorti l\'album phénomène "21" ?',
        options: ['Adele', 'Taylor Swift', 'Rihanna', 'Katy Perry'],
        answer: 'Adele'
      },
      {
        question: 'Quel compositeur italien est célèbre pour avoir créé les bandes originales des westerns de Sergio Leone ?',
        options: ['Hans Zimmer', 'Ennio Morricone', 'John Williams', 'Danny Elfman'],
        answer: 'Ennio Morricone'
      },
      {
        question: 'Quel genre musical riche en improvisation est né à la Nouvelle-Orléans au début du XXe siècle ?',
        options: ['Le Blues', 'Le Jazz', 'Le Rock', 'La Country'],
        answer: 'Le Jazz'
      },
      {
        question: 'Qui est l\'auteur-compositeur-interprète belge de la chanson intemporelle "Ne me quitte pas" ?',
        options: ['Jacques Brel', 'Charles Aznavour', 'Edith Piaf', 'Georges Brassens'],
        answer: 'Jacques Brel'
      }
    ],
    funFact: 'Le saviez-vous ? Le violon Stradivarius le plus cher jamais vendu, le "Messie", a été estimé à plus de 20 millions de dollars.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/Antonio_Stradivari'
  },
  'Histoire & Mythologies': {
    title: 'Quiz Histoire & Mythologies',
    questions: [
      {
        question: 'Qui était le tout premier empereur romain sous le nom d\'Auguste ?',
        options: ['Jules César', 'Auguste', 'Néron', 'Marc Aurèle'],
        answer: 'Auguste'
      },
      {
        question: 'Dans quelle guerre majeure a eu lieu la terrible bataille de Verdun en 1916 ?',
        options: ['La Guerre de 1870', 'La Première Guerre mondiale', 'La Seconde Guerre mondiale', 'La Guerre de Corée'],
        answer: 'La Première Guerre mondiale'
      },
      {
        question: 'Quel dieu souverain de la mythologie grecque est associé aux éclairs et à la foudre ?',
        options: ['Poséidon', 'Zeus', 'Hadès', 'Apollon'],
        answer: 'Zeus'
      },
      {
        question: 'Qui a mené la première expédition européenne à atteindre l\'Amérique en 1492 ?',
        options: ['Vasco de Gama', 'Christophe Colomb', 'Fernand de Magellan', 'Marco Polo'],
        answer: 'Christophe Colomb'
      },
      {
        question: 'Quelle dynastie a régné sur la Chine pendant près de trois siècles et construit une grande partie de la Muraille actuelle ?',
        options: ['La dynastie Tang', 'La dynastie Song', 'La dynastie Ming', 'La dynastie Qing'],
        answer: 'La dynastie Ming'
      },
      {
        question: 'Quel général carthaginois de génie a mené une armée avec des éléphants à travers les Alpes contre Rome ?',
        options: ['Hamilcar Barca', 'Hannibal Barca', 'Massinissa', 'Jugurtha'],
        answer: 'Hannibal Barca'
      },
      {
        question: 'En quelle année la Tunisie a-t-elle signé son indépendance nationale officielle ?',
        options: ['1952', '1954', '1956', '1960'],
        answer: '1956'
      },
      {
        question: 'Quel roi de France au règne exceptionnellement long de 72 ans était surnommé le "Roi-Soleil" ?',
        options: ['Louis XVI', 'François Ier', 'Henri IV', 'Louis XIV'],
        answer: 'Louis XIV'
      },
      {
        question: 'Quelle légendaire reine d\'Égypte a partagé la vie de Jules César puis de Marc Antoine ?',
        options: ['Néfertiti', 'Cléopâtre VII', 'Hatchepsout', 'Cléopâtre Selene'],
        answer: 'Cléopâtre VII'
      },
      {
        question: 'Quelle civilisation de l\'Antiquité a bâti le Parthénon sur l\'Acropole d\'Athènes ?',
        options: ['La civilisation Romaine', 'La civilisation Grecque', 'La civilisation Égyptienne', 'La civilisation Phénicienne'],
        answer: 'La civilisation Grecque'
      },
      {
        question: 'Quelle grande cité marchande de l\'Antiquité a été fondée en Tunisie par la reine phénicienne Elyssa (Didon) ?',
        options: ['Alexandrie', 'Carthage', 'Tyr', 'Syracuse'],
        answer: 'Carthage'
      },
      {
        question: 'Quel événement populaire marquant du 14 juillet 1789 marque le début symbolique de la Révolution française ?',
        options: ['La mort de Louis XVI', 'La prise de la Bastille', 'La période de la Terreur', 'Le serment du Jeu de Paume'],
        answer: 'La prise de la Bastille'
      },
      {
        question: 'Qui était le dieu à tête de chacal associé à la mort et aux momies dans l\'Égypte antique ?',
        options: ['Osiris', 'Horus', 'Anubis', 'Râ'],
        answer: 'Anubis'
      },
      {
        question: 'Quel explorateur portugais a entamé le premier voyage de circumnavigation (tour du monde) ?',
        options: ['Vasco de Gama', 'Fernand de Magellan', 'Amerigo Vespucci', 'Bartolomeu Dias'],
        answer: 'Fernand de Magellan'
      },
      {
        question: 'Quelle reine et chef militaire berbère a mené la résistance contre l\'expansion arabe en Afrique du Nord au VIIe siècle ?',
        options: ['Lalla Fatima N\'Soumer', 'La Kahina (Dihya)', 'La reine Elyssa', 'Sophonisbe'],
        answer: 'La Kahina (Dihya)'
      }
    ],
    funFact: 'Le saviez-vous ? La Grande Muraille de Chine n\'est pas visible depuis l\'espace à l\'œil nu, contrairement à la croyance populaire.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/Grande_muraille_de_Chine'
  },
  'Sciences & Découvertes': {
    title: 'Quiz Sciences & Découvertes',
    questions: [
      {
        question: 'Quelle est approximativement la vitesse de la lumière dans le vide ?',
        options: ['300 000 km/s', '150 000 km/s', '450 000 km/s', '600 000 km/s'],
        answer: '300 000 km/s'
      },
      {
        question: 'Quel élément chimique le plus léger de l\'univers possède le symbole "H" ?',
        options: ['L\'Hélium', 'L\'Hydrogène', 'L\'Hafnium', 'L\'Holmium'],
        answer: 'L\'Hydrogène'
      },
      {
        question: 'Quel physicien théoricien révolutionnaire a formulé la théorie de la relativité ?',
        options: ['Isaac Newton', 'Albert Einstein', 'Stephen Hawking', 'Galilée'],
        answer: 'Albert Einstein'
      },
      {
        question: 'Combien de chromosomes possède normalement une cellule humaine saine ?',
        options: ['23', '46', '48', '50'],
        answer: '46'
      },
      {
        question: 'Quelle est la formule chimique exacte de la molécule d\'eau ?',
        options: ['H2O', 'CO2', 'NaCl', 'O2'],
        answer: 'H2O'
      },
      {
        question: 'Quelle est la planète la plus proche du Soleil dans notre système solaire ?',
        options: ['Vénus', 'La Terre', 'Mercure', 'Mars'],
        answer: 'Mercure'
      },
      {
        question: 'Quelle force fondamentale attire les objets massifs entre eux et régit le mouvement des planètes ?',
        options: ['Le magnétisme', 'La gravité', 'La force centrifuge', 'La force de frottement'],
        answer: 'La gravité'
      },
      {
        question: 'Quelle est la température d\'ébullition exacte de l\'eau au niveau de la mer en degrés Celsius ?',
        options: ['90°C', '100°C', '110°C', '120°C'],
        answer: '100°C'
      },
      {
        question: 'Quel médecin et biologiste écossais a découvert la pénicilline en 1928, ouvrant l\'ère des antibiotiques ?',
        options: ['Louis Pasteur', 'Alexander Fleming', 'Marie Curie', 'Robert Koch'],
        answer: 'Alexander Fleming'
      },
      {
        question: 'Quel est l\'organe le plus étendu en superficie et le plus lourd du corps humain ?',
        options: ['Le foie', 'Le cerveau', 'Les poumons', 'La peau'],
        answer: 'La peau'
      },
      {
        question: 'Quelle planète géante gazeuse du système solaire se distingue par ses anneaux spectaculaires ?',
        options: ['Jupiter', 'Saturne', 'Uranus', 'Neptune'],
        answer: 'Saturne'
      },
      {
        question: 'Quelle particule élémentaire orbitant autour du noyau atomique possède une charge négative ?',
        options: ['Le proton', 'Le neutron', 'L\'électron', 'Le quark'],
        answer: 'L\'électron'
      },
      {
        question: 'Quelle est l\'étoile centrale qui fournit la quasi-totalité de l\'énergie de notre planète ?',
        options: ['Sirius', 'Le Soleil', 'Proxima Centauri', 'La Lune'],
        answer: 'Le Soleil'
      },
      {
        question: 'Quel gaz atmosphérique majeur est capturé par les feuilles des plantes lors de la photosynthèse ?',
        options: ['Le dioxygène', 'Le dioxyde de carbone', 'Le diazote', 'Le monoxyde de carbone'],
        answer: 'Le dioxyde de carbone'
      },
      {
        question: 'Quel biologiste britannique a conceptualisé l\'évolution des espèces vivantes par sélection naturelle en 1859 ?',
        options: ['Charles Darwin', 'Gregor Mendel', 'Jean-Baptiste Lamarck', 'Alfred Russel Wallace'],
        answer: 'Charles Darwin'
      }
    ],
    funFact: 'Le saviez-vous ? Le cerveau humain contient environ 86 milliards de neurones et peut traiter les informations à une vitesse folle.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/Cerveau_humain'
  },
  'Art & Littérature': {
    title: 'Quiz Art & Littérature',
    questions: [
      {
        question: 'Quel écrivain engagé du XIXe siècle a rédigé le chef-d\'œuvre littéraire "Les Misérables" ?',
        options: ['Victor Hugo', 'Émile Zola', 'Gustave Flaubert', 'Honoré de Balzac'],
        answer: 'Victor Hugo'
      },
      {
        question: 'Dans quel célèbre musée parisien est exposée de manière permanente "La Joconde" ?',
        options: ['Le Musée d\'Orsay', 'Le Louvre', 'Le Centre Pompidou', 'Le Musée Rodin'],
        answer: 'Le Louvre'
      },
      {
        question: 'Quel mouvement artistique révolutionnaire du XXe siècle est initié par Georges Braque et Pablo Picasso ?',
        options: ['L\'Impressionnisme', 'Le Cubisme', 'Le Surréalisme', 'L\'Expressionnisme'],
        answer: 'Le Cubisme'
      },
      {
        question: 'Quel peintre expressionniste néerlandais au destin tragique a réalisé la célèbre toile "La Nuit étoilée" ?',
        options: ['Claude Monet', 'Vincent van Gogh', 'Paul Cézanne', 'Auguste Renoir'],
        answer: 'Vincent van Gogh'
      },
      {
        question: 'Quel auteur français a écrit la gigantesque suite romanesque "À la recherche du temps perdu" ?',
        options: ['Marcel Proust', 'André Gide', 'Paul Valéry', 'Jean Cocteau'],
        answer: 'Marcel Proust'
      },
      {
        question: 'Quel poète de génie tunisien a écrit les vers mémorables de l\'hymne national "La Volonté de vivre" ?',
        options: ['Aboul-Qacem Echebbi', 'Moncef Ghachem', 'Ouled Ahmed', 'Ali Douagi'],
        answer: 'Aboul-Qacem Echebbi'
      },
      {
        question: 'Quel génie de la Renaissance italienne a peint le plafond monumental de la chapelle Sixtine à Rome ?',
        options: ['Léonard de Vinci', 'Raphaël', 'Michel-Ange', 'Donatello'],
        answer: 'Michel-Ange'
      },
      {
        question: 'Quel sculpteur réaliste français a modelé la célèbre sculpture en bronze représentant un homme pensif, "Le Penseur" ?',
        options: ['Auguste Rodin', 'Camille Claudel', 'Alberto Giacometti', 'Edgar Degas'],
        answer: 'Auguste Rodin'
      },
      {
        question: 'Quel immense poète et dramaturge anglais a écrit la tragédie passionnelle "Roméo et Juliette" ?',
        options: ['William Shakespeare', 'Geoffrey Chaucer', 'Charles Dickens', 'Oscar Wilde'],
        answer: 'William Shakespeare'
      },
      {
        question: 'Quel auteur espagnol de l\'âge d\'or a créé le personnage farfelu de "Don Quichotte" ?',
        options: ['Miguel de Cervantes', 'Gabriel García Márquez', 'Federico García Lorca', 'Lope de Vega'],
        answer: 'Miguel de Cervantes'
      },
      {
        question: 'De quel mouvement littéraire et scientifique Émile Zola s\'est-il affirmé comme le chef de file en France ?',
        options: ['Le Romantisme', 'Le Réalisme', 'Le Naturalisme', 'Le Symbolisme'],
        answer: 'Le Naturalisme'
      },
      {
        question: 'Quelle célèbre artiste mexicaine est connue mondialement pour ses autoportraits colorés et son art engagé ?',
        options: ['Frida Kahlo', 'Leonora Carrington', 'Maria Izquierdo', 'Remedios Varo'],
        answer: 'Frida Kahlo'
      },
      {
        question: 'Quel chef-d\'œuvre de la littérature dystopique futuriste et du contrôle mental a été écrit par George Orwell ?',
        options: ['Le Meilleur des mondes', '1984', 'Fahrenheit 451', 'La Ferme des animaux'],
        answer: '1984'
      },
      {
        question: 'Quel peintre impressionniste français a passé ses dernières années à peindre les "Nymphéas" dans son jardin de Giverny ?',
        options: ['Édouard Manet', 'Claude Monet', 'Pierre-Auguste Renoir', 'Camille Pissarro'],
        answer: 'Claude Monet'
      },
      {
        question: 'Quel célèbre dramaturge comique du XVIIe siècle a écrit les célèbres pièces "Le Tartuffe" et "L\'Avare" ?',
        options: ['Jean Racine', 'Pierre Corneille', 'Molière', 'Jean de La Fontaine'],
        answer: 'Molière'
      }
    ],
    funFact: 'Le saviez-vous ? Le roman "À la recherche du temps perdu" de Marcel Proust compte plus de 1,2 million de mots, soit environ 3000 pages.',
    funFactUrl: 'https://fr.wikipedia.org/wiki/À_la_recherche_du_temps_perdu'
  }
};

export async function generateQuiz(input: GenerateQuizInput & { seenQuestions?: string[] }): Promise<GenerateQuizOutput> {
  try {
    const category = input.category;
    const categoryData = quizDatabase[category as keyof typeof quizDatabase];
    
    if (!categoryData) {
      // Fallback vers Culture Générale si la catégorie n'est pas trouvée
      return quizDatabase['Culture Générale'];
    }

    const seenQuestions = input.seenQuestions || [];

    // Filtrer les questions non vues
    let availableQuestions = categoryData.questions.filter(
      q => !seenQuestions.includes(q.question)
    );

    // Si on a moins de 5 questions non vues, on réinitialise l'exclusion (on utilise toutes les questions)
    if (availableQuestions.length < 5) {
      availableQuestions = categoryData.questions;
    }

    // Mélanger et sélectionner 5 questions
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 5);
    
    return {
      title: categoryData.title,
      questions: selectedQuestions,
      funFact: categoryData.funFact,
      funFactUrl: categoryData.funFactUrl
    };
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
