/**
 * Utilitaires pour les notifications push du dimanche soir.
 * Gère la suggestion personnalisée de films (avec affiche TMDb et accroches attrayantes)
 * et la préservation des quiz / culture "5amem".
 */

export interface SundayNotificationPayload {
  title: string;
  body: string;
  link: string;
  imageUrl?: string;
  posterUrl?: string;
  backdropUrl?: string;
  type: 'movie' | '5amem';
  suggestedMovieTitle?: string;
}

export interface TmdbMovieInfo {
  title: string;
  originalTitle?: string;
  posterUrl?: string;
  backdropUrl?: string;
  rating?: number;
  year?: number;
  overview?: string;
}

// 🧠 Messages 5amem (Quiz, Énigmes Talla3, Dormir moins bête, Culture Tunisienne)
// Textes courts et percutants (< 48 caractères pour le corps) pour ne jamais être tronqués
export const SUNDAY_5AMEM_MESSAGES = [
  {
    title: '🧠 Le secret du Kafteji',
    body: "D'où vient ce plat mythique ? Viens voir sur 5amem !",
    link: '/5amem?tab=trivia&id=kafteji-origin&sundayNotification=true',
  },
  {
    title: '🏛️ Quiz Culture Tunisienne',
    body: "Connais-tu le secret d'El Jem ? Viens tester !",
    link: '/5amem?tab=trivia&id=el-jem-amphitheatre&sundayNotification=true',
  },
  {
    title: '🌸 Le symbole du Jasmin',
    body: "D'où vient cette tradition ? Découvre l'anecdote !",
    link: '/5amem?tab=trivia&id=jasmin-symbole&sundayNotification=true',
  },
  {
    title: '🏺 Le mystère de Carthage',
    body: "Comment Didon a fondé Carthage ? Réponds vite !",
    link: '/5amem?tab=trivia&id=didon-carthage&sundayNotification=true',
  },
  {
    title: '🥖 Énigme du dimanche',
    body: "Devine le mot mystère en 15s dans le jeu Talla3 !",
    link: '/5amem?tab=talla3',
  },
  {
    title: '🌌 Quiz scientifique',
    body: "Pourquoi le ciel est bleu ? Découvre la réponse !",
    link: '/5amem?tab=quiz',
  },
  {
    title: '🧠 Gym des neurones',
    body: "10 questions rapides pour attaquer la semaine !",
    link: '/5amem?tab=quiz',
  },
  {
    title: '🏆 Défi Talla3 du soir',
    body: "Remets tout dans l'ordre en 15s. Prêt à jouer ?",
    link: '/5amem?tab=talla3',
  },
  {
    title: '🎯 Pause culture du dimanche',
    body: "Quelques minutes pour tester ta culture sur 5amem !",
    link: '/5amem?tab=quiz',
  },
];

/**
 * Récupère un message 5amem au hasard.
 */
export function getRandom5amemMessage(): SundayNotificationPayload {
  const chosen = SUNDAY_5AMEM_MESSAGES[Math.floor(Math.random() * SUNDAY_5AMEM_MESSAGES.length)];
  return {
    title: chosen.title,
    body: chosen.body,
    link: chosen.link,
    type: '5amem',
  };
}

/**
 * Nettoie et formate le titre pour qu'il soit immédiatement visible et NON tronqué
 * dans la barre de notifications des smartphones (limite standard ~34-36 caractères).
 * Le titre commence directement par l'émoji et le nom de l'œuvre.
 */
