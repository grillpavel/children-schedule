import {
  catalogSchema,
  exceptionsFileSchema,
  plannerStateSchema,
} from '../model/schema.js';
import type {
  Catalog,
  ExceptionsFile,
  PlannerState,
} from '../model/types.js';
import { err, ok, type Result } from '../model/result.js';

function zodMessage(issues: { path: (string | number)[]; message: string }[]): string {
  return issues
    .map((i) => `${i.path.join('.') || '(kořen)'}: ${i.message}`)
    .join('; ');
}

/** Naparsuje a zvaliduje katalog z neznámého vstupu (import JSON). */
export function parseCatalog(input: unknown): Result<Catalog> {
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) return err(zodMessage(parsed.error.issues));
  return ok(parsed.data);
}

/** Naparsuje a zvaliduje soubor výjimek pro školní rok. */
export function parseExceptionsFile(input: unknown): Result<ExceptionsFile> {
  const parsed = exceptionsFileSchema.safeParse(input);
  if (!parsed.success) return err(zodMessage(parsed.error.issues));
  return ok(parsed.data);
}

/**
 * Migruje starší uložený stav na aktuální `schemaVersion` (řetězeně 1 → 2 → 3).
 * v1 → v2: `session.biweekly.parity` (sudý/lichý týden) → `everyWeeks: 2`.
 * v2 → v3: doplní prázdné `overrides` (uživatelské přepisy aktivit).
 */
function migrateToCurrent(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) return input;

  const migrateSession = (s: Record<string, unknown>): Record<string, unknown> => {
    const { biweekly, ...rest } = s;
    if (biweekly && typeof biweekly === 'object') {
      return { ...rest, everyWeeks: 2 };
    }
    return rest;
  };

  let clone = JSON.parse(JSON.stringify(input)) as {
    schemaVersion?: number;
    schedules?: { enrollments?: unknown; customEntries?: { sessions?: unknown[] }[] }[];
    overrides?: unknown;
  };

  // v1 → v2: přepis biweekly u vlastních událostí (katalog migruje volající zvlášť).
  if (clone.schemaVersion === 1) {
    for (const schedule of clone.schedules ?? []) {
      for (const entry of schedule.customEntries ?? []) {
        entry.sessions = (entry.sessions ?? []).map((x) =>
          migrateSession(x as Record<string, unknown>),
        );
      }
    }
    clone = { ...clone, schemaVersion: 2 };
  }

  // v2 → v3: přidá prázdné pole přepisů, pokud chybí.
  if (clone.schemaVersion === 2) {
    clone = { ...clone, schemaVersion: 3, overrides: clone.overrides ?? [] };
  }

  return clone;
}

/**
 * Naparsuje a zvaliduje `PlannerState` (načtení rozvrhu ze souboru).
 * Starší `schemaVersion` se před validací zmigruje na aktuální.
 */
export function parsePlannerState(input: unknown): Result<PlannerState> {
  const parsed = plannerStateSchema.safeParse(migrateToCurrent(input));
  if (!parsed.success) return err(zodMessage(parsed.error.issues));
  return ok(parsed.data);
}

/** Serializuje `PlannerState` do JSON řetězce pro stažení do souboru. */
export function serializePlannerState(state: PlannerState): string {
  return JSON.stringify(state, null, 2);
}
