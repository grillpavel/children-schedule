import type { Weekday } from '../model/types.js';

/**
 * Datové utility pro generování týdenních výskytů.
 * Vše počítáno v UTC nad ISO datumy `YYYY-MM-DD`, aby do výpočtu data
 * nezasahovala lokální časová zóna. Časy (minuty od půlnoci) se přidávají
 * až ve vrstvě ICS s explicitním `TZID=Europe/Prague`.
 */

const MS_PER_DAY = 86_400_000;

/** Převede ISO datum na UTC timestamp o půlnoci. */
export function isoToUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** Převede UTC timestamp zpět na ISO datum `YYYY-MM-DD`. */
export function utcToIso(ts: number): string {
  const date = new Date(ts);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** ISO-8601 den v týdnu (1 = pondělí .. 7 = neděle) pro dané datum. */
export function isoWeekday(iso: string): Weekday {
  const day = new Date(isoToUtc(iso)).getUTCDay(); // 0 = neděle
  return (day === 0 ? 7 : day) as Weekday;
}

/** Číslo ISO týdne (1..53) pro dané datum. */
export function isoWeekNumber(iso: string): number {
  const ts = isoToUtc(iso);
  const date = new Date(ts);
  const day = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  // Posun na čtvrtek stejného ISO týdne.
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / MS_PER_DAY + 1) / 7);
}

/** Parita ISO týdne — 'even' (sudý) nebo 'odd' (lichý). */
export function isoWeekParity(iso: string): 'even' | 'odd' {
  return isoWeekNumber(iso) % 2 === 0 ? 'even' : 'odd';
}

/**
 * První datum se zadaným dnem v týdnu, které je >= `fromIso`.
 * Pokud `fromIso` samo padne na daný den, vrátí `fromIso`.
 */
export function firstWeekdayOnOrAfter(weekday: Weekday, fromIso: string): string {
  const fromTs = isoToUtc(fromIso);
  const current = isoWeekday(fromIso);
  const delta = (weekday - current + 7) % 7;
  return utcToIso(fromTs + delta * MS_PER_DAY);
}

/**
 * Všechny výskyty daného dne v týdnu v intervalu [fromIso, toIso] včetně.
 * Krok je `everyWeeks` týdnů (1 = každý týden, 2 = každý druhý, …),
 * kotvený na první výskyt >= fromIso.
 */
export function weeklyOccurrences(
  weekday: Weekday,
  fromIso: string,
  toIso: string,
  everyWeeks = 1,
): string[] {
  const step = Math.max(1, everyWeeks);
  const result: string[] = [];
  const toTs = isoToUtc(toIso);
  let ts = isoToUtc(firstWeekdayOnOrAfter(weekday, fromIso));
  while (ts <= toTs) {
    result.push(utcToIso(ts));
    ts += step * 7 * MS_PER_DAY;
  }
  return result;
}
