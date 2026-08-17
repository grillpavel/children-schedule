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
