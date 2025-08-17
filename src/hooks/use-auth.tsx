
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db as firestoreDb } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/firebase/firestore';
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
      setLoading(true);
      if (user) {
        // First, try to load from local DB for speed
        const localProfile = await getUserFromDb(user.uid);
        if (localProfile) {
          setUserProfile(localProfile);
        }
        setUser(user);
        // The Firestore listener will then provide real-time updates and merge data
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (user) {
      // Use onSnapshot to listen for real-time updates from Firestore
      const unsub = onSnapshot(doc(firestoreDb, "users", user.uid), async (doc) => {
        const localProfile = await getUserFromDb(user.uid);
        let finalProfile: UserProfile | null = localProfile || null;

        if (doc.exists()) {
          const firestoreData = doc.data() as Omit<UserProfile, 'fullBodyPhotoUrl' | 'closeupPhotoUrl'>;
          // Merge firestore data with local data (local photos are preserved)
          finalProfile = {
            ...(localProfile || {}), // Start with local data
            ...firestoreData, // Overwrite with fresh firestore data
            uid: user.uid, // Ensure UID is correct
            // Explicitly keep local photos if they exist
            fullBodyPhotoUrl: localProfile?.fullBodyPhotoUrl, 
            closeupPhotoUrl: localProfile?.closeupPhotoUrl,
          } as UserProfile;
          
          await storeUserInDb(user.uid, finalProfile);
        }
        
        setUserProfile(finalProfile);
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
