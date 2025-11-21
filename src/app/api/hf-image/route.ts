import { NextResponse } from 'next/server';
import { generateOutfitImage } from '@/ai/flows/generate-outfit-image';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { prompt, gender, category } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt' }, { status: 400 });
    }

    const descriptionParts: string[] = [];
    if (typeof category === 'string') {
      descriptionParts.push(`Partie de tenue : ${category}`);
    }
    descriptionParts.push(prompt);
    if (gender === 'Homme' || gender === 'Femme') {
      descriptionParts.push(gender === 'Homme' ? 'pour un homme' : 'pour une femme');
    }

    const itemDescription = descriptionParts.join(', ');

    const result = await generateOutfitImage({
      itemDescription,
      gender,
      category,
    });

    return NextResponse.json({ imageDataUri: result.imageDataUri });
  } catch (error: any) {
    console.error('Error in /api/hf-image:', error);
    return NextResponse.json(
      { error: 'Unexpected error', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}
