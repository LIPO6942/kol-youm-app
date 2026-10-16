import { NextRequest, NextResponse } from 'next/server';
import { scoutPlaces } from '@/ai/flows/scout-places-flow';
import { findSimilarPlaceInZone } from '@/lib/place-matching-utils';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'moslem.gouia@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone, zoneCategories, requesterEmail, groqApiKey } = body;

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

    console.log(`[API /admin/scout-places] Request for zone: "${zone}", existing count: ${existingPlacesList.length}`);

    // Appel à l'éclaireur Groq (Llama 3.3 70B)
    let result;
    try {
      result = await scoutPlaces({
        zone: zone.trim(),
        existingPlaces: existingPlacesList,
        groqApiKey: typeof groqApiKey === 'string' ? groqApiKey.trim() : undefined,
      });
      console.log(`[API /admin/scout-places] Groq returned ${result?.discoveredPlaces?.length || 0} candidates`);
    } catch (flowErr: any) {
      console.error('[API /admin/scout-places] Scout flow failed:', flowErr);
      return NextResponse.json(
        {
          success: false,
          error: flowErr?.message || 'Erreur lors de la recherche avec Groq',
        },
        { status: 500 }
      );
    }

    const rawCandidates = result?.discoveredPlaces || [];
    console.log('[API /admin/scout-places] Raw candidates from AI:', rawCandidates);

    // Filtrage secondaire automatique avec notre algorithme de similarité
    // Élimine toute suggestion qui ressemble à un lieu existant (même mal orthographié)
    const validPlaces = rawCandidates.filter((candidate) => {
      if (!candidate.name || !candidate.name.trim()) return false;
      const isDuplicate = findSimilarPlaceInZone(
        candidate.name.trim(),
        zoneCategories || {}
      );
      if (isDuplicate) {
        console.log(`[API /admin/scout-places] Filtered duplicate: "${candidate.name}" matched with "${isDuplicate.existingName}" (${isDuplicate.reason})`);
      }
      return !isDuplicate;
    });

    console.log(`[API /admin/scout-places] Returning ${validPlaces.length} valid places out of ${rawCandidates.length} raw candidates`);

    return NextResponse.json({
      success: true,
      zone: zone.trim(),
      rawCount: rawCandidates.length,
      discoveredPlaces: validPlaces,
    });
  } catch (error: any) {
    console.error('[API /admin/scout-places] General error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur interne du serveur',
      },
      { status: 500 }
    );
  }
}
