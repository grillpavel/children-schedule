/**
 * Computus — výpočet data Velikonoční neděle v gregoriánském kalendáři
 * anonymním Gaussovým algoritmem.
 *
 * Toto je deterministický výpočet, nikoli odhad — proto je (na rozdíl od
 * konkrétních datumů prázdnin) přípustné počítat ho v kódu. Má vlastní
 * unit test proti známým datům.
 */

export interface CalendarDay {
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
}

/** Vrátí datum Velikonoční neděle pro daný rok (gregoriánský kalendář). */
export function easterSunday(year: number): CalendarDay {
  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const k = Math.floor(year / 100);
  const p = Math.floor((13 + 8 * k) / 25);
  const q = Math.floor(k / 4);
  const M = (15 - p + k - q) % 30;
  const N = (4 + k - q) % 7;
  const d = (19 * a + M) % 30;
  let e = (2 * b + 4 * c + 6 * d + N) % 7;

  // Gaussovy korekce pro krajní případy
  if (d === 29 && e === 6) {
    return { year, month: 4, day: 19 };
  }
  if (d === 28 && e === 6 && (11 * M + 11) % 30 < 19) {
    return { year, month: 4, day: 18 };
  }

  const dayOfMarch = 22 + d + e;
  if (dayOfMarch <= 31) {
    return { year, month: 3, day: dayOfMarch };
  }
  return { year, month: 4, day: dayOfMarch - 31 };
}

function toIsoDate(day: CalendarDay): string {
  const mm = String(day.month).padStart(2, '0');
  const dd = String(day.day).padStart(2, '0');
  return `${day.year}-${mm}-${dd}`;
}

function addDaysIso(day: CalendarDay, delta: number): string {
  // UTC, aby nezasahovala lokální časová zóna do výpočtu data.
  const base = Date.UTC(day.year, day.month - 1, day.day);
  const shifted = new Date(base + delta * 86_400_000);
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Velký pátek jako ISO datum (Velikonoční neděle − 2 dny). */
export function goodFriday(year: number): string {
  return addDaysIso(easterSunday(year), -2);
}

/** Velikonoční pondělí jako ISO datum (Velikonoční neděle + 1 den). */
export function easterMonday(year: number): string {
  return addDaysIso(easterSunday(year), 1);
}

/** Velikonoční neděle jako ISO datum. */
export function easterSundayIso(year: number): string {
  return toIsoDate(easterSunday(year));
}
