import { describe, expect, it } from 'vitest';
import {
  buildSingleChildExportPayload,
  buildChildMergeSlice,
  canonicalize,
  canonicalizeChildSlice,
  sameCanonical,
  mergeSingleChildImport,
  type Child,
  type Enrollment,
  type CustomEntry,
} from '../src/index.js';
import { TEST_CATALOG, TEST_CHILD, makeSchedule } from './fixtures/catalog.js';

const TEST_CHILD2: Child = {
  id: 'TEST_child2',
  name: 'TEST Jonda',
  age: 11,
  interests: [],
  availability: [],
  schoolEndByWeekday: {},
};

const enrollKeramika: Enrollment = {
  id: 'e_ker',
  childId: TEST_CHILD.id,
  activityId: 'TEST_keramika',
  sessionGroupId: 'TEST_keramika_po',
  status: 'selected',
  pinned: false,
};

const enrollFlorbalChild2: Enrollment = {
  id: 'e_flor2',
  childId: TEST_CHILD2.id,
  activityId: 'TEST_florbal',
  sessionGroupId: 'TEST_florbal_posT',
  status: 'selected',
  pinned: false,
};

function baseState() {
  return {
    schemaVersion: 10 as const,
    revision: 0,
    children: [TEST_CHILD, TEST_CHILD2],
    schedules: [makeSchedule({ enrollments: [enrollKeramika, enrollFlorbalChild2] })],
    activeScheduleId: 'TEST_sch',
    constraints: [],
    overrides: [],
    sessionOverrides: [],
    schoolYear: { start: '2026-09-01', end: '2027-06-30' },
    districtCode: 'TEST_CZ0000',
  };
}

describe('buildSingleChildExportPayload (FR-4)', () => {
  it('obsahuje jen filtrovaná data vybraného dítěte, ne zápisy druhého dítěte', () => {
    const state = baseState();
    const payload = buildSingleChildExportPayload(
      TEST_CHILD,
      state.schedules[0]!,
      TEST_CATALOG,
      state.overrides,
      state.sessionOverrides,
    );
    expect(payload.child.id).toBe(TEST_CHILD.id);
    expect(payload.enrollments).toEqual([enrollKeramika]);
    expect(payload.enrollments.some((e) => e.childId === TEST_CHILD2.id)).toBe(false);
  });
});

describe('mergeSingleChildImport (FR-5/FR-7/FR-8)', () => {
  it('neznámé childId nabídne přidání jako nové dítě', () => {
    const state = baseState();
    const newChild: Child = { ...TEST_CHILD2, id: 'TEST_child3', name: 'TEST Nové' };
    const payload = {
      child: newChild,
      enrollments: [],
      customEntries: [],
      overrides: [],
      sessionOverrides: [],
    };
    const result = mergeSingleChildImport(state, payload, TEST_CATALOG);
    expect(result.resolution.kind).toBe('new-child');
    expect(result.nextState.children.some((c) => c.id === 'TEST_child3')).toBe(true);
  });

  it('existující childId s jiným jménem vyžádá potvrzení (srážka dvou child-1)', () => {
    const state = baseState();
    const payload = {
      child: { ...TEST_CHILD, name: 'TEST Jiné jméno' },
      enrollments: [enrollKeramika],
      customEntries: [],
      overrides: [],
      sessionOverrides: [],
    };
    const result = mergeSingleChildImport(state, payload, TEST_CATALOG);
    expect(result.resolution).toEqual({
      kind: 'name-mismatch',
      targetName: TEST_CHILD.name,
      sourceName: 'TEST Jiné jméno',
    });
  });

  it('shodné jméno a shodný obsah mergne TICHO (opakovaný import je no-op)', () => {
    const state = baseState();
    const payload = {
      child: TEST_CHILD,
      enrollments: [enrollKeramika],
      customEntries: [],
      overrides: [],
      sessionOverrides: [],
    };
    const result = mergeSingleChildImport(state, payload, TEST_CATALOG);
    expect(result.resolution).toEqual({ kind: 'silent' });
  });

  it('shodné jméno, ale odlišný obsah vyžádá potvrzení', () => {
    const state = baseState();
    const payload = {
      child: TEST_CHILD,
      enrollments: [], // cíl má enrollKeramika, import žádný → liší se
      customEntries: [],
      overrides: [],
      sessionOverrides: [],
    };
    const result = mergeSingleChildImport(state, payload, TEST_CATALOG);
    expect(result.resolution).toEqual({ kind: 'content-differs' });
  });

  it('sama vyšší PlannerState.revision cíle BEZ obsahového rozdílu potvrzení nevyvolá', () => {
    const state = { ...baseState(), revision: 42 };
    const payload = {
      child: TEST_CHILD,
      enrollments: [enrollKeramika],
      customEntries: [],
      overrides: [],
      sessionOverrides: [],
    };
    const result = mergeSingleChildImport(state, payload, TEST_CATALOG);
    expect(result.resolution).toEqual({ kind: 'silent' });
  });

  it('zápis na smazanou katalogovou položku se přeskočí s varováním (FR-7)', () => {
    const state = baseState();
    const orphan: Enrollment = {
      id: 'e_orphan',
      childId: TEST_CHILD.id,
      activityId: 'TEST_neexistuje',
      sessionGroupId: 'TEST_neexistuje_po',
      status: 'selected',
      pinned: false,
    };
    const payload = {
      child: TEST_CHILD,
      enrollments: [enrollKeramika, orphan],
      customEntries: [],
      overrides: [],
      sessionOverrides: [],
    };
    const result = mergeSingleChildImport(state, payload, TEST_CATALOG);
    expect(result.skipped).toEqual([
      { kind: 'enrollment', id: 'e_orphan', reason: expect.any(String) },
    ]);
    const merged = result.nextState.schedules[0]!.enrollments.filter(
      (e) => e.childId === TEST_CHILD.id,
    );
    expect(merged.map((e) => e.id)).toEqual(['e_ker']);
  });
});

