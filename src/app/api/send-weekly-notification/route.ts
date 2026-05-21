import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

// Initialiser Firebase Admin SDK
if (!getApps().length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            console.log('[Send Notification] Initialisation avec Service Account (Variables séparées)');
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'), // Important: Remplacer les \n échappés
                }),
                projectId,
            });
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log('[Send Notification] Initialisation avec Service Account (JSON)');
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id,
            });
        } else {
            // Repli sur les ADC (Application Default Credentials)
            console.log('[Send Notification] Initialisation avec ADC (Firebase App Hosting)');
            initializeApp({
                projectId: projectId,
            });
        }
    } catch (error) {
        console.error('[Send Notification] Erreur init Firebase Admin:', error);
    }
}

const CRON_SECRET = process.env.CRON_SECRET || 'kol-youm-weekly-notification-secret';

// Messages variés par thématique (Khrouj, Tfarrej, Stylek, 5amem / Dormir moins bête)
const NOTIFICATION_MESSAGES = [
    // --- DORMIR MOINS BÊTE & 5AMEM (Quiz/Talla3) ---
    {
        title: '🧠 Dormir moins bête : Le secret du Kafteji',
        body: "Pourquoi ce plat mythique s'appelle-t-il ainsi ? Découvre son histoire insolite et teste tes connaissances sur 5amem ! 🇹🇳",
    },
    {
        title: '🏛️ Le saviez-vous ? (Culture Tunisienne)',
        body: "Quelle ville de Tunisie abrite le plus grand amphithéâtre romain d'Afrique ? Viens répondre dans le Quiz de 5amem !",
    },
    {
        title: '🌸 Pourquoi le Jasmin est notre symbole ?',
        body: "D'où vient cette tradition parfumée en Tunisie ? Découvre l'anecdote historique ce soir sur 5amem !",
    },
    {
        title: '🏺 Une ruse légendaire à Carthage...',
        body: "Sais-tu comment la reine Didon a fondé Carthage avec une simple peau de bœuf ? Viens faire le quiz 5amem !",
    },
    {
        title: '🥖 Énigme du dimanche : Devine le mot !',
        body: "\"Je commence par M, croustillant, beurré, adoré au petit-déj en Tunisie.\" Entre ta réponse dans le jeu Talla3 !",
    },
    {
        title: '🌌 Pourquoi le ciel est-il bleu ?',
        body: "Ce n'est pas le reflet de la mer ! Viens découvrir la vraie explication scientifique dans le Quiz de ce dimanche.",
    },
    {
        title: '🧠 Gym des neurones avant lundi !',
        body: "Recharge tes batteries cérébrales avec le Quiz Quotidien. 10 questions pour démarrer la semaine au top !",
    },
    {
        title: '🏆 Défi Talla3 : Es-tu à la hauteur ?',
        body: "Remets les éléments dans le bon ordre en moins de 15 secondes. Viens tester tes réflexes sur 5amem !",
    },
    // --- KHROUJ (Sorties/Restos) ---
    {
        title: '📍 Tes sorties de la semaine ?',
        body: "N'oublie pas d'enregistrer tes nouvelles adresses et coups de cœur dans ton passeport culinaire !",
    },
    {
        title: '🌟 Où es-tu allé cette semaine ?',
        body: "Garde une trace de tes sorties ! Prends 2 minutes pour noter les lieux que tu as découverts.",
    },
    // --- TFARREJ (Films/Séries) ---
    {
        title: '🍿 Ciné-bilan de la semaine !',
        body: "Quels films as-tu vus ? Note-les vite dans kol youm avant d'oublier !",
    },
    {
        title: '🎬 À jour dans tes films ?',
        body: "As-tu vu de bons films cette semaine ? Mets à jour ta liste et partage ton avis.",
    },
    // --- STYLEK (Tenues/Garde-robe) ---
    {
        title: '👗 Ton look de la semaine',
        body: "As-tu créé de nouveaux outfits ? Ajoute-les à ton Stylek pour tes prochaines inspirations !",
    },
    {
        title: '✨ Garde-robe à jour',
        body: "Prends un moment pour organiser tes tenues préférées et compléter ton dressing.",
    },
    // --- MIXTE / GENERAL ---
    {
        title: '📝 Ton bilan kol youm',
        body: "Sorties, films, looks... c'est dimanche ! Prends 2 minutes pour tout noter et garder une trace de ta semaine.",
    },
    {
        title: '🎯 Rappel kol youm',
        body: "C'est le moment parfait pour faire le point sur ta semaine. Films, sorties, styles... tout compte !",
    },
];

