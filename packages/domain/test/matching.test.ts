import { describe, expect, it } from 'vitest';
import {
  activityFit,
  buildRecommendations,
  type Child,
  type Enrollment,
} from '../src/index.js';
import { TEST_CATALOG, TEST_CHILD, makeSchedule } from './fixtures/catalog.js';

const TODAY = '2026-10-01';
const keramika = TEST_CATALOG.activities.find((a) => a.id === 'TEST_keramika')!;
const florbal = TEST_CATALOG.activities.find((a) => a.id === 'TEST_florbal')!;

const enrollKeramika: Enrollment = {
  id: 'e_ker',
  childId: 'TEST_child',
  activityId: 'TEST_keramika',
  sessionGroupId: 'TEST_keramika_po',
  status: 'selected',
  pinned: false,
};

function child(patch: Partial<Child> = {}): Child {
  return { ...TEST_CHILD, ...patch };
}

describe('activityFit', () => {
  it('věk uvnitř rozsahu → ok, mimo → ×', () => {
    const inRange = activityFit(keramika, child({ age: 9 }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(inRange.reasons.find((r) => r.key === 'age')!.ok).toBe(true);
    const out = activityFit(keramika, child({ age: 5 }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(out.reasons.find((r) => r.key === 'age')!.ok).toBe(false);
  });

  it('neznámý věk (undefined) je neutrální — kritérium se vynechá, nevrací se jako × (design_review_88.md)', () => {
    const unknown = activityFit(keramika, child({ age: undefined }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(unknown.reasons.find((r) => r.key === 'age')).toBeUndefined();
  });

  it('zájem: shoda → ok, jiný → ×, prázdné → neutrální (bez důvodu)', () => {
    const match = activityFit(keramika, child({ interests: ['crafts'] }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(match.reasons.find((r) => r.key === 'interest')!.ok).toBe(true);
    const miss = activityFit(keramika, child({ interests: ['sport'] }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(miss.reasons.find((r) => r.key === 'interest')!.ok).toBe(false);
    const neutral = activityFit(keramika, child({ interests: [] }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(neutral.reasons.some((r) => r.key === 'interest')).toBe(false);
  });

  it('dostupnost: uvnitř okna → ok, mimo → ×', () => {
    const inside = activityFit(
      keramika,
      child({ availability: [{ weekday: 1, startMinutes: 840, endMinutes: 1020 }] }),
      makeSchedule(),
      TEST_CATALOG,
      TODAY,
    );
    expect(inside.reasons.find((r) => r.key === 'availability')!.ok).toBe(true);
    const outside = activityFit(
      keramika,
      child({ availability: [{ weekday: 2, startMinutes: 840, endMinutes: 1020 }] }),
      makeSchedule(),
      TEST_CATALOG,
      TODAY,
    );
    expect(outside.reasons.find((r) => r.key === 'availability')!.ok).toBe(false);
  });

  it('kolize: překryv s existující docházkou → ×, jinak ok', () => {
    const withKeramika = makeSchedule({ enrollments: [enrollKeramika] });
    const clash = activityFit(florbal, child(), withKeramika, TEST_CATALOG, TODAY);
    expect(clash.reasons.find((r) => r.key === 'collision')!.ok).toBe(false);
    const free = activityFit(florbal, child(), makeSchedule(), TEST_CATALOG, TODAY);
    expect(free.reasons.find((r) => r.key === 'collision')!.ok).toBe(true);
  });

  it('rozpočet: pod limitem → ok, nad → ×', () => {
    // keramika 1200 Kč/pololetí → 240 Kč/měs.
    const ok = activityFit(keramika, child({ budgetMonthlyCzk: 300 }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(ok.reasons.find((r) => r.key === 'budget')!.ok).toBe(true);
    const over = activityFit(keramika, child({ budgetMonthlyCzk: 200 }), makeSchedule(), TEST_CATALOG, TODAY);
    expect(over.reasons.find((r) => r.key === 'budget')!.ok).toBe(false);
  });

  it('skóre je deterministické a v rozsahu 0..1', () => {
    const a = activityFit(keramika, child(), makeSchedule(), TEST_CATALOG, TODAY);
    const b = activityFit(keramika, child(), makeSchedule(), TEST_CATALOG, TODAY);
    expect(a.score).toBe(b.score);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(1);
  });

  it('důvody mají české popisky bez procent', () => {
    const fit = activityFit(
      keramika,
      child({ interests: ['crafts'], budgetMonthlyCzk: 300 }),
      makeSchedule(),
      TEST_CATALOG,
      TODAY,
    );
    const keys = fit.reasons.map((r) => r.key);
    expect(keys).toContain('age');
    expect(keys).toContain('interest');
    expect(keys).toContain('collision');
    expect(keys).toContain('budget');
    for (const r of fit.reasons) {
      expect(r.label).not.toContain('%');
      expect(r.label.length).toBeGreaterThan(0);
    }
  });
});

describe('buildRecommendations', () => {
  it('řadí stabilně (skóre desc, název asc) a vylučuje zapsané', () => {
    const all = buildRecommendations(child(), TEST_CATALOG, makeSchedule(), TODAY);
    expect(all.map((r) => r.activity.id)).toEqual(['TEST_florbal', 'TEST_keramika', 'TEST_tanec']);

    const afterEnroll = buildRecommendations(
      child(),
      TEST_CATALOG,
      makeSchedule({ enrollments: [enrollKeramika] }),
      TODAY,
    );
    expect(afterEnroll.map((r) => r.activity.id)).not.toContain('TEST_keramika');
  });

  it('limit ořízne počet výsledků', () => {
    const one = buildRecommendations(child(), TEST_CATALOG, makeSchedule(), TODAY, { limit: 1 });
    expect(one).toHaveLength(1);
  });

  it('excludeCategories vynechá kategorii', () => {
    const noSport = buildRecommendations(child(), TEST_CATALOG, makeSchedule(), TODAY, {
      excludeCategories: ['sport'],
    });
    expect(noSport.map((r) => r.activity.id)).not.toContain('TEST_florbal');
  });
});
