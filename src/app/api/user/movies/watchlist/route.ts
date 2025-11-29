import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/firebase/client';

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
    const userDoc = doc(firestoreDb, 'users', userId);
    const userSnapshot = await getDoc(userDoc);

    if (!userSnapshot.exists()) {
      console.error('Utilisateur non trouvé:', userId);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    console.log('Utilisateur trouvé, ajout du film à voir:', movieTitle);
    
    // Ajouter le film à la liste à voir
    await updateDoc(userDoc, {
      moviesToWatch: arrayUnion(movieTitle)
    });

    console.log('Film à voir ajouté avec succès');
    
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
