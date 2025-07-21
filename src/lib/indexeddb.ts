import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { UserProfile } from './firebase/firestore';

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