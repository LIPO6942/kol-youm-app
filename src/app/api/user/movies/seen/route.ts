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
    const body = await req.json();
    const { userId, title, type = 'movie' } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { error: 'userId et title sont requis' },
        { status: 400 }
      );
    }

    const userDoc = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userDoc);

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const fieldName = type === 'movie' ? 'seenMovieTitles' : 'seenSeriesTitles';

    await setDoc(userDoc, {
      [fieldName]: arrayUnion(title)
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: `${type === 'movie' ? 'Film' : 'Série'} "${title}" ajouté aux vus`
    });

  } catch (error: any) {
    console.error('Erreur lors de l\'ajout aux vus:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l\'ajout' },
      { status: 500 }
    );
  }
}
