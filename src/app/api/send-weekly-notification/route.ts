import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { buildSundayNotificationForUser, SundayNotificationPayload } from '@/lib/sunday-notification-utils';

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
                    privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'), // Important: Remplacer les \n échappés et guillemets
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
        link: '/5amem?tab=trivia&id=kafteji-origin&sundayNotification=true',
    },
    {
        title: '🏛️ Le saviez-vous ? (Culture Tunisienne)',
        body: "Quelle ville de Tunisie abrite le plus grand amphithéâtre romain d'Afrique ? Viens répondre dans le Quiz de 5amem !",
        link: '/5amem?tab=trivia&id=el-jem-amphitheatre&sundayNotification=true',
    },
    {
        title: '🌸 Pourquoi le Jasmin est notre symbole ?',
        body: "D'où vient cette tradition parfumée en Tunisie ? Découvre l'anecdote historique ce soir sur 5amem !",
        link: '/5amem?tab=trivia&id=jasmin-symbole&sundayNotification=true',
    },
    {
        title: '🏺 Une ruse légendaire à Carthage...',
        body: "Sais-tu comment la reine Didon a fondé Carthage avec une simple peau de bœuf ? Viens faire le quiz 5amem !",
        link: '/5amem?tab=trivia&id=didon-carthage&sundayNotification=true',
    },
    {
        title: '🥖 Énigme du dimanche : Devine le mot !',
        body: "\"Je commence par M, croustillant, beurré, adoré au petit-déj en Tunisie.\" Entre ta réponse dans le jeu Talla3 !",
        link: '/5amem?tab=talla3',
    },
    {
        title: '🌌 Pourquoi le ciel est-il bleu ?',
        body: "Ce n'est pas le reflet de la mer ! Viens découvrir la vraie explication scientifique dans le Quiz de ce dimanche.",
        link: '/5amem?tab=quiz',
    },
    {
        title: '🧠 Gym des neurones avant lundi !',
        body: "Recharge tes batteries cérébrales avec le Quiz Quotidien. 10 questions pour démarrer la semaine au top !",
        link: '/5amem?tab=quiz',
    },
    {
        title: '🏆 Défi Talla3 : Es-tu à la hauteur ?',
        body: "Remets les éléments dans le bon ordre en moins de 15 secondes. Viens tester tes réflexes sur 5amem !",
        link: '/5amem?tab=talla3',
    },
    // --- KHROUJ (Sorties/Restos) ---
    {
        title: '📍 Tes sorties de la semaine ?',
        body: "N'oublie pas d'enregistrer tes nouvelles adresses et coups de cœur dans ton passeport culinaire !",
        link: '/khrouj',
    },
    {
        title: '🌟 Où es-tu allé cette semaine ?',
        body: "Garde une trace de tes sorties ! Prends 2 minutes pour noter les lieux que tu as découverts.",
        link: '/khrouj',
    },
    // --- TFARREJ (Films/Séries) ---
    {
        title: '🍿 Ciné-bilan de la semaine !',
        body: "Quels films as-tu vus ? Note-les vite dans kol youm avant d'oublier !",
        link: '/tfarrej',
    },
    {
        title: '🎬 À jour dans tes films ?',
        body: "As-tu vu de bons films cette semaine ? Mets à jour ta liste et partage ton avis.",
        link: '/tfarrej',
    },
    // --- STYLEK (Tenues/Garde-robe) ---
    {
        title: '👗 Ton look de la semaine',
        body: "As-tu créé de nouveaux outfits ? Ajoute-les à ton Stylek pour tes prochaines inspirations !",
        link: '/stylek',
    },
    {
        title: '✨ Garde-robe à jour',
        body: "Prends un moment pour organiser tes tenues préférées et compléter ton dressing.",
        link: '/stylek',
    },
    // --- MIXTE / GENERAL ---
    {
        title: '📝 Ton bilan kol youm',
        body: "Sorties, films, looks... c'est dimanche ! Prends 2 minutes pour tout noter et garder une trace de ta semaine.",
        link: '/',
    },
    {
        title: '🎯 Rappel kol youm',
        body: "C'est le moment parfait pour faire le point sur ta semaine. Films, sorties, styles... tout compte !",
        link: '/',
    },
];

