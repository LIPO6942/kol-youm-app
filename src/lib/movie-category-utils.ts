import { MovieCategory, MOVIE_CATEGORIES, MOVIE_CATEGORY_CONFIG } from '@/lib/firebase/firestore';

/**
 * Prédit ou devine intelligemment la catégorie d'un film
 * à partir de ses genres TMDb, de son titre ou de son synopsis.
 */
export function guessMovieCategory(title?: string, genres?: string[], synopsis?: string): MovieCategory {
  const normTitle = (title || '').toLowerCase().trim();
  const genreList = (genres || []).map(g => (g || '').toLowerCase().trim());
  const normSynopsis = (synopsis || '').toLowerCase().trim();
  const fullText = `${normTitle} ${genreList.join(' ')} ${normSynopsis}`;

  // -------------------------------------------------------------
  // PALIER 1 : Détection prioritaire par genres officiels TMDb
  // -------------------------------------------------------------
  if (genreList.length > 0) {
    // 1. Animation (prioritaire absolu pour les animés / dessins animés)
    if (genreList.some(g => g.includes('animation') || g.includes('animé') || g.includes('anime'))) {
      return 'Animation';
    }

    // 2. Documentaire
    if (genreList.some(g => g.includes('documentaire') || g.includes('documentary'))) {
      return 'Documentaire';
    }

    // 3. Science-Fiction
    if (genreList.some(g => g.includes('science-fiction') || g.includes('science fiction') || g.includes('sci-fi'))) {
      return 'Sci-Fi';
    }

    // 4. Fantastique / Fantasy
    if (genreList.some(g => g.includes('fantastique') || g.includes('fantasy') || g.includes('fantaisie'))) {
      return 'Fantaisie';
    }

    // 5. Horreur
    if (genreList.some(g => g.includes('horreur') || g.includes('horror') || g.includes('épouvante') || g.includes('epouvante'))) {
      return 'Horreur/Thriller psy';
    }

    // 6. Autobiographie / Histoire réelle (souvent classé en Histoire/Drame sur TMDb mais caractérisé dans le synopsis)
    if (
      fullText.includes('biopic') ||
      fullText.includes('histoire vraie') ||
      fullText.includes('histoire réelle') ||
      fullText.includes('faits réels') ||
      fullText.includes("inspiré d'une histoire") ||
      fullText.includes("inspirée d'une histoire") ||
      fullText.includes("inspiré de faits") ||
      fullText.includes("inspirée de faits") ||
      fullText.includes('true story') ||
      fullText.includes('based on a true story') ||
      fullText.includes('autobiographie') ||
      fullText.includes('autobiography') ||
      fullText.includes('mémoires') ||
      fullText.includes('memoir')
    ) {
      return 'Autobiographie/Histoire réelle';
    }

    // 7. Crime / Policier / Enquête
    if (genreList.some(g => g.includes('crime') || g.includes('policier') || g.includes('mystery') || g.includes('mystère'))) {
      return 'Crime/Policier';
    }

    // 8. Thriller (TMDb tag "Thriller")
    if (genreList.some(g => g.includes('thriller'))) {
      if (genreList.some(g => g.includes('crime') || g.includes('police'))) {
        return 'Crime/Policier';
      }
      return 'Horreur/Thriller psy';
    }

    // 9. Guerre / Histoire
    if (genreList.some(g => g.includes('guerre') || g.includes('war') || g.includes('histoire') || g.includes('history'))) {
      return 'Histoire/Guerre';
    }

    // 10. Romance (si comédie romantique sans action, privilégier Romance ou Comédie)
    if (genreList.some(g => g.includes('romance') || g.includes('romantique'))) {
      return 'Romance';
    }

    // 11. Comédie
    if (genreList.some(g => g.includes('comédie') || g.includes('comedie') || g.includes('comedy'))) {
      return 'Comédie';
    }

    // 12. Action / Aventure / Western
    if (genreList.some(g => g.includes('action') || g.includes('aventure') || g.includes('adventure') || g.includes('western'))) {
      return 'Action';
    }

    // 13. Drame pur
    if (genreList.some(g => g.includes('drame') || g.includes('drama'))) {
      return 'Drame';
    }
  }

  // -------------------------------------------------------------
  // PALIER 2 : Détection textuelle (Titre + Synopsis + Mots-clés)
  // Utilisé si TMDb n'a pas encore renvoyé de genres ou pour les saisies manuelles
  // -------------------------------------------------------------
  const text = fullText;

  // 0. Documentaire
  if (
    text.includes('documentaire') ||
    text.includes('documentary') ||
    text.includes('docu') ||
    text.includes('docuseries') ||
    text.includes('docu-série') ||
    text.includes('docu-serie') ||
    text.includes('reportage') ||
    (text.includes('investigation') && (text.includes('journal') || text.includes('réel'))) ||
    text.includes('planet earth') ||
    text.includes('our planet') ||
    text.includes('national geographic') ||
    text.includes('nature documentary') ||
    text.includes('animalier')
  ) {
    return 'Documentaire';
  }

  // 1. Autobiographie / Histoire réelle
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
    text.includes('mémoires') ||
    text.includes('memoir')
  ) {
    return 'Autobiographie/Histoire réelle';
  }

  // 2. Animation
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

  // 3. Fantaisie
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
    text.includes('voyage dans le temps') ||
    text.includes('vaisseau') ||
    text.includes('galaxie') ||
    text.includes('intelligence artificielle') ||
    text.includes('cyborg') ||
    text.includes('interstellaire')
  ) {
    return 'Sci-Fi';
  }

  // 5. Crime / Policier
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

  // 6. Histoire / Guerre
  if (
    text.includes('guerre') ||
    text.includes('histoire') ||
    text.includes('historique') ||
    text.includes('war') ||
    text.includes('history') ||
    text.includes('militaire') ||
    text.includes('bataille') ||
    text.includes('soldat') ||
    text.includes('seconde guerre') ||
    text.includes('première guerre') ||
    text.includes('tranchée') ||
    text.includes('conflit armé')
  ) {
    return 'Histoire/Guerre';
  }

  // 7. Horreur / Thriller psy
  if (
    text.includes('horreur') ||
    text.includes('horror') ||
    text.includes('épouvante') ||
    text.includes('epouvante') ||
    text.includes('thriller') ||
    text.includes('slasher') ||
    text.includes('zombie') ||
    text.includes('paranormal') ||
    text.includes('démon') ||
    text.includes('demon') ||
    text.includes('exorcisme') ||
    text.includes('possession') ||
    text.includes('angoisse') ||
    text.includes('psychopathe') ||
    text.includes('hanté') ||
    text.includes('hantee')
  ) {
    return 'Horreur/Thriller psy';
  }

  // 8. Comédie
  if (
    text.includes('comédie') ||
    text.includes('comedie') ||
    text.includes('comedy') ||
    text.includes('humour') ||
    text.includes('drôle') ||
    text.includes('parodie') ||
    text.includes('sketch') ||
    text.includes('rigolo')
  ) {
    return 'Comédie';
  }

  // 9. Romance
  if (
    text.includes('romance') ||
    text.includes('romantique') ||
    text.includes('romantic') ||
    text.includes('comédie romantique') ||
    text.includes("histoire d'amour") ||
    text.includes('coup de foudre') ||
    text.includes('amour') ||
    text.includes('love')
  ) {
    return 'Romance';
  }

  // 10. Action / Aventure / Western
  if (
    text.includes('action') ||
    text.includes('aventure') ||
    text.includes('adventure') ||
    text.includes('combat') ||
    text.includes('arts martiaux') ||
    text.includes('course-poursuite') ||
    text.includes('espionnage') ||
    text.includes('super-héros') ||
    text.includes('western') ||
    text.includes('cowboy')
  ) {
    return 'Action';
  }

  // 11. Drame par défaut
  return 'Drame';
}

/**
 * Retourne la configuration visuelle (icône, couleur, bordure, gradient) d'une catégorie
 */
export function getCategoryConfig(category?: string | null) {
  const normCat = normalizeCategory(category);
  return MOVIE_CATEGORY_CONFIG[normCat];
}

export function normalizeCategory(category?: string | null): MovieCategory {
  if (!category) return 'Drame';
  if (category === 'Mind blowing' || category === 'Mind-Blow') return 'Drame';
  if ((MOVIE_CATEGORIES as readonly string[]).includes(category)) {
    return category as MovieCategory;
  }
  return 'Drame';
}


