
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db as firestoreDb } from '@/lib/firebase/client';
import type { UserProfile, WardrobeItem } from '@/lib/firebase/firestore';
import { getUserFromDb, storeUserInDb } from '@/lib/indexeddb';
import { updateUserProfile as updateProfileInFirestore, purgeTestMovieData, sanitizeAndHealMovieData } from '@/lib/firebase/firestore';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  forceProfileRefresh: () => void;
  updateUserProfile: (data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) => Promise<void>;
}

function mergeRankingsByTimestamp(...rankingMaps: (Record<string, any> | undefined | null)[]): Record<string, any> {
  const result: Record<string, any> = {};
  rankingMaps.forEach(map => {
    if (!map || typeof map !== 'object' || Array.isArray(map)) return;
    Object.entries(map).forEach(([monthKey, ranking]) => {
      if (!ranking || typeof ranking !== 'object' || Array.isArray(ranking)) return;
      const existing = result[monthKey];
      if (!existing) {
        result[monthKey] = ranking;
      } else {
        const existingTime = (existing && typeof existing === 'object') ? (existing.updatedAt || existing.publishedAt || 0) : 0;
        const newTime = ranking.updatedAt || ranking.publishedAt || 0;
        if (newTime >= existingTime) {
          result[monthKey] = ranking;
        }
      }
    });
  });
  return result;
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

  // Écoute des mises à jour en temps réel des classements de films (bidirectionnel) et des suppressions
  useEffect(() => {
    const handleRankingUpdate = (e: any) => {
      const detail = e.detail;
      if (detail?.updatedProfile) {
        setUserProfile(detail.updatedProfile);
        return;
      }
      if (detail?.deletedTitle) {
        const norm = String(detail.deletedTitle).toLowerCase().trim();
        const isTv = detail.mediaType === 'tv';
        setUserProfile(prev => {
          if (!prev) return prev;
          const listKey = isTv ? 'seenSeriesTitles' : 'seenMovieTitles';
          const dataKey = isTv ? 'seenSeriesData' : 'seenMoviesData';
          const rankingsKey = isTv ? 'seriesRankings' : 'movieRankings';
          const rejectedKey = isTv ? 'rejectedSeriesTitles' : 'rejectedMovieTitles';

          const currentList = Array.isArray(prev[listKey]) ? prev[listKey] : [];
          const currentData = Array.isArray(prev[dataKey]) ? prev[dataKey] : [];
          const currentRejected = Array.isArray(prev[rejectedKey]) ? prev[rejectedKey] : [];
          const currentRankings = { ...(prev[rankingsKey] || {}) };

          Object.keys(currentRankings).forEach(k => {
            const r = currentRankings[k];
            if (r) {
              currentRankings[k] = {
                ...r,
                rankedTitles: (r.rankedTitles || []).filter((t: string) => t.toLowerCase().trim() !== norm),
                initialRankedTitles: (r.initialRankedTitles || []).filter((t: string) => t.toLowerCase().trim() !== norm),
                newlyAddedTitles: (r.newlyAddedTitles || []).filter((t: string) => t.toLowerCase().trim() !== norm),
                updatedAt: Date.now(),
              };
            }
          });

          return {
            ...prev,
            [listKey]: currentList.filter((t: string) => t.toLowerCase().trim() !== norm),
            [dataKey]: currentData.filter((m: any) => m?.title?.toLowerCase()?.trim() !== norm),
            [rejectedKey]: currentRejected.some((t: string) => t.toLowerCase().trim() === norm)
              ? currentRejected
              : [...currentRejected, detail.deletedTitle],
            [rankingsKey]: currentRankings,
          };
        });
        return;
      }
      if (detail?.action === 'added' && detail?.title) {
        const norm = String(detail.title).toLowerCase().trim();
        setUserProfile(prev => {
          if (!prev) return prev;
          // Remove from rejectedMovieTitles
          const currentRejected = Array.isArray(prev.rejectedMovieTitles) ? prev.rejectedMovieTitles : [];
          const currentRejectedSeries = Array.isArray(prev.rejectedSeriesTitles) ? prev.rejectedSeriesTitles : [];
          // Remove from all monthly rankings (treat as new entry)
          const currentRankings = { ...(prev.movieRankings || {}) };
          Object.keys(currentRankings).forEach(k => {
            const r = currentRankings[k];
            if (r) {
              currentRankings[k] = {
                ...r,
                rankedTitles: (r.rankedTitles || []).filter((t: string) => t.toLowerCase().trim() !== norm),
                initialRankedTitles: (r.initialRankedTitles || []).filter((t: string) => t.toLowerCase().trim() !== norm),
                newlyAddedTitles: (r.newlyAddedTitles || []).filter((t: string) => t.toLowerCase().trim() !== norm),
                updatedAt: Date.now(),
              };
            }
          });
          return {
            ...prev,
            rejectedMovieTitles: currentRejected.filter((t: string) => t.toLowerCase().trim() !== norm),
            rejectedSeriesTitles: currentRejectedSeries.filter((t: string) => t.toLowerCase().trim() !== norm),
            movieRankings: currentRankings,
          };
        });
        return;
      }
      if (detail?.ranking && detail?.monthKey) {
        const isTv = detail.mediaType === 'tv';
        setUserProfile(prev => {
          if (!prev) return prev;
          if (isTv) {
            const currentSeries = prev.seriesRankings || {};
            return {
              ...prev,
              seriesRankings: {
                ...currentSeries,
                [detail.monthKey]: detail.ranking,
              },
            };
          }
          const currentRankings = prev.movieRankings || {};
          return {
            ...prev,
            movieRankings: {
              ...currentRankings,
              [detail.monthKey]: detail.ranking,
            },
          };
        });
      }
    };

    window.addEventListener('kolyoum_ranking_updated', handleRankingUpdate);
    window.addEventListener('kolyoum_series_ranking_updated', handleRankingUpdate);
    window.addEventListener('kolyoum_movie_deleted', handleRankingUpdate);
    return () => {
      window.removeEventListener('kolyoum_ranking_updated', handleRankingUpdate);
      window.removeEventListener('kolyoum_series_ranking_updated', handleRankingUpdate);
      window.removeEventListener('kolyoum_movie_deleted', handleRankingUpdate);
    };
  }, []);

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
        movieRankings: mergeRankingsByTimestamp(localProfile.movieRankings, localStoredRankings),
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
            movieRankings: mergeRankingsByTimestamp(
              localStoredRankings,
              localProfile?.movieRankings,
              firestoreData.movieRankings
            ),
          } as UserProfile;
          
          await storeUserInDb(user.uid, finalProfile);
        } else if (localProfile) {
          finalProfile = {
            ...localProfile,
            movieRankings: mergeRankingsByTimestamp(
              localStoredRankings,
              localProfile.movieRankings
            ),
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

  // Assainissement et réparation unique des données de films au chargement
  const hasHealedMoviesRef = useRef(false);
  useEffect(() => {
    if (user?.uid && userProfile && !hasHealedMoviesRef.current) {
      hasHealedMoviesRef.current = true;
      sanitizeAndHealMovieData(user.uid, userProfile).then(({ healed, updatedProfile }) => {
        if (healed && updatedProfile) {
          setUserProfile(updatedProfile);
        }
      }).catch(err => {
        console.warn("Erreur silencieuse healing film:", err);
      });
    }
  }, [user?.uid, userProfile]);


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, forceProfileRefresh, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
