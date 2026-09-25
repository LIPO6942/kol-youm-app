import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function PUT(request: NextRequest) {
    return handleVisitRequest(request);
}

export async function PATCH(request: NextRequest) {
    return handleVisitRequest(request);
}

export async function POST(request: NextRequest) {
    return handleVisitRequest(request);
}

async function handleVisitRequest(request: NextRequest) {
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
        const {
            userEmail,
            placeName,
            category,
            cityName,
            dishName,
            dish,
            date,
            postUrl,
            momentyImageUrl,
            imageUrl,
            photoUrl,
            description,
            dishDescription,
            caption,
            note,
            instantId,
            id,
            postId,
            instant_id,
            visitId: bodyVisitId,
            oldDishName,
            action
        } = body;

        // Normalisation des descriptions et plats
        const resolvedDishName = (dishName || dish || '').trim();
        const resolvedDescription = (description || dishDescription || caption || note || '').trim();
        const incomingDesc = resolvedDescription || resolvedDishName;
        const resolvedImageUrl = momentyImageUrl || imageUrl || photoUrl || '';

        // 3. Valider l'email de l'utilisateur
        if (!userEmail) {
            return NextResponse.json({
                success: false,
                error: 'Le champ userEmail est obligatoire.'
            }, { status: 400, headers: corsHeaders() });
        }

        // Helper pour extraire l'ID d'un instant Momenty (support query param ET path param)
        const extractInstantId = (url?: string) => {
            if (!url) return null;
            const qMatch = url.match(/[?&](?:instant|id|postId)=([^&#]+)/);
            if (qMatch) return qMatch[1];
            const pMatch = url.match(/\/(?:plats|instant|timeline|post|moments)\/([^\/?#]+)/);
            if (pMatch) return pMatch[1];
            return null;
        };

        const incomingInstantId = (
            instantId ||
            id ||
            postId ||
            instant_id ||
            bodyVisitId ||
            extractInstantId(postUrl) ||
            ''
        ).toString();

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
        const userRef = doc(db, 'users', userId);
        const userData = userDoc.data();
        const existingVisits = (userData.visits || []) as Record<string, any>[];

        // Helper fuzzy match
        const fuzzyMatch = (dbName: string, searchName: string): boolean => {
            if (!dbName || !searchName) return false;
            if (dbName === searchName) return true;
            const shorter = dbName.length < searchName.length ? dbName : searchName;
            const longer = dbName.length < searchName.length ? searchName : dbName;
            return shorter.length >= 4 && longer.includes(shorter);
        };

        // Helper pour comparer des dates (même jour)
        const isSameDay = (d1: any, d2: any): boolean => {
            if (!d1 || !d2) return false;
            try {
                const t1 = typeof d1 === 'number' ? d1 : new Date(d1).getTime();
                const t2 = typeof d2 === 'number' ? d2 : new Date(d2).getTime();
                if (isNaN(t1) || isNaN(t2)) return false;
                return Math.abs(t1 - t2) < 24 * 60 * 60 * 1000;
            } catch {
                return false;
            }
        };

        // 5. Chercher si la visite existe déjà (Mise à jour d'un plat ou instant Momenty)
        let existingIndex = -1;

        if (incomingInstantId) {
            existingIndex = existingVisits.findIndex(v => {
                if (v.id === incomingInstantId) return true;
                if (v.instantId === incomingInstantId) return true;
                if (v.momentyUrl && extractInstantId(v.momentyUrl) === incomingInstantId) return true;
                return false;
            });
        }

        if (existingIndex === -1 && postUrl) {
            const cleanPostUrl = postUrl.split('#')[0];
            existingIndex = existingVisits.findIndex(v => {
                if (!v.momentyUrl) return false;
                return v.momentyUrl.split('#')[0] === cleanPostUrl;
            });
        }

        if (existingIndex === -1 && placeName && date) {
            const normalizedPlace = placeName.trim().toLowerCase();
            existingIndex = existingVisits.findIndex(v => {
                if (v.source !== 'momenty') return false;
                const vPlace = (v.placeName || '').trim().toLowerCase();
                return fuzzyMatch(vPlace, normalizedPlace) && isSameDay(v.date, date);
            });
        }

        const isExplicitUpdate = action === 'update' || action === 'updateDish' || action === 'edit';

        // Si la visite n'existe pas et qu'on n'a pas les infos minimales de création
        if (existingIndex === -1 && (!placeName || !category || !date)) {
            return NextResponse.json({
                success: false,
                error: 'Pour une nouvelle visite, les champs userEmail, placeName, category et date sont obligatoires.'
            }, { status: 400, headers: corsHeaders() });
        }

        // Normalisation de la catégorie
        const normalizeCategoryInput = (cat: string) => {
            if (!cat) return 'Autre';
            const lower = cat.toLowerCase().trim();
            if (lower.includes('fast') || lower === 'fastfoods' || lower === 'fastfood') return 'Fast Food';
            if (lower === 'cafe' || lower === 'café' || lower === 'cafes' || lower === 'cafés') return 'Café';
            if (lower === 'restaurant' || lower === 'restaurants') return 'Restaurant';
            if (lower === 'brunch' || lower === 'brunchs') return 'Brunch';
            if (lower === 'kharjet' || lower === 'kharja' || lower === 'balade' || lower === 'sortie' || lower === 'sorties') return 'Kharjet';
            if (lower === 'cinema' || lower === 'cinéma' || lower === 'cinemas' || lower === 'cinémas') return 'Cinéma';
            if (lower === 'shopping') return 'Shopping';
            return cat.charAt(0).toUpperCase() + cat.slice(1);
        };

        const incomingCategory = category ? normalizeCategoryInput(category) : undefined;

        // Détection catégories Firestore
        let dbCategories: string[] = [];
        const checkPlaceName = (existingIndex !== -1 ? existingVisits[existingIndex].placeName : placeName) || '';
        try {
            const zonesSnap = await getDocs(collection(db, 'zones'));
            const normalizedCheckPlace = checkPlaceName.trim().toLowerCase();

            for (const zoneDoc of zonesSnap.docs) {
                const data = zoneDoc.data();
                const matchesInList = (list: string[] | undefined): boolean => {
                    if (!list) return false;
                    return list.some(p => fuzzyMatch(p.toLowerCase(), normalizedCheckPlace));
                };

                if (matchesInList(data.restaurants)) dbCategories.push('Restaurant');
                if (matchesInList(data.cafes)) dbCategories.push('Café');
                if (matchesInList(data.fastFoods)) dbCategories.push('Fast Food');
                if (matchesInList(data.brunch)) dbCategories.push('Brunch');
                if (matchesInList(data.kharjet || data.balade)) dbCategories.push('Kharjet');
                if (matchesInList(data.cinemas)) dbCategories.push('Cinéma');
                if (matchesInList(data.shopping)) dbCategories.push('Shopping');
            }
            dbCategories = [...new Set(dbCategories)];
        } catch (catError) {
            console.error('[External Visit API] Error checking categories:', catError);
        }

        const isAmbiguous = dbCategories.length > 1;
        const finalCategory = incomingCategory || (existingIndex !== -1 ? existingVisits[existingIndex].category : 'Restaurant');

        let possibleCategories: string[] = [];
        if (isAmbiguous) {
            possibleCategories = [...dbCategories];
            if (finalCategory && !possibleCategories.includes(finalCategory)) {
                possibleCategories.push(finalCategory);
            }
        }

        const finalVisitsArray = [...existingVisits];
        let wasUpdated = false;
        let resultingVisitId = '';
        let oldDishToReplace: string | null = oldDishName || null;
        const cleanCityName = cityName?.trim() || (existingIndex !== -1 ? existingVisits[existingIndex].zone : 'La Marsa');

        if (existingIndex !== -1) {
            // ==========================================
            // MISE À JOUR DE LA VISITE / DU PLAT MOMENTY
            // ==========================================
            const existing = existingVisits[existingIndex];
            resultingVisitId = existing.id;
            oldDishToReplace = oldDishToReplace || existing.dishName || existing.orderedItem || null;

            const updatedVisit: Record<string, any> = {
                ...existing,
            };

            if (placeName) updatedVisit.placeName = placeName;
            if (incomingCategory) updatedVisit.category = finalCategory;
            if (date) updatedVisit.date = date;
            if (cleanCityName) {
                updatedVisit.zone = cleanCityName;
                updatedVisit.cityName = cleanCityName;
            }
            if (postUrl) updatedVisit.momentyUrl = postUrl;
            if (incomingInstantId) updatedVisit.instantId = incomingInstantId;
            if (resolvedImageUrl) updatedVisit.momentyImageUrl = resolvedImageUrl;

            // Synchroniser la description et le plat modifié
            if (resolvedDishName) {
                updatedVisit.dishName = resolvedDishName;
                updatedVisit.orderedItem = resolvedDishName;
            }
            if (resolvedDescription) {
                updatedVisit.description = resolvedDescription;
                updatedVisit.note = resolvedDescription;
                if (!resolvedDishName) {
                    updatedVisit.orderedItem = resolvedDescription;
                }
            } else if (resolvedDishName) {
                updatedVisit.description = resolvedDishName;
                updatedVisit.note = resolvedDishName;
            }

            finalVisitsArray[existingIndex] = updatedVisit;
            wasUpdated = true;

            await updateDoc(userRef, {
                visits: finalVisitsArray
            });

            console.log(`[External Visit API] Successfully UPDATED visit description/dish for ${userEmail}:`, {
                placeName: updatedVisit.placeName,
                dishName: updatedVisit.dishName,
                orderedItem: updatedVisit.orderedItem,
                description: updatedVisit.description
            });
        } else {
            // ==========================================
            // CRÉATION D'UNE NOUVELLE VISITE
            // ==========================================
            const visitId = incomingInstantId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            resultingVisitId = visitId;

            const newVisit: Record<string, any> = {
                id: visitId,
                placeName: placeName,
                category: finalCategory,
                date: date,
                source: 'momenty',
                isPending: isAmbiguous,
                zone: cleanCityName,
                cityName: cleanCityName,
            };

            if (incomingInstantId) newVisit.instantId = incomingInstantId;
            if (postUrl) newVisit.momentyUrl = postUrl;
            if (resolvedImageUrl) newVisit.momentyImageUrl = resolvedImageUrl;

            if (resolvedDishName) {
                newVisit.dishName = resolvedDishName;
                newVisit.orderedItem = resolvedDishName;
            }
            if (resolvedDescription) {
                newVisit.description = resolvedDescription;
                newVisit.note = resolvedDescription;
                if (!resolvedDishName) {
                    newVisit.orderedItem = resolvedDescription;
                }
            } else if (resolvedDishName) {
                newVisit.description = resolvedDishName;
                newVisit.note = resolvedDishName;
            }

            if (isAmbiguous) {
                newVisit.possibleCategories = possibleCategories;
            }

            await updateDoc(userRef, {
                visits: arrayUnion(newVisit)
            });

            console.log(`[External Visit API] Successfully ADDED new visit for ${userEmail} at ${placeName}`);
        }

        // ==============================================================
        // 7. Synchroniser le plat / spécialité dans la base globale zones
        // ==============================================================
        try {
            const currentEffectivePlace = (wasUpdated ? finalVisitsArray[existingIndex]?.placeName : placeName) || placeName;
            const newDishCandidate = resolvedDishName || incomingDesc;

            if (currentEffectivePlace && newDishCandidate) {
                const zonesSnap = await getDocs(collection(db, 'zones'));
                const normalizedPlace = currentEffectivePlace.trim().toLowerCase();
                let targetZoneDoc = null;
                let currentSpecialties: Record<string, string[]> = {};

                for (const zoneDoc of zonesSnap.docs) {
                    const data = zoneDoc.data();
                    const allPlacesInZone = [
                        ...(data.cafes || []),
                        ...(data.restaurants || []),
                        ...(data.fastFoods || []),
                        ...(data.brunch || []),
                        ...(data.kharjet || data.balade || []),
                        ...(data.shopping || [])
                    ];

                    const matchedPlace = allPlacesInZone.find(p => fuzzyMatch(p.toLowerCase(), normalizedPlace));
                    if (matchedPlace) {
                        targetZoneDoc = zoneDoc;
                        currentSpecialties = data.specialties || {};
                        break;
                    }
                }

                if (targetZoneDoc) {
                    const placeKey = Object.keys(currentSpecialties).find(k => k.toLowerCase() === normalizedPlace) || currentEffectivePlace.trim();
                    let existingDishList = currentSpecialties[placeKey] || [];

                    // Si on modifie un plat existant, on remplace l'ancienne valeur par la nouvelle
                    if (oldDishToReplace && existingDishList.some(d => d.toLowerCase() === oldDishToReplace.toLowerCase())) {
                        existingDishList = existingDishList.map(d =>
                            d.toLowerCase() === oldDishToReplace.toLowerCase() ? newDishCandidate : d
                        );
                    } else if (!existingDishList.some(d => d.toLowerCase() === newDishCandidate.toLowerCase())) {
                        existingDishList = [...existingDishList, newDishCandidate];
                    }

                    const updatedSpecialties = {
                        ...currentSpecialties,
                        [placeKey]: existingDishList
                    };

                    await updateDoc(doc(db, 'zones', targetZoneDoc.id), {
                        specialties: updatedSpecialties
                    });
                    console.log(`[External Visit API] Synchronized dish in global specialties for ${currentEffectivePlace}: ${newDishCandidate}`);
                }
            }
        } catch (syncError) {
            console.error('[External Visit API] Failed to sync specialty with zones:', syncError);
        }

        return NextResponse.json({
            success: true,
            updated: wasUpdated,
            message: wasUpdated ? "Description du plat mise à jour avec succès" : "Visite ajoutée avec succès",
            visitId: resultingVisitId,
            orderedItem: resolvedDishName || incomingDesc || null,
            description: resolvedDescription || null,
            finalCategory: finalCategory
        }, { headers: corsHeaders() });

    } catch (error) {
        console.error('[External Visit API] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur interne du serveur'
        }, { status: 500, headers: corsHeaders() });
    }
}
