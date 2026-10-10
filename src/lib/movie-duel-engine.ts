import { MovieCategory, SagaRanking } from '@/lib/firebase/firestore';
import { guessMovieCategory } from '@/lib/movie-category-utils';

export type DuelMovieItem = {
  title: string;
  posterUrl?: string;
  year?: number;
  rating?: number;
  watchedInCinema?: boolean;
  cinemaPlace?: string;
  viewedAt?: number;
  genres?: string[];
  category?: MovieCategory;
};

export type RankMovement = {
  title: string;
  currentRank: number; // 1-indexed (1 = Top 1)
  generalRank?: number; // 1-indexed general rank
  previousRank?: number; // 1-indexed
  diff: number; // +1 if climbed, -1 if fell, 0 if same
  isNew: boolean;
  category?: MovieCategory;
};

export type DuelPhase = 'category' | 'general';

export type CategoryQueueItem = {
  category: MovieCategory;
  movies: DuelMovieItem[];
};

export type GeneralInsertionItem = {
  movie: DuelMovieItem;
  minGeneralIndex: number;
};

export type DuelHistorySnapshot = {
  sortedTitles: string[];
  pendingItems: DuelMovieItem[];
  currentCandidate: DuelMovieItem | null;
  low: number;
  high: number;
  mid: number;
  stepNumber: number;
  newlyAddedTitles: string[];
  phase: DuelPhase;
  currentDuelCategory?: MovieCategory;
  categoryQueue: CategoryQueueItem[];
  currentCategoryIndex: number;
  currentCategorySorted: string[];
  currentCategoryPending: DuelMovieItem[];
  categoryRankings: Record<string, string[]>;
  generalQueue: GeneralInsertionItem[];
  currentGeneralItem: GeneralInsertionItem | null;
  incrementalCategoryIndices?: number[];
  incrementalCategoryLow?: number;
  incrementalCategoryHigh?: number;
  incrementalStage?: 'category' | 'general' | 'podium_confirmation';
  isAutoResolved?: boolean;
  isPodiumDuel?: boolean;
  podiumBadgeText?: string;
  podiumTargetRank?: number;
  podiumCandidateFaced?: string[];
  sagaRankings?: Record<string, SagaRanking> | null;
  isSingleReclassification?: boolean;
  reclassifiedTitle?: string;
};

export type DuelSessionState = {
  mode: 'initial' | 'incremental';
  sortedTitles: string[];
  pendingItems: DuelMovieItem[];
  currentCandidate: DuelMovieItem | null;
  low: number;
  high: number;
  mid: number;
  activeDuel: {
    movieA: DuelMovieItem; // Candidate to place
    movieB: DuelMovieItem; // Reference from sorted list
  } | null;
  history: DuelHistorySnapshot[];
  stepNumber: number;
  estimatedTotalSteps: number;
  isFinished: boolean;
  initialRankedTitles: string[];
  newlyAddedTitles: string[];
  movieCatalog: Record<string, DuelMovieItem>;
  // Category-First state
  phase: DuelPhase;
  currentDuelCategory?: MovieCategory;
  categoryQueue: CategoryQueueItem[];
  currentCategoryIndex: number;
  currentCategorySorted: string[];
  currentCategoryPending: DuelMovieItem[];
  categoryRankings: Record<string, string[]>;
  generalQueue: GeneralInsertionItem[];
  currentGeneralItem: GeneralInsertionItem | null;
  incrementalCategoryIndices?: number[];
  incrementalCategoryLow?: number;
  incrementalCategoryHigh?: number;
  incrementalStage?: 'category' | 'general' | 'podium_confirmation';
  isPodiumDuel?: boolean;
  podiumBadgeText?: string;
  podiumTargetRank?: number;
  podiumCandidateFaced?: string[];
  sagaRankings?: Record<string, SagaRanking> | null;
  isSingleReclassification?: boolean;
  reclassifiedTitle?: string;
};

/**
 * Calcule le nombre théorique de comparaisons pour insérer dans une liste ordonnée.
 */
function estimateComparisons(baseLength: number, numNewItems: number): number {
  let total = 0;
  for (let i = 0; i < numNewItems; i++) {
    const listLen = baseLength + i;
    total += listLen <= 1 ? 1 : Math.max(1, Math.ceil(Math.log2(listLen + 1)));
  }
  return Math.max(1, total);
}

/**
 * Calcule l'estimation totale des duels pour un tournoi par catégorie puis général.
 */
function estimateCategoryFirstComparisons(
  categoryQueue: CategoryQueueItem[],
  numGeneralInsertions: number,
  baseGeneralLength: number
): number {
  let total = 0;
  // Phase 1 : Duels intra-catégories
  for (const item of categoryQueue) {
    if (item.movies.length >= 2) {
      total += estimateComparisons(1, item.movies.length - 1);
    }
  }
  // Phase 2 : Insertion dans le classement général
  if (numGeneralInsertions > 0) {
    total += estimateComparisons(baseGeneralLength, numGeneralInsertions);
  }
  return Math.max(1, total);
}

/**
 * Initialise une session de duel complète (Tri de 0).
 * Priorise les duels entre films de la MÊME catégorie,
 * puis arbitre entre catégories pour le classement général.
 */
export function createInitialDuelSession(
  movies: DuelMovieItem[],
  sagaRankings?: Record<string, SagaRanking> | null
): DuelSessionState {
  const catalog: Record<string, DuelMovieItem> = {};
  movies.forEach(m => {
    const cat = m.category || guessMovieCategory(m.title, m.genres);
    catalog[m.title] = { ...m, category: cat };
  });

  if (movies.length <= 1) {
    return {
      mode: 'initial',
      sortedTitles: movies.map(m => m.title),
      pendingItems: [],
      currentCandidate: null,
      low: 0,
      high: 0,
      mid: 0,
      activeDuel: null,
      history: [],
      stepNumber: 0,
      estimatedTotalSteps: 0,
      isFinished: true,
      initialRankedTitles: movies.map(m => m.title),
      newlyAddedTitles: [],
      movieCatalog: catalog,
      phase: 'general',
      categoryQueue: [],
      currentCategoryIndex: 0,
      currentCategorySorted: [],
      currentCategoryPending: [],
      categoryRankings: {},
      generalQueue: [],
      currentGeneralItem: null,
      sagaRankings,
    };
  }

  // 1. Grouper les films par catégorie
  const byCategory = new Map<MovieCategory, DuelMovieItem[]>();
  movies.forEach(m => {
    const item = catalog[m.title];
    const cat = item.category || 'Drame';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(item);
  });

  // Trier les films au sein de chaque catégorie selon la saga si connue
  if (sagaRankings && Object.keys(sagaRankings).length > 0) {
    byCategory.forEach(items => {
      if (items.length > 1) {
        items.sort((a, b) => {
          const winner = getKnownSagaWinner(a.title, b.title, sagaRankings);
          if (winner === 'candidate') return -1;
          if (winner === 'reference') return 1;
          return 0;
        });
      }
    });
  }

  const categoryRankings: Record<string, string[]> = {};
  const categoryQueue: CategoryQueueItem[] = [];

  // 2. Séparer les catégories nécessitant des duels intra-catégorie (>= 2 films)
  byCategory.forEach((items, cat) => {
    if (items.length >= 2) {
      categoryQueue.push({ category: cat, movies: items });
    } else if (items.length === 1) {
      categoryRankings[cat] = [items[0].title];
    }
  });

  // Calcul du nombre de films à insérer dans le général plus tard
  let maxCatLength = 0;
  byCategory.forEach(items => {
    if (items.length > maxCatLength) maxCatLength = items.length;
  });
  const baseGeneralLength = maxCatLength;
  const numGeneralInsertions = movies.length - maxCatLength;

  const estimatedTotal = estimateCategoryFirstComparisons(categoryQueue, numGeneralInsertions, baseGeneralLength);

  // CAS 1 : Il y a des catégories avec au moins 2 films -> Lancer Phase 1 (Intra-catégorie)
  if (categoryQueue.length > 0) {
    const firstCat = categoryQueue[0];
    const sortedTitlesInCat = [firstCat.movies[0].title];
    const candidate = firstCat.movies[1];
    const pendingInCat = firstCat.movies.slice(2);
    const low = 0;
    const high = 0;
    const mid = 0;
    const movieB = catalog[sortedTitlesInCat[0]];

    return {
      mode: 'initial',
      sortedTitles: [],
      pendingItems: [],
      currentCandidate: candidate,
      low,
      high,
      mid,
      activeDuel: {
        movieA: candidate,
        movieB,
      },
      history: [],
      stepNumber: 1,
      estimatedTotalSteps: estimatedTotal,
      isFinished: false,
      initialRankedTitles: [],
      newlyAddedTitles: [],
      movieCatalog: catalog,
      phase: 'category',
      currentDuelCategory: firstCat.category,
      categoryQueue,
      currentCategoryIndex: 0,
      currentCategorySorted: sortedTitlesInCat,
      currentCategoryPending: pendingInCat,
      categoryRankings,
      generalQueue: [],
      currentGeneralItem: null,
      sagaRankings,
    };
  }

  // CAS 2 : Chaque film est dans une catégorie différente (toutes de taille 1) -> Directement Phase 2
  const sortedTitles = [movies[0].title];
  const generalQueue: GeneralInsertionItem[] = movies.slice(1).map(m => ({
    movie: m,
    minGeneralIndex: 0,
  }));
  const currentGeneralItem = generalQueue[0];
  const remainingGeneral = generalQueue.slice(1);
  const low = 0;
  const high = 0;
  const mid = 0;
  const movieB = catalog[sortedTitles[0]];

  return {
    mode: 'initial',
    sortedTitles,
    pendingItems: [],
    currentCandidate: currentGeneralItem.movie,
    low,
    high,
    mid,
    activeDuel: {
      movieA: currentGeneralItem.movie,
      movieB,
    },
    history: [],
    stepNumber: 1,
    estimatedTotalSteps: Math.max(1, movies.length - 1),
    isFinished: false,
    initialRankedTitles: [],
    newlyAddedTitles: [],
    movieCatalog: catalog,
    phase: 'general',
    currentDuelCategory: undefined,
    categoryQueue: [],
    currentCategoryIndex: 0,
    currentCategorySorted: [],
    currentCategoryPending: [],
    categoryRankings,
    generalQueue: remainingGeneral,
    currentGeneralItem,
    sagaRankings,
  };
}

