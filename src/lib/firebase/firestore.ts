import { doc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore"; 
import { db as firestoreDb } from "./client";
import { clearUserFromDb, getUserFromDb, storeUserInDb } from "@/lib/indexeddb";

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
  await setDoc(doc(firestoreDb, "users", uid), userProfile);
  await storeUserInDb(uid, userProfile);
  return userProfile;
}

export async function updateUserProfile(uid:string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) {
    const userRef = doc(firestoreDb, 'users', uid);
    
    // Create a plain object for Firestore update, don't use arrayUnion for client-side lists
    const firestoreData: { [key: string]: any } = {};
    if (data.gender) firestoreData.gender = data.gender;
    if (typeof data.personalizationComplete === 'boolean') firestoreData.personalizationComplete = data.personalizationComplete;

    // Use arrayUnion for lists that might need server-side merging/syncing
    if (data.seenMovieTitles) firestoreData.seenMovieTitles = arrayUnion(...data.seenMovieTitles);
    if (data.moviesToWatch) firestoreData.moviesToWatch = arrayUnion(...data.moviesToWatch);
    if (data.seenKhroujSuggestions) firestoreData.seenKhroujSuggestions = arrayUnion(...data.seenKhroujSuggestions);


    if (Object.keys(firestoreData).length > 0) {
      await setDoc(userRef, firestoreData, { merge: true });
    }

    // Update IndexedDB
    const localProfile = await getUserFromDb(uid) || ({ uid } as UserProfile);
    
    const updatedProfile: UserProfile = { ...localProfile };
    if (data.gender) updatedProfile.gender = data.gender;
    if (typeof data.personalizationComplete === 'boolean') updatedProfile.personalizationComplete = data.personalizationComplete;
    if (data.seenMovieTitles) {
        const currentSeen = new Set(localProfile.seenMovieTitles || []);
        data.seenMovieTitles.forEach(t => currentSeen.add(t));
        updatedProfile.seenMovieTitles = Array.from(currentSeen);
    }
    if (data.moviesToWatch) {
        const currentToWatch = new Set(localProfile.moviesToWatch || []);
        data.moviesToWatch.forEach(t => currentToWatch.add(t));
        updatedProfile.moviesToWatch = Array.from(currentToWatch);
    }
    if (data.seenKhroujSuggestions) {
        const currentSeenKhrouj = new Set(localProfile.seenKhroujSuggestions || []);
        data.seenKhroujSuggestions.forEach(t => currentSeenKhrouj.add(t));
        updatedProfile.seenKhroujSuggestions = Array.from(currentSeenKhrouj);
    }

    await storeUserInDb(uid, updatedProfile);
}

export async function moveMovieFromWatchlistToSeen(uid: string, movieTitle: string) {
    const batch = writeBatch(firestoreDb);
    const userRef = doc(firestoreDb, "users", uid);
    // Remove from 'to watch' and add to 'seen' in Firestore
    batch.update(userRef, { 
        moviesToWatch: arrayRemove(movieTitle),
        seenMovieTitles: arrayUnion(movieTitle)
    });
    await batch.commit();

    // Update IndexedDB
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            moviesToWatch: localProfile.moviesToWatch?.filter(t => t !== movieTitle) || [],
            seenMovieTitles: Array.from(new Set([...(localProfile.seenMovieTitles || []), movieTitle]))
        };
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function clearUserMovieList(uid: string, listName: 'moviesToWatch' | 'seenMovieTitles' | 'seenKhroujSuggestions') {
    const userRef = doc(firestoreDb, 'users', uid);
    const firestoreUpdate: any = {};
    
    // Special case for 'seenMovieTitles': also clears 'moviesToWatch' as it implies a full reset of movie history
    if (listName === 'seenMovieTitles') {
        firestoreUpdate.seenMovieTitles = [];
        firestoreUpdate.moviesToWatch = [];
    } else {
        firestoreUpdate[listName] = [];
    }
    await setDoc(userRef, firestoreUpdate, { merge: true });
    
    // Update IndexedDB
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        if (listName === 'seenMovieTitles') {
            localProfile.seenMovieTitles = [];
            localProfile.moviesToWatch = [];
        } else {
            localProfile[listName] = [];
        }
        await storeUserInDb(uid, localProfile);
    }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    // 1. Try to get from IndexedDB first
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        return localProfile;
    }

    // 2. If not in IndexedDB, fetch from Firestore
    const userRef = doc(firestoreDb, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const firestoreProfile = userSnap.data() as UserProfile;
        // 3. Store the fetched profile in IndexedDB for future use
        await storeUserInDb(uid, firestoreProfile);
        return firestoreProfile;
    } else {
        return null;
    }
}

// When a user logs out, we should clear their data from IndexedDB
export async function handleLogout() {
    await clearUserFromDb();
}