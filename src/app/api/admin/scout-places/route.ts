import { NextRequest, NextResponse } from 'next/server';
import { scoutPlaces } from '@/ai/flows/scout-places-flow';
import { findSimilarPlaceInZone } from '@/lib/place-matching-utils';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'moslem.gouia@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone, zoneCategories, requesterEmail } = body;

    // Contrôle d'accès strict : uniquement moslem.gouia@gmail.com
    if (!requesterEmail || requesterEmail.toLowerCase().trim() !== ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, error: 'Accès réservé à l’administrateur' },
        { status: 403 }
      );
    }

    if (!zone || typeof zone !== 'string' || !zone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Veuillez sélectionner une zone valide' },
        { status: 400 }
      );
    }

    // Récupérer tous les lieux existants de cette zone
    const existingPlacesList: string[] = [];
    if (zoneCategories && typeof zoneCategories === 'object') {
      Object.values(zoneCategories).forEach((list) => {
        if (Array.isArray(list)) {
          list.forEach((p) => {
            if (typeof p === 'string' && p.trim()) {
              existingPlacesList.push(p.trim());
            }
          });
        }
      });
    }

    // Appel à l'éclaireur Gemini
    const result = await scoutPlaces({
      zone: zone.trim(),
      existingPlaces: existingPlacesList,
    });

    // Filtrage secondaire automatique avec notre algorithme de similarité
    // Élimine toute suggestion qui ressemble à un lieu existant (même mal orthographié)
    const validPlaces = (result.discoveredPlaces || []).filter((candidate) => {
      if (!candidate.name || !candidate.name.trim()) return false;
      const isDuplicate = findSimilarPlaceInZone(
        candidate.name.trim(),
        zoneCategories || {}
      );
      return !isDuplicate;
    });

    return NextResponse.json({
      success: true,
      zone: zone.trim(),
      discoveredPlaces: validPlaces,
    });
  } catch (error: any) {
    console.error('[API /admin/scout-places] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors de la recherche de nouveaux lieux',
      },
      { status: 500 }
    );
  }
}
