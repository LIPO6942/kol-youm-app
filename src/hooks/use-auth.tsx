'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db as firestoreDb } from '@/lib/firebase/client';
import type { UserProfile } from '@/lib/firebase/firestore';
import { Loader2 } from 'lucide-react';
import { clearUserFromDb, getUserFromDb, storeUserInDb } from '@/lib/indexeddb';

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
        setUser(user);
        // We will fetch profile in the next useEffect, triggered by user change
      } else {
        setUser(null);
        setUserProfile(null);
        if (typeof window !== 'undefined') {
            await clearUserFromDb(); // Clear local data on logout
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (user) {
      // Use onSnapshot to listen for real-time updates from Firestore
      const unsub = onSnapshot(doc(firestoreDb, "users", user.uid), async (doc) => {
        setLoading(true);
        const localProfile = await getUserFromDb(user.uid);
        
        if (doc.exists()) {
          const firestoreProfile = doc.data() as UserProfile;
          
          // Merge Firestore data with local data, giving precedence to Firestore for core fields
          // but keeping local lists if they are more recent (this is a simple merge)
          const mergedProfile = {
            ...localProfile,
            ...firestoreProfile,
            // A more sophisticated merge could compare timestamps if available
            moviesToWatch: firestoreProfile.moviesToWatch || localProfile?.moviesToWatch || [],
            seenMovieTitles: firestoreProfile.seenMovieTitles || localProfile?.seenMovieTitles || [],
            seenKhroujSuggestions: firestoreProfile.seenKhroujSuggestions || localProfile?.seenKhroujSuggestions || [],
          };

          setUserProfile(mergedProfile);
          await storeUserInDb(user.uid, mergedProfile);
        } else if (localProfile) {
            // Firestore doc doesn't exist, but local one does. Use local.
            setUserProfile(localProfile);
        } else {
          // No data anywhere
          setUserProfile(null);
        }
        setLoading(false);
      });
      return () => unsub();
    }
  }, [user]);


  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {loading ? (
          <div className="flex items-center justify-center h-screen bg-background">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
