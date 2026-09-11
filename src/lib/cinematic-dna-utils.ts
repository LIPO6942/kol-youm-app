import { MovieCategory, MOVIE_CATEGORIES, MOVIE_CATEGORY_CONFIG, isTestMovieTitle, UserProfile, MonthlyMovieRanking } from '@/lib/firebase/firestore';
import { guessMovieCategory } from '@/lib/movie-category-utils';

export interface CategoryDnaScore {
  category: MovieCategory;
  points: number;
  percentage: number; // e.g. 38 for 38%
  rank: number; // 1 = dominant, 2 = second...
  movieCount: number;
  topMovieTitle?: string;
  topMoviePosterUrl?: string;
  topMovieYear?: number;
}

export interface CinephileArchetype {
  id: string;
  title: string;
  badge: string;
  tagline: string;
  description: string;
  gradient: string;
  primaryCategory: MovieCategory;
  secondaryCategory?: MovieCategory;
}

export interface CinematicDnaResult {
  scores: CategoryDnaScore[];
  archetype: CinephileArchetype;
  dominantGene: CategoryDnaScore | null;
  secondaryGene: CategoryDnaScore | null;
  tertiaryGene: CategoryDnaScore | null;
  totalRankedMovies: number;
  totalPoints: number;
  eclecticismIndex: number; // 0 to 100%
  hasRankings: boolean;
  periodLabel: string;
}

