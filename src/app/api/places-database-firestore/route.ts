import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDocs } from 'firebase/firestore';
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

    // Lire tous les documents de la collection zones
    const zonesCollection = collection(db, 'zones');
    const zonesSnapshot = await getDocs(zonesCollection);
    
    if (zonesSnapshot.empty) {
      console.log('No zones found, returning empty database');
      return NextResponse.json({ 
        success: true, 
        data: { cafes: [], restaurants: [], fastFoods: [], brunch: [], bars: [] } 
      });
    }
    
    // Convertir en structure par catégorie
    const zonesData = zonesSnapshot.docs.map(doc => doc.data());
    const placesDatabase = {
      cafes: zonesData.filter(z => z.cafes && z.cafes.length > 0).map(z => ({ zone: z.zone, places: z.cafes })),
      restaurants: zonesData.filter(z => z.restaurants && z.restaurants.length > 0).map(z => ({ zone: z.zone, places: z.restaurants })),
      fastFoods: zonesData.filter(z => z.fastFoods && z.fastFoods.length > 0).map(z => ({ zone: z.zone, places: z.fastFoods })),
      brunch: zonesData.filter(z => z.brunch && z.brunch.length > 0).map(z => ({ zone: z.zone, places: z.brunch })),
      bars: zonesData.filter(z => z.bars && z.bars.length > 0).map(z => ({ zone: z.zone, places: z.bars }))
    };
    
    console.log('Zones data loaded successfully:', {
      cafes: placesDatabase.cafes.length,
      restaurants: placesDatabase.restaurants.length,
      fastFoods: placesDatabase.fastFoods.length
    });
    
    return NextResponse.json({ success: true, data: placesDatabase });
  } catch (error) {
    console.error('Error reading zones from Firestore:', error);
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
      // Créer un ID safe pour la zone
      const zoneId = zone
        .replace(/\//g, '-')          // pas de slash FIRESTORE DANGER
        .replace(/[^\w\s-]/g, '')     // enlève caractères spéciaux
        .replace(/\s+/g, '_')         // remplace espaces par underscores
        .toLowerCase();

      // Lire le document de la zone
      const zoneDoc = await getDoc(doc(db, 'zones', zoneId));
      
      let zoneData: any = {
        zone: zone,
        cafes: [],
        restaurants: [],
        fastFoods: [],
        brunch: [],
        bars: []
      };
      
      if (zoneDoc.exists()) {
        zoneData = zoneDoc.data();
      }
      
      // Mettre à jour la catégorie spécifique
      zoneData[category] = places;
      
      // Sauvegarder dans Firestore
      await setDoc(doc(db, 'zones', zoneId), zoneData);
      
      console.log('Zone updated successfully:', zoneId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating zone in Firestore:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update places database' 
    }, { status: 500 });
  }
}
