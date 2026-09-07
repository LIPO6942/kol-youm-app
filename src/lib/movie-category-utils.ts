import { MovieCategory, MOVIE_CATEGORIES, MOVIE_CATEGORY_CONFIG } from '@/lib/firebase/firestore';

/**
 * Prédit ou devine intelligemment la catégorie d'un film
 * à partir de ses genres TMDb, de son titre ou de son synopsis.
 */
export function guessMovieCategory(title?: string, genres?: string[], synopsis?: string): MovieCategory {
  const text = `${title || ''} ${(genres || []).join(' ')} ${synopsis || ''}`.toLowerCase();

  // 1. Sci-Fi
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

  // 2. Mind blowing
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

  // 3. Histoire / Guerre
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

  // 4. Comédie
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

  // 5. Action
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

  // 6. Drame par défaut ou si mots clés dramatiques
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
    emoji: '🎬',
    color: 'text-slate-300',
    badgeBg: 'bg-white/10 text-slate-200 border-white/15',
    border: 'border-white/20',
  };
}
