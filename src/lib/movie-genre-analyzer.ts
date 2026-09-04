export type MovieGenreBreakdown = {
  name: string;
  count: number;
  emoji: string;
};

export type MonthlyMovieTasteAnalysis = {
  headline: string;
  commentary: string;
  dominantMood: string;
  moodEmoji: string;
  moodColor: string; // Tailwind/hex gradient reference
  breakdown: MovieGenreBreakdown[];
  totalMoviesAnalyzed: number;
};

// Mots-clés pour détection sémantique lorsque les genres TMDb ne sont pas tous renseignés
const GENRE_KEYWORDS: Record<string, { label: string; emoji: string; keywords: string[] }> = {
  psychological: {
    label: 'films psychologiques',
    emoji: '🧠',
    keywords: ['psychologique', 'psychological', 'mind', 'brain', 'puzzle', 'obsession', 'mental', 'shutter', 'inception', 'fight club', 'memento', 'black swan', 'requiem', 'vertigo']
  },
  thriller: {
    label: 'thrillers',
    emoji: '🔍',
    keywords: ['thriller', 'suspense', 'mystère', 'mystery', 'crime', 'enquête', 'polar', 'se7en', 'detective', 'fargo', 'zodiac']
  },
  scifi: {
    label: 'films de science-fiction',
    emoji: '🚀',
    keywords: ['science-fiction', 'sci-fi', 'science fiction', 'futur', 'space', 'espace', 'alien', 'interstellar', 'matrix', 'dune', 'blade runner', 'avatar']
  },
  comedy: {
    label: 'comédies',
    emoji: '😂',
    keywords: ['comédie', 'comedy', 'humour', 'animation', 'rire', 'parodie', 'stand-up', 'rom-com']
  },
  action: {
    label: "films d'action",
    emoji: '💥',
    keywords: ['action', 'aventure', 'adventure', 'combat', 'guerre', 'war', 'western', 'art martial', 'mission', 'wick', 'fast', 'die hard']
  },
  drama: {
    label: 'drames',
    emoji: '🎭',
    keywords: ['drame', 'drama', 'romance', 'tragédie', 'émotion', 'mélodrame', 'social', 'amour', 'heartbreak']
  },
  horror: {
    label: "films d'horreur",
    emoji: '👻',
    keywords: ['horreur', 'horror', 'épouvante', 'peur', 'slasher', 'fantôme', 'possession', 'conjuring', 'scream', 'saw']
  },
  documentary: {
    label: 'documentaires & histoire',
    emoji: '📜',
    keywords: ['documentaire', 'documentary', 'histoire', 'history', 'biographie', 'biopic', 'réel', 'nature', 'politique']
  }
};

/**
 * Analyse les goûts et tendances cinématographiques du mois
 * pour formuler un message percutant et personnalisé dans le Wrap-Up.
 */
