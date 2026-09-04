export type DuelMovieItem = {
  title: string;
  posterUrl?: string;
  year?: number;
  rating?: number;
  watchedInCinema?: boolean;
  cinemaPlace?: string;
  viewedAt?: number;
  genres?: string[];
};

export type RankMovement = {
  title: string;
  currentRank: number; // 1-indexed (1 = Top 1)
  previousRank?: number; // 1-indexed
  diff: number; // +1 if climbed, -1 if fell, 0 if same
  isNew: boolean;
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
 * Initialise une session de duel complète (Tri de 0).
 */
export function createInitialDuelSession(movies: DuelMovieItem[]): DuelSessionState {
  const catalog: Record<string, DuelMovieItem> = {};
  movies.forEach(m => { catalog[m.title] = m; });

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
    };
  }

  const sortedTitles = [movies[0].title];
  const pendingItems = movies.slice(1);
  const currentCandidate = pendingItems[0];
  const remainingPending = pendingItems.slice(1);

  const low = 0;
  const high = sortedTitles.length - 1;
  const mid = Math.floor((low + high) / 2);
  const movieB = catalog[sortedTitles[mid]] || { title: sortedTitles[mid] };

  const estimatedTotal = estimateComparisons(1, movies.length - 1);

  return {
    mode: 'initial',
    sortedTitles,
    pendingItems: remainingPending,
    currentCandidate,
    low,
    high,
    mid,
    activeDuel: {
      movieA: currentCandidate,
      movieB,
    },
    history: [],
    stepNumber: 1,
    estimatedTotalSteps: estimatedTotal,
    isFinished: false,
    initialRankedTitles: [],
    newlyAddedTitles: [],
    movieCatalog: catalog,
  };
}

/**
 * Initialise une session de duel incrémentale :
 * Affronte de nouveaux films contre un classement déjà établi.
 */
export function createIncrementalDuelSession(
  existingRankedTitles: string[],
  newMovies: DuelMovieItem[],
  existingCatalog?: Record<string, DuelMovieItem>
): DuelSessionState {
  const catalog: Record<string, DuelMovieItem> = { ...(existingCatalog || {}) };
  newMovies.forEach(m => { catalog[m.title] = m; });

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
    };
  }

  const sortedTitles = [...existingRankedTitles];
  const currentCandidate = newMovies[0];
  const remainingPending = newMovies.slice(1);

  const low = 0;
  const high = sortedTitles.length - 1;
  const mid = Math.max(0, Math.floor((low + high) / 2));
  const movieB = catalog[sortedTitles[mid]] || { title: sortedTitles[mid] };

  const estimatedTotal = estimateComparisons(existingRankedTitles.length, newMovies.length);

  return {
    mode: 'incremental',
    sortedTitles,
    pendingItems: remainingPending,
    currentCandidate,
    low,
    high,
    mid,
    activeDuel: {
      movieA: currentCandidate,
      movieB,
    },
    history: [],
    stepNumber: 1,
    estimatedTotalSteps: estimatedTotal,
    isFinished: false,
    initialRankedTitles: [...existingRankedTitles],
    newlyAddedTitles: [],
    movieCatalog: catalog,
  };
}

/**
 * Traite le choix de l'utilisateur dans le duel actif.
 * winner = 'candidate' signifie que movieA (le film en cours d'insertion) est jugé MEILLEUR que movieB.
 * winner = 'reference' signifie que movieB (le film déjà positionné) est jugé MEILLEUR.
 */
