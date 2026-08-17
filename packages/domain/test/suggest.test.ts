import { describe, it, expect } from 'vitest';
import {
  suggestVariantSwitches,
  type Catalog,
  type Conflict,
} from '../src/index.js';
import { makeSchedule } from './fixtures/catalog.js';

/** Fiktivní katalog: kroužek A má dvě varianty (Po koliduje, St volno), B je jen Po. */
const CAT: Catalog = {
  city: 'TEST_Město',
  providers: [
    {
      id: 'TEST_p',
      name: 'TEST Provider',
      kind: 'ddm',
      address: { street: 'TEST 1', city: 'TEST_Město' },
      contact: {},
    },
  ],
  activities: [
    {
      id: 'A',
      providerId: 'TEST_p',
      name: 'TEST A',
      category: 'sport',
      ageMin: 5,
      ageMax: 15,
      price: { amount: 100, period: 'per_month' },
      lastVerifiedAt: '2026-08-01',
    },
    {
      id: 'B',
      providerId: 'TEST_p',
      name: 'TEST B',
      category: 'sport',
      ageMin: 5,
      ageMax: 15,
      price: { amount: 100, period: 'per_month' },
      lastVerifiedAt: '2026-08-01',
    },
  ],
  sessionGroups: [
    {
      id: 'A_po',
      activityId: 'A',
      label: 'Po 15:30',
      sessions: [
        {
          id: 'a_po',
          groupId: 'A_po',
          weekday: 1,
          startMinutes: 930,
          endMinutes: 990,
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
      ],
    },
    {
      id: 'A_st',
      activityId: 'A',
      label: 'St 16:00',
      sessions: [
        {
          id: 'a_st',
          groupId: 'A_st',
          weekday: 3,
          startMinutes: 960,
          endMinutes: 1020,
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
      ],
    },
    {
      id: 'B_po',
      activityId: 'B',
      label: 'Po 15:00',
      sessions: [
        {
          id: 'b_po',
          groupId: 'B_po',
          weekday: 1,
          startMinutes: 900,
          endMinutes: 960,
          validFrom: '2026-09-01',
          validTo: '2027-06-30',
        },
      ],
    },
  ],
};

const CHILD = 'TEST_child';

const scheduleWithOverlap = makeSchedule({
  enrollments: [
    { id: 'e_a', childId: CHILD, activityId: 'A', sessionGroupId: 'A_po', status: 'selected', pinned: false },
    { id: 'e_b', childId: CHILD, activityId: 'B', sessionGroupId: 'B_po', status: 'selected', pinned: false },
  ],
});

const overlapConflict: Conflict = {
  kind: 'time_overlap',
  severity: 'hard',
  enrollmentIds: ['e_a', 'e_b'],
  message: 'TEST overlap',
};

describe('suggestVariantSwitches', () => {
  it('navrhne přepnutí kroužku A na bezkolizní variantu (St)', () => {
    const out = suggestVariantSwitches(CAT, scheduleWithOverlap, CHILD, overlapConflict);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      enrollmentId: 'e_a',
      activityId: 'A',
      fromGroupId: 'A_po',
      toGroupId: 'A_st',
      remainingOverlaps: 0,
    });
  });

  it('vrátí prázdné pole, když kroužek nemá jinou variantu', () => {
    // B má jen jednu variantu; konflikt jen mezi B a fixním A bez alternativ
    const catOnlyB: Catalog = {
      ...CAT,
      sessionGroups: CAT.sessionGroups.filter((g) => g.id === 'A_po' || g.id === 'B_po'),
    };
    const out = suggestVariantSwitches(catOnlyB, scheduleWithOverlap, CHILD, overlapConflict);
    expect(out).toEqual([]);
  });

  it('vrátí prázdné pole pro jiný druh konfliktu', () => {
    const ageConflict: Conflict = {
      kind: 'age_out_of_range',
      severity: 'hard',
      enrollmentIds: ['e_a'],
      message: 'TEST age',
    };
    expect(suggestVariantSwitches(CAT, scheduleWithOverlap, CHILD, ageConflict)).toEqual([]);
  });
});
