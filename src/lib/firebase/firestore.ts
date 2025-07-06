import { doc, setDoc, getDoc, serverTimestamp, arrayUnion } from "firebase/firestore"; 
import { db } from "./client";

export type UserProfile = {
    uid: string;
    email: string | null;
    gender?: 'Homme' | 'Femme';
    personalizationComplete: boolean;
    createdAt: any;
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
  await setDoc(doc(db, "users", uid), userProfile);
  return userProfile;
}

export async function updateUserProfile(uid:string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) {
    const userRef = doc(db, 'users', uid);

    // Special handling for seenMovieTitles to use arrayUnion
    if (data.seenMovieTitles) {
        const titlesToAdd = data.seenMovieTitles;
        delete data.seenMovieTitles; // remove from main data object
        await setDoc(userRef, {
            seenMovieTitles: arrayUnion(...titlesToAdd)
        }, { merge: true });
    }

    // Special handling for moviesToWatch to use arrayUnion
    if (data.moviesToWatch) {
        const titlesToAdd = data.moviesToWatch;
        delete data.moviesToWatch;
        await setDoc(userRef, {
            moviesToWatch: arrayUnion(...titlesToAdd)
        }, { merge: true });
    }

    // Special handling for seenKhroujSuggestions to use arrayUnion
    if (data.seenKhroujSuggestions) {
        const placesToAdd = data.seenKhroujSuggestions;
        delete data.seenKhroujSuggestions; // remove from main data object
        await setDoc(userRef, {
            seenKhroujSuggestions: arrayUnion(...placesToAdd)
        }, { merge: true });
    }


    // Update the rest of the fields if any
    if (Object.keys(data).length > 0) {
        await setDoc(userRef, data, { merge: true });
    }
}


export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    } else {
        return null;
    }
}
