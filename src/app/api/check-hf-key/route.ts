import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;

    return NextResponse.json({
        isConfigured: !!apiKey,
    });
}