/**
 * Initialise une session de duel incrémentale :
 * Les nouveaux films vus sont confrontés d'abord aux films de LEUR catégorie,
 * puis positionnés précisément dans le classement général.
 */
export function createIncrementalDuelSession(
  existingRankedTitles: string[],
  newMovies: DuelMovieItem[],
  existingCatalog?: Record<string, DuelMovieItem>,
  sagaRankings?: Record<string, SagaRanking> | null
): DuelSessionState {
  const catalog: Record<string, DuelMovieItem> = { ...(existingCatalog || {}) };
  newMovies.forEach(m => {
    const cat = m.category || guessMovieCategory(m.title, m.genres);
    catalog[m.title] = { ...m, category: cat };
  });

  if (newMovies.length === 0) {
    return {
      mode: 'incremental',
      sortedTitles: [...existingRankedTitles],
      pendingItems: [],
      currentCandidate: null,
      low: 0,
      high: 0,
      mid: 0,
      activeDuel: null,
      history: [],
      stepNumber: 0,
      estimatedTotalSteps: 0,
      isFinished: true,
      initialRankedTitles: [...existingRankedTitles],
      newlyAddedTitles: [],
      movieCatalog: catalog,
      phase: 'general',
      categoryQueue: [],
      currentCategoryIndex: 0,
      currentCategorySorted: [],
      currentCategoryPending: [],
      categoryRankings: {},
      generalQueue: [],
      currentGeneralItem: null,
      sagaRankings,
    };
  }

  // Trier les nouveaux films pour placer les vainqueurs de saga connus en premier
  const orderedNewMovies = [...newMovies];
  if (sagaRankings && Object.keys(sagaRankings).length > 0 && orderedNewMovies.length > 1) {
    orderedNewMovies.sort((a, b) => {
      const winner = getKnownSagaWinner(a.title, b.title, sagaRankings);
      if (winner === 'candidate') return -1;
      if (winner === 'reference') return 1;
      return 0;
    });
  }

  const sortedTitles = [...existingRankedTitles];
  const candidate = orderedNewMovies[0];
  const remainingPending = orderedNewMovies.slice(1);
  const candidateCat = candidate.category || guessMovieCategory(candidate.title, candidate.genres);

  // Bornes de saga initiales pour ce candidat (Plafond & Plancher)
  const candidateBounds = getSagaSearchBounds(candidate.title, sortedTitles, sagaRankings);
  const initLow = candidateBounds.low;
  const initHigh = candidateBounds.high;

  const estimatedTotal = estimateComparisons(existingRankedTitles.length, newMovies.length);

  // Si la position est déjà forcée à 100% par la saga : insertion immédiate
  if (initLow > initHigh) {
    const directSorted = [...sortedTitles];
    directSorted.splice(initLow, 0, candidate.title);
    return advanceIncrementalCandidate(
      {
        mode: 'incremental',
        sortedTitles: directSorted,
        pendingItems: remainingPending,
        currentCandidate: candidate,
        low: initLow,
        high: initHigh,
        mid: initLow,
        activeDuel: null,
        history: [],
        stepNumber: 0,
        estimatedTotalSteps: estimatedTotal,
        isFinished: false,
        initialRankedTitles: [...existingRankedTitles],
        newlyAddedTitles: [candidate.title],
        movieCatalog: catalog,
        phase: 'general',
        categoryQueue: [],
        currentCategoryIndex: 0,
        currentCategorySorted: [],
        currentCategoryPending: [],
        categoryRankings: {},
        generalQueue: [],
        currentGeneralItem: null,
        sagaRankings,
      },
      directSorted,
      [candidate.title],
      {
        sortedTitles,
        pendingItems: remainingPending,
        currentCandidate: candidate,
        low: initLow,
        high: initHigh,
        mid: initLow,
        stepNumber: 0,
        newlyAddedTitles: [candidate.title],
        phase: 'general',
        categoryQueue: [],
        currentCategoryIndex: 0,
        currentCategorySorted: [],
        currentCategoryPending: [],
        categoryRankings: {},
        generalQueue: [],
        currentGeneralItem: null,
        sagaRankings,
      }
    );
  }

  // Chercher si des films de cette catégorie existent déjà dans le classement général DANS l'intervalle autorisé
  const catIndices: number[] = [];
  sortedTitles.forEach((title, idx) => {
    if (idx >= initLow && idx <= initHigh) {
      const item = catalog[title];
      const cat = item?.category || guessMovieCategory(title, item?.genres);
      if (cat === candidateCat) {
        catIndices.push(idx);
      }
    }
  });

  // Si au moins 1 film de la même catégorie existe déjà dans cet intervalle, duel de catégorie restreint !
  if (catIndices.length > 0) {
    const catLow = 0;
    const catHigh = catIndices.length - 1;
    const catMid = Math.floor((catLow + catHigh) / 2);
    const targetGeneralIndex = catIndices[catMid];
    const movieB = catalog[sortedTitles[targetGeneralIndex]] || { title: sortedTitles[targetGeneralIndex] };

    return {
      mode: 'incremental',
      sortedTitles,
      pendingItems: remainingPending,
      currentCandidate: candidate,
      low: initLow,
      high: initHigh,
      mid: targetGeneralIndex,
      activeDuel: {
        movieA: candidate,
        movieB,
      },
      history: [],
      stepNumber: 1,
      estimatedTotalSteps: estimatedTotal,
      isFinished: false,
      initialRankedTitles: [...existingRankedTitles],
      newlyAddedTitles: [],
      movieCatalog: catalog,
      phase: 'category',
      currentDuelCategory: candidateCat,
      categoryQueue: [],
      currentCategoryIndex: 0,
      currentCategorySorted: [],
      currentCategoryPending: [],
      categoryRankings: {},
      generalQueue: [],
      currentGeneralItem: null,
      incrementalCategoryIndices: catIndices,
      incrementalCategoryLow: catLow,
      incrementalCategoryHigh: catHigh,
      incrementalStage: 'category',
      sagaRankings,
    };
  }

  // Aucune référence dans cette catégorie dans cet intervalle : duel dichotomique classique restreint par la saga
  const low = initLow;
  const high = initHigh;
  let mid = Math.max(low, Math.floor((low + high) / 2));
  const candRating = candidate.rating;
  if (candRating && candRating > 0 && (high - low + 1) >= 4) {
    if (candRating < 6.0) {
      // Film moyen / modeste : démarre dans les 70% de l'intervalle permis
      mid = Math.min(high, Math.max(low, low + Math.floor((high - low) * 0.7)));
    } else if (candRating >= 8.2) {
      // Film d'exception : démarre dans les 30% de l'intervalle permis
      mid = Math.max(low, Math.min(high, low + Math.floor((high - low) * 0.3)));
    }
  }
  const movieB = catalog[sortedTitles[mid]] || { title: sortedTitles[mid] };
  const isPodium = mid <= 2;
  const badge = mid === 0 ? '👑 Duel face au n°1' : mid === 1 ? '🥈 Duel face au n°2' : mid === 2 ? '🥉 Duel face au n°3' : undefined;

  return {
    mode: 'incremental',
    sortedTitles,
    pendingItems: remainingPending,
    currentCandidate: candidate,
    low,
    high,
    mid,
    activeDuel: {
      movieA: candidate,
      movieB,
    },
    history: [],
    stepNumber: 1,
    estimatedTotalSteps: estimatedTotal,
    isFinished: false,
    initialRankedTitles: [...existingRankedTitles],
    newlyAddedTitles: [],
    movieCatalog: catalog,
    phase: 'general',
    currentDuelCategory: undefined,
    categoryQueue: [],
    currentCategoryIndex: 0,
    currentCategorySorted: [],
    currentCategoryPending: [],
    categoryRankings: {},
    generalQueue: [],
    currentGeneralItem: null,
    incrementalStage: 'general',
    isPodiumDuel: isPodium,
    podiumBadgeText: badge,
    sagaRankings,
  };
}

