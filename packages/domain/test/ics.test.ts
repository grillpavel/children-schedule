import { describe, expect, it } from 'vitest';
import ICAL from 'ical.js';
import { generateIcs, type CustomEntry, type Enrollment } from '../src/index.js';
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
  {
    id: 'e_flo',
    childId: 'TEST_child',
    activityId: 'TEST_florbal',
    sessionGroupId: 'TEST_florbal_posT',
    status: 'selected',
    pinned: false,
  },
];

function generate(mode: 'recurring' | 'expanded' = 'recurring'): string {
  return generateIcs({
    child: TEST_CHILD,
    schedule: makeSchedule({ enrollments }),
    catalog: TEST_CATALOG,
    schoolYear: TEST_SCHOOL_YEAR,
    exceptions: TEST_EXCEPTIONS,
    districtCode: TEST_DISTRICT,
    dtstamp: '20260807T120000Z',
    mode,
  });
}

const encoder = new TextEncoder();

describe('generateIcs', () => {
  it('řádky končí CRLF', () => {
    const ics = generate();
    const parts = ics.split('\n');
    for (const line of parts.slice(0, -1)) {
      expect(line.endsWith('\r')).toBe(true);
    }
  });

  it('žádný řádek nepřekročí 75 oktetů', () => {
    const ics = generate();
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('emituje X-APPLE-STRUCTURED-LOCATION se souřadnicemi, když má adresa lat/lon', () => {
    const unfolded = generate().replace(/\r\n[ \t]/g, '');
    expect(unfolded).toContain('X-APPLE-STRUCTURED-LOCATION');
    expect(unfolded).toMatch(
      /X-APPLE-STRUCTURED-LOCATION[^\r\n]*:geo:-?\d+(\.\d+)?,-?\d+(\.\d+)?/,
    );
  });

  it('obsahuje povinný VTIMEZONE Europe/Prague', () => {
    expect(generate()).toContain('BEGIN:VTIMEZONE');
    expect(generate()).toContain('TZID:Europe/Prague');
  });

  it('DTSTART se posune za výjimku (ředitelské volno 2026-09-07 → 09-14)', () => {
    expect(generate()).toContain('DTSTART;TZID=Europe/Prague:20260914T150000');
  });

  it('EXDATE má shodný čas i TZID jako DTSTART', () => {
    // Florbal ve středu 16:00, 2026-10-28 je státní svátek → EXDATE
    expect(generate()).toContain(
      'EXDATE;TZID=Europe/Prague:20261028T160000',
    );
  });

  it('UID je deterministické — dva běhy dají bitově shodný výstup', () => {
    expect(generate()).toBe(generate());
  });

  it('round-trip: ical.js dokáže výstup naparsovat', () => {
    const ics = generate();
    const jcal = ICAL.parse(ics);
    const comp = new ICAL.Component(jcal);
    expect(comp.name).toBe('vcalendar');
    const events = comp.getAllSubcomponents('vevent');
    // 1× keramika (Po) + 2× florbal (Po, St) = 3 VEVENTy
    expect(events.length).toBe(3);
  });

  it('expanded režim negeneruje týdenní RRULE a vynechá výjimky', () => {
    const ics = generate('expanded');
    // RRULE zůstává jen ve VTIMEZONE (přechod na letní čas), ne u událostí.
    expect(ics).not.toContain('RRULE:FREQ=WEEKLY');
    expect(ics).not.toContain('20261028T160000'); // výjimka vynechána, ne EXDATE
  });
});

const customEvery3: CustomEntry = {
  id: 'ce_every3',
  childId: 'TEST_child',
  name: 'TEST Logopedie',
  kind: 'other',
  sessions: [
    {
      id: 'ce_s',
      weekday: 1,
      startMinutes: 900,
      endMinutes: 960,
      validFrom: '2026-11-01',
      validTo: '2027-03-31',
      everyWeeks: 3,
    },
  ],
};

function generateOpts(
  extra: Partial<Parameters<typeof generateIcs>[0]> = {},
  schedule = makeSchedule({ enrollments }),
): string {
  return generateIcs({
    child: TEST_CHILD,
    schedule,
    catalog: TEST_CATALOG,
    schoolYear: TEST_SCHOOL_YEAR,
    exceptions: TEST_EXCEPTIONS,
    districtCode: TEST_DISTRICT,
    dtstamp: '20260807T120000Z',
    ...extra,
  });
}

function colorValues(ics: string): string[] {
  return ics
    .split('\r\n')
    .filter((l) => l.startsWith('COLOR:'))
    .map((l) => l.slice('COLOR:'.length));
}

describe('generateIcs — CHANGE-1', () => {
  it('AC-1: everyWeeks=3 → INTERVAL=3; výchozí (1) bez INTERVAL', () => {
    const withInterval = generateOpts(
      {},
      makeSchedule({ customEntries: [customEvery3] }),
    );
    expect(withInterval).toContain('INTERVAL=3');
    // Standardní týdenní zápisy INTERVAL nemají.
    expect(generate()).not.toContain('INTERVAL=');
  });

  it('AC-2: validFrom/validTo řídí DTSTART a UNTIL', () => {
    const ics = generateOpts({}, makeSchedule({ customEntries: [customEvery3] }));
    // první pondělí >= 2026-11-01 je 2026-11-02
    expect(ics).toContain('DTSTART;TZID=Europe/Prague:20261102T150000');
    expect(ics).toContain('UNTIL=20270331T235959Z');
  });

  it('AC-3: vlastní název kalendáře → X-WR-CALNAME', () => {
    expect(generateOpts({ calendarTitle: 'TEST Julinka rozvrh' })).toContain(
      'X-WR-CALNAME:TEST Julinka rozvrh',
    );
    // fallback na jméno dítěte
    expect(generateOpts()).toContain('X-WR-CALNAME:TEST Julinka');
  });

  it('AC-4: colorMode single = jedna barva; per_activity = různé', () => {
    const single = generateOpts({ colorMode: 'single' });
    const perActivity = generateOpts({ colorMode: 'per_activity' });
    expect(new Set(colorValues(single)).size).toBe(1);
    expect(new Set(colorValues(perActivity)).size).toBe(2);
    expect(single).toContain('X-APPLE-CALENDAR-COLOR:');
  });

  it('AC-5: připomínka je nastavitelná; null vypne VALARM', () => {
    expect(generateOpts({ alarmMinutesBefore: 45 })).toContain('TRIGGER:-PT45M');
    expect(generateOpts({ alarmMinutesBefore: null })).not.toContain(
      'BEGIN:VALARM',
    );
  });
});

function eventByUid(ics: string, uidPart: string): ICAL.Component {
  const comp = new ICAL.Component(ICAL.parse(ics));
  const found = comp
    .getAllSubcomponents('vevent')
    .find((v) => String(v.getFirstPropertyValue('uid')).includes(uidPart));
  if (!found) throw new Error(`VEVENT s UID obsahujícím "${uidPart}" nenalezen`);
  return found;
}

describe('generateIcs — CHANGE-4 (přepisy aktivit)', () => {
  const overrides = [
    {
      activityId: 'TEST_keramika',
      name: 'TEST Keramika PŘEPIS',
      address: { street: 'TEST Nová 5', city: 'TEST_Praha' },
      contactPhone: '111 222 333',
      price: { amount: 999, period: 'per_month' as const },
      colorCss: 'indianred',
    },
  ];

  it('AC-2: přepis mění SUMMARY, LOCATION, COLOR, cenu a kontakt (per_activity)', () => {
    const ics = generateOpts({ overrides });
    const ev = eventByUid(ics, 's_keramika');
    expect(ev.getFirstPropertyValue('summary')).toBe('TEST Keramika PŘEPIS (DDM)');
    expect(ev.getFirstPropertyValue('location')).toBe('TEST Nová 5, TEST_Praha');
    expect(String(ev.getFirstPropertyValue('color'))).toBe('indianred');
    const desc = String(ev.getFirstPropertyValue('description'));
    expect(desc).toContain('111 222 333');
    expect(desc).toContain('999');
  });

  it('AC-2: bez přepisu zůstává katalogový název i barva', () => {
    const ev = eventByUid(generateOpts(), 's_keramika');
    expect(ev.getFirstPropertyValue('summary')).toBe('TEST Keramika (DDM)');
  });

  it('AC-2: v single režimu se barva z přepisu ignoruje (jedna barva)', () => {
    const single = generateOpts({ overrides, colorMode: 'single' });
    expect(new Set(colorValues(single)).size).toBe(1);
  });
});

describe('generateIcs — allowOnHolidays (design_review_68.md FR-7, AC-5)', () => {
  it('bez override se DTSTART posune za výjimku (viz existující chování)', () => {
    expect(generateOpts()).toContain('DTSTART;TZID=Europe/Prague:20260914T150000');
  });

  it('s allowOnHolidays: true se výjimka ignoruje — DTSTART zůstává na prvním výskytu', () => {
    const overrides = [{ activityId: 'TEST_keramika', allowOnHolidays: true }];
    const ics = generateOpts({ overrides });
    expect(ics).toContain('DTSTART;TZID=Europe/Prague:20260907T150000');
    const ev = eventByUid(ics, 's_keramika');
    expect(ev.toString()).not.toContain('EXDATE');
  });

  it('s allowOnHolidays: true v expanded režimu obsahuje výskyt padající na výjimku', () => {
    const overrides = [{ activityId: 'TEST_keramika', allowOnHolidays: true }];
    const ics = generateOpts({ overrides, mode: 'expanded' });
    expect(ics).toContain('20260907T150000');
  });
});
