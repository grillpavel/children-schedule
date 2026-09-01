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
  'drama',
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
  /** Cílová skupina podle pohlaví (např. „Basketbal — chlapci“) — nezadáno = smíšené/
   * bez omezení. Nikdy neuhádnuto: doplňuje se jen tam, kde už je to v názvu/popisu
   * katalogu čitelně uvedeno. */
  targetGender: z.enum(['boys', 'girls']).optional(),
  price: priceSchema,
  capacity: z.number().int().optional(),
  description: z.string().optional(),
  requiresEquipment: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  /** Odkaz na přihlášku (C8-D5); fallback na `sourceUrl`/web poskytovatele. */
  applicationUrl: z.string().url().optional(),
  /** Uzávěrka přihlášek `YYYY-MM-DD` (C8-D5); chybí = neznámá. */
  applicationDeadline: isoDate.optional(),
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

/**
 * Uživatelský přepis času jedné katalogové Session (design_review_69.md) — katalog
 * nemusí odrážet aktuální stav (změna tréninkového času apod.), klíčem je `sessionId`.
 * Efektivní hodnota = `override ?? katalog` (viz `effectiveSession()`).
 *
 * `childId` (design_review_96.md, CHANGE-103): chybí-li, přepis platí GLOBÁLNĚ pro
 * všechny zapsané děti (zpětně kompatibilní, hodí se pro kroužek vedený jedním
 * poskytovatelem, kde všichni přihlášení chodí na stejný opravený čas). Je-li
 * vyplněný, platí jen pro TOTO dítě — nutné pro sdílené katalogové položky typu
 * ZŠ „Výuka" (CHANGE-98), kde každé dítě má ve skutečnosti svůj vlastní rozvrh.
 */
export const sessionOverrideSchema = z
  .object({
    sessionId: z.string(),
    childId: z.string().optional(),
    weekday: weekdaySchema.optional(),
    startMinutes: minutesOfDay.optional(),
    endMinutes: minutesOfDay.optional(),
  })
  .refine(
    (s) =>
      s.startMinutes === undefined ||
      s.endMinutes === undefined ||
      s.startMinutes < s.endMinutes,
    { message: 'startMinutes musí být menší než endMinutes', path: ['startMinutes'] },
  );

// ---------- Uživatelský stav (jen v paměti) ----------

/** Časové okno dostupnosti dítěte (personalizace, CHANGE-45). */
export const availabilityWindowSchema = z
  .object({
    weekday: weekdaySchema,
    startMinutes: minutesOfDay,
    endMinutes: minutesOfDay,
  })
  .refine((w) => w.startMinutes < w.endMinutes, {
    message: 'startMinutes musí být menší než endMinutes',
    path: ['startMinutes'],
  });

