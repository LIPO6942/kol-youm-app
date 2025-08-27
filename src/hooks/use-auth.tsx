
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db as firestoreDb } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/firebase/firestore';
import { getUserFromDb, storeUserInDb } from '@/lib/indexeddb';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  forceProfileRefresh: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  forceProfileRefresh: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSetProfile = useCallback(async (uid: string) => {
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
      setUserProfile(localProfile);
    }
    return localProfile;
  }, []);

  const forceProfileRefresh = useCallback(async () => {
    if (user) {
      await fetchAndSetProfile(user.uid);
    }
  }, [user, fetchAndSetProfile]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        await fetchAndSetProfile(user.uid);
        // The Firestore listener will provide real-time updates and merge data
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [fetchAndSetProfile]);
  
  useEffect(() => {
    if (user) {
      // Use onSnapshot to listen for real-time updates from Firestore
      const unsub = onSnapshot(doc(firestoreDb, "users", user.uid), async (doc) => {
        const localProfile = await getUserFromDb(user.uid);
        let finalProfile: UserProfile | null = localProfile || null;

        if (doc.exists()) {
          const firestoreData = doc.data() as UserProfile;
          
          // Merge Firestore data with sensitive local data
          finalProfile = {
            ...firestoreData, // Base from Firestore (includes synced wardrobe)
            uid: user.uid, 
            fullBodyPhotoUrl: localProfile?.fullBodyPhotoUrl, // Keep local
            closeupPhotoUrl: localProfile?.closeupPhotoUrl, // Keep local
          } as UserProfile;
          
          await storeUserInDb(user.uid, finalProfile);
        }
        
        setUserProfile(finalProfile);
        setLoading(false);
      });
      return () => unsub();
    } else {
        setLoading(false);
    }
  }, [user]);


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, forceProfileRefresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
