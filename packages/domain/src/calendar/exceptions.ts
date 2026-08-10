import type { CalendarException } from '../model/types.js';

/**
 * Rozhodne, zda je výjimka relevantní pro daného uživatele.
 *
 * - `national` platí vždy
 * - `district` jen při shodě `districtCode`
 * - `school` platí vždy (zadal ji sám uživatel)
 */
export function isExceptionRelevant(
  exception: CalendarException,
  districtCode: string,
): boolean {
  switch (exception.scope) {
    case 'national':
      return true;
    case 'school':
      return true;
    case 'district':
      return exception.districtCode === districtCode;
    default: {
      // Vyčerpávající switch — pomáhá odhalit nový scope při kompilaci.
      const _exhaustive: never = exception.scope;
      return _exhaustive;
    }
  }
}

/** Množina ISO datumů (`YYYY-MM-DD`), které jsou pro uživatele výjimkou. */
export function relevantExceptionDates(
  exceptions: readonly CalendarException[],
  districtCode: string,
): Set<string> {
  const dates = new Set<string>();
  for (const exception of exceptions) {
    if (isExceptionRelevant(exception, districtCode)) {
      dates.add(exception.date);
    }
  }
  return dates;
}

/** Mapa ISO datum → důvod výjimky, pro relevantní výjimky. */
export function relevantExceptionReasons(
  exceptions: readonly CalendarException[],
  districtCode: string,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const exception of exceptions) {
    if (isExceptionRelevant(exception, districtCode)) {
      map.set(exception.date, exception.reason);
    }
  }
  return map;
}