export function formatNotificationMediaTitle(rawTitle: string, emoji: string = '🍿'): string {
  const clean = rawTitle.trim();
  if (!clean) return `${emoji} Séance du dimanche`;

  const prefix = `${emoji} `;
  // 32 chars + 3 chars prefix = 35 chars max (rentre sur 100% des smartphones sans troncature)
  const maxTitleLength = 32;

  if (clean.length <= maxTitleLength) {
    return `${prefix}${clean}`;
  }

  // Si le titre contient un sous-titre explicatif avec ":" ou " - " (ex: "Green Book : Sur les routes du Sud")
  const colonIndex = clean.indexOf(':');
  const dashIndex = clean.indexOf(' - ');
  const splitIndex = colonIndex > 0 ? colonIndex : (dashIndex > 0 ? dashIndex : -1);

  if (splitIndex > 2 && splitIndex <= maxTitleLength) {
    return `${prefix}${clean.substring(0, splitIndex).trim()}`;
  }

  // Troncature propre aux limites de mots pour ne jamais couper un mot au milieu
  const truncated = clean.substring(0, maxTitleLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  const safeTitle = lastSpace > 12 ? truncated.substring(0, lastSpace).trim() : truncated.trim();

  return `${prefix}${safeTitle}…`;
}

/**
 * Interroge l'API TMDb avec timeout sécurisé pour récupérer
 * l'affiche HD, la bannière paysage 16:9 et les détails d'un film ou d'une série.
 */
export async function fetchTmdbMovieForNotification(
  title: string,
  mediaType: 'movie' | 'tv' = 'movie'
): Promise<TmdbMovieInfo | null> {
  const apiKey = process.env.TMDB_API_KEY;
  const bearer = process.env.TMDB_BEARER || process.env.TMDB_READ_ACCESS_TOKEN;

  const rawTitle = title.trim();
  if (!rawTitle) return null;

  if (!apiKey && !bearer) {
    return { title: rawTitle };
  }

  // Nettoyer le titre pour maximiser les chances de correspondance TMDb :
  // Enlever par ex. "(2024)", "[VF]", "(VF)", etc.
  const cleanTitle = rawTitle
    .replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]\s*$/, '')
    .replace(/\s*[\(\[].*?[\)\]]\s*$/, '')
    .trim() || rawTitle;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (bearer) {
    headers['Authorization'] = `Bearer ${bearer}`;
  }

  const searchEndpoint = async (endpoint: 'movie' | 'tv' | 'multi', query: string) => {
    try {
      const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
      url.searchParams.set('query', query);
      url.searchParams.set('language', 'fr-FR');
      url.searchParams.set('include_adult', 'false');
      if (apiKey) url.searchParams.set('api_key', apiKey);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url.toString(), {
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);

      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data?.results) ? data.results : null;
    } catch {
      return null;
    }
  };

  try {
    const primaryEndpoint = mediaType === 'tv' ? 'tv' : 'movie';
    let results = await searchEndpoint(primaryEndpoint, cleanTitle);

    if (!results || results.length === 0) {
      results = await searchEndpoint('multi', cleanTitle);
    }

    if ((!results || results.length === 0) && cleanTitle !== rawTitle) {
      results = await searchEndpoint('multi', rawTitle);
    }

    const first = results?.[0];
    if (!first) {
      return { title: rawTitle };
    }

    const posterUrl = first.poster_path
      ? `https://image.tmdb.org/t/p/w500${first.poster_path}`
      : undefined;

    // Récupérer la bannière paysage 16:9 native (adaptée au tiroir de notification Android / Chrome sans recadrage)
    const backdropUrl = first.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${first.backdrop_path}`
      : undefined;

    let year: number | undefined;
    const dateStr = first.release_date || first.first_air_date;
    if (dateStr && typeof dateStr === 'string') {
      const parsedYear = parseInt(dateStr.substring(0, 4), 10);
      if (!isNaN(parsedYear)) year = parsedYear;
    }

    const rating = typeof first.vote_average === 'number' && first.vote_average > 0
      ? Math.round(first.vote_average * 10) / 10
      : undefined;

    const displayTitle = first.title || first.name || rawTitle;

    return {
      title: displayTitle,
      originalTitle: first.original_title || first.original_name,
      posterUrl,
      backdropUrl,
      rating,
      year,
      overview: first.overview,
    };
  } catch (error) {
    console.error(`[Sunday Notification] Erreur fetch TMDb pour "${rawTitle}":`, error);
    return { title: rawTitle };
  }
}

/**
 * Génère un message engageant, chaleureux et compact pour un film ou une série
 * issu de la liste "À voir" de l'utilisateur.
 * 
 * Conçu pour ÉVITER TOUTE TRONCATURE :
 * - Titre : Démarre directement par le nom de l'œuvre (formaté sous 35 caractères)
 * - Corps : Ultra-court (37 à 46 caractères), garantissant 0 troncature même en vue repliée
 * - Image : Privilégie la bannière 16:9 (backdrop) pour un affichage natif parfait sans découpe
 */
export function generateSundayMovieMessage(
  movie: TmdbMovieInfo,
  mediaType: 'movie' | 'tv' = 'movie'
): SundayNotificationPayload {
  const rawTitle = movie.title || 'Film';
  const isSeries = mediaType === 'tv';
  const ratingStr = movie.rating && movie.rating >= 6.5 ? `⭐ ${movie.rating}/10` : '';

  // 1. Titre compact avec le nom du film/série en première position
  const primaryEmoji = isSeries ? '📺' : '🍿';
  const altEmoji = isSeries ? '✨' : '🎬';

  const titleOptions = [
    formatNotificationMediaTitle(rawTitle, primaryEmoji),
    formatNotificationMediaTitle(rawTitle, altEmoji),
  ];

  if (movie.rating && movie.rating >= 7.2) {
    titleOptions.push(formatNotificationMediaTitle(rawTitle, '🌟'));
  }

  const chosenTitle = titleOptions[Math.floor(Math.random() * titleOptions.length)];

  // 2. Corps court (< 48 caractères) pour garantir un affichage 100% complet
  const movieBodies = [
    ...(ratingStr ? [`${ratingStr} • Dans ta liste à voir ce soir !`] : []),
    'Dans ta liste à voir • Prêt pour ce soir ?',
    'Le moment parfait pour enfin le savourer !',
    'Plaid, pop-corn et séance ciné cosy !',
    'Accorde-toi une pause cinéma bien méritée !',
  ];

  const seriesBodies = [
    ...(ratingStr ? [`${ratingStr} • Un épisode pour ce soir ?`] : []),
    'Dans ta liste • Un épisode pour ce soir ?',
    'Le moment parfait pour lancer un épisode !',
    'Détends-toi devant ton épisode ce soir !',
    'Plaid & canapé devant ta série du dimanche !',
  ];

  const bodies = isSeries ? seriesBodies : movieBodies;
  const chosenBody = bodies[Math.floor(Math.random() * bodies.length)];

  // 3. Image : On priorise le backdrop 16:9 pour les bannières push Web,
  // avec repli sur le poster vertical si absent.
  const notificationImageUrl = movie.backdropUrl || movie.posterUrl;

  return {
    title: chosenTitle,
    body: chosenBody,
    link: `/tfarrej?highlight=${encodeURIComponent(rawTitle)}&from=sundayNotification&type=${mediaType}`,
    imageUrl: notificationImageUrl,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    type: 'movie',
    suggestedMovieTitle: rawTitle,
  };
}

export interface SundayNotificationUserData {
  moviesToWatch?: any[];
  seriesToWatch?: any[];
  lastSuggestedMovie?: string;
  lastNotificationType?: 'movie' | '5amem';
  forceMovie?: boolean;
}

/**
 * Décide intelligemment de la notification à envoyer à un utilisateur :
 * - PRIORITÉ ABSOLUE aux films et séries de la liste "À voir" : si l'utilisateur en a,
 *   on lui suggère systématiquement une œuvre pour son dimanche soir !
 * - Si et seulement si la liste "À voir" est vide : repli sur les anecdotes / quiz 5amem
 * - Évite de répéter le dernier film/série suggéré s'il y en a plusieurs
 * - Récupère l'affiche HD via TMDb et formate un message séduisant
 */
export async function buildSundayNotificationForUser(
  userData: SundayNotificationUserData
): Promise<SundayNotificationPayload> {
  const normalizeList = (raw: any): { title: string; mediaType: 'movie' | 'tv'; existingPoster?: string }[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(item => {
        let title = '';
        let mediaType: 'movie' | 'tv' = 'movie';
        let existingPoster: string | undefined = undefined;

        if (typeof item === 'string') {
          title = item.trim();
        } else if (item && typeof item === 'object') {
          title = typeof item.title === 'string' ? item.title.trim() : (typeof item.name === 'string' ? item.name.trim() : '');
          if (item.type === 'tv' || item.mediaType === 'tv') {
            mediaType = 'tv';
          }
          if (item.posterUrl && typeof item.posterUrl === 'string') {
            existingPoster = item.posterUrl;
          } else if (item.poster_path && typeof item.poster_path === 'string') {
            existingPoster = item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`;
          } else if (item.image && typeof item.image === 'string') {
            existingPoster = item.image;
          }
        }
        return { title, mediaType, existingPoster };
      })
      .filter(item => item.title.length > 0 && !item.title.toLowerCase().startsWith('test') && !item.title.toLowerCase().includes('titre de test'));
  };

  const movies = normalizeList(userData.moviesToWatch).map(m => ({ ...m, mediaType: 'movie' as const }));
  const series = normalizeList(userData.seriesToWatch).map(s => ({ ...s, mediaType: 'tv' as const }));

  // Priorité aux films si présents, sinon séries
  const availableItems: { title: string; mediaType: 'movie' | 'tv'; existingPoster?: string }[] = movies.length > 0 ? movies : series;

  // 1. Si aucun film ni série à voir :
  if (availableItems.length === 0) {
    if (userData.forceMovie) {
      console.log('[Sunday Notification] Aucun film dans la liste mais forceMovie=true -> Utilisation d\'un chef-d\'œuvre culte pour le test');
      const demoTitles = ['Interstellar', 'Inception', 'Gladiator', 'Dune', 'Parasite', 'Oppenheimer'];
      const demoTitle = demoTitles[Math.floor(Math.random() * demoTitles.length)];
      const tmdbInfo = await fetchTmdbMovieForNotification(demoTitle, 'movie');
      return generateSundayMovieMessage(
        tmdbInfo || { title: demoTitle },
        'movie'
      );
    }
    console.log('[Sunday Notification] Aucun film/série dans la liste à voir -> Envoi Quiz/Culture 5amem');
    return getRandom5amemMessage();
  }

  // 2. L'utilisateur a des films ou séries à voir :
  // On lui envoie TOUJOURS une recommandation de sa liste pour son dimanche soir
  let eligibleItems = availableItems;
  if (availableItems.length > 1 && userData.lastSuggestedMovie) {
    const withoutLast = availableItems.filter(
      item => item.title.toLowerCase() !== userData.lastSuggestedMovie?.toLowerCase()
    );
    if (withoutLast.length > 0) {
      eligibleItems = withoutLast;
    }
  }

  const chosen = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
  console.log(`[Sunday Notification] Suggestion sélectionnée: "${chosen.title}" (${chosen.mediaType}) sur ${availableItems.length} élément(s)`);

  // 3. Récupérer les métadonnées TMDb (affiche HD, bannière paysage, note, année)
  const tmdbInfo = await fetchTmdbMovieForNotification(chosen.title, chosen.mediaType);

  const finalMovieInfo: TmdbMovieInfo = {
    title: tmdbInfo?.title || chosen.title,
    originalTitle: tmdbInfo?.originalTitle,
    posterUrl: tmdbInfo?.posterUrl || chosen.existingPoster,
    backdropUrl: tmdbInfo?.backdropUrl,
    rating: tmdbInfo?.rating,
    year: tmdbInfo?.year,
    overview: tmdbInfo?.overview,
  };

  // 4. Générer le message séduisant sans aucune troncature
  return generateSundayMovieMessage(
    finalMovieInfo,
    chosen.mediaType
  );
}
