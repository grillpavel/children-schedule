import { describe, expect, it } from 'vitest';
import {
  applyDiff,
  isEmptyDiff,
  scheduleSummary,
  parsePlannerState,
  serializePlannerState,
  type Enrollment,
  type PlannerState,
} from '../src/index.js';
import {
  TEST_CATALOG,
  TEST_SCHOOL_YEAR,
  makeSchedule,
} from './fixtures/catalog.js';

const enrollKeramika: Enrollment = {
  id: 'e_ker',
  childId: 'TEST_child',
  activityId: 'TEST_keramika',
  sessionGroupId: 'TEST_keramika_po',
  status: 'selected',
  pinned: false,
};

describe('applyDiff', () => {
  it('nemutuje vstup a vrací nový rozvrh', () => {
    const base = makeSchedule();
    const next = applyDiff(base, { addEnrollments: [enrollKeramika] });
    expect(base.enrollments).toHaveLength(0);
    expect(next.enrollments).toHaveLength(1);
  });

  it('odebrání podle id funguje', () => {
    const base = makeSchedule({ enrollments: [enrollKeramika] });
    const next = applyDiff(base, { removeEnrollmentIds: ['e_ker'] });
    expect(next.enrollments).toHaveLength(0);
  });

  it('isEmptyDiff detekuje prázdný diff', () => {
    expect(isEmptyDiff({})).toBe(true);
    expect(isEmptyDiff({ addEnrollments: [enrollKeramika] })).toBe(false);
  });
});

describe('scheduleSummary', () => {
  it('spočítá počet aktivit a cenu podle období', () => {
    const schedule = makeSchedule({ enrollments: [enrollKeramika] });
    const summary = scheduleSummary(schedule, TEST_CATALOG, 'TEST_child');
    expect(summary.activityCount).toBe(1);
    expect(summary.costByPeriod).toEqual([
      { period: 'per_semester', amountCzk: 1200 },
    ]);
  });

  it('volné všední dny nezahrnují den s aktivitou', () => {
    const schedule = makeSchedule({ enrollments: [enrollKeramika] });
    const summary = scheduleSummary(schedule, TEST_CATALOG, 'TEST_child');
    expect(summary.freeWeekdays).not.toContain(1); // pondělí obsazené
    expect(summary.freeWeekdays).toContain(5); // pátek volný
  });
});

describe('state IO', () => {
  const state: PlannerState = {
    schemaVersion: 3,
    children: [
      { id: 'c', name: 'TEST Dítě', age: 9, schoolEndByWeekday: {} },
    ],
    schedules: [makeSchedule()],
    activeScheduleId: 'TEST_sch',
    constraints: [],
    overrides: [],
    schoolYear: TEST_SCHOOL_YEAR,
    districtCode: 'TEST_CZ0000',
  };

  it('serializace → parse je round-trip', () => {
    const json = serializePlannerState(state);
    const parsed = parsePlannerState(JSON.parse(json));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual(state);
  });

  it('odmítne neznámý schemaVersion', () => {
    const bad = parsePlannerState({ ...state, schemaVersion: 99 });
    expect(bad.ok).toBe(false);
  });

  it('migruje v1 (biweekly.parity) → v2 (everyWeeks: 2)', () => {
    const v1 = {
      ...state,
      schemaVersion: 1,
      schedules: [
        {
          ...makeSchedule(),
          customEntries: [
            {
              id: 'ce',
              childId: 'c',
              name: 'TEST vlastní',
              sessions: [
                {
                  id: 's',
                  weekday: 1,
                  startMinutes: 900,
                  endMinutes: 960,
                  validFrom: '2026-09-01',
                  validTo: '2027-06-30',
                  biweekly: { parity: 'even' },
                },
              ],
            },
          ],
        },
      ],
    };
    const parsed = parsePlannerState(v1);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.schemaVersion).toBe(3);
      expect(parsed.value.schedules[0]!.customEntries[0]!.sessions[0]!.everyWeeks).toBe(2);
    }
  });

  it('migruje v2 (bez overrides) → v3 (overrides: [])', () => {
    const { overrides: _drop, ...rest } = state;
    void _drop;
    const v2 = { ...rest, schemaVersion: 2 };
    const parsed = parsePlannerState(v2);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.schemaVersion).toBe(3);
      expect(parsed.value.overrides).toEqual([]);
    }
  });

  it('přepisy aktivit přežijí round-trip beze změny', () => {
    const withOverride: PlannerState = {
      ...state,
      overrides: [
        {
          activityId: 'TEST_keramika',
          name: 'TEST Přepis',
          address: { street: 'TEST Nová 5', city: 'TEST_Praha' },
          contactPhone: '111 222 333',
          price: { amount: 999, period: 'per_month' },
          colorCss: 'indianred',
        },
      ],
    };
    const parsed = parsePlannerState(
      JSON.parse(serializePlannerState(withOverride)),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual(withOverride);
  });
});
