import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Configuration Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    const placesDoc = await getDoc(doc(db, 'system', 'places'));
    
    if (!placesDoc.exists()) {
      // Si le document n'existe pas, retourner une base vide
      return NextResponse.json({ 
        success: true, 
        data: { cafes: [], restaurants: [], fastFoods: [], brunch: [], bars: [] } 
      });
    }
    
    const data = placesDoc.data() as PlacesDatabase;
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error reading places from Firestore:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to read places database' 
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
