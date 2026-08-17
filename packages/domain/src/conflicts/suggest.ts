import type { Catalog, Conflict, NamedSchedule, Weekday } from '../model/types.js';
import { buildCatalogIndex, resolvePlacedSessions, type PlacedSession } from './resolve.js';

/** Návrh přepnutí varianty docházky, který sníží počet časových kolizí. */
export interface VariantSwitchSuggestion {
  enrollmentId: string;
  activityId: string;
  fromGroupId: string;
  toGroupId: string;
  toLabel: string;
  /** Kolik tvrdých časových kolizí by po přepnutí dítěti zbylo. */
  remainingOverlaps: number;
}

const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'Po',
  2: 'Út',
  3: 'St',
  4: 'Čt',
  5: 'Pá',
  6: 'So',
  7: 'Ne',
};

function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Počet tvrdých časových překryvů dítěte (páry různých vlastníků ve stejný den). */
function countTimeOverlaps(
  catalog: Catalog,
  schedule: NamedSchedule,
  childId: string,
): number {
  const index = buildCatalogIndex(catalog);
  const placed: PlacedSession[] = resolvePlacedSessions(schedule, index, childId);
  const seen = new Set<string>();
  let count = 0;
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i]!;
      const b = placed[j]!;
      if (a.ownerId === b.ownerId) continue;
      if (a.weekday !== b.weekday) continue;
      const overlap =
        Math.min(a.endMinutes, b.endMinutes) - Math.max(a.startMinutes, b.startMinutes);
      if (overlap <= 0) continue;
      const key = [a.ownerId, b.ownerId].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      count++;
    }
  }
  return count;
}

/**
 * Pro časovou kolizi navrhne konkrétní přepnutí varianty téhož kroužku,
 * které sníží počet tvrdých časových kolizí dítěte. Deterministické:
 * řadí podle zbývajících kolizí, pak podle popisku varianty.
 * Vrací prázdné pole pro jiné druhy konfliktu nebo když žádná varianta nepomůže.
 */
export function suggestVariantSwitches(
  catalog: Catalog,
  schedule: NamedSchedule,
  childId: string,
  conflict: Conflict,
): VariantSwitchSuggestion[] {
  if (conflict.kind !== 'time_overlap') return [];

  const baseline = countTimeOverlaps(catalog, schedule, childId);
  if (baseline === 0) return [];

  const suggestions: VariantSwitchSuggestion[] = [];
  const seen = new Set<string>();

  for (const ownerId of conflict.enrollmentIds) {
    const enrollment = schedule.enrollments.find((e) => e.id === ownerId);
    if (!enrollment || enrollment.childId !== childId) continue;

    const alternatives = catalog.sessionGroups.filter(
      (g) => g.activityId === enrollment.activityId && g.id !== enrollment.sessionGroupId,
    );

    for (const group of alternatives) {
      const key = `${enrollment.id}::${group.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const modified: NamedSchedule = {
        ...schedule,
        enrollments: schedule.enrollments.map((e) =>
          e.id === enrollment.id ? { ...e, sessionGroupId: group.id } : e,
        ),
      };
      const remaining = countTimeOverlaps(catalog, modified, childId);
      if (remaining >= baseline) continue;

      const toLabel =
        group.label ??
        group.sessions
          .map((s) => `${WEEKDAY_SHORT[s.weekday]} ${hhmm(s.startMinutes)}–${hhmm(s.endMinutes)}`)
          .join(', ');

      suggestions.push({
        enrollmentId: enrollment.id,
        activityId: enrollment.activityId,
        fromGroupId: enrollment.sessionGroupId,
        toGroupId: group.id,
        toLabel,
        remainingOverlaps: remaining,
      });
    }
  }

  suggestions.sort(
    (a, b) => a.remainingOverlaps - b.remainingOverlaps || a.toLabel.localeCompare(b.toLabel),
  );
  return suggestions;
}
