import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

// Initialiser Firebase Admin SDK
// Sur Firebase App Hosting, les credentials sont automatiquement disponibles
if (!getApps().length) {
    try {
        // Essayer avec Application Default Credentials (Firebase App Hosting)
        initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    } catch (error) {
        console.error('[Send Notification] Erreur init Firebase Admin:', error);
    }
}

const CRON_SECRET = process.env.CRON_SECRET || 'kol-youm-weekly-notification-secret';

// Messages variés pour ne pas être répétitif
const NOTIFICATION_MESSAGES = [
    {
        title: '🎬 Bilan de la semaine !',
        body: "N'oublie pas de marquer les films que tu as vus cette semaine et de publier tes sorties !",
    },
    {
        title: '📍 Où es-tu sorti cette semaine ?',
        body: "Pense à enregistrer tes sorties de la semaine pour garder une trace de tes découvertes !",
    },
    {
        title: '🍿 C\'est l\'heure du bilan !',
        body: "As-tu vu de bons films ? Découvert de nouveaux endroits ? Viens tout noter dans kol youm !",
    },
    {
        title: '✨ Ta semaine en un coup d\'œil',
        body: "Prends 2 minutes pour noter tes sorties et films de la semaine. Tu te remercieras plus tard !",
    },
    {
        title: '📝 Petit rappel hebdomadaire',
        body: "kol youm t'attend ! Marque tes films vus, tes sorties, et garde une trace de ta semaine.",
    },
    {
        title: '🌟 N\'oublie pas ta semaine !',
        body: "Quels endroits as-tu découverts ? Quels films as-tu regardés ? Viens tout noter !",
    },
    {
        title: '🎯 Rappel kol youm',
        body: "C'est dimanche ! Le moment parfait pour faire le point sur ta semaine. Films, sorties... tout compte !",
    },
];

function getRandomMessage() {
    return NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
}

// Endpoint GET pour le cron job external
export async function GET(request: NextRequest) {
    try {
        // Vérifier le secret pour la sécurité
        const authHeader = request.headers.get('authorization');
        const urlSecret = request.nextUrl.searchParams.get('secret');
        const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret;

        if (providedSecret !== CRON_SECRET) {
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        return await sendWeeklyNotifications();
    } catch (error) {
        console.error('[Send Notification] Erreur:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}

// Aussi supporter POST pour plus de flexibilité
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const providedSecret = authHeader?.replace('Bearer ', '');

        if (providedSecret !== CRON_SECRET) {
            // Essayer dans le body
            try {
                const body = await request.json();
                if (body.secret !== CRON_SECRET) {
                    return NextResponse.json(
                        { success: false, error: 'Non autorisé' },
                        { status: 401 }
                    );
                }
            } catch {
                return NextResponse.json(
                    { success: false, error: 'Non autorisé' },
                    { status: 401 }
                );
            }
        }

        return await sendWeeklyNotifications();
    } catch (error) {
        console.error('[Send Notification] Erreur:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}

async function sendWeeklyNotifications() {
    const db = getFirestore();
    const messaging = getMessaging();

    // Récupérer tous les utilisateurs qui ont un fcmToken
    const usersSnapshot = await db.collection('users').where('notificationsEnabled', '==', true).get();

    if (usersSnapshot.empty) {
        console.log('[Send Notification] Aucun utilisateur avec notifications activées');
        return NextResponse.json({
            success: true,
            message: 'Aucun utilisateur à notifier',
            sent: 0,
        });
    }

    const tokens: string[] = [];
    const userIds: string[] = [];

    usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fcmToken) {
            tokens.push(data.fcmToken);
            userIds.push(doc.id);
        }
    });

    if (tokens.length === 0) {
        return NextResponse.json({
            success: true,
            message: 'Aucun token FCM trouvé',
            sent: 0,
        });
    }

    const message = getRandomMessage();
    console.log(`[Send Notification] Envoi à ${tokens.length} utilisateurs: "${message.title}"`);

    // Préparer les messages pour l'envoi en batch
    const messages = tokens.map(token => ({
        token,
        notification: {
            title: message.title,
            body: message.body,
        },
        webpush: {
            notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: 'weekly-reminder',
                renotify: true,
            },
            fcmOptions: {
                link: '/',
            },
        },
    }));

    // Envoyer toutes les notifications d'un coup (Batch)
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: { userId: string; token: string }[] = [];

    try {
        const response = await messaging.sendEach(messages);

        response.responses.forEach((res, i) => {
            if (res.success) {
                successCount++;
            } else {
                failureCount++;
                const error = res.error as any;
                // Si le token est invalide, le marquer pour suppression
                if (
                    error?.code === 'messaging/registration-token-not-registered' ||
                    error?.code === 'messaging/invalid-registration-token'
                ) {
                    invalidTokens.push({ userId: userIds[i], token: tokens[i] });
                }
                console.error(`[Send Notification] Erreur pour token ${tokens[i].substring(0, 10)}...:`, error?.code || error);
            }
        });
    } catch (batchError) {
        console.error('[Send Notification] Erreur critique lors de l\'envoi batch:', batchError);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de l\'envoi batch' },
            { status: 500 }
        );
    }

    // Nettoyer les tokens invalides
    for (const { userId } of invalidTokens) {
        try {
            await db.collection('users').doc(userId).update({
                fcmToken: null,
                notificationsEnabled: false,
            });
            console.log(`[Send Notification] Token invalide nettoyé pour user ${userId}`);
        } catch (cleanupError) {
            console.error(`[Send Notification] Erreur nettoyage token:`, cleanupError);
        }
    }

    const result = {
        success: true,
        message: `Notifications envoyées`,
        sent: successCount,
        failed: failureCount,
        cleaned: invalidTokens.length,
        total: tokens.length,
        notificationMessage: message.title,
    };

    console.log('[Send Notification] Résultat:', result);
    return NextResponse.json(result);
}
