
import { doc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore"; 
import { db as firestoreDb } from "./client";
import { getUserFromDb, storeUserInDb } from "@/lib/indexeddb";

export type WardrobeItem = {
    id: string; // Unique ID, e.g., timestamp + random string
    type: 'haut' | 'bas' | 'chaussures' | 'accessoires';
    style: 'Professionnel' | 'Décontracté' | 'Chic' | 'Sportif';
    photoDataUri: string; // This will now store the Cloudinary URL
    createdAt: number; // Timestamp for sorting
};

export type PlaceItem = {
  id: string;
  name: string;
  category: 'café' | 'restaurant' | 'fast-food' | 'bar' | 'parc' | 'musée' | 'cinéma' | 'théâtre' | 'autre';
  address?: string;
  description?: string;
  predefinedArea?: string;
  createdAt: any;
};

export type UserProfile = {
    uid: string;
    email: string | null;
    gender?: 'Homme' | 'Femme';
    age?: number;
    personalizationComplete: boolean;
    createdAt: any;
    // These lists are synced via Firestore
    seenMovieTitles?: string[];
    moviesToWatch?: string[];
    seenKhroujSuggestions?: string[];
    wardrobe?: WardrobeItem[];
    places?: PlaceItem[];
    // Tfarrej preferences
    preferredCountries?: string[];
    preferredMinRating?: number;
    // These are stored ONLY in IndexedDB for privacy
    fullBodyPhotoUrl?: string; // This will also be a Cloudinary URL
    closeupPhotoUrl?: string; // This will also be a Cloudinary URL
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
    wardrobe: [],
    places: [],
    preferredCountries: [],
    preferredMinRating: 6,
    fullBodyPhotoUrl: '',
    closeupPhotoUrl: '',
  };
  const { fullBodyPhotoUrl, closeupPhotoUrl, ...firestoreProfile } = userProfile;
  await setDoc(doc(firestoreDb, "users", uid), firestoreProfile);
  await storeUserInDb(uid, userProfile);
  return userProfile;
}

export async function updateUserProfile(uid:string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>, localOnly: boolean = false) {
    const firestoreData: { [key: string]: any } = {};
    const localData: { [key: string]: any } = {};

    for (const key in data) {
        if (key === 'fullBodyPhotoUrl' || key === 'closeupPhotoUrl') {
            localData[key] = (data as any)[key];
        } else {
             if (key === 'seenMovieTitles' || key === 'moviesToWatch' || key === 'seenKhroujSuggestions' || key === 'wardrobe') {
                firestoreData[key] = arrayUnion(...(data as any)[key]);
            } else {
                firestoreData[key] = (data as any)[key];
            }
            localData[key] = (data as any)[key];
        }
    }

    if (!localOnly && Object.keys(firestoreData).length > 0) {
      const userRef = doc(firestoreDb, 'users', uid);
      await setDoc(userRef, firestoreData, { merge: true });
    }

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile: UserProfile = { ...localProfile, ...data };
        
        if (data.seenMovieTitles) {
            updatedProfile.seenMovieTitles = Array.from(new Set([...(localProfile.seenMovieTitles || []), ...data.seenMovieTitles]));
        }
        if (data.moviesToWatch) {
            updatedProfile.moviesToWatch = Array.from(new Set([...(localProfile.moviesToWatch || []), ...data.moviesToWatch]));
        }
        if (data.seenKhroujSuggestions) {
            updatedProfile.seenKhroujSuggestions = Array.from(new Set([...(localProfile.seenKhroujSuggestions || []), ...data.seenKhroujSuggestions]));
        }
         if (data.wardrobe) {
            const allItems = [...(localProfile.wardrobe || []), ...data.wardrobe];
            const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());
            updatedProfile.wardrobe = uniqueItems;
        }

        await storeUserInDb(uid, updatedProfile);
    }
}