/**
 * Vérifie si le candidat prétend entrer sur le Podium (Top 3) sans avoir
 * directement affronté le tenant du titre de la position convoitée.
 * Si oui, déclenche un duel de confirmation direct (Boss fight).
 */
function tryTriggerPodiumConfirmation(
  state: DuelSessionState,
  targetIndex: number,
  candidate: DuelMovieItem,
  snapshot: DuelHistorySnapshot
): DuelSessionState | null {
  // Concerne uniquement les 3 premières places (Top 1, Top 2, Top 3)
  // et s'il y a déjà au moins un film dans la liste triée
  if (targetIndex > 2 || state.sortedTitles.length === 0) {
    return null;
  }

  // Recenser tous les films que ce candidat a déjà affrontés
  const facedTitles = new Set<string>();
  if (state.podiumCandidateFaced) {
    state.podiumCandidateFaced.forEach(t => facedTitles.add(t.toLowerCase().trim()));
  }
  state.history.forEach(h => {
    if (h.currentCandidate?.title === candidate.title && h.activeDuel?.movieB?.title) {
      facedTitles.add(h.activeDuel.movieB.title.toLowerCase().trim());
    }
  });
  if (state.activeDuel?.movieB?.title) {
    facedTitles.add(state.activeDuel.movieB.title.toLowerCase().trim());
  }

  let confirmationTargetIndex = -1;
  let badgeText = '';

  if (targetIndex === 0) {
    // Vise la 1ère place mondiale
    const titleRank1 = state.sortedTitles[0];
    if (titleRank1 && !facedTitles.has(titleRank1.toLowerCase().trim())) {
      confirmationTargetIndex = 0;
      badgeText = '👑 Duel pour la 1ère Place : Détrôner le n°1';
    } else if (state.sortedTitles.length > 1) {
      // A déjà battu le #1, confirmation face au #2
      const titleRank2 = state.sortedTitles[1];
      if (titleRank2 && !facedTitles.has(titleRank2.toLowerCase().trim())) {
        confirmationTargetIndex = 1;
        badgeText = '👑 Duel Décisif : Confirmation face au n°2';
      }
    }
  } else if (targetIndex === 1) {
    // Vise la 2ème place mondiale
    const titleRank2 = state.sortedTitles[1];
    if (titleRank2 && !facedTitles.has(titleRank2.toLowerCase().trim())) {
      confirmationTargetIndex = 1;
      badgeText = '🥈 Duel pour la 2ème Place : Entrée sur le Podium';
    }
  } else if (targetIndex === 2) {
    // Vise la 3ème place mondiale
    const titleRank3 = state.sortedTitles[2];
    if (titleRank3 && !facedTitles.has(titleRank3.toLowerCase().trim())) {
      confirmationTargetIndex = 2;
      badgeText = '🥉 Duel pour la 3ème Place : Accès au Podium';
    }
  }

  if (confirmationTargetIndex >= 0 && confirmationTargetIndex < state.sortedTitles.length) {
    const targetTitle = state.sortedTitles[confirmationTargetIndex];
    const movieB = state.movieCatalog[targetTitle] || { title: targetTitle };

    return {
      ...state,
      incrementalStage: 'podium_confirmation',
      podiumTargetRank: targetIndex + 1,
      podiumCandidateFaced: Array.from(facedTitles),
      isPodiumDuel: true,
      podiumBadgeText: badgeText,
      mid: confirmationTargetIndex,
      activeDuel: {
        movieA: candidate,
        movieB,
      },
      history: [...state.history, snapshot],
      stepNumber: state.stepNumber + 1,
    };
  }

  return null;
}

/**
 * Traite le choix de l'utilisateur dans le duel actif.
 * winner = 'candidate' (Film A gagne)
 * winner = 'reference' (Film B gagne)
 */
