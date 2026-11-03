import React from 'react';
import { removeAccents, normalizePlaceName } from './place-matching-utils';
import type { VisitLog } from './firebase/firestore';
import { Clock, Sparkles, RotateCw, History } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface PlaceVisitStats {
  placeName: string;
  cleanPlaceName: string;
  hasVisitedBefore: boolean;
  totalVisitsBefore: number;
  visitsUnderNewNameBefore: number;
  visitsUnderOldName: number;
  lastVisitDate?: number;
  lastVisitName?: string;
  lastVisitWasUnderOldName: boolean;
  daysAgo?: number;
  daysText?: string;
  formattedDate?: string;
  isRenamed: boolean;
  formerName?: string;
  timesSinceChange: number; // 1 = 1ère fois, 2 = 2ème fois, etc. strictly under the new name
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
 * - Disaggregates counters: old visits remain under the old name, new visits strictly count under the new name
 * - Detects if the place changed name (from DB, inline syntax, or manual input)
 * - Accurately sets `timesSinceChange` starting at 1 (1ère fois) for the first visit under the new name
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

  // Separate visits strictly:
  // 1. Visits made under the NEW name
  const visitsToNewName = userVisits.filter(v => isSamePlace(v.placeName, cleanTarget));
  // 2. Visits made under the OLD name (remain counted strictly under the old name)
  const visitsToOldName = (isRenamed && resolvedFormerName)
    ? userVisits.filter(v => isSamePlace(v.placeName, resolvedFormerName))
    : [];

  const visitsUnderNewNameBefore = visitsToNewName.length;
  const visitsUnderOldName = visitsToOldName.length;

  // Combine all visits to this physical location to determine the last physical visit date
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
  let lastVisitName: string | undefined;
  let lastVisitWasUnderOldName = false;
  let daysAgo: number | undefined;
  let daysText: string | undefined;
  let formattedDate: string | undefined;

  if (hasVisitedBefore) {
    const lastVisit = allPriorVisits[0];
    lastVisitDate = Number(lastVisit.date) || currentVisitDate;
    lastVisitName = lastVisit.placeName;
    lastVisitWasUnderOldName = Boolean(isRenamed && resolvedFormerName && isSamePlace(lastVisit.placeName, resolvedFormerName));
    daysAgo = getCalendarDaysDiff(lastVisitDate, currentVisitDate);
    daysText = formatDaysAgoFr(daysAgo);
    formattedDate = formatDateFr(lastVisitDate);
  }

  // Counter under new name: starts at 1 for the very first visit under this new name!
  const timesSinceChange = visitsUnderNewNameBefore + 1;

  // Build readable text summary
  let summaryText = "";
  if (hasVisitedBefore && formattedDate && daysText) {
    if (lastVisitWasUnderOldName && resolvedFormerName) {
      summaryText = `Dernière visite le ${formattedDate} (${daysText}) sous l'ancien nom "${resolvedFormerName}".`;
    } else {
      summaryText = `Dernière visite le ${formattedDate} (${daysText}).`;
    }
  } else {
    summaryText = "C'est votre première visite dans cet endroit !";
  }

  if (isRenamed) {
    const ordinal = formatOrdinalFr(timesSinceChange);
    const formerNote = resolvedFormerName ? ` (anciennement "${resolvedFormerName}")` : '';
    const renameText = `C'est la ${ordinal} fois que vous visitez cet endroit sous son nouveau nom "${cleanTarget}"${formerNote}.`;
    summaryText = hasVisitedBefore ? `${summaryText} ${renameText}` : `C'est votre première visite dans cet endroit (${renameText})`;
  }

  return {
    placeName,
    cleanPlaceName: cleanTarget,
    hasVisitedBefore,
    totalVisitsBefore,
    visitsUnderNewNameBefore,
    visitsUnderOldName,
    lastVisitDate,
    lastVisitName,
    lastVisitWasUnderOldName,
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
  const ordinal = formatOrdinalFr(stats.timesSinceChange);

  return (
    <div className="mt-1 space-y-1.5 text-xs text-foreground/90">
      <p className="font-semibold text-sm">{stats.cleanPlaceName || stats.placeName}</p>

      {/* When was the last visit */}
      {stats.hasVisitedBefore ? (
        <p className="text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Dernière visite le <strong className="text-foreground">{stats.formattedDate}</strong> ({stats.daysText})
            {stats.lastVisitWasUnderOldName && stats.formerName && (
              <span className="italic text-[11px] text-muted-foreground/80"> sous l'ancien nom « {stats.formerName} »</span>
            )}.
          </span>
        </p>
      ) : (
        <p className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>C'est votre première visite dans cet endroit !</span>
        </p>
      )}

      {/* Disaggregated counters & Renamed indication */}
      {stats.isRenamed && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-2 space-y-1 text-amber-900 dark:text-amber-200 text-[11px]">
          <div className="flex items-start gap-1.5 font-semibold">
            <RotateCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              C'est la <strong>{ordinal} fois</strong> que vous visitez cet endroit depuis que son nom a changé
              {stats.formerName ? ` (anciennement « ${stats.formerName} »)` : ''}.
            </span>
          </div>

          {/* Detailed breakdown: Old vs New counts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
              Nouveau nom : {ordinal} visite
            </span>
            {stats.visitsUnderOldName > 0 && stats.formerName && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-medium border border-amber-500/30">
                <History className="h-2.5 w-2.5" />
                {stats.visitsUnderOldName} visite{stats.visitsUnderOldName > 1 ? 's' : ''} archivée{stats.visitsUnderOldName > 1 ? 's' : ''} sous « {stats.formerName} »
              </span>
            )}
          </div>
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

  const ordinal = formatOrdinalFr(stats.timesSinceChange);

  return (
    <div className="mt-2 p-2.5 rounded-xl border bg-card/60 backdrop-blur-sm space-y-2 animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          Historique de cet endroit
        </span>

        {/* Counters badge */}
        {!stats.isRenamed ? (
          stats.totalVisitsBefore > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
              {stats.totalVisitsBefore} visite{stats.totalVisitsBefore > 1 ? 's' : ''} au total
            </span>
          )
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30">
              Nouveau nom : {ordinal} visite
            </span>
          </div>
        )}
      </div>

      {stats.hasVisitedBefore ? (
        <p className="text-xs text-foreground/90 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Dernière visite le <strong className="font-semibold">{stats.formattedDate}</strong> ({stats.daysText})
            {stats.lastVisitWasUnderOldName && stats.formerName && (
              <span className="italic text-[11px] text-muted-foreground/80"> sous l'ancien nom « {stats.formerName} »</span>
            )}
          </span>
        </p>
      ) : (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>C'est votre première visite dans cet endroit !</span>
        </p>
      )}

      {/* Renamed breakdown notification */}
      {stats.isRenamed && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 space-y-1.5 text-amber-900 dark:text-amber-200 text-[11px]">
          <div className="flex items-start gap-1.5 font-medium">
            <RotateCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              C'est la <strong>{ordinal} fois</strong> que vous visitez cet endroit sous son nouveau nom
              {stats.formerName ? ` (anciennement « ${stats.formerName} »)` : ''}.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            <span className="text-muted-foreground font-medium">Comptabilisation séparée :</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
              Cette visite = {ordinal} visite sous « {stats.cleanPlaceName} »
            </span>
            {stats.visitsUnderOldName > 0 && stats.formerName && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-medium">
                {stats.visitsUnderOldName} visite{stats.visitsUnderOldName > 1 ? 's' : ''} sous « {stats.formerName} »
              </span>
            )}
          </div>
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
              placeholder="Ex: Café Journal, Le Paris..."
              className="h-7 text-xs bg-background/80"
            />
            <p className="text-[10px] text-muted-foreground/80 italic">
              ✨ Vos anciennes visites restent comptabilisées sous l'ancien nom, et cette visite sera la 1ère sous le nouveau nom.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
