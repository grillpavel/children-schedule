'use client';

import {
  type Address,
  type Catalog,
  type Child,
  type PlannerState,
  type Provider,
  type SessionGroup,
  type Venue,
} from '@krouzky/domain';
import {
  NS_ACTIVITY_META,
  NS_CATALOG,
  NS_VENUES,
} from '@krouzky/domain/data/novestraseciData-2';

/** Školní rok dle § 24 školského zákona (statutární, ne odhad). */
const SCHOOL_YEAR = { start: '2026-09-01', end: '2027-06-30' };

/** Zahodí neznámé (NaN) souřadnice a prázdné PSČ — pravidlo #1: nedopočítávat. */
function cleanAddress(input: {
  street: string;
  city: string;
  zip?: string;
  lat?: number;
  lon?: number;
}): Address {
  const address: Address = { street: input.street, city: input.city };
  if (input.zip && input.zip.trim()) address.zip = input.zip.trim();
  if (
    input.lat !== undefined &&
    input.lon !== undefined &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lon)
  ) {
    address.lat = input.lat;
    address.lon = input.lon;
  }
  return address;
}

/** Místa konání z NS_VENUES → doménová entita Venue. */
const VENUES: Venue[] = Object.values(NS_VENUES).map((v) => ({
  id: v.id,
  name: v.name,
  address: cleanAddress({
    street: v.street,
    city: v.city,
    zip: v.postalCode,
    lat: v.lat,
    lon: v.lon,
  }),
}));

/** Poskytovatelé s očištěnou adresou (sídlo DDM v Rakovníku nemá souřadnice). */
const PROVIDERS: Provider[] = NS_CATALOG.providers.map((p) => ({
  ...p,
  address: cleanAddress(p.address),
}));

/** Skupinám doplní odkaz na místo konání podle NS_ACTIVITY_META. */
const SESSION_GROUPS: SessionGroup[] = NS_CATALOG.sessionGroups.map((g) => {
  const raw = NS_ACTIVITY_META[g.activityId]?.venueId;
  // Skupina má jedno primární místo; u vícemístných aktivit beréme první.
  const venueId = Array.isArray(raw) ? raw[0] : raw;
  return venueId ? { ...g, venueId } : g;
});

/** Aktivitám doplní odkaz na stránku kroužku (NS_ACTIVITY_META.sourceUrl). */
const ACTIVITIES = NS_CATALOG.activities.map((a) => {
  const sourceUrl = NS_ACTIVITY_META[a.id]?.sourceUrl;
  return sourceUrl ? { ...a, sourceUrl } : a;
});

/** Reálný katalog Nové Strašecí a okolí (DDM Rakovník), školní rok 2026/2027. */
export const NOVE_STRASECI_CATALOG: Catalog = {
  city: NS_CATALOG.city,
  providers: PROVIDERS,
  activities: ACTIVITIES,
  sessionGroups: SESSION_GROUPS,
  venues: VENUES,
};

/** Výjimky (svátky/ředitelská volna) pro okres nejsou zveřejněny → prázdné. */
export const NOVE_STRASECI_EXCEPTIONS = [] as const;

const SCHOOL_VENUE = NS_VENUES['zs-ucebna'];

const DEFAULT_CHILD: Child = {
  id: 'child-1',
  name: 'Moje dítě',
  age: 9,
  schoolEndByWeekday: {},
  // Výchozí škola = ZŠ J. A. Komenského Nové Strašecí (veřejný údaj z NS_VENUES).
  ...(SCHOOL_VENUE
    ? {
        schoolAddress: cleanAddress({
          street: SCHOOL_VENUE.street,
          city: SCHOOL_VENUE.city,
          zip: SCHOOL_VENUE.postalCode,
          lat: SCHOOL_VENUE.lat,
          lon: SCHOOL_VENUE.lon,
        }),
      }
    : {}),
};

export function buildNovestraseciState(): PlannerState {
  return {
    schemaVersion: 3,
    children: [DEFAULT_CHILD],
    schedules: [
      {
        id: 'sch-a',
        name: 'Varianta A',
        enrollments: [],
        customEntries: [],
        origin: 'manual',
        createdAt: `${SCHOOL_YEAR.start}T00:00:00Z`,
      },
    ],
    activeScheduleId: 'sch-a',
    constraints: [],
    overrides: [],
    schoolYear: SCHOOL_YEAR,
    districtCode: '',
  };
}