export async function removeMovieFromList(uid: string, listName: 'moviesToWatch' | 'seenMovieTitles', movieTitle: string) {
    const userRef = doc(firestoreDb, 'users', uid);
    await setDoc(userRef, { [listName]: arrayRemove(movieTitle) }, { merge: true });
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = { ...localProfile } as any;
        const current: string[] = Array.isArray(updatedProfile[listName]) ? updatedProfile[listName] : [];
        updatedProfile[listName] = current.filter((t: string) => t !== movieTitle);
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function addWardrobeItem(uid: string, item: Omit<WardrobeItem, 'id' | 'createdAt'>) {
    const newItem: WardrobeItem = {
        ...item,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
    };

    // ONLY update Firestore. The onSnapshot listener in useAuth will handle updating the local state and IndexedDB.
    const userRef = doc(firestoreDb, 'users', uid);
    await setDoc(userRef, {
        wardrobe: arrayUnion(newItem)
    }, { merge: true });
}

export async function deleteWardrobeItem(uid: string, itemToDelete: WardrobeItem) {
    // First, try to delete the image from Cloudinary
    try {
        const response = await fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: itemToDelete.photoDataUri }),
        });
        const result = await response.json();
        if (!response.ok) {
            // Log the error but proceed with Firestore deletion anyway,
            // as the image might already be deleted or the URL is invalid.
            console.warn(`Could not delete image from Cloudinary: ${result.error}`);
        }
    } catch (error) {
        console.error("Error calling delete-image API route:", error);
    }
    
    // Then, delete the item from Firestore.
    // The onSnapshot listener in useAuth will handle updating the local state and IndexedDB.
    const userRef = doc(firestoreDb, 'users', uid);
    await setDoc(userRef, {
        wardrobe: arrayRemove(itemToDelete)
    }, { merge: true });
}

export async function addPlace(uid: string, place: Omit<PlaceItem, 'id' | 'createdAt'>) {
    const newPlace: PlaceItem = {
        ...place,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: serverTimestamp(),
    };

    const userRef = doc(firestoreDb, 'users', uid);
    await setDoc(userRef, {
        places: arrayUnion(newPlace)
    }, { merge: true });

    // Update local state
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            places: [...(localProfile.places || []), newPlace]
        };
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function deletePlace(uid: string, placeToDelete: PlaceItem) {
    const userRef = doc(firestoreDb, 'users', uid);
    await setDoc(userRef, {
        places: arrayRemove(placeToDelete)
    }, { merge: true });

    // Update local state
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            places: (localProfile.places || []).filter(p => p.id !== placeToDelete.id)
        };
        await storeUserInDb(uid, updatedProfile);
    }
}


export async function moveMovieFromWatchlistToSeen(uid: string, movieTitle: string) {
    const userRef = doc(firestoreDb, "users", uid);
    
    await setDoc(userRef, { 
        moviesToWatch: arrayRemove(movieTitle),
        seenMovieTitles: arrayUnion(movieTitle)
    }, { merge: true });

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

export async function clearUserMovieList(uid: string, listName: 'moviesToWatch' | 'seenMovieTitles' | 'seenKhroujSuggestions' | 'wardrobe') {
    const userRef = doc(firestoreDb, 'users', uid);
    const firestoreUpdate: any = {};
    firestoreUpdate[listName] = [];
    
    // Special handling for seenMovieTitles to also clear moviesToWatch
    if (listName === 'seenMovieTitles') {
        firestoreUpdate.moviesToWatch = [];
    }

    await setDoc(userRef, firestoreUpdate, { merge: true });
    
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {...localProfile};
        (updatedProfile as any)[listName] = [];
        if (listName === 'seenMovieTitles') {
            updatedProfile.moviesToWatch = [];
        }
        await storeUserInDb(uid, updatedProfile);
    }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    let localProfile = await getUserFromDb(uid);

    const userRef = doc(firestoreDb, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        const firestoreProfileData = userSnap.data() as UserProfile;
        
        // Merge Firestore data with local-only data
        const mergedProfile: UserProfile = {
            ...firestoreProfileData, // Base from Firestore
            uid: uid,
            // Keep local-only fields from IndexedDB
            fullBodyPhotoUrl: localProfile?.fullBodyPhotoUrl,
            closeupPhotoUrl: localProfile?.closeupPhotoUrl,
        };

        await storeUserInDb(uid, mergedProfile);
        return mergedProfile;
    } 
    
    if (localProfile) {
        return localProfile;
    }

    return null;
}
