import React from 'react';
import { removeAccents, normalizePlaceName } from './place-matching-utils';
import type { VisitLog } from './firebase/firestore';
import { Clock, Sparkles, RotateCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface PlaceVisitStats {
  placeName: string;
  cleanPlaceName: string;
  hasVisitedBefore: boolean;
  totalVisitsBefore: number;
  lastVisitDate?: number;
  daysAgo?: number;
  daysText?: string;
  formattedDate?: string;
  isRenamed: boolean;
  formerName?: string;
  timesSinceChange?: number; // 1 = 1ère fois, 2 = 2ème fois, etc. (including the current visit)
  summaryText: string;
}

/**
 * Remove bracketed tags like "[Brunch]" or "[Café]" from place names.
 */
export function cleanPlaceBaseName(name: string): string {
  if (!name) return '';
  return name.split('[')[0].trim();
}

/**
 * Detects if a place name contains an inline former name like:
 * - "Le Loft (ex-Café Journal)"
 * - "Le Diplomate (anciennement Le Paris)"
 * - "Spot X [ex Spot Y]"
 */
export function extractInlineFormerName(rawName: string): { cleanName: string; formerName?: string } {
  if (!rawName) return { cleanName: '' };

  const trimmed = rawName.trim();
  const match = trimmed.match(/[\(\[](?:ex[:\s-]|anciennement\s+|anc\.\s*|ex\s+)(.+?)[\)\]]/i);

  if (match && match[1]) {
    const formerName = match[1].trim();
    const cleanName = trimmed
      .replace(/[\(\[](?:ex[:\s-]|anciennement\s+|anc\.\s*|ex\s+)(.+?)[\)\]]/i, '')
      .split('[')[0]
      .trim();
    return { cleanName: cleanName || trimmed, formerName };
  }

  return { cleanName: cleanPlaceBaseName(trimmed) };
}

/**
 * Safe, robust place name comparison handling brackets, accents, and casing.
 */
export function isSamePlace(a: string, b: string): boolean {
  if (!a || !b) return false;

  const rawCleanA = cleanPlaceBaseName(a).replace(/\(.*?\)/g, '').trim().toLowerCase();
  const rawCleanB = cleanPlaceBaseName(b).replace(/\(.*?\)/g, '').trim().toLowerCase();

  if (rawCleanA === rawCleanB) return true;

  const normA = removeAccents(rawCleanA).replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const normB = removeAccents(rawCleanB).replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  if (normA && normB && normA === normB) return true;

  // Check normalized without stop words if both have meaningful core length
  const cleanA = normalizePlaceName(rawCleanA, true);
  const cleanB = normalizePlaceName(rawCleanB, true);
  if (cleanA && cleanB && cleanA.length >= 3 && cleanB.length >= 3 && cleanA === cleanB) {
    return true;
  }

  return false;
}

/**
 * Look up in closedPlacesMap (from Firestore zones) to find if this place was previously named something else.
 */
export function findFormerNameInClosedMap(
  placeName: string,
  closedPlacesMap?: Record<string, { replacedBy?: string; closedAt?: string; reason?: string }>
): { formerName?: string; closedAt?: string; reason?: string } | null {
  if (!placeName || !closedPlacesMap) return null;

  const target = cleanPlaceBaseName(placeName);

  for (const [oldName, info] of Object.entries(closedPlacesMap)) {
    if (info?.replacedBy && isSamePlace(info.replacedBy, target)) {
      return {
        formerName: oldName,
        closedAt: info.closedAt,
        reason: info.reason,
      };
    }
  }

  return null;
}

/**
 * Calculates calendar day difference between two dates (ignoring hours/minutes).
 */
export function getCalendarDaysDiff(targetDateMs: number, baseDateMs: number): number {
  const d1 = new Date(targetDateMs);
  const d2 = new Date(baseDateMs);

  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());

  const diffDays = Math.floor(Math.abs(utc2 - utc1) / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Formats a timestamp into French date string: e.g. "15 octobre 2026"
 */
export function formatDateFr(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }
}

/**
 * Formats calendar days into a human-readable string in French.
 */
export function formatDaysAgoFr(days: number): string {
  if (days === 0) return "aujourd'hui (0 jour)";
  if (days === 1) return "hier (il y a 1 jour)";
  return `il y a ${days} jours`;
}

/**
 * Formats a number to French ordinal string: 1 -> "1ère", 2 -> "2ème", etc.
 */
export function formatOrdinalFr(n: number): string {
  return n === 1 ? '1ère' : `${n}ème`;
}

/**
 * Main calculation of visit stats for a place:
 * - Checks when was the last time the user visited this place (date and days count)
 * - Or determines if it's the first time
 * - Detects if the place changed name (from DB, inline syntax, or manual input)
 * - Calculates the X-th time the user has visited this place since its name changed
 */
export function calculatePlaceVisitStats(params: {
  placeName: string;
  userVisits: VisitLog[];
  closedPlacesMap?: Record<string, { replacedBy?: string; closedAt?: string; reason?: string }>;
  manualFormerName?: string;
  isManualRenamedChecked?: boolean;
  currentVisitDate?: number;
}): PlaceVisitStats {
  const {
    placeName,
    userVisits = [],
    closedPlacesMap,
    manualFormerName,
    isManualRenamedChecked,
    currentVisitDate = Date.now()
  } = params;

  const inlineDetection = extractInlineFormerName(placeName);
  const cleanTarget = inlineDetection.cleanName || cleanPlaceBaseName(placeName);
  const dbDetection = findFormerNameInClosedMap(cleanTarget, closedPlacesMap);

  // Determine if renamed and former name
  const manualTrimmed = manualFormerName ? manualFormerName.trim() : '';
  const resolvedFormerName = manualTrimmed || inlineDetection.formerName || dbDetection?.formerName || undefined;
  const isRenamed = Boolean(
    isManualRenamedChecked ||
    manualTrimmed ||
    inlineDetection.formerName ||
    dbDetection?.formerName
  );

  const closedAtTimestamp = dbDetection?.closedAt ? new Date(dbDetection.closedAt).getTime() : undefined;

  // Filter existing user visits
  const visitsToNewName = userVisits.filter(v => isSamePlace(v.placeName, cleanTarget));
  const visitsToOldName = (isRenamed && resolvedFormerName)
    ? userVisits.filter(v => isSamePlace(v.placeName, resolvedFormerName))
    : [];

  // Combine all visits to this physical location (under current or former name)
  // Deduplicate by ID if present
  const seenIds = new Set<string>();
  const allPriorVisits: VisitLog[] = [];

  for (const v of [...visitsToNewName, ...visitsToOldName]) {
    const key = v.id || `${v.placeName}_${v.date}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      allPriorVisits.push(v);
    }
  }

  // Sort descending by date (most recent first)
  allPriorVisits.sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));

  const hasVisitedBefore = allPriorVisits.length > 0;
  const totalVisitsBefore = allPriorVisits.length;

  let lastVisitDate: number | undefined;
  let daysAgo: number | undefined;
  let daysText: string | undefined;
  let formattedDate: string | undefined;

  if (hasVisitedBefore) {
    lastVisitDate = Number(allPriorVisits[0].date) || currentVisitDate;
    daysAgo = getCalendarDaysDiff(lastVisitDate, currentVisitDate);
    daysText = formatDaysAgoFr(daysAgo);
    formattedDate = formatDateFr(lastVisitDate);
  }

  // Calculate visits since name changed (including current visit being added: +1)
  let timesSinceChange: number | undefined;
  if (isRenamed) {
    let pastVisitsSinceChange: VisitLog[];
    if (closedAtTimestamp) {
      pastVisitsSinceChange = allPriorVisits.filter(v =>
        isSamePlace(v.placeName, cleanTarget) || (Number(v.date) >= closedAtTimestamp)
      );
    } else {
      pastVisitsSinceChange = visitsToNewName;
    }
    timesSinceChange = pastVisitsSinceChange.length + 1;
  }

  // Build readable text summary
  let summaryText = "";
  if (hasVisitedBefore && formattedDate && daysText) {
    summaryText = `Dernière visite le ${formattedDate} (${daysText}).`;
  } else {
    summaryText = "C'est votre première visite dans cet endroit !";
  }

  if (isRenamed && timesSinceChange !== undefined) {
    const ordinal = formatOrdinalFr(timesSinceChange);
    const formerNote = resolvedFormerName ? ` (anciennement ${resolvedFormerName})` : '';
    const renameText = `C'est la ${ordinal} fois que vous visitez cet endroit depuis que son nom a changé${formerNote}.`;
    summaryText = hasVisitedBefore ? `${summaryText} ${renameText}` : `C'est votre première visite dans cet endroit (${renameText})`;
  }

  return {
    placeName,
    cleanPlaceName: cleanTarget,
    hasVisitedBefore,
    totalVisitsBefore,
    lastVisitDate,
    daysAgo,
    daysText,
    formattedDate,
    isRenamed,
    formerName: resolvedFormerName,
    timesSinceChange,
    summaryText
  };
}

/**
 * Ephemeral Toast notification content when adding a place visit.
 */
export function PlaceVisitToastContent({ stats }: { stats: PlaceVisitStats }) {
  const ordinal = stats.timesSinceChange === 1 ? '1ère' : `${stats.timesSinceChange}ème`;

  return (
    <div className="mt-1 space-y-1.5 text-xs text-foreground/90">
      <p className="font-semibold text-sm">{stats.cleanPlaceName || stats.placeName}</p>

      {stats.hasVisitedBefore ? (
        <p className="text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Dernière visite le <strong className="text-foreground">{stats.formattedDate}</strong> ({stats.daysText}).
          </span>
        </p>
      ) : (
        <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>C'est votre première visite dans cet endroit !</span>
        </p>
      )}

      {stats.isRenamed && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-amber-800 dark:text-amber-200 text-[11px] font-medium flex items-start gap-1.5">
          <RotateCw className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            C'est la <strong>{ordinal} fois</strong> que vous visitez cet endroit depuis que son nom a changé{stats.formerName ? ` (anciennement ${stats.formerName})` : ''}.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Real-time insight card displayed inside ManualVisitForm as the user types/selects a place.
 */
export function PlaceVisitPreviewCard(props: {
  stats: PlaceVisitStats;
  hasRenamed: boolean;
  setHasRenamed: (val: boolean) => void;
  formerNameInput: string;
  setFormerNameInput: (val: string) => void;
  isAutoDetectedRenamed: boolean;
  setIsAutoDetectedRenamed: (val: boolean) => void;
}) {
  const {
    stats,
    hasRenamed,
    setHasRenamed,
    formerNameInput,
    setFormerNameInput,
    isAutoDetectedRenamed,
    setIsAutoDetectedRenamed
  } = props;

  const ordinal = stats.timesSinceChange === 1 ? '1ère' : `${stats.timesSinceChange}ème`;

  return (
    <div className="mt-2 p-2.5 rounded-xl border bg-card/60 backdrop-blur-sm space-y-2 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          Historique de cet endroit
        </span>
        {stats.totalVisitsBefore > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
            {stats.totalVisitsBefore} visite{stats.totalVisitsBefore > 1 ? 's' : ''} au total
          </span>
        )}
      </div>

      {stats.hasVisitedBefore ? (
        <p className="text-xs text-foreground/90 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Dernière visite le <strong className="font-semibold">{stats.formattedDate}</strong> ({stats.daysText})
          </span>
        </p>
      ) : (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>C'est votre première visite dans cet endroit !</span>
        </p>
      )}

      {stats.isRenamed && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-amber-900 dark:text-amber-200 text-[11px] font-medium flex items-start gap-1.5">
          <RotateCw className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            C'est la <strong>{ordinal} fois</strong> que vous visitez cet endroit depuis que son nom a changé{stats.formerName ? ` (anciennement ${stats.formerName})` : ''}.
          </span>
        </div>
      )}

      {/* Option to indicate or edit former name */}
      <div className="pt-1.5 border-t border-border/40 space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="hasRenamedCheck" className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors select-none">
            <Checkbox
              id="hasRenamedCheck"
              checked={hasRenamed}
              onCheckedChange={(c) => {
                const val = Boolean(c);
                setHasRenamed(val);
                if (!val) {
                  setFormerNameInput("");
                }
              }}
              className="h-3.5 w-3.5"
            />
            <span>Cet endroit a changé de nom</span>
          </label>
          {isAutoDetectedRenamed && hasRenamed && (
            <span className="text-[9px] font-semibold text-amber-700 bg-amber-100/70 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300/40">
              Détecté automatiquement
            </span>
          )}
        </div>

        {hasRenamed && (
          <div className="space-y-1 animate-in fade-in duration-150 pl-5.5">
            <Label className="text-[10px] text-muted-foreground">Ancien nom de l'établissement :</Label>
            <Input
              value={formerNameInput}
              onChange={(e) => {
                setFormerNameInput(e.target.value);
                setIsAutoDetectedRenamed(false);
              }}
              placeholder="Ex: Ancien Café, Le Paris..."
              className="h-7 text-xs bg-background/80"
            />
          </div>
        )}
      </div>
    </div>
  );
}

