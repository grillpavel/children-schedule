import { describe, it, expect } from 'vitest';
import { upcomingDeadlines, type Catalog } from '../src/index.js';
import { TEST_CATALOG, TEST_CHILD, makeSchedule } from './fixtures/catalog.js';

const CAT_WITH_DEADLINE: Catalog = {
  ...TEST_CATALOG,
  activities: TEST_CATALOG.activities.map((a) =>
    a.id === 'TEST_keramika'
      ? { ...a, applicationDeadline: '2026-09-14' }
      : a,
  ),
};

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
    {
      id: 'e2',
      childId: TEST_CHILD.id,
      activityId: 'TEST_florbal',
      sessionGroupId: 'TEST_florbal_posT',
      status: 'selected',
      pinned: false,
    },
  ],
});

describe('upcomingDeadlines', () => {
  it('vrátí jen kroužky s uzávěrkou a spočítá dny do termínu', () => {
    const out = upcomingDeadlines(CAT_WITH_DEADLINE, schedule, TEST_CHILD.id, '2026-09-10');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      activityId: 'TEST_keramika',
      deadline: '2026-09-14',
      daysLeft: 4,
    });
  });

  it('po termínu je daysLeft záporné', () => {
    const out = upcomingDeadlines(CAT_WITH_DEADLINE, schedule, TEST_CHILD.id, '2026-09-20');
    expect(out[0]!.daysLeft).toBe(-6);
  });

  it('bez uzávěrek vrátí prázdné pole', () => {
    const out = upcomingDeadlines(TEST_CATALOG, schedule, TEST_CHILD.id, '2026-09-10');
    expect(out).toEqual([]);
  });
});