export function processDuelDecision(
  state: DuelSessionState,
  winner: 'candidate' | 'reference',
  options?: { isAutoResolved?: boolean }
): DuelSessionState {
  if (state.isFinished || !state.activeDuel) {
    return state;
  }

  // Snapshot pour Undo
  const snapshot: DuelHistorySnapshot = {
    sortedTitles: [...state.sortedTitles],
    pendingItems: [...state.pendingItems],
    currentCandidate: state.currentCandidate,
    low: state.low,
    high: state.high,
    mid: state.mid,
    stepNumber: state.stepNumber,
    newlyAddedTitles: [...state.newlyAddedTitles],
    phase: state.phase,
    currentDuelCategory: state.currentDuelCategory,
    categoryQueue: state.categoryQueue.map(item => ({ category: item.category, movies: [...item.movies] })),
    currentCategoryIndex: state.currentCategoryIndex,
    currentCategorySorted: [...state.currentCategorySorted],
    currentCategoryPending: [...state.currentCategoryPending],
    categoryRankings: { ...state.categoryRankings },
    generalQueue: state.generalQueue.map(item => ({ ...item })),
    currentGeneralItem: state.currentGeneralItem ? { ...state.currentGeneralItem } : null,
    incrementalCategoryIndices: state.incrementalCategoryIndices ? [...state.incrementalCategoryIndices] : undefined,
    incrementalCategoryLow: state.incrementalCategoryLow,
    incrementalCategoryHigh: state.incrementalCategoryHigh,
    incrementalStage: state.incrementalStage,
    isAutoResolved: options?.isAutoResolved,
    isPodiumDuel: state.isPodiumDuel,
    podiumBadgeText: state.podiumBadgeText,
    podiumTargetRank: state.podiumTargetRank,
    podiumCandidateFaced: state.podiumCandidateFaced ? [...state.podiumCandidateFaced] : undefined,
    sagaRankings: state.sagaRankings,
    isSingleReclassification: state.isSingleReclassification,
    reclassifiedTitle: state.reclassifiedTitle,
  };

  // =========================================================================
  // 0. GESTION DU DUEL DE CONFIRMATION DE PODIUM
  // =========================================================================
  if (state.incrementalStage === 'podium_confirmation') {
    const targetRank = state.podiumTargetRank || 1;
    const targetIndex = targetRank - 1;
    const challengedIndex = state.mid;
    const candidate = state.currentCandidate || state.currentGeneralItem?.movie;
    if (!candidate) return state;

    const facedTitles = new Set<string>((state.podiumCandidateFaced || []).map(t => t.toLowerCase().trim()));
    if (state.activeDuel?.movieB?.title) {
      facedTitles.add(state.activeDuel.movieB.title.toLowerCase().trim());
    }

    if (winner === 'candidate') {
      // Victoire du candidat contre le tenant du titre !
      // S'il visait le rang 0 (#1) et qu'il n'a défié que le #1, et qu'il y a un #2 qu'il n'a pas affronté :
      if (targetIndex === 0 && challengedIndex === 0 && state.sortedTitles.length > 1) {
        const titleRank2 = state.sortedTitles[1];
        if (titleRank2 && !facedTitles.has(titleRank2.toLowerCase().trim())) {
          const movieB = state.movieCatalog[titleRank2] || { title: titleRank2 };
          return {
            ...state,
            incrementalStage: 'podium_confirmation',
            podiumTargetRank: 1,
            podiumCandidateFaced: Array.from(facedTitles),
            isPodiumDuel: true,
            podiumBadgeText: '👑 Duel Décisif : Confirmation face au n°2',
            mid: 1,
            activeDuel: {
              movieA: candidate,
              movieB,
            },
            history: [...state.history, snapshot],
            stepNumber: state.stepNumber + 1,
          };
        }
      }

      // Confirmation validée : insertion au rang conquis (targetIndex)
      const finalIndex = targetIndex;
      const newSorted = [...state.sortedTitles];
      newSorted.splice(finalIndex, 0, candidate.title);

      if (state.mode === 'incremental') {
        const updatedNewlyAdded = Array.from(new Set([...state.newlyAddedTitles, candidate.title]));
        return advanceIncrementalCandidate(state, newSorted, updatedNewlyAdded, snapshot);
      } else {
        return advanceGeneralQueue(state, newSorted, finalIndex, snapshot);
      }
    } else {
      // Défaite du candidat contre le tenant du titre :
      // Il ne surclasse pas ce film et se range juste derrière lui
      const finalIndex = challengedIndex + 1;
      const newSorted = [...state.sortedTitles];
      newSorted.splice(finalIndex, 0, candidate.title);

      if (state.mode === 'incremental') {
        const updatedNewlyAdded = Array.from(new Set([...state.newlyAddedTitles, candidate.title]));
        return advanceIncrementalCandidate(state, newSorted, updatedNewlyAdded, snapshot);
      } else {
        return advanceGeneralQueue(state, newSorted, finalIndex, snapshot);
      }
    }
  }

  // =========================================================================
  // 1. CAS MODE INCRÉMENTAL : Étape Catégorie puis Général
  // =========================================================================
  if (state.mode === 'incremental') {
    if (state.incrementalStage === 'category' && state.incrementalCategoryIndices && state.incrementalCategoryIndices.length > 0) {
      let catLow = state.incrementalCategoryLow ?? 0;
      let catHigh = state.incrementalCategoryHigh ?? (state.incrementalCategoryIndices.length - 1);
      const catMid = Math.floor((catLow + catHigh) / 2);

      if (winner === 'candidate') {
        catHigh = catMid - 1;
      } else {
        catLow = catMid + 1;
      }

      // Si la recherche dans la catégorie continue :
      if (catLow <= catHigh) {
        const nextCatMid = Math.floor((catLow + catHigh) / 2);
        const targetGeneralIndex = state.incrementalCategoryIndices[nextCatMid];
        const movieB = state.movieCatalog[state.sortedTitles[targetGeneralIndex]] || { title: state.sortedTitles[targetGeneralIndex] };

        return {
          ...state,
          incrementalCategoryLow: catLow,
          incrementalCategoryHigh: catHigh,
          mid: targetGeneralIndex,
          activeDuel: {
            movieA: state.currentCandidate!,
            movieB,
          },
          history: [...state.history, snapshot],
          stepNumber: state.stepNumber + 1,
        };
      }

      // La position relative dans sa catégorie a été trouvée !
      // On resserre l'intervalle dans le classement général avec précision
      let generalLow = 0;
      let generalHigh = state.sortedTitles.length - 1;

      // Borne basse : s'il a perdu contre un film de sa catégorie, il doit se classer après lui
      if (catLow > 0) {
        const prevCatMovieIndex = state.incrementalCategoryIndices[catLow - 1];
        generalLow = prevCatMovieIndex + 1;
      }
      // Borne haute : s'il a battu un film de sa catégorie, il doit se classer avant lui
      if (catLow < state.incrementalCategoryIndices.length) {
        const nextCatMovieIndex = state.incrementalCategoryIndices[catLow];
        generalHigh = nextCatMovieIndex - 1;
      }

      // Si l'intervalle est déjà réduit à 0 élément (position immédiate trouvée) :
      if (generalLow > generalHigh) {
        const confirmationState = tryTriggerPodiumConfirmation(state, generalLow, state.currentCandidate!, snapshot);
        if (confirmationState) {
          return confirmationState;
        }

        const newSorted = [...state.sortedTitles];
        newSorted.splice(generalLow, 0, state.currentCandidate!.title);
        const updatedNewlyAdded = Array.from(new Set([...state.newlyAddedTitles, state.currentCandidate!.title]));

        return advanceIncrementalCandidate(state, newSorted, updatedNewlyAdded, snapshot);
      }

      // Passer à l'arbitrage général dans l'intervalle resserré
      const nextMid = Math.floor((generalLow + generalHigh) / 2);
      const movieB = state.movieCatalog[state.sortedTitles[nextMid]] || { title: state.sortedTitles[nextMid] };
      const isPodium = nextMid <= 2;
      const badge = nextMid === 0 ? '👑 Duel face au n°1' : nextMid === 1 ? '🥈 Duel face au n°2' : nextMid === 2 ? '🥉 Duel face au n°3' : undefined;

      return {
        ...state,
        phase: 'general',
        currentDuelCategory: undefined,
        incrementalStage: 'general',
        low: generalLow,
        high: generalHigh,
        mid: nextMid,
        activeDuel: {
          movieA: state.currentCandidate!,
          movieB,
        },
        isPodiumDuel: isPodium,
        podiumBadgeText: badge,
        history: [...state.history, snapshot],
        stepNumber: state.stepNumber + 1,
      };
    }

    // Étape d'insertion générale classique en mode incrémental
    let low = state.low;
    let high = state.high;
    const mid = state.mid;

    if (winner === 'candidate') {
      high = mid - 1;
    } else {
      low = mid + 1;
    }

    if (low <= high) {
      const nextMid = Math.floor((low + high) / 2);
      const movieB = state.movieCatalog[state.sortedTitles[nextMid]] || { title: state.sortedTitles[nextMid] };
      const isPodium = nextMid <= 2;
      const badge = nextMid === 0 ? '👑 Duel face au n°1' : nextMid === 1 ? '🥈 Duel face au n°2' : nextMid === 2 ? '🥉 Duel face au n°3' : undefined;

      return {
        ...state,
        low,
        high,
        mid: nextMid,
        activeDuel: {
          movieA: state.currentCandidate!,
          movieB,
        },
        isPodiumDuel: isPodium,
        podiumBadgeText: badge,
        history: [...state.history, snapshot],
        stepNumber: state.stepNumber + 1,
      };
    }

    // Position trouvée par dichotomie générale : vérifier confirmation podium
    const confirmationState = tryTriggerPodiumConfirmation(state, low, state.currentCandidate!, snapshot);
    if (confirmationState) {
      return confirmationState;
    }

    const newSorted = [...state.sortedTitles];
    newSorted.splice(low, 0, state.currentCandidate!.title);
    const updatedNewlyAdded = Array.from(new Set([...state.newlyAddedTitles, state.currentCandidate!.title]));

    return advanceIncrementalCandidate(state, newSorted, updatedNewlyAdded, snapshot);
  }

  // =========================================================================
  // 2. MODE INITIAL - PHASE 1 : Duels Intra-Catégorie
  // =========================================================================
  if (state.phase === 'category') {
    let low = state.low;
    let high = state.high;
    const mid = state.mid;

    if (winner === 'candidate') {
      high = mid - 1;
    } else {
      low = mid + 1;
    }

    // Si la recherche dichotomique dans cette catégorie continue :
    if (low <= high) {
      const nextMid = Math.floor((low + high) / 2);
      const movieB = state.movieCatalog[state.currentCategorySorted[nextMid]];

      return {
        ...state,
        low,
        high,
        mid: nextMid,
        activeDuel: {
          movieA: state.currentCandidate!,
          movieB,
        },
        history: [...state.history, snapshot],
        stepNumber: state.stepNumber + 1,
      };
    }

    // Le candidat a trouvé son rang dans cette catégorie !
    const newCatSorted = [...state.currentCategorySorted];
    newCatSorted.splice(low, 0, state.currentCandidate!.title);

    // Reste-t-il d'autres films à classer dans CETTE catégorie ?
    if (state.currentCategoryPending.length > 0) {
      const nextCandidate = state.currentCategoryPending[0];
      const remainingPending = state.currentCategoryPending.slice(1);
      const nextLow = 0;
      const nextHigh = newCatSorted.length - 1;
      const nextMid = Math.floor((nextLow + nextHigh) / 2);
      const movieB = state.movieCatalog[newCatSorted[nextMid]];

      return {
        ...state,
        currentCategorySorted: newCatSorted,
        currentCategoryPending: remainingPending,
        currentCandidate: nextCandidate,
        low: nextLow,
        high: nextHigh,
        mid: nextMid,
        activeDuel: {
          movieA: nextCandidate,
          movieB,
        },
        history: [...state.history, snapshot],
        stepNumber: state.stepNumber + 1,
      };
    }

    // Cette catégorie est complètement classée !
    const currentCatItem = state.categoryQueue[state.currentCategoryIndex];
    const newCategoryRankings = {
      ...state.categoryRankings,
      [currentCatItem.category]: newCatSorted,
    };

    // Reste-t-il d'autres catégories dans la file d'attente ?
    if (state.currentCategoryIndex + 1 < state.categoryQueue.length) {
      const nextCatItem = state.categoryQueue[state.currentCategoryIndex + 1];
      const sortedTitlesInCat = [nextCatItem.movies[0].title];
      const candidate = nextCatItem.movies[1];
      const pendingInCat = nextCatItem.movies.slice(2);
      const low = 0;
      const high = 0;
      const mid = 0;
      const movieB = state.movieCatalog[sortedTitlesInCat[0]];

      return {
        ...state,
        currentCategoryIndex: state.currentCategoryIndex + 1,
        currentCategorySorted: sortedTitlesInCat,
        currentCategoryPending: pendingInCat,
        currentCandidate: candidate,
        currentDuelCategory: nextCatItem.category,
        low,
        high,
        mid,
        activeDuel: {
          movieA: candidate,
          movieB,
        },
        categoryRankings: newCategoryRankings,
        history: [...state.history, snapshot],
        stepNumber: state.stepNumber + 1,
      };
    }

    // TOUTES LES CATÉGORIES SONT CLASSÉES !
    // -> Passage à la PHASE 2 : Arbitrage pour le Classement Général
    return initializeGeneralPhaseFromCategories(state, newCategoryRankings, snapshot);
  }

  // =========================================================================
  // 3. MODE INITIAL - PHASE 2 : Positionnement dans le Classement Général
  // =========================================================================
  let low = state.low;
  let high = state.high;
  const mid = state.mid;

  if (winner === 'candidate') {
    high = mid - 1;
  } else {
    low = mid + 1;
  }

  // La recherche générale continue pour ce film :
  if (low <= high) {
    const nextMid = Math.floor((low + high) / 2);
    const movieB = state.movieCatalog[state.sortedTitles[nextMid]] || { title: state.sortedTitles[nextMid] };
    const isPodium = nextMid <= 2;
    const badge = nextMid === 0 ? '👑 Duel face au n°1' : nextMid === 1 ? '🥈 Duel face au n°2' : nextMid === 2 ? '🥉 Duel face au n°3' : undefined;

    return {
      ...state,
      low,
      high,
      mid: nextMid,
      activeDuel: {
        movieA: state.currentGeneralItem!.movie,
        movieB,
      },
      isPodiumDuel: isPodium,
      podiumBadgeText: badge,
      history: [...state.history, snapshot],
      stepNumber: state.stepNumber + 1,
    };
  }

  // Le film est positionné dans le classement général !
  const insertedIndex = low;
  const confirmationState = tryTriggerPodiumConfirmation(state, insertedIndex, state.currentGeneralItem!.movie, snapshot);
  if (confirmationState) {
    return confirmationState;
  }

  const newSortedTitles = [...state.sortedTitles];
  newSortedTitles.splice(insertedIndex, 0, state.currentGeneralItem!.movie.title);

  // Reste-t-il d'autres films à insérer dans le classement général ?
  return advanceGeneralQueue(state, newSortedTitles, insertedIndex, snapshot);
}

