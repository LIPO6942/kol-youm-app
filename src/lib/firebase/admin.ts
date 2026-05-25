import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export function getAdminFirestore() {
    if (!getApps().length) {
        try {
            const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (projectId && clientEmail && privateKey) {
                console.log('[Firebase Admin] Init avec variables séparées');
                initializeApp({
                    credential: cert({
                        projectId,
                        clientEmail,
                        privateKey: privateKey.replace(/\\n/g, '\n'),
                    }),
                    projectId,
                });
            } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                console.log('[Firebase Admin] Init avec fichier JSON');
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                initializeApp({
                    credential: cert(serviceAccount),
                    projectId: serviceAccount.project_id,
                });
            } else {
                console.log('[Firebase Admin] Init avec ADC');
                initializeApp({ projectId });
            }
        } catch (error) {
            console.error('[Firebase Admin] Erreur init:', error);
        }
    }
    return getFirestore();
}
