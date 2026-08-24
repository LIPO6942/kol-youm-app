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

interface CategoryPlaces {
  cafes?: string[];
  restaurants?: string[];
  fastFoods?: string[];
  brunch?: string[];
  kharjet?: string[];
  balade?: string[];
  shopping?: string[];
  cinemas?: string[];
}

interface ZoneData {
  zone: string;
  categories: CategoryPlaces;
  specialties?: Record<string, string[]>;
}

interface PlacesDatabase {
  zones: ZoneData[];
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
        data: { zones: [] }
      });
    }

    // Convertir en structure par zone → catégories → lieux
    const zonesData = zonesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        zone: data.zone || '',
        categories: {
          cafes: data.cafes || [],
          restaurants: data.restaurants || [],
          fastFoods: data.fastFoods || [],
          brunch: data.brunch || [],
          kharjet: data.kharjet || data.balade || [],
          shopping: data.shopping || [],
          cinemas: data.cinemas || []
        },
        specialties: data.specialties || {}
      } as ZoneData;
    });

    const placesDatabase: PlacesDatabase = {
      zones: zonesData
    };

    console.log('Zones data loaded successfully:', {
      totalZones: placesDatabase.zones.length
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
    const { action, zone, places, category, placeName: bodyPlaceName, specialties, initFromLocal } = await request.json();

    console.log('Firestore API Request:', { action, zone, places: places?.length, category, hasSpecialties: !!specialties, initFromLocal });

    if (action === 'init' && initFromLocal) {
      // Initialiser Firestore avec les données du fichier local
      const fs = require('fs');
      const path = require('path');

      const filePath = path.join(process.cwd(), 'src', 'ai', 'flows', 'decision-maker-flow.ts');
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Parser le contenu pour extraire les zones et catégories
      const zonesData: any[] = [];

      // Parser les cafés
      const cafesSection = fileContent.match(/{{#if isCafeCategory}}([\s\S]*?){{\/if}}/);
      if (cafesSection) {
        const zones = cafesSection[1].match(/- \*\*Zone ([^:]+) :\*\* (.+)\./g);
        if (zones) {
          zones.forEach((zoneLine: string) => {
            const match = zoneLine.match(/- \*\*Zone ([^:]+) :\*\* (.+)\./);
            if (match) {
              const zoneName = match[1].trim();
              const places = match[2].split(',').map((p: string) => p.trim()).filter((p: string) => p);

              let existingZone = zonesData.find(z => z.zone === zoneName);
              if (!existingZone) {
                existingZone = {
                  zone: zoneName,
                  cafes: [],
                  restaurants: [],
                  fastFoods: [],
                  brunch: [],
                  balade: [],
                  shopping: []
                };
                zonesData.push(existingZone);
              }
              existingZone.cafes = places;
            }
          });
        }
      }

      // Parser les fast foods
      const fastFoodsSection = fileContent.match(/{{#if isFastFoodCategory}}([\s\S]*?){{\/if}}/);
      if (fastFoodsSection) {
        const zones = fastFoodsSection[1].match(/- \*\*Zone ([^:]+) :\*\* (.+)\./g);
        if (zones) {
          zones.forEach((zoneLine: string) => {
            const match = zoneLine.match(/- \*\*Zone ([^:]+) :\*\* (.+)\./);
            if (match) {
              const zoneName = match[1].trim();
              const places = match[2].split(',').map((p: string) => p.trim()).filter((p: string) => p);

              let existingZone = zonesData.find(z => z.zone === zoneName);
              if (!existingZone) {
                existingZone = {
                  zone: zoneName,
                  cafes: [],
                  restaurants: [],
                  fastFoods: [],
                  brunch: [],
                  balade: [],
                  shopping: []
                };
                zonesData.push(existingZone);
              }
              existingZone.fastFoods = places;
            }
          });
        }
      }

      // Parser les restaurants
      const restaurantsSection = fileContent.match(/{{#if isRestaurantCategory}}([\s\S]*?){{\/if}}/);
      if (restaurantsSection) {
        const zones = restaurantsSection[1].match(/- \*\*Zone ([^:]+) :\*\* (.+)\./g);
        if (zones) {
          zones.forEach((zoneLine: string) => {
            const match = zoneLine.match(/- \*\*Zone ([^:]+) :\*\* (.+)\./);
            if (match) {
              const zoneName = match[1].trim();
              const places = match[2].split(',').map((p: string) => p.trim()).filter((p: string) => p);

              let existingZone = zonesData.find(z => z.zone === zoneName);
              if (!existingZone) {
                existingZone = {
                  zone: zoneName,
                  cafes: [],
                  restaurants: [],
                  fastFoods: [],
                  brunch: [],
                  balade: [],
                  shopping: []
                };
                zonesData.push(existingZone);
              }
              existingZone.restaurants = places;
            }
          });
        }
      }

      // Parser les brunch
      const brunchSection = fileContent.match(/{{#if isBrunchCategory}}([\s\S]*?){{\/if}}/);
      if (brunchSection) {
        const zones = brunchSection[1].match(/- \*\*Zone ([^:]+) :\*\* (.+)\./g);
        if (zones) {
          zones.forEach((zoneLine: string) => {
            const match = zoneLine.match(/- \*\*Zone ([^:]+) :\*\* (.+)\./);
            if (match) {
              const zoneName = match[1].trim();
              const places = match[2].split(',').map((p: string) => p.trim()).filter((p: string) => p);

              let existingZone = zonesData.find(z => z.zone === zoneName);
              if (!existingZone) {
                existingZone = {
                  zone: zoneName,
                  cafes: [],
                  restaurants: [],
                  fastFoods: [],
                  brunch: [],
                  balade: [],
                  shopping: []
                };
                zonesData.push(existingZone);
              }
              existingZone.brunch = places;
            }
          });
        }
      }

      // Importer toutes les zones dans Firestore
      for (const zoneData of zonesData) {
        const zoneId = zoneData.zone
          .replace(/\//g, '-')
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '_')
          .toLowerCase();

        await setDoc(doc(db, 'zones', zoneId), zoneData);
        console.log(`Imported zone: ${zoneData.zone}`);
      }

      return NextResponse.json({
        success: true,
        message: `Importé ${zonesData.length} zones dans Firestore`,
        zones: zonesData.map(z => z.zone)
      });
    }

    const normalizeCatKey = (cat: string) => {
      const lower = cat?.toLowerCase() || '';
      if (lower === 'cafés' || lower === 'café' || lower === 'cafes') return 'cafes';
      if (lower === 'restaurant' || lower === 'restaurants') return 'restaurants';
      if (lower === 'fast-food' || lower === 'fast food' || lower === 'fastfoods' || lower === 'fastfoods') return 'fastFoods';
      if (lower === 'brunch') return 'brunch';
      if (lower === 'kharjet' || lower === 'balade') return 'kharjet';
      if (lower === 'shopping') return 'shopping';
      if (lower === 'cinéma' || lower === 'cinemas') return 'cinemas';
      return lower;
    };

    if (action === 'addPlace') {
      const placeName = bodyPlaceName;
      if (!zone || !placeName) {
        return NextResponse.json({ success: false, error: 'Zone and placeName are required' }, { status: 400 });
      }

      const zoneId = zone
        .replace(/\//g, '-')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();

      const zoneDoc = await getDoc(doc(db, 'zones', zoneId));
      let zoneData: any = {
        zone: zone,
        cafes: [],
        restaurants: [],
        fastFoods: [],
        brunch: [],
        kharjet: [],
        shopping: [],
        cinemas: []
      };

      if (zoneDoc.exists()) {
        zoneData = zoneDoc.data();
        if (!zoneData.cafes) zoneData.cafes = [];
        if (!zoneData.restaurants) zoneData.restaurants = [];
        if (!zoneData.fastFoods) zoneData.fastFoods = [];
        if (!zoneData.brunch) zoneData.brunch = [];
        if (!zoneData.kharjet) zoneData.kharjet = zoneData.balade || [];
        if (!zoneData.shopping) zoneData.shopping = [];
        if (!zoneData.cinemas) zoneData.cinemas = [];
      }

      const categoryKey = normalizeCatKey(category || 'kharjet');
      if (!zoneData[categoryKey]) zoneData[categoryKey] = [];

      const cleanName = placeName.split('[')[0].trim();
      const existingPlaces: string[] = zoneData[categoryKey];
      const placeExists = existingPlaces.some(p => p.split('[')[0].trim().toLowerCase() === cleanName.toLowerCase());

      if (!placeExists) {
        zoneData[categoryKey].push(cleanName);
      }

      if (specialties && Array.isArray(specialties) && specialties.length > 0) {
        if (!zoneData.specialties) zoneData.specialties = {};
        const prevSpecialties = zoneData.specialties[cleanName] || [];
        const mergedSpecialties = Array.from(new Set([...prevSpecialties, ...specialties]));
        zoneData.specialties[cleanName] = mergedSpecialties;
      }

      await setDoc(doc(db, 'zones', zoneId), zoneData);
      console.log(`Added place ${cleanName} to zone ${zoneId} under ${categoryKey}`);
      return NextResponse.json({ success: true, zoneId, placeName: cleanName, category: categoryKey });
    }

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
        kharjet: [],
        shopping: [],
        cinemas: []
      };

      if (zoneDoc.exists()) {
        zoneData = zoneDoc.data();
        // S'assurer que toutes les catégories existent
        if (!zoneData.cafes) zoneData.cafes = [];
        if (!zoneData.restaurants) zoneData.restaurants = [];
        if (!zoneData.fastFoods) zoneData.fastFoods = [];
        if (!zoneData.brunch) zoneData.brunch = [];
        if (!zoneData.kharjet) zoneData.kharjet = zoneData.balade || [];
        if (!zoneData.shopping) zoneData.shopping = [];
        if (!zoneData.cinemas) zoneData.cinemas = [];
      }

      if (category) {
        const categoryKey = normalizeCatKey(category);
        zoneData[categoryKey] = places;
      }

      if (specialties && typeof specialties === 'object') {
        if (!zoneData.specialties) zoneData.specialties = {};
        Object.entries(specialties).forEach(([pName, specs]) => {
          if (Array.isArray(specs)) {
            const existingKey = Object.keys(zoneData.specialties).find(k => k.toLowerCase() === pName.toLowerCase()) || pName;
            const prev = zoneData.specialties[existingKey] || [];
            const merged = Array.from(new Set([...prev, ...specs]));
            zoneData.specialties[existingKey] = merged;
          } else {
            zoneData.specialties[pName] = specs;
          }
        });
      }

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
