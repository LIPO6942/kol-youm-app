/**
 * File de synchronisation offline pour Kol Youm.
 *
 * Principe :
 * - Chaque opération Firestore critique (catégorie, date, watchlist) qui échoue
 *   est stockée ici dans IndexedDB.
 * - Au retour de la connexion (ou au prochain chargement), toutes les opérations
 *   en attente sont rejouées automatiquement.
 * - Idempotent : rejouer une opération déjà appliquée ne cause pas de doublon
 *   grâce à l'utilisation de setDoc({ merge: true }).
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'kolyoum-offline-sync';
const STORE_NAME = 'pending-ops';
const DB_VERSION = 1;

export type SyncOpType =
  | 'updateMovieCategory'
  | 'updateViewingDate'
  | 'addToWatchlist'
  | 'removeFromWatchlist'
  | 'markAsSeen'
  | 'updateVisit'
  | 'generic';

export interface PendingOperation {
  id: string;
  type: SyncOpType;
  uid: string;
  payload: Record<string, any>;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return _db;
}

/**
 * Ajoute une opération en attente à la file.
 */
export async function enqueueFailedOp(
  type: SyncOpType,
  uid: string,
  payload: Record<string, any>
): Promise<void> {
  try {
    const db = await getDb();
    const op: PendingOperation = {
      id: `${type}_${uid}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      uid,
      payload,
      createdAt: Date.now(),
      attempts: 0,
    };
    await db.put(STORE_NAME, op);
    console.log(`[OfflineSync] ✅ Opération mise en file : ${type}`, payload);
  } catch (e) {
    console.warn('[OfflineSync] Impossible de mettre en file:', e);
  }
}

/**
 * Récupère toutes les opérations en attente pour un utilisateur donné.
 */
export async function getPendingOps(uid: string): Promise<PendingOperation[]> {
  try {
    const db = await getDb();
    const all: PendingOperation[] = await db.getAll(STORE_NAME);
    return all.filter(op => op.uid === uid);
  } catch {
    return [];
  }
}

/**
 * Retourne le nombre total d'opérations en attente pour un uid.
 */
export async function getPendingCount(uid: string): Promise<number> {
  const ops = await getPendingOps(uid);
  return ops.length;
}

/**
 * Supprime une opération de la file (après succès).
 */
export async function removeOp(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, id);
  } catch (e) {
    console.warn('[OfflineSync] Impossible de supprimer op:', e);
  }
}

/**
 * Met à jour le compteur de tentatives et l'erreur d'une opération.
 */
async function markAttempt(op: PendingOperation, error?: string): Promise<void> {
  try {
    const db = await getDb();
    const updated: PendingOperation = {
      ...op,
      attempts: op.attempts + 1,
      lastAttemptAt: Date.now(),
      error,
    };
    await db.put(STORE_NAME, updated);
  } catch {/* ignore */}
}

/**
 * Rejoue une opération individuelle contre Firestore.
 * Retourne true si succès.
 */
async function replayOp(op: PendingOperation): Promise<boolean> {
  try {
    // Import dynamique pour éviter les dépendances circulaires
    const { doc, setDoc, getFirestore, arrayUnion, arrayRemove } = await import('firebase/firestore');
    const { getApps, getApp } = await import('firebase/app');

    const app = getApps().length ? getApp() : null;
    if (!app) return false;

    const db = getFirestore(app);
    const userRef = doc(db, 'users', op.uid);

    switch (op.type) {
      case 'updateMovieCategory': {
        const { norm, category, mediaType } = op.payload;
        const catKey = mediaType === 'tv' ? 'seriesCategories' : 'movieCategories';
        await setDoc(userRef, { [`${catKey}.${norm}`]: category }, { merge: true });
        break;
      }
      case 'updateViewingDate': {
        const { title, viewedAt, watchedInCinema, mediaType } = op.payload;
        const norm = title.toLowerCase().trim();
        const dataKey = mediaType === 'tv' ? 'seenSeriesData' : 'seenMoviesData';
        // Minimal patch: juste la date et le flag cinéma
        const patch: Record<string, any> = {};
        if (viewedAt !== undefined) patch[`${dataKey}_dateUpdate_${norm}`] = viewedAt;
        // On utilise une fonction dédiée si dispo, sinon merge minimal
        await setDoc(userRef, {
          [`seenMoviesMeta.${norm}.viewedAt`]: viewedAt ?? null,
          [`seenMoviesMeta.${norm}.watchedInCinema`]: watchedInCinema ?? false,
        }, { merge: true });
        break;
      }
      case 'addToWatchlist': {
        const { title, mediaType } = op.payload;
        const field = mediaType === 'tv' ? 'seriesToWatch' : 'moviesToWatch';
        await setDoc(userRef, { [field]: arrayUnion(title) }, { merge: true });
        break;
      }
      case 'removeFromWatchlist': {
        const { title, mediaType } = op.payload;
        const field = mediaType === 'tv' ? 'seriesToWatch' : 'moviesToWatch';
        await setDoc(userRef, { [field]: arrayRemove(title) }, { merge: true });
        break;
      }
      case 'generic': {
        const { firestorePayload } = op.payload;
        if (firestorePayload && typeof firestorePayload === 'object') {
          await setDoc(userRef, firestorePayload, { merge: true });
        }
        break;
      }
      default:
        console.warn('[OfflineSync] Type inconnu:', op.type);
        return false;
    }

    return true;
  } catch (e: any) {
    console.warn(`[OfflineSync] Erreur replay ${op.type}:`, e?.message);
    return false;
  }
}

/**
 * REJOUE TOUTES les opérations en attente pour un utilisateur.
 * À appeler au retour de la connexion ou au chargement de l'app.
 * Retourne le nombre d'opérations rejouées avec succès.
 */
export async function flushPendingOps(uid: string): Promise<{ success: number; failed: number }> {
  const ops = await getPendingOps(uid);
  if (ops.length === 0) return { success: 0, failed: 0 };

  console.log(`[OfflineSync] 🔄 Rejeu de ${ops.length} opération(s) en attente pour ${uid}...`);

  let success = 0;
  let failed = 0;

  // Trier par date de création (les plus anciennes d'abord)
  const sorted = [...ops].sort((a, b) => a.createdAt - b.createdAt);

  for (const op of sorted) {
    // Ignorer les opérations avec trop de tentatives (max 10)
    if (op.attempts >= 10) {
      console.warn(`[OfflineSync] ⚠️ Op ${op.id} ignorée après ${op.attempts} tentatives`);
      failed++;
      continue;
    }

    const ok = await replayOp(op);
    if (ok) {
      await removeOp(op.id);
      success++;
      console.log(`[OfflineSync] ✅ Op ${op.type} rejouée avec succès`);
    } else {
      await markAttempt(op, 'replay failed');
      failed++;
    }
  }

  console.log(`[OfflineSync] Résultat : ${success} succès, ${failed} échecs`);
  return { success, failed };
}

/**
 * Helper : wrapper autour d'une opération Firestore avec fallback automatique
 * vers la file offline en cas d'échec.
 *
 * Usage :
 *   await withOfflineFallback(
 *     'updateMovieCategory',
 *     uid,
 *     { norm, category, mediaType },
 *     () => setDoc(userRef, payload, { merge: true })
 *   );
 */
export async function withOfflineFallback(
  type: SyncOpType,
  uid: string,
  payload: Record<string, any>,
  firestoreOp: () => Promise<void>
): Promise<void> {
  try {
    await firestoreOp();
  } catch (e: any) {
    console.warn(`[OfflineSync] Échec Firestore (${type}), mise en file:`, e?.message);
    await enqueueFailedOp(type, uid, payload);
  }
}