/**
 * Prépare et lance la Phase 2 (Générale) une fois toutes les catégories triées.
 */
function initializeGeneralPhaseFromCategories(
  state: DuelSessionState,
  categoryRankings: Record<string, string[]>,
  snapshot: DuelHistorySnapshot
): DuelSessionState {
  // Trouver la catégorie contenant le plus de films comme base initiale du classement général
  let baseCategory: string | null = null;
  let maxCount = -1;

  Object.entries(categoryRankings).forEach(([cat, titles]) => {
    if (titles.length > maxCount) {
      maxCount = titles.length;
      baseCategory = cat;
    }
  });

  if (!baseCategory) {
    return {
      ...state,
      isFinished: true,
      activeDuel: null,
      categoryRankings,
    };
  }

  const initialGeneralSorted = [...(categoryRankings[baseCategory] || [])];

  // Préparer la file d'insertion pour toutes les autres catégories
  const generalQueue: GeneralInsertionItem[] = [];
  Object.entries(categoryRankings).forEach(([cat, titles]) => {
    if (cat !== baseCategory) {
      titles.forEach(title => {
        const item = state.movieCatalog[title] || { title };
        generalQueue.push({
          movie: item,
          minGeneralIndex: 0,
        });
      });
    }
  });

  // Si aucun autre film à insérer (tous les films étaient dans la même catégorie) : terminé !
  if (generalQueue.length === 0) {
    return {
      ...state,
      sortedTitles: initialGeneralSorted,
      isFinished: true,
      activeDuel: null,
      categoryRankings,
      phase: 'general',
      currentDuelCategory: undefined,
      history: [...state.history, snapshot],
    };
  }

  const currentGeneralItem = generalQueue[0];
  const remainingGeneral = generalQueue.slice(1);
  const low = 0;
  const high = initialGeneralSorted.length - 1;
  const mid = Math.floor((low + high) / 2);
  const movieB = state.movieCatalog[initialGeneralSorted[mid]] || { title: initialGeneralSorted[mid] };

  return {
    ...state,
    sortedTitles: initialGeneralSorted,
    categoryRankings,
    phase: 'general',
    currentDuelCategory: undefined,
    generalQueue: remainingGeneral,
    currentGeneralItem,
    currentCandidate: currentGeneralItem.movie,
    low,
    high,
    mid,
    activeDuel: {
      movieA: currentGeneralItem.movie,
      movieB,
    },
    history: [...state.history, snapshot],
    stepNumber: state.stepNumber + 1,
  };
}

