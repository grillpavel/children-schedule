import type {
  Address,
  Child,
  Conflict,
  Enrollment,
  NamedSchedule,
  SkippedCheck,
  Weekday,
} from '../model/types.js';
import { DEFAULT_TRAVEL_BUFFER_MIN, haversineKm, travelMinutes, type TravelMode } from '../travel/index.js';
import {
  buildCatalogIndex,
  childById,
  resolvePlacedSessions,
  type CatalogIndex,
  type PlacedSession,
} from './resolve.js';
import type { Catalog } from '../model/types.js';

const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: 'pondělí',
  2: 'úterý',
  3: 'středu',
  4: 'čtvrtek',
  5: 'pátek',
  6: 'sobotu',
  7: 'neděli',
};

export interface DetectOptions {
  /** Rezerva na přesun ze školy (min). Výchozí `DEFAULT_TRAVEL_BUFFER_MIN`. */
  travelBufferMinutes?: number;
  /** Minimální rezerva na přesun mezi dvěma různými kroužky/místy (min), FR-8
   * design_review_58.md. Výchozí `DEFAULT_TRAVEL_BUFFER_MIN`. */
  transferBufferMinutes?: number;
}

export interface ConflictInput {
  schedule: NamedSchedule;
  catalog: Catalog;
  children: readonly Child[];
  schoolYear: { start: string; end: string };
  options?: DetectOptions;
}

export interface ConflictReport {
  conflicts: Conflict[];
  skippedChecks: SkippedCheck[];
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeOverlapMinutes(a: PlacedSession, b: PlacedSession): number {
  return Math.min(a.endMinutes, b.endMinutes) - Math.max(a.startMinutes, b.startMinutes);
}

// H1 — časová kolize dvou Sessions téhož dítěte z různých vlastníků.
function detectTimeOverlaps(placed: PlacedSession[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const seenPairs = new Set<string>();
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]!;
      const b = placed[j]!;
      if (a.childId !== b.childId) continue;
      if (a.ownerId === b.ownerId) continue; // vnitřní kolize skupiny řeší validátor (H8)
      if (a.weekday !== b.weekday) continue;
      const overlap = timeOverlapMinutes(a, b);
      if (overlap <= 0) continue;

      const pairKey = [a.ownerId, b.ownerId].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      conflicts.push({
        kind: 'time_overlap',
        severity: 'hard',
        enrollmentIds: [a.ownerId, b.ownerId],
        message: `${a.label} a ${b.label} se v ${WEEKDAY_NAMES[a.weekday]} překrývají o ${overlap} minut.`,
        suggestion: 'Vyberte jinou variantu docházky nebo jeden z kroužků odeberte.',
      });
    }
  }
  return conflicts;
}

// H2 — věk mimo rozsah kroužku.
function detectAgeConflicts(
  input: ConflictInput,
  index: CatalogIndex,
): { conflicts: Conflict[]; skipped: SkippedCheck[] } {
  const conflicts: Conflict[] = [];
  const skipped: SkippedCheck[] = [];
  const children = childById(input.children);
  const skippedIds = new Set<string>();
  for (const enrollment of input.schedule.enrollments) {
    const activity = index.activity.get(enrollment.activityId);
    const child = children.get(enrollment.childId);
    if (!activity || !child) continue;
    // Neznámý věk (design_review_88.md) — kontrola se přeskočí, ne se falešně
    // vyhodnotí jako konflikt.
    if (child.age === undefined) {
      if (!skippedIds.has(child.id)) {
        skippedIds.add(child.id);
        skipped.push({
          check: 'H2_age_out_of_range',
          reason: `Neznámý věk (${child.name}) — vhodnost pro věkový rozsah neověřena.`,
          enrollmentIds: [enrollment.id],
        });
      }
      continue;
    }
    if (child.age < activity.ageMin || child.age > activity.ageMax) {
      conflicts.push({
        kind: 'age_out_of_range',
        severity: 'hard',
        enrollmentIds: [enrollment.id],
        message: `${child.name} (${child.age} let) je mimo věkový rozsah kroužku ${activity.name} (${activity.ageMin}–${activity.ageMax} let).`,
      });
    }
  }
  return { conflicts, skipped };
}


