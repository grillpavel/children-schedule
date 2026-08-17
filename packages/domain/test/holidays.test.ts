import { describe, it, expect } from 'vitest';
import { czechNationalHolidays, schoolYearHolidays } from '../src/calendar/holidays.js';

describe('czechNationalHolidays', () => {
  it('obsahuje pevné svátky i pohyblivé velikonoční', () => {
    const dates = new Set(czechNationalHolidays(2026).map((h) => h.date));
    expect(dates.has('2026-10-28')).toBe(true); // Den vzniku ČSR
    expect(dates.has('2026-01-01')).toBe(true);
    expect(dates.has('2026-04-06')).toBe(true); // Velikonoční pondělí 2026
    expect(dates.has('2026-04-03')).toBe(true); // Velký pátek 2026
    expect(czechNationalHolidays(2026).every((h) => h.scope === 'national')).toBe(true);
  });
});

describe('schoolYearHolidays', () => {
  it('vrátí jen svátky uvnitř školního roku, seřazené', () => {
    const result = schoolYearHolidays({ start: '2026-09-01', end: '2027-06-30' });
    const dates = result.map((h) => h.date);
    expect(dates).toContain('2026-10-28');
    expect(dates).toContain('2026-12-24');
    expect(dates).not.toContain('2026-07-05'); // mimo rozsah
    expect([...dates].sort()).toEqual(dates); // seřazené
  });
});
