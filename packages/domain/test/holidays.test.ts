import { describe, it, expect } from 'vitest';
import {
  czechNationalHolidays,
  schoolYearHolidays,
  districtSchoolHolidays,
} from '../src/calendar/holidays.js';

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

describe('districtSchoolHolidays (BL-020, design_review_68.md FR-1)', () => {
  const schoolYear = { start: '2026-09-01', end: '2027-06-30' };

  it('vrátí přesně 21 záznamů (2 podzimní + 12 vánočních + 7 jarních), jeden den na záznam', () => {
    const result = districtSchoolHolidays(schoolYear, 'rakovnik');
    expect(result).toHaveLength(21);
    expect(result.every((h) => h.scope === 'district')).toBe(true);
    expect(result.every((h) => h.districtCode === 'rakovnik')).toBe(true);
  });

  it('obsahuje přesný datumový výčet pro každé období', () => {
    const dates = districtSchoolHolidays(schoolYear, 'rakovnik').map((h) => h.date);
    // Podzimní
    expect(dates).toEqual(
      expect.arrayContaining(['2026-10-29', '2026-10-30']),
    );
    // Vánoční (23. 12. – 3. 1.)
    expect(dates).toEqual(
      expect.arrayContaining([
        '2026-12-23',
        '2026-12-24',
        '2026-12-25',
        '2026-12-26',
        '2026-12-27',
        '2026-12-28',
        '2026-12-29',
        '2026-12-30',
        '2026-12-31',
        '2027-01-01',
        '2027-01-02',
        '2027-01-03',
      ]),
    );
    // Jarní
    expect(dates).toEqual(
      expect.arrayContaining([
        '2027-03-08',
        '2027-03-09',
        '2027-03-10',
        '2027-03-11',
        '2027-03-12',
        '2027-03-13',
        '2027-03-14',
      ]),
    );
    expect([...dates].sort()).toEqual(dates); // seřazené
  });

  it('respektuje `districtCode` parametr při tagování záznamů', () => {
    const result = districtSchoolHolidays(schoolYear, 'jiny-okres');
    expect(result.every((h) => h.districtCode === 'jiny-okres')).toBe(true);
  });

  it('mimo rozsah školního roku vrátí prázdné pole', () => {
    expect(districtSchoolHolidays({ start: '2020-09-01', end: '2021-06-30' }, 'rakovnik')).toEqual([]);
  });
});
