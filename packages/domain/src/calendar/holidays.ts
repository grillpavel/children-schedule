import type { CalendarException } from '../model/types.js';
import { goodFriday, easterMonday } from './computus.js';

/** Pevné státní svátky ČR (`MM-DD` → důvod). Zdroj: zákon č. 245/2000 Sb. */
const FIXED_HOLIDAYS: ReadonlyArray<readonly [string, string]> = [
  ['01-01', 'Nový rok / Den obnovy samostatného českého státu'],
  ['05-01', 'Svátek práce'],
  ['05-08', 'Den vítězství'],
  ['07-05', 'Den slovanských věrozvěstů Cyrila a Metoděje'],
  ['07-06', 'Den upálení mistra Jana Husa'],
  ['09-28', 'Den české státnosti'],
  ['10-28', 'Den vzniku samostatného československého státu'],
  ['11-17', 'Den boje za svobodu a demokracii'],
  ['12-24', 'Štědrý den'],
  ['12-25', '1. svátek vánoční'],
  ['12-26', '2. svátek vánoční'],
];

/** Státní svátky ČR pro kalendářní rok (pevné + pohyblivé velikonoční). */
export function czechNationalHolidays(year: number): CalendarException[] {
  const source = 'zákon č. 245/2000 Sb.';
  const holidays: CalendarException[] = FIXED_HOLIDAYS.map(([md, reason]) => ({
    date: `${year}-${md}`,
    reason,
    scope: 'national' as const,
    source,
  }));
  holidays.push({ date: goodFriday(year), reason: 'Velký pátek', scope: 'national', source });
  holidays.push({ date: easterMonday(year), reason: 'Velikonoční pondělí', scope: 'national', source });
  return holidays;
}

/**
 * Státní svátky spadající do školního roku `[start, end]` (ISO `YYYY-MM-DD`).
 * Slouží jako výchozí `exceptions` — do exportu se pak promítnou jako `EXDATE` (C6-A9).
 */
export function schoolYearHolidays(schoolYear: {
  start: string;
  end: string;
}): CalendarException[] {
  const startYear = Number(schoolYear.start.slice(0, 4));
  const endYear = Number(schoolYear.end.slice(0, 4));
  const all: CalendarException[] = [];
  for (let y = startYear; y <= endYear; y++) all.push(...czechNationalHolidays(y));
  return all
    .filter((e) => e.date >= schoolYear.start && e.date <= schoolYear.end)
    .sort((a, b) => a.date.localeCompare(b.date));
}
