import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

async function importPlaces() {
  try {
    console.log('Début de l\'importation des lieux...');
    
    // Lire le fichier decision-maker-flow.ts
    const filePath = join(process.cwd(), 'src', 'ai', 'flows', 'decision-maker-flow.ts');
    const fileContent = await readFile(filePath, 'utf-8');
    
    const placesData: PlacesDatabase = {
      cafes: [],
      restaurants: [],
      fastFoods: [],
      brunch: [],
      bars: []
    };

    // Fonction helper pour extraire les lieux d'une catégorie
    const extractCategoryPlaces = (categoryName: string, pattern: RegExp) => {
      const categoryMatch = fileContent.match(pattern);
      if (categoryMatch) {
        const zonePattern = /- \*\*Zone ([^:]+) :\*\*([^\n]+(?:\n[^\n-]+)*)/g;
        const zones: PlaceData[] = [];
        let match;
        
        while ((match = zonePattern.exec(categoryMatch[1])) !== null) {
          const zoneName = match[1].trim();
          const placesText = match[2].replace(/\.\s*$/, ''); // Remove trailing dot
          const places = placesText.split(',').map(p => p.trim()).filter(p => p);
          zones.push({ zone: zoneName, places });
        }
        
        return zones;
      }
      return [];
    };

    // Extraire les cafés
    placesData.cafes = extractCategoryPlaces(
      'cafés',
      /{{#if isCafeCategory}}([\s\S]*?){{\/if}}/
    );

    // Extraire les fast foods
    placesData.fastFoods = extractCategoryPlaces(
      'fast foods',
      /{{#if isFastFoodCategory}}([\s\S]*?){{\/if}}/
    );

    // Rechercher d'autres catégories
    const otherCategories = [
      { name: 'restaurants', pattern: /{{#if isRestaurantCategory}}([\s\S]*?){{\/if}}/ },
      { name: 'brunch', pattern: /{{#if isBrunchCategory}}([\s\S]*?){{\/if}}/ },
      { name: 'bars', pattern: /{{#if isBarCategory}}([\s\S]*?){{\/if}}/ }
    ];

    otherCategories.forEach(cat => {
      const match = fileContent.match(cat.pattern);
      if (match) {
        placesData[cat.name as keyof PlacesDatabase] = extractCategoryPlaces(cat.name, cat.pattern);
      }
    });

    // Sauvegarder dans Firestore
    await setDoc(doc(db, 'system', 'places'), placesData);
    
    console.log('Importation réussie !');
    console.log('Résumé des données importées :');
    console.log(`- Cafés: ${placesData.cafes.length} zones`);
    console.log(`- Fast Foods: ${placesData.fastFoods?.length || 0} zones`);
    console.log(`- Restaurants: ${placesData.restaurants?.length || 0} zones`);
    console.log(`- Brunch: ${placesData.brunch?.length || 0} zones`);
    console.log(`- Bars: ${placesData.bars?.length || 0} zones`);
    
  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
  }
}

importPlaces();
