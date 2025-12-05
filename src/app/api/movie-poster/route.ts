import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function fetchPosterFrom(lang: 'fr' | 'en', title: string) {
  const endpoint = `https://${lang}.wikipedia.org/w/api.php?` +
    new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'pageimages',
      pithumbsize: '600',
      redirects: '1',
      format: 'json',
      origin: '*'
    }).toString();

  const resp = await fetch(endpoint, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`WIKI_${lang}_${resp.status}`);
  const data = await resp.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const first = Object.values(pages)[0] as any;
  const src: string | undefined = first?.thumbnail?.source;
  return src || null;
}

async function fetchWikidataImageTitle(title: string): Promise<string | null> {
  // Search entity by title
  const searchUrl = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({
    action: 'wbsearchentities',
    language: 'fr',
    search: title,
    type: 'item',
    format: 'json',
    origin: '*',
    limit: '5',
  }).toString();
  const searchResp = await fetch(searchUrl, { cache: 'no-store' });
  if (!searchResp.ok) return null;
  const searchData = await searchResp.json();
  const first = searchData?.search?.[0];
  const id = first?.id as string | undefined; // e.g., Q12345
  if (!id) return null;

  // Fetch entity data to get P18 (image)
  const entityUrl = `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`;
  const entResp = await fetch(entityUrl, { cache: 'no-store' });
  if (!entResp.ok) return null;
  const entData = await entResp.json();
  const entity = entData?.entities?.[id];
  const claims = entity?.claims;
  const p18 = claims?.P18?.[0]?.mainsnak?.datavalue?.value as string | undefined; // File name
  return p18 || null;
}

async function fetchCommonsImageUrl(fileTitle: string): Promise<string | null> {
  // fileTitle like: "Movie poster.jpg" or "File:Movie poster.jpg"
  const normalized = fileTitle.startsWith('File:') ? fileTitle : `File:${fileTitle}`;
  const commonsUrl = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query',
    titles: normalized,
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*',
  }).toString();
  const resp = await fetch(commonsUrl, { cache: 'no-store' });
  if (!resp.ok) return null;
  const data = await resp.json();
  const pages = data?.query?.pages;
  const first = pages ? Object.values(pages)[0] as any : null;
  const url: string | undefined = first?.imageinfo?.[0]?.url;
  return url || null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    // Try French Wikipedia first, then English
    const fr = await fetchPosterFrom('fr', title).catch(() => null);
    let url = fr || await fetchPosterFrom('en', title).catch(() => null);

    // If not found, try Wikidata P18 via Commons
    if (!url) {
      const p18 = await fetchWikidataImageTitle(title).catch(() => null);
      if (p18) {
        url = await fetchCommonsImageUrl(p18).catch(() => null);
      }
    }

    // Fallback: always return a placeholder
    if (!url) {
      const ph = `https://placehold.co/600x300/111827/94a3b8?text=${encodeURIComponent(title)}`;
      return NextResponse.json({ url: ph });
    }
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: String(e?.message || e) }, { status: 500 });
  }
}