export function analyzeMonthlyMovieTastes(
  movies: { title: string; genres?: string[] }[]
): MonthlyMovieTasteAnalysis | null {
  if (!movies || movies.length === 0) return null;

  const counts: Record<string, number> = {
    psychological: 0,
    thriller: 0,
    scifi: 0,
    comedy: 0,
    action: 0,
    drama: 0,
    horror: 0,
    documentary: 0,
  };

  movies.forEach(m => {
    const titleLower = m.title.toLowerCase();
    const genresLower = (m.genres || []).map(g => g.toLowerCase());
    const fullText = `${titleLower} ${genresLower.join(' ')}`;

    let matched = false;

    // 1. Détection psychologique en priorité
    if (
      genresLower.some(g => g.includes('psychol') || g.includes('mystèr') || g.includes('mind')) ||
      GENRE_KEYWORDS.psychological.keywords.some(kw => fullText.includes(kw))
    ) {
      counts.psychological++;
      matched = true;
    }

    // 2. Détection Thriller / Crime
    if (
      genresLower.some(g => g.includes('thriller') || g.includes('crime') || g.includes('suspense')) ||
      GENRE_KEYWORDS.thriller.keywords.some(kw => fullText.includes(kw))
    ) {
      counts.thriller++;
      matched = true;
    }

    // 3. Sci-Fi
    if (
      genresLower.some(g => g.includes('science') || g.includes('fiction') || g.includes('sci-fi')) ||
      GENRE_KEYWORDS.scifi.keywords.some(kw => fullText.includes(kw))
    ) {
      counts.scifi++;
      matched = true;
    }

    // 4. Comédie / Animation
    if (
      genresLower.some(g => g.includes('coméd') || g.includes('comedy') || g.includes('animation') || g.includes('familial')) ||
      GENRE_KEYWORDS.comedy.keywords.some(kw => fullText.includes(kw))
    ) {
      counts.comedy++;
      matched = true;
    }

    // 5. Action / Aventure
    if (
      genresLower.some(g => g.includes('action') || g.includes('aventure') || g.includes('adventure') || g.includes('guerre')) ||
      GENRE_KEYWORDS.action.keywords.some(kw => fullText.includes(kw))
    ) {
      counts.action++;
      matched = true;
    }

    // 6. Horreur
    if (
      genresLower.some(g => g.includes('horreur') || g.includes('horror')) ||
      GENRE_KEYWORDS.horror.keywords.some(kw => fullText.includes(kw))
    ) {
      counts.horror++;
      matched = true;
    }

    // 7. Drame
    if (
      genresLower.some(g => g.includes('drame') || g.includes('drama') || g.includes('romance')) ||
      GENRE_KEYWORDS.drama.keywords.some(kw => fullText.includes(kw))
    ) {
      counts.drama++;
      matched = true;
    }

    // Fallback si non apparié: Drame par défaut pour film d'auteur/inconnu
    if (!matched) {
      counts.drama++;
    }
  });

  // Construction du breakdown
  const breakdown: MovieGenreBreakdown[] = Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .map(([key, count]) => ({
      name: GENRE_KEYWORDS[key].label,
      count,
      emoji: GENRE_KEYWORDS[key].emoji,
    }))
    .sort((a, b) => b.count - a.count);

  const topCategoryKey = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const topCount = counts[topCategoryKey];

  // Synthèse des détails textuels : ex "(4 films psychologiques, 2 thrillers...)"
  const detailString = breakdown
    .slice(0, 3)
    .map(b => `${b.count} ${b.name}`)
    .join(', ');

  let headline = "Un mois de cinéma éclectique !";
  let commentary = `Ce mois-ci, tes séances étaient riches et variées (${detailString}).`;
  let dominantMood = "Éclectique";
  let moodEmoji = "🍿";
  let moodColor = "from-blue-600 via-indigo-600 to-purple-600";

  // Thématique Réflexion & Psychologique / Thriller
  if (counts.psychological > 0 || (counts.thriller >= 2 && counts.thriller >= topCount - 1)) {
    const totalReflexion = counts.psychological + counts.thriller;
    if (totalReflexion >= Math.max(2, Math.floor(movies.length * 0.4))) {
      headline = "Besoin de faire fumer le cerveau 🧠";
      commentary = `Ce mois-ci, tu as clairement eu besoin de réfléchir (${detailString}).`;
      dominantMood = "Psychologique & Intrigant";
      moodEmoji = "🧠";
      moodColor = "from-indigo-600 via-purple-700 to-slate-900";
    }
  }

  // Thématique Comédie / Détente
  if (topCategoryKey === 'comedy' && topCount >= Math.max(2, Math.floor(movies.length * 0.4))) {
    headline = "Cure de bonne humeur 😂";
    commentary = `Ce mois-ci était placé sous le signe du rire et de la déconnexion (${detailString}).`;
    dominantMood = "Léger & Positif";
    moodEmoji = "😂";
    moodColor = "from-amber-500 via-orange-600 to-yellow-600";
  }

  // Thématique Sci-Fi / Futuriste
  if (topCategoryKey === 'scifi' && topCount >= Math.max(2, Math.floor(movies.length * 0.35))) {
    headline = "Cap sur le futur & l'imaginaire 🚀";
    commentary = `Besoin d'évasion intersidérale ce mois-ci (${detailString}) !`;
    dominantMood = "Futuriste & Cosmique";
    moodEmoji = "🚀";
    moodColor = "from-cyan-600 via-blue-700 to-indigo-900";
  }

  // Thématique Action / Frissons
  if (topCategoryKey === 'action' && topCount >= Math.max(2, Math.floor(movies.length * 0.4))) {
    headline = "Plein d'adrénaline pure 💥";
    commentary = `Pas le temps de t'ennuyer ce mois-ci, c'était du 100 à l'heure (${detailString}) !`;
    dominantMood = "Intense & Rythmé";
    moodEmoji = "⚡";
    moodColor = "from-red-600 via-rose-700 to-amber-700";
  }

  // Thématique Drame / Grandes Émotions
  if (topCategoryKey === 'drama' && topCount >= Math.max(2, Math.floor(movies.length * 0.45))) {
    headline = "Des émotions à vif 🎭";
    commentary = `Des histoires touchantes et profondes qui ont marqué ton mois (${detailString}).`;
    dominantMood = "Profond & Sensible";
    moodEmoji = "🎭";
    moodColor = "from-violet-600 via-purple-800 to-slate-900";
  }

  // Thématique Horreur
  if (topCategoryKey === 'horror' && topCount >= 2) {
    headline = "Ambiance frissons garantis 👻";
    commentary = `Les lumières sont restées allumées ce mois-ci (${detailString}) !`;
    dominantMood = "Frissons & Suspense";
    moodEmoji = "👻";
    moodColor = "from-purple-900 via-zinc-900 to-black";
  }

  return {
    headline,
    commentary,
    dominantMood,
    moodEmoji,
    moodColor,
    breakdown,
    totalMoviesAnalyzed: movies.length,
  };
}
