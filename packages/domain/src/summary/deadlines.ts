import type { Catalog, NamedSchedule } from '../model/types.js';

/** Uzávěrka přihlášek pro zapsaný kroužek dítěte. */
export interface UpcomingDeadline {
  activityId: string;
  name: string;
  /** `YYYY-MM-DD`. */
  deadline: string;
  /** Počet dní od `today` do uzávěrky (záporné = po termínu). */
  daysLeft: number;
}

/** Rozdíl dní mezi dvěma ISO daty `YYYY-MM-DD` (b − a), v celých dnech UTC. */
function daysBetween(aIso: string, bIso: string): number {
  const a = Date.UTC(
    Number(aIso.slice(0, 4)),
    Number(aIso.slice(5, 7)) - 1,
    Number(aIso.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(bIso.slice(0, 4)),
    Number(bIso.slice(5, 7)) - 1,
    Number(bIso.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

/**
 * Uzávěrky přihlášek pro kroužky zapsané u daného dítěte, seřazené vzestupně
 * podle termínu. `today` je vždy parametr (doména nečte systémový čas).
 * Kroužky bez `applicationDeadline` se vynechají.
 */
export function upcomingDeadlines(
  catalog: Catalog,
  schedule: NamedSchedule,
  childId: string,
  today: string,
): UpcomingDeadline[] {
  const byId = new Map(catalog.activities.map((a) => [a.id, a]));
  const seen = new Set<string>();
  const out: UpcomingDeadline[] = [];
  for (const e of schedule.enrollments) {
    if (e.childId !== childId || seen.has(e.activityId)) continue;
    seen.add(e.activityId);
    const activity = byId.get(e.activityId);
    if (!activity?.applicationDeadline) continue;
    out.push({
      activityId: activity.id,
      name: activity.name,
      deadline: activity.applicationDeadline,
      daysLeft: daysBetween(today, activity.applicationDeadline),
    });
  }
  return out.sort((a, b) => a.deadline.localeCompare(b.deadline));
}
