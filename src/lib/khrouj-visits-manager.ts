import type { VisitLog } from '@/lib/firebase/firestore';

/**
 * Normalise une chaîne de texte pour comparaison (minuscule, sans accents ni guillemets).
 */
export function normalizeString(str?: string): string {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’`"]/g, '');
}

/**
 * Génère une empreinte stable pour une visite, particulièrement si l'ID est absent.
 */
export function getVisitFingerprint(v: Partial<VisitLog>): string {
    if (v.id) return `id_${v.id}`;
    // Arrondi à la minute pour tolérer de micro-différences de timestamp
    const d = v.date ? Math.round(Number(v.date) / 60000) * 60000 : 0;
    const p = normalizeString(v.placeName);
    const c = normalizeString(v.category);
    return `fp_${d}_${p}_${c}`;
}

/**
 * Vérifie de manière robuste si deux objets visite représentent la même sortie réelle.
 */
export function isSameVisit(v1: Partial<VisitLog>, v2: Partial<VisitLog>): boolean {
    if (!v1 || !v2) return false;

    const isGeneratedId = (id?: string) => !id || id.startsWith('noid_') || id.startsWith('visit_');

    // 1. Si les deux ont un ID explicite officiel (non auto-généré)
    if (v1.id && v2.id && !isGeneratedId(v1.id) && !isGeneratedId(v2.id)) {
        return v1.id === v2.id;
    }

    // Si les deux ont exactement le même ID (même généré)
    if (v1.id && v2.id && v1.id === v2.id) {
        return true;
    }

    // 2. Si au moins l'un des deux n'a pas d'ID officiel, réconcilier par le nom du lieu et la date
    const p1 = normalizeString(v1.placeName);
    const p2 = normalizeString(v2.placeName);
    if (!p1 || !p2) return false;

    if (p1 !== p2) return false;

    // Vérification de la proximité temporelle
    const d1 = Number(v1.date || 0);
    const d2 = Number(v2.date || 0);
    if (d1 && d2) {
        const diffMs = Math.abs(d1 - d2);
        // Même jour (tolérance 12 heures pour le même lieu)
        if (diffMs < 12 * 60 * 60 * 1000) {
            const c1 = normalizeString(v1.category);
            const c2 = normalizeString(v2.category);
            if (!c1 || !c2 || c1 === c2) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Fusionne deux objets visite en préservant systématiquement les données les plus complètes.
 */
export function mergeVisitObjects(base: Partial<VisitLog>, incoming: Partial<VisitLog>): VisitLog {
    const merged: any = { ...base };

    for (const [key, val] of Object.entries(incoming)) {
        if (val === undefined || val === null || val === '') continue;

        if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
            merged[key] = val;
        } else if (key === 'orderedItem' || key === 'dishName' || key === 'note' || key === 'description') {
            // Conserver la chaîne la plus détaillée / descriptive
            if (typeof val === 'string' && typeof merged[key] === 'string' && val.trim().length > merged[key].trim().length) {
                merged[key] = val;
            }
        } else if (key === 'momentyUrl' || key === 'momentyImageUrl') {
            // Conserver l'URL valide si l'autre est manquante
            if (typeof val === 'string' && val.startsWith('http')) {
                merged[key] = val;
            }
        } else if (key === 'date') {
            // Conserver une date numérique valide
            if (Number(val) > 0) merged[key] = Number(val);
        } else if (key === 'id') {
            // Conserver un ID valide si base n'en a pas
            if (!merged.id || merged.id.startsWith('noid_') || merged.id.startsWith('visit_')) {
                merged.id = val;
            }
        }
    }

    if (base.id && !merged.id) merged.id = base.id;
    if (incoming.id && (!merged.id || merged.id.startsWith('noid_') || merged.id.startsWith('visit_'))) {
        merged.id = incoming.id;
    }

    return merged as VisitLog;
}

/**
 * FUSION SANS PERTE (LOSSLESS) entre la liste locale et distante des visites.
 *
 * Principes stricts :
 * 1. Aucune visite de Firestore n'est ignorée, même si elle n'a pas d'ID.
 * 2. Aucune visite locale n'est écrasée arbitrairement par une version distante tronquée.
 * 3. Les visites sans ID et avec ID sont réconciliées si elles désignent le même événement.
 * 4. Idempotent : exécuter le merge plusieurs fois ne crée aucun doublon.
 * 5. Garantie : le résultat final contient toujours au minimum l'union complète des données.
 */
export function mergeVisits(
    localList: (Partial<VisitLog> | null | undefined)[] = [],
    remoteList: (Partial<VisitLog> | null | undefined)[] = []
): VisitLog[] {
    const cleanLocal = (Array.isArray(localList) ? localList : []).filter(Boolean) as Partial<VisitLog>[];
    const cleanRemote = (Array.isArray(remoteList) ? remoteList : []).filter(Boolean) as Partial<VisitLog>[];

    const result: VisitLog[] = [];

    const findMatchIndex = (v: Partial<VisitLog>): number => {
        return result.findIndex(existing => isSameVisit(existing, v));
    };

    // 1. Ajouter d'abord toutes les visites distantes (base de vérité Firestore)
    for (const r of cleanRemote) {
        const idx = findMatchIndex(r);
        if (idx >= 0) {
            result[idx] = mergeVisitObjects(result[idx], r);
        } else {
            result.push(mergeVisitObjects({}, r));
        }
    }

    // 2. Fusionner avec les visites locales (ajouts hors-ligne, enrichissements récents)
    for (const l of cleanLocal) {
        const idx = findMatchIndex(l);
        if (idx >= 0) {
            result[idx] = mergeVisitObjects(result[idx], l);
        } else {
            result.push(mergeVisitObjects({}, l));
        }
    }

    // 3. Garantir un ID unique à chaque visite
    result.forEach((v, index) => {
        if (!v.id) {
            v.id = `visit_${v.date || Date.now()}_${index}`;
        }
    });

    // Tri chronologique décroissant (les sorties les plus récentes d'abord)
    return result.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));
}

export interface SafeguardLog {
    timestamp: number;
    userId: string;
    operation: string;
    previousCount: number;
    newCount: number;
    actionTaken: 'blocked_and_merged' | 'allowed';
    source: string;
}

/**
 * GARDE-FOU ANTI-RÉDUCTION ANORMALE DES VISITES
 *
 * Empêche tout module (ex: Tfarrej, sanitize, etc.) d'écraser un historique de visites
 * complet par une version tronquée ou vide.
 * Retourne toujours une liste de visites sécurisée et sans perte.
 */
export function validateVisitsMutation(
    previousVisits: VisitLog[] | undefined,
    proposedVisits: VisitLog[],
    context?: {
        userId?: string;
        operation?: string;
        isExplicitSingleDeletion?: boolean;
        source?: string;
    } | string
): VisitLog[] {
    const prev = Array.isArray(previousVisits) ? previousVisits : [];
    const proposed = Array.isArray(proposedVisits) ? proposedVisits : [];

    const ctx = typeof context === 'string'
        ? { operation: context, userId: 'unknown', isExplicitSingleDeletion: context.includes('deleteVisitLog') }
        : (context || { operation: 'mutation', userId: 'unknown' });

    // Pas de réduction de volume : opération sûre
    if (proposed.length >= prev.length) {
        return proposed;
    }

    // Suppression explicite via deleteVisitLog : toujours autorisée
    if (ctx.isExplicitSingleDeletion || ctx.operation?.includes('deleteVisitLog')) {
        return proposed;
    }

    // Détection d'une RÉDUCTION ANORMALE :
    console.warn(
        `🚨 [GARDE-FOU KHROUJ ACTIVÉ] Tentative de réduction anormale de visites bloquée !`,
        `Opération: ${ctx.operation} | Avant: ${prev.length} | Après proposé: ${proposed.length}`,
        `Fusion sans perte appliquée pour protéger l'historique.`
    );

    // Stratégie de protection : merge sans perte au lieu du remplacement destructif
    return mergeVisits(proposed, prev);
}
