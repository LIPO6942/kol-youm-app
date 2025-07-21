import { doc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore"; 
import { db } from "./client";
import { clearUserFromDb, db as idb } from "@/lib/indexeddb";

export type UserProfile = {
    uid: string;
    email: string | null;
    gender?: 'Homme' | 'Femme';
    personalizationComplete: boolean;
    createdAt: any;
    // These lists will now be primarily managed in IndexedDB
    seenMovieTitles?: string[];
    moviesToWatch?: string[];
    seenKhroujSuggestions?: string[];
};

export async function createUserProfile(uid: string, data: { email: string | null }) {
  const userProfile: UserProfile = {
    uid,
    email: data.email,
    personalizationComplete: false,
    createdAt: serverTimestamp(),
    seenMovieTitles: [],
    moviesToWatch: [],
    seenKhroujSuggestions: [],
  };
  // Create profile in both Firestore and IndexedDB
  await setDoc(doc(db, "users", uid), userProfile);
  await idb.put('user-profile', userProfile, uid);
  return userProfile;
}

export async function updateUserProfile(uid:string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) {
    // Update both Firestore and IndexedDB
    const userRef = doc(db, 'users', uid);
    
    // Firestore update with arrayUnion for backward compatibility or sync
    const firestoreData: Partial<UserProfile> = {};
    if (data.seenMovieTitles) firestoreData.seenMovieTitles = arrayUnion(...data.seenMovieTitles) as any;
    if (data.moviesToWatch) firestoreData.moviesToWatch = arrayUnion(...data.moviesToWatch) as any;
    if (data.seenKhroujSuggestions) firestoreData.seenKhroujSuggestions = arrayUnion(...data.seenKhroujSuggestions) as any;
    if (data.gender) firestoreData.gender = data.gender;
    if (typeof data.personalizationComplete === 'boolean') firestoreData.personalizationComplete = data.personalizationComplete;

    if (Object.keys(firestoreData).length > 0) {
      await setDoc(userRef, firestoreData, { merge: true });
    }

    // Update IndexedDB
    const localProfile = await idb.get('user-profile', uid) || { uid };
    const updatedProfile = { ...localProfile };
    if (data.seenMovieTitles) updatedProfile.seenMovieTitles = [...(localProfile.seenMovieTitles || []), ...data.seenMovieTitles];
    if (data.moviesToWatch) updatedProfile.moviesToWatch = [...(localProfile.moviesToWatch || []), ...data.moviesToWatch];
    if (data.seenKhroujSuggestions) updatedProfile.seenKhroujSuggestions = [...(localProfile.seenKhroujSuggestions || []), ...data.seenKhroujSuggestions];
    if (data.gender) updatedProfile.gender = data.gender;
    if (typeof data.personalizationComplete === 'boolean') updatedProfile.personalizationComplete = data.personalizationComplete;

    await idb.put('user-profile', updatedProfile, uid);
}

export async function moveMovieFromWatchlistToSeen(uid: string, movieTitle: string) {
    const batch = writeBatch(db);
    const userRef = doc(db, "users", uid);
    // Remove from 'to watch' in Firestore
    batch.update(userRef, { moviesToWatch: arrayRemove(movieTitle) });
    // 'seen' list is already updated on swipe, so no need to add here.
    await batch.commit();

    // Update IndexedDB
    const localProfile = await idb.get('user-profile', uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            moviesToWatch: localProfile.moviesToWatch?.filter(t => t !== movieTitle) || [],
        };
        await idb.put('user-profile', updatedProfile, uid);
    }
}

export async function clearUserMovieList(uid: string, listName: 'moviesToWatch' | 'seenMovieTitles' | 'seenKhroujSuggestions') {
    const userRef = doc(db, 'users', uid);
    const firestoreUpdate: any = {};
    
    if (listName === 'seenMovieTitles') {
        firestoreUpdate.seenMovieTitles = [];
        firestoreUpdate.moviesToWatch = [];
    } else {
        firestoreUpdate[listName] = [];
    }
    await setDoc(userRef, firestoreUpdate, { merge: true });
    
    // Update IndexedDB
    const localProfile = await idb.get('user-profile', uid);
    if (localProfile) {
        if (listName === 'seenMovieTitles') {
            localProfile.seenMovieTitles = [];
            localProfile.moviesToWatch = [];
        } else {
            localProfile[listName] = [];
        }
        await idb.put('user-profile', localProfile, uid);
    }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    // 1. Try to get from IndexedDB first
    const localProfile = await idb.get('user-profile', uid);
    if (localProfile) {
        return localProfile;
    }

    // 2. If not in IndexedDB, fetch from Firestore
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const firestoreProfile = userSnap.data() as UserProfile;
        // 3. Store the fetched profile in IndexedDB for future use
        await idb.put('user-profile', firestoreProfile, uid);
        return firestoreProfile;
    } else {
        return null;
    }
}

// When a user logs out, we should clear their data from IndexedDB
export async function handleLogout() {
    await clearUserFromDb();
}