function getRandomMessage() {
    return NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)];
}

function isRequestAuthorized(request: NextRequest, secretFromPayload?: string | null): boolean {
    // 1. Détection automatique des appels programmés par Vercel Cron
    const isVercelCron = request.headers.get('x-vercel-cron') === '1' ||
        Boolean(request.headers.get('user-agent')?.includes('vercel-cron'));
    if (isVercelCron) {
        console.log('[Send Notification] Autorisé via Vercel Cron');
        return true;
    }

    // 2. Secret via Header Bearer, paramètre URL ou payload JSON
    const authHeader = request.headers.get('authorization');
    const urlSecret = request.nextUrl.searchParams.get('secret');
    const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret || secretFromPayload;

    if (
        providedSecret &&
        (providedSecret === CRON_SECRET ||
         providedSecret === 'kol-youm-weekly-notification-secret' ||
         providedSecret === process.env.CRON_SECRET)
    ) {
        return true;
    }

    // 3. En local / environnement de développement
    if (process.env.NODE_ENV !== 'production') {
        return true;
    }

    return false;
}

// Endpoint GET pour le cron job external ou les tests
export async function GET(request: NextRequest) {
    console.log('[Send Notification] Requête GET reçue');
    try {
        if (!isRequestAuthorized(request)) {
            console.error('[Send Notification] Accès non autorisé (GET)');
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const testUserId = request.nextUrl.searchParams.get('testUserId');
        if (testUserId) {
            console.log(`[Send Notification] Mode TEST pour userId: ${testUserId}`);
            return await sendTestNotificationToUser(testUserId);
        }

        console.log('[Send Notification] Démarrage de l\'envoi global...');
        return await sendWeeklyNotifications();
    } catch (error) {
        console.error('[Send Notification] Erreur critique GET:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}

// Support POST pour déclenchement avec payload
export async function POST(request: NextRequest) {
    console.log('[Send Notification] Requête POST reçue');
    try {
        let body: any = null;
        try {
            body = await request.json();
        } catch {
            // Corps vide ou non-JSON toléré
        }

        const secretFromPayload = body?.secret;
        if (!isRequestAuthorized(request, secretFromPayload)) {
            console.error('[Send Notification] Accès non autorisé (POST)');
            return NextResponse.json(
                { success: false, error: 'Non autorisé' },
                { status: 401 }
            );
        }

        const testUserId = request.nextUrl.searchParams.get('testUserId') || body?.testUserId;
        if (testUserId) {
            console.log(`[Send Notification] Mode TEST POST pour userId: ${testUserId}`);
            return await sendTestNotificationToUser(testUserId);
        }

        console.log('[Send Notification] Démarrage de l\'envoi global (POST)...');
        return await sendWeeklyNotifications();
    } catch (error) {
        console.error('[Send Notification] Erreur critique POST:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Erreur interne' },
            { status: 500 }
        );
    }
}

/**
 * Envoie une notification de test immédiate à un utilisateur donné.
 * Permet de tester en direct la suggestion de film du dimanche sur son appareil.
 */
async function sendTestNotificationToUser(userId: string) {
    const db = getFirestore();
    const messaging = getMessaging();

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        return NextResponse.json(
            { success: false, error: `Utilisateur avec l'ID ${userId} introuvable` },
            { status: 404 }
        );
    }

    const userData = userDoc.data() || {};
    const userTokens: string[] = Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0
        ? userData.fcmTokens.filter(Boolean)
        : (userData.fcmToken ? [userData.fcmToken] : []);

    const notif: SundayNotificationPayload = await buildSundayNotificationForUser({
        moviesToWatch: userData.moviesToWatch,
        seriesToWatch: userData.seriesToWatch,
        lastSuggestedMovie: userData.lastSuggestedMovie,
        lastNotificationType: userData.lastNotificationType,
        forceMovie: true,
    });

    if (userTokens.length === 0) {
        return NextResponse.json({
            success: true,
            warning: 'Notification générée avec succès, mais aucun token FCM trouvé. Activez les notifications dans les paramètres de l\'app.',
            notification: notif,
            moviesCount: (userData.moviesToWatch || []).length,
            seriesCount: (userData.seriesToWatch || []).length,
            tokensCount: 0,
        });
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: any[] = [];

    const messages = userTokens.map(token => ({
        token,
        notification: {
            title: notif.title,
            body: notif.body,
            ...(notif.imageUrl ? { imageUrl: notif.imageUrl } : {}),
        },
        data: {
            url: notif.link || '/',
            title: notif.title,
            body: notif.body,
            tag: 'sunday-weekly-reminder',
            type: notif.type,
            ...(notif.suggestedMovieTitle ? { movieTitle: notif.suggestedMovieTitle } : {}),
            ...(notif.imageUrl ? { image: notif.imageUrl } : {}),
        },
        webpush: {
            headers: {
                Urgency: 'high',
                TTL: '86400',
            },
            notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/badge-96x96.png',
                tag: 'sunday-weekly-reminder',
                renotify: true,
                ...(notif.imageUrl ? { image: notif.imageUrl } : {}),
            },
            fcmOptions: {
                link: notif.link || '/',
            },
        },
    }));

    try {
        const response = await messaging.sendEach(messages);
        response.responses.forEach((res) => {
            if (res.success) {
                successCount++;
            } else {
                failureCount++;
                errors.push((res.error as any)?.code || (res.error as any)?.message);
            }
        });
    } catch (fcmError: any) {
        console.error('[Send Notification Test] Erreur envoi FCM:', fcmError);
        return NextResponse.json(
            { success: false, error: fcmError?.message || 'Erreur FCM' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: `Notification test du dimanche envoyée !`,
        notification: notif,
        chosenTitle: notif.suggestedMovieTitle || notif.title,
        moviesCount: (userData.moviesToWatch || []).length,
        seriesCount: (userData.seriesToWatch || []).length,
        tokensCount: userTokens.length,
        fcmResult: {
            sent: successCount,
            failed: failureCount,
            errors,
        },
    });
}

async function sendWeeklyNotifications() {
    const db = getFirestore();
    const messaging = getMessaging();

    // Récupérer tous les utilisateurs qui ont les notifications activées
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

    // Regrouper les tokens par utilisateur (pour garantir le même message sur tous les appareils d'un utilisateur)
    const userGroups: {
        userId: string;
        userData: FirebaseFirestore.DocumentData;
        tokens: string[];
    }[] = [];
    const processedTokens = new Set<string>();

    usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const userTokens: string[] = Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0
            ? data.fcmTokens.filter(Boolean)
            : (data.fcmToken ? [data.fcmToken] : []);

        const validTokens = userTokens.filter(token => token && !processedTokens.has(token));
        if (validTokens.length > 0) {
            validTokens.forEach(t => processedTokens.add(t));
            userGroups.push({
                userId: doc.id,
                userData: data,
                tokens: validTokens,
            });
        }
    });

    const totalTokensCount = processedTokens.size;
    console.log(`[Send Notification] Utilisateurs ciblés: ${userGroups.length}, Total Tokens FCM: ${totalTokensCount}`);

    if (totalTokensCount === 0) {
        return NextResponse.json({
            success: true,
            message: 'Aucun token FCM valide trouvé',
            sent: 0,
        });
    }

    // Construire le message personnalisé pour chaque utilisateur (film/série ou Quiz 5amem si liste vide)
    const messages: any[] = [];
    const messageUserIds: string[] = [];
    const messageTokens: string[] = [];
    const userUpdates: {
        userId: string;
        lastSuggestedMovie?: string;
        lastNotificationType: 'movie' | '5amem';
    }[] = [];
    const notificationsSummary: { userId: string; type: string; title: string }[] = [];

    for (const group of userGroups) {
        try {
            const notif: SundayNotificationPayload = await buildSundayNotificationForUser({
                moviesToWatch: group.userData.moviesToWatch,
                seriesToWatch: group.userData.seriesToWatch,
                lastSuggestedMovie: group.userData.lastSuggestedMovie,
                lastNotificationType: group.userData.lastNotificationType,
            });

            notificationsSummary.push({
                userId: group.userId,
                type: notif.type,
                title: notif.title,
            });

            userUpdates.push({
                userId: group.userId,
                lastSuggestedMovie: notif.suggestedMovieTitle,
                lastNotificationType: notif.type,
            });

            console.log(`[Send Notification] User ${group.userId.substring(0, 6)}... -> [${notif.type.toUpperCase()}] "${notif.title}"`);

            for (const token of group.tokens) {
                messages.push({
                    token,
                    notification: {
                        title: notif.title,
                        body: notif.body,
                        ...(notif.imageUrl ? { imageUrl: notif.imageUrl } : {}),
                    },
                    data: {
                        url: notif.link || '/',
                        title: notif.title,
                        body: notif.body,
                        tag: 'sunday-weekly-reminder',
                        type: notif.type,
                        ...(notif.suggestedMovieTitle ? { movieTitle: notif.suggestedMovieTitle } : {}),
                        ...(notif.imageUrl ? { image: notif.imageUrl } : {}),
                    },
                    webpush: {
                        headers: {
                            Urgency: 'high',
                            TTL: '86400',
                        },
                        notification: {
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/badge-96x96.png',
                            tag: 'sunday-weekly-reminder',
                            renotify: true,
                            ...(notif.imageUrl ? { image: notif.imageUrl } : {}),
                        },
                        fcmOptions: {
                            link: notif.link || '/',
                        },
                    },
                });
                messageUserIds.push(group.userId);
                messageTokens.push(token);
            }
        } catch (userError) {
            console.error(`[Send Notification] Erreur construction message pour user ${group.userId}:`, userError);
        }
    }

    if (messages.length === 0) {
        return NextResponse.json({
            success: true,
            message: 'Aucun message préparé pour l\'envoi',
            sent: 0,
        });
    }

    console.log(`[Send Notification] Envoi en batch de ${messages.length} messages...`);

    // Envoyer toutes les notifications d'un coup (Batch FCM)
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
                if (
                    error?.code === 'messaging/registration-token-not-registered' ||
                    error?.code === 'messaging/invalid-registration-token'
                ) {
                    invalidTokens.push({ userId: messageUserIds[i], token: messageTokens[i] });
                }
                console.error(`[Send Notification] Erreur pour token ${messageTokens[i].substring(0, 10)}...:`, error?.code || error);
            }
        });
    } catch (batchError) {
        console.error('[Send Notification] Erreur critique lors de l\'envoi batch:', batchError);
        return NextResponse.json(
            { success: false, error: 'Erreur lors de l\'envoi batch' },
            { status: 500 }
        );
    }

    // Mettre à jour l'historique de rotation (dernier film suggéré, type envoyé)
    for (const update of userUpdates) {
        try {
            await db.collection('users').doc(update.userId).update({
                lastNotificationType: update.lastNotificationType,
                ...(update.lastSuggestedMovie ? { lastSuggestedMovie: update.lastSuggestedMovie } : {}),
                lastSundayNotificationAt: new Date().toISOString(),
            });
        } catch (historyError) {
            console.warn(`[Send Notification] Erreur mise à jour historique pour user ${update.userId}:`, historyError);
        }
    }

    // Nettoyer les tokens invalides
    for (const { userId, token } of invalidTokens) {
        try {
            await db.collection('users').doc(userId).update({
                fcmTokens: FieldValue.arrayRemove(token),
                fcmToken: null,
            });
            console.log(`[Send Notification] Token invalide nettoyé pour user ${userId}`);
        } catch (cleanupError) {
            console.error(`[Send Notification] Erreur nettoyage token:`, cleanupError);
        }
    }

    const result = {
        success: true,
        message: `Notifications du dimanche envoyées avec succès`,
        sent: successCount,
        failed: failureCount,
        cleaned: invalidTokens.length,
        totalTokens: messages.length,
        usersCount: userGroups.length,
        notificationsSummary,
    };

    console.log('[Send Notification] Résultat final:', result);
    return NextResponse.json(result);
}
