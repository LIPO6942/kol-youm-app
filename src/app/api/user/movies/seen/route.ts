import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/firebase/client';
import { getAuth } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('API seen appelée');
    
    // Récupérer le token d'authentification depuis les headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Token d\'authentification manquant');
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    console.log('Token reçu:', token.substring(0, 20) + '...');
    
    const body = await req.json();
    console.log('Body reçu:', body);
    
    const { movieTitle } = body;

    if (!movieTitle) {
      console.error('movieTitle manquant');
      return NextResponse.json(
        { error: 'movieTitle est requis' },
        { status: 400 }
      );
    }

    // Pour l'instant, on utilise le userId du body (à améliorer avec la vérification du token)
    const userId = body.userId;
    if (!userId) {
      console.error('userId manquant');
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      );
    }

    console.log('Vérification de l\'utilisateur:', userId);
    
    // Vérifier que l'utilisateur existe
    const userDoc = doc(firestoreDb, 'users', userId);
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
    console.log('Ajout du film:', movieTitle);
    
    // Vérifier si le champ seenMovieTitles existe
    const userData = userSnapshot.data();
    console.log('seenMovieTitles actuel:', userData?.seenMovieTitles);
    
    // Si le champ n'existe pas, l'initialiser
    if (!userData?.seenMovieTitles) {
      console.log('Initialisation du champ seenMovieTitles');
      await setDoc(userDoc, {
        seenMovieTitles: [movieTitle]
      }, { merge: true });
    } else {
      // Ajouter le film à la liste des films vus
      await setDoc(userDoc, {
        seenMovieTitles: arrayUnion(movieTitle)
      }, { merge: true });
    }

    console.log('Film ajouté avec succès');
    
    return NextResponse.json({ 
      success: true,
      message: `Film "${movieTitle}" ajouté aux films vus`
    });

  } catch (error: any) {
    console.error('Erreur lors de l\'ajout du film vu:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l\'ajout du film' },
      { status: 500 }
    );
  }
}
