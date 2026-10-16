/**
 * Place matching and duplicate detection utilities.
 * Handles fuzzy matching, phonetic/orthographic variations, and category stop-words.
 */

export interface SimilarPlaceMatch {
  existingName: string;
  categoryKey: string;
  categoryDisplayName: string;
  isSameCategory: boolean;
  similarityScore: number; // 0 to 100
  reason: string;
}

// Common category words, noise words, and articles frequently prefixed or suffixed to place names
const STOP_WORDS = new Set([
  // Categories & types
  'cafe',
  'cafes',
  'restaurant',
  'restaurants',
  'resto',
  'restos',
  'fastfood',
  'fast-food',
  'fast',
  'food',
  'lounge',
  'bistro',
  'bistrot',
  'bar',
  'bars',
  'pub',
  'salon',
  'the', // salon de the
  'de',
  'du',
  'des',
  'patisserie',
  'pâtisserie',
  'boulangerie',
  'glacier',
  'glacerie',
  'creperie',
  'crêperie',
  'pizzeria',
  'snack',
  'grill',
  'coffee',
  'coffeeshop',
  'shop',
  'tea',
  'house',
  // Articles & prepositions (FR / EN / AR transliterated)
  'le',
  'la',
  'les',
  'el',
  'al',
  'chez',
  'aux',
  'and',
  'et',
]);

/**
 * Remove accents and diacritics from a string.
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Clean and normalize a place name for comparison.
 * - Removes bracketed annotations like "[closed]" or "(Lac 1)"
 * - Lowercases and removes accents
 * - Replaces punctuation with spaces
 * - Removes common category and noise words (e.g. "Café", "Restaurant", "Le", "Chez")
 */
export function normalizePlaceName(name: string, removeStopWords: boolean = true): string {
  if (!name) return '';

  // 1. Remove bracketed or parenthesized extra info: e.g. "Place [closed]" or "Place (new)"
  let cleaned = name.replace(/\[.*?\]|\(.*?\)/g, ' ');

  // 2. Lowercase and de-accent
  cleaned = removeAccents(cleaned.toLowerCase());

  // 3. Replace symbols, dashes, apostrophes, quotes, and punctuation with spaces
  cleaned = cleaned.replace(/[^a-z0-9]/g, ' ');

  // 4. Split into words
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (!removeStopWords) {
    return words.join(' ');
  }

  // 5. Filter out stop words if there are other distinguishing words left
  const filteredWords = words.filter(w => !STOP_WORDS.has(w));

  // If filtering removed everything (e.g. place was just called "Le Café"), keep original words
  return (filteredWords.length > 0 ? filteredWords : words).join(' ');
}

/**
 * Calculate standard Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Similarity ratio based on Levenshtein distance (0 to 1).
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Word token overlap (Jaccard index between words).
 */
export function tokenOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 1));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  wordsA.forEach(w => {
    if (wordsB.has(w)) intersection++;
  });

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compares two place names and checks if they represent the same place with high probability.
 */
export function comparePlaces(
  inputName: string,
  existingName: string
): { isMatch: boolean; score: number; reason: string } {
  const rawA = inputName.trim();
  const rawB = existingName.trim();

  // 1. Exact raw match (case-insensitive)
  if (rawA.toLowerCase() === rawB.toLowerCase()) {
    return { isMatch: true, score: 100, reason: 'Nom exactement identique' };
  }

  // 2. Normalized without stop words removed (handles accents, spaces, punctuation like "Plan B" vs "Plan-B")
  const normA = normalizePlaceName(rawA, false);
  const normB = normalizePlaceName(rawB, false);

  if (normA && normB && normA === normB) {
    return { isMatch: true, score: 98, reason: 'Orthographe identique (accents / ponctuation)' };
  }

  // 3. Normalized with stop words removed (handles "Café Journal" vs "Le Journal")
  const cleanA = normalizePlaceName(rawA, true);
  const cleanB = normalizePlaceName(rawB, true);

  if (cleanA && cleanB && cleanA === cleanB) {
    return { isMatch: true, score: 95, reason: 'Identique sans les préfixes (ex: Café, Restaurant, Le/La)' };
  }

  // 4. One is a substring of the other (e.g. "Origami" and "Origami Sushi Bar")
  // Only apply if the shorter string has meaningful length (>= 4 characters)
  if (cleanA.length >= 4 && cleanB.length >= 4) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
      return { isMatch: true, score: 90, reason: 'Contient le même nom principal' };
    }
  }

  // 5. Fuzzy string similarity with Levenshtein on cleaned names
  if (cleanA && cleanB) {
    const minLen = Math.min(cleanA.length, cleanB.length);
    // For very short names (<= 3 chars like "Wok"), require almost exact match
    const threshold = minLen <= 3 ? 0.95 : minLen <= 5 ? 0.82 : 0.76;
    const sim = stringSimilarity(cleanA, cleanB);

    if (sim >= threshold) {
      return {
        isMatch: true,
        score: Math.round(sim * 100),
        reason: `Écriture très proche (${Math.round(sim * 100)}% de ressemblance)`,
      };
    }
  }

  // 6. Token overlap (e.g. multi-word places reordered or with extra word)
  const overlap = tokenOverlap(cleanA, cleanB);
  if (overlap >= 0.6) {
    return {
      isMatch: true,
      score: Math.round(overlap * 100),
      reason: 'Partage les mêmes mots-clés',
    };
  }

  return { isMatch: false, score: 0, reason: '' };
}

/**
 * Searches for a similar place within an entire zone across all its categories.
 */
export function findSimilarPlaceInZone(
  newPlaceName: string,
  zoneCategories: Record<string, string[] | undefined>,
  targetCategory?: string,
  categoryNamesMap: Record<string, string> = {
    cafes: 'Cafés',
    restaurants: 'Restaurants',
    fastFoods: 'Fast Food',
    brunch: 'Brunch',
    kharjet: 'Kharjet',
    balade: 'Kharjet',
    shopping: 'Shopping',
    cinemas: 'Cinémas',
  }
): SimilarPlaceMatch | null {
  if (!newPlaceName || !newPlaceName.trim() || !zoneCategories) {
    return null;
  }

  const trimmed = newPlaceName.trim();
  let bestMatch: SimilarPlaceMatch | null = null;

  for (const [categoryKey, placesList] of Object.entries(zoneCategories)) {
    if (!Array.isArray(placesList)) continue;

    const isCurrentCat = targetCategory
      ? categoryKey.toLowerCase() === targetCategory.toLowerCase()
      : false;

    for (const existingPlace of placesList) {
      if (!existingPlace || typeof existingPlace !== 'string') continue;

      const result = comparePlaces(trimmed, existingPlace);
      if (result.isMatch) {
        const matchItem: SimilarPlaceMatch = {
          existingName: existingPlace,
          categoryKey,
          categoryDisplayName: categoryNamesMap[categoryKey] || categoryKey,
          isSameCategory: isCurrentCat,
          similarityScore: result.score,
          reason: result.reason,
        };

        // Prioritize:
        // 1. Higher similarity score
        // 2. If equal score, prioritize the same category
        if (
          !bestMatch ||
          matchItem.similarityScore > bestMatch.similarityScore ||
          (matchItem.similarityScore === bestMatch.similarityScore && matchItem.isSameCategory && !bestMatch.isSameCategory)
        ) {
          bestMatch = matchItem;
        }

        // Perfect match in the same category can return immediately
        if (bestMatch.similarityScore === 100 && bestMatch.isSameCategory) {
          return bestMatch;
        }
      }
    }
  }

  return bestMatch;
}
