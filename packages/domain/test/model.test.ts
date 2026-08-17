import { describe, expect, it } from 'vitest';
import {
  travelMinutes,
  haversineKm,
  colorForActivity,
  hashFnv1a,
  PALETTE,
  sessionSchema,
  calendarExceptionSchema,
  type Address,
} from '../src/index.js';

describe('travel', () => {
  it('vrátí undefined, pokud chybí souřadnice', () => {
    const a: Address = { street: 'A', city: 'X' };
    const b: Address = { street: 'B', city: 'X', lat: 50, lon: 15 };
    expect(travelMinutes(a, b, 'car')).toBeUndefined();
    expect(travelMinutes(b, a, 'car')).toBeUndefined();
  });

  it('haversine je 0 pro shodný bod a kladné pro různé', () => {
    expect(haversineKm(50, 15, 50, 15)).toBe(0);
    expect(haversineKm(50, 15, 50.1, 15)).toBeGreaterThan(0);
  });

  it('chůze trvá déle než auto na stejné trase', () => {
    const a: Address = { street: 'A', city: 'X', lat: 50, lon: 15 };
    const b: Address = { street: 'B', city: 'X', lat: 50.05, lon: 15.05 };
    const walk = travelMinutes(a, b, 'walk');
    const car = travelMinutes(a, b, 'car');
    expect(walk).toBeGreaterThan(car as number);
  });
});

describe('palette + hash', () => {
  it('hashFnv1a je deterministický', () => {
    expect(hashFnv1a('TEST_keramika')).toBe(hashFnv1a('TEST_keramika'));
  });

  it('barva kroužku je stabilní a z palety', () => {
    const c1 = colorForActivity('TEST_keramika');
    const c2 = colorForActivity('TEST_keramika');
    expect(c1).toEqual(c2);
    expect(PALETTE).toContain(c1);
  });
});

describe('schema invarianty', () => {
  it('Session odmítne start >= end (INV-3)', () => {
    const bad = sessionSchema.safeParse({
      id: 's',
      groupId: 'g',
      weekday: 1,
      startMinutes: 960,
      endMinutes: 960,
      validFrom: '2026-09-01',
      validTo: '2027-06-30',
    });
    expect(bad.success).toBe(false);
  });

  it('CalendarException vyžaduje neprázdný source (INV-6)', () => {
    const bad = calendarExceptionSchema.safeParse({
      date: '2026-10-28',
      reason: 'x',
      scope: 'national',
      source: '',
    });
    expect(bad.success).toBe(false);
  });
});
