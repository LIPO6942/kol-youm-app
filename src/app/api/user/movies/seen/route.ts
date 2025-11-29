import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('API seen appelée');
    
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

    console.log('Simulation d\'ajout du film:', movieTitle, 'pour utilisateur:', userId);
    
    // Pour l'instant, simuler l'ajout sans Firestore
    console.log('Film ajouté avec succès (simulé)');
    
    return NextResponse.json({ 
      success: true,
      message: `Film "${movieTitle}" ajouté aux films vus (simulé)`
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
