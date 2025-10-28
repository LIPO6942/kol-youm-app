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
  year?: number,
  language: string = 'fr-FR'
): Promise<any | null> {
  try {
    const url = new URL(`${TMDB_API_BASE}/search/movie`)
    url.searchParams.set('language', language)
    url.searchParams.set('query', title)
    if (year && Number.isFinite(year)) url.searchParams.set('year', String(year))
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

// Collect extra movie suggestions derived from Wikipedia, enriched via TMDB (to ensure rating >= 6)
async function collectWikipediaSuggestions(params: {
  apiKey?: string,
  bearer?: string,
  genre?: string,
  yearRange: [number, number],
  count: number,
  excludeTitles: Set<string>,
}): Promise<any[]> {
  const { apiKey, bearer, genre, yearRange, count, excludeTitles } = params
  const [yMin, yMax] = yearRange
  const maxTries = Math.max(count * 3, 10)
  const picks: any[] = []
  const tried = new Set<string>()
  const rndYear = () => Math.floor(yMin + Math.random() * (Math.max(yMax, yMin) - yMin + 1))
  const langs: Array<'fr' | 'en'> = ['fr', 'en']
  const tryQueries = (titleLike: string, year: number) => [
    `${titleLike} (${year}) film`,
    `${titleLike} film (${year})`,
    `${titleLike} film`,
    `${titleLike}`,
  ]
  let attempts = 0
  while (picks.length < count && attempts < maxTries) {
    attempts++
    const year = rndYear()
    for (const lang of langs) {
      const queries = tryQueries(genre || 'film', year)
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
            // Skip non-film pages heuristically
            const tLower = h.title.toLowerCase()
            if (!(tLower.includes('(film') || tLower.includes('film'))) continue
            // Get summary and resolve TMDB
            const summary = await getWikipediaSummary(lang, h.title)
            const tmdb = await searchTmdbByTitle({ apiKey, bearer }, h.title, year, 'fr-FR')
            if (!tmdb) continue
            const rating = Number(tmdb?.vote_average || 0)
            if (rating < 6) continue
            const tmdbYear = Number((tmdb?.release_date || '0000-00-00').substring(0, 4)) || year
            if (tmdbYear < yMin || tmdbYear > yMax) continue
            const actors = await fetchTopCast({ apiKey, bearer }, tmdb.id).catch(() => [])
            const detailsFR = await fetchMovieDetails({ apiKey, bearer }, tmdb.id, 'fr-FR')
            let synopsis = (summary?.extract || detailsFR?.overview || '').trim()
            if (!synopsis) synopsis = 'Synopsis non disponible.'
            // Country names
            let country = ''
            const frCountries = (detailsFR as any)?.production_countries
            if (Array.isArray(frCountries) && frCountries.length) {
              country = frCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
            }
            if (!country) {
              const enDetails = await fetchMovieDetails({ apiKey, bearer }, tmdb.id, 'en-US')
              const enCountries = (enDetails as any)?.production_countries
              if (Array.isArray(enCountries) && enCountries.length) {
                country = enCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
              }
            }
            const titleStr = (tmdb?.title || tmdb?.original_title || h.title).trim()
            const titleKey = titleStr.toLowerCase()
            if (excludeTitles.has(titleKey)) continue
            excludeTitles.add(titleKey)
            // Resolve Wikipedia via Wikidata (IMDb) first
            const ext = await fetchExternalIds({ apiKey, bearer }, tmdb.id)
            const viaWd = await findWikipediaViaWikidataByImdb(ext?.imdb_id)
            picks.push({
              id: String(tmdb.id),
              title: titleStr,
              overview: synopsis,
              vote_average: rating,
              release_date: String(tmdbYear) + '-01-01',
              wikipediaUrl: viaWd || summary?.url || (await findWikipediaUrl(titleStr, tmdbYear)),
              origin_country: Array.isArray(tmdb?.origin_country) ? tmdb.origin_country : [],
              genre_ids: tmdb?.genre_ids,
              _actors: actors,
              _countryName: country,
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

async function fetchCountryMovies(params: {
  apiKey?: string,
  bearer?: string,
  countryCode: string,
  yearRange: [number, number],
  minRating: number,
  genre?: string,
  page?: number,
}) {
  const { apiKey, bearer, countryCode, yearRange, minRating, genre, page = 1 } = params
  const url = new URL(`${TMDB_API_BASE}/discover/movie`)
  if (apiKey) url.searchParams.set('api_key', apiKey)
  url.searchParams.set('with_origin_country', countryCode)
  url.searchParams.set('language', 'fr-FR')
  url.searchParams.set('sort_by', 'vote_average.desc')
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('vote_average.gte', String(minRating || 0))
  url.searchParams.set('with_release_type', '3|2') // Theatrical | Digital
  url.searchParams.set('page', String(page))
  // Year bounds
  let [yMin, yMax] = yearRange
  const CURRENT = new Date().getFullYear()
  if (!Number.isFinite(yMin) || yMin < 1900) yMin = 1990
  if (!Number.isFinite(yMax) || yMax > CURRENT) yMax = CURRENT
  if (yMin > yMax) [yMin, yMax] = [yMax, yMin]
  url.searchParams.set('primary_release_date.gte', `${yMin}-01-01`)
  url.searchParams.set('primary_release_date.lte', `${yMax}-12-31`)
  if (genre && genre.trim()) {
    // Optionally: map genre name to TMDB genre IDs. Skipped for now.
  }

  const headers: Record<string, string> = {}
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`
  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`TMDB discover failed: ${res.status} ${text?.slice(0,200)}`)
  }
  const data = await res.json()
  return data?.results || []
}

async function fetchTopCast(apiKeyOrBearer: { apiKey?: string; bearer?: string }, tmdbId: number): Promise<string[]> {
  try {
    const url = new URL(`${TMDB_API_BASE}/movie/${tmdbId}/credits`)
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

// Fetch TMDB movie details in a specific language to obtain overview reliably
async function fetchMovieDetails(
  apiKeyOrBearer: { apiKey?: string; bearer?: string },
  tmdbId: number,
  language: string
): Promise<{ overview?: string; release_date?: string; title?: string; original_title?: string } | null> {
  try {
    const url = new URL(`${TMDB_API_BASE}/movie/${tmdbId}`)
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
  tmdbId: number
): Promise<{ imdb_id?: string } | null> {
  try {
    const url = new URL(`${TMDB_API_BASE}/movie/${tmdbId}/external_ids`)
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

function isNonLatinTitle(s: string): boolean {
  // Detect common CJK/Hangul ranges
  return /[\u3040-\u30FF\u4E00-\u9FFF\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(s)
}

async function normalizeTitle(
  apiKeyOrBearer: { apiKey?: string; bearer?: string },
  tmdbId: number,
  currentTitle: string
): Promise<string> {
  if (!currentTitle || isNonLatinTitle(currentTitle)) {
    const en = await fetchMovieDetails(apiKeyOrBearer, tmdbId, 'en-US')
    const candidate = (en?.title || en?.original_title || '').trim()
    if (candidate) return candidate
  }
  return currentTitle
}

// Try to find a reliable Wikipedia URL for a movie (prefer FR, fallback EN)
async function findWikipediaUrl(title: string, year: number): Promise<string> {
  const tryLang = async (lang: 'fr' | 'en') => {
    const preferFilmHit = (hits: Array<{ title: string }>) => {
      // Prefer titles that clearly denote the film entry
      const lower = hits.map(h => ({ ...h, t: h.title.toLowerCase() }))
      const withYear = lower.find(h => h.t.includes('(film') && h.t.includes(String(year)))
      if (withYear) return withYear
      const withFilm = lower.find(h => h.t.includes('(film'))
      return withFilm || hits[0]
    }
    const queries = [
      `${title} film`,
      `${title} (film)`,
      `${title}`,
      `${title} (${year}) film`,
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
          const best = preferFilmHit(hits)
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
    // Fallback: open search page prioritizing "Title film" (no year)
    return `https://${lang}.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(`${title} film`)}`
  }
  const fr = await tryLang('fr')
  if (fr) return fr
  const en = await tryLang('en')
  return en
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
      countries = [],
      yearRange = [1997, new Date().getFullYear()],
      minRating = 6,
      count = 7,
      seenMovieTitles = [],
      genre,
    } = body as {
      countries?: string[]
      yearRange?: [number, number]
      minRating?: number
      count?: number
      seenMovieTitles?: string[]
      genre?: string
    }

    // Map labels -> codes and dedupe
    const codes = Array.from(new Set((countries as string[]).map(mapCountryLabelToCode).filter(Boolean))) as string[]
    const poolCodes = codes.length ? codes : ['US', 'GB', 'FR', 'IT', 'JP', 'KR']

    // Fetch multiple pages modestly to diversify
    const results: any[] = []
    for (const code of poolCodes) {
      try {
        const page1 = await fetchCountryMovies({ apiKey, bearer, countryCode: code, yearRange, minRating, genre, page: 1 })
        const page2 = await fetchCountryMovies({ apiKey, bearer, countryCode: code, yearRange, minRating, genre, page: 2 })
        results.push(...page1, ...page2)
      } catch (e) {
        // continue other countries
      }
    }

    // Dedupe by title and exclude seen
    const seenSet = new Set((seenMovieTitles || []).map((t: string) => (t || '').toLowerCase().trim()))
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

    // Also collect extra suggestions from Wikipedia (then dedupe)
    const extraWiki = await collectWikipediaSuggestions({ apiKey, bearer, genre, yearRange, count: Math.ceil(count / 2), excludeTitles: titleSet })
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
        const actors = await fetchTopCast({ apiKey, bearer }, m.id).catch(() => [])
        const year = Number((m.release_date || '0000-00-00').substring(0, 4)) || 0
        // Robust synopsis: prefer FR details, fallback to EN, then to discover overview
        const frDetails = await fetchMovieDetails({ apiKey, bearer }, m.id, 'fr-FR')
        let synopsis = (m?.overview || frDetails?.overview || '').trim()
        if (!synopsis) {
          const enDetails = await fetchMovieDetails({ apiKey, bearer }, m.id, 'en-US')
          synopsis = (enDetails?.overview || m.overview || '').trim()
        }
        // Country name from details (prefer FR names), fallback to origin_country code
        let country = (m as any)?._countryName || ''
        const frCountries = (frDetails as any)?.production_countries
        if (Array.isArray(frCountries) && frCountries.length) {
          country = frCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
        }
        if (!country) {
          const enDetails = await fetchMovieDetails({ apiKey, bearer }, m.id, 'en-US')
          const enCountries = (enDetails as any)?.production_countries
          if (Array.isArray(enCountries) && enCountries.length) {
            country = enCountries.map((c: any) => c?.name).filter(Boolean).join(', ')
          }
        }
        if (!country) {
          const codes: string[] = Array.isArray(m?.origin_country) ? m.origin_country : []
          country = codes.join(', ')
        }
        // Normalize title to avoid non-Latin scripts in UI
        let titleStr = (m.title || m.original_title || '').trim()
        titleStr = await normalizeTitle({ apiKey, bearer }, m.id, titleStr)
        // Build Wikipedia URL using Wikipedia search API
        const wikipediaUrl = await findWikipediaUrl(titleStr, year)
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
