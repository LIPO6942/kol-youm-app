import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { UserProfile } from './firebase/firestore';
import { mergeVisits } from './khrouj-visits-manager';

interface MyDB extends DBSchema {
  'user-profile': {
    key: string;
    value: UserProfile;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

const getDb = () => {
    if (typeof window === 'undefined') {
        // Return a promise that rejects if not in a browser.
        // This prevents server-side execution attempts.
        return Promise.reject(new Error("IndexedDB can only be used in the browser."));
    }
    if (!dbPromise) {
        dbPromise = openDB<MyDB>('kol-youm-db', 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('user-profile')) {
                    db.createObjectStore('user-profile');
                }
            },
        });
    }
    return dbPromise;
};

export async function storeUserInDb(uid: string, profile: UserProfile) {
    try {
        const db = await getDb();
        if (profile) {
            // Protection anti-perte : si IndexedDB possède déjà des visites et que le nouveau profil
            // en contient moins ou aucune, fusionner pour ne jamais écraser l'historique Khrouj.
            const existing = await db.get('user-profile', uid);
            if (existing && Array.isArray(existing.visits) && existing.visits.length > 0) {
                const incomingVisits = Array.isArray(profile.visits) ? profile.visits : [];
                if (incomingVisits.length < existing.visits.length) {
                    profile.visits = mergeVisits(incomingVisits, existing.visits);
                }
            }
        }
        return db.put('user-profile', profile, uid);
    } catch (error) {
        console.warn("Could not store user in IndexedDB:", error);
    }
}

export async function getUserFromDb(uid: string): Promise<UserProfile | undefined> {
    try {
        const db = await getDb();
        return db.get('user-profile', uid);
    } catch (error) {
        console.warn("Could not get user from IndexedDB:", error);
        return undefined;
    }
}

export async function clearUserFromDb() {
    try {
        const db = await getDb();
        return db.clear('user-profile');
    } catch (error) {
        console.warn("Could not clear user from IndexedDB:", error);
    }
}

// Export the function for direct access if needed, ensuring it's safe.
export { getDb };