// H3 — začátek kroužku před koncem vyučování (+ rezerva na přesun).
function detectSchoolNotFinished(
  input: ConflictInput,
  placed: PlacedSession[],
): { conflicts: Conflict[]; skipped: SkippedCheck[] } {
  const conflicts: Conflict[] = [];
  const skipped: SkippedCheck[] = [];
  const children = childById(input.children);
  const buffer = input.options?.travelBufferMinutes ?? DEFAULT_TRAVEL_BUFFER_MIN;
  const skippedKeys = new Set<string>();

  for (const session of placed) {
    const child = children.get(session.childId);
    if (!child) continue;
    const schoolEnd = child.schoolEndByWeekday[String(session.weekday)];
    if (schoolEnd === undefined) {
      const key = `${session.childId}:${session.weekday}`;
      if (!skippedKeys.has(key)) {
        skippedKeys.add(key);
        skipped.push({
          check: 'H3_school_not_finished',
          reason: `Neznámý konec vyučování (${child.name}, ${WEEKDAY_NAMES[session.weekday]}) — dosažitelnost neověřena.`,
          enrollmentIds: [session.ownerId],
        });
      }
      continue;
    }
    if (session.startMinutes < schoolEnd + buffer) {
      conflicts.push({
        kind: 'school_not_finished',
        severity: 'hard',
        enrollmentIds: [session.ownerId],
        message: `${session.label} začíná v ${formatTime(session.startMinutes)}, ale vyučování ${child.name} končí v ${formatTime(schoolEnd)} — na přesun zbývá málo času.`,
        suggestion: 'Zvolte pozdější termín nebo upravte rezervu na přesun.',
      });
    }
  }
  return { conflicts, skipped };
}

// H5 — platnost termínu mimo rozsah školního roku.
function detectValidity(input: ConflictInput, placed: PlacedSession[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const { start, end } = input.schoolYear;
  const seen = new Set<string>();
  for (const session of placed) {
    const overlaps = session.validFrom <= end && session.validTo >= start;
    if (!overlaps && !seen.has(session.ownerId)) {
      seen.add(session.ownerId);
      conflicts.push({
        kind: 'constraint_violated',
        severity: 'hard',
        enrollmentIds: [session.ownerId],
        message: `${session.label} se v tomto školním roce nekoná (platnost ${session.validFrom} – ${session.validTo}).`,
      });
    }
  }
  return conflicts;
}

// Informativní — neuvedená kapacita se nikdy neodhaduje, jen se hlásí.
function detectCapacityUnknown(input: ConflictInput, index: CatalogIndex): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const enrollment of input.schedule.enrollments) {
    const activity = index.activity.get(enrollment.activityId);
    if (activity && activity.capacity === undefined) {
      conflicts.push({
        kind: 'capacity_unknown',
        severity: 'soft',
        enrollmentIds: [enrollment.id],
        message: `Kapacita kroužku ${activity.name} není uvedena — ověřte volné místo u poskytovatele.`,
      });
    }
  }
  return conflicts;
}

/** Stejné místo — buď blízké souřadnice (< 100 m), nebo shodná ulice/město. */
function sameAddress(a: Address, b: Address): boolean {
  if (a.lat !== undefined && a.lon !== undefined && b.lat !== undefined && b.lon !== undefined) {
    return haversineKm(a.lat, a.lon, b.lat, b.lon) < 0.1;
  }
  return (a.street ?? '') === (b.street ?? '') && (a.city ?? '') === (b.city ?? '') && Boolean(a.street || a.city);
}

