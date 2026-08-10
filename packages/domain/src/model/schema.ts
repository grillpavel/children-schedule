import { z } from 'zod';

/**
 * Zod schémata jsou jediným zdrojem pravdy pro tvar dat.
 * TypeScript typy se z nich odvozují přes `z.infer` v `types.ts`.
 *
 * Konvence napříč modelem:
 * - čas = minuty od půlnoci (`number`, 0..1440), nikdy `Date`
 * - den v týdnu = ISO-8601 (`1` = pondělí .. `7` = neděle)
 * - datum = ISO řetězec `YYYY-MM-DD`
 * - chybějící hodnota = `undefined`, nikdy se nedoplňuje odhadem
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Očekáván formát data YYYY-MM-DD');

const minutesOfDay = z.number().int().min(0).max(1440);

export const weekdaySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

// ---------- Katalog (statický, read-only za běhu) ----------

export const providerKindSchema = z.enum([
  'ddm',
  'zus',
  'sport_club',
  'school',
  'private',
  'other',
]);

export const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zip: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

export const contactSchema = z.object({
  personName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: providerKindSchema,
  address: addressSchema,
  contact: contactSchema,
  website: z.string().url().optional(),
  note: z.string().optional(),
});

export const activityCategorySchema = z.enum([
  'sport',
  'athletics',
  'art',
  'music',
  'dance',
  'language',
  'science_tech',
  'science',
  'tech',
  'crafts',
  'games',
  'outdoor',
  'martial_arts',
  'scouting',
  'other',
]);

export const pricePeriodSchema = z.enum([
  'per_semester',
  'per_year',
  'per_month',
  'per_session',
]);

export const priceSchema = z.object({
  amount: z.number(),
  period: pricePeriodSchema,
  note: z.string().optional(),
});

export const activitySchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  category: activityCategorySchema,
  ageMin: z.number().int(),
  ageMax: z.number().int(),
  price: priceSchema,
  capacity: z.number().int().optional(),
  description: z.string().optional(),
  requiresEquipment: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  lastVerifiedAt: isoDate,
});

/** Opakování po N týdnech (1 = každý týden, 2 = každé 2 týdny, …). */
export const everyWeeksSchema = z.number().int().min(1);

export const sessionSchema = z
  .object({
    id: z.string(),
    groupId: z.string(),
    weekday: weekdaySchema,
    startMinutes: minutesOfDay,
    endMinutes: minutesOfDay,
    locationOverride: addressSchema.optional(),
    instructor: z.string().optional(),
    validFrom: isoDate,
    validTo: isoDate,
    everyWeeks: everyWeeksSchema.optional(),
  })
  // INV-3: startMinutes < endMinutes
  .refine((s) => s.startMinutes < s.endMinutes, {
    message: 'startMinutes musí být menší než endMinutes',
    path: ['startMinutes'],
  });

export const sessionGroupSchema = z.object({
  id: z.string(),
  activityId: z.string(),
  label: z.string().optional(),
  /** Odkaz na místo konání (Catalog.venues); organizátor ≠ místo. */
  venueId: z.string().optional(),
  // INV-1b: alespoň jedna Session
  sessions: z.array(sessionSchema).min(1),
});

// ---------- Uživatelský stav (jen v paměti) ----------

export const childSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthYear: z.number().int().optional(),
  age: z.number().int(),
  colorSeed: z.string().optional(),
  schoolEndByWeekday: z.record(z.string(), minutesOfDay),
  schoolAddress: addressSchema.optional(),
});

export const enrollmentStatusSchema = z.enum([
  'considering',
  'selected',
  'confirmed',
]);

export const enrollmentSchema = z.object({
  id: z.string(),
  childId: z.string(),
  activityId: z.string(),
  sessionGroupId: z.string(),
  status: enrollmentStatusSchema,
  pinned: z.boolean(),
});

/** Session bez `groupId` — pro ručně zadané události mimo katalog. */
const customSessionSchema = z
  .object({
    id: z.string(),
    weekday: weekdaySchema,
    startMinutes: minutesOfDay,
    endMinutes: minutesOfDay,
    locationOverride: addressSchema.optional(),
    instructor: z.string().optional(),
    validFrom: isoDate,
    validTo: isoDate,
    everyWeeks: everyWeeksSchema.optional(),
  })
  .refine((s) => s.startMinutes < s.endMinutes, {
    message: 'startMinutes musí být menší než endMinutes',
    path: ['startMinutes'],
  });

