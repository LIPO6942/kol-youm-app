import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Configuration Firebase (Same as other API routes for consistency)
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const MOMENTY_API_KEY = process.env.MOMENTY_API_KEY;

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper for CORS headers
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        // 1. Vérifier la clé API
        const apiKey = request.headers.get('X-API-Key');
        if (MOMENTY_API_KEY && apiKey !== MOMENTY_API_KEY) {
            console.warn('[External Visit API] Unauthorized access attempt with API Key:', apiKey);
            return NextResponse.json(
                { success: false, error: 'Clé API invalide' },
                { status: 401, headers: corsHeaders() }
            );
        }

        // 2. Parser le body
        const body = await request.json();
        const { userEmail, placeName, category, cityName, dishName, date } = body;

        // 3. Valider les données
        if (!userEmail || !placeName || !category || !date) {
            return NextResponse.json({
                success: false,
                error: 'Données invalides. Les champs userEmail, placeName, category et date sont obligatoires.'
            }, { status: 400, headers: corsHeaders() });
        }

        // 4. Rechercher l'utilisateur par email dans Firestore
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', userEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`[External Visit API] User not found for email: ${userEmail}`);
            return NextResponse.json(
                { success: false, error: 'Utilisateur non trouvé' },
                { status: 404, headers: corsHeaders() }
            );
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;

        // 4.5. CORRECTION AUTOMATIQUE DE LA CATÉGORIE

        // Normalisation préventive de la catégorie entrante (Fallback)
        const normalizeCategoryInput = (cat: string) => {
            if (!cat) return 'Autre';
            const lower = cat.toLowerCase().trim();
            if (lower.includes('fast') || lower === 'fastfoods' || lower === 'fastfood') return 'Fast Food';
            if (lower === 'cafe' || lower === 'café' || lower === 'cafes' || lower === 'cafés') return 'Café';
            if (lower === 'restaurant' || lower === 'restaurants') return 'Restaurant';
            if (lower === 'brunch' || lower === 'brunchs') return 'Brunch';
            // Garder la valeur originale si pas de match évident, en mettant la première lettre en majuscule
            return cat.charAt(0).toUpperCase() + cat.slice(1);
        };

        // 4.5. DÉTECTION MULTI-CATÉGORIES
        // La catégorie normalisée envoyée par Momenty est TOUJOURS la source de vérité
        const normalizedInputCategory = normalizeCategoryInput(category);
        let possibleCategories: string[] = [];
        try {
            const zonesSnap = await getDocs(collection(db, 'zones'));
            const normalizedPlace = placeName.trim().toLowerCase();

            for (const zoneDoc of zonesSnap.docs) {
                const data = zoneDoc.data();
                if (data.restaurants?.map((p: string) => p.toLowerCase()).includes(normalizedPlace)) possibleCategories.push('Restaurant');
                if (data.cafes?.map((p: string) => p.toLowerCase()).includes(normalizedPlace)) possibleCategories.push('Café');
                if (data.fastFoods?.map((p: string) => p.toLowerCase()).includes(normalizedPlace)) possibleCategories.push('Fast Food');
                if (data.brunch?.map((p: string) => p.toLowerCase()).includes(normalizedPlace)) possibleCategories.push('Brunch');
            }
        } catch (catError) {
            console.error('[External Visit API] Error checking categories:', catError);
        }

        // TOUJOURS utiliser la catégorie envoyée par Momenty comme catégorie principale.
        // La détection multi-catégories via la DB sert uniquement à enrichir possibleCategories
        // pour le dialog de confirmation côté client, mais NE DOIT PAS remplacer le choix de Momenty.
        const finalCategory = normalizedInputCategory;

        // S'assurer que la catégorie Momenty est incluse dans possibleCategories
        if (!possibleCategories.includes(normalizedInputCategory)) {
            possibleCategories.push(normalizedInputCategory);
        }

        // Ambiguïté uniquement si le lieu existe dans PLUSIEURS catégories en DB
        // ET que la catégorie Momenty est différente d'une seule catégorie DB
        const isAmbiguous = possibleCategories.length > 1;

        // 5. Préparer l'objet visite — IMPORTANT: NE PAS inclure de valeurs `undefined`
        // car Firestore rejette les objets contenant des champs `undefined`, ce qui fait
        // échouer silencieusement le `updateDoc`.
        const visitId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newVisit: Record<string, any> = {
            id: visitId,
            placeName: placeName,
            category: finalCategory,
            date: date,
            source: 'momenty',
            isPending: isAmbiguous,
        };

        // N'ajouter orderedItem QUE si dishName est fourni et non vide
        if (dishName && dishName.trim()) {
            newVisit.orderedItem = dishName.trim();
        }

        // N'ajouter possibleCategories QUE si ambigu
        if (isAmbiguous) {
            newVisit.possibleCategories = possibleCategories;
        }

        console.log(`[External Visit API] Saving visit object:`, JSON.stringify(newVisit));

        // 6. Ajouter la visite au tableau 'visits' de l'utilisateur
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            visits: arrayUnion(newVisit)
        });

        console.log(`[External Visit API] Successfully added visit for ${userEmail} at ${placeName} | category: ${finalCategory} | dish: ${dishName || 'N/A'} | input category was: ${category}`);

        // 7. Synchroniser le plat dans la base globale (Spécialités)
        if (dishName && placeName) {
            try {
                const zonesSnap = await getDocs(collection(db, 'zones'));

                const normalizedPlace = placeName.trim().toLowerCase();
                let targetZoneDoc = null;
                let currentSpecialties: Record<string, string[]> = {};

                // Parcourir les zones pour trouver le lieu
                for (const zoneDoc of zonesSnap.docs) {
                    const data = zoneDoc.data();
                    const allPlacesInZone = [
                        ...(data.cafes || []),
                        ...(data.restaurants || []),
                        ...(data.fastFoods || []),
                        ...(data.brunch || []),
                        ...(data.balade || []),
                        ...(data.shopping || [])
                    ].map(p => p.toLowerCase());

                    if (allPlacesInZone.includes(normalizedPlace)) {
                        targetZoneDoc = zoneDoc;
                        currentSpecialties = data.specialties || {};
                        break;
                    }
                }

                if (targetZoneDoc) {
                    const placeKey = Object.keys(currentSpecialties).find(k => k.toLowerCase() === normalizedPlace) || placeName;
                    const existingDishList = currentSpecialties[placeKey] || [];

                    if (!existingDishList.some(d => d.toLowerCase() === dishName.trim().toLowerCase())) {
                        const updatedSpecialties = {
                            ...currentSpecialties,
                            [placeKey]: [...existingDishList, dishName.trim()]
                        };

                        await updateDoc(doc(db, 'zones', targetZoneDoc.id), {
                            specialties: updatedSpecialties
                        });
                        console.log(`[External Visit API] Specialty added for ${placeName}: ${dishName}`);
                    }
                }
            } catch (pError) {
                console.error('[External Visit API] Failed to sync global specialty:', pError);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Visite ajoutée au tableau visits",
            visitId: visitId,
            finalCategory: finalCategory,
            orderedItem: newVisit.orderedItem || null,
            inputCategory: category
        }, { headers: corsHeaders() });

    } catch (error) {
        console.error('[External Visit API] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur interne du serveur'
        }, { status: 500, headers: corsHeaders() });
    }
}
