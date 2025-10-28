import { NextRequest, NextResponse } from 'next/server'

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

async function fetchCountryMovies(params: {
  apiKey: string,
  countryCode: string,
  yearRange: [number, number],
  minRating: number,
  genre?: string,
  page?: number,
}) {
  const { apiKey, countryCode, yearRange, minRating, genre, page = 1 } = params
  const url = new URL(`${TMDB_API_BASE}/discover/movie`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('with_origin_country', countryCode)
  url.searchParams.set('language', 'fr-FR')
  url.searchParams.set('sort_by', 'vote_average.desc')
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('vote_average.gte', String(minRating || 0))
  url.searchParams.set('with_release_type', '3|2') // Theatrical | Digital
  url.searchParams.set('page', String(page))
  // Year bounds
  const [yMin, yMax] = yearRange
  url.searchParams.set('primary_release_date.gte', `${yMin}-01-01`)
  url.searchParams.set('primary_release_date.lte', `${yMax}-12-31`)
  if (genre && genre.trim()) {
    // Optionally: map genre name to TMDB genre IDs. Skipped for now.
  }

  const res = await fetch(url.toString(), { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`TMDB discover failed: ${res.status}`)
  const data = await res.json()
  return data?.results || []
}

async function fetchTopCast(apiKey: string, tmdbId: number): Promise<string[]> {
  try {
    const url = `${TMDB_API_BASE}/movie/${tmdbId}/credits?api_key=${apiKey}&language=fr-FR`
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return []
    const data = await res.json()
    const cast = Array.isArray(data?.cast) ? data.cast.slice(0, 3).map((c: any) => c?.name).filter(Boolean) : []
    return cast
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 })
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
      const page1 = await fetchCountryMovies({ apiKey, countryCode: code, yearRange, minRating, genre, page: 1 })
      const page2 = await fetchCountryMovies({ apiKey, countryCode: code, yearRange, minRating, genre, page: 2 })
      results.push(...page1, ...page2)
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

    // Take top N by vote_average then popularity as tie-breaker
    unique.sort((a, b) => (b?.vote_average || 0) - (a?.vote_average || 0) || (b?.popularity || 0) - (a?.popularity || 0))
    const selected = unique.slice(0, count)

    // Enrich with cast (parallel with limited concurrency)
    const concurrency = 5
    const out: any[] = []
    let i = 0
    while (i < selected.length) {
      const chunk = selected.slice(i, i + concurrency)
      const data = await Promise.all(chunk.map(async (m) => {
        const actors = await fetchTopCast(apiKey, m.id).catch(() => [])
        return {
          id: String(m.id),
          title: m.title || m.original_title,
          synopsis: m.overview || '',
          actors,
          rating: Number(m.vote_average || 0),
          year: Number((m.release_date || '0000-00-00').substring(0, 4)) || 0,
          wikipediaUrl: '',
          genre: genre || (m.genre_ids && m.genre_ids.length ? String(m.genre_ids[0]) : ''),
          country: '', // origin country is not provided per item reliably here
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
