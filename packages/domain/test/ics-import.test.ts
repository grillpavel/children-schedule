import { describe, expect, it } from 'vitest';
import { generateIcs, parseIcs, type CustomEntry, type Enrollment } from '../src/index.js';
import {
  TEST_CATALOG,
  TEST_CHILD,
  TEST_SCHOOL_YEAR,
  TEST_DISTRICT,
  TEST_EXCEPTIONS,
  makeSchedule,
} from './fixtures/catalog.js';

const enrollments: Enrollment[] = [
  {
    id: 'e_ker',
    childId: 'TEST_child',
    activityId: 'TEST_keramika',
    sessionGroupId: 'TEST_keramika_po',
    status: 'selected',
    pinned: false,
  },
];

function gen(schedule = makeSchedule({ enrollments })): string {
  return generateIcs({
    child: TEST_CHILD,
    schedule,
    catalog: TEST_CATALOG,
    schoolYear: TEST_SCHOOL_YEAR,
    exceptions: TEST_EXCEPTIONS,
    districtCode: TEST_DISTRICT,
    dtstamp: '20260807T120000Z',
  });
}

describe('parseIcs (import)', () => {
  it('round-trip: export → parse dá vlastní událost se stejným názvem, místem a časem', () => {
    const events = parseIcs(gen());
    expect(events.length).toBe(1);
    const e = events[0]!;
    expect(e.name).toBe('TEST Keramika (DDM)');
    expect(e.location?.street).toBe('TEST Komenského 12');
    expect(e.location?.city).toBe('TEST_Město');
    const s = e.sessions[0]!;
    expect(s.weekday).toBe(1); // pondělí
    expect(s.startMinutes).toBe(900);
    expect(s.endMinutes).toBe(960);
  });

  it('everyWeeks se přenese z RRULE INTERVAL', () => {
    const custom: CustomEntry = {
      id: 'ce',
      childId: 'TEST_child',
      name: 'TEST Logopedie',
      kind: 'other',
      sessions: [
        {
          id: 's',
          weekday: 1,
          startMinutes: 900,
          endMinutes: 960,
          validFrom: '2026-11-02',
          validTo: '2027-03-29',
          everyWeeks: 3,
        },
      ],
    };
    const e = parseIcs(gen(makeSchedule({ customEntries: [custom] })))[0]!;
    expect(e.sessions[0]!.everyWeeks).toBe(3);
  });

  it('řetězec bez VEVENT vrátí prázdný seznam', () => {
    expect(parseIcs('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n')).toEqual([]);
  });
});

describe('generateIcs — bohatý obsah pro import (CHANGE-8)', () => {
  it('LOCATION nese adresu a DESCRIPTION obsahuje adresu, telefon, cenu a kategorii', () => {
    const unfolded = gen().replace(/\r\n /g, '');
    expect(unfolded).toContain('LOCATION:TEST Komenského 12\\, TEST_Město');
    expect(unfolded).toContain('Adresa: TEST Komenského 12');
    expect(unfolded).toContain('Telefon: 000 000 001');
    expect(unfolded).toContain('Kategorie: Rukodělky');
  });
});