export function processDuelDecision(
  state: DuelSessionState,
  winner: 'candidate' | 'reference'
): DuelSessionState {
  if (state.isFinished || !state.currentCandidate || !state.activeDuel) {
    return state;
  }

  // Enregistrer le snapshot pour l'annulation (Undo)
  const snapshot: DuelHistorySnapshot = {
    sortedTitles: [...state.sortedTitles],
    pendingItems: [...state.pendingItems],
    currentCandidate: state.currentCandidate,
    low: state.low,
    high: state.high,
    mid: state.mid,
    stepNumber: state.stepNumber,
    newlyAddedTitles: [...state.newlyAddedTitles],
  };

  let low = state.low;
  let high = state.high;
  const mid = state.mid;

  if (winner === 'candidate') {
    // Le candidat est MEILLEUR que sorted[mid] -> il doit se placer avant (index plus bas)
    high = mid - 1;
  } else {
    // Le candidat est MOINS BON que sorted[mid] -> il doit se placer après (index plus haut)
    low = mid + 1;
  }

  // Vérifier si la recherche dichotomique pour ce candidat est terminée
  if (low <= high) {
    // Prochaine comparaison pour ce candidat
    const nextMid = Math.floor((low + high) / 2);
    const movieB = state.movieCatalog[state.sortedTitles[nextMid]] || { title: state.sortedTitles[nextMid] };

    return {
      ...state,
      low,
      high,
      mid: nextMid,
      activeDuel: {
        movieA: state.currentCandidate,
        movieB,
      },
      history: [...state.history, snapshot],
      stepNumber: state.stepNumber + 1,
    };
  }

  // Le candidat a trouvé sa position exacte !
  const insertionIndex = low;
  const newSortedTitles = [...state.sortedTitles];
  newSortedTitles.splice(insertionIndex, 0, state.currentCandidate.title);

  const updatedNewlyAdded = state.mode === 'incremental'
    ? Array.from(new Set([...state.newlyAddedTitles, state.currentCandidate.title]))
    : state.newlyAddedTitles;

  // Reste-t-il d'autres films à insérer ?
  if (state.pendingItems.length > 0) {
    const nextCandidate = state.pendingItems[0];
    const remainingPending = state.pendingItems.slice(1);
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
    };
  }

  // Tournoi / classement terminé avec succès !
  return {
    ...state,
    sortedTitles: newSortedTitles,
    pendingItems: [],
    currentCandidate: null,
    activeDuel: null,
    history: [...state.history, snapshot],
    isFinished: true,
    newlyAddedTitles: updatedNewlyAdded,
  };
}

/**
 * Annule le dernier choix de duel (Undo).
 */
export function undoDuelDecision(state: DuelSessionState): DuelSessionState {
  if (state.history.length === 0) return state;

  const previous = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);

  let activeDuel = null;
  if (previous.currentCandidate) {
    const movieB = state.movieCatalog[previous.sortedTitles[previous.mid]] || {
      title: previous.sortedTitles[previous.mid],
    };
    activeDuel = {
      movieA: previous.currentCandidate,
      movieB,
    };
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
  };
}

/**
 * Calcule les déplacements de classement (monte, descend, stable, nouveau)
 * pour animer visuellement le reclassement.
 */
export function calculateRankMovements(
  initialRanked: string[] = [],
  currentRanked: string[] = [],
  newTitles: string[] = []
): RankMovement[] {
  const initialMap = new Map<string, number>();
  (initialRanked || []).forEach((title, index) => {
    if (title) initialMap.set(title, index + 1); // 1-indexed
  });

  const newSet = new Set(newTitles || []);

  return (currentRanked || []).map((title, index) => {
    const currentRank = index + 1;
    const isNew = newSet.has(title) || !initialMap.has(title);
    const previousRank = initialMap.get(title);

    let diff = 0;
    if (previousRank !== undefined) {
      // Si previousRank était 3 et currentRank est 1: diff = +2 (gagné 2 places)
      // Si previousRank était 1 et currentRank est 2: diff = -1 (perdu 1 place)
      diff = previousRank - currentRank;
    }

    return {
      title,
      currentRank,
      previousRank,
      diff,
      isNew,
    };
  });
}

/**
 * Écarte le candidat actuel s'il a été marqué par erreur comme vu (ou retiré par l'utilisateur).
 * Passe immédiatement au prochain film en attente sans insérer le candidat écarté.
 */
export function dismissCandidate(state: DuelSessionState): DuelSessionState {
  if (state.isFinished || !state.currentCandidate) return state;

  const dismissedTitle = state.currentCandidate.title;
  const newCatalog = { ...state.movieCatalog };
  delete newCatalog[dismissedTitle];

  // Reste-t-il d'autres films à insérer ?
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

  // Aucun autre film en attente : terminer la session
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
