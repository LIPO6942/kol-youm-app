import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

// Configuration CORS
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders() });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month'); // ex: "2026-08"
        const userEmail = searchParams.get('userEmail');

        const now = new Date();
        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const targetMonth = monthParam || `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

        // 1. Essai d'appel direct vers l'API CarCare (si configurée sur Vercel ou en local)
        const carCareBaseUrl = process.env.CARCARE_API_URL || process.env.NEXT_PUBLIC_CARCARE_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : undefined);
        
        if (carCareBaseUrl) {
            try {
                const cleanUrl = carCareBaseUrl.replace(/\/$/, '');
                const targetEndpoint = `${cleanUrl}/api/monthly-mileage?month=${encodeURIComponent(targetMonth)}${userEmail ? `&userEmail=${encodeURIComponent(userEmail)}` : ''}`;
                
                console.log(`[CarCare Proxy] Appel vers CarCare API: ${targetEndpoint}`);
                const response = await fetch(targetEndpoint, {
                    headers: { 'Accept': 'application/json' },
                    next: { revalidate: 300 } // Cache 5 min
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && typeof data.monthlyMileage === 'number') {
                        return NextResponse.json({
                            success: true,
                            month: targetMonth,
                            monthlyMileage: data.monthlyMileage,
                            totalCost: data.totalCost || 0,
                            vehicleName: data.vehicleName || 'Mon Véhicule',
                            source: 'carcare-api'
                        }, { headers: corsHeaders() });
                    }
                }
            } catch (apiErr: any) {
                console.warn('[CarCare Proxy] Échec appel CarCare API:', apiErr.message);
            }
        }

        // 2. Recherche dans Firestore Kol Youm si des statistiques CarCare ont été enregistrées / synchronisées
        try {
            const db = getAdminFirestore();
            if (userEmail) {
                const usersSnap = await db.collection('users').where('email', '==', userEmail).get();
                if (!usersSnap.empty) {
                    const userData = usersSnap.docs[0].data();
                    const carCareStats = userData.carCareStats || {};
                    const monthStat = carCareStats[targetMonth];

                    if (monthStat && typeof monthStat.mileage === 'number') {
                        return NextResponse.json({
                            success: true,
                            month: targetMonth,
                            monthlyMileage: monthStat.mileage,
                            totalCost: monthStat.totalCost || 0,
                            vehicleName: monthStat.vehicleName || 'Mon Véhicule',
                            source: 'firestore-cached'
                        }, { headers: corsHeaders() });
                    }
                }
            }
        } catch (dbErr: any) {
            console.warn('[CarCare Proxy] Échec lecture Firestore:', dbErr.message);
        }

        // 3. Fallback sécurisé : 0 km si aucune donnée n'a pu être résolue
        return NextResponse.json({
            success: true,
            month: targetMonth,
            monthlyMileage: 0,
            totalCost: 0,
            vehicleName: 'CarCare',
            source: 'none'
        }, { headers: corsHeaders() });

    } catch (error: any) {
        console.error('[CarCare Proxy] Erreur inattendue:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
            monthlyMileage: 0
        }, { status: 500, headers: corsHeaders() });
    }
}

/**
 * Route POST : permet à CarCare (ou un script / webhook) de pousser directement
 * le kilométrage mensuel dans le profil utilisateur Kol Youm.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userEmail, month, mileage, totalCost, vehicleName } = body;

        if (!userEmail || !month || typeof mileage !== 'number') {
            return NextResponse.json({
                success: false,
                error: 'Paramètres manquants (userEmail, month, mileage requis)'
            }, { status: 400, headers: corsHeaders() });
        }

        const db = getAdminFirestore();
        const usersSnap = await db.collection('users').where('email', '==', userEmail).get();

        if (usersSnap.empty) {
            return NextResponse.json({
                success: false,
                error: 'Utilisateur Kol Youm non trouvé'
            }, { status: 404, headers: corsHeaders() });
        }

        const userDoc = usersSnap.docs[0];
        const currentStats = userDoc.data().carCareStats || {};

        currentStats[month] = {
            mileage: Math.round(mileage),
            totalCost: totalCost || 0,
            vehicleName: vehicleName || 'Mon Véhicule',
            updatedAt: new Date().toISOString()
        };

        await userDoc.ref.update({
            carCareStats: currentStats
        });

        return NextResponse.json({
            success: true,
            message: `Kilométrage pour ${month} enregistré avec succès`,
            data: currentStats[month]
        }, { headers: corsHeaders() });

    } catch (error: any) {
        console.error('[CarCare Sync] Erreur POST:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500, headers: corsHeaders() });
    }
}
