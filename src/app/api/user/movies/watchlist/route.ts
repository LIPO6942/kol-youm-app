import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuration Firebase pour le serveur
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialiser Firebase côté serveur
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('API watchlist appelée');
    
    const body = await req.json();
    console.log('Body reçu:', body);
    
    const { userId, movieTitle } = body;

    if (!userId || !movieTitle) {
      console.error('Paramètres manquants:', { userId, movieTitle });
      return NextResponse.json(
        { error: 'userId et movieTitle sont requis' },
        { status: 400 }
      );
    }

    console.log('Vérification de l\'utilisateur:', userId);
    
    // Vérifier que l'utilisateur existe
    const userDoc = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userDoc);

    console.log('User snapshot exists:', userSnapshot.exists());
    
    if (!userSnapshot.exists()) {
      console.error('Utilisateur non trouvé:', userId);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    console.log('Utilisateur trouvé, données:', userSnapshot.data());
    console.log('Ajout du film à voir:', movieTitle);
    
    // Vérifier si le champ moviesToWatch existe
    const userData = userSnapshot.data();
    console.log('moviesToWatch actuel:', userData?.moviesToWatch);
    
    // Si le champ n'existe pas, l'initialiser
    if (!userData?.moviesToWatch) {
      console.log('Initialisation du champ moviesToWatch');
      await setDoc(userDoc, {
        moviesToWatch: [movieTitle]
      }, { merge: true });
    } else {
      // Ajouter le film à la liste à voir
      await setDoc(userDoc, {
        moviesToWatch: arrayUnion(movieTitle)
      }, { merge: true });
    }

    console.log('Film à voir ajouté avec succès');
    
    return NextResponse.json({ 
      success: true,
      message: `Film "${movieTitle}" ajouté à la liste à voir`
    });

  } catch (error: any) {
    console.error('Erreur lors de l\'ajout du film à voir:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l\'ajout du film' },
      { status: 500 }
    );
  }
}
