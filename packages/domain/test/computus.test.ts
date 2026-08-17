import { describe, expect, it } from 'vitest';
import {
  easterSundayIso,
  goodFriday,
  easterMonday,
} from '../src/index.js';

// Golden data — známá data Velikonoční neděle (gregoriánský kalendář).
const KNOWN_EASTER: Record<number, string> = {
  2000: '2000-04-23',
  2001: '2001-04-15',
  2020: '2020-04-12',
  2021: '2021-04-04',
  2022: '2022-04-17',
  2023: '2023-04-09',
  2024: '2024-03-31',
  2025: '2025-04-20',
  2026: '2026-04-05',
  2027: '2027-03-28',
};

describe('computus', () => {
  it.each(Object.entries(KNOWN_EASTER))(
    'Velikonoční neděle %s',
    (year, iso) => {
      expect(easterSundayIso(Number(year))).toBe(iso);
    },
  );

  it('Velký pátek 2026 je 2 dny před nedělí', () => {
    expect(goodFriday(2026)).toBe('2026-04-03');
  });

  it('Velikonoční pondělí 2026 je den po neděli', () => {
    expect(easterMonday(2026)).toBe('2026-04-06');
  });
});
