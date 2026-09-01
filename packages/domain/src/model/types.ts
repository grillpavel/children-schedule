import type { z } from 'zod';
import type {
  addressSchema,
  contactSchema,
  providerKindSchema,
  providerSchema,
  activityCategorySchema,
  activitySchema,
  pricePeriodSchema,
  priceSchema,
  weekdaySchema,
  sessionSchema,
  sessionGroupSchema,
  sessionOverrideSchema,
  venueSchema,
  childSchema,
  availabilityWindowSchema,
  enrollmentStatusSchema,
  enrollmentSchema,
  customEntrySchema,
  activityOverrideSchema,
  constraintSeveritySchema,
  constraintSchema,
  constraintRecordSchema,
  exceptionScopeSchema,
  calendarExceptionSchema,
  namedScheduleSchema,
  plannerStateSchema,
  singleChildExportPayloadSchema,
  exportEnvelopeSchema,
  catalogSchema,
  exceptionsFileSchema,
} from './schema.js';

// ---------- Katalog ----------
export type ProviderKind = z.infer<typeof providerKindSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Provider = z.infer<typeof providerSchema>;
export type ActivityCategory = z.infer<typeof activityCategorySchema>;
export type Activity = z.infer<typeof activitySchema>;
export type PricePeriod = z.infer<typeof pricePeriodSchema>;
export type Price = z.infer<typeof priceSchema>;
export type Weekday = z.infer<typeof weekdaySchema>;
export type Session = z.infer<typeof sessionSchema>;
export type SessionGroup = z.infer<typeof sessionGroupSchema>;
export type SessionOverride = z.infer<typeof sessionOverrideSchema>;
export type Venue = z.infer<typeof venueSchema>;
export type Catalog = z.infer<typeof catalogSchema>;

// ---------- Uživatelský stav ----------
export type Child = z.infer<typeof childSchema>;
export type AvailabilityWindow = z.infer<typeof availabilityWindowSchema>;
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;
export type Enrollment = z.infer<typeof enrollmentSchema>;
export type CustomEntry = z.infer<typeof customEntrySchema>;
export type CustomEntryKind = CustomEntry['kind'];
export type ActivityOverride = z.infer<typeof activityOverrideSchema>;

// ---------- Omezení ----------
export type ConstraintSeverity = z.infer<typeof constraintSeveritySchema>;
export type Constraint = z.infer<typeof constraintSchema>;
export type ConstraintRecord = z.infer<typeof constraintRecordSchema>;

// ---------- Kalendář výjimek ----------
export type ExceptionScope = z.infer<typeof exceptionScopeSchema>;
export type CalendarException = z.infer<typeof calendarExceptionSchema>;
export type ExceptionsFile = z.infer<typeof exceptionsFileSchema>;

// ---------- Stav ----------
export type NamedSchedule = z.infer<typeof namedScheduleSchema>;
export type PlannerState = z.infer<typeof plannerStateSchema>;

// ---------- Export jednoho dítěte / celé rodiny (design_review_99.md, CHANGE-106) ----------
export type SingleChildExportPayload = z.infer<typeof singleChildExportPayloadSchema>;
export type ExportEnvelope = z.infer<typeof exportEnvelopeSchema>;

// ---------- Odvozené typy (výstupy výpočtů, neserializují se jako vstup) ----------

export type ConflictKind =
  | 'time_overlap'
  | 'age_out_of_range'
  | 'travel_infeasible'
  | 'school_not_finished'
  | 'capacity_unknown'
  | 'budget_exceeded'
  | 'constraint_violated'
  | 'family';

export interface Conflict {
  kind: ConflictKind;
  severity: 'hard' | 'soft';
  enrollmentIds: string[];
  message: string;
  suggestion?: string;
}

export interface ScheduleVariant {
  id: string;
  enrollments: Enrollment[];
  score: number;
  satisfiedSoft: string[];
  violatedSoft: string[];
  tradeoffSummary: string;
  totalCostCzk: number;
}

/** Kontrola, která nemá vstupní data, se přeskočí a zaznamená sem. */
export interface SkippedCheck {
  check: string;
  reason: string;
  enrollmentIds: string[];
}