function getRandomMessage() {
    return NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
}

// Endpoint GET pour le cron job external
export async function GET(request: NextRequest) {
    console.log('[Send Notification] Requête GET reçue');
    try {
        // Vérifier le secret pour la sécurité
        const authHeader = request.headers.get('authorization');
        const urlSecret = request.nextUrl.searchParams.get('secret');
        const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret;

        if (!providedSecret) {
            console.warn('[Send Notification] Aucun secret fourni');
        }

        if (providedSecret !== CRON_SECRET) {
            console.error('[Send Notification] Secret invalide');
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        console.log('[Send Notification] Secret validé, démarrage de l\'envoi...');
        return await sendWeeklyNotifications();
    } catch (error) {
        console.error('[Send Notification] Erreur critique GET:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}

// Aussi supporter POST pour plus de flexibilité
export async function POST(request: NextRequest) {
    console.log('[Send Notification] Requête POST reçue');
    try {
        const authHeader = request.headers.get('authorization');
        const providedSecret = authHeader?.replace('Bearer ', '');

        let secretFromPayload = null;
        try {
            const body = await request.json();
            secretFromPayload = body.secret;
        } catch (e) {
            // Pas de JSON ou erreur de lecture, pas grave si le header est là
        }

        const finalSecret = providedSecret || secretFromPayload;

        if (finalSecret !== CRON_SECRET) {
            console.error('[Send Notification] Secret invalide (POST)');
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        console.log('[Send Notification] Secret validé (POST), démarrage de l\'envoi...');
        return await sendWeeklyNotifications();
    } catch (error) {
        console.error('[Send Notification] Erreur critique POST:', error);
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
    console.log(`[Send Notification] Utilisateurs avec notifications activées: ${usersSnapshot.size}`);

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
    const processedTokens = new Set<string>();

    usersSnapshot.forEach((doc) => {
        const data = doc.data();
        // Lire le tableau fcmTokens (multi-appareils) ou l'ancien champ scalaire
        const userTokens: string[] = Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0
            ? data.fcmTokens.filter(Boolean)
            : (data.fcmToken ? [data.fcmToken] : []);

        userTokens.forEach((token: string) => {
            if (!token || processedTokens.has(token)) return;
            tokens.push(token);
            userIds.push(doc.id);
            processedTokens.add(token);
        });
    });

    console.log(`[Send Notification] Tokens FCM found: ${tokens.length}`);

    if (tokens.length === 0) {
        return NextResponse.json({
            success: true,
            message: 'Aucun token FCM trouvé',
            sent: 0,
        });
    }

    const message = getRandomMessage();
    console.log(`[Send Notification] Message choisi: "${message.title}"`);
    console.log(`[Send Notification] Envoi à ${tokens.length} utilisateurs...`);

    // Préparer les messages pour l'envoi en batch
    const messages = tokens.map(token => ({
        token,
        notification: {
            title: message.title,
            body: message.body,
        },
        webpush: {
            headers: {
                Urgency: 'high',
                TTL: '86400'
            },
            notification: {
                icon: '/icons/icon-192x192.png',  // icône dans le drawer de notification
                badge: '/icons/badge-96x96.png',  // icône barre de statut Android (monochrome)
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
