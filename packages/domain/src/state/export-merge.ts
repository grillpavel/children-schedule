import type {
  ActivityOverride,
  Catalog,
  Child,
  CustomEntry,
  Enrollment,
  NamedSchedule,
  PlannerState,
  SessionOverride,
  SingleChildExportPayload,
} from '../model/types.js';

/**
 * Obecný, na jménech polí NEZÁVISLÝ rekurzivní převod do kanonické podoby
 * (design_review_99.md FR-8). Řadí KAŽDÉ pole na libovolné hloubce, ne jen
 * top-level — vnořené pole jako `CustomEntry.sessions` mají stejné riziko
 * "nesouvisející editace přerovná pořadí" jako top-level `enrollments`.
 *
 * Pravidlo pro pole podle TVARU prvků (funkce nezná/nepotřebuje znát jména
 * polí, jen jejich tvar):
 * - objekty se stabilním `id` (enrollments, customEntries, sessions, …) → řadit podle `id`
 * - primitiva bez `id` (`Enrollment.sessionIds`, `Child.interests`, …) → řadit podle hodnoty
 * - objekty BEZ `id` (`Child.availability`) → řadit podle kanonizovaného `JSON.stringify` (fallback klíč)
 *
 * Objekty samotné se NEŘADÍ podle klíčů — pořadí klíčů řeší až `deepEqual`
 * (necitlivé na pořadí klíčů), ne tato funkce.
 */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(canonicalize);
    if (items.every((it) => isPlainObject(it) && typeof it.id === 'string')) {
      return [...items].sort((a, b) =>
        ((a as { id: string }).id).localeCompare((b as { id: string }).id),
      );
    }
    if (items.every((it) => !isPlainObject(it) && !Array.isArray(it))) {
      return [...items].sort((a, b) => {
        const as = String(a);
        const bs = String(b);
        return as < bs ? -1 : as > bs ? 1 : 0;
      });
    }
    return [...items].sort((a, b) => {
      const as = JSON.stringify(a);
      const bs = JSON.stringify(b);
      return as < bs ? -1 : as > bs ? 1 : 0;
    });
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Hloubková rovnost necitlivá na pořadí klíčů objektu (NE `JSON.stringify` rovnost). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(
      (k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]),
    );
  }
  return false;
}

/** Porovná dvě hodnoty KANONICKY (design_review_99.md FR-8) — necitlivě na pořadí
 * prvků v libovolně vnořeném poli i na pořadí klíčů objektu. */
export function sameCanonical(a: unknown, b: unknown): boolean {
  return deepEqual(canonicalize(a), canonicalize(b));
}

/** Kanonizace konkrétně nad výřezem dat jednoho dítěte (FR-8) — tenký, pojmenovaný
 * alias nad obecným `canonicalize`, ať název odpovídá spec `canonicalizeChildSlice()`. */
export function canonicalizeChildSlice(slice: unknown): unknown {
  return canonicalize(slice);
}

/** `sessionId`, na které dítě skutečně chodí (respektuje `Enrollment.sessionIds`
 * pro částečnou docházku, design_review_87.md). */
function usedSessionIds(enrollments: readonly Enrollment[], catalog: Catalog): Set<string> {
  const groups = new Map(catalog.sessionGroups.map((g) => [g.id, g]));
  const ids = new Set<string>();
  for (const e of enrollments) {
    const group = groups.get(e.sessionGroupId);
    if (!group) continue;
    const sessions = e.sessionIds
      ? group.sessions.filter((s) => e.sessionIds!.includes(s.id))
      : group.sessions;
    for (const s of sessions) ids.add(s.id);
  }
  return ids;
}

/**
 * Sestaví export "Toto dítě" (FR-4) — jen data patřící vybranému dítěti + katalogové
 * přepisy, které se ho týkají. `overrides`/globální `sessionOverrides` jsou
 * INFORMATIVNÍ součást exportu (kontext), merge (FR-5) je při zpětném importu
 * nepoužije — nedotýká se ničeho globálního/sdíleného.
 */
export function buildSingleChildExportPayload(
  child: Child,
  schedule: NamedSchedule,
  catalog: Catalog,
  allOverrides: readonly ActivityOverride[],
  allSessionOverrides: readonly SessionOverride[],
): SingleChildExportPayload {
  const enrollments = schedule.enrollments.filter((e) => e.childId === child.id);
  const customEntries = schedule.customEntries.filter((e) => e.childId === child.id);
  const activityIds = new Set(enrollments.map((e) => e.activityId));
  const overrides = allOverrides.filter((o) => activityIds.has(o.activityId));
  const usedSessions = usedSessionIds(enrollments, catalog);
  const sessionOverrides = allSessionOverrides.filter(
    (o) => o.childId === child.id || (o.childId === undefined && usedSessions.has(o.sessionId)),
  );
  return { child, enrollments, customEntries, overrides, sessionOverrides };
}

/** Výřez relevantní pro MERGE/porovnání (FR-5/FR-8) — jen to, co merge skutečně
 * přepisuje: enrollments/customEntries/PER-DÍTĚ (ne globální) sessionOverrides. */
