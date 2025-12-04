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

// Fonction pour créer un ID propre pour Firestore
function safeId(text: string) {
  return text
    .replace(/\//g, '-')          // pas de slash FIRESTORE DANGER
    .replace(/[^\w\s-]/g, '')     // enlève caractères spéciaux
    .replace(/\s+/g, '_')         // remplace espaces par underscores
    .toLowerCase();
}

// Données extraites du fichier decision-maker-flow.ts
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
      zone: "Mutuelleville / Alain Savary", 
      places: ["Eric Kayser", "Café culturel Jaziya", "La place café & gourmandises"] 
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

async function seedByZone() {
  try {
    console.log("📌 Début du seeding par zone...");

    // Regrouper les zones par type
    const categories = ["cafes", "restaurants", "fastFoods", "brunch", "bars"];

    // 1. Construire une map zone → { cafés:[], restaurants:[], ... }
    const zonesMap: { [key: string]: any } = {};

    categories.forEach((category) => {
      cleanData[category as keyof typeof cleanData].forEach((item: any) => {
        if (!zonesMap[item.zone]) {
          zonesMap[item.zone] = {
            cafes: [],
            restaurants: [],
            fastFoods: [],
            brunch: [],
            bars: []
          };
        }
        zonesMap[item.zone][category] = item.places;
      });
    });

    // 2. Enregistrer chaque zone dans Firestore
    for (const zoneName of Object.keys(zonesMap)) {
      const id = safeId(zoneName);

      await setDoc(doc(db, 'zones', id), {
        zone: zoneName,
        ...zonesMap[zoneName]
      });

      console.log(`✔️ Zone ajoutée : ${zoneName} (ID: ${id})`);
    }

    console.log("\n🎉 SEEDING TERMINÉ !");
    console.log(`Zones ajoutées : ${Object.keys(zonesMap).length}`);

  } catch (error) {
    console.error("❌ Erreur :", error);
  }
}

seedByZone();