/**
 * Avance dans la file d'insertion générale (Phase 2).
 */
function advanceGeneralQueue(
  state: DuelSessionState,
  newSortedTitles: string[],
  insertedIndex: number,
  snapshot: DuelHistorySnapshot
): DuelSessionState {
  // Ajuster la contrainte minimale pour les futurs films de la même catégorie dans la file :
  // Un film moins bon dans sa catégorie doit impérativement être inséré APRÈS son prédécesseur !
  const currentCat = state.currentGeneralItem?.movie.category;
  const updatedGeneralQueue = state.generalQueue.map(item => {
    if (item.movie.category === currentCat) {
      return {
        ...item,
        minGeneralIndex: Math.max(item.minGeneralIndex, insertedIndex + 1),
      };
    }
    return item;
  });

  if (updatedGeneralQueue.length > 0) {
    const nextGeneralItem = updatedGeneralQueue[0];
    const remainingGeneral = updatedGeneralQueue.slice(1);

    const low = Math.min(nextGeneralItem.minGeneralIndex, newSortedTitles.length);
    const high = newSortedTitles.length - 1;

    // Si low > high (l'index forcé est au-delà du bout de la liste) : insertion directe à la fin
    if (low > high) {
      const inserted = [...newSortedTitles];
      inserted.splice(low, 0, nextGeneralItem.movie.title);
      return advanceGeneralQueue(
        { ...state, generalQueue: remainingGeneral, currentGeneralItem: nextGeneralItem },
        inserted,
        low,
        snapshot
      );
    }

    const mid = Math.floor((low + high) / 2);
    const movieB = state.movieCatalog[newSortedTitles[mid]] || { title: newSortedTitles[mid] };

    return {
      ...state,
      sortedTitles: newSortedTitles,
      generalQueue: remainingGeneral,
      currentGeneralItem: nextGeneralItem,
      currentCandidate: nextGeneralItem.movie,
      low,
      high,
      mid,
      activeDuel: {
        movieA: nextGeneralItem.movie,
        movieB,
      },
      history: [...state.history, snapshot],
      stepNumber: state.stepNumber + 1,
    };
  }

  // Tournoi complet terminé avec succès !
  return {
    ...state,
    sortedTitles: newSortedTitles,
    generalQueue: [],
    currentGeneralItem: null,
    currentCandidate: null,
    activeDuel: null,
    isFinished: true,
    history: [...state.history, snapshot],
  };
}

/**
 * Passe au prochain candidat en mode incrémental.
 */
function advanceIncrementalCandidate(
  state: DuelSessionState,
  newSortedTitles: string[],
  updatedNewlyAdded: string[],
  snapshot: DuelHistorySnapshot
): DuelSessionState {
  if (state.pendingItems.length > 0) {
    const nextCandidate = state.pendingItems[0];
    const remainingPending = state.pendingItems.slice(1);
    const candidateCat = nextCandidate.category || guessMovieCategory(nextCandidate.title, nextCandidate.genres);

    // Calcul des bornes de saga (Plafond & Plancher)
    const sagaBounds = getSagaSearchBounds(nextCandidate.title, newSortedTitles, state.sagaRankings);
    let nextLow = sagaBounds.low;
    let nextHigh = sagaBounds.high;

    // Si la saga impose déjà le placement exact (nextLow > nextHigh) :
    if (nextLow > nextHigh) {
      const autoSorted = [...newSortedTitles];
      autoSorted.splice(nextLow, 0, nextCandidate.title);
      const updatedNewlyAddedWithCandidate = Array.from(new Set([...updatedNewlyAdded, nextCandidate.title]));
      return advanceIncrementalCandidate(
        {
          ...state,
          pendingItems: remainingPending,
          currentCandidate: nextCandidate,
          newlyAddedTitles: updatedNewlyAddedWithCandidate,
        },
        autoSorted,
        updatedNewlyAddedWithCandidate,
        snapshot
      );
    }

    // Vérifier si des films de cette catégorie existent dans le classement général DANS l'intervalle autorisé
    const catIndices: number[] = [];
    newSortedTitles.forEach((title, idx) => {
      if (idx >= nextLow && idx <= nextHigh) {
        const item = state.movieCatalog[title];
        const cat = item?.category || guessMovieCategory(title, item?.genres);
        if (cat === candidateCat) {
          catIndices.push(idx);
        }
      }
    });

    if (catIndices.length > 0) {
      const catLow = 0;
      const catHigh = catIndices.length - 1;
      const catMid = Math.floor((catLow + catHigh) / 2);
      const targetGeneralIndex = catIndices[catMid];
      const movieB = state.movieCatalog[newSortedTitles[targetGeneralIndex]] || { title: newSortedTitles[targetGeneralIndex] };

      return {
        ...state,
        sortedTitles: newSortedTitles,
        pendingItems: remainingPending,
        currentCandidate: nextCandidate,
        low: nextLow,
        high: nextHigh,
        mid: targetGeneralIndex,
        activeDuel: {
          movieA: nextCandidate,
          movieB,
        },
        history: [...state.history, snapshot],
        stepNumber: state.stepNumber + 1,
        newlyAddedTitles: updatedNewlyAdded,
        phase: 'category',
        currentDuelCategory: candidateCat,
        incrementalCategoryIndices: catIndices,
        incrementalCategoryLow: catLow,
        incrementalCategoryHigh: catHigh,
        incrementalStage: 'category',
        isPodiumDuel: false,
        podiumBadgeText: undefined,
        podiumTargetRank: undefined,
        podiumCandidateFaced: [],
      };
    }

    // Sinon duel classique guidé par la note si connue restreint par la saga
    let nextMid = Math.floor((nextLow + nextHigh) / 2);
    const candRating = nextCandidate.rating;
    if (candRating && candRating > 0 && (nextHigh - nextLow + 1) >= 4) {
      if (candRating < 6.0) {
        // Film moyen / modeste : démarre vers 70% de l'intervalle permis
        nextMid = Math.min(nextHigh, Math.max(nextLow, nextLow + Math.floor((nextHigh - nextLow) * 0.7)));
      } else if (candRating >= 8.2) {
        // Film d'exception : démarre vers 30% de l'intervalle permis
        nextMid = Math.max(nextLow, Math.min(nextHigh, nextLow + Math.floor((nextHigh - nextLow) * 0.3)));
      }
    }
    const movieB = state.movieCatalog[newSortedTitles[nextMid]] || { title: newSortedTitles[nextMid] };
    const isPodium = nextMid <= 2;
    const badge = nextMid === 0 ? '👑 Duel face au n°1' : nextMid === 1 ? '🥈 Duel face au n°2' : nextMid === 2 ? '🥉 Duel face au n°3' : undefined;

    return {
      ...state,
      sortedTitles: newSortedTitles,
      pendingItems: remainingPending,
      currentCandidate: nextCandidate,
      low: nextLow,
      high: nextHigh,
      mid: nextMid,
      activeDuel: {
        movieA: nextCandidate,
        movieB,
      },
      history: [...state.history, snapshot],
      stepNumber: state.stepNumber + 1,
      newlyAddedTitles: updatedNewlyAdded,
      phase: 'general',
      currentDuelCategory: undefined,
      incrementalStage: 'general',
      isPodiumDuel: isPodium,
      podiumBadgeText: badge,
      podiumTargetRank: undefined,
      podiumCandidateFaced: [],
    };
  }

  // Tous les nouveaux films sont insérés !
  return {
    ...state,
    sortedTitles: newSortedTitles,
    pendingItems: [],
    currentCandidate: null,
    activeDuel: null,
    isFinished: true,
    newlyAddedTitles: updatedNewlyAdded,
    isPodiumDuel: false,
    podiumBadgeText: undefined,
    podiumTargetRank: undefined,
    podiumCandidateFaced: [],
    history: [...state.history, snapshot],
  };
}

/**
 * Effectue un unique retour en arrière d'un pas dans l'historique du duel.
 */
