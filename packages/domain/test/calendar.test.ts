import { describe, expect, it } from 'vitest';
import {
  isoWeekday,
  firstWeekdayOnOrAfter,
  weeklyOccurrences,
  relevantExceptionDates,
  isExceptionRelevant,
  type CalendarException,
} from '../src/index.js';

describe('dates', () => {
  it('isoWeekday vrací ISO den (pondělí = 1)', () => {
    expect(isoWeekday('2026-09-07')).toBe(1); // pondělí
    expect(isoWeekday('2026-09-01')).toBe(2); // úterý
    expect(isoWeekday('2026-09-06')).toBe(7); // neděle
  });

  it('firstWeekdayOnOrAfter najde první daný den >= from', () => {
    // Út 2026-09-01 → první pondělí je 2026-09-07
    expect(firstWeekdayOnOrAfter(1, '2026-09-01')).toBe('2026-09-07');
    // pokud from je už daný den, vrátí ho
    expect(firstWeekdayOnOrAfter(1, '2026-09-07')).toBe('2026-09-07');
  });

  it('weeklyOccurrences generuje týdenní výskyty včetně hranic', () => {
    const occ = weeklyOccurrences(1, '2026-09-01', '2026-09-30');
    expect(occ).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
  });

  it('weeklyOccurrences krokuje po everyWeeks týdnech', () => {
    const biweekly = weeklyOccurrences(1, '2026-09-01', '2026-10-31', 2);
    expect(biweekly).toEqual(['2026-09-07', '2026-09-21', '2026-10-05', '2026-10-19']);
    const triweekly = weeklyOccurrences(1, '2026-09-01', '2026-10-31', 3);
    expect(triweekly).toEqual(['2026-09-07', '2026-09-28', '2026-10-19']);
  });
});

describe('exceptions relevance', () => {
  const exc: CalendarException[] = [
    { date: '2026-10-28', reason: 'nat', scope: 'national', source: 's' },
    {
      date: '2027-02-10',
      reason: 'jarni',
      scope: 'district',
      districtCode: 'CZ0100',
      source: 's',
    },
    { date: '2026-11-20', reason: 'reditel', scope: 'school', source: 's' },
  ];

  it('national a school platí vždy, district jen při shodě kódu', () => {
    const dates = relevantExceptionDates(exc, 'CZ0100');
    expect(dates.has('2026-10-28')).toBe(true);
    expect(dates.has('2027-02-10')).toBe(true);
    expect(dates.has('2026-11-20')).toBe(true);
  });

  it('district okresu se neshodným kódem se vynechá', () => {
    const dates = relevantExceptionDates(exc, 'CZ9999');
    expect(dates.has('2027-02-10')).toBe(false);
    expect(dates.has('2026-10-28')).toBe(true);
  });

  it('isExceptionRelevant respektuje scope', () => {
    expect(
      isExceptionRelevant(exc[1] as CalendarException, 'CZ9999'),
    ).toBe(false);
    expect(
      isExceptionRelevant(exc[1] as CalendarException, 'CZ0100'),
    ).toBe(true);
  });
});
