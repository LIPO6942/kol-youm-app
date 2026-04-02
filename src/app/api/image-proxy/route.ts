import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) return new NextResponse('Missing URL', { status: 400 });

    try {
        const decodedUrl = decodeURIComponent(url);
        const res = await fetch(decodedUrl);
        
        if (!res.ok) {
            console.error(`Proxy failed for ${decodedUrl}: ${res.statusText}`);
            return new NextResponse('Failed to fetch image', { status: res.status });
        }
        
        const blob = await res.blob();
        const contentType = res.headers.get('Content-Type') || 'image/jpeg';
        
        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (e) {
        console.error('Image proxy error:', e);
        return new NextResponse('Error fetching image', { status: 500 });
    }
}
