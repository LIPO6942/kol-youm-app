import { MovieCategory, MOVIE_CATEGORIES, MOVIE_CATEGORY_CONFIG } from '@/lib/firebase/firestore';

/**
 * Prédit ou devine intelligemment la catégorie d'un film
 * à partir de ses genres TMDb, de son titre ou de son synopsis.
 */
export function guessMovieCategory(title?: string, genres?: string[], synopsis?: string): MovieCategory {
  const text = `${title || ''} ${(genres || []).join(' ')} ${synopsis || ''}`.toLowerCase();

  // 1. Autobiographie / Histoire réelle (biopic, faits réels, autobiographie, documentaire...)
  if (
    text.includes('autobiographie') ||
    text.includes('autobiography') ||
    text.includes('biographie') ||
    text.includes('biography') ||
    text.includes('biopic') ||
    text.includes('histoire réelle') ||
    text.includes('histoire vraie') ||
    text.includes('faits réels') ||
    text.includes("inspiré d'une histoire") ||
    text.includes("inspirée d'une histoire") ||
    text.includes("inspiré de faits") ||
    text.includes("inspirée de faits") ||
    text.includes("tiré d'une histoire") ||
    text.includes("tirée d'une histoire") ||
    text.includes("d'après une histoire") ||
    text.includes('true story') ||
    text.includes('based on a true story') ||
    text.includes('based on true') ||
    text.includes('documentaire') ||
    text.includes('documentary') ||
    text.includes('mémoires') ||
    text.includes('memoir')
  ) {
    return 'Autobiographie/Histoire réelle';
  }

  // 2. Animation (Prioritaire pour tous les films d'animation, anime, Pixar, Disney, etc.)
  if (
    text.includes('animation') ||
    text.includes('animé') ||
    text.includes('anime') ||
    text.includes('dessin animé') ||
    text.includes('cartoon') ||
    text.includes('pixar') ||
    text.includes('disney') ||
    text.includes('ghibli') ||
    text.includes('dreamworks') ||
    text.includes('illumination') ||
    text.includes('manga')
  ) {
    return 'Animation';
  }

  // 3. Fantaisie (Fantasy, fantastique, magie, sorciers, dragons, mythologie...)
  if (
    text.includes('fantaisie') ||
    text.includes('fantasy') ||
    text.includes('fantastique') ||
    text.includes('magie') ||
    text.includes('magique') ||
    text.includes('magic') ||
    text.includes('sorcier') ||
    text.includes('sorcière') ||
    text.includes('sorcellerie') ||
    text.includes('wizard') ||
    text.includes('witch') ||
    text.includes('dragon') ||
    text.includes('elfe') ||
    text.includes('elf') ||
    text.includes('seigneur des anneaux') ||
    text.includes('harry potter') ||
    text.includes('hobbit') ||
    text.includes('narnia') ||
    text.includes('percy jackson') ||
    text.includes('mythologie') ||
    text.includes('mythologique') ||
    text.includes('fée') ||
    text.includes('fairy') ||
    text.includes('royaume magique') ||
    text.includes('enchanté') ||
    text.includes('enchantee') ||
    text.includes('créature magique')
  ) {
    return 'Fantaisie';
  }

  // 4. Sci-Fi
  if (

    text.includes('science-fiction') ||
    text.includes('science fiction') ||
    text.includes('sci-fi') ||
    text.includes('espace') ||
    text.includes('extraterrestre') ||
    text.includes('alien') ||
    text.includes('futur') ||
    text.includes('cyberpunk') ||
    text.includes('voyage dans le temps')
  ) {
    return 'Sci-Fi';
  }

  // 4. Crime / Policier
  if (
    text.includes('crime') ||
    text.includes('criminel') ||
    text.includes('policier') ||
    text.includes('police') ||
    text.includes('flic') ||
    text.includes('détective') ||
    text.includes('detective') ||
    text.includes('enquête') ||
    text.includes('enquete') ||
    text.includes('investigation') ||
    text.includes('gangster') ||
    text.includes('mafia') ||
    text.includes('parrain') ||
    text.includes('godfather') ||
    text.includes('cartel') ||
    text.includes('narco') ||
    text.includes('braquage') ||
    text.includes('heist') ||
    text.includes('meurtre') ||
    text.includes('murder') ||
    text.includes('homicide') ||
    text.includes('assassinat') ||
    text.includes('tueur en série') ||
    text.includes('serial killer') ||
    text.includes('polar') ||
    text.includes('film noir') ||
    text.includes('procureur') ||
    text.includes('sherlock') ||
    text.includes('cambriolage') ||
    text.includes('robbery')
  ) {
    return 'Crime/Policier';
  }

  // 5. Mind blowing
  if (
    text.includes('mind blowing') ||
    text.includes('mindfuck') ||
    text.includes('plot twist') ||
    text.includes('psychologique') ||
    text.includes('twist') ||
    text.includes('mystère') ||
    text.includes('thriller') ||
    text.includes('suspense') ||
    text.includes('illusion')
  ) {
    return 'Mind blowing';
  }

  // 4. Histoire / Guerre
  if (
    text.includes('guerre') ||
    text.includes('histoire') ||
    text.includes('historique') ||
    text.includes('war') ||
    text.includes('history') ||
    text.includes('militaire') ||
    text.includes('bataille') ||
    text.includes('soldat') ||
    text.includes('seconde guerre')
  ) {
    return 'Histoire/Guerre';
  }

  // 5. Comédie
  if (
    text.includes('comédie') ||
    text.includes('comedie') ||
    text.includes('comedy') ||
    text.includes('humour') ||
    text.includes('drôle') ||
    text.includes('parodie')
  ) {
    return 'Comédie';
  }

  // 6. Horreur / Thriller psy
  if (
    text.includes('horreur') ||
    text.includes('horror') ||
    text.includes('épouvante') ||
    text.includes('epouvante') ||
    text.includes('thriller psychologique') ||
    text.includes('thriller psy') ||
    text.includes('psychological thriller') ||
    text.includes('slasher') ||
    text.includes('zombie') ||
    text.includes('paranormal') ||
    text.includes('démon') ||
    text.includes('demon') ||
    text.includes('exorcisme') ||
    text.includes('possession') ||
    text.includes('angoisse')
  ) {
    return 'Horreur/Thriller psy';
  }

  // 7. Romance
  if (
    text.includes('romance') ||
    text.includes('romantique') ||
    text.includes('romantic') ||
    text.includes('comédie romantique') ||
    text.includes('histoire d\'amour') ||
    text.includes('coup de foudre') ||
    text.includes('amour') ||
    text.includes('love')
  ) {
    return 'Romance';
  }

  // 8. Action
  if (
    text.includes('action') ||
    text.includes('aventure') ||
    text.includes('adventure') ||
    text.includes('combat') ||
    text.includes('arts martiaux') ||
    text.includes('course-poursuite') ||
    text.includes('espionnage') ||
    text.includes('super-héros')
  ) {
    return 'Action';
  }

  // 10. Drame par défaut ou si mots clés dramatiques
  return 'Drame';
}

/**
 * Retourne la configuration visuelle (icône, couleur, bordure, gradient) d'une catégorie
 */
export function getCategoryConfig(category?: string | null) {
  if (category && (MOVIE_CATEGORIES as readonly string[]).includes(category)) {
    return MOVIE_CATEGORY_CONFIG[category as MovieCategory];
  }
  return {
    label: category || 'Général',
    shortLabel: category || 'Général',
    emoji: '🎬',
    color: 'text-slate-300',
    badgeBg: 'bg-white/10 text-slate-200 border-white/15',
    border: 'border-white/20',
    glow: 'shadow-[0_0_8px_rgba(255,255,255,0.1)]',
    gradient: 'from-white/10 to-white/5',
  };
}
