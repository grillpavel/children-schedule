import { describe, it, expect } from 'vitest';
import { scheduleSummary } from '../src/index.js';
import { TEST_CATALOG, TEST_CHILD, makeSchedule } from './fixtures/catalog.js';

describe('scheduleSummary.seasonMonths', () => {
  it('je 0 pro prázdný rozvrh', () => {
    const s = scheduleSummary(makeSchedule(), TEST_CATALOG, TEST_CHILD.id);
    expect(s.seasonMonths).toBe(0);
  });

  it('odvodí délku sezony z platnosti termínů (09/2026–06/2027 = 10 měsíců)', () => {
    const schedule = makeSchedule({
      enrollments: [
        {
          id: 'e1',
          childId: TEST_CHILD.id,
          activityId: 'TEST_keramika',
          sessionGroupId: 'TEST_keramika_po',
          status: 'selected',
          pinned: false,
        },
      ],
    });
    const s = scheduleSummary(schedule, TEST_CATALOG, TEST_CHILD.id);
    expect(s.seasonMonths).toBe(10);
  });
});

describe('scheduleSummary.costByPeriod', () => {
  it('počítá cenu kroužku jednou, i když je dítě zapsáno do 2 skupin téže aktivity (2× týdně)', () => {
    const schedule = makeSchedule({
      enrollments: [
        {
          id: 'e1',
          childId: TEST_CHILD.id,
          activityId: 'TEST_tanec',
          sessionGroupId: 'TEST_tanec_po',
          status: 'selected',
          pinned: false,
        },
        {
          id: 'e2',
          childId: TEST_CHILD.id,
          activityId: 'TEST_tanec',
          sessionGroupId: 'TEST_tanec_st',
          status: 'selected',
          pinned: false,
        },
      ],
    });
    const s = scheduleSummary(schedule, TEST_CATALOG, TEST_CHILD.id);
    expect(s.costByPeriod).toEqual([{ period: 'per_month', amountCzk: 500 }]);
  });
});