function performSingleUndo(state: DuelSessionState): DuelSessionState {
  if (state.history.length === 0) return state;

  const previous = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);

  let activeDuel = null;
  if (previous.currentCandidate) {
    let movieBTitle: string | null = null;
    if (previous.phase === 'category' && previous.currentCategorySorted && previous.currentCategorySorted.length > previous.mid) {
      movieBTitle = previous.currentCategorySorted[previous.mid];
    } else if (previous.sortedTitles && previous.sortedTitles.length > previous.mid) {
      movieBTitle = previous.sortedTitles[previous.mid];
    }

    if (movieBTitle) {
      const movieB = state.movieCatalog[movieBTitle] || { title: movieBTitle };
      activeDuel = {
        movieA: previous.currentCandidate,
        movieB,
      };
    }
  }

  return {
    ...state,
    sortedTitles: previous.sortedTitles,
    pendingItems: previous.pendingItems,
    currentCandidate: previous.currentCandidate,
    low: previous.low,
    high: previous.high,
    mid: previous.mid,
    activeDuel,
    history: newHistory,
    stepNumber: previous.stepNumber,
    isFinished: false,
    newlyAddedTitles: previous.newlyAddedTitles,
    phase: previous.phase,
    currentDuelCategory: previous.currentDuelCategory,
    categoryQueue: previous.categoryQueue,
    currentCategoryIndex: previous.currentCategoryIndex,
    currentCategorySorted: previous.currentCategorySorted,
    currentCategoryPending: previous.currentCategoryPending,
    categoryRankings: previous.categoryRankings,
    generalQueue: previous.generalQueue,
    currentGeneralItem: previous.currentGeneralItem,
    incrementalCategoryIndices: previous.incrementalCategoryIndices,
    incrementalCategoryLow: previous.incrementalCategoryLow,
    incrementalCategoryHigh: previous.incrementalCategoryHigh,
    incrementalStage: previous.incrementalStage,
    isPodiumDuel: previous.isPodiumDuel,
    podiumBadgeText: previous.podiumBadgeText,
    podiumTargetRank: previous.podiumTargetRank,
    podiumCandidateFaced: previous.podiumCandidateFaced ? [...previous.podiumCandidateFaced] : undefined,
  };
}

/**
 * Annule le dernier choix de duel manuel de l'utilisateur
 * (déroule automatiquement les éventuels duels de saga auto-résolus qui ont suivi).
 */
export function undoDuelDecision(state: DuelSessionState): DuelSessionState {
  if (state.history.length === 0) return state;

  let current = state;
  while (current.history.length > 0) {
    const previous = current.history[current.history.length - 1];
    const isAuto = previous.isAutoResolved;
    current = performSingleUndo(current);
    if (!isAuto) {
      break;
    }
  }
  return current;
}

/**
 * Normalise un titre pour comparaison insensible à la casse, accents, ponctuations et parenthèses.
 */
