import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    const isConfigured = !!(process.env.CLOUDFLARE_API_TOKEN || process.env.HUGGINGFACE_API_KEY);

    return NextResponse.json({
        isConfigured,
    });
}