export const customEntrySchema = z.object({
  id: z.string(),
  childId: z.string(),
  name: z.string(),
  sessions: z.array(customSessionSchema).min(1),
  location: addressSchema.optional(),
  contact: contactSchema.optional(),
  price: priceSchema.optional(),
  note: z.string().optional(),
  colorOverride: z.string().optional(),
});

/**
 * Uživatelský přepis zobrazovaných/exportovaných údajů katalogové aktivity.
 * Klíčem je `activityId`; katalog zůstává neměnný, efektivní hodnota =
 * `override ?? katalog`. `colorCss` je klíčové slovo z `PALETTE` (viz palette.ts).
 */
export const activityOverrideSchema = z.object({
  activityId: z.string(),
  name: z.string().optional(),
  address: addressSchema.optional(),
  contactPhone: z.string().optional(),
  price: priceSchema.optional(),
  colorCss: z.string().optional(),
});

// ---------- Omezení ----------

export const constraintSeveritySchema = z.enum(['hard', 'soft']);

export const constraintSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('no_activities_on'),
    severity: constraintSeveritySchema,
    weekdays: z.array(weekdaySchema),
  }),
  z.object({
    kind: z.literal('not_before'),
    severity: constraintSeveritySchema,
    weekday: weekdaySchema.optional(),
    minutes: minutesOfDay,
  }),
  z.object({
    kind: z.literal('not_after'),
    severity: constraintSeveritySchema,
    weekday: weekdaySchema.optional(),
    minutes: minutesOfDay,
  }),
  z.object({
    kind: z.literal('max_activities_total'),
    severity: constraintSeveritySchema,
    count: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal('max_activities_per_day'),
    severity: constraintSeveritySchema,
    count: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal('budget'),
    severity: constraintSeveritySchema,
    amountCzk: z.number(),
    period: pricePeriodSchema,
  }),
  z.object({
    kind: z.literal('min_travel_buffer'),
    severity: constraintSeveritySchema,
    minutes: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal('require_free_day'),
    severity: constraintSeveritySchema,
    count: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal('category_quota'),
    severity: constraintSeveritySchema,
    category: activityCategorySchema,
    min: z.number().int().optional(),
    max: z.number().int().optional(),
  }),
  z.object({
    kind: z.literal('prefer_session'),
    severity: z.literal('soft'),
    sessionId: z.string(),
  }),
  z.object({
    kind: z.literal('avoid_session'),
    severity: constraintSeveritySchema,
    sessionId: z.string(),
  }),
]);

export const constraintRecordSchema = z.object({
  id: z.string(),
  childId: z.union([z.string(), z.literal('all')]),
  constraint: constraintSchema,
  weight: z.number().int().min(1).max(10),
  origin: z.enum(['user_ui', 'user_chat', 'default']),
  label: z.string(),
});

// ---------- Kalendář výjimek ----------

export const exceptionScopeSchema = z.enum(['national', 'district', 'school']);

export const calendarExceptionSchema = z.object({
  date: isoDate,
  reason: z.string(),
  scope: exceptionScopeSchema,
  districtCode: z.string().optional(),
  // INV-6: source je povinný a neprázdný
  source: z.string().min(1, 'CalendarException.source je povinný'),
});

// ---------- Kompletní stav aplikace ----------

export const namedScheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enrollments: z.array(enrollmentSchema),
  customEntries: z.array(customEntrySchema),
  origin: z.enum(['manual', 'solver', 'duplicated', 'imported']),
  createdAt: z.string(),
});

export const plannerStateSchema = z.object({
  schemaVersion: z.literal(3),
  children: z.array(childSchema),
  schedules: z.array(namedScheduleSchema).min(1),
  activeScheduleId: z.string(),
  constraints: z.array(constraintRecordSchema),
  overrides: z.array(activityOverrideSchema),
  schoolYear: z.object({ start: isoDate, end: isoDate }),
  districtCode: z.string(),
});

// ---------- Katalog jako celek ----------

/** Místo konání — samostatná entita, protože organizátor nemusí učit ve svém sídle. */
export const venueSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: addressSchema,
});

export const catalogSchema = z.object({
  city: z.string(),
  providers: z.array(providerSchema),
  activities: z.array(activitySchema),
  sessionGroups: z.array(sessionGroupSchema),
  venues: z.array(venueSchema).optional(),
});

export const exceptionsFileSchema = z.object({
  schoolYear: z.object({ start: isoDate, end: isoDate }),
  exceptions: z.array(calendarExceptionSchema),
});
