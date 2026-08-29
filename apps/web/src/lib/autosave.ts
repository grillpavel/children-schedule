'use client';

import {
  parsePlannerState,
  serializePlannerState,
  type PlannerState,
} from '@krouzky/domain';

// Autosave stavu do prohlížeče (BL-030). Migrace řeší parsePlannerState.
const KEY = 'krouzky:autosave:v1';

export function loadAutosave(): PlannerState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = parsePlannerState(JSON.parse(raw));
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

/** Vrací `true` při úspěšném zápisu, `false` když `localStorage` selhal (plné
 * úložiště, soukromý režim Safari, vypnuté úložiště webu…) — volající pak ví,
 * že se má UI zobrazit jako riziko ztráty dat, ne tiše předstírat úspěch. */
export function saveAutosave(state: PlannerState): boolean {
  try {
    window.localStorage.setItem(KEY, serializePlannerState(state));
    return true;
  } catch {
    return false;
  }
}
