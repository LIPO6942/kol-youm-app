import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; 
import { db } from "./client";

export type UserProfile = {
    uid: string;
    email: string | null;
    gender?: 'Homme' | 'Femme';
    personalizationComplete: boolean;
    createdAt: any;
};

export async function createUserProfile(uid: string, data: { email: string | null }) {
  const userProfile: UserProfile = {
    uid,
    email: data.email,
    personalizationComplete: false,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", uid), userProfile);
  return userProfile;
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, data, { merge: true });
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
