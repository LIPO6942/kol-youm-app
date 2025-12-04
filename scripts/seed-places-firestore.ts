import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
  restaurants: PlaceData[];
  fastFoods: PlaceData[];
  brunch: PlaceData[];
  bars: PlaceData[];
}

// Données extraites du fichier decision-maker-flow.ts
const placesData: PlacesDatabase = {
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
      zone: "La Goulette/Kram",
      places: ["El Aalia", "Café Restaurant La Plage", "Wet Flamingo(Bar)"]
    },
    {
      zone: "Mégrine/Sidi Rzig",
      places: [
        "Fugazi coffee&snack", "Double Dose", "Javayou", "Salon de thé white lounge",
        "La Dolce Vita", "SHOW OFF", "Wood&ROPES", "Gourmandise Megrine"
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
    },
    {
      zone: "Mutuelleville/Alain Savary",
      places: ["Eric Kayser", "Café culturel Jaziya", "La place café & gourmandises"]
    }
  ],
  restaurants: [
    {
      zone: "La Soukra",
      places: ["Restaurant test 1", "Restaurant test 2"]
    }
  ],
  fastFoods: [
    {
      zone: "La Soukra",
      places: ["Fast Food test 1", "Fast Food test 2"]
    }
  ],
  brunch: [
    {
      zone: "La Soukra",
      places: ["Brunch test 1", "Brunch test 2"]
    }
  ],
  bars: [
    {
      zone: "La Soukra",
      places: ["Bar test 1", "Bar test 2"]
    }
  ]
};

async function seedPlaces() {
  try {
    console.log('Début du seeding des lieux dans Firestore...');
    
    // Sauvegarder dans Firestore
    await setDoc(doc(db, 'system', 'places'), placesData);
    
    console.log('Seeding réussi !');
    console.log('Résumé des données ajoutées :');
    console.log(`- Cafés: ${placesData.cafés.length} zones`);
    console.log(`- Restaurants: ${placesData.restaurants.length} zones`);
    console.log(`- Fast Foods: ${placesData.fastFoods.length} zones`);
    console.log(`- Brunch: ${placesData.brunch.length} zones`);
    console.log(`- Bars: ${placesData.bars.length} zones`);
    
    // Afficher quelques exemples
    console.log('\nExemples de zones ajoutées :');
    placesData.cafés.slice(0, 3).forEach((zone) => {
      console.log(`- ${zone.zone}: ${zone.places.length} lieux`);
    });
    
  } catch (error) {
    console.error('Erreur lors du seeding:', error);
  }
}

seedPlaces();
