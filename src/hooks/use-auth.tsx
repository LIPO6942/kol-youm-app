'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db as firestoreDb } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/firebase/firestore';
import { Loader2 } from 'lucide-react';
import { getUserFromDb, storeUserInDb } from '@/lib/indexeddb';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // First, try to load from local DB for speed
        const localProfile = await getUserFromDb(user.uid);
        if (localProfile) {
          setUserProfile(localProfile);
        }
        setUser(user);
        // The Firestore listener will then provide real-time updates
      } else {
        setUser(null);
        setUserProfile(null);
        // In a real-world scenario, you might clear IndexedDB on logout
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (user) {
      // Use onSnapshot to listen for real-time updates from Firestore
      const unsub = onSnapshot(doc(firestoreDb, "users", user.uid), async (doc) => {
        if (doc.exists()) {
          const firestoreProfile = doc.data() as UserProfile;
          setUserProfile(firestoreProfile);
          // Keep IndexedDB in sync with Firestore
          await storeUserInDb(user.uid, firestoreProfile);
        } else {
          // Document doesn't exist in Firestore, might be a new signup
          // or user has local data but no Firestore doc yet.
          // We rely on the personalization step to create the doc.
           const localProfile = await getUserFromDb(user.uid);
           setUserProfile(localProfile || null);
        }
        setLoading(false);
      });
      return () => unsub();
    } else {
        // No user, stop loading
        setLoading(false);
    }
  }, [user]);


  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
