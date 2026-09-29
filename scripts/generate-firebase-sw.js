/**
 * Script de génération du Service Worker Firebase Messaging
 * 
 * Ce script génère public/firebase-messaging-sw.js à partir des variables
 * d'environnement NEXT_PUBLIC_FIREBASE_*, permettant de ne pas committer
 * les clés Firebase dans le repo.
 * 
 * Exécuté automatiquement avant le build via "prebuild" dans package.json.
 */

const fs = require('fs');
const path = require('path');

const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Vérifier que les variables sont présentes
const missing = Object.entries(config).filter(([, v]) => !v);
if (missing.length > 0) {
    console.warn(`⚠️  [generate-firebase-sw] Variables manquantes: ${missing.map(([k]) => k).join(', ')}`);
    console.warn('   Le service worker FCM ne fonctionnera pas correctement.');
}

const swContent = `// Firebase Messaging Service Worker (auto-généré — ne pas committer)
// Généré par scripts/generate-firebase-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

if (firebase.apps.length === 0) {
  firebase.initializeApp({
    apiKey: "${config.apiKey}",
    authDomain: "${config.authDomain}",
    projectId: "${config.projectId}",
    storageBucket: "${config.storageBucket}",
    messagingSenderId: "${config.messagingSenderId}",
    appId: "${config.appId}",
  });
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan:', payload);

  const title = payload.notification?.title || payload.data?.title || '🔔 kol youm';
  const body = payload.notification?.body || payload.data?.body || "N'oublie pas de marquer ton passage !";
  const imageUrl = payload.data?.image || payload.data?.imageUrl || payload.notification?.image || payload.notification?.imageUrl;
  const targetUrl = payload.data?.url || payload.fcmOptions?.link || payload.notification?.click_action || '/';

  // Si le message contient déjà une notification automatique SANS image/poster spécifique à afficher
  if (payload.notification && !imageUrl) {
    return;
  }

  // Affichage de la notification avec le poster / hero image si présent (ex: film du dimanche)
  const notificationOptions = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-96x96.png',
    tag: payload.data?.tag || payload.notification?.tag || 'sunday-weekly-reminder',
    renotify: true,
    ...(imageUrl ? { image: imageUrl } : {}),
    data: {
      url: targetUrl,
    },
  };

  self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification cliquée');
  event.notification.close();

  const urlToOpen = event.notification.data?.url
    || event.notification.data?.FCM_MSG?.data?.url
    || event.notification.data?.FCM_MSG?.notification?.click_action
    || event.notification.data?.link
    || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
`;

const outputPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
fs.writeFileSync(outputPath, swContent, 'utf8');
console.log('✅ [generate-firebase-sw] public/firebase-messaging-sw.js généré avec succès');
