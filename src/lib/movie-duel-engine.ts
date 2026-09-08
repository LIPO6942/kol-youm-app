import { MovieCategory } from '@/lib/firebase/firestore';
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
  incrementalStage?: 'category' | 'general';
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
  incrementalStage?: 'category' | 'general';
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
export function createInitialDuelSession(movies: DuelMovieItem[]): DuelSessionState {
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
  existingCatalog?: Record<string, DuelMovieItem>
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
    };
  }

  const sortedTitles = [...existingRankedTitles];
  const candidate = newMovies[0];
  const remainingPending = newMovies.slice(1);
  const candidateCat = candidate.category || guessMovieCategory(candidate.title, candidate.genres);

  // Chercher si des films de cette catégorie existent déjà dans le classement général
  const catIndices: number[] = [];
  sortedTitles.forEach((title, idx) => {
    const item = catalog[title];
    const cat = item?.category || guessMovieCategory(title, item?.genres);
    if (cat === candidateCat) {
      catIndices.push(idx);
    }
  });

  const estimatedTotal = estimateComparisons(existingRankedTitles.length, newMovies.length);

  // Si au moins 1 film de la même catégorie existe déjà, confronter d'abord avec sa catégorie !
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
      low: 0,
      high: sortedTitles.length - 1,
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
    };
  }

  // Aucune référence dans cette catégorie : duel dichotomique classique
  const low = 0;
  const high = sortedTitles.length - 1;
  const mid = Math.max(0, Math.floor((low + high) / 2));
  const movieB = catalog[sortedTitles[mid]] || { title: sortedTitles[mid] };

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
  };
}

/**
 * Traite le choix de l'utilisateur dans le duel actif.
 * winner = 'candidate' (Film A gagne)
 * winner = 'reference' (Film B gagne)
 */
export function processDuelDecision(
  state: DuelSessionState,
  winner: 'candidate' | 'reference'
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
  };

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
      // On resserre l'intervalle dans le classement général
      let generalLow = 0;
      let generalHigh = state.sortedTitles.length - 1;

      if (catLow > 0) {
        const prevCatMovieIndex = state.incrementalCategoryIndices[catLow - 1];
        generalLow = prevCatMovieIndex + 1;
      }
      if (catHigh >= 0 && catHigh < state.incrementalCategoryIndices.length) {
        const nextCatMovieIndex = state.incrementalCategoryIndices[catHigh];
        generalHigh = nextCatMovieIndex - 1;
      }

      // Si l'intervalle est déjà réduit à 0 élément (position immédiate trouvée) :
      if (generalLow > generalHigh) {
        const newSorted = [...state.sortedTitles];
        newSorted.splice(generalLow, 0, state.currentCandidate!.title);
        const updatedNewlyAdded = Array.from(new Set([...state.newlyAddedTitles, state.currentCandidate!.title]));

        return advanceIncrementalCandidate(state, newSorted, updatedNewlyAdded, snapshot);
      }

      // Passer à l'arbitrage général dans l'intervalle resserré
      const nextMid = Math.floor((generalLow + generalHigh) / 2);
      const movieB = state.movieCatalog[state.sortedTitles[nextMid]] || { title: state.sortedTitles[nextMid] };

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

    // Position trouvée
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

    return {
      ...state,
      low,
      high,
      mid: nextMid,
      activeDuel: {
        movieA: state.currentGeneralItem!.movie,
        movieB,
      },
      history: [...state.history, snapshot],
      stepNumber: state.stepNumber + 1,
    };
  }

  // Le film est positionné dans le classement général !
  const insertedIndex = low;
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

    // Vérifier si des films de cette catégorie existent dans le classement général
    const catIndices: number[] = [];
    newSortedTitles.forEach((title, idx) => {
      const item = state.movieCatalog[title];
      const cat = item?.category || guessMovieCategory(title, item?.genres);
      if (cat === candidateCat) {
        catIndices.push(idx);
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
        low: 0,
        high: newSortedTitles.length - 1,
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
      };
    }

    // Sinon duel classique
    const nextLow = 0;
    const nextHigh = newSortedTitles.length - 1;
    const nextMid = Math.floor((nextLow + nextHigh) / 2);
    const movieB = state.movieCatalog[newSortedTitles[nextMid]] || { title: newSortedTitles[nextMid] };

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
    history: [...state.history, snapshot],
  };
}

/**
 * Annule le dernier choix de duel (Undo complet).
 */
export function undoDuelDecision(state: DuelSessionState): DuelSessionState {
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
  };
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
