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

export function saveAutosave(state: PlannerState): void {
  try {
    window.localStorage.setItem(KEY, serializePlannerState(state));
  } catch {
    // localStorage nedostupné / plné → autosave je best-effort, ignoruj.
  }
}
