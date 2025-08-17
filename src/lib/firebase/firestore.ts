import { doc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore"; 
import { db as firestoreDb } from "./client";
import { getUserFromDb, storeUserInDb } from "@/lib/indexeddb";

export type UserProfile = {
    uid: string;
    email: string | null;
    gender?: 'Homme' | 'Femme';
    age?: number;
    personalizationComplete: boolean;
    createdAt: any;
    // These lists are synced between Firestore and IndexedDB
    seenMovieTitles?: string[];
    moviesToWatch?: string[];
    seenKhroujSuggestions?: string[];
    fullBodyPhotoUrl?: string;
    closeupPhotoUrl?: string;
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
  // Create profile in both Firestore and IndexedDB to ensure consistency from the start
  await setDoc(doc(firestoreDb, "users", uid), userProfile);
  await storeUserInDb(uid, userProfile);
  return userProfile;
}

export async function updateUserProfile(uid:string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) {
    const userRef = doc(firestoreDb, 'users', uid);
    
    // Create a plain object for Firestore update
    const firestoreData: { [key: string]: any } = {};
    if (data.gender) firestoreData.gender = data.gender;
    if (data.age !== undefined) firestoreData.age = data.age; // Allow setting age to null/undefined
    if (data.fullBodyPhotoUrl) firestoreData.fullBodyPhotoUrl = data.fullBodyPhotoUrl;
    if (data.closeupPhotoUrl) firestoreData.closeupPhotoUrl = data.closeupPhotoUrl;
    if (typeof data.personalizationComplete === 'boolean') firestoreData.personalizationComplete = data.personalizationComplete;
    if (data.seenMovieTitles) firestoreData.seenMovieTitles = arrayUnion(...data.seenMovieTitles);
    if (data.moviesToWatch) firestoreData.moviesToWatch = arrayUnion(...data.moviesToWatch);
    if (data.seenKhroujSuggestions) firestoreData.seenKhroujSuggestions = arrayUnion(...data.seenKhroujSuggestions);


    // Update Firestore first
    if (Object.keys(firestoreData).length > 0) {
      await setDoc(userRef, firestoreData, { merge: true });
    }

    // Then, update IndexedDB by merging with existing local data
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile: UserProfile = { ...localProfile, ...data };
        if (data.age !== undefined) updatedProfile.age = data.age;

        // Use Sets for efficient merging and duplicate removal
        if (data.seenMovieTitles) {
            updatedProfile.seenMovieTitles = Array.from(new Set([...(localProfile.seenMovieTitles || []), ...data.seenMovieTitles]));
        }
        if (data.moviesToWatch) {
            updatedProfile.moviesToWatch = Array.from(new Set([...(localProfile.moviesToWatch || []), ...data.moviesToWatch]));
        }
        if (data.seenKhroujSuggestions) {
            updatedProfile.seenKhroujSuggestions = Array.from(new Set([...(localProfile.seenKhroujSuggestions || []), ...data.seenKhroujSuggestions]));
        }
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function moveMovieFromWatchlistToSeen(uid: string, movieTitle: string) {
    const userRef = doc(firestoreDb, "users", uid);
    
    // Atomically update Firestore
    await setDoc(userRef, { 
        moviesToWatch: arrayRemove(movieTitle),
        seenMovieTitles: arrayUnion(movieTitle)
    }, { merge: true });

    // Update IndexedDB
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            moviesToWatch: (localProfile.moviesToWatch || []).filter(t => t !== movieTitle),
            seenMovieTitles: Array.from(new Set([...(localProfile.seenMovieTitles || []), movieTitle]))
        };
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function clearUserMovieList(uid: string, listName: 'moviesToWatch' | 'seenMovieTitles' | 'seenKhroujSuggestions') {
    const userRef = doc(firestoreDb, 'users', uid);
    const firestoreUpdate: any = {};
    firestoreUpdate[listName] = [];
    
    // Also clear moviesToWatch if seenMovieTitles is cleared
    if (listName === 'seenMovieTitles') {
        firestoreUpdate.moviesToWatch = [];
    }

    await setDoc(userRef, firestoreUpdate, { merge: true });
    
    // Update IndexedDB
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {...localProfile};
        updatedProfile[listName] = [];
        if (listName === 'seenMovieTitles') {
            updatedProfile.moviesToWatch = [];
        }
        await storeUserInDb(uid, updatedProfile);
    }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    // 1. Try to get from IndexedDB first for speed
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        return localProfile;
    }

    // 2. If not in cache, fetch from Firestore
    const userRef = doc(firestoreDb, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const firestoreProfile = userSnap.data() as UserProfile;
        // 3. Store the fetched profile in IndexedDB for future offline use
        await storeUserInDb(uid, firestoreProfile);
        return firestoreProfile;
    } else {
        return null;
    }
}
