# 01 — Doménový model

Balíček: `packages/domain` — čistý TypeScript, **žádné závislosti na React, síti ani LLM**.

---

## 1. Tři úrovně: Activity → SessionGroup → Session

Toto je nejdůležitější rozhodnutí celého modelu a **dvě úrovně nestačí**.

- **Activity** = kroužek jako takový („Keramika pro začátečníky")
- **SessionGroup** = jedna nabízená varianta docházky — *alternativa*
- **Session** = konkrétní termín („úterý 16:00–17:00, ateliér A, lektorka Nováková")

Vztahy:
- Activity má **1..N** SessionGroups → rodič/solver **vybírá právě jednu** (nebo žádnou)
- SessionGroup má **1..N** Sessions → **všechny se konají**, jsou nedělitelný balík

Bez střední úrovně nelze vyjádřit kroužek, který se koná dvakrát týdně,
a solver by u florbalu umístil jen jeden trénink ze dvou.

```
Activity "Keramika"              Activity "Florbal"        Activity "Plavání"
 ├─ Group g1  ← vybrat jednu      └─ Group g1               ├─ Group g1
 │   └─ Po 15:00–16:00                ├─ Po 16:00–17:00     │   ├─ Po 16:00
 ├─ Group g2                          └─ St 16:00–17:00     │   └─ St 16:00
 │   └─ Út 16:00–17:00                   ↑ obojí povinně    ├─ Group g2
 └─ Group g3                                                │   ├─ Út 16:00
     └─ Čt 16:30–17:30                                      │   └─ Čt 16:00
                                                             ↑ alternativní dvojice
```

Nejčastější případ (jednoduchý kroužek s jedním termínem) je
`1 Activity → 1 Group → 1 Session`. Model se tím nekomplikuje — jen umožňuje
zbylé dva případy vůbec vyjádřit.

**Důsledek pro solver:** doménou proměnné je `SessionGroup`, ne `Session`.
**Důsledek pro UI:** kliknutím se vybírá skupina; v mřížce se rozsvítí
všechny její Sessions najednou.

## 2. Typy

```ts
// ---------- Katalog (statický, read-only za běhu) ----------

export type ProviderKind = 'ddm' | 'zus' | 'sport_club' | 'school' | 'private' | 'other';

export interface Provider {
  id: string;                    // stabilní slug, např. "ddm-nove-strasesi"
  name: string;
  kind: ProviderKind;
  address: Address;
  contact: Contact;
  website?: string;
  note?: string;
}

export interface Address {
  street: string;
  city: string;
  zip?: string;
  lat?: number;                  // pro výpočet přesunu; pokud chybí, přesun se nevyhodnocuje
  lon?: number;
}

export interface Contact {
  personName?: string;
  email?: string;
  phone?: string;
}

export type ActivityCategory =
  | 'sport' | 'art' | 'music' | 'dance' | 'language'
  | 'science_tech' | 'crafts' | 'scouting' | 'other';

export interface Activity {
  id: string;
  providerId: string;
  name: string;
  category: ActivityCategory;
  ageMin: number;                // včetně
  ageMax: number;                // včetně
  price: Price;
  capacity?: number;             // null = neuvedeno, NIKDY neodhadovat
  description?: string;
  requiresEquipment?: string;
  sourceUrl?: string;            // odkud kurátor data vzal — povinné pro auditovatelnost
  lastVerifiedAt: string;        // ISO date, kdy člověk naposledy ověřil
}

export type PricePeriod = 'per_semester' | 'per_year' | 'per_month' | 'per_session';

export interface Price {
  amount: number;                // CZK
  period: PricePeriod;
  note?: string;                 // např. "sourozenecká sleva 10 %"
}

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;   // ISO-8601, 1 = pondělí

/**
 * Jedna nabízená varianta docházky. Alternativy vůči sobě navzájem.
 * Všechny Sessions uvnitř skupiny se konají — je to nedělitelný balík.
 */
export interface SessionGroup {
  id: string;
  activityId: string;
  label?: string;                // "Úterky" / "Skupina A"; UI generuje z časů, pokud chybí
  sessions: Session[];           // 1..N, VŠECHNY povinné
}

export interface Session {
  id: string;
  groupId: string;
  weekday: Weekday;
  startMinutes: number;          // minuty od půlnoci, 16:00 => 960
  endMinutes: number;
  locationOverride?: Address;    // pokud se koná jinde než v sídle poskytovatele
  instructor?: string;
  validFrom: string;             // ISO date
  validTo: string;               // ISO date
  biweekly?: { parity: 'even' | 'odd' };  // sudý/lichý týden; jinak týdně
}

// ---------- Uživatelský stav (jen v paměti) ----------

export interface Child {
  id: string;
  name: string;                  // slouží i jako název kalendáře, např. "Julinka"
  birthYear?: number;
  age: number;
  colorSeed?: string;            // pro odlišení dětí v UI
  schoolEndByWeekday: Partial<Record<Weekday, number>>;  // minuty od půlnoci
  schoolAddress?: Address;
}

export type EnrollmentStatus = 'considering' | 'selected' | 'confirmed';

export interface Enrollment {
  id: string;
  childId: string;
  activityId: string;
  sessionGroupId: string;        // zvolená varianta docházky (ne jednotlivý termín)
  status: EnrollmentStatus;
  pinned: boolean;               // true = solver s tím nesmí hýbat
}

/**
 * Ručně zadaná událost, která není v katalogu.
 * Logopedie, ortodontista, babička ve čtvrtek, kroužek v sousední obci.
 * Katalog nikdy nebude úplný — bez tohoto rozvrh neodpovídá realitě
 * a export je k ničemu.
 */
export interface CustomEntry {
  id: string;
  childId: string;
  name: string;
  sessions: Omit<Session, 'groupId'>[];
  location?: Address;
  contact?: Contact;
  price?: Price;
  note?: string;
  colorOverride?: string;
}

// ---------- Omezení ----------

export type ConstraintSeverity = 'hard' | 'soft';

export type Constraint =
  | { kind: 'no_activities_on';        severity: ConstraintSeverity; weekdays: Weekday[] }
  | { kind: 'not_before';              severity: ConstraintSeverity; weekday?: Weekday; minutes: number }
  | { kind: 'not_after';               severity: ConstraintSeverity; weekday?: Weekday; minutes: number }
  | { kind: 'max_activities_total';    severity: ConstraintSeverity; count: number }
  | { kind: 'max_activities_per_day';  severity: ConstraintSeverity; count: number }
  | { kind: 'budget';                  severity: ConstraintSeverity; amountCzk: number; period: PricePeriod }
  | { kind: 'min_travel_buffer';       severity: ConstraintSeverity; minutes: number }
  | { kind: 'require_free_day';        severity: ConstraintSeverity; count: number }
  | { kind: 'category_quota';          severity: ConstraintSeverity; category: ActivityCategory; min?: number; max?: number }
  | { kind: 'prefer_session';          severity: 'soft';             sessionId: string }
  | { kind: 'avoid_session';           severity: ConstraintSeverity; sessionId: string };

export interface ConstraintRecord {
  id: string;
  childId: string | 'all';
  constraint: Constraint;
  weight: number;                // pouze pro soft; 1..10
  origin: 'user_ui' | 'user_chat' | 'default';
  label: string;                 // lidsky čitelný popis pro UI, generuje se z constraintu
}

// ---------- Kalendář výjimek ----------

export type ExceptionScope = 'national' | 'district' | 'school';

export interface CalendarException {
  date: string;                  // ISO date, YYYY-MM-DD
  reason: string;                // "Státní svátek — Den české státnosti"
  scope: ExceptionScope;
  districtCode?: string;         // NUTS/LAU kód okresu, jen pro scope='district'
  source: string;                // URL nebo označení zdroje — POVINNÉ
}

// ---------- Kompletní stav aplikace ----------

/**
 * Pojmenovaný rozvrh. Rodič si jich může držet víc vedle sebe
 * ("Varianta A", "Kdyby vyšlo plavání") a přepínat mezi nimi.
 * Varianty ze solveru se ukládají sem, ne do překryvného diffu.
 */
export interface NamedSchedule {
  id: string;
  name: string;
  enrollments: Enrollment[];
  customEntries: CustomEntry[];
  origin: 'manual' | 'solver' | 'duplicated' | 'imported';
  createdAt: string;
}

export interface PlannerState {
  schemaVersion: 1;
  children: Child[];
  schedules: NamedSchedule[];
  activeScheduleId: string;
  constraints: ConstraintRecord[];   // sdílené napříč variantami
  schoolYear: { start: string; end: string };
  districtCode: string;
}
```

## 3. Odvozené typy (výstupy výpočtů, nikdy se neserializují jako vstup)

```ts
export type ConflictKind =
  | 'time_overlap'
  | 'age_out_of_range'
  | 'travel_infeasible'
  | 'school_not_finished'
  | 'capacity_unknown'
  | 'budget_exceeded'
  | 'constraint_violated';

export interface Conflict {
  kind: ConflictKind;
  severity: 'hard' | 'soft';
  enrollmentIds: string[];
  message: string;               // česky, konkrétně, s čísly
  suggestion?: string;
}

export interface ScheduleVariant {
  id: string;
  enrollments: Enrollment[];
  score: number;
  satisfiedSoft: string[];       // ConstraintRecord.id
  violatedSoft: string[];
  tradeoffSummary: string;       // generuje se deterministicky ze scoringu, ne LLM
  totalCostCzk: number;
}
```

## 4. Invarianty (musí platit vždy, testuje se)

- `INV-1` Každý `Enrollment.sessionGroupId` odkazuje na SessionGroup, jejíž
  `activityId` se rovná `Enrollment.activityId`.
- `INV-1b` Každá SessionGroup má alespoň jednu Session.
- `INV-2` Pro jedno dítě a jednu Activity existuje v rámci jednoho
  `NamedSchedule` **nejvýše jeden** Enrollment se stavem `selected`
  nebo `confirmed`.
- `INV-2b` `activeScheduleId` odkazuje na existující `NamedSchedule`;
  `schedules` je vždy neprázdné.
- `INV-3` `Session.startMinutes < Session.endMinutes`, obojí v rozsahu `0..1440`.
- `INV-4` `Activity.ageMin <= Activity.ageMax`.
- `INV-5` Katalog je za běhu **immutable**. Žádná UI ani chat akce ho nemění.
- `INV-6` Každá `CalendarException` má neprázdný `source`.

## 5. Zásada o chybějících datech

> **Chybějící hodnota se modeluje jako `undefined`, nikdy se nedoplňuje odhadem.**

Pokud web poskytovatele neuvádí kapacitu, cena je „dle dohody" nebo chybí adresa,
uloží se `undefined` a UI zobrazí „neuvedeno". Scraper ani LLM nesmí dopočítávat,
odhadovat ani interpolovat. Solver s chybějícími daty pracuje tak, že příslušné
omezení **nevyhodnocuje** (a označí to ve výstupu), nikdy je neaproximuje.
