import { describe, it, expect } from 'vitest';
import { pricePerLesson, type Price } from '../src/index.js';

describe('pricePerLesson', () => {
  it('per_session je přímo cena za lekci', () => {
    const p: Price = { amount: 150, period: 'per_session' };
    expect(pricePerLesson(p, 30, 9)).toBe(150);
  });

  it('per_year dělí počtem lekcí', () => {
    const p: Price = { amount: 1500, period: 'per_year' };
    expect(pricePerLesson(p, 30, 9)).toBe(50);
  });

  it('per_month násobí měsíci sezony a dělí počtem lekcí', () => {
    const p: Price = { amount: 200, period: 'per_month' };
    // 200 × 9 / 36 = 50
    expect(pricePerLesson(p, 36, 9)).toBe(50);
  });

  it('per_semester normalizuje počtem pololetí v sezoně', () => {
    const p: Price = { amount: 1200, period: 'per_semester' };
    // 10 měsíců → 2 pololetí → 1200×2/20 = 120
    expect(pricePerLesson(p, 20, 10)).toBe(120);
    // 5 měsíců → 1 pololetí → 1200/20 = 60
    expect(pricePerLesson(p, 20, 5)).toBe(60);
  });

  it('per_semester bez délky sezony → undefined', () => {
    const p: Price = { amount: 1200, period: 'per_semester' };
    expect(pricePerLesson(p, 20, 0)).toBeUndefined();
  });

  it('bez lekcí nebo s neznámou cenou → undefined', () => {
    expect(pricePerLesson({ amount: 1500, period: 'per_year' }, 0, 9)).toBeUndefined();
    expect(pricePerLesson({ amount: Number.NaN, period: 'per_year' }, 30, 9)).toBeUndefined();
  });
});
