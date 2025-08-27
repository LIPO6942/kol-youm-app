import { doc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore"; 
import { db as firestoreDb } from "./client";
import { getUserFromDb, storeUserInDb } from "@/lib/indexeddb";

export type WardrobeItem = {
    id: string; // Unique ID, e.g., timestamp + random string
    type: 'haut' | 'bas' | 'chaussures' | 'accessoires';
    photoDataUri: string; // The base64 Data URI of the image
    createdAt: number; // Timestamp for sorting
};

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
    // These are stored ONLY in IndexedDB for privacy and performance
    fullBodyPhotoUrl?: string;
    closeupPhotoUrl?: string;
    wardrobe?: WardrobeItem[];
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
    fullBodyPhotoUrl: '',
    closeupPhotoUrl: '',
    wardrobe: [],
  };
  // Create profile in both Firestore and IndexedDB to ensure consistency from the start
  // We don't store photo or wardrobe URLs in firestore initially.
  const { fullBodyPhotoUrl, closeupPhotoUrl, wardrobe, ...firestoreProfile } = userProfile;
  await setDoc(doc(firestoreDb, "users", uid), firestoreProfile);
  await storeUserInDb(uid, userProfile);
  return userProfile;
}

export async function updateUserProfile(uid:string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>, localOnly: boolean = false) {
    const firestoreData: { [key: string]: any } = {};
    const localData: { [key: string]: any } = {};

    // Separate data for Firestore and IndexedDB
    for (const key in data) {
        if (key === 'fullBodyPhotoUrl' || key === 'closeupPhotoUrl' || key === 'wardrobe') {
            localData[key] = (data as any)[key];
        } else {
             if (key === 'seenMovieTitles' || key === 'moviesToWatch' || key === 'seenKhroujSuggestions') {
                firestoreData[key] = arrayUnion(...(data as any)[key]);
            } else {
                firestoreData[key] = (data as any)[key];
            }
            localData[key] = (data as any)[key];
        }
    }

    // Update Firestore only if not localOnly and there's data for it
    if (!localOnly && Object.keys(firestoreData).length > 0) {
      const userRef = doc(firestoreDb, 'users', uid);
      await setDoc(userRef, firestoreData, { merge: true });
    }

    // Always update IndexedDB with combined data
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile: UserProfile = { ...localProfile, ...data };
        
        // Handle array merging logic for local update
        if (data.seenMovieTitles) {
            updatedProfile.seenMovieTitles = Array.from(new Set([...(localProfile.seenMovieTitles || []), ...data.seenMovieTitles]));
        }
        if (data.moviesToWatch) {
            updatedProfile.moviesToWatch = Array.from(new Set([...(localProfile.moviesToWatch || []), ...data.moviesToWatch]));
        }
        if (data.seenKhroujSuggestions) {
            updatedProfile.seenKhroujSuggestions = Array.from(new Set([...(localProfile.seenKhroujSuggestions || []), ...data.seenKhroujSuggestions]));
        }
        if (data.wardrobe) { // This is for adding new items
             // Ensure this is a full replacement, not a merge, if the whole array is passed
            if (Array.isArray(data.wardrobe) && Array.isArray(localProfile.wardrobe) && data.wardrobe.length !== localProfile.wardrobe.length) {
                updatedProfile.wardrobe = data.wardrobe;
            } else { // This handles the initial addition
                updatedProfile.wardrobe = [...(localProfile.wardrobe || []), ...data.wardrobe];
            }
        }

        await storeUserInDb(uid, updatedProfile);
    }
}

export async function addWardrobeItem(uid: string, item: Omit<WardrobeItem, 'id' | 'createdAt'>) {
    const localProfile = await getUserFromDb(uid);
    if (!localProfile) {
        console.error("Profile not found locally, cannot add wardrobe item.");
        return;
    }
    
    const newItem: WardrobeItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
    };

    const updatedWardrobe = [...(localProfile.wardrobe || []), newItem];
    await storeUserInDb(uid, { ...localProfile, wardrobe: updatedWardrobe });
}

export async function deleteWardrobeItem(uid: string, itemId: string) {
    const localProfile = await getUserFromDb(uid);
    if (!localProfile) {
        console.error("Profile not found locally, cannot delete wardrobe item.");
        throw new Error("Local user profile not found.");
    }

    const updatedWardrobe = (localProfile.wardrobe || []).filter(item => item.id !== itemId);
    
    await storeUserInDb(uid, { ...localProfile, wardrobe: updatedWardrobe });
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
    let localProfile = await getUserFromDb(uid);

    // 2. Fetch from Firestore to get latest non-local data
    const userRef = doc(firestoreDb, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const firestoreProfileData = userSnap.data();
        // 3. Merge Firestore data with local data (local photos take precedence)
        const mergedProfile: UserProfile = {
            ...firestoreProfileData,
            ...localProfile, // This ensures local photos are not overwritten
            uid: uid, // ensure uid is set correctly
        } as UserProfile;

        await storeUserInDb(uid, mergedProfile);
        return mergedProfile;
    } 
    
    if (localProfile) {
        return localProfile;
    }

    return null;
}