// Matrice créative d'archétypes cinéphiles par duo de genres dominants
const ARCHETYPE_RULES: Array<{
  match: (c1: MovieCategory, c2?: MovieCategory) => boolean;
  archetype: (c1: MovieCategory, c2?: MovieCategory) => CinephileArchetype;
}> = [
  {
    match: (c1, c2) => (c1 === 'Sci-Fi' && c2 === 'Action') || (c1 === 'Action' && c2 === 'Sci-Fi'),
    archetype: (c1, c2) => ({
      id: 'pionnier-adrenaline',
      title: "Le Pionnier d'Adrénaline",
      badge: "🚀💥 Sci-Fi & Action",
      tagline: "Explorateur intrépide des horizons futuristes et des scènes d'anthologie.",
      description: "Vous vibrez pour les technologies de pointe, les odyssées spatiales et le grand spectacle où chaque seconde compte. Votre cinéma idéal allie vision d'avenir et décharges d'adrénaline pure.",
      gradient: "from-cyan-500 via-blue-600 to-rose-600",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Sci-Fi' && c2 === 'Mind blowing') || (c1 === 'Mind blowing' && c2 === 'Sci-Fi'),
    archetype: (c1, c2) => ({
      id: 'maitre-multivers',
      title: "Le Maître du Multivers",
      badge: "🚀🤯 Sci-Fi & Mind blowing",
      tagline: "Esprit analytique fasciné par les vertiges métaphysiques et les énigmes temporelles.",
      description: "Vous aimez quand un film retourne vos certitudes et joue avec les lois de la physique. Inception, Interstellar ou Matrix sont votre oxygène : plus c'est complexe et grandiose, plus vous adorez.",
      gradient: "from-cyan-400 via-purple-600 to-violet-800",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Sci-Fi' && c2 === 'Fantaisie') || (c1 === 'Fantaisie' && c2 === 'Sci-Fi'),
    archetype: (c1, c2) => ({
      id: 'architecte-mondes',
      title: "L'Architecte des Mondes",
      badge: "🧙‍♂️🚀 Fantaisie & Sci-Fi",
      tagline: "Bâtisseur d'univers sans frontières, de la magie ancestrale aux confins du cosmos.",
      description: "Votre imaginaire refuse les limites du réel. Qu'il s'agisse de galaxies lointaines ou de royaumes enchantés, vous cherchez l'émerveillement total et le sentiment sublime de l'inconnu.",
      gradient: "from-fuchsia-500 via-purple-600 to-cyan-500",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Action' && c2 === 'Crime/Policier') || (c1 === 'Crime/Policier' && c2 === 'Action'),
    archetype: (c1, c2) => ({
      id: 'justicier-nocturne',
      title: "Le Justicier Nocturne",
      badge: "💥🕵️‍♂️ Action & Polar",
      tagline: "Traqueur de l'ombre passionné par les règlements de comptes et les braquages parfaits.",
      description: "L'asphalte mouillé, les poursuites sous tension et les complots urbains n'ont aucun secret pour vous. Vous admirez les personnages taiseux mais redoutables prêts à tout pour leur code d'honneur.",
      gradient: "from-red-600 via-indigo-600 to-blue-700",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Drame' && c2 === 'Histoire/Guerre') || (c1 === 'Histoire/Guerre' && c2 === 'Drame'),
    archetype: (c1, c2) => ({
      id: 'gardien-memoire',
      title: "Le Gardien de la Mémoire",
      badge: "🎭⚔️ Drame & Histoire",
      tagline: "Sensible aux grandes tragédies humaines et aux leçons bouleversantes du passé.",
      description: "Le cinéma est pour vous une fenêtre sacrée sur notre Histoire et sur la condition humaine. Vous privilégiez l'authenticité émotionnelle, le souffle des destins brisés et la grandeur des combats d'hier.",
      gradient: "from-orange-500 via-amber-600 to-rose-700",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Fantaisie' && c2 === 'Animation') || (c1 === 'Animation' && c2 === 'Fantaisie'),
    archetype: (c1, c2) => ({
      id: 'faiseur-imaginaires',
      title: "Le Bâtisseur d'Imaginaires",
      badge: "🧙‍♂️🎨 Fantaisie & Animation",
      tagline: "Âme poétique émerveillée par la splendeur visuelle et les contes intemporels.",
      description: "Vous célébrez le cinéma comme l'art de l'illusion suprême. De Ghibli aux légendes médiévales, votre cœur palpite pour la pureté créative, les créatures fantastiques et l'émerveillement absolu.",
      gradient: "from-fuchsia-500 via-pink-500 to-sky-400",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Horreur/Thriller psy' && c2 === 'Mind blowing') || (c1 === 'Mind blowing' && c2 === 'Horreur/Thriller psy'),
    archetype: (c1, c2) => ({
      id: 'chasseur-frissons',
      title: "Le Chasseur de Frissons",
      badge: "👻🤯 Frissons & Mental",
      tagline: "Explorateur des zones d'ombre de l'esprit humain et des tensions irrespirables.",
      description: "Vous cherchez l'inconfort stimulant, les ambiances anxiogènes et les récits qui hantent vos pensées plusieurs jours après le générique. Vous n'avez pas peur du noir, vous en comprenez les secrets.",
      gradient: "from-violet-700 via-purple-900 to-black",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Comédie' && c2 === 'Romance') || (c1 === 'Romance' && c2 === 'Comédie'),
    archetype: (c1, c2) => ({
      id: 'eternel-optimiste',
      title: "L'Éternel Optimiste",
      badge: "😂💖 Comédie & Romance",
      tagline: "Adepte de la chaleur humaine, des répliques cultes et des coups de foudre mémorables.",
      description: "Pour vous, une séance de cinéma réussie laisse le cœur léger et le sourire aux lèvres. Vous croyez à la magie des rencontres impromptues et au pouvoir salvateur du rire.",
      gradient: "from-amber-400 via-pink-500 to-rose-500",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Drame' && c2 === 'Romance') || (c1 === 'Romance' && c2 === 'Drame'),
    archetype: (c1, c2) => ({
      id: 'coeur-passionne',
      title: "Le Cœur Passionné",
      badge: "🎭💖 Drame & Romance",
      tagline: "Vibrations romantiques intenses, passions dévorantes et dilemmes déchirants.",
      description: "Vous recherchez les histoires d'amour bouleversantes où l'intensité des sentiments transcende toutes les épreuves. Les relations complexes et les sacrifices sincères vous émeuvent profondément.",
      gradient: "from-pink-500 via-rose-500 to-red-600",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Crime/Policier' && c2 === 'Mind blowing') || (c1 === 'Mind blowing' && c2 === 'Crime/Policier'),
    archetype: (c1, c2) => ({
      id: 'enqueteur-cerebral',
      title: "L'Enquêteur Cérébral",
      badge: "🕵️‍♂️🤯 Polar & Mind blowing",
      tagline: "Décodeur d'indices retors, de faux-semblants et de machinations diaboliques.",
      description: "Chaque projection est une partie d'échecs où vous essayez d'anticiper le twist avant tout le monde. Fincher, Nolan ou Hitchcock composent votre panthéon de virtuoses de la manipulation narrative.",
      gradient: "from-blue-600 via-purple-600 to-indigo-900",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Drame' && c2 === 'Autobiographie/Histoire réelle') || (c1 === 'Autobiographie/Histoire réelle' && c2 === 'Drame'),
    archetype: (c1, c2) => ({
      id: 'chroniqueur-destins',
      title: "Le Chroniqueur de Destins",
      badge: "📖🎭 Biopic & Réel",
      tagline: "Fasciné par les trajectoires hors-normes et la complexité des figures réelles.",
      description: "Rien ne surpasse à vos yeux la force brute de la réalité. Vous admirez les parcours inspirants, les luttes intérieures poignantes et la vérité humaine mise à nu avec maestria.",
      gradient: "from-emerald-500 via-teal-600 to-rose-600",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
  {
    match: (c1, c2) => (c1 === 'Animation' && c2 === 'Comédie') || (c1 === 'Comédie' && c2 === 'Animation'),
    archetype: (c1, c2) => ({
      id: 'ame-lumineuse',
      title: "L'Âme Lumineuse",
      badge: "🎨😂 Animation & Humour",
      tagline: "Gardien de la bonne humeur, du trait d'esprit inventif et du plaisir partagé.",
      description: "Vous aimez la vivacité, le rythme effréné et la liberté absolue de l'animation comique. Votre cinéma respire l'énergie communicative et le charme irrésistible de l'insouciance.",
      gradient: "from-amber-400 via-yellow-400 to-sky-400",
      primaryCategory: c1,
      secondaryCategory: c2,
    }),
  },
];

// Archétypes génériques par genre dominant unique
const SINGLE_GENRE_ARCHETYPES: Record<MovieCategory, { title: string; badge: string; tagline: string; description: string; gradient: string }> = {
  'Sci-Fi': {
    title: "Le Visionnaire Stellaire",
    badge: "🚀 Spécialiste Sci-Fi",
    tagline: "Attiré par l'avenir, la technologie et les mystères du cosmos.",
    description: "Votre regard est résolument tourné vers demain. Vous cherchez dans le 7ème art l'extension de notre conscience et l'exploration de mondes inouïs.",
    gradient: "from-cyan-500 via-blue-600 to-indigo-900",
  },
  'Action': {
    title: "L'As de l'Adrénaline",
    badge: "💥 Spécialiste Action",
    tagline: "Gourmand d'intensité viscérale, de bravoure et de scènes mémorables.",
    description: "Le cinéma est pour vous une onde de choc physique. Vous valorisez le dynamisme sans temps mort, le courage héroïque et la chorégraphie du mouvement.",
    gradient: "from-red-500 via-orange-600 to-rose-700",
  },
  'Drame': {
    title: "L'Humaniste Émotif",
    badge: "🎭 Spécialiste Drame",
    tagline: "En quête d'émotions sincères, de justesse psychologique et de vérité.",
    description: "Les relations humaines, leurs failles et leurs beautés secrètes constituent le sel de votre cinéphilie. Vous privilégiez l'authenticité et la résonance du jeu d'acteur.",
    gradient: "from-rose-500 via-pink-600 to-purple-800",
  },
  'Comédie': {
    title: "Le Virtuose du Rire",
    badge: "😂 Spécialiste Comédie",
    tagline: "Champion de la légèreté spirituelle, des dialogues ciselés et de la dérision.",
    description: "Rire est pour vous le plus bel hommage à l'existence. Vous appréciez l'intelligence comique sous toutes ses formes, du burlesque au comique de situation.",
    gradient: "from-amber-400 via-yellow-500 to-orange-500",
  },
  'Mind blowing': {
    title: "L'Architecte des Énigmes",
    badge: "🤯 Spécialiste Mind blowing",
    tagline: "Amateur de vertiges narratifs, de manipulations brillantes et de faux-semblants.",
    description: "Vous aimez être défié intellectuellement par un scénario d'orfèvre. Pour vous, un grand film doit laisser des questions ouvertes et redéfinir la réalité.",
    gradient: "from-purple-500 via-violet-600 to-indigo-800",
  },
  'Fantaisie': {
    title: "Le Tisseur de Légendes",
    badge: "🧙‍♂️ Spécialiste Fantaisie",
    tagline: "Gardien des contes envoûtants, des créatures mythologiques et de la magie.",
    description: "L'extraordinaire est votre refuge naturel. Vous aimez les épopées chevaleresques, les sortilèges héroïques et la grandeur poétique des univers légendaires.",
    gradient: "from-fuchsia-500 via-purple-600 to-indigo-800",
  },
  'Crime/Policier': {
    title: "Le Limier Infaillible",
    badge: "🕵️‍♂️ Spécialiste Polar",
    tagline: "Passionné d'enquêtes au cordeau, de psychologie criminelle et de justice.",
    description: "Les atmosphères sombres, les dilemmes moraux et les arcanes de la justice captivent votre esprit. Vous adorez remonter le fil des mobiles et des non-dits.",
    gradient: "from-blue-600 via-slate-800 to-indigo-950",
  },
  'Horreur/Thriller psy': {
    title: "Le Maître de l'Angoisse",
    badge: "👻 Spécialiste Thriller & Horreur",
    tagline: "Fasciné par le suspense suffocant, la peur maîtrisée et le macabre.",
    description: "Vous cherchez la montée d'angoisse viscérale et l'adrénaline de la tension pure. Vous appréciez l'art de susciter le frisson sans jamais tomber dans la gratuité.",
    gradient: "from-violet-600 via-purple-900 to-black",
  },
  'Animation': {
    title: "L'Artiste de l'Illusion",
    badge: "🎨 Spécialiste Animation",
    tagline: "Amoureux de la virtuosité graphique, de l'expressivité et du trait.",
    description: "Pour vous, l'animation est le média roi du cinéma, capable d'exprimer des idées et des émotions inaccessibles à la prise de vue réelle.",
    gradient: "from-sky-400 via-blue-500 to-indigo-600",
  },
  'Histoire/Guerre': {
    title: "L'Historien Épique",
    badge: "⚔️ Spécialiste Histoire",
    tagline: "Témoin passionné des grandes batailles, des empires et du temps jadis.",
    description: "Vous aimez voir revivre les époques révolues avec une reconstitution soignée et une ampleur dramatique digne des plus grands exploits humains.",
    gradient: "from-orange-500 via-amber-600 to-stone-800",
  },
  'Autobiographie/Histoire réelle': {
    title: "Le Biographe Passionné",
    badge: "📖 Spécialiste Réel",
    tagline: "Explorateur des destins véridiques et des témoignages authentiques.",
    description: "La vérité humaine dans sa sincérité brute vous captive. Vous êtes admiratif des hommes et des femmes qui ont marqué l'Histoire par leur courage ou leur singularité.",
    gradient: "from-emerald-500 via-teal-600 to-slate-800",
  },
  'Romance': {
    title: "Le Romantique Éperdu",
    badge: "💖 Spécialiste Romance",
    tagline: "Sensible aux élans du cœur, à l'alchimie des âmes et aux sentiments purs.",
    description: "L'amour sous toutes ses formes guide vos choix cinématographiques. Vous croyez à la force irrésistible des regards et aux histoires qui réchauffent l'âme.",
    gradient: "from-pink-500 via-rose-600 to-red-600",
  },
};

/**
 * Détermine l'archétype cinéphile en fonction du gène dominant et secondaire.
 */
export function getCinephileArchetype(
  dominant?: MovieCategory,
  secondary?: MovieCategory
): CinephileArchetype {
  if (!dominant) {
    return {
      id: 'cinephile-mysterieux',
      title: "Le Cinéphile Émergent",
      badge: "🎬 Découverte",
      tagline: "Votre génome cinématographique est en pleine formation.",
      description: "Réalisez vos premiers duels pour révéler votre véritable identité cinéphile et voir s'épanouir vos gènes dominants !",
      gradient: "from-slate-700 via-slate-800 to-slate-900",
      primaryCategory: 'Drame',
    };
  }

  // Vérifier les règles de duo
  if (secondary && dominant !== secondary) {
    const matched = ARCHETYPE_RULES.find(r => r.match(dominant, secondary));
    if (matched) {
      return matched.archetype(dominant, secondary);
    }
  }

  // Fallback sur le genre dominant seul
  const single = SINGLE_GENRE_ARCHETYPES[dominant] || SINGLE_GENRE_ARCHETYPES['Drame'];
  return {
    id: `specialiste-${dominant.toLowerCase()}`,
    title: single.title,
    badge: single.badge,
    tagline: single.tagline,
    description: single.description,
    gradient: single.gradient,
    primaryCategory: dominant,
    secondaryCategory: secondary,
  };
}

/**
 * Calcule l'indice d'éclectisme cinéphile (0% = focalisé sur un seul genre, 100% = éclectique total).
 */
export function calculateEclecticismIndex(scores: CategoryDnaScore[]): number {
  const activeCategories = scores.filter(s => s.percentage > 0);
  if (activeCategories.length <= 1) return 10;

  // Calcul basé sur l'entropie de Shannon normalisée
  const n = MOVIE_CATEGORIES.length;
  let entropy = 0;
  activeCategories.forEach(s => {
    const p = s.percentage / 100;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  });

  const maxEntropy = Math.log2(n);
  const normalized = Math.min(100, Math.round((entropy / maxEntropy) * 100));
  return Math.max(15, normalized);
}

/**
 * Calcule l'ADN Cinématographique complet de l'utilisateur.
 * Prend en compte le classement général de chaque mois (userProfile.movieRankings).
 * Chaque film classé reçoit un poids quadratique selon son rang dans le duel.
 */
export function calculateCinematicDna(
  userProfile: UserProfile | null | undefined,
  options?: { monthKey?: string }
): CinematicDnaResult {
  const periodLabel = options?.monthKey ? `Mois : ${options.monthKey}` : "Tous les temps";

  // Initialisation de la map de scores par catégorie
  const pointsMap: Record<MovieCategory, number> = {} as any;
  const countMap: Record<MovieCategory, number> = {} as any;
  const topMovieMap: Record<MovieCategory, { title: string; rankScore: number; posterUrl?: string; year?: number }> = {} as any;

  MOVIE_CATEGORIES.forEach(cat => {
    pointsMap[cat] = 0;
    countMap[cat] = 0;
  });

  // Map de métadonnées pour résoudre rapidement affiches et années
  const metadataMap = new Map<string, { posterUrl?: string; year?: number; category?: MovieCategory; genres?: string[] }>();
  (userProfile?.seenMoviesData || []).forEach(m => {
    if (m?.title) {
      const norm = m.title.toLowerCase().trim();
      metadataMap.set(norm, {
        posterUrl: m.posterUrl,
        year: m.year,
        category: m.category,
        genres: m.genres,
      });
    }
  });

  // Déterminer la catégorie d'un film
  const resolveCategory = (title: string): MovieCategory => {
    const norm = title.toLowerCase().trim();
    const meta = metadataMap.get(norm);
    if (meta?.category && (MOVIE_CATEGORIES as readonly string[]).includes(meta.category)) {
      return meta.category;
    }
    const manualCat = (userProfile?.movieCategories || {})[norm];
    if (manualCat && (MOVIE_CATEGORIES as readonly string[]).includes(manualCat)) {
      return manualCat;
    }
    return guessMovieCategory(title, meta?.genres);
  };

  let totalRankedMoviesCount = 0;
  let hasValidRankings = false;

  // 1. Parcourir les classements mensuels (movieRankings)
  const rankingsEntries: [string, MonthlyMovieRanking][] = options?.monthKey
    ? (userProfile?.movieRankings?.[options.monthKey] ? [[options.monthKey, userProfile.movieRankings[options.monthKey]]] : [])
    : Object.entries(userProfile?.movieRankings || {});

  rankingsEntries.forEach(([_, ranking]) => {
    if (!ranking || !Array.isArray(ranking.rankedTitles)) return;
    const cleanTitles = ranking.rankedTitles.filter(t => t && typeof t === 'string' && !isTestMovieTitle(t));
    if (cleanTitles.length === 0) return;

    hasValidRankings = true;
    totalRankedMoviesCount += cleanTitles.length;
    const N = cleanTitles.length;

    cleanTitles.forEach((title, index) => {
      const rank = index + 1; // 1 = #1
      // Poids quadratique pour donner une prime immense aux premières positions
      // Ex: N=10 : #1 -> (10-1+1)^2 = 100 pts ; #2 -> 81 pts ; #10 -> 1 pt
      const weight = Math.pow(N - rank + 1, 2);
      const cat = resolveCategory(title);

      pointsMap[cat] = (pointsMap[cat] || 0) + weight;
      countMap[cat] = (countMap[cat] || 0) + 1;

      // Suivre le champion (film classé le plus haut dans sa catégorie)
      const norm = title.toLowerCase().trim();
      const meta = metadataMap.get(norm);
      const currentTop = topMovieMap[cat];

      if (!currentTop || weight > currentTop.rankScore) {
        topMovieMap[cat] = {
          title,
          rankScore: weight,
          posterUrl: meta?.posterUrl,
          year: meta?.year,
        };
      }
    });
  });

  // 2. Si l'utilisateur n'a pas encore fait de duels (ou pour compléter les films vus sans duel)
  // On attribue un socle de points neutre aux films vus répertoriés
  if (!hasValidRankings) {
    const seenTitles = (userProfile?.seenMovieTitles || []).filter(t => t && !isTestMovieTitle(t));
    seenTitles.forEach(title => {
      const cat = resolveCategory(title);
      pointsMap[cat] = (pointsMap[cat] || 0) + 10;
      countMap[cat] = (countMap[cat] || 0) + 1;
      totalRankedMoviesCount += 1;

      const norm = title.toLowerCase().trim();
      const meta = metadataMap.get(norm);
      if (!topMovieMap[cat]) {
        topMovieMap[cat] = {
          title,
          rankScore: 10,
          posterUrl: meta?.posterUrl,
          year: meta?.year,
        };
      }
    });
  }

  // Calcul du total des points
  const totalPoints = Object.values(pointsMap).reduce((sum, p) => sum + p, 0);

  // Construction de la liste des scores par catégorie
  const rawScores: CategoryDnaScore[] = MOVIE_CATEGORIES.map(cat => {
    const pts = pointsMap[cat] || 0;
    const pct = totalPoints > 0 ? (pts / totalPoints) * 100 : 0;
    const top = topMovieMap[cat];

    return {
      category: cat,
      points: pts,
      percentage: Math.round(pct),
      rank: 0,
      movieCount: countMap[cat] || 0,
      topMovieTitle: top?.title,
      topMoviePosterUrl: top?.posterUrl,
      topMovieYear: top?.year,
    };
  });

  // Trier par points décroissants
  rawScores.sort((a, b) => b.points - a.points || b.movieCount - a.movieCount);

  // Ajustement pour que la somme des pourcentages des catégories actives soit égale à 100%
  const activeScores = rawScores.filter(s => s.points > 0);
  if (activeScores.length > 0) {
    const currentSum = activeScores.reduce((sum, s) => sum + s.percentage, 0);
    const diff = 100 - currentSum;
    if (diff !== 0 && activeScores[0]) {
      activeScores[0].percentage += diff;
    }
  }

  // Assigner les rangs
  const finalScores: CategoryDnaScore[] = rawScores.map((s, idx) => ({
    ...s,
    rank: idx + 1,
  }));

  // Extraction du Top 3
  const dominantGene = finalScores[0]?.points > 0 ? finalScores[0] : null;
  const secondaryGene = finalScores[1]?.points > 0 ? finalScores[1] : null;
  const tertiaryGene = finalScores[2]?.points > 0 ? finalScores[2] : null;

  // Calcul de l'archétype
  const archetype = getCinephileArchetype(dominantGene?.category, secondaryGene?.category);

  // Calcul de l'éclectisme
  const eclecticismIndex = calculateEclecticismIndex(finalScores);

  return {
    scores: finalScores,
    archetype,
    dominantGene,
    secondaryGene,
    tertiaryGene,
    totalRankedMovies: totalRankedMoviesCount,
    totalPoints,
    eclecticismIndex,
    hasRankings: hasValidRankings,
    periodLabel,
  };
}
