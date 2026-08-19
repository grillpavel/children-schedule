import {
  goodFriday,
  easterMonday,
  type CalendarException,
  type Catalog,
  type Child,
  type PlannerState,
} from '@krouzky/domain';

/**
 * UKÁZKOVÁ (fiktivní) data, aby aplikace fungovala hned po spuštění.
 *
 * Podle pravidla #1 se skutečná jména poskytovatelů, ceny, adresy ani konkrétní
 * datumy státních svátků a prázdnin NEVYMÝŠLEJÍ. Tato data jsou zjevně fiktivní
 * (prefix „Ukázka") a slouží jen k předvedení UI. Reálný katalog patří do
 * `packages/domain/data/` a plní ho člověk z ověřených zdrojů.
 *
 * Jediné datumy počítané v kódu jsou pohyblivé velikonoční svátky (Computus) —
 * to je deterministický výpočet, nikoli odhad, a je přípustný.
 */

const SCHOOL_YEAR = { start: '2026-09-01', end: '2027-06-30' };

export const DEMO_CATALOG: Catalog = {
  city: 'Ukázkové město',
  providers: [
    {
      id: 'demo-ddm',
      name: 'Ukázka DDM',
      kind: 'ddm',
      address: { street: 'Ukázková 1', city: 'Ukázkové město', lat: 50.0, lon: 15.0 },
      contact: { phone: '000 000 000', personName: 'Ukázka' },
    },
    {
      id: 'demo-klub',
      name: 'Ukázka Sportklub',
      kind: 'sport_club',
      address: { street: 'Ukázková 2', city: 'Ukázkové město', lat: 50.03, lon: 15.02 },
      contact: { phone: '000 000 000' },
    },
    {
      id: 'demo-zus',
      name: 'Ukázka ZUŠ',
      kind: 'zus',
      address: { street: 'Ukázková 3', city: 'Ukázkové město', lat: 50.01, lon: 15.01 },
      contact: { phone: '000 000 000' },
    },
  ],
  activities: [
    {
      id: 'demo-keramika',
      providerId: 'demo-ddm',
      name: 'Keramika (ukázka)',
      category: 'crafts',
      ageMin: 7,
      ageMax: 12,
      price: { amount: 1200, period: 'per_semester' },
      capacity: 10,
      lastVerifiedAt: SCHOOL_YEAR.start,
      description: 'Ukázkový kroužek pro předvedení aplikace.',
    },
    {
      id: 'demo-florbal',
      providerId: 'demo-klub',
      name: 'Florbal (ukázka)',
      category: 'sport',
      ageMin: 8,
      ageMax: 15,
      price: { amount: 900, period: 'per_semester' },
      lastVerifiedAt: SCHOOL_YEAR.start,
    },
    {
      id: 'demo-plavani',
      providerId: 'demo-klub',
      name: 'Plavání (ukázka)',
      category: 'sport',
      ageMin: 6,
      ageMax: 14,
      price: { amount: 300, period: 'per_month' },
      lastVerifiedAt: SCHOOL_YEAR.start,
    },
    {
      id: 'demo-kytara',
      providerId: 'demo-zus',
      name: 'Kytara (ukázka)',
      category: 'music',
      ageMin: 8,
      ageMax: 18,
      price: { amount: 2000, period: 'per_semester' },
      capacity: 6,
      lastVerifiedAt: SCHOOL_YEAR.start,
    },
  ],
  sessionGroups: [
    // Keramika: tři alternativní varianty docházky (vybírá se jedna)
    {
      id: 'demo-keramika-po',
      activityId: 'demo-keramika',
      label: 'Pondělky',
      sessions: [
        session('demo-keramika-po', 1, 900, 960, SCHOOL_YEAR, 'Ukázka L.'),
      ],
    },
    {
      id: 'demo-keramika-ut',
      activityId: 'demo-keramika',
      label: 'Úterky',
      sessions: [
        session('demo-keramika-ut', 2, 960, 1020, SCHOOL_YEAR, 'Ukázka L.'),
      ],
    },
    {
      id: 'demo-keramika-ct',
      activityId: 'demo-keramika',
      label: 'Čtvrtky',
      sessions: [
        session('demo-keramika-ct', 4, 990, 1050, SCHOOL_YEAR, 'Ukázka L.'),
      ],
    },
    // Florbal: jedna skupina, dva povinné tréninky týdně (Po + St)
    {
      id: 'demo-florbal-posT',
      activityId: 'demo-florbal',
      sessions: [
        session('demo-florbal-po', 1, 960, 1020, SCHOOL_YEAR),
        session('demo-florbal-st', 3, 960, 1020, SCHOOL_YEAR),
      ],
    },
    // Plavání: dvě alternativní dvojice termínů
    {
      id: 'demo-plavani-a',
      activityId: 'demo-plavani',
      label: 'Po + St',
      sessions: [
        session('demo-plavani-a-po', 1, 1020, 1080, SCHOOL_YEAR),
        session('demo-plavani-a-st', 3, 1020, 1080, SCHOOL_YEAR),
      ],
    },
    {
      id: 'demo-plavani-b',
      activityId: 'demo-plavani',
      label: 'Út + Čt',
      sessions: [
        session('demo-plavani-b-ut', 2, 1020, 1080, SCHOOL_YEAR),
        session('demo-plavani-b-ct', 4, 1020, 1080, SCHOOL_YEAR),
      ],
    },
    // Kytara: jedna skupina, jeden termín
    {
      id: 'demo-kytara-pa',
      activityId: 'demo-kytara',
      sessions: [
        session('demo-kytara-pa', 5, 900, 960, SCHOOL_YEAR, 'Ukázka U.'),
      ],
    },
  ],
};

