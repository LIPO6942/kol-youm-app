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

// Uniquement les zones sans caractères spéciaux
const cleanData = {
  cafes: [
    { 
      zone: "La Soukra", 
      places: ["Lotus Café", "Brown and Sugar Coffee", "First café", "Caféte du Golf"] 
    },
    { 
      zone: "El Aouina", 
      places: [
        "Minuto di STARTELA", "BEANS & CO COFFEE HOUSE", "La Vero café Lounge", "Sam's Café",
        "Bleuet", "Ali's Coffee", "Café Patchwork", "Infinity Aouina", "SOHO Coffee",
        "Ô Palet", "Dell'Angelo Cafè", "Café Slow X", "Green Coffee", "Padova",
        "Beans&Co", "Downtown", "Barista's", "Pep's coffee", "The One Coffee Lounge",
        "InSider L'Aouina", "idea lounge", "Epic Coffee Shop", "GATSBY", "Balkon",
        "MYKONOS MEMORIES COFFE", "Café Forever Lounge", "Pivoine coffee & more",
        "Palet Royal", "Salon De Thé New Day", "Le Wagram", "BELLUCCI coffee & more",
        "Business bey", "Restaurant Italien Terrazzino"
      ] 
    },
    { 
      zone: "Ain Zaghouan Nord", 
      places: ["Barista's", "Way cup", "Il fiore del caffe", "CAFE ROSE COTTAGE", "La Duchesse", "Carré Gourmand", "The W's Coffee", "PlayPresso", "Coffe shop Copa vida"] 
    },
    { 
      zone: "Lac 1", 
      places: ["Pavarotti", "La Croisette", "Eric Kayser", "Biwa", "Le Bistrot", "Cosmitto"] 
    },
    { 
      zone: "Lac 2", 
      places: [
        "Hookah Coffee Lounge", "Côté Jardin", "Frédéric CASSEL", "U-TOO Coffee & Grill",
        "Kube", "George V", "SO BRITISH LAC 2", "Zanzibar Café", "Billionaire Café",
        "OMEGA Coffee", "Barista's Lac 2", "The Big Dip"
      ] 
    },
    { 
      zone: "La Marsa", 
      places: [
        "Gourmandise Marsa Corniche", "A mi chemins", "North Shore Coffee and Snacks",
        "Ivy Coffee Shop & Restaurant", "Grignotine", "Saint Tropez", "La Marsa",
        "Le Gourmet", "Barista's", "Café Victor Hugo H", "SABATO COFFEE SHOP & RESTAURANT",
        "Patchwork", "Café Calimero", "Eric Kayser", "PAUL", "Blues House and food", "Café Journal"
      ] 
    },
    { 
      zone: "Jardins de Carthage", 
      places: [
        "TCHOICE CAFE", "Eleven coffee shop", "The closet Coffee shop", "Bestoff coffee",
        "The Address", "Coin d'alma - Jardins de Carthage", "La vida", "boho",
        "The Bistrot B&D", "Metropolitan Coffee Shop", "The Glory Coffee", "Athiniôs Coffee",
        "Saint Germain JDC", "3M coffee", "Mille Mercis", "The Garrison 06", "Galerie Café",
        "The Mayfair Lounge"
      ] 
    },
    { 
      zone: "Carthage", 
      places: [
        "Uranium Café d'art", "Barista's Carthage Dermech", "Punic'Art", "Café Yam's",
        "Next One", "Avra Carthage", "The Hills", "Matcha Club | Carthage"
      ] 
    },
    { 
      zone: "Boumhal", 
      places: [
        "Verde Coffee Boumhal", "The 21 Lounge", "JOSEPH COFEE LOUNGE",
        "Beverly Hills Lounge", "Di più", "BISOU", "Le Parisien", "Times Square"
      ] 
    },
    { 
      zone: "El Manar", 
      places: [
        "Hillside Resto-Lounge", "Brooklyn Café", "Wolf And Rabbit", "Pantree",
        "Vero Gusto", "Q'Mug", "Story coffee", "Môme Lounge", "Tirana Café", "Villa Azzura"
      ] 
    },
    { 
      zone: "Menzah 9", 
      places: ["La Verrière - Café Resto", "LA DOREE", "Casa De Papel"] 
    },
    { 
      zone: "Menzah 6", 
      places: [
        "3al Kif", "café 23", "Le Trait d'union", "A casa mia", "Le Montmartre",
        "Sacré Cœur", "La Seine", "The 716 Menzah 6", "Tartes et haricots"
      ] 
    },
    { 
      zone: "Menzah 5", 
      places: [
        "Gourmandise M5", "Eric Kayser", "Lv Club", "Seven S M5", "Kälo café",
        "Nüma coffee & kitchen", "The Paradise", "Myplace", "El Chapo", "ABUELA'S CAFE"
      ] 
    },
    { 
      zone: "Menzah 8", 
      places: ["Yalova café restaurant & lounge", "Affogato coffee shop", "Quick Café"] 
    },
    { 
      zone: "Ennasr", 
      places: [
        "JAGGER", "4 Ever", "FIVE O' CLOCK Tea House & Snack", "Le Baron Café",
        "Café Blanc", "Versailles", "THE COFFEE 777", "The 616 coffee PLUS",
        "Cafe Royal", "tornados coffee", "Queen", "Chesterfield", "MM Café",
        "PROST Coffee", "Via Vai", "HERMES CAFE", "Minions coffee", "Piacere",
        "Vagary tunis", "Paty coffee lounge", "Barcelone Coffee"
      ] 
    }
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

async function seedClean() {
  try {
    console.log('Début du seeding clean (sans caractères spéciaux)...');
    
    await setDoc(doc(db, 'system', 'places'), cleanData);
    
    console.log('Seeding réussi !');
    console.log(`- Cafés: ${cleanData.cafes.length} zones (sans caractères spéciaux)`);
    console.log(`- Restaurants: ${cleanData.restaurants.length} zones`);
    console.log(`- Fast Foods: ${cleanData.fastFoods.length} zones`);
    console.log(`- Brunch: ${cleanData.brunch.length} zones`);
    console.log(`- Bars: ${cleanData.bars.length} zones`);
    
    console.log('\nZones ajoutées :');
    cleanData.cafes.forEach((zone) => {
      console.log(`- ${zone.zone}: ${zone.places.length} lieux`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

seedClean();
