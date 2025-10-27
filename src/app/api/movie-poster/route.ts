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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title');
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });

    // Try French first, then English
    const fr = await fetchPosterFrom('fr', title);
    const url = fr || await fetchPosterFrom('en', title).catch(() => null);

    if (!url) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: String(e?.message || e) }, { status: 500 });
  }
}