describe('canonicalize / sameCanonical (FR-8) — necitlivé na pořadí', () => {
  it('top-level pole (enrollments) v jiném pořadí je kanonicky shodné', () => {
    const a = { enrollments: [enrollKeramika, enrollFlorbalChild2] };
    const b = { enrollments: [enrollFlorbalChild2, enrollKeramika] };
    expect(sameCanonical(a, b)).toBe(true);
  });

  it('vnořené CustomEntry.sessions v jiném pořadí je kanonicky shodné', () => {
    const sessionObjs: Record<'s1' | 's2', CustomEntry['sessions'][number]> = {
      s1: { id: 's1', weekday: 1, startMinutes: 900, endMinutes: 960, validFrom: '2026-09-01', validTo: '2027-06-30' },
      s2: { id: 's2', weekday: 3, startMinutes: 800, endMinutes: 840, validFrom: '2026-09-01', validTo: '2027-06-30' },
    };
    const entry = (order: ('s1' | 's2')[]): CustomEntry => ({
      id: 'ce1',
      childId: TEST_CHILD.id,
      name: 'TEST vlastní',
      kind: 'other',
      sessions: order.map((id) => sessionObjs[id]),
    });
    const a = { customEntries: [entry(['s1', 's2'])] };
    const b = { customEntries: [entry(['s2', 's1'])] };
    expect(sameCanonical(a, b)).toBe(true);
  });

  it('Enrollment.sessionIds (pole primitiv bez .id) v jiném pořadí je kanonicky shodné', () => {
    const a = { sessionIds: ['s1', 's2', 's3'] };
    const b = { sessionIds: ['s3', 's1', 's2'] };
    expect(sameCanonical(a, b)).toBe(true);
    // nesmí spadnout na .id (primitiva nemají) — implicitně ověřeno tím, že test neházel.
  });

  it('pole objektů BEZ id (Child.availability) v jiném pořadí je kanonicky shodné', () => {
    const a = {
      availability: [
        { weekday: 1, startMinutes: 900, endMinutes: 960 },
        { weekday: 3, startMinutes: 800, endMinutes: 840 },
      ],
    };
    const b = {
      availability: [
        { weekday: 3, startMinutes: 800, endMinutes: 840 },
        { weekday: 1, startMinutes: 900, endMinutes: 960 },
      ],
    };
    expect(sameCanonical(a, b)).toBe(true);
  });

  it('opravdu ODLIŠNÝ obsah kanonicky odlišný zůstává (canonicalize nezakrývá reálné rozdíly)', () => {
    const a = { sessionIds: ['s1', 's2'] };
    const b = { sessionIds: ['s1', 's3'] };
    expect(sameCanonical(a, b)).toBe(false);
  });

  it('necitlivé na pořadí klíčů objektu (ne JSON.stringify rovnost)', () => {
    const a = { x: 1, y: 2 };
    const b = { y: 2, x: 1 };
    expect(sameCanonical(a, b)).toBe(true);
  });

  it('obecný test: náhodně vybrané pole KDEKOLI ve struktuře přeuspořádané zůstává kanonicky shodné', () => {
    // Ruční generátor (bez fast-check závislosti) — několik nezávislých permutací
    // stejné vnořené struktury, ne jen jeden ručně vybraný případ.
    type Nested = {
      enrollments: Enrollment[];
      customEntries: CustomEntry[];
      interests: string[];
      availability: { weekday: number; startMinutes: number; endMinutes: number }[];
    };
    const sessionObjs: Record<'s1' | 's2', CustomEntry['sessions'][number]> = {
      s1: { id: 's1', weekday: 1, startMinutes: 900, endMinutes: 960, validFrom: '2026-09-01', validTo: '2027-06-30' },
      s2: { id: 's2', weekday: 3, startMinutes: 800, endMinutes: 840, validFrom: '2026-09-01', validTo: '2027-06-30' },
    };
    const availabilityObjs: Record<number, { weekday: number; startMinutes: number; endMinutes: number }> = {
      1: { weekday: 1, startMinutes: 800, endMinutes: 840 },
      2: { weekday: 2, startMinutes: 810, endMinutes: 850 },
      3: { weekday: 3, startMinutes: 820, endMinutes: 860 },
    };
    const build = (
      enrollOrder: Enrollment[],
      sessionOrder: ('s1' | 's2')[],
      interestOrder: string[],
      availabilityOrder: number[],
    ): Nested => ({
      enrollments: enrollOrder,
      customEntries: [
        {
          id: 'ce1',
          childId: TEST_CHILD.id,
          name: 'x',
          kind: 'other',
          sessions: sessionOrder.map((id) => sessionObjs[id]),
        },
      ],
      interests: interestOrder,
      availability: availabilityOrder.map((weekday) => availabilityObjs[weekday]!),
    });

    const base = build(
      [enrollKeramika, enrollFlorbalChild2],
      ['s1', 's2'],
      ['sport', 'music', 'art'],
      [1, 2, 3],
    );
    const permutations: Nested[] = [
      build([enrollFlorbalChild2, enrollKeramika], ['s1', 's2'], ['sport', 'music', 'art'], [1, 2, 3]),
      build([enrollKeramika, enrollFlorbalChild2], ['s2', 's1'], ['sport', 'music', 'art'], [1, 2, 3]),
      build([enrollKeramika, enrollFlorbalChild2], ['s1', 's2'], ['music', 'art', 'sport'], [1, 2, 3]),
      build([enrollKeramika, enrollFlorbalChild2], ['s1', 's2'], ['sport', 'music', 'art'], [3, 1, 2]),
      build([enrollFlorbalChild2, enrollKeramika], ['s2', 's1'], ['art', 'sport', 'music'], [2, 3, 1]),
    ];
    for (const permuted of permutations) {
      expect(sameCanonical(base, permuted)).toBe(true);
    }
  });
});

describe('buildChildMergeSlice + canonicalizeChildSlice', () => {
  it('zahrnuje jen per-dítě sessionOverrides, ne globální', () => {
    const state = baseState();
    const withOverrides = {
      ...state,
      sessionOverrides: [
        { sessionId: 'TEST_s_keramika_po', weekday: 2 as const, startMinutes: 900, endMinutes: 960 },
        {
          sessionId: 'TEST_s_keramika_po',
          childId: TEST_CHILD.id,
          weekday: 3 as const,
          startMinutes: 900,
          endMinutes: 960,
        },
      ],
    };
    const slice = buildChildMergeSlice(
      TEST_CHILD.id,
      withOverrides.schedules[0]!,
      withOverrides.sessionOverrides,
    );
    expect(slice.sessionOverrides).toHaveLength(1);
    expect(slice.sessionOverrides[0]!.childId).toBe(TEST_CHILD.id);
    // canonicalizeChildSlice je jen pojmenovaný alias nad canonicalize.
    expect(canonicalizeChildSlice(slice)).toEqual(canonicalize(slice));
  });
});
