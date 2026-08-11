import { describe, it, expect } from 'vitest';
import {
  activitySignature,
  overrideSourceChanged,
  type Activity,
  type ActivityOverride,
} from '../src/index.js';

const activity: Pick<Activity, 'name' | 'price'> = {
  name: 'TEST Kroužek',
  price: { amount: 1000, period: 'per_year' },
};

describe('override source drift', () => {
  it('activitySignature je stabilní pro stejné hodnoty', () => {
    expect(activitySignature(activity)).toBe(activitySignature({ ...activity }));
  });

  it('overrideSourceChanged je false bez baseSignature', () => {
    const o: Pick<ActivityOverride, 'baseSignature'> = {};
    expect(overrideSourceChanged(activity, o)).toBe(false);
  });

  it('overrideSourceChanged je false, když se zdroj neliší', () => {
    const o: Pick<ActivityOverride, 'baseSignature'> = {
      baseSignature: activitySignature(activity),
    };
    expect(overrideSourceChanged(activity, o)).toBe(false);
  });

  it('overrideSourceChanged je true, když se katalog změnil', () => {
    const o: Pick<ActivityOverride, 'baseSignature'> = {
      baseSignature: activitySignature({
        name: 'TEST Kroužek',
        price: { amount: 900, period: 'per_year' },
      }),
    };
    expect(overrideSourceChanged(activity, o)).toBe(true);
  });
});
