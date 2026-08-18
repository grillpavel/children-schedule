import type {
  Catalog,
  Child,
  NamedSchedule,
  CalendarException,
} from '../../src/index.js';

/**
 * Zjevně fiktivní testovací data. Prefix TEST_ podle pravidla #1 —
 * nikdy nepředstírají skutečné poskytovatele, ceny ani adresy.
 */

export const TEST_SCHOOL_YEAR = { start: '2026-09-01', end: '2027-06-30' };
export const TEST_DISTRICT = 'TEST_CZ0000';

export const TEST_CATALOG: Catalog = {
  city: 'TEST_Město',
  providers: [
    {
      id: 'TEST_ddm',
      name: 'TEST Dům dětí',
      kind: 'ddm',
      address: {
        street: 'TEST Komenského 12',
        city: 'TEST_Město',
        lat: 50.0,
        lon: 15.0,
      },
      contact: { phone: '000 000 001' },
    },
    {
      id: 'TEST_klub',
      name: 'TEST Sportklub',
      kind: 'sport_club',
      address: {
        street: 'TEST Sportovní 3',
        city: 'TEST_Město',
        lat: 50.02,
        lon: 15.02,
      },
      contact: { phone: '000 000 002' },
    },
  ],
  activities: [
    {
      id: 'TEST_keramika',
      providerId: 'TEST_ddm',
      name: 'TEST Keramika',
      category: 'crafts',
      ageMin: 7,
      ageMax: 12,
      price: { amount: 1200, period: 'per_semester' },
      capacity: 10,
      lastVerifiedAt: '2026-08-01',
    },
    {
      id: 'TEST_florbal',
      providerId: 'TEST_klub',
      name: 'TEST Florbal',
      category: 'sport',
      ageMin: 8,
      ageMax: 15,
      price: { amount: 800, period: 'per_semester' },
      // kapacita schválně neuvedena → capacity_unknown
      lastVerifiedAt: '2026-08-01',
    },
    {
      // Dvě SAMOSTATNÉ skupiny stejné aktivity (na rozdíl od florbalu, kde je
      // Po+St v jedné skupině) — pro test, že se cena nepočítá 2× (BL-034/CHANGE-56).
      id: 'TEST_tanec',
      providerId: 'TEST_ddm',
      name: 'TEST Tanec',
      category: 'dance',
      ageMin: 6,
      ageMax: 14,
      price: { amount: 500, period: 'per_month' },
      lastVerifiedAt: '2026-08-01',
    },
  ],
  sessionGroups: [
    {
      id: 'TEST_keramika_po',
      activityId: 'TEST_keramika',
      sessions: [
        {
          id: 'TEST_s_keramika_po',
          groupId: 'TEST_keramika_po',
          weekday: 1,
          startMinutes: 900, // 15:00
          endMinutes: 960, // 16:00
          instructor: 'TEST Nováková',
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
      ],
    },
    {
      id: 'TEST_florbal_posT',
      activityId: 'TEST_florbal',
      sessions: [
        {
          id: 'TEST_s_florbal_po',
          groupId: 'TEST_florbal_posT',
          weekday: 1,
          startMinutes: 930, // 15:30 → koliduje s keramikou
          endMinutes: 990,
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
        {
          id: 'TEST_s_florbal_st',
          groupId: 'TEST_florbal_posT',
          weekday: 3,
          startMinutes: 960,
          endMinutes: 1020,
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
      ],
    },
    {
      id: 'TEST_tanec_po',
      activityId: 'TEST_tanec',
      sessions: [
        {
          id: 'TEST_s_tanec_po',
          groupId: 'TEST_tanec_po',
          weekday: 1,
          startMinutes: 1020, // 17:00
          endMinutes: 1080,
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
      ],
    },
    {
      id: 'TEST_tanec_st',
      activityId: 'TEST_tanec',
      sessions: [
        {
          id: 'TEST_s_tanec_st',
          groupId: 'TEST_tanec_st',
          weekday: 3,
          startMinutes: 1020, // 17:00
          endMinutes: 1080,
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
      ],
    },
  ],
};

export const TEST_CHILD: Child = {
  id: 'TEST_child',
  name: 'TEST Julinka',
  age: 9,
  interests: [],
  availability: [],
  schoolEndByWeekday: { '1': 840, '3': 840 }, // Po a St končí 14:00
};

export function makeSchedule(
  overrides: Partial<NamedSchedule> = {},
): NamedSchedule {
  return {
    id: 'TEST_sch',
    name: 'TEST Varianta',
    enrollments: [],
    customEntries: [],
    origin: 'manual',
    createdAt: '2026-08-07T00:00:00Z',
    ...overrides,
  };
}

export const TEST_EXCEPTIONS: CalendarException[] = [
  {
    date: '2026-10-28',
    reason: 'TEST Státní svátek',
    scope: 'national',
    source: 'TEST_zdroj',
  },
  {
    date: '2026-09-07', // první pondělní výskyt keramiky → posune DTSTART
    reason: 'TEST Ředitelské volno',
    scope: 'school',
    source: 'TEST_reditel',
  },
];
