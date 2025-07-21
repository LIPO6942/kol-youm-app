import { openDB, type DBSchema } from 'idb';
import type { UserProfile } from './firebase/firestore';

interface MyDB extends DBSchema {
  'user-profile': {
    key: string;
    value: UserProfile;
  };
}

export const db = await openDB<MyDB>('kol-youm-db', 1, {
  upgrade(db) {
    db.createObjectStore('user-profile');
  },
});

export async function storeUserInDb(uid: string, profile: UserProfile) {
    return db.put('user-profile', profile, uid);
}

export async function getUserFromDb(uid: string): Promise<UserProfile | undefined> {
    return db.get('user-profile', uid);
}

export async function clearUserFromDb() {
    return db.clear('user-profile');
}
