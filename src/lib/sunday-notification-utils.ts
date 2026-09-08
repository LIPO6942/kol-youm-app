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
 * l'affiche HD et les détails d'un film.
 */
export async function fetchTmdbMovieForNotification(title: string): Promise<TmdbMovieInfo | null> {
  const apiKey = process.env.TMDB_API_KEY;
  const bearer = process.env.TMDB_READ_ACCESS_TOKEN;

  if (!apiKey && !bearer) {
    return { title };
  }

  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  try {
    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('query', cleanTitle);
    url.searchParams.set('language', 'fr-FR');
    url.searchParams.set('include_adult', 'false');
    if (apiKey) url.searchParams.set('api_key', apiKey);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (bearer) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }

    // Timeout de 3.5s max pour ne pas bloquer le cron
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[Sunday Notification] TMDb search returned ${res.status} for "${cleanTitle}"`);
      return { title: cleanTitle };
    }

    const data = await res.json();
    const first = data.results?.[0];

    if (!first) {
      return { title: cleanTitle };
    }

    const posterUrl = first.poster_path
      ? `https://image.tmdb.org/t/p/w500${first.poster_path}`
      : undefined;

    let year: number | undefined;
    if (first.release_date) {
      const parsedYear = parseInt(first.release_date.substring(0, 4), 10);
      if (!isNaN(parsedYear)) year = parsedYear;
    }

    const rating = typeof first.vote_average === 'number' && first.vote_average > 0
      ? Math.round(first.vote_average * 10) / 10
      : undefined;

    return {
      title: cleanTitle,
      originalTitle: first.original_title,
      posterUrl,
      rating,
      year,
      overview: first.overview,
    };
  } catch (error) {
    console.error(`[Sunday Notification] Erreur fetch TMDb pour "${cleanTitle}":`, error);
    return { title: cleanTitle };
  }
}

/**
 * Génère un message engageant, chaleureux et séduisant pour un film
 * issu de la liste "À voir" de l'utilisateur.
 */
export function generateSundayMovieMessage(movie: TmdbMovieInfo): SundayNotificationPayload {
  const title = movie.title;
  const ratingStr = movie.rating && movie.rating >= 6.5 ? `⭐ ${movie.rating}/10` : '';

  // Bibliothèque de templates variés et séduisants spécial dimanche soir
  const templates = [
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

  // Si le film est particulièrement bien noté, on ajoute un template élogieux
  if (movie.rating && movie.rating >= 7.2) {
    templates.push({
      title: `🌟 Coup de cœur de ta liste : ${title} (${ratingStr})`,
      body: `Ce chef-d'œuvre t'attend dans tes films à voir. Ce dimanche soir est l'occasion parfaite pour le savourer !`,
    });
  }

  const chosen = templates[Math.floor(Math.random() * templates.length)];

  return {
    title: chosen.title,
    body: chosen.body,
    link: `/tfarrej?highlight=${encodeURIComponent(title)}&from=sundayNotification`,
    imageUrl: movie.posterUrl,
    type: 'movie',
    suggestedMovieTitle: title,
  };
}

/**
 * Décide intelligemment de la notification à envoyer à un utilisateur :
 * - Alterne ou équilibre entre suggestion de Film (watchlist + TMDb) et Quiz 5amem
 * - Si la liste "À voir" est vide : 100% 5amem
 * - Si la liste contient des films : tire un film non récemment suggéré et récupère son affiche TMDb
 */
export async function buildSundayNotificationForUser(userData: {
  moviesToWatch?: string[];
  lastSuggestedMovie?: string;
  lastNotificationType?: 'movie' | '5amem';
}): Promise<SundayNotificationPayload> {
  const rawWatchlist = Array.isArray(userData.moviesToWatch) ? userData.moviesToWatch : [];
  const validMovies = rawWatchlist
    .map(t => (typeof t === 'string' ? t.trim() : ''))
    .filter(t => t.length > 0 && !t.toLowerCase().startsWith('test'));

  // 1. Si aucun film à voir : toujours envoyer un quiz / trivia 5amem
  if (validMovies.length === 0) {
    return getRandom5amemMessage();
  }

  // 2. Alternance intelligente :
  // Si le dernier type envoyé était un film, on peut privilégier 5amem pour varier,
  // ou faire un tirage aléatoire 50/50 pour que le contenu reste vivant et varié.
  const prefer5amem = userData.lastNotificationType === 'movie';
  const shouldSend5amem = prefer5amem ? Math.random() < 0.65 : Math.random() < 0.35;

  if (shouldSend5amem) {
    return getRandom5amemMessage();
  }

  // 3. Choix d'un film dans la watchlist (en évitant le dernier suggéré si possible)
  let eligibleMovies = validMovies;
  if (validMovies.length > 1 && userData.lastSuggestedMovie) {
    const withoutLast = validMovies.filter(
      t => t.toLowerCase() !== userData.lastSuggestedMovie?.toLowerCase()
    );
    if (withoutLast.length > 0) {
      eligibleMovies = withoutLast;
    }
  }

  const chosenTitle = eligibleMovies[Math.floor(Math.random() * eligibleMovies.length)];

  // 4. Récupérer les métadonnées TMDb (affiche HD + note)
  const tmdbInfo = await fetchTmdbMovieForNotification(chosenTitle);

  // 5. Générer le message séduisant
  return generateSundayMovieMessage(tmdbInfo || { title: chosenTitle });
}