export function normalizeTitleForComparison(t?: string): string {
  if (!t) return '';
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/['’`"«»]/g, '')        // supprime les apostrophes et guillemets
    .replace(/[:\-–—_.,!?/()]/g, ' ') // remplace ponctuation par un espace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vérifie si deux films ont déjà un ordre de préférence établi dans les duels de saga de l'utilisateur.
 * Retourne 'candidate' si movieA bat movieB, 'reference' si movieB bat movieA, ou null si inconnu.
 */
export function getKnownSagaWinner(
  titleA: string,
  titleB: string,
  sagaRankings?: Record<string, SagaRanking> | null
): 'candidate' | 'reference' | null {
  if (!sagaRankings || !titleA || !titleB) return null;
  const normA = normalizeTitleForComparison(titleA);
  const normB = normalizeTitleForComparison(titleB);
  if (!normA || !normB || normA === normB) return null;

  for (const ranking of Object.values(sagaRankings)) {
    if (!ranking || !Array.isArray(ranking.rankedTitles) || ranking.rankedTitles.length < 2) continue;

    const normalizedRanked = ranking.rankedTitles.map(t => normalizeTitleForComparison(t));

    // Recherche exacte normalisée
    let idxA = normalizedRanked.findIndex(t => t === normA);
    let idxB = normalizedRanked.findIndex(t => t === normB);

    // Recherche flexible tolérante (si l'un contient l'autre, ex: sous-titre TMDB tronqué)
    if (idxA === -1) {
      idxA = normalizedRanked.findIndex(t => t.length >= 4 && (normA.includes(t) || t.includes(normA)));
    }
    if (idxB === -1) {
      idxB = normalizedRanked.findIndex(t => t.length >= 4 && (normB.includes(t) || t.includes(normB)));
    }

    if (idxA >= 0 && idxB >= 0 && idxA !== idxB) {
      // Dans le classement de la saga : le premier indice (0) est le champion
      // Si idxA < idxB : titleA (candidate) est meilleur que titleB (reference)
      return idxA < idxB ? 'candidate' : 'reference';
    }
  }

  return null;
}

/**
 * Calcule l'intervalle [low, high] dans sortedTitles pour un candidat en fonction
 * de l'ordre déjà établi dans les sagas (Principe du Plafond & Plancher / Transitivité).
 */
export function getSagaSearchBounds(
  candidateTitle: string,
  sortedTitles: string[],
  sagaRankings?: Record<string, SagaRanking> | null
): { low: number; high: number } {
  let low = 0;
  let high = Math.max(0, sortedTitles.length - 1);

  if (!sagaRankings || Object.keys(sagaRankings).length === 0 || sortedTitles.length === 0) {
    return { low, high };
  }

  sortedTitles.forEach((refTitle, idx) => {
    const winner = getKnownSagaWinner(candidateTitle, refTitle, sagaRankings);
    if (winner === 'candidate') {
      // Le candidat bat ce film de la saga -> Il doit impérativement être classé AVANT lui
      high = Math.min(high, idx - 1);
    } else if (winner === 'reference') {
      // Ce film de la saga bat le candidat -> Le candidat doit impérativement être classé APRÈS lui
      low = Math.max(low, idx + 1);
    }
  });

  return { low, high };
}

/**
 * Initialise une session de duel ciblée pour RECLASSER un seul film spécifique déjà présent dans le classement.
 * Le film est extrait de la liste ordonnée et inséré par dichotomie ciblée.
 */
export function createSingleMovieReclassificationSession(
  targetTitle: string,
  currentRankedTitles: string[],
  movieCatalog: Record<string, DuelMovieItem>,
  sagaRankings?: Record<string, SagaRanking> | null
): DuelSessionState {
  const normTarget = normalizeTitleForComparison(targetTitle);
  const originalIndex = currentRankedTitles.findIndex(t => normalizeTitleForComparison(t) === normTarget);
  const remainingSorted = currentRankedTitles.filter((_, idx) => idx !== originalIndex);

  const candidate = movieCatalog[targetTitle] || { title: targetTitle };

  if (remainingSorted.length === 0) {
    return {
      mode: 'incremental',
      sortedTitles: [targetTitle],
      pendingItems: [],
      currentCandidate: null,
      low: 0,
      high: 0,
      mid: 0,
      activeDuel: null,
      history: [],
      stepNumber: 0,
      estimatedTotalSteps: 0,
      isFinished: true,
      initialRankedTitles: currentRankedTitles,
      newlyAddedTitles: [],
      movieCatalog,
      phase: 'general',
      categoryQueue: [],
      currentCategoryIndex: 0,
      currentCategorySorted: [],
      currentCategoryPending: [],
      categoryRankings: {},
      generalQueue: [],
      currentGeneralItem: null,
      isSingleReclassification: true,
      reclassifiedTitle: targetTitle,
      sagaRankings,
    };
  }

  // Calcul des bornes de saga (Plafond / Plancher)
  const { low, high } = getSagaSearchBounds(targetTitle, remainingSorted, sagaRankings);

  // Si l'intervalle est déjà résolu (low > high) : placement direct
  if (low > high) {
    const finalSorted = [...remainingSorted];
    finalSorted.splice(low, 0, targetTitle);
    return {
      mode: 'incremental',
      sortedTitles: finalSorted,
      pendingItems: [],
      currentCandidate: null,
      low,
      high,
      mid: low,
      activeDuel: null,
      history: [],
      stepNumber: 0,
      estimatedTotalSteps: 0,
      isFinished: true,
      initialRankedTitles: currentRankedTitles,
      newlyAddedTitles: [],
      movieCatalog,
      phase: 'general',
      categoryQueue: [],
      currentCategoryIndex: 0,
      currentCategorySorted: [],
      currentCategoryPending: [],
      categoryRankings: {},
      generalQueue: [],
      currentGeneralItem: null,
      isSingleReclassification: true,
      reclassifiedTitle: targetTitle,
      sagaRankings,
    };
  }

  // Déterminer le duel initial
  const mid = Math.floor((low + high) / 2);
  const movieB = movieCatalog[remainingSorted[mid]] || { title: remainingSorted[mid] };
  const isPodium = mid <= 2;
  const badge = mid === 0 ? '👑 Duel face au n°1' : mid === 1 ? '🥈 Duel face au n°2' : mid === 2 ? '🥉 Duel face au n°3' : '🎯 Reclassement ciblé';

  return {
    mode: 'incremental',
    sortedTitles: remainingSorted,
    pendingItems: [],
    currentCandidate: candidate,
    low,
    high,
    mid,
    activeDuel: {
      movieA: candidate,
      movieB,
    },
    history: [],
    stepNumber: 1,
    estimatedTotalSteps: Math.max(1, Math.ceil(Math.log2(remainingSorted.length + 1))),
    isFinished: false,
    initialRankedTitles: currentRankedTitles, // Permet à calculateRankMovements de calculer le delta (+ / -)
    newlyAddedTitles: [],
    movieCatalog,
    phase: 'general',
    categoryQueue: [],
    currentCategoryIndex: 0,
    currentCategorySorted: [],
    currentCategoryPending: [],
    categoryRankings: {},
    generalQueue: [],
    currentGeneralItem: null,
    incrementalStage: 'general',
    isPodiumDuel: isPodium,
    podiumBadgeText: badge,
    isSingleReclassification: true,
    reclassifiedTitle: targetTitle,
    sagaRankings,
  };
}

/**
 * Résout automatiquement et silencieusement tous les duels consécutifs
 * dont l'issue a déjà été déterminée lors d'un duel de saga précédent.
 * Évite à l'utilisateur de devoir re-choisir entre deux films de la même saga.
 */
export function autoResolveSagaDuels(
  initialState: DuelSessionState,
  sagaRankings?: Record<string, SagaRanking> | null
): DuelSessionState {
  const effectiveRankings = sagaRankings || initialState.sagaRankings;
  if (!effectiveRankings || Object.keys(effectiveRankings).length === 0) return initialState;

  let current = { ...initialState, sagaRankings: effectiveRankings };
  let safetyCounter = 0;
  const maxIterations = 150;

  while (!current.isFinished && current.activeDuel && safetyCounter < maxIterations) {
    safetyCounter++;
    const movieA = current.activeDuel.movieA.title;
    const movieB = current.activeDuel.movieB.title;

    const knownWinner = getKnownSagaWinner(movieA, movieB, effectiveRankings);
    if (!knownWinner) {
      break;
    }

    // Résoudre automatiquement ce duel avec le gagnant de la saga
    current = processDuelDecision(current, knownWinner, { isAutoResolved: true });
  }

  return current;
}

/**
 * Calcule les déplacements de classement (monte, descend, stable, nouveau)
 * pour animer visuellement le reclassement.
 */
export function calculateRankMovements(
  initialRanked: string[] = [],
  currentRanked: string[] = [],
  newTitles: string[] = [],
  movieCatalog?: Record<string, DuelMovieItem>,
  selectedCategory: MovieCategory | 'all' = 'all'
): RankMovement[] {
  const initialMap = new Map<string, number>();
  (initialRanked || []).forEach((title, index) => {
    if (title) initialMap.set(title, index + 1);
  });

  const newSet = new Set(newTitles || []);

  const generalRankMap = new Map<string, number>();
  (currentRanked || []).forEach((title, index) => {
    if (title) generalRankMap.set(title, index + 1);
  });

  const filteredTitles = selectedCategory === 'all'
    ? (currentRanked || [])
    : (currentRanked || []).filter(title => {
        const item = movieCatalog?.[title];
        const category = item?.category || guessMovieCategory(title, item?.genres);
        return category === selectedCategory;
      });

  return filteredTitles.map((title, index) => {
    const currentRank = index + 1;
    const isNew = newSet.has(title) || !initialMap.has(title);
    const previousRank = initialMap.get(title);
    const item = movieCatalog?.[title];
    const category = item?.category || guessMovieCategory(title, item?.genres);

    let diff = 0;
    if (previousRank !== undefined) {
      diff = previousRank - (generalRankMap.get(title) || currentRank);
    }

    return {
      title,
      currentRank,
      generalRank: generalRankMap.get(title) || currentRank,
      previousRank,
      diff,
      isNew,
      category,
    };
  });
}

/**
 * Écarte le candidat actuel s'il a été marqué par erreur comme vu (ou retiré par l'utilisateur).
 */
export function dismissCandidate(state: DuelSessionState): DuelSessionState {
  if (state.isFinished || !state.currentCandidate) return state;

  const dismissedTitle = state.currentCandidate.title;
  const newCatalog = { ...state.movieCatalog };
  delete newCatalog[dismissedTitle];

  if (state.pendingItems.length > 0) {
    const nextCandidate = state.pendingItems[0];
    const remainingPending = state.pendingItems.slice(1);
    const nextLow = 0;
    const nextHigh = Math.max(0, state.sortedTitles.length - 1);
    const nextMid = Math.floor((nextLow + nextHigh) / 2);
    const movieB = newCatalog[state.sortedTitles[nextMid]] || { title: state.sortedTitles[nextMid] };

    return {
      ...state,
      movieCatalog: newCatalog,
      pendingItems: remainingPending,
      currentCandidate: nextCandidate,
      low: nextLow,
      high: nextHigh,
      mid: nextMid,
      activeDuel: {
        movieA: nextCandidate,
        movieB,
      },
      stepNumber: state.stepNumber + 1,
    };
  }

  return {
    ...state,
    movieCatalog: newCatalog,
    pendingItems: [],
    currentCandidate: null,
    activeDuel: null,
    isFinished: true,
  };
}

/**
 * Retire un film de référence du classement s'il a été marqué par erreur comme vu.
 */
export function removeReferenceFromSession(state: DuelSessionState, movieTitle: string): DuelSessionState {
  const norm = movieTitle.toLowerCase().trim();
  const newSorted = state.sortedTitles.filter(t => t.toLowerCase().trim() !== norm);
  const newInitial = (state.initialRankedTitles || []).filter(t => t.toLowerCase().trim() !== norm);
  const newNewlyAdded = (state.newlyAddedTitles || []).filter(t => t.toLowerCase().trim() !== norm);
  const newCatalog = { ...state.movieCatalog };
  delete newCatalog[movieTitle];

  if (!state.currentCandidate || newSorted.length === 0) {
    return {
      ...state,
      sortedTitles: newSorted,
      initialRankedTitles: newInitial,
      newlyAddedTitles: newNewlyAdded,
      movieCatalog: newCatalog,
      activeDuel: null,
      isFinished: true,
    };
  }

  const low = 0;
  const high = Math.max(0, newSorted.length - 1);
  const mid = Math.floor((low + high) / 2);
  const movieB = newCatalog[newSorted[mid]] || { title: newSorted[mid] };

  return {
    ...state,
    sortedTitles: newSorted,
    initialRankedTitles: newInitial,
    newlyAddedTitles: newNewlyAdded,
    movieCatalog: newCatalog,
    low,
    high,
    mid,
    activeDuel: {
      movieA: state.currentCandidate,
      movieB,
    },
  };
}
