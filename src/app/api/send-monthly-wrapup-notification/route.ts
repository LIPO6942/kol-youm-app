import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

// Initialiser Firebase Admin SDK
if (!getApps().length) {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
            console.log('[Send Wrap-Up Notification] Init avec Service Account');
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
                projectId,
            });
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
             const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
             initializeApp({
                 credential: cert(serviceAccount),
                 projectId: serviceAccount.project_id,
             });
        } else {
            console.log('[Send Wrap-Up Notification] Init avec ADC');
            initializeApp({ projectId });
        }
    } catch (error) {
        console.error('[Send Wrap-Up Notification] Erreur init Firebase Admin:', error);
    }
}

const CRON_SECRET = process.env.CRON_SECRET || 'kol-youm-weekly-notification-secret';

const WRAPUP_MESSAGES: Record<number, {title: string, body: string}> = {
  0: { title: "Janvier est fini ! ❄️", body: "Prêt à voir tes exploits du mois ? Clique pour découvrir ton profil." },
  1: { title: "Février touche à sa fin ! 💖", body: "Qu'as-tu découvert ce mois-ci ? Ouvre vite ton Wrap-Up." },
  2: { title: "Mars est bouclé ! 🌸", body: "C'est l'heure du bilan printanier. Explore tes sorties et tes films !" },
  3: { title: "Avril est passé vite ! 🌧️", body: "Ton profil du mois est prêt. Qu'as-tu préféré ce mois-ci ?" },
  4: { title: "Mai fait ce qu'il te plaît ! ☀️", body: "Et tu l'as bien fait, regarde tes stats du mois." },
  5: { title: "Juin annonce l'été ! 🍉", body: "Voici le résumé de tes sorties d'avant-saison. Prêt pour les vacances ?" },
  6: { title: "Juillet brûlant ! 🔥", body: "Ton Wrap-Up est aussi chaud que tes soirées estiables. Ouvre pour le voir." },
  7: { title: "Août est terminé ! 🏖️", body: "Les vacances sont finies, mais tes souvenirs restent dans ton récapitulatif !" },
  8: { title: "Septembre, la rentrée ! 🎒", body: "As-tu gardé le rythme après les vacances ? Découvre-le maintenant." },
  9: { title: "Octobre frissonnant ! 🎃", body: "Tes statistiques (gourmandes ou effrayantes) sont arrivées !" },
  10: { title: "Novembre gris ? 🍂", body: "Pas tes sorties ! Découvre ton récapitulatif haut en couleur." },
  11: { title: "L'année se termine ! 🎄", body: "Ton Wrap-Up ultime de Décembre vient d'atterrir. Qu'as-tu accompli ?" }
};

export async function GET(request: NextRequest) {
    return handleRequest(request);
}

export async function POST(request: NextRequest) {
    return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
    console.log(`[Send Wrap-Up Notification] Requête ${request.method} reçue`);
    try {
        const authHeader = request.headers.get('authorization');
        const urlSecret = request.nextUrl.searchParams.get('secret');
        const providedSecret = authHeader?.replace('Bearer ', '') || urlSecret;
        
        let secretFromPayload = null;
        if (request.method === 'POST') {
             try {
                const body = await request.clone().json();
                secretFromPayload = body.secret;
             } catch (e) {}
        }
        const finalSecret = providedSecret || secretFromPayload;

        if (finalSecret !== CRON_SECRET) {
            console.error('[Send Wrap-Up Notification] Secret invalide');
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        console.log('[Send Wrap-Up Notification] Secret validé, démarrage...');
        return await sendWrapUpNotifications();
    } catch (error) {
        console.error('[Send Wrap-Up Notification] Erreur critique:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 });
    }
}

async function sendWrapUpNotifications() {
     const db = getFirestore();
     const messaging = getMessaging();

     // Seulement les utilisateurs qui acceptent les notifications
     const usersSnapshot = await db.collection('users').where('notificationsEnabled', '==', true).get();
     
     if (usersSnapshot.empty) {
         console.log('[Send Wrap-Up Notification] Aucun utilisateur à notifier');
         return NextResponse.json({ success: true, message: 'Aucun utilisateur à notifier', sent: 0 });
     }

     const messages: any[] = [];
     const invalidTokens: { userId: string; token: string }[] = [];
     const processedTokens = new Set<string>();

     // Obtenir le mois actuel pour déterminer le message.
     // Si exécuté le 1er du mois, on parle du mois précédent.
     const currentMonth = new Date().getMonth();
     const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
     
     // La notification est envoyé le 1er jour du mois, on cible le récap du mois PRECÉDENT.
     const notificationContent = WRAPUP_MESSAGES[previousMonth] || WRAPUP_MESSAGES[0];

     usersSnapshot.forEach((doc) => {
         const data = doc.data();

         const userTokens: string[] = [];
         if (Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
             data.fcmTokens.forEach((t: string) => { if (t) userTokens.push(t); });
         } else if (data.fcmToken) {
             userTokens.push(data.fcmToken);
         }

         userTokens.forEach((token) => {
             if (!token || processedTokens.has(token)) return;
             processedTokens.add(token);
             messages.push({
                 token,
                 userId: doc.id,
                 notification: {
                     title: notificationContent.title,
                     body: notificationContent.body
                 },
                 webpush: {
                      notification: {
                          icon: '/icons/icon-192x192.png',
                          badge: '/icons/badge-96x96.png',
                          tag: 'wrap-up-reminder',
                          renotify: true,
                          vibrate: [200, 100, 200, 100, 200]
                      },
                      // Lien vers l'application
                      fcmOptions: { link: '/stylek?wrapup=true' }, 
                 }
             });
         });
     });

     console.log(`[Send Wrap-Up Notification] Préparation pour ${messages.length} tokens`);

     if (messages.length === 0) {
         return NextResponse.json({ success: true, message: 'Aucun message à envoyer', sent: 0 });
     }

     let successCount = 0;
     let failureCount = 0;
     const fcmMessages = messages.map(m => {
          const { userId, ...rest } = m;
          return rest;
     });

     try {
         const response = await messaging.sendEach(fcmMessages);
         response.responses.forEach((res, i) => {
             if (res.success) {
                  successCount++;
             } else {
                  failureCount++;
                  const error = res.error as any;
                  if (error?.code === 'messaging/registration-token-not-registered' || error?.code === 'messaging/invalid-registration-token') {
                       invalidTokens.push({ userId: messages[i].userId, token: messages[i].token });
                  }
                  console.error(`[Send Wrap-Up Notification] Erreur token:`, error?.code || error);
             }
         });
     } catch (err) {
         console.error('[Send Wrap-Up Notification] Erreur envoi batch:', err);
         return NextResponse.json({ success: false, error: 'Erreur d\'envoi' }, { status: 500 });
     }

     // Nettoyage des tokens invalides
     for (const { userId } of invalidTokens) {
         try {
             await db.collection('users').doc(userId).update({ fcmToken: null, notificationsEnabled: false });
         } catch(e) {}
     }

     return NextResponse.json({
         success: true,
         message: 'Notifications Monthly Wrap-Up envoyées',
         sent: successCount,
         failed: failureCount,
         cleaned: invalidTokens.length,
         total: messages.length
     });
}
