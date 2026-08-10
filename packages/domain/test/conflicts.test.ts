import { describe, expect, it } from 'vitest';
import { detectConflicts, type Enrollment } from '../src/index.js';
import {
  TEST_CATALOG,
  TEST_CHILD,
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

const enrollFlorbal: Enrollment = {
  id: 'e_flo',
  childId: 'TEST_child',
  activityId: 'TEST_florbal',
  sessionGroupId: 'TEST_florbal_posT',
  status: 'selected',
  pinned: false,
};

describe('detectConflicts', () => {
  it('H1 — detekuje časovou kolizi v pondělí (keramika × florbal)', () => {
    const report = detectConflicts({
      schedule: makeSchedule({ enrollments: [enrollKeramika, enrollFlorbal] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    const overlap = report.conflicts.filter((c) => c.kind === 'time_overlap');
    expect(overlap).toHaveLength(1);
    expect(overlap[0]!.severity).toBe('hard');
    expect(overlap[0]!.message).toContain('30 minut');
  });

  it('H2 — dítě mimo věkový rozsah', () => {
    const tooYoung = { ...TEST_CHILD, age: 6 };
    const report = detectConflicts({
      schedule: makeSchedule({ enrollments: [enrollKeramika] }),
      catalog: TEST_CATALOG,
      children: [tooYoung],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'age_out_of_range')).toBe(true);
  });

  it('H3 — kroužek začíná dřív, než končí vyučování', () => {
    const lateSchool = {
      ...TEST_CHILD,
      schoolEndByWeekday: { '1': 900 }, // Po končí 15:00, keramika taky 15:00
    };
    const report = detectConflicts({
      schedule: makeSchedule({ enrollments: [enrollKeramika] }),
      catalog: TEST_CATALOG,
      children: [lateSchool],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'school_not_finished')).toBe(
      true,
    );
  });

  it('H3 — neznámý konec vyučování se přeskočí, ne aproximuje', () => {
    const noSchool = { ...TEST_CHILD, schoolEndByWeekday: {} };
    const report = detectConflicts({
      schedule: makeSchedule({ enrollments: [enrollKeramika] }),
      catalog: TEST_CATALOG,
      children: [noSchool],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'school_not_finished')).toBe(
      false,
    );
    expect(
      report.skippedChecks.some((s) => s.check === 'H3_school_not_finished'),
    ).toBe(true);
  });

  it('H5 — termín mimo školní rok', () => {
    const report = detectConflicts({
      schedule: makeSchedule({ enrollments: [enrollKeramika] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: { start: '2030-09-01', end: '2031-06-30' },
    });
    expect(report.conflicts.some((c) => c.kind === 'constraint_violated')).toBe(
      true,
    );
  });

  it('capacity_unknown je jen měkká informace', () => {
    const report = detectConflicts({
      schedule: makeSchedule({ enrollments: [enrollFlorbal] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    const cap = report.conflicts.find((c) => c.kind === 'capacity_unknown');
    expect(cap?.severity).toBe('soft');
  });
});
