import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

// Données simples sans caractères problématiques
const simpleData = {
  cafes: [
    { zone: "La Soukra", places: ["Lotus Café", "Brown and Sugar Coffee", "First café"] },
    { zone: "El Aouina", places: ["Minuto di STARTELA", "BEANS & CO COFFEE HOUSE", "Sam's Café"] },
    { zone: "Ain Zaghouan Nord", places: ["Barista's", "Way cup", "Il fiore del caffe"] },
    { zone: "Lac 1", places: ["Pavarotti", "La Croisette", "Eric Kayser"] },
    { zone: "Lac 2", places: ["Hookah Coffee Lounge", "Côté Jardin", "Frédéric CASSEL"] },
    { zone: "La Marsa", places: ["Gourmandise Marsa Corniche", "A mi chemins", "North Shore Coffee"] },
    { zone: "Jardins de Carthage", places: ["TCHOICE CAFE", "Eleven coffee shop", "The closet Coffee"] },
    { zone: "Carthage", places: ["Uranium Café d'art", "Barista's Carthage", "Punic'Art"] },
    { zone: "La Goulette Kram", places: ["El Aalia", "Café Restaurant La Plage"] },
    { zone: "Megrine Sidi Rzig", places: ["Fugazi coffee snack", "Double Dose", "Javayou"] },
    { zone: "Boumhal", places: ["Verde Coffee Boumhal", "The 21 Lounge", "JOSEPH COFEE"] },
    { zone: "El Manar", places: ["Hillside Resto Lounge", "Brooklyn Café", "Wolf And Rabbit"] },
    { zone: "Menzah 9", places: ["La Verrière Café Resto", "LA DOREE", "Casa De Papel"] },
    { zone: "Menzah 6", places: ["3al Kif", "café 23", "Le Trait d'union"] },
    { zone: "Menzah 5", places: ["Gourmandise M5", "Eric Kayser", "Lv Club"] },
    { zone: "Menzah 8", places: ["Yalova café restaurant", "Affogato coffee", "Quick Café"] },
    { zone: "Ennasr", places: ["JAGGER", "4 Ever", "FIVE O CLOCK Tea House"] },
    { zone: "Mutuelleville Alain Savary", places: ["Eric Kayser", "Café culturel Jaziya"] }
  ],
  restaurants: [
    { zone: "La Soukra", places: ["Restaurant Test 1", "Restaurant Test 2"] }
  ],
  fastFoods: [
    { zone: "La Soukra", places: ["Fast Food Test 1", "Fast Food Test 2"] }
  ],
  brunch: [
    { zone: "La Soukra", places: ["Brunch Test 1", "Brunch Test 2"] }
  ],
  bars: [
    { zone: "La Soukra", places: ["Bar Test 1", "Bar Test 2"] }
  ]
};

async function seedSimple() {
  try {
    console.log('Début du seeding simple...');
    
    await setDoc(doc(db, 'system', 'places'), simpleData);
    
    console.log('Seeding réussi !');
    console.log(`- Cafés: ${simpleData.cafes.length} zones`);
    console.log(`- Restaurants: ${simpleData.restaurants.length} zones`);
    console.log(`- Fast Foods: ${simpleData.fastFoods.length} zones`);
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

seedSimple();
