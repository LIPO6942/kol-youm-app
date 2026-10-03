
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db as firestoreDb } from '@/lib/firebase/client';
import type { UserProfile, WardrobeItem } from '@/lib/firebase/firestore';
import { getUserFromDb, storeUserInDb } from '@/lib/indexeddb';
import { updateUserProfile as updateProfileInFirestore, purgeTestMovieData, sanitizeAndHealMovieData } from '@/lib/firebase/firestore';
import { mergeVisits } from '@/lib/khrouj-visits-manager';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  forceProfileRefresh: () => void;
  updateUserProfile: (data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>) => Promise<void>;
  restoreFromFirestore: () => Promise<{ visits: number; places: number; movies: number } | null>;
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
  restoreFromFirestore: async () => null,
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
        const cleanTitle = (s?: any) => String(s || '').toLowerCase().trim().replace(/['’`]/g, "'");
        const norm = cleanTitle(detail.deletedTitle);
        const isMatch = (s?: any) => cleanTitle(s) === norm;
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
                rankedTitles: (r.rankedTitles || []).filter((t: string) => !isMatch(t)),
                initialRankedTitles: (r.initialRankedTitles || []).filter((t: string) => !isMatch(t)),
                newlyAddedTitles: (r.newlyAddedTitles || []).filter((t: string) => !isMatch(t)),
                updatedAt: Date.now(),
              };
            }
          });

          return {
            ...prev,
            [listKey]: currentList.filter((t: string) => !isMatch(t)),
            [dataKey]: currentData.filter((m: any) => !isMatch(m?.title)),
            [rejectedKey]: currentRejected.some((t: string) => isMatch(t))
              ? currentRejected
              : [...currentRejected, detail.deletedTitle],
            [rankingsKey]: currentRankings,
          };
        });
        return;
      }
      if (detail?.action === 'added' && detail?.title) {
        const cleanTitle = (s?: any) => String(s || '').toLowerCase().trim().replace(/['’`]/g, "'");
        const norm = cleanTitle(detail.title);
        const isMatch = (s?: any) => cleanTitle(s) === norm;
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
                rankedTitles: (r.rankedTitles || []).filter((t: string) => !isMatch(t)),
                initialRankedTitles: (r.initialRankedTitles || []).filter((t: string) => !isMatch(t)),
                newlyAddedTitles: (r.newlyAddedTitles || []).filter((t: string) => !isMatch(t)),
                updatedAt: Date.now(),
              };
            }
          });
          return {
            ...prev,
            rejectedMovieTitles: currentRejected.filter((t: string) => !isMatch(t)),
            rejectedSeriesTitles: currentRejectedSeries.filter((t: string) => !isMatch(t)),
            movieRankings: currentRankings,
          };
        });
        return;
      }
      if (e.type === 'kolyoum_category_updated' && detail?.title && detail?.category) {
        const isTv = detail.mediaType === 'tv';
        const norm = detail.title.toLowerCase().trim();
        const catKey = isTv ? 'seriesCategories' : 'movieCategories';
        const dataKey = isTv ? 'seenSeriesData' : 'seenMoviesData';
        setUserProfile(prev => {
          if (!prev) return prev;
          const currentSeen = [...(prev[dataKey] || [])];
          const idx = currentSeen.findIndex((m: any) => m?.title && m.title.toLowerCase().trim() === norm);
          if (idx >= 0) {
            currentSeen[idx] = { ...currentSeen[idx], category: detail.category };
          }
          return {
            ...prev,
            [catKey]: {
              ...(prev[catKey] || {}),
              [norm]: detail.category,
            },
            [dataKey]: currentSeen,
          };
        });
        return;
      }
      if (e.type === 'kolyoum_movie_date_updated' && detail?.title) {
        const isTv = detail.mediaType === 'tv';
        const norm = detail.title.toLowerCase().trim();
        const dataKey = isTv ? 'seenSeriesData' : 'seenMoviesData';
        setUserProfile(prev => {
          if (!prev) return prev;
          const currentSeen = [...(prev[dataKey] || [])];
          const idx = currentSeen.findIndex((m: any) => m?.title && m.title.toLowerCase().trim() === norm);
          if (idx >= 0) {
            currentSeen[idx] = {
              ...currentSeen[idx],
              viewedAt: detail.viewedAt,
              watchedInCinema: detail.watchedInCinema,
            };
          } else {
            currentSeen.push({
              title: detail.title,
              viewedAt: detail.viewedAt,
              watchedInCinema: detail.watchedInCinema,
              addedAt: Date.now(),
            });
          }
          return {
            ...prev,
            [dataKey]: currentSeen,
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
    window.addEventListener('kolyoum_category_updated', handleRankingUpdate);
    window.addEventListener('kolyoum_movie_date_updated', handleRankingUpdate);
    return () => {
      window.removeEventListener('kolyoum_ranking_updated', handleRankingUpdate);
      window.removeEventListener('kolyoum_series_ranking_updated', handleRankingUpdate);
      window.removeEventListener('kolyoum_movie_deleted', handleRankingUpdate);
      window.removeEventListener('kolyoum_category_updated', handleRankingUpdate);
      window.removeEventListener('kolyoum_movie_date_updated', handleRankingUpdate);
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
      setUserProfile(prev => {
        if (prev?.visits && (!mergedProfile.visits || mergedProfile.visits.length < prev.visits.length)) {
          return { ...mergedProfile, visits: mergeVisits(prev.visits, mergedProfile.visits) };
        }
        return mergedProfile;
      });
      return mergedProfile;
    } else if (Object.keys(localStoredRankings).length > 0) {
      const partialProfile = {
        uid,
        movieRankings: localStoredRankings,
      } as unknown as UserProfile;
      setUserProfile(prev => {
        if (prev?.visits) {
          return { ...partialProfile, visits: prev.visits };
        }
        return partialProfile;
      });
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

  // Récupération forcée depuis Firestore — pour restaurer les données perdues dans IndexedDB
  const restoreFromFirestore = useCallback(async () => {
    if (!user?.uid) return null;
    try {
      const snapshot = await getDoc(doc(firestoreDb, 'users', user.uid));
      if (!snapshot.exists()) return null;
      const firestoreData = snapshot.data() as UserProfile;
      // Fusionner avec l'état actuel pour ne rien effacer
      const localProfile = await getUserFromDb(user.uid);
      const merged: UserProfile = {
        ...(localProfile || {}),
        ...firestoreData,
        uid: user.uid,
        // Protéger les données critiques : fusion sans perte Khrouj
        visits: mergeVisits(localProfile?.visits, firestoreData?.visits),
        places: (() => {
          const localP = localProfile?.places || [];
          const remoteP = firestoreData?.places || [];
          const map = new Map<string, any>();
          remoteP.forEach(p => { if (p?.id) map.set(p.id, { ...p }); });
          localP.forEach(p => { if (p?.id) map.set(p.id, { ...p }); });
          return Array.from(map.values());
        })(),
        movieCategories: {
          ...(firestoreData?.movieCategories || {}),
          ...(localProfile?.movieCategories || {}),
        },
        seenMoviesData: (() => {
          const localList = localProfile?.seenMoviesData || [];
          const remoteList = firestoreData?.seenMoviesData || [];
          const map = new Map<string, any>();
          localList.forEach(m => { if (m?.title) map.set(m.title.toLowerCase().trim(), { ...m }); });
          remoteList.forEach(m => {
            if (!m?.title) return;
            const k = m.title.toLowerCase().trim();
            const existing = map.get(k);
            if (existing) {
              map.set(k, { ...m, ...existing, viewedAt: existing.viewedAt || m.viewedAt, category: existing.category || m.category });
            } else {
              map.set(k, { ...m });
            }
          });
          return Array.from(map.values());
        })(),
      } as UserProfile;
      await storeUserInDb(user.uid, merged);
      setUserProfile(merged);
      return {
        visits: merged.visits?.length || 0,
        places: merged.places?.length || 0,
        movies: merged.seenMoviesData?.length || 0,
      };
    } catch (e) {
      console.error('Erreur restoreFromFirestore:', e);
      return null;
    }
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
          
          // Helper to merge seen data lists without losing viewedAt or category
          const mergeSeenData = (localList: any[] = [], remoteList: any[] = []) => {
            const map = new Map<string, any>();
            localList.forEach(m => {
              if (m?.title) map.set(m.title.toLowerCase().trim(), { ...m });
            });
            remoteList.forEach(m => {
              if (!m?.title) return;
              const k = m.title.toLowerCase().trim();
              const existing = map.get(k);
              if (existing) {
                map.set(k, {
                  ...m,
                  ...existing,
                  viewedAt: existing.viewedAt || m.viewedAt,
                  category: existing.category || m.category,
                  watchedInCinema: existing.watchedInCinema ?? m.watchedInCinema,
                  posterUrl: existing.posterUrl || m.posterUrl,
                });
              } else {
                map.set(k, { ...m });
              }
            });
            return Array.from(map.values());
          };



          // Merge Firestore data with sensitive local data, categories, dates, and rankings
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
            movieCategories: {
              ...(firestoreData?.movieCategories || {}),
              ...(localProfile?.movieCategories || {}),
            },
            seriesCategories: {
              ...(firestoreData?.seriesCategories || {}),
              ...(localProfile?.seriesCategories || {}),
            },
            seenMoviesData: mergeSeenData(localProfile?.seenMoviesData, firestoreData?.seenMoviesData),
            seenSeriesData: mergeSeenData(localProfile?.seenSeriesData, firestoreData?.seenSeriesData),
            // KHROUJ : protéger les visites et lieux enregistrés
            visits: mergeVisits(localProfile?.visits, firestoreData?.visits),
            places: (() => {
              const localPlaces = localProfile?.places || [];
              const remotePlaces = firestoreData?.places || [];
              const map = new Map<string, any>();
              remotePlaces.forEach((p: any) => { if (p?.id) map.set(p.id, { ...p }); });
              localPlaces.forEach((p: any) => { if (p?.id) map.set(p.id, { ...p }); });
              return Array.from(map.values());
            })(),
            // Conserver l'historique Khrouj et les suggestions vues
            seenKhroujSuggestions: Array.from(new Set([
              ...(localProfile?.seenKhroujSuggestions || []),
              ...(firestoreData?.seenKhroujSuggestions || []),
            ])),
            customSagas: {
              ...(firestoreData?.customSagas || {}),
              ...(localProfile?.customSagas || {}),
            },
            movieSagaLinks: {
              ...(firestoreData?.movieSagaLinks || {}),
              ...(localProfile?.movieSagaLinks || {}),
            },
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
    <AuthContext.Provider value={{ user, userProfile, loading, forceProfileRefresh, updateUserProfile, restoreFromFirestore }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
