import { NextRequest, NextResponse } from 'next/server';
import { scoutPlaces } from '@/ai/flows/scout-places-flow';
import { findSimilarPlaceInZone, comparePlaces } from '@/lib/place-matching-utils';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'moslem.gouia@gmail.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zone, zoneCategories, category, requesterEmail, serperApiKey, groqApiKey, ignoredPlaces } = body;

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

    const ignoredList: string[] = Array.isArray(ignoredPlaces)
      ? ignoredPlaces.filter(p => typeof p === 'string' && p.trim())
      : [];

    console.log(`[API /admin/scout-places] Request for zone: "${zone}", category: "${category}", existing: ${existingPlacesList.length}, ignored: ${ignoredList.length}`);

    // Appel à l'éclaireur (Serper Google Maps Places / Groq)
    let result;
    try {
      result = await scoutPlaces({
        zone: zone.trim(),
        category: typeof category === 'string' ? category.trim() : undefined,
        existingPlaces: existingPlacesList,
        ignoredPlaces: ignoredList,
        serperApiKey: typeof serperApiKey === 'string' ? serperApiKey.trim() : undefined,
        groqApiKey: typeof groqApiKey === 'string' ? groqApiKey.trim() : undefined,
      });
      console.log(`[API /admin/scout-places] Scout returned ${result?.discoveredPlaces?.length || 0} candidates`);
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

    // Filtrage secondaire automatique :
    // 1. Élimine les doublons avec les lieux existants
    // 2. Élimine les lieux déjà ignorés par l'administrateur
    const validPlaces = rawCandidates.filter((candidate) => {
      if (!candidate.name || !candidate.name.trim()) return false;
      const candidateName = candidate.name.trim();

      // Vérifier si le lieu existe déjà dans la base
      const isDuplicate = findSimilarPlaceInZone(
        candidateName,
        zoneCategories || {}
      );
      if (isDuplicate) {
        console.log(`[API /admin/scout-places] Filtered duplicate: "${candidateName}" matched with "${isDuplicate.existingName}" (${isDuplicate.reason})`);
        return false;
      }

      // Vérifier si le lieu a été précédemment ignoré par l'admin
      const matchedIgnored = ignoredList.find((ign) => {
        const sim = comparePlaces(candidateName, ign);
        return sim.isMatch;
      });
      if (matchedIgnored) {
        console.log(`[API /admin/scout-places] Filtered ignored place: "${candidateName}" matched with previously ignored "${matchedIgnored}"`);
        return false;
      }

      return true;
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
