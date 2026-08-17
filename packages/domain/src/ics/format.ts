import type { PricePeriod, Weekday } from '../model/types.js';

/** Mapa ISO dne v týdnu na dvouznakový kód RRULE BYDAY. */
export const BYDAY: Record<Weekday, string> = {
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
  7: 'SU',
};

/** `2026-09-08` → `20260908`. */
export function compactDate(iso: string): string {
  return iso.replace(/-/g, '');
}

/** Minuty od půlnoci → `HHMMSS` (sekundy vždy `00`). */
export function minutesToHms(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
}

/** ISO datum + minuty → lokální `YYYYMMDDTHHMMSS` (bez `Z`, pro použití s TZID). */
export function localDateTime(iso: string, minutes: number): string {
  return `${compactDate(iso)}T${minutesToHms(minutes)}`;
}

const PRICE_PERIOD_CS: Record<PricePeriod, string> = {
  per_semester: 'pololetí',
  per_year: 'rok',
  per_month: 'měsíc',
  per_session: 'lekce',
};

/** `1200 Kč / pololetí`. */
export function formatPrice(amount: number, period: PricePeriod): string {
  return `${amount} Kč / ${PRICE_PERIOD_CS[period]}`;
}

/**
 * Vytvoří slug z jména dítěte pro UID a název souboru.
 * Odstraní diakritiku, vše mimo `a-z0-9` nahradí pomlčkou.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
