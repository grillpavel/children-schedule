'use client';

import type { Address } from '@krouzky/domain';

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