function session(
  groupId: string,
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  startMinutes: number,
  endMinutes: number,
  year: { start: string; end: string },
  instructor?: string,
) {
  return {
    id: `${groupId}-s`,
    groupId,
    weekday,
    startMinutes,
    endMinutes,
    validFrom: year.start,
    validTo: year.end,
    ...(instructor ? { instructor } : {}),
  };
}

/**
 * Ukázkové výjimky. Pohyblivé velikonoční svátky se dopočítají (Computus).
 * Ostatní jsou zjevně fiktivní ukázky — reálné datumy patří z MŠMT/zákona.
 */
export function buildDemoExceptions(): CalendarException[] {
  const years = [2026, 2027];
  const easter: CalendarException[] = [];
  for (const y of years) {
    for (const date of [goodFriday(y), easterMonday(y)]) {
      if (date >= SCHOOL_YEAR.start && date <= SCHOOL_YEAR.end) {
        easter.push({
          date,
          reason: 'Velikonoce (dopočítáno)',
          scope: 'national',
          source: 'Computus (gregoriánský)',
        });
      }
    }
  }
  return [
    ...easter,
    {
      date: '2026-10-29',
      reason: 'Ukázkové ředitelské volno',
      scope: 'school',
      source: 'UKÁZKA — nahraďte skutečným rozhodnutím ředitele',
    },
  ];
}

export const DEMO_CHILD: Child = {
  id: 'demo-child',
  name: 'Julinka',
  age: 9,
  interests: [],
  availability: [],
  schoolEndByWeekday: { '1': 840, '2': 840, '3': 840, '4': 840, '5': 780 },
  schoolAddress: { street: 'Ukázková škola', city: 'Ukázkové město', lat: 50.005, lon: 15.005 },
};

export function buildInitialState(): PlannerState {
  return {
    schemaVersion: 8,
    children: [DEMO_CHILD],
    schedules: [
      {
        id: 'sch-a',
        name: 'Varianta A',
        enrollments: [],
        customEntries: [],
        origin: 'manual',
        createdAt: `${SCHOOL_YEAR.start}T00:00:00Z`,
      },
    ],
    activeScheduleId: 'sch-a',
    constraints: [],
    overrides: [],
    sessionOverrides: [],
    schoolYear: SCHOOL_YEAR,
    districtCode: 'DEMO',
  };
}
