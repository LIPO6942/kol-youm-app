
import { doc, setDoc, getDoc, serverTimestamp, arrayUnion, arrayRemove, writeBatch, updateDoc } from "firebase/firestore";
import { db as firestoreDb } from "./client";
import { getUserFromDb, storeUserInDb } from "@/lib/indexeddb";

export type WardrobeItem = {
    id: string; // Unique ID, e.g., timestamp + random string
    type: 'haut' | 'bas' | 'chaussures' | 'accessoires';
    style: 'Professionnel' | 'Décontracté' | 'Chic' | 'Sportif';
    photoDataUri: string; // This will now store the Cloudinary URL
    createdAt: number; // Timestamp for sorting
    matchingColors?: {
        name: string;
        hex: string;
    }[];
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

export type VisitLog = {
    id: string;
    placeName: string;
    category: string;
    date: number; // timestamp
    orderedItem?: string;
    source?: 'momenty' | 'app';
    isPending?: boolean;
    possibleCategories?: string[];
};

export type SeenMovie = {
    title: string;
    viewedAt: number; // timestamp of when the movie was watched
    addedAt: number; // timestamp of when it was added to the list
    posterUrl?: string;
    year?: number;
    rating?: number;
};

export type UserProfile = {
    uid: string;
    email: string | null;
    gender?: 'Homme' | 'Femme';
    age?: number; // Deprecated: use birthdate instead
    birthdate?: string; // Format: YYYY-MM-DD
    personalizationComplete: boolean;
    createdAt: any;
    // These lists are synced via Firestore
    seenMovieTitles?: string[];
    seenMoviesData?: SeenMovie[]; // New: detailed seen movies with dates
    rejectedMovieTitles?: string[];
    moviesToWatch?: string[];
    // Series lists
    seenSeriesTitles?: string[];
    seenSeriesData?: SeenMovie[];
    rejectedSeriesTitles?: string[];
    seriesToWatch?: string[];
    seenKhroujSuggestions?: string[];
    wardrobe?: WardrobeItem[];
    places?: PlaceItem[];
    visits?: VisitLog[];
    // Tfarrej preferences
    preferredCountries?: string[];
    preferredMinRating?: number;
    // Atlas des Saveurs
    specialtyImages?: Record<string, string>; // Map of specialty name to image URL, emoji, or Lucide icon string
    specialtyColors?: Record<string, string>; // Map of specialty name to custom hex color
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
        rejectedMovieTitles: [],
        moviesToWatch: [],
        seenSeriesTitles: [],
        rejectedSeriesTitles: [],
        seriesToWatch: [],
        seenKhroujSuggestions: [],
        wardrobe: [],
        places: [],
        preferredCountries: [],
        preferredMinRating: 6,
        fullBodyPhotoUrl: '',
        closeupPhotoUrl: '',
        specialtyImages: {},
        specialtyColors: {},
    };
    const { fullBodyPhotoUrl, closeupPhotoUrl, ...firestoreProfile } = userProfile;
    await setDoc(doc(firestoreDb, "users", uid), firestoreProfile);
    await storeUserInDb(uid, userProfile);
    return userProfile;
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>, localOnly: boolean = false) {
    const firestoreData: { [key: string]: any } = {};
    const localData: { [key: string]: any } = {};

    for (const key in data) {
        if (key === 'fullBodyPhotoUrl' || key === 'closeupPhotoUrl') {
            localData[key] = (data as any)[key];
        } else {
            if (key === 'seenMovieTitles' || key === 'rejectedMovieTitles' || key === 'moviesToWatch' || key === 'seenKhroujSuggestions' || key === 'wardrobe' || key === 'places') {
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
        if (data.rejectedMovieTitles) {
            updatedProfile.rejectedMovieTitles = Array.from(new Set([...(localProfile.rejectedMovieTitles || []), ...data.rejectedMovieTitles]));
        }
        if (data.moviesToWatch) {
            updatedProfile.moviesToWatch = Array.from(new Set([...(localProfile.moviesToWatch || []), ...data.moviesToWatch]));
        }
        if (data.seenSeriesTitles) {
            updatedProfile.seenSeriesTitles = Array.from(new Set([...(localProfile.seenSeriesTitles || []), ...data.seenSeriesTitles]));
        }
        if (data.rejectedSeriesTitles) {
            updatedProfile.rejectedSeriesTitles = Array.from(new Set([...(localProfile.rejectedSeriesTitles || []), ...data.rejectedSeriesTitles]));
        }
        if (data.seriesToWatch) {
            updatedProfile.seriesToWatch = Array.from(new Set([...(localProfile.seriesToWatch || []), ...data.seriesToWatch]));
        }
        if (data.seenKhroujSuggestions) {
            updatedProfile.seenKhroujSuggestions = Array.from(new Set([...(localProfile.seenKhroujSuggestions || []), ...data.seenKhroujSuggestions]));
        }
        if (data.wardrobe) {
            const allItems = [...(localProfile.wardrobe || []), ...data.wardrobe];
            const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values());
            updatedProfile.wardrobe = uniqueItems;
        }
        if (data.places) {
            const allPlaces = [...(localProfile.places || []), ...data.places];
            const uniquePlaces = Array.from(new Map(allPlaces.map(place => [place.id, place])).values());
            updatedProfile.places = uniquePlaces;
        }

        await storeUserInDb(uid, updatedProfile);
    }
}

export async function removeMovieFromList(uid: string, listName: 'moviesToWatch' | 'seenMovieTitles' | 'seriesToWatch' | 'seenSeriesTitles' | 'rejectedMovieTitles' | 'rejectedSeriesTitles', movieTitle: string) {
    const userRef = doc(firestoreDb, 'users', uid);
    await setDoc(userRef, { [listName]: arrayRemove(movieTitle) }, { merge: true });
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = { ...localProfile } as any;
        const current: string[] = Array.isArray(updatedProfile[listName]) ? updatedProfile[listName] : [];
        updatedProfile[listName] = current.filter((t: string) => t !== movieTitle);

        // Also clean up detailed data if removing from seen list
        if (listName === 'seenMovieTitles' && updatedProfile.seenMoviesData) {
            updatedProfile.seenMoviesData = updatedProfile.seenMoviesData.filter((m: any) => m.title !== movieTitle);
        } else if (listName === 'seenSeriesTitles' && updatedProfile.seenSeriesData) {
            updatedProfile.seenSeriesData = updatedProfile.seenSeriesData.filter((m: any) => m.title !== movieTitle);
        }

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


export async function moveItemFromWatchlistToSeen(uid: string, title: string, type: 'movie' | 'tv' = 'movie') {
    const userRef = doc(firestoreDb, "users", uid);

    const seenItem: SeenMovie = {
        title: title,
        viewedAt: Date.now(),
        addedAt: Date.now(),
    };

    const watchlistField = type === 'movie' ? 'moviesToWatch' : 'seriesToWatch';
    const seenTitlesField = type === 'movie' ? 'seenMovieTitles' : 'seenSeriesTitles';
    const seenDataField = type === 'movie' ? 'seenMoviesData' : 'seenSeriesData';

    await setDoc(userRef, {
        [watchlistField]: arrayRemove(title),
        [seenTitlesField]: arrayUnion(title),
        [seenDataField]: arrayUnion(seenItem)
    }, { merge: true });

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = { ...localProfile } as any;
        updatedProfile[watchlistField] = (updatedProfile[watchlistField] || []).filter((t: string) => t !== title);
        updatedProfile[seenTitlesField] = Array.from(new Set([...(updatedProfile[seenTitlesField] || []), title]));
        updatedProfile[seenDataField] = [...(updatedProfile[seenDataField] || []).filter((m: any) => m.title !== title), seenItem];
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function moveMovieFromWatchlistToSeen(uid: string, movieTitle: string) {
    return moveItemFromWatchlistToSeen(uid, movieTitle, 'movie');
}

export async function removeMovieFromSeenList(uid: string, movieTitle: string) {
    await removeMovieFromList(uid, 'seenMovieTitles', movieTitle);
}

export async function moveSeriesFromWatchlistToSeen(uid: string, seriesTitle: string) {
    return moveItemFromWatchlistToSeen(uid, seriesTitle, 'tv');
}

export async function removeSeriesFromSeenList(uid: string, seriesTitle: string) {
    await removeMovieFromList(uid, 'seenSeriesTitles', seriesTitle);
}

// Add an item to the watchlist
export async function addItemToWatchlist(uid: string, title: string, type: 'movie' | 'tv' = 'movie') {
    const userRef = doc(firestoreDb, "users", uid);
    const watchlistField = type === 'movie' ? 'moviesToWatch' : 'seriesToWatch';

    await setDoc(userRef, {
        [watchlistField]: arrayUnion(title)
    }, { merge: true });

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = { ...localProfile } as any;
        updatedProfile[watchlistField] = Array.from(new Set([...(updatedProfile[watchlistField] || []), title]));
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function addMovieToWatchlist(uid: string, movieTitle: string) {
    return addItemToWatchlist(uid, movieTitle, 'movie');
}

export async function addSeriesToWatchlist(uid: string, seriesTitle: string) {
    return addItemToWatchlist(uid, seriesTitle, 'tv');
}

// Add a series to seen list with viewing date (for manual entry)
export async function addSeenSeriesWithDate(
    uid: string,
    series: {
        title: string;
        viewedAt: number;
        posterUrl?: string;
        year?: number;
        rating?: number;
    }
) {
    const userRef = doc(firestoreDb, "users", uid);

    const seenSeries: any = {
        title: series.title,
        viewedAt: series.viewedAt,
        addedAt: Date.now(),
    };

    if (series.posterUrl) seenSeries.posterUrl = series.posterUrl;
    if (series.year !== undefined && series.year !== null) seenSeries.year = series.year;
    if (series.rating !== undefined && series.rating !== null) seenSeries.rating = series.rating;

    await setDoc(userRef, {
        seenSeriesTitles: arrayUnion(series.title),
        seenSeriesData: arrayUnion(seenSeries)
    }, { merge: true });

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            seenSeriesTitles: Array.from(new Set([...(localProfile.seenSeriesTitles || []), series.title])),
            seenSeriesData: [...(localProfile.seenSeriesData || []).filter(m => m.title !== series.title), seenSeries]
        };
        await storeUserInDb(uid, updatedProfile);
    }
}

// Add a movie to seen list with viewing date (for manual entry)
export async function addSeenMovieWithDate(
    uid: string,
    movie: {
        title: string;
        viewedAt: number;
        posterUrl?: string;
        year?: number;
        rating?: number;
    }
) {
    const userRef = doc(firestoreDb, "users", uid);

    const seenMovie: any = {
        title: movie.title,
        viewedAt: movie.viewedAt,
        addedAt: Date.now(),
    };

    // Conditionally add optional fields to avoid 'undefined' values which Firestore rejects
    if (movie.posterUrl) seenMovie.posterUrl = movie.posterUrl;
    if (movie.year !== undefined && movie.year !== null) seenMovie.year = movie.year;
    if (movie.rating !== undefined && movie.rating !== null) seenMovie.rating = movie.rating;

    await setDoc(userRef, {
        seenMovieTitles: arrayUnion(movie.title),
        seenMoviesData: arrayUnion(seenMovie)
    }, { merge: true });

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            seenMovieTitles: Array.from(new Set([...(localProfile.seenMovieTitles || []), movie.title])),
            seenMoviesData: [...(localProfile.seenMoviesData || []).filter(m => m.title !== movie.title), seenMovie]
        };
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function rejectMovie(uid: string, movieTitle: string, type: 'movie' | 'tv' = 'movie') {
    const userRef = doc(firestoreDb, "users", uid);
    const fieldName = type === 'movie' ? 'rejectedMovieTitles' : 'rejectedSeriesTitles';

    await setDoc(userRef, {
        [fieldName]: arrayUnion(movieTitle)
    }, { merge: true });

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = { ...localProfile } as any;
        updatedProfile[fieldName] = Array.from(new Set([...(updatedProfile[fieldName] || []), movieTitle]));
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function rejectSeries(uid: string, seriesTitle: string) {
    const userRef = doc(firestoreDb, "users", uid);

    await setDoc(userRef, {
        rejectedSeriesTitles: arrayUnion(seriesTitle)
    }, { merge: true });

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            rejectedSeriesTitles: Array.from(new Set([...(localProfile.rejectedSeriesTitles || []), seriesTitle]))
        };
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function clearUserMovieList(uid: string, listName: 'moviesToWatch' | 'seenMovieTitles' | 'rejectedMovieTitles' | 'seenKhroujSuggestions' | 'wardrobe' | 'seriesToWatch' | 'seenSeriesTitles' | 'rejectedSeriesTitles') {
    const userRef = doc(firestoreDb, 'users', uid);
    const firestoreUpdate: any = {};
    firestoreUpdate[listName] = [];

    // Special handling for seenMovieTitles to also clear moviesToWatch
    if (listName === 'seenMovieTitles') {
        firestoreUpdate.moviesToWatch = [];
    } else if (listName === 'seenSeriesTitles') {
        firestoreUpdate.seriesToWatch = [];
    }

    await setDoc(userRef, firestoreUpdate, { merge: true });

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = { ...localProfile };
        (updatedProfile as any)[listName] = [];
        if (listName === 'seenMovieTitles') {
            updatedProfile.moviesToWatch = [];
        } else if (listName === 'seenSeriesTitles') {
            updatedProfile.seriesToWatch = [];
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

export async function addVisitLog(uid: string, visit: Omit<VisitLog, 'id'>) {
    const newVisit: VisitLog = {
        ...visit,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const userRef = doc(firestoreDb, 'users', uid);
    await updateDoc(userRef, {
        visits: arrayUnion(newVisit)
    });

    // Update local state
    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            visits: [...(localProfile.visits || []), newVisit]
        };
        await storeUserInDb(uid, updatedProfile);
    }
}

export async function updateVisitLog(uid: string, visitId: string, updates: { date?: number; orderedItem?: string }) {
    const localProfile = await getUserFromDb(uid);
    if (!localProfile) return;

    const visitToUpdate = localProfile.visits?.find(v => v.id === visitId);
    if (!visitToUpdate) return;

    const userRef = doc(firestoreDb, 'users', uid);

    // Remove the old visit and add the updated one
    const updatedVisit = { ...visitToUpdate, ...updates };
    await updateDoc(userRef, {
        visits: arrayRemove(visitToUpdate)
    });
    await updateDoc(userRef, {
        visits: arrayUnion(updatedVisit)
    });

    // Update local state
    const updatedProfile = {
        ...localProfile,
        visits: (localProfile.visits || []).map(v =>
            v.id === visitId ? updatedVisit : v
        )
    };
    await storeUserInDb(uid, updatedProfile);
}

export async function deleteVisitLog(uid: string, visitId: string) {
    const localProfile = await getUserFromDb(uid);
    if (!localProfile) return;

    const visitToDelete = localProfile.visits?.find(v => v.id === visitId);
    if (!visitToDelete) return;

    const userRef = doc(firestoreDb, 'users', uid);
    await updateDoc(userRef, {
        visits: arrayRemove(visitToDelete)
    });

    const updatedProfile = {
        ...localProfile,
        visits: (localProfile.visits || []).filter(v => v.id !== visitId)
    };
    await storeUserInDb(uid, updatedProfile);
}

export async function updateSpecialtyCustomization(uid: string, specialtyName: string, updates: { imageUrl?: string, color?: string }) {
    const userRef = doc(firestoreDb, 'users', uid);
    const firestoreUpdates: Record<string, any> = {};

    if (updates.imageUrl !== undefined) {
        firestoreUpdates[`specialtyImages.${specialtyName}`] = updates.imageUrl;
    }
    if (updates.color !== undefined) {
        firestoreUpdates[`specialtyColors.${specialtyName}`] = updates.color;
    }

    if (Object.keys(firestoreUpdates).length > 0) {
        await updateDoc(userRef, firestoreUpdates);
    }

    const localProfile = await getUserFromDb(uid);
    if (localProfile) {
        const updatedProfile = {
            ...localProfile,
            specialtyImages: {
                ...(localProfile.specialtyImages || {}),
                ...(updates.imageUrl !== undefined ? { [specialtyName]: updates.imageUrl } : {})
            },
            specialtyColors: {
                ...(localProfile.specialtyColors || {}),
                ...(updates.color !== undefined ? { [specialtyName]: updates.color } : {})
            }
        };
        await storeUserInDb(uid, updatedProfile);
    }
}