export interface ChildMergeSlice {
  enrollments: Enrollment[];
  customEntries: CustomEntry[];
  sessionOverrides: SessionOverride[];
}

export function buildChildMergeSlice(
  childId: string,
  schedule: NamedSchedule,
  allSessionOverrides: readonly SessionOverride[],
): ChildMergeSlice {
  return {
    enrollments: schedule.enrollments.filter((e) => e.childId === childId),
    customEntries: schedule.customEntries.filter((e) => e.childId === childId),
    sessionOverrides: allSessionOverrides.filter((o) => o.childId === childId),
  };
}

/** Jedna položka vynechaná při mergi kvůli zmizelé katalogové položce (FR-7). */
export interface SkippedMergeItem {
  kind: 'enrollment';
  id: string;
  reason: string;
}

/** Jak appka rozhodne o mergi jednoho dítěte (FR-5/FR-7/FR-8). `nextState` je
 * VŽDY připravený už i pro `resolution !== 'silent'` — appka ho zapíše jen po
 * explicitním potvrzení uživatelem (pro `'silent'` rovnou, bez dotazu). */
export type MergeResolution =
  | { kind: 'silent' }
  | { kind: 'new-child' }
  | { kind: 'name-mismatch'; targetName: string; sourceName: string }
  | { kind: 'content-differs' };

export interface SingleChildMergeResult {
  resolution: MergeResolution;
  nextState: PlannerState;
  skipped: SkippedMergeItem[];
}

/**
 * Čistá (bez vedlejších efektů) implementace FR-5/FR-7/FR-8 — sloučí `payload`
 * (export "Toto dítě") do `targetState`'s AKTIVNÍ varianty (`activeScheduleId`).
 * Nikdy nemění jiné děti, globální `overrides`, ostatní varianty rozvrhu, ani
 * (u existujícího dítěte) samotné vlastnosti `Child` (věk/zájmy/…) — merguje
 * jen enrollments/customEntries/per-dítě sessionOverrides (FR-5).
 */
export function mergeSingleChildImport(
  targetState: PlannerState,
  payload: SingleChildExportPayload,
  catalog: Catalog,
): SingleChildMergeResult {
  const activities = new Set(catalog.activities.map((a) => a.id));
  const groups = new Set(catalog.sessionGroups.map((g) => g.id));
  const skipped: SkippedMergeItem[] = [];
  const acceptedEnrollments = payload.enrollments.filter((e) => {
    const ok = activities.has(e.activityId) && groups.has(e.sessionGroupId);
    if (!ok) {
      skipped.push({
        kind: 'enrollment',
        id: e.id,
        reason: 'Katalogová položka, na kterou zápis odkazuje, už neexistuje.',
      });
    }
    return ok;
  });
  const acceptedSessionOverrides = payload.sessionOverrides.filter(
    (o) => o.childId === payload.child.id,
  );

  const scheduleIndex = targetState.schedules.findIndex(
    (s) => s.id === targetState.activeScheduleId,
  );
  const activeIdx = scheduleIndex === -1 ? 0 : scheduleIndex;

  const existingChild = targetState.children.find((c) => c.id === payload.child.id);

  const applyMerge = (): PlannerState => {
    const schedules = targetState.schedules.map((schedule, i) => {
      if (i !== activeIdx) return schedule;
      return {
        ...schedule,
        enrollments: [
          ...schedule.enrollments.filter((e) => e.childId !== payload.child.id),
          ...acceptedEnrollments,
        ],
        customEntries: [
          ...schedule.customEntries.filter((e) => e.childId !== payload.child.id),
          ...payload.customEntries,
        ],
      };
    });
    const sessionOverrides = [
      ...targetState.sessionOverrides.filter((o) => o.childId !== payload.child.id),
      ...acceptedSessionOverrides,
    ];
    const children = existingChild
      ? targetState.children
      : [...targetState.children, payload.child];
    return { ...targetState, children, schedules, sessionOverrides };
  };

  const nextState = applyMerge();

  if (!existingChild) {
    return { resolution: { kind: 'new-child' }, nextState, skipped };
  }
  if (existingChild.name !== payload.child.name) {
    return {
      resolution: {
        kind: 'name-mismatch',
        targetName: existingChild.name,
        sourceName: payload.child.name,
      },
      nextState,
      skipped,
    };
  }

  const targetSchedule = targetState.schedules[activeIdx]!;
  const currentSlice = buildChildMergeSlice(
    payload.child.id,
    targetSchedule,
    targetState.sessionOverrides,
  );
  const importedSlice: ChildMergeSlice = {
    enrollments: acceptedEnrollments,
    customEntries: payload.customEntries,
    sessionOverrides: acceptedSessionOverrides,
  };
  const identical = sameCanonical(
    canonicalizeChildSlice(currentSlice),
    canonicalizeChildSlice(importedSlice),
  );
  return {
    resolution: identical ? { kind: 'silent' } : { kind: 'content-differs' },
    nextState,
    skipped,
  };
}
