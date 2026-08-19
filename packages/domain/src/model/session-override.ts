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
 * Vrací katalog s aplikovanými uživatelskými přepisy časů Sessions (design_review_69.md) —
 * katalog nemusí odrážet aktuální stav (změna tréninkového času apod.). Vstupní `catalog`
 * zůstává needitovaný; beze změn (referenčně) se vrátí, pokud není co přepsat.
 */
export function applySessionOverrides(
  catalog: Catalog,
  sessionOverrides: readonly SessionOverride[],
): Catalog {
  if (sessionOverrides.length === 0) return catalog;
  const byId = new Map(sessionOverrides.map((o) => [o.sessionId, o]));
  return {
    ...catalog,
    sessionGroups: catalog.sessionGroups.map((g) => ({
      ...g,
      sessions: g.sessions.map((s) => effectiveSession(s, byId.get(s.id))),
    })),
  };
}
