import type {
  Catalog,
  NamedSchedule,
  PricePeriod,
  Weekday,
} from '../model/types.js';
import { buildCatalogIndex, resolvePlacedSessions } from '../conflicts/resolve.js';

export interface CostByPeriod {
  period: PricePeriod;
  amountCzk: number;
}

export interface ScheduleSummary {
  activityCount: number;
  /**
   * Cena rozepsaná podle období. Pololetní a měsíční se sčítají odděleně,
   * nikdy se automaticky nepřepočítávají mezi obdobími (viz UI spec §6).
   */
  costByPeriod: CostByPeriod[];
  /** Volné všední dny (pondělí–pátek) bez jediné aktivity. */
  freeWeekdays: Weekday[];
  /** Nejdelší den: rozpětí od prvního začátku do posledního konce (min). */
  longestDay: { weekday: Weekday; spanMinutes: number } | undefined;
}

/**
 * Deterministicky spočítá souhrn rozvrhu pro jedno dítě.
 * Cena se bere jen z katalogových kroužků a vlastních událostí s cenou;
 * chybějící cena se nedopočítává.
 */
export function scheduleSummary(
  schedule: NamedSchedule,
  catalog: Catalog,
  childId: string,
): ScheduleSummary {
  const index = buildCatalogIndex(catalog);
  const placed = resolvePlacedSessions(schedule, index, childId);

  const activityCount =
    schedule.enrollments.filter((e) => e.childId === childId).length +
    schedule.customEntries.filter((e) => e.childId === childId).length;

  const costMap = new Map<PricePeriod, number>();
  for (const enrollment of schedule.enrollments) {
    if (enrollment.childId !== childId) continue;
    const activity = index.activity.get(enrollment.activityId);
    if (!activity) continue;
    // Neznámá cena (NaN) se do rozpočtu nepočítá — není to nula.
    if (!Number.isFinite(activity.price.amount)) continue;
    costMap.set(
      activity.price.period,
      (costMap.get(activity.price.period) ?? 0) + activity.price.amount,
    );
  }
  for (const entry of schedule.customEntries) {
    if (entry.childId !== childId || !entry.price) continue;
    if (!Number.isFinite(entry.price.amount)) continue;
    costMap.set(
      entry.price.period,
      (costMap.get(entry.price.period) ?? 0) + entry.price.amount,
    );
  }
  const costByPeriod: CostByPeriod[] = [...costMap.entries()]
    .map(([period, amountCzk]) => ({ period, amountCzk }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const usedWeekdays = new Set<Weekday>(placed.map((p) => p.weekday));
  const freeWeekdays = ([1, 2, 3, 4, 5] as Weekday[]).filter(
    (d) => !usedWeekdays.has(d),
  );

  let longestDay: ScheduleSummary['longestDay'];
  for (let d = 1 as Weekday; d <= 7; d = (d + 1) as Weekday) {
    const dayed = placed.filter((p) => p.weekday === d);
    if (dayed.length === 0) continue;
    const start = Math.min(...dayed.map((p) => p.startMinutes));
    const end = Math.max(...dayed.map((p) => p.endMinutes));
    const span = end - start;
    if (!longestDay || span > longestDay.spanMinutes) {
      longestDay = { weekday: d, spanMinutes: span };
    }
  }

  return { activityCount, costByPeriod, freeWeekdays, longestDay };
}
