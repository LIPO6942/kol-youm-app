'use client';

import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { getApps, getApp } from 'firebase/app';
import { doc, getFirestore, setDoc, deleteField } from 'firebase/firestore';

let messagingInstance: Messaging | null = null;

/**
 * Obtenir l'instance Firebase Messaging (lazy init, uniquement côté client)
 */
async function getMessagingInstance(): Promise<Messaging | null> {
    if (messagingInstance) return messagingInstance;

    // Vérifier que le navigateur supporte les notifications
    const supported = await isSupported();
    if (!supported) {
        console.warn('[Notifications] Firebase Messaging non supporté sur ce navigateur');
        return null;
    }

    const app = getApps().length ? getApp() : null;
    if (!app) {
        console.warn('[Notifications] Firebase app non initialisé');
        return null;
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
}

/**
 * Enregistrer le service worker FCM
 */
async function registerFCMServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        console.warn('[Notifications] Service Workers non supportés');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/firebase-cloud-messaging-push-scope',
        });
        console.log('[Notifications] Service Worker FCM enregistré:', registration);
        return registration;
    } catch (error) {
        console.error('[Notifications] Erreur enregistrement SW:', error);
        return null;
    }
}

/**
 * Demander la permission de notification et obtenir le token FCM.
 * Sauvegarde le token dans Firestore sous /users/{userId}.
 * 
 * @returns Le token FCM ou null si refusé/non supporté
 */
export async function requestNotificationPermission(userId: string): Promise<string | null> {
    try {
        // 1. Demander la permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[Notifications] Permission refusée');
            return null;
        }

        // 2. Obtenir l'instance messaging
        const messaging = await getMessagingInstance();
        if (!messaging) return null;

        // 3. Enregistrer le SW FCM
        const swRegistration = await registerFCMServiceWorker();

        // 4. Obtenir le token FCM
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.error('[Notifications] NEXT_PUBLIC_FIREBASE_VAPID_KEY manquant');
            return null;
        }

        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration || undefined,
        });

        if (!token) {
            console.warn('[Notifications] Impossible d\'obtenir le token FCM');
            return null;
        }

        console.log('[Notifications] Token FCM obtenu:', token.substring(0, 20) + '...');

        // 5. Sauvegarder le token dans Firestore
        const db = getFirestore();
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            fcmToken: token,
            notificationsEnabled: true,
            notificationsEnabledAt: new Date().toISOString(),
        }, { merge: true });

        console.log('[Notifications] Token sauvegardé dans Firestore');
        return token;

    } catch (error) {
        console.error('[Notifications] Erreur:', error);
        return null;
    }
}

/**
 * Désactiver les notifications pour un utilisateur.
 * Supprime le token FCM de Firestore.
 */
export async function disableNotifications(userId: string): Promise<void> {
    try {
        const db = getFirestore();
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            fcmToken: deleteField(),
            notificationsEnabled: false,
        }, { merge: true });

        console.log('[Notifications] Notifications désactivées');
    } catch (error) {
        console.error('[Notifications] Erreur désactivation:', error);
    }
}

/**
 * Écouter les messages foreground (quand l'app est ouverte).
 * Retourne une fonction de désinscription.
 */
export async function listenToForegroundMessages(
    callback: (payload: { title?: string; body?: string }) => void
): Promise<(() => void) | null> {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const unsubscribe = onMessage(messaging, (payload) => {
        console.log('[Notifications] Message foreground:', payload);
        callback({
            title: payload.notification?.title,
            body: payload.notification?.body,
        });
    });

    return unsubscribe;
}

/**
 * Vérifier si les notifications sont supportées par le navigateur
 */
export async function isNotificationsSupported(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    if (!('serviceWorker' in navigator)) return false;

    try {
        return await isSupported();
    } catch {
        return false;
    }
}

/**
 * Vérifier l'état actuel de la permission de notification
 */
export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
}