// H9 — logistická kolize (těsný přesun mezi různými lokalitami), FR-8 design_review_58.md.
// 🟢 stejné místo nebo dost času · 🟠 různá místa, mezera kratší než rezerva/odhad přesunu.
// Per-dítě `travelBufferMinutes`/`travelMode` (BL-038, design_review_67.md) mají přednost
// před globálním výchozím `defaultBufferMinutes`/`'car'`.
function detectTightTransfers(
  placed: PlacedSession[],
  defaultBufferMinutes: number,
  childSettings: Map<string, { bufferMinutes?: number; mode?: TravelMode }>,
): { conflicts: Conflict[]; skipped: SkippedCheck[] } {
  const conflicts: Conflict[] = [];
  const skipped: SkippedCheck[] = [];
  const seenPairs = new Set<string>();
  const skippedPairs = new Set<string>();

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const p = placed[i]!;
      const q = placed[j]!;
      if (p.childId !== q.childId) continue;
      if (p.ownerId === q.ownerId) continue;
      if (p.weekday !== q.weekday) continue;

      const [earlier, later] = p.startMinutes <= q.startMinutes ? [p, q] : [q, p];
      const gap = later.startMinutes - earlier.endMinutes;
      if (gap < 0) continue; // překryv řeší H1 (time_overlap)

      const pairKey = [earlier.ownerId, later.ownerId].sort().join('|');
      if (seenPairs.has(pairKey)) continue;

      if (!earlier.address || !later.address) {
        if (!skippedPairs.has(pairKey)) {
          skippedPairs.add(pairKey);
          skipped.push({
            check: 'H9_tight_transfer',
            reason: `Neznámá adresa u ${earlier.label} nebo ${later.label} — dosažitelnost přesunu neověřena.`,
            enrollmentIds: [earlier.ownerId, later.ownerId],
          });
        }
        continue;
      }
      if (sameAddress(earlier.address, later.address)) continue;

      const settings = childSettings.get(p.childId);
      const transferBufferMinutes = settings?.bufferMinutes ?? defaultBufferMinutes;
      const mode = settings?.mode ?? 'car';
      const hasCoords =
        earlier.address.lat !== undefined && earlier.address.lon !== undefined &&
        later.address.lat !== undefined && later.address.lon !== undefined;
      const required = hasCoords
        ? (travelMinutes(earlier.address, later.address, mode) ?? transferBufferMinutes)
        : transferBufferMinutes;
      if (gap >= required) continue;

      seenPairs.add(pairKey);
      conflicts.push({
        kind: 'travel_infeasible',
        severity: 'soft',
        enrollmentIds: [earlier.ownerId, later.ownerId],
        message: `Mezi ${earlier.label} (končí ${formatTime(earlier.endMinutes)}) a ${later.label} (začíná ${formatTime(later.startMinutes)}) zbývá na přesun mezi různými místy jen ${gap} minut.`,
        suggestion: 'Zkontrolujte, zda přesun stihnete, nebo zvolte jiný termín.',
      });
    }
  }
  return { conflicts, skipped };
}

// H10 — rodinná kolize (BL-041, design_review_65/66/85.md): dvě RŮZNÉ děti mají překrývající
// se termín ve stejný den na RŮZNÝCH místech — rodič nemůže fyzicky doprovodit/vyzvednout obě
// najednou. Stejné místo kolizi nezakládá (jeden rodič zvládne oboje na místě); neznámá adresa
// u jedné ze session se přeskočí (skippedChecks), stejná disciplína jako H9.
function detectFamilyConflicts(
  placed: PlacedSession[],
  children: readonly Child[],
): { conflicts: Conflict[]; skipped: SkippedCheck[] } {
  const conflicts: Conflict[] = [];
  const skipped: SkippedCheck[] = [];
  const seenPairs = new Set<string>();
  const skippedPairs = new Set<string>();
  const names = childById(children);

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const p = placed[i]!;
      const q = placed[j]!;
      if (p.childId === q.childId) continue; // stejné dítě řeší H1 (time_overlap)
      if (p.weekday !== q.weekday) continue;

      const overlap = timeOverlapMinutes(p, q);
      if (overlap <= 0) continue;

      const pairKey = [p.ownerId, q.ownerId].sort().join('|');
      if (seenPairs.has(pairKey)) continue;

      if (!p.address || !q.address) {
        if (!skippedPairs.has(pairKey)) {
          skippedPairs.add(pairKey);
          skipped.push({
            check: 'H10_family_overlap',
            reason: `Neznámá adresa u ${p.label} nebo ${q.label} — rodinná kolize neověřena.`,
            enrollmentIds: [p.ownerId, q.ownerId],
          });
        }
        continue;
      }
      if (sameAddress(p.address, q.address)) continue;

      seenPairs.add(pairKey);
      const childP = names.get(p.childId)?.name ?? 'dítě';
      const childQ = names.get(q.childId)?.name ?? 'dítě';
      conflicts.push({
        kind: 'family',
        severity: 'hard',
        enrollmentIds: [p.ownerId, q.ownerId],
        message: `${childP} (${p.label}) a ${childQ} (${q.label}) se v ${WEEKDAY_NAMES[p.weekday]} kryjí na různých místech — jeden rodič nemůže doprovodit obě.`,
      });
    }
  }
  return { conflicts, skipped };
}

