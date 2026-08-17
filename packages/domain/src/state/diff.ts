import type { CustomEntry, Enrollment, NamedSchedule } from '../model/types.js';

/**
 * Popis hromadné změny rozvrhu. Chat ani solver nesmí měnit stav přímo —
 * vždy `proposeDiff()` → uživatel potvrdí → `applyDiff()` (pravidlo #6).
 * Diff je čistě popisný, `applyDiff` z něj deterministicky spočítá nový stav.
 */
export interface Diff {
  addEnrollments?: Enrollment[];
  /** Náhrada existujícího zápisu podle `id` — např. změna varianty docházky. */
  updateEnrollments?: Enrollment[];
  removeEnrollmentIds?: string[];
  addCustomEntries?: CustomEntry[];
  updateCustomEntries?: CustomEntry[];
  removeCustomEntryIds?: string[];
}

/** True, pokud diff neobsahuje žádnou změnu. */
export function isEmptyDiff(diff: Diff): boolean {
  return (
    !diff.addEnrollments?.length &&
    !diff.updateEnrollments?.length &&
    !diff.removeEnrollmentIds?.length &&
    !diff.addCustomEntries?.length &&
    !diff.updateCustomEntries?.length &&
    !diff.removeCustomEntryIds?.length
  );
}

/**
 * Aplikuje diff na rozvrh a vrátí NOVÝ objekt (nemutuje vstup).
 * Pořadí operací: odebrání → aktualizace → přidání.
 */
export function applyDiff(schedule: NamedSchedule, diff: Diff): NamedSchedule {
  const removeEnroll = new Set(diff.removeEnrollmentIds ?? []);
  const removeCustom = new Set(diff.removeCustomEntryIds ?? []);
  const updateEnroll = new Map(
    (diff.updateEnrollments ?? []).map((e) => [e.id, e]),
  );
  const updateCustom = new Map(
    (diff.updateCustomEntries ?? []).map((e) => [e.id, e]),
  );

  const enrollments: Enrollment[] = schedule.enrollments
    .filter((e) => !removeEnroll.has(e.id))
    .map((e) => updateEnroll.get(e.id) ?? e);
  for (const added of diff.addEnrollments ?? []) enrollments.push(added);

  const customEntries: CustomEntry[] = schedule.customEntries
    .filter((e) => !removeCustom.has(e.id))
    .map((e) => updateCustom.get(e.id) ?? e);
  for (const added of diff.addCustomEntries ?? []) customEntries.push(added);

  return { ...schedule, enrollments, customEntries };
}
