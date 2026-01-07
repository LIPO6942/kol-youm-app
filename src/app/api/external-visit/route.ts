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

        // 5. Préparer l'objet visite
        const visitId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newVisit = {
            id: visitId,
            placeName: placeName,
            category: category,
            date: date, // Utilise le timestamp reçu
            orderedItem: dishName || '',
            source: 'momenty' // Information de provenance interne
        };

        // 6. Ajouter la visite au tableau 'visits' de l'utilisateur
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            visits: arrayUnion(newVisit)
        });

        console.log(`[External Visit API] Successfully added visit for ${userEmail} at ${placeName}`);

        return NextResponse.json({
            success: true,
            message: "Visite ajoutée au tableau visits",
            visitId: visitId
        }, { headers: corsHeaders() });

    } catch (error) {
        console.error('[External Visit API] Unexpected error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur interne du serveur'
        }, { status: 500, headers: corsHeaders() });
    }
}
