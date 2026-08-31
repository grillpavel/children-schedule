import type { Catalog, Session, SessionOverride } from './types.js';

/** Efektivní čas Session po zohlednění uživatelského přepisu (design_review_69.md). */
export function effectiveSession(
  session: Session,
  override: SessionOverride | undefined,
): Session {
  if (!override) return session;
  return {
    ...session,
    weekday: override.weekday ?? session.weekday,
    startMinutes: override.startMinutes ?? session.startMinutes,
    endMinutes: override.endMinutes ?? session.endMinutes,
  };
}

/**
 * Efektivní čas Session pro KONKRÉTNÍ dítě (design_review_96.md, CHANGE-103) — najde
 * přepis vlastněný tímto dítětem (`childId` shoduje se s `session.id`); globální
 * přepisy (bez `childId`) se aplikují už v `applySessionOverrides` na sdílený
 * katalog, sem se dostávají s hodnotami z toho katalogu, tenhle krok jen navrší
 * PERSONÁLNÍ přepis nad ně.
 */
export function effectiveSessionForChild(
  session: Session,
  sessionOverrides: readonly SessionOverride[],
  childId: string,
): Session {
  const override = sessionOverrides.find(
    (o) => o.sessionId === session.id && o.childId === childId,
  );
  return effectiveSession(session, override);
}

/**
 * Vrací katalog s aplikovanými GLOBÁLNÍMI uživatelskými přepisy časů Sessions
 * (design_review_69.md) — katalog nemusí odrážet aktuální stav (změna tréninkového
 * času apod.). Vstupní `catalog` zůstává needitovaný; beze změn (referenčně) se
 * vrátí, pokud není co přepsat.
 *
 * Přepisy vázané na konkrétní dítě (`childId` nastaven, design_review_96.md) se sem
 * NEPROMÍTAJÍ — ty platí jen pro to jedno dítě a aplikují se až při skládání jeho
 * konkrétního rozvrhu (`effectiveSessionForChild`), ne na sdílený katalog, který
 * vidí úplně všichni.
 */
export function applySessionOverrides(
  catalog: Catalog,
  sessionOverrides: readonly SessionOverride[],
): Catalog {
  const globalOverrides = sessionOverrides.filter((o) => o.childId === undefined);
  if (globalOverrides.length === 0) return catalog;
  const byId = new Map(globalOverrides.map((o) => [o.sessionId, o]));
  return {
    ...catalog,
    sessionGroups: catalog.sessionGroups.map((g) => ({
      ...g,
      sessions: g.sessions.map((s) => effectiveSession(s, byId.get(s.id))),
    })),
  };
}
