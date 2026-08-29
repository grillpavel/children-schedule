import { describe, expect, it } from 'vitest';
import { detectConflicts, previewGroupConflict, type CustomEntry, type Enrollment } from '../src/index.js';
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

describe('detectConflicts — H9 travel_infeasible (FR-8, design_review_58.md)', () => {
  const customA: CustomEntry = {
    id: 'ce_a',
    childId: 'TEST_child',
    name: 'TEST Kroužek A',
    kind: 'other',
    location: { street: 'TEST Ulice A', city: 'TEST_Město', lat: 50.0, lon: 15.0 },
    sessions: [
      { id: 'ce_a_s', weekday: 1, startMinutes: 960, endMinutes: 1020, validFrom: TEST_SCHOOL_YEAR.start, validTo: TEST_SCHOOL_YEAR.end },
    ],
  };
  const customBTight: CustomEntry = {
    id: 'ce_b',
    childId: 'TEST_child',
    name: 'TEST Kroužek B',
    kind: 'other',
    location: { street: 'TEST Ulice B', city: 'TEST_Město', lat: 50.02, lon: 15.02 },
    sessions: [
      { id: 'ce_b_s', weekday: 1, startMinutes: 1025, endMinutes: 1085, validFrom: TEST_SCHOOL_YEAR.start, validTo: TEST_SCHOOL_YEAR.end },
    ],
  };

  it('různá místa, mezera 5 min < rezerva 15 min → travel_infeasible (soft)', () => {
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [customA, customBTight] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
      options: { transferBufferMinutes: 15 },
    });
    const travel = report.conflicts.filter((c) => c.kind === 'travel_infeasible');
    expect(travel).toHaveLength(1);
    expect(travel[0]!.severity).toBe('soft');
  });

  it('stejné místo → bez kolize i s krátkou mezerou', () => {
    const sameLoc: CustomEntry = { ...customBTight, location: customA.location };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [customA, sameLoc] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
      options: { transferBufferMinutes: 15 },
    });
    expect(report.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(false);
  });

  it('dostatečná mezera i u různých míst → bez kolize', () => {
    const later: CustomEntry = {
      ...customBTight,
      sessions: [{ ...customBTight.sessions[0]!, startMinutes: 1200, endMinutes: 1260 }],
    };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [customA, later] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
      options: { transferBufferMinutes: 15 },
    });
    expect(report.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(false);
  });

  it('chybějící adresa → přeskočeno (skippedChecks), ne aproximováno', () => {
    const noLoc: CustomEntry = { ...customBTight, location: undefined };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [customA, noLoc] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(false);
    expect(report.skippedChecks.some((s) => s.check === 'H9_tight_transfer')).toBe(true);
  });

  it('přímý časový překryv zůstává time_overlap (hard), ne travel_infeasible', () => {
    const overlapping: CustomEntry = {
      ...customBTight,
      sessions: [{ ...customBTight.sessions[0]!, startMinutes: 1000, endMinutes: 1060 }],
    };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [customA, overlapping] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
      options: { transferBufferMinutes: 15 },
    });
    expect(report.conflicts.some((c) => c.kind === 'time_overlap')).toBe(true);
    expect(report.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(false);
  });
});

