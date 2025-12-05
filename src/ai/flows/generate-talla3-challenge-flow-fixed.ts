'use server';

/**
 * Fallback (sans IA) pour générer des défis Talla3.
 * Retourne une liste de défis pré-validés et variés.
 */

import type { GenerateTalla3ChallengeInput, GenerateTalla3ChallengeOutput, Talla3Challenge } from './generate-talla3-challenge-flow.types';

const PRESET_CHALLENGES: Talla3Challenge[] = [
  {
    id: 'hist-chron-1',
    title: "Classez ces inventions de la plus ancienne à la plus récente :",
    items: [
      { item: "Invention de l'imprimerie", detail: '1454' },
      { item: "Découverte de l'électricité (expériences de Franklin)", detail: '1752' },
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
      { item: 'Renaissance', detail: 'XIVe–XVIe' },
      { item: 'Baroque', detail: 'XVIIe' },
      { item: 'Impressionnisme', detail: 'XIXe' },
      { item: 'Surréalisme', detail: 'XXe' }
    ],
    category: 'Art'
  },
];

export async function generateTalla3Challenges(input: GenerateTalla3ChallengeInput): Promise<GenerateTalla3ChallengeOutput> {
  const count = Math.max(1, Math.min(input.count ?? 5, 10));
  // Mélanger puis prendre `count` éléments
  const shuffled = [...PRESET_CHALLENGES].sort(() => Math.random() - 0.5);
  return { challenges: shuffled.slice(0, count) };
}
