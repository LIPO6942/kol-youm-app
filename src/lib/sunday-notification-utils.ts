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
  type: 'movie' | '5amem';
  suggestedMovieTitle?: string;
}

export interface TmdbMovieInfo {
  title: string;
  originalTitle?: string;
  posterUrl?: string;
  rating?: number;
  year?: number;
  overview?: string;
}

// 🧠 Messages 5amem (Quiz, Énigmes Talla3, Dormir moins bête, Culture Tunisienne)
export const SUNDAY_5AMEM_MESSAGES = [
  {
    title: '🧠 Dormir moins bête : Le secret du Kafteji',
    body: "Pourquoi ce plat mythique s'appelle-t-il ainsi ? Découvre son histoire insolite et teste tes connaissances sur 5amem ! 🇹🇳",
    link: '/5amem?tab=trivia&id=kafteji-origin&sundayNotification=true',
  },
  {
    title: '🏛️ Le saviez-vous ? (Culture Tunisienne)',
    body: "Quelle ville de Tunisie abrite le plus grand amphithéâtre romain d'Afrique ? Viens répondre dans le Quiz de 5amem !",
    link: '/5amem?tab=trivia&id=el-jem-amphitheatre&sundayNotification=true',
  },
  {
    title: '🌸 Pourquoi le Jasmin est notre symbole ?',
    body: "D'où vient cette tradition parfumée en Tunisie ? Découvre l'anecdote historique ce soir sur 5amem !",
    link: '/5amem?tab=trivia&id=jasmin-symbole&sundayNotification=true',
  },
  {
    title: '🏺 Une ruse légendaire à Carthage...',
    body: "Sais-tu comment la reine Didon a fondé Carthage avec une simple peau de bœuf ? Viens faire le quiz 5amem !",
    link: '/5amem?tab=trivia&id=didon-carthage&sundayNotification=true',
  },
  {
    title: '🥖 Énigme du dimanche : Devine le mot !',
    body: "\"Je commence par M, croustillant, beurré, adoré au petit-déj en Tunisie.\" Entre ta réponse dans le jeu Talla3 !",
    link: '/5amem?tab=talla3',
  },
  {
    title: '🌌 Pourquoi le ciel est-il bleu ?',
    body: "Ce n'est pas le reflet de la mer ! Viens découvrir la vraie explication scientifique dans le Quiz de ce dimanche.",
    link: '/5amem?tab=quiz',
  },
  {
    title: '🧠 Gym des neurones avant lundi !',
    body: "Recharge tes batteries cérébrales avec le Quiz Quotidien. 10 questions pour démarrer la semaine au top !",
    link: '/5amem?tab=quiz',
  },
  {
    title: '🏆 Défi Talla3 : Es-tu à la hauteur ?',
    body: "Remets les éléments dans le bon ordre en moins de 15 secondes. Viens tester tes réflexes sur 5amem !",
    link: '/5amem?tab=talla3',
  },
  {
    title: '🎯 Pause culture avant la semaine',
    body: "Quelques minutes pour tester ta culture générale et briller en société. Lance le quiz sur 5amem !",
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
 * Interroge l'API TMDb avec timeout sécurisé pour récupérer
 * l'affiche HD et les détails d'un film ou d'une série.
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
      const timer = setTimeout(() => controller.abort(), 3500);

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
 * Génère un message engageant, chaleureux et séduisant pour un film ou une série
 * issu de la liste "À voir" de l'utilisateur.
 */
export function generateSundayMovieMessage(
  movie: TmdbMovieInfo,
  mediaType: 'movie' | 'tv' = 'movie'
): SundayNotificationPayload {
  const title = movie.title;
  const ratingStr = movie.rating && movie.rating >= 6.5 ? `⭐ ${movie.rating}/10` : '';
  const isSeries = mediaType === 'tv';

  const movieTemplates = [
    {
      title: `🍿 Ce soir : Popcorn devant ${title} ?`,
      body: `Tu l'avais mis de côté dans ta liste... C'est le moment idéal pour enfin le regarder ! Installe-toi bien. ${ratingStr ? `(${ratingStr})` : ''}`.trim(),
    },
    {
      title: `✨ Ton film du dimanche : ${title}`,
      body: `Avant d'attaquer une nouvelle semaine, accorde-toi une pause cinéma bien méritée devant ${title} !`,
    },
    {
      title: `🔥 Alerte pépite dans ta liste à voir !`,
      body: `${title} t'attend sagement dans ta liste. Plaid, boisson chaude et c'est parti pour une bonne séance !`,
    },
    {
      title: `🎬 Soirée ciné : Et si tu lançais ${title} ?`,
      body: `Plus d'excuse pour repousser ! ${title} est prêt pour ton dimanche soir. Bon visionnage !`,
    },
    {
      title: `🛋️ Dimanche cosy devant ${title}`,
      body: `Lumière tamisée, zéro prise de tête et ${title} au programme. Fais chauffer le pop-corn !`,
    },
  ];

  const seriesTemplates = [
    {
      title: `📺 Ce soir : Un épisode de ${title} ?`,
      body: `Tu l'avais ajoutée à ta liste... C'est le moment parfait pour lancer un épisode ce dimanche soir ! ${ratingStr ? `(${ratingStr})` : ''}`.trim(),
    },
    {
      title: `✨ Ta série du dimanche : ${title}`,
      body: `Avant la reprise lundi, détends-toi devant un bon épisode de ${title} !`,
    },
    {
      title: `🛋️ Dimanche cosy devant ${title}`,
      body: `Plaid, canapé et ${title} au programme pour terminer le week-end en beauté !`,
    },
    {
      title: `🔥 Alerte série dans ta liste à voir !`,
      body: `${title} t'attend dans tes séries à voir. Prêt pour ta séance de ce soir ?`,
    },
  ];

  const templates = isSeries ? seriesTemplates : movieTemplates;

  if (movie.rating && movie.rating >= 7.2) {
    templates.push({
      title: `🌟 Coup de cœur de ta liste : ${title} (${ratingStr})`,
      body: `Ce chef-d'œuvre t'attend dans tes ${isSeries ? 'séries' : 'films'} à voir. Ce dimanche soir est l'occasion parfaite pour le savourer !`,
    });
  }

  const chosen = templates[Math.floor(Math.random() * templates.length)];

  return {
    title: chosen.title,
    body: chosen.body,
    link: `/tfarrej?highlight=${encodeURIComponent(title)}&from=sundayNotification&type=${mediaType}`,
    imageUrl: movie.posterUrl,
    type: 'movie',
    suggestedMovieTitle: title,
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
  const normalizeList = (raw: any): { title: string; mediaType: 'movie' | 'tv' }[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(item => {
        let title = '';
        if (typeof item === 'string') {
          title = item.trim();
        } else if (item && typeof item === 'object') {
          title = typeof item.title === 'string' ? item.title.trim() : (typeof item.name === 'string' ? item.name.trim() : '');
        }
        return title;
      })
      .filter(t => t.length > 0 && !t.toLowerCase().startsWith('test') && !t.toLowerCase().includes('titre de test'))
      .map(t => ({ title: t, mediaType: 'movie' as const }));
  };

  const movies = normalizeList(userData.moviesToWatch).map(m => ({ ...m, mediaType: 'movie' as const }));
  const series = normalizeList(userData.seriesToWatch).map(s => ({ ...s, mediaType: 'tv' as const }));

  // Priorité aux films si présents, sinon séries
  const availableItems: { title: string; mediaType: 'movie' | 'tv' }[] = movies.length > 0 ? movies : series;

  // 1. Si aucun film ni série à voir : repli vers le quiz / trivia 5amem
  if (availableItems.length === 0) {
    console.log('[Sunday Notification] Aucun film/série dans la liste à voir -> Envoi Quiz/Culture 5amem');
    return getRandom5amemMessage();
  }

  // 2. L'utilisateur a des films ou séries à voir :
  // On lui envoie TOUJOURS une recommandation de sa liste pour son dimanche soir
  let eligibleItems: { title: string; mediaType: 'movie' | 'tv' }[] = availableItems;
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

  // 3. Récupérer les métadonnées TMDb (affiche HD, note, année)
  const tmdbInfo = await fetchTmdbMovieForNotification(chosen.title, chosen.mediaType);

  // 4. Générer le message séduisant avec l'affiche
  return generateSundayMovieMessage(
    tmdbInfo || { title: chosen.title },
    chosen.mediaType
  );
}