describe('detectConflicts — H9 per-dítě travelBufferMinutes/travelMode (BL-038, design_review_67.md)', () => {
  const customA: CustomEntry = {
    id: 'ce_a2',
    childId: 'TEST_child',
    name: 'TEST Kroužek A2',
    kind: 'other',
    location: { street: 'TEST Ulice A', city: 'TEST_Město', lat: 50.0, lon: 15.0 },
    sessions: [
      { id: 'ce_a2_s', weekday: 1, startMinutes: 960, endMinutes: 1020, validFrom: TEST_SCHOOL_YEAR.start, validTo: TEST_SCHOOL_YEAR.end },
    ],
  };
  const customBTight: CustomEntry = {
    id: 'ce_b2',
    childId: 'TEST_child',
    name: 'TEST Kroužek B2',
    kind: 'other',
    location: { street: 'TEST Ulice B', city: 'TEST_Město', lat: 50.02, lon: 15.02 },
    sessions: [
      { id: 'ce_b2_s', weekday: 1, startMinutes: 1025, endMinutes: 1085, validFrom: TEST_SCHOOL_YEAR.start, validTo: TEST_SCHOOL_YEAR.end },
    ],
  };

  it('travelMode "walk" zpřísní požadovaný čas oproti výchozímu "car"', () => {
    const laterByWalk: CustomEntry = {
      ...customBTight,
      sessions: [{ ...customBTight.sessions[0]!, startMinutes: 1050, endMinutes: 1110 }],
    };
    const schedule = makeSchedule({ customEntries: [customA, laterByWalk] });

    const byCar = detectConflicts({
      schedule,
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(byCar.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(false);

    const byWalk = detectConflicts({
      schedule,
      catalog: TEST_CATALOG,
      children: [{ ...TEST_CHILD, travelMode: 'walk' }],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(byWalk.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(true);
  });

  it('travelBufferMinutes přepíše globální výchozí rezervu, když chybí souřadnice', () => {
    const noCoordsA: CustomEntry = {
      ...customA,
      location: { street: 'TEST Ulice A', city: 'TEST_Město' },
    };
    const noCoordsB: CustomEntry = {
      ...customBTight,
      location: { street: 'TEST Ulice B', city: 'TEST_Jiné' },
      sessions: [{ ...customBTight.sessions[0]!, startMinutes: 1028, endMinutes: 1088 }],
    };
    const schedule = makeSchedule({ customEntries: [noCoordsA, noCoordsB] });

    const defaultBuffer = detectConflicts({
      schedule,
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(defaultBuffer.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(true);

    const shorterBuffer = detectConflicts({
      schedule,
      catalog: TEST_CATALOG,
      children: [{ ...TEST_CHILD, travelBufferMinutes: 5 }],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(shorterBuffer.conflicts.some((c) => c.kind === 'travel_infeasible')).toBe(false);
  });
});

describe('detectConflicts — H10 family (BL-041, design_review_65/66/85.md)', () => {
  const TEST_CHILD_2 = { ...TEST_CHILD, id: 'TEST_child_2', name: 'TEST Matýsek' };

  const childACustom: CustomEntry = {
    id: 'ce_fam_a',
    childId: 'TEST_child',
    name: 'TEST Kroužek dítěte A',
    kind: 'other',
    location: { street: 'TEST Ulice A', city: 'TEST_Město' },
    sessions: [
      { id: 'ce_fam_a_s', weekday: 1, startMinutes: 960, endMinutes: 1020, validFrom: TEST_SCHOOL_YEAR.start, validTo: TEST_SCHOOL_YEAR.end },
    ],
  };
  const childBCustom: CustomEntry = {
    id: 'ce_fam_b',
    childId: 'TEST_child_2',
    name: 'TEST Kroužek dítěte B',
    kind: 'other',
    location: { street: 'TEST Ulice B', city: 'TEST_Jiné' },
    sessions: [
      { id: 'ce_fam_b_s', weekday: 1, startMinutes: 990, endMinutes: 1050, validFrom: TEST_SCHOOL_YEAR.start, validTo: TEST_SCHOOL_YEAR.end },
    ],
  };

  it('dvě děti, překryv, různá místa → family (hard)', () => {
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [childACustom, childBCustom] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD, TEST_CHILD_2],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    const family = report.conflicts.filter((c) => c.kind === 'family');
    expect(family).toHaveLength(1);
    expect(family[0]!.severity).toBe('hard');
    expect(family[0]!.message).toContain('TEST Julinka');
    expect(family[0]!.message).toContain('TEST Matýsek');
  });

  it('stejné dítě, překryv → time_overlap, ne family', () => {
    const sameChildB: CustomEntry = { ...childBCustom, childId: 'TEST_child' };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [childACustom, sameChildB] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'family')).toBe(false);
    expect(report.conflicts.some((c) => c.kind === 'time_overlap')).toBe(true);
  });

  it('stejné místo → bez family kolize', () => {
    const sameLoc: CustomEntry = { ...childBCustom, location: childACustom.location };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [childACustom, sameLoc] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD, TEST_CHILD_2],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'family')).toBe(false);
  });

  it('bez časového překryvu → bez family kolize', () => {
    const later: CustomEntry = {
      ...childBCustom,
      sessions: [{ ...childBCustom.sessions[0]!, startMinutes: 1200, endMinutes: 1260 }],
    };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [childACustom, later] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD, TEST_CHILD_2],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'family')).toBe(false);
  });

  it('chybějící adresa → přeskočeno (skippedChecks), ne aproximováno', () => {
    const noLoc: CustomEntry = { ...childBCustom, location: undefined };
    const report = detectConflicts({
      schedule: makeSchedule({ customEntries: [childACustom, noLoc] }),
      catalog: TEST_CATALOG,
      children: [TEST_CHILD, TEST_CHILD_2],
      schoolYear: TEST_SCHOOL_YEAR,
    });
    expect(report.conflicts.some((c) => c.kind === 'family')).toBe(false);
    expect(report.skippedChecks.some((s) => s.check === 'H10_family_overlap')).toBe(true);
  });
});

describe('previewGroupConflict (BL-039, design_review_67.md)', () => {
  const baseInput = {
    catalog: TEST_CATALOG,
    children: [TEST_CHILD],
    schoolYear: TEST_SCHOOL_YEAR,
  };

  it('prázdný rozvrh → žádný konflikt (severity null)', () => {
    const preview = previewGroupConflict(
      { ...baseInput, schedule: makeSchedule() },
      'TEST_child',
      'TEST_keramika',
      'TEST_keramika_po',
    );
    expect(preview.severity).toBeNull();
    expect(preview.message).toBeUndefined();
  });

  it('přidání by se přímo časově překrývalo → hard konflikt se jménem obou kroužků', () => {
    const withKeramika = makeSchedule({ enrollments: [enrollKeramika] });
    const preview = previewGroupConflict(
      { ...baseInput, schedule: withKeramika },
      'TEST_child',
      'TEST_florbal',
      'TEST_florbal_posT',
    );
    expect(preview.severity).toBe('hard');
    expect(preview.message).toContain('TEST Keramika');
    expect(preview.message).toContain('TEST Florbal');
  });

  it('přidání do prázdného slotu bez časové/logistické kolize → severity null i když chybí kapacita', () => {
    // TEST_tanec nemá v katalogu uvedenou kapacitu (stejně jako TEST_florbal), ale
    // capacity_unknown je záměrně VYNECHÁNO z náhledu — je to gap v datech katalogu,
    // ne skutečná kolize v rozvrhu, jinak by se takto označila skoro každá aktivita.
    const withKeramika = makeSchedule({ enrollments: [enrollKeramika] });
    const preview = previewGroupConflict(
      { ...baseInput, schedule: withKeramika },
      'TEST_child',
      'TEST_tanec',
      'TEST_tanec_po',
    );
    expect(preview.severity).toBeNull();
    expect(preview.message).toBeUndefined();
  });

  it('rozvrh se skutečně nezmění (jen náhled, ne zápis)', () => {
    const schedule = makeSchedule();
    previewGroupConflict({ ...baseInput, schedule }, 'TEST_child', 'TEST_keramika', 'TEST_keramika_po');
    expect(schedule.enrollments).toHaveLength(0);
  });

  it('neplatná kombinace activityId/sessionGroupId → severity null (bez chyby)', () => {
    const preview = previewGroupConflict(
      { ...baseInput, schedule: makeSchedule() },
      'TEST_child',
      'TEST_keramika',
      'TEST_florbal_posT',
    );
    expect(preview.severity).toBeNull();
  });
});
