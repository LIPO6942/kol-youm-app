import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/firebase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId, movieTitle } = await req.json();

    if (!userId || !movieTitle) {
      return NextResponse.json(
        { error: 'userId et movieTitle sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const userDoc = doc(firestoreDb, 'users', userId);
    const userSnapshot = await getDoc(userDoc);

    if (!userSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Ajouter le film à la liste à voir
    await updateDoc(userDoc, {
      moviesToWatch: arrayUnion(movieTitle)
    });

    return NextResponse.json({ 
      success: true,
      message: `Film "${movieTitle}" ajouté à la liste à voir`
    });

  } catch (error: any) {
    console.error('Erreur lors de l\'ajout du film à voir:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l\'ajout du film' },
      { status: 500 }
    );
  }
}
