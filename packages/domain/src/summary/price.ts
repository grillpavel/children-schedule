import type { Price } from '../model/types.js';

/** Délka jednoho pololetí v měsících (školní rok ≈ 2 pololetí). */
const SEMESTER_MONTHS = 5;

/**
 * Cena za jednu lekci odvozená z ceny kroužku, počtu lekcí za sezonu
 * a délky sezony v měsících. Vrací `undefined`, když výpočet není
 * jednoznačný nebo chybí vstup:
 * - `per_session` → částka je přímo cena za lekci,
 * - `per_year` → roční částka / počet lekcí,
 * - `per_month` → (měsíční částka × měsíce sezony) / počet lekcí,
 * - `per_semester` → (částka × počet pololetí v sezoně) / počet lekcí,
 *   kde počet pololetí = `round(seasonMonths / 5)` (min 1).
 * Čisté a deterministické.
 */
export function pricePerLesson(
  price: Price,
  lessonCount: number,
  seasonMonths: number,
): number | undefined {
  if (!Number.isFinite(price.amount)) return undefined;
  if (price.period === 'per_session') return price.amount;
  if (lessonCount <= 0) return undefined;
  switch (price.period) {
    case 'per_year':
      return price.amount / lessonCount;
    case 'per_month':
      if (seasonMonths <= 0) return undefined;
      return (price.amount * seasonMonths) / lessonCount;
    case 'per_semester': {
      if (seasonMonths <= 0) return undefined;
      const semesters = Math.max(1, Math.round(seasonMonths / SEMESTER_MONTHS));
      return (price.amount * semesters) / lessonCount;
    }
    default:
      return undefined;
  }
}
