import type {
  Child,
  Conflict,
  NamedSchedule,
  SkippedCheck,
  Weekday,
} from '../model/types.js';
import { DEFAULT_TRAVEL_BUFFER_MIN } from '../travel/index.js';
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
function detectAgeConflicts(input: ConflictInput, index: CatalogIndex): Conflict[] {
  const conflicts: Conflict[] = [];
  const children = childById(input.children);
  for (const enrollment of input.schedule.enrollments) {
    const activity = index.activity.get(enrollment.activityId);
    const child = children.get(enrollment.childId);
    if (!activity || !child) continue;
    if (child.age < activity.ageMin || child.age > activity.ageMax) {
      conflicts.push({
        kind: 'age_out_of_range',
        severity: 'hard',
        enrollmentIds: [enrollment.id],
        message: `${child.name} (${child.age} let) je mimo věkový rozsah kroužku ${activity.name} (${activity.ageMin}–${activity.ageMax} let).`,
      });
    }
  }
  return conflicts;
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

/**
 * Detekuje konflikty v rozvrhu podle tvrdých omezení H1–H3, H5.
 * Kontroly bez vstupních dat se přeskočí a zapíší do `skippedChecks`,
 * nikdy se neaproximují.
 */
export function detectConflicts(input: ConflictInput): ConflictReport {
  const index = buildCatalogIndex(input.catalog);
  const placed = resolvePlacedSessions(input.schedule, index);

  const school = detectSchoolNotFinished(input, placed);

  return {
    conflicts: [
      ...detectTimeOverlaps(placed),
      ...detectAgeConflicts(input, index),
      ...school.conflicts,
      ...detectValidity(input, placed),
      ...detectCapacityUnknown(input, index),
    ],
    skippedChecks: school.skipped,
  };
}
