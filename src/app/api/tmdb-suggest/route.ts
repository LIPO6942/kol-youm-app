import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'

function mapCountryLabelToCode(label: string): string | null {
  const map: Record<string, string> = {
    'France': 'FR',
    'Italie': 'IT',
    'Tunisie': 'TN',
    'Égypte': 'EG',
    'Egypte': 'EG',
    'Corée du Sud': 'KR',
    'Coree du Sud': 'KR',
    'Japon': 'JP',
    'Allemagne': 'DE',
    'Espagne': 'ES',
    'Maroc': 'MA',
    'Inde': 'IN',
    'Turquie': 'TR',
    'Canada': 'CA',
    'Mexique': 'MX',
    'Brésil': 'BR',
    'Bresil': 'BR',
    'Chine': 'CN',
    'États-Unis': 'US',
    'Etats-Unis': 'US',
    'Angleterre': 'GB',
    'Royaume-Uni': 'GB',
    'United States': 'US',
    'United Kingdom': 'GB',
  }
  return map[label] || null
}

// Search TMDB by title and optional year to resolve rating and IDs
async function searchTmdbByTitle(
  apiKeyOrBearer: { apiKey?: string; bearer?: string },
  title: string,
  type: 'movie' | 'tv' = 'movie',
  year?: number,
  language: string = 'fr-FR'
): Promise<any | null> {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = new URL(`${TMDB_API_BASE}/search/${endpoint}`)
    url.searchParams.set('language', language)
    url.searchParams.set('query', title)
    if (year && Number.isFinite(year)) {
      const yearKey = type === 'movie' ? 'year' : 'first_air_date_year';
      url.searchParams.set(yearKey, String(year))
    }
    if (apiKeyOrBearer.apiKey) url.searchParams.set('api_key', apiKeyOrBearer.apiKey)
    const headers: Record<string, string> = {}
    if (apiKeyOrBearer.bearer) headers['Authorization'] = `Bearer ${apiKeyOrBearer.bearer}`
    const res = await fetch(url.toString(), { cache: 'no-store', headers })
    if (!res.ok) return null
    const data = await res.json()
    const results = Array.isArray(data?.results) ? data.results : []
    return results[0] || null
  } catch {
    return null
  }
}

// Wikipedia REST summary for a page title
async function getWikipediaSummary(lang: 'fr' | 'en', title: string): Promise<{ extract?: string; url?: string } | null> {
  try {
    const page = encodeURIComponent(title.replace(/\s/g, '_'))
    const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${page}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const url = data?.content_urls?.desktop?.page || data?.content_urls?.mobile?.page || `https://${lang}.wikipedia.org/wiki/${page}`
    return { extract: data?.extract, url }
  } catch {
    return null
  }
}

