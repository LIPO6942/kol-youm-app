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
            console.log('[Send Habit Notification] Init avec Service Account (Variables séparées)');
            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
                projectId,
            });
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            console.log('[Send Habit Notification] Init avec Service Account (JSON)');
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            initializeApp({
                credential: cert(serviceAccount),
                projectId: serviceAccount.project_id,
            });
        } else {
            console.log('[Send Habit Notification] Init avec ADC');
            initializeApp({ projectId });
        }
    } catch (error) {
        console.error('[Send Habit Notification] Erreur init Firebase Admin:', error);
    }
}

const CRON_SECRET = process.env.CRON_SECRET || 'kol-youm-weekly-notification-secret';

type CategoryFrequency = {
    category: string;
    averageDays: number;
    count: number;
    lastVisit: number;
};

function getVisitFrequencies(visits: any[] = []): CategoryFrequency[] {
    if (!visits.length) return [];
    const visitsByCategory: Record<string, number[]> = {};

    visits.forEach(v => {
        if (!v.category) return;
        const cat = v.category;
        // On veut exclure Café si besoin ? Non, si l'app veut, ok pour les Café
        if (!visitsByCategory[cat]) {
            visitsByCategory[cat] = [];
        }
        visitsByCategory[cat].push(v.date);
    });

    const frequencies: CategoryFrequency[] = Object.entries(visitsByCategory)
        .map(([category, dates]) => {
            const sortedDates = dates.sort((a, b) => a - b);
            const count = sortedDates.length;
            const lastVisit = sortedDates[count - 1];

            if (count < 2) {
                return { category, averageDays: 0, count, lastVisit };
            }

            const totalDays = (sortedDates[count - 1] - sortedDates[0]) / (1000 * 60 * 60 * 24);
            const averageDays = totalDays / (count - 1);

            return { category, averageDays: Math.round(averageDays), count, lastVisit };
        })
        .filter(f => f.averageDays > 0);

    return frequencies.sort((a, b) => a.averageDays - b.averageDays);
}

const CATEGORY_ICONS: Record<string, string> = {
    'Café': '☕',
    'Fast Food': '🍔',
    'Restaurant': '🍕',
    'Brunch': '🍳',
    'Balade': '🌲',
    'Shopping': '🛍️',
    'Cinéma': '🍿',
    'Bar': '🍻',
    'Parc': '🌳',
    'Musée': '🏛️',
    'Théâtre': '🎭'
};

export async function GET(request: NextRequest) {
    return handleRequest(request);
}
export async function POST(request: NextRequest) {
    return handleRequest(request);
}

async function handleRequest(request: NextRequest) {
    console.log(`[Send Habit Notification] Requête ${request.method} reçue`);
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
            console.error('[Send Habit Notification] Secret invalide');
            return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
        }

        console.log('[Send Habit Notification] Secret validé, démarrage...');
        return await sendHabitNotifications();
    } catch (error) {
        console.error('[Send Habit Notification] Erreur critique:', error);
         return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Erreur interne' }, { status: 500 });
    }
}

async function sendHabitNotifications() {
     const db = getFirestore();
     const messaging = getMessaging();

     const usersSnapshot = await db.collection('users').where('notificationsEnabled', '==', true).get();
     
     if (usersSnapshot.empty) {
         console.log('[Send Habit Notification] Aucun utilisateur à notifier');
         return NextResponse.json({ success: true, message: 'Aucun utilisateur à notifier', sent: 0 });
     }

     const messages: any[] = [];
     const now = Date.now();
     const invalidTokens: { userId: string; token: string }[] = [];
     
     const processedTokens = new Set<string>();
     
     usersSnapshot.forEach((doc) => {
         const data = doc.data();
         if (!data.fcmToken || processedTokens.has(data.fcmToken)) return;

         const visits = data.visits || [];
         const frequencies = getVisitFrequencies(visits);
         
         let notificationToSent = null;

         for (const f of frequencies) {
             const daysSinceLastVisit = Math.round((now - f.lastVisit) / (1000 * 60 * 60 * 24));
             
             // Si on a l'habitude d'y aller toues les 5 jours, on notifie à J+5, J+10, J+15...
             // Pour éviter le spam si averageDays est 1 (tous les jours), on ne notifie qu'à J+1 ou J+2
             // Et on évite le jour même (daysSinceLastVisit > 0)
             if (daysSinceLastVisit > 0 && daysSinceLastVisit % f.averageDays === 0) {
                  const icon = CATEGORY_ICONS[f.category] || '🌟';
                  notificationToSent = {
                      title: `${icon} Envie de ${f.category} ?`,
                      body: `Tu en visites environ tous les ${f.averageDays} jours. C'est le moment d'y retourner ? Si oui, n'oublie pas de marquer ton passage !`,
                  };
                  break; // max 1 notif par utilisateur par jour
             }
         }

         if (notificationToSent) {
             processedTokens.add(data.fcmToken);
             messages.push({
                 token: data.fcmToken,
                 userId: doc.id,
                 notification: notificationToSent,
                 webpush: {
                      notification: {
                          icon: '/icons/icon-192x192.png',
                          badge: '/icons/icon-192x192.png',
                          tag: 'habit-reminder',
                          renotify: true,
                      },
                      fcmOptions: { link: '/' },
                 }
             });
         }
     });

     console.log(`[Send Habit Notification] Éligibles aujourd'hui: ${messages.length}`);

     if (messages.length === 0) {
         return NextResponse.json({ success: true, message: 'Aucune habitude à rappeler aujourd\'hui', sent: 0 });
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
                  console.error(`[Send Habit Notification] Erreur token:`, error?.code || error);
             }
         });
     } catch (err) {
         console.error('[Send Habit Notification] Erreur envoi batch:', err);
         return NextResponse.json({ success: false, error: 'Erreur lors de l\'envoi batch' }, { status: 500 });
     }

     for (const { userId } of invalidTokens) {
         try {
             await db.collection('users').doc(userId).update({ fcmToken: null, notificationsEnabled: false });
         } catch(e) {}
     }

     return NextResponse.json({
         success: true,
         message: 'Notifications d\'habitudes envoyées',
         sent: successCount,
         failed: failureCount,
         cleaned: invalidTokens.length,
         total: messages.length
     });
}
