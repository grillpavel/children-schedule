'use client';

import type { Address } from '@krouzky/domain';

/** Přibližné středy měst pro offline fallback (bez sítě). */
const TOWN_CENTERS: Record<string, { lat: number; lon: number }> = {
  'nove straseci': { lat: 50.152, lon: 13.899 },
  rakovnik: { lat: 50.1039, lon: 13.7335 },
  kladno: { lat: 50.1477, lon: 14.1027 },
};

function normalizeCity(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Offline odhad souřadnic ze středu známého města (bez sítě).
 * Vrací `undefined` pro neznámé město — pak zůstane bez souřadnic.
 */
export function offlineGeocode(
  address: Address,
): { lat: number; lon: number } | undefined {
  if (!address.city) return undefined;
  return TOWN_CENTERS[normalizeCity(address.city)];
}

/**
 * Doplní `lat`/`lon` k adrese přes keyless Nominatim (OpenStreetMap),
 * aby se po ruční úpravě adresy aktualizoval náhled mapy.
 * Vrací `undefined` při chybě, offline nebo bez výsledku — adresa pak
 * zůstane bez souřadnic (mapa se schová, zobrazí se jen odkazy).
 */
export async function geocodeAddress(
  address: Address,
): Promise<{ lat: number; lon: number } | undefined> {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    countrycodes: 'cz',
  });
  if (address.street) params.set('street', address.street);
  if (address.city) params.set('city', address.city);
  if (address.zip) params.set('postalcode', address.zip);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return undefined;
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
    return { lat, lon };
  } catch {
    return undefined;
  }
}
