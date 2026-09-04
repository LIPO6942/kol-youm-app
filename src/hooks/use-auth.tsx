
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db as firestoreDb } from '@/lib/firebase/client';
import type { UserProfile, WardrobeItem } from '@/lib/firebase/firestore';
import { getUserFromDb, storeUserInDb } from '@/lib/indexeddb';
import { updateUserProfile as updateProfileInFirestore, purgeTestMovieData } from '@/lib/firebase/firestore';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  forceProfileRefresh: () => void;
  updateUserProfile: (data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  forceProfileRefresh: () => {},
  updateUserProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSetProfile = useCallback(async (uid: string) => {
    const localProfile = await getUserFromDb(uid);
    let localStoredRankings: Record<string, any> = {};
    if (typeof window !== 'undefined') {
      try {
        localStoredRankings = JSON.parse(localStorage.getItem('kolyoum_movie_rankings') || '{}');
      } catch {}
    }
    if (localProfile) {
      const mergedProfile = {
        ...localProfile,
        movieRankings: {
          ...localStoredRankings,
          ...(localProfile.movieRankings || {}),
        }
      };
      setUserProfile(mergedProfile);
      return mergedProfile;
    } else if (Object.keys(localStoredRankings).length > 0) {
      const partialProfile = {
        uid,
        movieRankings: localStoredRankings,
      } as unknown as UserProfile;
      setUserProfile(partialProfile);
      return partialProfile;
    }
    return localProfile;
  }, []);

  const forceProfileRefresh = useCallback(async () => {
    if (user) {
      await fetchAndSetProfile(user.uid);
    }
  }, [user, fetchAndSetProfile]);

  const updateUserProfile = useCallback(async (data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    await updateProfileInFirestore(user.uid, data);
  }, [user]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const profile = await fetchAndSetProfile(user.uid);
        // The Firestore listener will provide real-time updates and merge data
        if (!profile) {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [fetchAndSetProfile]);
  
  useEffect(() => {
    let unsubscribe = () => {};

    if (user) {
      // Use onSnapshot to listen for real-time updates from Firestore
      unsubscribe = onSnapshot(doc(firestoreDb, "users", user.uid), async (doc) => {
        const localProfile = await getUserFromDb(user.uid);
        let finalProfile: UserProfile | null = localProfile || null;

        let localStoredRankings: Record<string, any> = {};
        if (typeof window !== 'undefined') {
          try {
            localStoredRankings = JSON.parse(localStorage.getItem('kolyoum_movie_rankings') || '{}');
          } catch {}
        }

        if (doc.exists()) {
          const firestoreData = doc.data() as UserProfile;
          
          // Ensure wardrobe is always an array and de-duplicated
          const firestoreWardrobe = firestoreData.wardrobe || [];
          const uniqueItems = Array.from(new Map(firestoreWardrobe.map((item: WardrobeItem) => [item.id, item])).values());
          
          // Merge Firestore data with sensitive local data and movie rankings
          finalProfile = {
            ...firestoreData, // Base from Firestore (includes synced wardrobe)
            uid: user.uid, 
            wardrobe: uniqueItems, // Use de-duplicated wardrobe
            fullBodyPhotoUrl: localProfile?.fullBodyPhotoUrl, // Keep local
            closeupPhotoUrl: localProfile?.closeupPhotoUrl, // Keep local
            movieRankings: {
              ...localStoredRankings,
              ...(localProfile?.movieRankings || {}),
              ...(firestoreData.movieRankings || {}),
            },
          } as UserProfile;
          
          await storeUserInDb(user.uid, finalProfile);
        } else if (localProfile) {
          finalProfile = {
            ...localProfile,
            movieRankings: {
              ...localStoredRankings,
              ...(localProfile.movieRankings || {}),
            }
          };
        }
        
        setUserProfile(finalProfile ?? null);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => {
      try {
        unsubscribe();
      } catch (e) {
        console.warn("Failed unsubscribe", e);
      }
    };
  }, [user]);

  // Purge unique en arrière-plan sans bloquer ni reboucler
  const hasPurgedTestRef = useRef(false);
  useEffect(() => {
    if (user?.uid && !hasPurgedTestRef.current) {
      hasPurgedTestRef.current = true;
      purgeTestMovieData(user.uid).catch(err => {
        console.warn("Erreur silencieuse purge test:", err);
      });
    }
  }, [user?.uid]);


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, forceProfileRefresh, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
