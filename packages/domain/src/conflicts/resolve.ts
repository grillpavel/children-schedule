import type {
  Activity,
  Address,
  Catalog,
  Child,
  CustomEntry,
  Enrollment,
  NamedSchedule,
  Provider,
  SessionGroup,
  Venue,
  Weekday,
} from '../model/types.js';

/** Jedna umístěná Session v konkrétním rozvrhu — společný tvar pro detekci kolizí. */
export interface PlacedSession {
  /** Enrollment.id nebo CustomEntry.id. */
  ownerId: string;
  ownerKind: 'enrollment' | 'custom';
  sessionId: string;
  childId: string;
  activityId: string | undefined;
  /** Název kroužku nebo vlastní události — pro české hlášky. */
  label: string;
  weekday: Weekday;
  startMinutes: number;
  endMinutes: number;
  everyWeeks: number | undefined;
  address: Address | undefined;
  validFrom: string;
  validTo: string;
}

export interface CatalogIndex {
  provider: Map<string, Provider>;
  activity: Map<string, Activity>;
  group: Map<string, SessionGroup>;
  venue: Map<string, Venue>;
}

export function buildCatalogIndex(catalog: Catalog): CatalogIndex {
  return {
    provider: new Map(catalog.providers.map((p) => [p.id, p])),
    activity: new Map(catalog.activities.map((a) => [a.id, a])),
    group: new Map(catalog.sessionGroups.map((g) => [g.id, g])),
    venue: new Map((catalog.venues ?? []).map((v) => [v.id, v])),
  };
}

/** Adresa konání Session: override → místo konání skupiny → sídlo poskytovatele. */
function sessionAddress(
  override: Address | undefined,
  group: SessionGroup,
  activity: Activity | undefined,
  index: CatalogIndex,
): Address | undefined {
  if (override) return override;
  const venue = group.venueId ? index.venue.get(group.venueId) : undefined;
  if (venue) return venue.address;
  if (!activity) return undefined;
  return index.provider.get(activity.providerId)?.address;
}

function placeEnrollment(
  enrollment: Enrollment,
  index: CatalogIndex,
): PlacedSession[] {
  const group = index.group.get(enrollment.sessionGroupId);
  if (!group) return [];
  const activity = index.activity.get(enrollment.activityId);
  const label = activity?.name ?? 'Neznámý kroužek';
  // `sessionIds` (design_review_87.md): dítě může chodit jen na PODMNOŽINU termínů
  // skupiny (např. skupina má pondělí+středu, dítě jen na pondělí). `undefined` =
  // všechny termíny skupiny, zpětně kompatibilní s enrollmenty bez tohoto pole.
  const sessions = enrollment.sessionIds
    ? group.sessions.filter((s) => enrollment.sessionIds!.includes(s.id))
    : group.sessions;
  return sessions.map((session) => ({
    ownerId: enrollment.id,
    ownerKind: 'enrollment' as const,
    sessionId: session.id,
    childId: enrollment.childId,
    activityId: enrollment.activityId,
    label,
    weekday: session.weekday,
    startMinutes: session.startMinutes,
    endMinutes: session.endMinutes,
    everyWeeks: session.everyWeeks,
    address: sessionAddress(session.locationOverride, group, activity, index),
    validFrom: session.validFrom,
    validTo: session.validTo,
  }));
}

function placeCustomEntry(entry: CustomEntry): PlacedSession[] {
  return entry.sessions.map((session) => ({
    ownerId: entry.id,
    ownerKind: 'custom' as const,
    sessionId: session.id,
    childId: entry.childId,
    activityId: undefined,
    label: entry.name,
    weekday: session.weekday,
    startMinutes: session.startMinutes,
    endMinutes: session.endMinutes,
    everyWeeks: session.everyWeeks,
    address: session.locationOverride ?? entry.location,
    validFrom: session.validFrom,
    validTo: session.validTo,
  }));
}

/** Rozloží rozvrh na plochý seznam umístěných Sessions, volitelně pro jedno dítě. */
export function resolvePlacedSessions(
  schedule: NamedSchedule,
  index: CatalogIndex,
  childId?: string,
): PlacedSession[] {
  const placed: PlacedSession[] = [];
  for (const enrollment of schedule.enrollments) {
    if (childId && enrollment.childId !== childId) continue;
    placed.push(...placeEnrollment(enrollment, index));
  }
  for (const entry of schedule.customEntries) {
    if (childId && entry.childId !== childId) continue;
    placed.push(...placeCustomEntry(entry));
  }
  return placed;
}

export function childById(children: readonly Child[]): Map<string, Child> {
  return new Map(children.map((c) => [c.id, c]));
}
