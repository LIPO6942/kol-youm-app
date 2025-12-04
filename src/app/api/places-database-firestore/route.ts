import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Configuration Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Vérifier la configuration
if (!firebaseConfig.projectId) {
  console.error('Firebase configuration missing:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasProjectId: !!firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId
  });
}

// Initialiser Firebase
let app;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase');
}

const db = getFirestore(app as any);

interface PlaceData {
  zone: string;
  places: string[];
}

interface PlacesDatabase {
  cafes: PlaceData[];
  restaurants?: PlaceData[];
  fastFoods?: PlaceData[];
  brunch?: PlaceData[];
  bars?: PlaceData[];
}

export async function GET() {
  try {
    // Vérifier si Firebase est configuré
    if (!firebaseConfig.projectId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Firebase configuration missing. Please check environment variables.' 
      }, { status: 500 });
    }

    const placesDoc = await getDoc(doc(db, 'system', 'places'));
    
    if (!placesDoc.exists()) {
      // Si le document n'existe pas, retourner une base vide
      console.log('No places document found, returning empty database');
      return NextResponse.json({ 
        success: true, 
        data: { cafes: [], restaurants: [], fastFoods: [], brunch: [], bars: [] } 
      });
    }
    
    const data = placesDoc.data() as PlacesDatabase;
    console.log('Places data loaded successfully:', {
      cafes: data.cafes?.length || 0,
      restaurants: data.restaurants?.length || 0,
      fastFoods: data.fastFoods?.length || 0
    });
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error reading places from Firestore:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to read places database' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, zone, places, category } = await request.json();

    console.log('Firestore API Request:', { action, zone, places: places?.length, category });

    if (action === 'update') {
      const placesDoc = await getDoc(doc(db, 'system', 'places'));
      
      let currentData: PlacesDatabase = { cafes: [], restaurants: [], fastFoods: [], brunch: [], bars: [] };
      
      if (placesDoc.exists()) {
        currentData = placesDoc.data() as PlacesDatabase;
      }
      
      // Mettre à jour la catégorie et la zone spécifiques
      if (!currentData[category as keyof PlacesDatabase]) {
        currentData[category as keyof PlacesDatabase] = [];
      }
      
      const categoryZones = currentData[category as keyof PlacesDatabase] as PlaceData[];
      const existingZoneIndex = categoryZones.findIndex(z => z.zone === zone);
      
      if (existingZoneIndex >= 0) {
        // Mettre à jour la zone existante
        categoryZones[existingZoneIndex].places = places;
      } else {
        // Ajouter une nouvelle zone
        categoryZones.push({ zone, places });
      }
      
      // Sauvegarder dans Firestore
      await setDoc(doc(db, 'system', 'places'), currentData);
      
      console.log('Firestore updated successfully');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating places in Firestore:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update places database' 
    }, { status: 500 });
  }
}
