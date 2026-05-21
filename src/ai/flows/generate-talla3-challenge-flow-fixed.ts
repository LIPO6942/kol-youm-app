'use server';

/**
 * Fallback (sans IA) pour générer des défis Talla3.
 * Retourne une liste de défis pré-validés et variés de 16 défis prédéfinis.
 */

import type { GenerateTalla3ChallengeInput, GenerateTalla3ChallengeOutput, Talla3Challenge } from './generate-talla3-challenge-flow.types';

const PRESET_CHALLENGES: Talla3Challenge[] = [
  {
    id: 'hist-chron-1',
    title: "Classez ces inventions de la plus ancienne à la plus récente :",
    items: [
      { item: "Invention de l'imprimerie", detail: '1454' },
      { item: "Découverte de l'électricité (Franklin)", detail: '1752' },
      { item: 'Téléphone (Bell)', detail: '1876' },
      { item: 'Internet (ARPANET)', detail: '1969' }
    ],
    category: 'Histoire'
  },
  {
    id: 'space-dist-1',
    title: 'Classez ces planètes par distance croissante au Soleil :',
    items: [
      { item: 'Mercure' },
      { item: 'Vénus' },
      { item: 'Terre' },
      { item: 'Mars' }
    ],
    category: 'Sciences'
  },
  {
    id: 'cine-oscars-1',
    title: "Classez ces films par date de sortie (du plus ancien au plus récent) :",
    items: [
      { item: 'Casablanca', detail: '1942' },
      { item: 'Le Parrain', detail: '1972' },
      { item: 'Titanic', detail: '1997' },
      { item: 'Parasite', detail: '2019' }
    ],
    category: 'Cinéma'
  },
  {
    id: 'geo-size-1',
    title: 'Classez ces pays par superficie (du plus petit au plus grand) :',
    items: [
      { item: 'Tunisie', detail: '163 610 km²' },
      { item: 'France', detail: '643 801 km²' },
      { item: 'Brésil', detail: '8 515 767 km²' },
      { item: 'Russie', detail: '17 098 242 km²' }
    ],
    category: 'Géographie'
  },
  {
    id: 'tech-launch-1',
    title: 'Classez ces produits Apple par date de lancement (du plus ancien au plus récent) :',
    items: [
      { item: 'iPod', detail: '2001' },
      { item: 'iPhone', detail: '2007' },
      { item: 'iPad', detail: '2010' },
      { item: 'Apple Watch', detail: '2015' }
    ],
    category: 'Technologie'
  },
  {
    id: 'art-mov-1',
    title: 'Classez ces mouvements artistiques chronologiquement :',
    items: [
      { item: 'Renaissance', detail: 'XIVe–XVIe siècle' },
      { item: 'Baroque', detail: 'XVIIe siècle' },
      { item: 'Impressionnisme', detail: 'XIXe siècle' },
      { item: 'Surréalisme', detail: 'XXe siècle' }
    ],
    category: 'Art'
  },
  {
    id: 'geo-pop-1',
    title: 'Classez ces villes tunisiennes par population croissante (estimation) :',
    items: [
      { item: 'Sidi Bou Saïd', detail: 'Petite ville côtière' },
      { item: 'Kairouan', detail: 'Capitale historique' },
      { item: 'Sfax', detail: 'Métropole industrielle' },
      { item: 'Tunis', detail: 'Capitale et grand pôle' }
    ],
    category: 'Géographie'
  },
  {
    id: 'hist-tun-1',
    title: "Classez ces périodes de l'histoire de la Tunisie chronologiquement (du plus ancien au plus récent) :",
    items: [
      { item: 'Période Carthaginoise (Punique)', detail: 'Fondation au IXe siècle av. J.-C.' },
      { item: 'Période Romaine', detail: 'Début au IIe siècle av. J.-C.' },
      { item: 'Période Ottomane (Beylical)', detail: 'Début au XVIe siècle' },
      { item: 'Protectorat Français', detail: 'De 1881 à 1956' }
    ],
    category: 'Histoire'
  },
  {
    id: 'sport-tennis-1',
    title: "Classez ces légendes du tennis masculin par nombre de titres du Grand Chelem (du moins au plus) :",
    items: [
      { item: 'Pete Sampras', detail: '14 titres' },
      { item: 'Roger Federer', detail: '20 titres' },
      { item: 'Rafael Nadal', detail: '22 titres' },
      { item: 'Novak Djokovic', detail: '24 titres' }
    ],
    category: 'Sports'
  },
  {
    id: 'science-elements-1',
    title: "Classez ces éléments chimiques par numéro atomique croissant :",
    items: [
      { item: 'Hydrogène', detail: 'Numéro 1' },
      { item: 'Carbone', detail: 'Numéro 6' },
      { item: 'Oxygène', detail: 'Numéro 8' },
      { item: 'Fer', detail: 'Numéro 26' }
    ],
    category: 'Sciences'
  },
  {
    id: 'tun-monuments-1',
    title: "Classez ces monuments de la Tunisie par leur date de construction originelle (du plus ancien au plus récent) :",
    items: [
      { item: 'Site archéologique de Dougga', detail: 'Origine numide / romaine' },
      { item: 'Grande Mosquée de Kairouan', detail: 'Fondée en 670 ap. J.-C.' },
      { item: 'Mosquée Zitouna de Tunis', detail: 'Fondée vers 732 ap. J.-C.' },
      { item: 'Tour de l\'Horloge (Avenue Bourguiba)', detail: 'Inaugurée en 2001' }
    ],
    category: 'Histoire'
  },
  {
    id: 'lit-books-1',
    title: "Classez ces œuvres littéraires célèbres par leur date approximative de parution originelle (du plus ancien au plus récent) :",
    items: [
      { item: 'L\'Odyssée d\'Homère', detail: 'Antiquité (VIIIe siècle av. J.-C.)' },
      { item: 'Don Quichotte de Cervantes', detail: 'Publié en 1605' },
      { item: 'Les Misérables de Victor Hugo', detail: 'Publié en 1862' },
      { item: 'Le Petit Prince de Saint-Exupéry', detail: 'Publié en 1943' }
    ],
    category: 'Littérature'
  },
  {
    id: 'nature-speed-1',
    title: "Classez ces mammifères par vitesse maximale de pointe en course terrestre croissante :",
    items: [
      { item: 'Paresseux', detail: '0,25 km/h' },
      { item: 'Homme', detail: '44 km/h (sprint record)' },
      { item: 'Lion', detail: '80 km/h' },
      { item: 'Guépard', detail: '120 km/h' }
    ],
    category: 'Sciences'
  },
  {
    id: 'music-composers-1',
    title: "Classez ces compositeurs de musique classique du plus ancien au plus récent (par date de naissance) :",
    items: [
      { item: 'Antonio Vivaldi', detail: 'Né en 1678' },
      { item: 'Johann Sebastian Bach', detail: 'Né en 1685' },
      { item: 'Wolfgang Amadeus Mozart', detail: 'Né en 1756' },
      { item: 'Ludwig van Beethoven', detail: 'Né en 1770' }
    ],
    category: 'Musique'
  },
  {
    id: 'geo-mountain-1',
    title: "Classez ces sommets montagneux par altitude croissante :",
    items: [
      { item: 'Jebel Chambi (Tunisie)', detail: '1 544 m' },
      { item: 'Mont Blanc (France/Italie)', detail: '4 808 m' },
      { item: 'Kilimandjaro (Tanzanie)', detail: '5 895 m' },
      { item: 'Mont Everest (Népal/Chine)', detail: '8 848 m' }
    ],
    category: 'Géographie'
  },
  {
    id: 'cine-directors-1',
    title: "Classez ces réalisateurs célèbres par leur nombre d'Oscars remportés de la meilleure réalisation (du moins au plus) :",
    items: [
      { item: 'Quentin Tarantino', detail: '0 Oscar (meilleure réalisation)' },
      { item: 'Martin Scorsese', detail: '1 Oscar (Infiltrés)' },
      { item: 'Steven Spielberg', detail: '2 Oscars (Schindler, Soldat Ryan)' },
      { item: 'John Ford', detail: '4 Oscars' }
    ],
    category: 'Cinéma'
  }
];

export async function generateTalla3Challenges(input: GenerateTalla3ChallengeInput & { seenTalla3Challenges?: string[] }): Promise<GenerateTalla3ChallengeOutput> {
  const count = Math.max(1, Math.min(input.count ?? 5, 10));
  const seen = input.seenTalla3Challenges || [];

  // Filtrer les défis non résolus
  let available = PRESET_CHALLENGES.filter(c => !seen.includes(c.id));

  // Si on n'a plus assez de défis inédits, on réinitialise (on prend le pool complet)
  if (available.length < count) {
    available = PRESET_CHALLENGES;
  }

  // Mélanger puis prendre `count` éléments
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return { challenges: shuffled.slice(0, count) };
}