// Collect extra suggestions derived from Wikipedia, enriched via TMDB (to ensure rating >= 6)
async function collectWikipediaSuggestions(params: {
  apiKey?: string,
  bearer?: string,
  type?: 'movie' | 'tv',
  genre?: string,
  yearRange: [number, number],
  count: number,
  excludeTitles: Set<string>,
}): Promise<any[]> {
  const { apiKey, bearer, type = 'movie', genre, yearRange, count, excludeTitles } = params
  const [yMin, yMax] = yearRange
  const maxTries = Math.max(count * 3, 10)
  const picks: any[] = []
  const tried = new Set<string>()
  const rndYear = () => Math.floor(yMin + Math.random() * (Math.max(yMax, yMin) - yMin + 1))
  const langs: Array<'fr' | 'en'> = ['fr', 'en']
  const term = type === 'movie' ? 'film' : 'série télévisée';
  const tryQueries = (titleLike: string, year: number) => [
    `${titleLike} (${year}) ${term}`,
    `${titleLike} ${term} (${year})`,
    `${titleLike} ${term}`,
    `${titleLike}`,
  ]
  let attempts = 0
  while (picks.length < count && attempts < maxTries) {
    attempts++
    const year = rndYear()
    for (const lang of langs) {
      const queries = tryQueries(genre || term, year)
      for (const q of queries) {
        try {
          const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srnamespace=0&utf8=1&origin=*`
          const res = await fetch(searchUrl, { cache: 'no-store' })
          if (!res.ok) continue
          const data = await res.json()
          const hits: Array<{ title: string }> = data?.query?.search || []
          for (const h of hits) {
            const key = `${lang}:${h.title}`.toLowerCase()
            if (tried.has(key)) continue
            tried.add(key)
            // Skip non-relevant pages heuristically
            const tLower = h.title.toLowerCase()
            if (!(tLower.includes(`(${type === 'movie' ? 'film' : 'série'}`) || tLower.includes(type === 'movie' ? 'film' : 'série'))) continue
            // Get summary and resolve TMDB
            const summary = await getWikipediaSummary(lang, h.title)
            const tmdb = await searchTmdbByTitle({ apiKey, bearer }, h.title, type, year, 'fr-FR')
            if (!tmdb) continue
            const rating = Number(tmdb?.vote_average || 0)
            if (rating < 6) continue
            const dateStr = type === 'movie' ? tmdb?.release_date : tmdb?.first_air_date;
            const tmdbYear = Number((dateStr || '0000-00-00').substring(0, 4)) || year
            if (tmdbYear < yMin || tmdbYear > yMax) continue
            const actors = await fetchTopCast({ apiKey, bearer }, tmdb.id, type).catch(() => [])
            const detailsFR = await fetchMovieDetails({ apiKey, bearer }, tmdb.id, type, 'fr-FR')
            let synopsis = (summary?.extract || detailsFR?.overview || '').trim()
            if (!synopsis) synopsis = 'Synopsis non disponible.'
            // Country names
            let country = ''
            const frCountries = (detailsFR as any)?.production_countries || (detailsFR as any)?.origin_country
            if (Array.isArray(frCountries) && frCountries.length) {
              country = typeof frCountries[0] === 'string' ? frCountries.join(', ') : frCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
            }
            if (!country) {
              const enDetails = await fetchMovieDetails({ apiKey, bearer }, tmdb.id, type, 'en-US')
              const enCountries = (enDetails as any)?.production_countries || (enDetails as any)?.origin_country
              if (Array.isArray(enCountries) && enCountries.length) {
                country = typeof enCountries[0] === 'string' ? enCountries.join(', ') : enCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
              }
            }
            const titleStr = (tmdb?.title || tmdb?.name || tmdb?.original_title || tmdb?.original_name || h.title).trim()
            const titleKey = titleStr.toLowerCase()
            if (excludeTitles.has(titleKey)) continue
            excludeTitles.add(titleKey)
            // Resolve Wikipedia via Wikidata (IMDb) first, and detect awards
            const ext = await fetchExternalIds({ apiKey, bearer }, tmdb.id, type)
            const wd = await resolveWikidataByImdb(ext?.imdb_id)
            picks.push({
              id: String(tmdb.id),
              title: titleStr,
              overview: synopsis,
              vote_average: rating,
              vote_count: Number(tmdb?.vote_count || 0),
              release_date: String(tmdbYear) + '-01-01',
              wikipediaUrl: wd.url || summary?.url || (await findWikipediaUrl(titleStr, tmdbYear, type)),
              origin_country: Array.isArray(tmdb?.origin_country) ? tmdb.origin_country : [],
              genre_ids: tmdb?.genre_ids,
              _actors: actors,
              _countryName: country,
              _hasAwards: wd.hasAwards,
            })
            if (picks.length >= count) break
          }
          if (picks.length >= count) break
        } catch {
          // continue
        }
      }
      if (picks.length >= count) break
    }
  }
  return picks
}

async function fetchCountryItems(params: {
  apiKey?: string,
  bearer?: string,
  type?: 'movie' | 'tv',
  countryCode: string,
  yearRange: [number, number],
  minRating: number,
  genre?: string,
  page?: number,
  voteCountOverride?: number,
}) {
  const { apiKey, bearer, type = 'movie', countryCode, yearRange, minRating, genre, page = 1, voteCountOverride } = params
  const endpoint = type === 'movie' ? 'movie' : 'tv';
  const url = new URL(`${TMDB_API_BASE}/discover/${endpoint}`)
  if (apiKey) url.searchParams.set('api_key', apiKey)
  url.searchParams.set('with_origin_country', countryCode)
  url.searchParams.set('language', 'fr-FR')

  // Adaptive vote count: newer movies have fewer votes
  let [yMin, yMax] = yearRange
  const CURRENT_YEAR = new Date().getFullYear()
  const isRecent = yMax >= CURRENT_YEAR - 1
  const defaultVoteCount = isRecent ? 50 : (type === 'movie' ? 500 : 100)
  url.searchParams.set('vote_count.gte', String(voteCountOverride ?? defaultVoteCount))

  url.searchParams.set('include_adult', 'false')
  if (type === 'movie') url.searchParams.set('include_video', 'false')
  url.searchParams.set('vote_average.gte', String(minRating || 0))
  if (type === 'movie') url.searchParams.set('with_release_type', '3|2') // Theatrical | Digital
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort_by', 'popularity.desc')

  // Year bounds
  if (!Number.isFinite(yMin) || yMin < 1900) yMin = 1990
  if (!Number.isFinite(yMax) || yMax > CURRENT_YEAR) yMax = CURRENT_YEAR
  if (yMin > yMax) [yMin, yMax] = [yMax, yMin]

  if (type === 'movie') {
    url.searchParams.set('primary_release_date.gte', `${yMin}-01-01`)
    url.searchParams.set('primary_release_date.lte', `${yMax}-12-31`)
  } else {
    url.searchParams.set('first_air_date.gte', `${yMin}-01-01`)
    url.searchParams.set('first_air_date.lte', `${yMax}-12-31`)
  }

  if (genre && genre.trim()) {
    const genreId = mapGenreToId(genre, type)
    if (genreId) {
      url.searchParams.set('with_genres', genreId)
    }
  }

  const headers: Record<string, string> = {}
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`
  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`TMDB discover failed: ${res.status} ${text?.slice(0, 200)}`)
  }
  const data = await res.json()
  return data || { results: [], total_pages: 0 }
}

async function fetchTopCast(apiKeyOrBearer: { apiKey?: string; bearer?: string }, tmdbId: number, type: 'movie' | 'tv' = 'movie'): Promise<string[]> {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = new URL(`${TMDB_API_BASE}/${endpoint}/${tmdbId}/credits`)
    url.searchParams.set('language', 'fr-FR')
    if (apiKeyOrBearer.apiKey) url.searchParams.set('api_key', apiKeyOrBearer.apiKey)
    const headers: Record<string, string> = {}
    if (apiKeyOrBearer.bearer) headers['Authorization'] = `Bearer ${apiKeyOrBearer.bearer}`
    const res = await fetch(url.toString(), { cache: 'force-cache', headers })
    if (!res.ok) return []
    const data = await res.json()
    const cast = Array.isArray(data?.cast) ? data.cast.slice(0, 3).map((c: any) => c?.name).filter(Boolean) : []
    return cast
  } catch {
    return []
  }
}

// Fetch TMDB movie/series details in a specific language to obtain overview reliably
async function fetchMovieDetails(
  apiKeyOrBearer: { apiKey?: string; bearer?: string },
  tmdbId: number,
  type: 'movie' | 'tv' = 'movie',
  language: string = 'fr-FR'
): Promise<{ overview?: string; release_date?: string; first_air_date?: string; title?: string; name?: string; original_title?: string; original_name?: string } | null> {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = new URL(`${TMDB_API_BASE}/${endpoint}/${tmdbId}`)
    url.searchParams.set('language', language)
    if (apiKeyOrBearer.apiKey) url.searchParams.set('api_key', apiKeyOrBearer.apiKey)
    const headers: Record<string, string> = {}
    if (apiKeyOrBearer.bearer) headers['Authorization'] = `Bearer ${apiKeyOrBearer.bearer}`
    const res = await fetch(url.toString(), { cache: 'force-cache', headers })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Fetch TMDB external IDs (to get imdb_id)
async function fetchExternalIds(
  apiKeyOrBearer: { apiKey?: string; bearer?: string },
  tmdbId: number,
  type: 'movie' | 'tv' = 'movie'
): Promise<{ imdb_id?: string } | null> {
  try {
    const endpoint = type === 'movie' ? 'movie' : 'tv';
    const url = new URL(`${TMDB_API_BASE}/${endpoint}/${tmdbId}/external_ids`)
    if (apiKeyOrBearer.apiKey) url.searchParams.set('api_key', apiKeyOrBearer.apiKey)
    const headers: Record<string, string> = {}
    if (apiKeyOrBearer.bearer) headers['Authorization'] = `Bearer ${apiKeyOrBearer.bearer}`
    const res = await fetch(url.toString(), { cache: 'no-store', headers })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Resolve precise Wikipedia URL via Wikidata using IMDb ID; prefer FR > EN > ES
async function findWikipediaViaWikidataByImdb(imdbId?: string): Promise<string | ''> {
  try {
    if (!imdbId) return ''
    // Search Wikidata entity by IMDb ID (P345)
    const wdSearch = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(imdbId)}&language=en&type=item&format=json&origin=*`
    const sRes = await fetch(wdSearch, { cache: 'no-store' })
    if (!sRes.ok) return ''
    const sData = await sRes.json()
    const firstId = sData?.search?.[0]?.id
    if (!firstId) return ''
    const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${firstId}.json`
    const eRes = await fetch(entityUrl, { cache: 'no-store' })
    if (!eRes.ok) return ''
    const eData = await eRes.json()
    const ent = eData?.entities?.[firstId]
    const sitelinks = ent?.sitelinks || {}
    const pick = (key: string) => sitelinks[key]?.url as string | undefined
    return pick('frwiki') || pick('enwiki') || pick('eswiki') || ''
  } catch {
    return ''
  }
}

// Resolve Wikipedia via Wikidata and detect awards (P166)
async function resolveWikidataByImdb(imdbId?: string): Promise<{ url: string; hasAwards: boolean }> {
  try {
    if (!imdbId) return { url: '', hasAwards: false }
    const wdSearch = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(imdbId)}&language=en&type=item&format=json&origin=*`
    const sRes = await fetch(wdSearch, { cache: 'no-store' })
    if (!sRes.ok) return { url: '', hasAwards: false }
    const sData = await sRes.json()
    const firstId = sData?.search?.[0]?.id
    if (!firstId) return { url: '', hasAwards: false }
    const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${firstId}.json`
    const eRes = await fetch(entityUrl, { cache: 'no-store' })
    if (!eRes.ok) return { url: '', hasAwards: false }
    const eData = await eRes.json()
    const ent = eData?.entities?.[firstId]
    const sitelinks = ent?.sitelinks || {}
    const claims = ent?.claims || {}
    const hasAwards = Array.isArray(claims?.P166) && claims.P166.length > 0
    const pick = (key: string) => sitelinks[key]?.url as string | undefined
    const url = pick('frwiki') || pick('enwiki') || pick('eswiki') || ''
    return { url: url || '', hasAwards }
  } catch {
    return { url: '', hasAwards: false }
  }
}

function isNonLatinTitle(s: string): boolean {
  // Detect common CJK/Hangul ranges
  return /[\u3040-\u30FF\u4E00-\u9FFF\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(s)
}

async function normalizeTitle(
  apiKeyOrBearer: { apiKey?: string; bearer?: string },
  tmdbId: number,
  currentTitle: string,
  type: 'movie' | 'tv' = 'movie'
): Promise<string> {
  if (!currentTitle || isNonLatinTitle(currentTitle)) {
    const en = await fetchMovieDetails(apiKeyOrBearer, tmdbId, type, 'en-US')
    const candidate = (en?.title || en?.name || en?.original_title || en?.original_name || '').trim()
    if (candidate) return candidate
  }
  return currentTitle
}

// Map French friendly genre labels to TMDB genre IDs
function mapGenreToId(genre: string, type: 'movie' | 'tv' = 'movie'): string | null {
  const movieMap: Record<string, string> = {
    'Action': '28',
    'Aventure': '12',
    'Animation': '16',
    'Comédie': '35',
    'Crime': '80',
    'Documentaire': '99',
    'Drame': '18',
    'Famille': '10751',
    'Fantastique': '14',
    'Histoire': '36',
    'Horreur': '27',
    'Musique': '10402',
    'Mystère': '9648',
    'Romance': '10749',
    'Science-Fiction': '878',
    'Téléfilm': '10770',
    'Thriller': '53',
    'Guerre': '10752',
    'Western': '37',
    'Historique': '36',
    'Mind-Blow': '878|9648|53',
    'Suspense & Thriller': '53|9648|80',
    'Découverte': '',
  }

  const tvMap: Record<string, string> = {
    'Action': '10759', // Action & Adventure
    'Aventure': '10759',
    'Animation': '16',
    'Comédie': '35',
    'Crime': '80',
    'Documentaire': '99',
    'Drame': '18',
    'Famille': '10751',
    'Fantastique': '10765', // Sci-Fi & Fantasy
    'Histoire': '10768', // War & Politics
    'Horreur': '18', // No specific horror for TV, often Drama
    'Musique': '35', // No specific music, often Comedy
    'Mystère': '9648',
    'Romance': '18', // Drama often used for Romance
    'Science-Fiction': '10765',
    'Téléfilm': '10770',
    'Thriller': '9648', // Mystery
    'Guerre': '10768',
    'Western': '37',
    'Historique': '10768',
    'Mind-Blow': '10765|9648',
    'Suspense & Thriller': '9648|80',
    'Découverte': '',
  }

  return type === 'movie' ? (movieMap[genre] || null) : (tvMap[genre] || null)
}

// Try to find a reliable Wikipedia URL for a movie/series (prefer FR, fallback EN)
async function findWikipediaUrl(title: string, year: number, type: 'movie' | 'tv' = 'movie'): Promise<string> {
  const term = type === 'movie' ? 'film' : 'série télévisée';
  const tryLang = async (lang: 'fr' | 'en') => {
    const preferHit = (hits: Array<{ title: string }>) => {
      // Prefer titles that clearly denote the entry
      const lower = hits.map(h => ({ ...h, t: h.title.toLowerCase() }))
      const searchTerms = type === 'movie' ? ['(film)', 'film'] : ['(série télévisée)', 'série télévisée', '(série)'];

      const withYear = lower.find(h => searchTerms.some(s => h.t.includes(s)) && h.t.includes(String(year)))
      if (withYear) return withYear;

      const withTerm = lower.find(h => searchTerms.some(s => h.t.includes(s)));
      return withTerm || hits[0]
    }
    const queries = [
      `${title} ${term}`,
      `${title} (${term})`,
      `${title}`,
      `${title} (${year}) ${term}`,
      `${title} (${year})`,
    ]
    for (const q of queries) {
      try {
        const api = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srnamespace=0&utf8=1&origin=*`
        const res = await fetch(api, { cache: 'no-store' })
        if (!res.ok) continue
        const data = await res.json()
        const hits: Array<{ title: string; pageid?: number }> = data?.query?.search || []
        if (hits.length > 0) {
          const best = preferHit(hits)
          // Use REST summary to get canonical content_urls if possible
          const sum = await getWikipediaSummary(lang, best.title)
          if (sum?.url) return sum.url
          const pageTitle = encodeURIComponent(best.title.replace(/\s/g, '_'))
          return `https://${lang}.wikipedia.org/wiki/${pageTitle}`
        }
      } catch {
        // try next query/lang
      }
    }
    // Fallback: search page but try to be more specific
    const fallbackQuery = `${title} (${year}) film`;
    // Force "go=Go" to attempt direct navigation if page exists, otherwise show search results
    return `https://${lang}.wikipedia.org/w/index.php?search=${encodeURIComponent(fallbackQuery)}&title=Spécial:Recherche&go=Go`;
  }

  // Try FR first, if not found or unsure, try EN. 
  // We prefer using the search fallback if the direct page isn't confidently found.
  const fr = await tryLang('fr')
  if (fr && !fr.includes('Special:Search') && !fr.includes('Spécial:Recherche')) return fr

  const en = await tryLang('en')
  if (en && !en.includes('Special:Search') && !en.includes('Spécial:Recherche')) return en

  // STRICT FALLBACK: Return the FR search page with "Title (Year) film"
  // This is what the user explicitly requested to ensure they land on something useful.
  return `https://fr.wikipedia.org/w/index.php?search=${encodeURIComponent(`${title} (${year}) film`)}&title=Spécial:Recherche&go=Go`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.TMDB_API_KEY
    const bearer = process.env.TMDB_BEARER
    if (!apiKey && !bearer) {
      return NextResponse.json({ error: 'TMDB credentials missing: set TMDB_API_KEY (v3) or TMDB_BEARER (v4)' }, { status: 400 })
    }

    const body = await req.json()
    const {
      type = 'movie',
      countries = [],
      yearRange = [1997, new Date().getFullYear()],
      minRating = 6,
      count = 7,
      seenMovieTitles = [],
      rejectedMovieTitles = [],
      genre,
    } = body as {
      type?: 'movie' | 'tv'
      countries?: string[]
      yearRange?: [number, number]
      minRating?: number
      count?: number
      seenMovieTitles?: string[]
      rejectedMovieTitles?: string[]
      genre?: string
    }

    // Map labels -> codes and dedupe
    const codes = Array.from(new Set((countries as string[]).map(mapCountryLabelToCode).filter(Boolean))) as string[]
    const poolCodes = codes.length ? codes : ['US', 'GB', 'FR', 'IT', 'JP', 'KR']

    // Fetch multiple pages randomly across years to ensure diversity
    const results: any[] = []

    // Strategy: Pick random years within the range and fetch from them
    const [yMin, yMax] = yearRange;
    // Ensure valid range
    const startYear = Math.max(1888, Math.min(yMin, yMax));
    const endYear = Math.min(new Date().getFullYear(), Math.max(yMin, yMax));

    // How many distinct fetch attempts to make?
    // We want 'count' movies. Let's try to get more candidates.
    const numberOfFetches = 5;

    for (let i = 0; i < numberOfFetches; i++) {
      const randomYear = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
      // Random country from preference pool
      const randomCountry = poolCodes[Math.floor(Math.random() * poolCodes.length)];

      try {
        // Fetch specifically for this year and country
        const yearSpecificRange: [number, number] = [randomYear, randomYear];

        // Try a few pages for variety (1, 2, or 3)
        const randomPage = Math.floor(Math.random() * 3) + 1;

        const fetchResult = await fetchCountryItems({
          apiKey,
          bearer,
          type,
          countryCode: randomCountry,
          yearRange: yearSpecificRange,
          minRating,
          genre,
          page: randomPage
        });

        if (fetchResult.results && fetchResult.results.length > 0) {
          results.push(...fetchResult.results);
        } else {
          // If specific year empty, try wider range around that year (+- 2 years)
          const widerRange: [number, number] = [randomYear - 2, randomYear + 2];
          const fallbackResult = await fetchCountryItems({
            apiKey,
            bearer,
            type,
            countryCode: randomCountry,
            yearRange: widerRange,
            minRating,
            genre,
            page: 1
          });
          results.push(...(fallbackResult.results || []));
        }
      } catch (e) {
        console.error(`Error gathering ${type} for ${randomYear}/${randomCountry}:`, e);
      }
    }

    // Dedupe by title and exclude seen AND rejected
    const seenSet = new Set([
      ...(seenMovieTitles || []).map((t: string) => (t || '').toLowerCase().trim()),
      ...(rejectedMovieTitles || []).map((t: string) => (t || '').toLowerCase().trim())
    ]);
    const unique = [] as any[]
    const titleSet = new Set<string>()
    for (const r of results) {
      const title = (r?.title || r?.original_title || '').trim()
      if (!title) continue
      const key = title.toLowerCase()
      if (titleSet.has(key)) continue
      if (seenSet.has(key)) continue
      titleSet.add(key)
      unique.push(r)
    }

    // Also collect extra suggestions from Wikipedia (disabled for performance)
    const extraWiki: any[] = []
    for (const w of extraWiki) unique.push(w)

    // Randomize fairly across origin countries using round-robin selection
    const byCountry = new Map<string, any[]>()
    for (const m of unique) {
      const codes: string[] = Array.isArray(m?.origin_country) && m.origin_country.length ? m.origin_country : ['UNK']
      const key = codes[0]
      if (!byCountry.has(key)) byCountry.set(key, [])
      byCountry.get(key)!.push(m)
    }
    // Shuffle helper
    const shuffle = <T,>(arr: T[]) => arr.sort(() => Math.random() - 0.5)
    const baseKeys = shuffle(Array.from(byCountry.keys()))
    for (const k of baseKeys) byCountry.set(k, shuffle(byCountry.get(k)!))
    // Apply stronger bias: US, GB, FR, ES get higher weight
    const weightFor = (code: string) => (code === 'US' || code === 'GB' || code === 'FR' || code === 'ES' ? 3 : 1)
    const keys: string[] = []
    for (const k of baseKeys) {
      const w = weightFor(k)
      for (let i = 0; i < w; i++) keys.push(k)
    }
    const selected: any[] = []
    let idx = 0
    while (selected.length < count && keys.length > 0) {
      const k = keys[idx % keys.length]
      const arr = byCountry.get(k)!
      if (arr.length) {
        selected.push(arr.shift()!)
      }
      // Remove empty buckets
      if (arr.length === 0) {
        byCountry.delete(k)
        keys.splice(idx % keys.length, 1)
        if (keys.length === 0) break
        idx = idx % keys.length
      } else {
        idx++
      }
    }

    // Enrich with cast (parallel with limited concurrency)
    const concurrency = 5
    const out: any[] = []
    let i = 0
    while (i < selected.length) {
      const chunk = selected.slice(i, i + concurrency)
      const data = await Promise.all(chunk.map(async (m) => {
        const actors: string[] = [] // Skip fetching cast to speed up response
        const dateStr = type === 'movie' ? m.release_date : m.first_air_date;
        const year = Number((dateStr || '0000-00-00').substring(0, 4)) || 0
        // Robust synopsis: prefer FR details, fallback to EN, then to discover overview
        const frDetails = await fetchMovieDetails({ apiKey, bearer }, m.id, type, 'fr-FR')
        let synopsis = (m?.overview || frDetails?.overview || '').trim()
        if (!synopsis) {
          const enDetails = await fetchMovieDetails({ apiKey, bearer }, m.id, type, 'en-US')
          synopsis = (enDetails?.overview || m.overview || '').trim()
        }
        // Limit synopsis length and add ellipsis if needed
        const truncate = (text: string, max: number = 180) => {
          if (text.length <= max) return text
          const truncated = text.slice(0, max)
          const lastSpace = truncated.lastIndexOf(' ')
          return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...'
        }
        synopsis = truncate(synopsis)

        // Country name from details (prefer FR names), fallback to origin_country code
        let country = (m as any)?._countryName || ''
        const frCountries = (frDetails as any)?.production_countries || (frDetails as any)?.origin_country
        if (Array.isArray(frCountries) && frCountries.length) {
          country = typeof frCountries[0] === 'string' ? frCountries.join(', ') : frCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
        }
        if (!country) {
          const enDetails = await fetchMovieDetails({ apiKey, bearer }, m.id, type, 'en-US')
          const enCountries = (enDetails as any)?.production_countries || (enDetails as any)?.origin_country
          if (Array.isArray(enCountries) && enCountries.length) {
            country = typeof enCountries[0] === 'string' ? enCountries.join(', ') : enCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
          }
        }
        if (!country) {
          const codes: string[] = Array.isArray(m?.origin_country) ? m.origin_country : []
          country = codes.join(', ')
        }
        // Normalize title to avoid non-Latin scripts in UI
        let titleStr = (m.title || m.name || m.original_title || m.original_name || '').trim()
        titleStr = await normalizeTitle({ apiKey, bearer }, m.id, titleStr, type)
        // Build Wikipedia URL using Wikipedia search API
        const wikipediaUrl = await findWikipediaUrl(titleStr, year, type)
        // Build poster URL if available
        const posterUrl = m.poster_path ? `https://image.tmdb.org/t/p/w185${m.poster_path}` : null
        return {
          id: String(m.id),
          title: titleStr,
          synopsis,
          actors,
          rating: Number(m.vote_average || 0),
          year,
          wikipediaUrl,
          genre: genre || (m.genre_ids && m.genre_ids.length ? String(m.genre_ids[0]) : ''),
          country,
          posterUrl,
        }
      }))
      out.push(...data)
      i += concurrency
    }

    return NextResponse.json({ movies: out })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
