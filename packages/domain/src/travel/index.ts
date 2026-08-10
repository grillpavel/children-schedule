import type { Address } from '../model/types.js';

export type TravelMode = 'walk' | 'car' | 'transit';

/** Objížďkový faktor — vzdušná vzdálenost je vždy kratší než reálná trasa. */
export const DETOUR_FACTOR = 1.35;

/** Rychlosti podle způsobu dopravy (km/h). */
export const TRAVEL_SPEED_KMH: Record<TravelMode, number> = {
  walk: 4.5,
  car: 30, // městský provoz
  transit: 15,
};

/** Fixní režie (min): parkování, čekání na spoj. */
export const MODE_OVERHEAD_MIN: Record<TravelMode, number> = {
  walk: 0,
  car: 5,
  transit: 8,
};

/** Výchozí rezerva na přesun (min), pokud uživatel nezadá vlastní. */
export const DEFAULT_TRAVEL_BUFFER_MIN = 10;

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Vzdušná vzdálenost dvou bodů v km (haversine). */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Hrubý odhad doby přesunu mezi dvěma adresami (min).
 *
 * Vrací `undefined`, pokud kterékoli adrese chybí souřadnice —
 * kontrola se pak přeskočí, nikdy se neaproximuje (viz pravidlo #2).
 * Výsledek je záměrně hrubý odhad a UI ho tak musí prezentovat.
 */
export function travelMinutes(
  a: Address,
  b: Address,
  mode: TravelMode,
): number | undefined {
  if (a.lat === undefined || a.lon === undefined) return undefined;
  if (b.lat === undefined || b.lon === undefined) return undefined;

  const km = haversineKm(a.lat, a.lon, b.lat, b.lon) * DETOUR_FACTOR;
  const speed = TRAVEL_SPEED_KMH[mode];
  const minutes = (km / speed) * 60 + MODE_OVERHEAD_MIN[mode];
  return Math.round(minutes);
}