/**
 * Detekuje konflikty v rozvrhu podle tvrdých omezení H1–H3, H5, H9, H10.
 * Kontroly bez vstupních dat se přeskočí a zapíší do `skippedChecks`,
 * nikdy se neaproximují.
 */
export function detectConflicts(input: ConflictInput): ConflictReport {
  const index = buildCatalogIndex(input.catalog);
  const placed = resolvePlacedSessions(input.schedule, index);

  const childSettings = new Map<string, { bufferMinutes?: number; mode?: TravelMode }>(
    input.children.map((c) => [c.id, { bufferMinutes: c.travelBufferMinutes, mode: c.travelMode }]),
  );

  const school = detectSchoolNotFinished(input, placed);
  const transfer = detectTightTransfers(
    placed,
    input.options?.transferBufferMinutes ?? DEFAULT_TRAVEL_BUFFER_MIN,
    childSettings,
  );
  const family = detectFamilyConflicts(placed, input.children);
  const age = detectAgeConflicts(input, index);

  return {
    conflicts: [
      ...detectTimeOverlaps(placed),
      ...age.conflicts,
      ...school.conflicts,
      ...detectValidity(input, placed),
      ...detectCapacityUnknown(input, index),
      ...transfer.conflicts,
      ...family.conflicts,
    ],
    skippedChecks: [...school.skipped, ...transfer.skipped, ...family.skipped, ...age.skipped],
  };
}

export interface ConflictPreview {
  /** `null` = žádný konflikt by nevznikl. */
  severity: 'hard' | 'soft' | null;
  message: string | undefined;
}

/**
 * Nasimuluje přidání jedné `SessionGroup` do rozvrhu dítěte a vrátí nejzávažnější
 * (časový/logistický) konflikt, který by tím vznikl — BEZ zápisu do skutečného rozvrhu
 * (BL-039, design_review_67.md). Používá stejné H1–H9 kontroly jako `detectConflicts` nad
 * hypotetickým klonem rozvrhu, ať zůstane jediný zdroj pravdy pro kolize. `capacity_unknown`
 * je z náhledu záměrně vynecháno — je to signál o chybějících datech katalogu (není
 * uvedená kapacita), ne o skutečné kolizi v rozvrhu, jinak by se označila skoro každá
 * aktivita bez ohledu na reálný rozvrh.
 */
export function previewGroupConflict(
  input: ConflictInput,
  childId: string,
  activityId: string,
  sessionGroupId: string,
): ConflictPreview {
  const index = buildCatalogIndex(input.catalog);
  const group = index.group.get(sessionGroupId);
  if (!group || group.activityId !== activityId) {
    return { severity: null, message: undefined };
  }

  const previewId = '__preview__';
  const fakeEnrollment: Enrollment = {
    id: previewId,
    childId,
    activityId,
    sessionGroupId,
    status: 'selected',
    pinned: false,
  };
  const previewSchedule: NamedSchedule = {
    ...input.schedule,
    enrollments: [...input.schedule.enrollments, fakeEnrollment],
  };
  const report = detectConflicts({ ...input, schedule: previewSchedule });
  const related = report.conflicts.filter(
    (c) => c.enrollmentIds.includes(previewId) && c.kind !== 'capacity_unknown',
  );
  if (related.length === 0) return { severity: null, message: undefined };

  const hard = related.find((c) => c.severity === 'hard');
  const chosen = hard ?? related[0]!;
  return { severity: chosen.severity, message: chosen.message };
}