export const childSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthYear: z.number().int().optional(),
  // Neznámý výchozí stav (design_review_88.md) — nikdy se nativně nevyplňuje
  // vymyšleným číslem; `undefined` = věk neznámý, věkové kritium se při
  // doporučování/filtraci vynechá (stejně jako prázdné zájmy/dostupnost).
  age: z.number().int().min(3).max(19).optional(),
  // Personalizační vstupy pro doporučovací engine (CHANGE-45); prázdné = neutrální.
  interests: z.array(activityCategorySchema).default([]),
  availability: z.array(availabilityWindowSchema).default([]),
  budgetMonthlyCzk: z.number().optional(),
  // Per-dítě nastavení přesunu (BL-038, design_review_67.md) — nezadáno = globální
  // výchozí hodnoty (`DEFAULT_TRAVEL_BUFFER_MIN`, mód `'car'`) v H9 detekci.
  travelBufferMinutes: z.number().int().min(0).max(120).optional(),
  travelMode: z.enum(['walk', 'car', 'transit']).optional(),
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
  /** Podmnožina `SessionGroup.sessions[].id` — dítě chodí jen na NĚKTERÉ z termínů
   * skupiny (např. skupina má pondělí+středu, dítě jen na pondělí). `undefined`
   * (výchozí, zpětně kompatibilní) = všechny termíny skupiny, stejné chování jako
   * před tímto polem. */
  sessionIds: z.array(z.string()).optional(),
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
  /** Předvolený typ vlastní události (CHANGE-63, FR-4) — určuje výchozí barvu/ikonu,
   * pokud uživatel nezvolí vlastní přes `colorOverride`. */
  kind: z.enum(['circle', 'school', 'doctor', 'other']).default('other'),
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
  /** Soukromá poznámka rodiče ke kroužku (uživatelská vrstva, neověřená). */
  note: z.string().optional(),
  /** Datum poslední úpravy `YYYY-MM-DD` (C8-E3). */
  editedAt: isoDate.optional(),
  /** Podpis katalogových hodnot v době úpravy — pro detekci změny zdroje (C8-E3). */
  baseSignature: z.string().optional(),
  /** Povolí generování/vykreslení výskytu i o školních prázdninách a státních svátcích
   * (design_review_68.md FR-2); výchozí `undefined`/`false` = potlačit. */
  allowOnHolidays: z.boolean().optional(),
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
  schemaVersion: z.literal(10),
  children: z.array(childSchema),
  schedules: z.array(namedScheduleSchema).min(1),
  activeScheduleId: z.string(),
  constraints: z.array(constraintRecordSchema),
  overrides: z.array(activityOverrideSchema),
  sessionOverrides: z.array(sessionOverrideSchema),
  schoolYear: z.object({ start: isoDate, end: isoDate }),
  districtCode: z.string(),
  /** Monotónně rostoucí čítač změn (design_review_99.md, CHANGE-106) — inkrementuje
   * se při každém `commit()` v app store. Slouží k odhalení "toto NENÍ nejnovější
   * stav" před tichým přepsáním při importu (FR-2); NENÍ vhodný pro per-dítě
   * rozhodnutí (viz FR-8 — na to slouží obsahové porovnání, ne tento čítač). */
  revision: z.number().int().nonnegative().default(0),
  /** ISO čas poslední změny (design_review_99.md) — appka (ne doména) ho nastavuje
   * při každém `commit()`. Chybí-li (starší/migrovaný soubor), zůstává `undefined` —
   * nikdy se nedopočítává ani nefabrikuje aktuální čas (Pravidlo #1 tohoto repa). */
  updatedAt: z.string().optional(),
});

// ---------- Export jednoho dítěte / celé rodiny (design_review_99.md, CHANGE-106) ----------

/** Obsah exportu „Toto dítě" (FR-4) — podmnožina `PlannerState` patřící jednomu
 * dítěti + katalogové přepisy, které se ho týkají. Na rozdíl od `PlannerState`
 * nemá vlastní `schemaVersion` — obaluje ho `exportEnvelopeSchema`, který nese
 * verzi celé obálky (`exportVersion`), ne dat uvnitř. */
export const singleChildExportPayloadSchema = z.object({
  child: childSchema,
  enrollments: z.array(enrollmentSchema),
  customEntries: z.array(customEntrySchema),
  overrides: z.array(activityOverrideSchema),
  sessionOverrides: z.array(sessionOverrideSchema),
});

/**
 * Obálka rozlišující typ exportu (FR-3) — `family` je dnešní celorodinný export
 * (zpětně kompatibilní i BEZ obálky, viz `parseImportedFile` ve `state/io.ts`),
 * `single-child` nese jen data jednoho dítěte + `sourceUpdatedAt` (snímek
 * `PlannerState.updatedAt` v okamžiku exportu, JEN jako doplňkový kontext v
 * potvrzovacím dialogu při zpětném importu — FR-8, NIKDY jako rozhodovací
 * podmínka mergu).
 */
export const exportEnvelopeSchema = z.discriminatedUnion('exportType', [
  z.object({
    exportType: z.literal('family'),
    exportVersion: z.literal(1),
    data: plannerStateSchema,
  }),
  z.object({
    exportType: z.literal('single-child'),
    exportVersion: z.literal(1),
    childId: z.string(),
    sourceUpdatedAt: z.string().optional(),
    data: singleChildExportPayloadSchema,
  }),
]);

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
