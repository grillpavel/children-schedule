# Tech README: data, jejich struktura a propagace

Datum: 2026-09-01. Rozsah: `packages/domain` (schéma, migrace, doménová logika)
+ `apps/web` (store, autosave, export/import). Doplňuje
[docs/ukladani-dat.md](ukladani-dat.md) (kde přesně data fyzicky žijí) o širší
technický pohled: kompletní tvar dat a *jak přesně tečou* appkou od kliknutí
po uložení a zpět.

## 0. Základní fakt: appka nemá backend

`Rozvrhni` je čistě klientská SPA (Next.js, žádné API routes pro data). Jediný
zdroj pravdy je `PlannerState` — jeden JavaScript objekt, který drží CELÝ stav
jedné rodiny (všechny děti, celý rozvrh, všechny přepisy). Katalog kroužků
(`Catalog`) je naopak **statická, read-only** referenční data zabalená přímo
v buildu appky (`packages/domain/data/`) — nikdy se needituje, nikdy neputuje
přes localStorage/export.

```
Catalog (read-only, v buildu)  +  PlannerState (mutable, v paměti/localStorage)
         │                                    │
         └──────────────┬─────────────────────┘
                         ▼
              derivované view (React hooks)
                         │
                         ▼
                     vykreslení UI
```

## 1. Datový model — kompletní tvar

Jediný zdroj pravdy: [packages/domain/src/model/schema.ts](../packages/domain/src/model/schema.ts)
(Zod schémata). TS typy se z nich odvozují přes `z.infer` v
[types.ts](../packages/domain/src/model/types.ts) — nikdy se typy nepíšou ručně
vedle schématu, aby se nerozjely.

Konvence platné napříč celým modelem:
- čas = minuty od půlnoci (`number`), nikdy `Date`
- den v týdnu = ISO-8601 (`1`=pondělí .. `7`=neděle)
- datum = ISO řetězec `YYYY-MM-DD`
- chybějící hodnota = `undefined`, **nikdy se nedopočítává ani nefabrikuje**
  (věk, uzávěrka přihlášky, `updatedAt` starších souborů apod.)

### 1.1 `PlannerState` — celý stav jedné rodiny

```ts
PlannerState {
  schemaVersion: 10                     // aktuální verze, viz §4 migrace
  children: Child[]                     // VŠECHNY kalendáře (děti) pohromadě
  schedules: NamedSchedule[]            // "varianty" rozvrhu (min. 1)
  activeScheduleId: string              // která varianta je právě aktivní
  constraints: ConstraintRecord[]       // omezení (per-dítě i globální 'all')
  overrides: ActivityOverride[]         // uživatelské přepisy katalogových aktivit
  sessionOverrides: SessionOverride[]   // uživatelské přepisy termínů
  schoolYear: { start: string; end: string }
  districtCode: string                  // okres (svátky/prázdniny)
  revision: number                      // čítač změn (design_review_99.md, CHANGE-106)
  updatedAt?: string                    // ISO čas poslední změny; chybí u starších souborů
}
```

`revision`/`updatedAt` jsou **rodinné, ne per-dítě** — appka je nastavuje při
KAŽDÉM `commit()` (viz §3). Slouží jen jako kontext v potvrzovacím dialogu při
importu (FR-2), nikdy jako rozhodovací podmínka mergu jednoho dítěte (FR-8
srovnává obsah, viz §5) — jinak by dialog naskakoval při každé úpravě
kteréhokoli dítěte v rodině.

### 1.2 `Child` — jeden „kalendář“

```ts
Child {
  id: string; name: string
  birthYear?: number; age?: number          // věk NIKDY nedohadovaný
  interests: ActivityCategory[]             // personalizace doporučení, default []
  availability: AvailabilityWindow[]        // volná časová okna, default []
  budgetMonthlyCzk?: number
  travelBufferMinutes?: number              // per-dítě přesun mezi kroužky
  travelMode?: 'walk' | 'car' | 'transit'
  colorSeed?: string
  schoolEndByWeekday: Record<string, number>
  schoolAddress?: Address
}
```

### 1.3 `NamedSchedule` — jedna „varianta“ (**ne** jedna na dítě!)

```ts
NamedSchedule {
  id: string; name: string
  enrollments: Enrollment[]        // KAŽDÝ záznam nese childId — patří VŠEM dětem najednou
  customEntries: CustomEntry[]     // stejně — vlastní události s childId
  origin: 'manual' | 'solver' | 'duplicated' | 'imported'
  createdAt: string
}
```

**Klíčový bod modelu** (viz [docs/ukladani-dat.md §3](ukladani-dat.md)):
varianta rozvrhu je sdílený kontejner pro VŠECHNY děti současně. Neexistuje
„varianta patřící jednomu dítěti“ — rozlišení je vždy polem `childId` uvnitř
`enrollments`/`customEntries`, ne samostatnou strukturou.

```ts
Enrollment {
  id: string; childId: string
  activityId: string; sessionGroupId: string
  status: 'considering' | 'selected' | 'confirmed'
  pinned: boolean
  sessionIds?: string[]   // částečná docházka — podmnožina Session.id skupiny;
                          // undefined = všechny termíny skupiny (výchozí)
}

CustomEntry {
  id: string; childId: string; name: string
  kind: 'circle' | 'school' | 'doctor' | 'other'   // default 'other', určuje výchozí barvu
  sessions: CustomSession[]   // vlastní termíny (weekday/start/end/validFrom/validTo/…)
  location?: Address; contact?: Contact; price?: Price; note?: string
  colorOverride?: string
}
```

### 1.4 Přepisy nad read-only katalogem

| Typ | Klíč | Rozsah | Poznámka |
|---|---|---|---|
| `ActivityOverride` | `activityId` | **vždy globální** | přepis ceny/adresy/telefonu/barvy kroužku — žádné `childId`, ovlivní všechny děti zapsané do stejné katalogové aktivity |
| `SessionOverride` | `sessionId` (+volitelně `childId`) | globální NEBO per-dítě | bez `childId` = platí pro všechny (CHANGE-74); s `childId` = jen pro to dítě (CHANGE-103 — sdílená položka typu ZŠ „Výuka“, kde má každé dítě jiný reálný rozvrh) |
| `ConstraintRecord` | `id` | per-dítě NEBO `'all'` | `childId: string \| 'all'` |
| `CalendarException` | `date` | `national`/`district`/`school` | jeden ISO den na řádek (ne rozsah — kvůli ICS `EXDATE`) |

### 1.5 Katalog (read-only referenční data)

```ts
Catalog {
  city: string
  providers: Provider[]        // organizátoři (DDM, ZUŠ, škola, …)
  venues?: Venue[]              // místa konání (organizátor ≠ místo)
  activities: Activity[]        // jedna nabízená aktivita
  sessionGroups: SessionGroup[] // varianty docházky jedné aktivity (day/time skupiny)
}
```

`Session.id` je stabilní identifikátor jednoho reálného termínu (den+čas) —
na něj se váže `SessionOverride`. `Activity.id` je stabilní identifikátor
napříč katalogem — na něj se váže `ActivityOverride` i `Enrollment.activityId`.

### 1.6 Export — obálka rozlišující rozsah (design_review_99.md, CHANGE-106)

```ts
ExportEnvelope =
  | { exportType: 'family'; exportVersion: 1; data: PlannerState }
  | {
      exportType: 'single-child'; exportVersion: 1
      childId: string
      sourceUpdatedAt?: string        // snímek PlannerState.updatedAt v okamžiku exportu
      data: SingleChildExportPayload
    }

SingleChildExportPayload {
  child: Child
  enrollments: Enrollment[]       // jen s childId rovným vybranému dítěti
  customEntries: CustomEntry[]    // stejně
  overrides: ActivityOverride[]           // jen ty, jejichž activityId dítě používá
  sessionOverrides: SessionOverride[]     // globální (pro sessionId dítěte) + jeho vlastní per-dítě
}
```

Starší/holý `.json` (bez `exportType` — všechno před CHANGE-106) se při
importu zpětně kompatibilně považuje za `family`. Podrobná logika mergu
`single-child` importu je v §5.

## 2. Kde přesně data žijí (3 nezávislé cesty)

| Cesta | Mechanismus | Soubor |
|---|---|---|
| Autosave | `localStorage` klíč `krouzky:autosave:v1` | [autosave.ts](../apps/web/src/lib/autosave.ts) |
| Export/import souboru | `ExportEnvelope` `.json` ke stažení/nahrání | [exportClient.ts](../apps/web/src/lib/exportClient.ts), [Toolbar.tsx](../apps/web/src/components/Toolbar.tsx) |
| Sdílený odkaz | URL fragment `#share=…` (gzip + base64url) | [shareLink.ts](../apps/web/src/lib/shareLink.ts) |

Všechny tři cesty přenášejí stejnou strukturu (`PlannerState`, resp. od
CHANGE-106 obalenou v `ExportEnvelope` pro soubor) — nikdy neputují na server,
appka žádný nemá.

## 3. Jak data PROPAGUJÍ appkou — zápis (write path)

Zdroj: [plannerStore.ts](../apps/web/src/store/plannerStore.ts) (Zustand +
immer middleware).

```
uživatelská akce (klik, form submit)
  → store akce (např. enrollGroup, setActivityOverride, addChild)
    → commit(mutate, after?)
        1. history.push(current(state))     // snapshot PŘED mutací → undo
        2. future = []                       // nová větev historie → redo se zahodí
        3. mutate(draft: PlannerState)       // immer draft — přímé mutace čitelné jako JS
        4. state.revision += 1               // VŽDY, i pro merge/import (design_review_99.md)
        5. state.updatedAt = new Date().toISOString()
        6. after?.(store)                    // ephemerální pole MIMO PlannerState:
                                              //   - store.catalog (přepočet po session override)
                                              //   - store.activeChildId (přepnutí po addChild/merge)
                                              //   - store.lastActionLabel (toast text)
  → Zustand notifikuje VŠECHNY subscribery (React hooky i ruční subscribe)
    → komponenty čtoucí usePlannerStore(s => …) se re-renderují
    → usePlannerStore.subscribe(…) v page.tsx spustí saveAutosave(s.state)
      → localStorage.setItem('krouzky:autosave:v1', serializePlannerState(state))
```

**Klíčový architektonický bod** (CHANGE-74): `store.catalog` je ODVOZENÉ pole,
ne surová konstanta — přepočítá se `applySessionOverrides(NOVE_STRASECI_CATALOG,
state.sessionOverrides)` po každé změně `sessionOverrides` (i po `loadState`/
`hydrate`/mergi). Protože KAŽDÁ komponenta čte časy termínů přes
`usePlannerStore(s => s.catalog)`, ne přes syrovou konstantu, oprava se dělá
JEDNOU na jednom místě a propaguje se do katalogu, mřížky, konfliktů, ICS
exportu i doporučení bez nutnosti provlékat `sessionOverrides` jako parametr
skrz 5+ doménových funkcí.

## 4. Jak data PROPAGUJÍ appkou — čtení (read path)

```
usePlannerStore(s => s.state) + usePlannerStore(s => s.catalog)
  → useScheduleView() (hooks/useScheduleView.ts)
      buildCatalogIndex(catalog)                    // rychlé vyhledávání activity/group/session
      resolvePlacedSessions(schedule, catalog, …)    // Enrollment/CustomEntry → konkrétní Block[]
      detectConflicts(…)                             // H1..H10 pravidla → Conflict[]
      scheduleSummary(…)                              // agregace (náklady, obsazenost týdne)
  → ScheduleGrid / CatalogPanel / DetailsPanel / HomeScreen
      čtou VÝSLEDEK hooků (Block[], Conflict[], ScheduleSummary), nikdy
      neprovádí vlastní výpočet nad syrovým PlannerState
```

Všechny domain funkce (`resolvePlacedSessions`, `detectConflicts`,
`scheduleSummary`, `generateIcs`, `buildRecommendations`, …) jsou **čisté** —
berou `(schedule, catalog, …)` jako parametry, nemají žádný vlastní stav.
`useScheduleView` je jediné místo, kde se tyto čisté funkce zavolají a výsledek
zabalí do `useMemo` — proto přidání nového pole do `Child`/`Enrollment` nikdy
nevyžaduje měnit víc než tuto jednu vrstvu (plus samotné schéma).

## 5. Import: family vs. single-child (design_review_99.md, CHANGE-106)

```
soubor .json
  → parseExportEnvelope(JSON.parse(text))   (state/io.ts)
      - bez pole `exportType` → obal jako { exportType:'family', data: migrateToCurrent(input) }
      - exportType:'family'   → migrateToCurrent(data) uvnitř obálky
      - exportType:'single-child' → zod validace SingleChildExportPayload (bez migrace —
        payload nemá vlastní schemaVersion, nese ho jen obálka rodiny)
  → Toolbar.importJson() rozhodne podle exportType:

    'family' ─────────────────────────────────────────────► VŽDY dialog „Potvrdit import“
        │  (FR-2 — NIKDY tiché, i kdyby byl obsah identický; ukazuje počet dětí + updatedAt obou stran)
        └─ potvrzeno → loadState(data)  (plný přepis CELÉHO PlannerState)

    'single-child' → mergeSingleChildImport(state, payload, catalog)  (export-merge.ts, ČISTÁ fce)
        │
        ├─ payload.child.id NENÍ v state.children     → resolution 'new-child'
        ├─ JE, ale existingChild.name ≠ payload.child.name
        │     (srážka dvou nezávisle vzniklých „child-1“, viz §0.2 spec)  → 'name-mismatch'
        ├─ JE, jméno sedí, obsah (enrollments/customEntries/per-dítě
        │     sessionOverrides) KANONICKY shodný s aktuálním stavem       → 'silent'
        └─ JE, jméno sedí, obsah se liší                                  → 'content-differs'
        │
        └─ (mimo hlavní rozhodnutí) enrollments odkazující na SMAZANOU
              katalogovou položku (activityId/sessionGroupId) se PŘESKOČÍ,
              appka po dokončení ukáže varování se jmény vynechaných (FR-7)

  'silent' → rovnou applySingleChildMerge(nextState, childId)  (žádný dialog)
  jinak    → dialog „Potvrdit import“ s textem podle resolution
             → po potvrzení stejné applySingleChildMerge(nextState, childId)

applySingleChildMerge (plannerStore.ts) přes commit():
  - nahradí JEN draft.children / draft.schedules[activní].enrollments+customEntries / draft.sessionOverrides
  - NIKDY se nedotkne ostatních dětí, globálních overrides, ostatních variant rozvrhu
  - after: přepočet store.catalog, store.activeChildId = childId (přepne na sloučené dítě)
```

### 5.1 Kanonické porovnání obsahu (FR-8) — proč ne `JSON.stringify`

`canonicalize()` ([export-merge.ts](../packages/domain/src/state/export-merge.ts))
je obecný, na jménech polí NEZÁVISLÝ rekurzivní tree-walk — řadí KAŽDÉ pole na
libovolné hloubce podle jeho TVARU (objekty se stabilním `id` → podle id;
primitiva → podle hodnoty; objekty bez `id` → podle `JSON.stringify` fallbacku),
objekty samotné neřadí podle klíčů. Teprve na takto kanonizovaných hodnotách
běží `deepEqual` (necitlivá na pořadí klíčů objektu). Naivní `JSON.stringify`
rovnost by byla citlivá na (a) pořadí prvků v poli změněné nesouvisející
editací jinde ve stavu, (b) pořadí klíčů objektu po zod parse — obojí by
vyvolávalo falešné „liší se“ poplachy.

## 6. Multi-child model — shrnutí

- `addChild()`/`removeChild()` mutují SDÍLENÉ pole `children`, nevytváří nový
  `NamedSchedule`. `removeChild()` prochází VŠECHNY `schedules` (ne jen
  aktivní variantu) a z každé cascade-smaže `enrollments`/`customEntries`
  daného dítěte.
- `activeChildId` je pole STORE (Zustand), **není** součástí `PlannerState` —
  nikdy se neukládá do JSON/localStorage/URL. Po `loadState`/`hydrate`/mergi
  se vždy nastaví na `state.children[0]?.id`, resp. (jen u single-child mergu)
  na právě sloučené dítě.
- Export do `.json` (FR-3, CHANGE-106) je od teď volitelný — buď celá rodina,
  nebo jedno vybrané dítě (dialog při „Uložit“ nabízí obojí, výchozí = aktivní
  dítě). Export do `.ics` byl per-dítě odjakživa (`generateIcs`), CHANGE-106
  navíc přidal `generateFamilyIcs()` — jeden sdílený soubor pro všechny děti,
  `UID` odvozený z `enrollment.id`/`customEntry.id` (nikdy z
  `activityId`+`sessionGroupId`, protože dvě děti běžně sdílí stejnou
  katalogovou aktivitu → kolize by smazala jednu z událostí v cílové appce).

## 7. Migrace schémat (schemaVersion 1→10)

Řetězová migrace `migrateToCurrent()` v
[state/io.ts](../packages/domain/src/state/io.ts) — každý starý
soubor/localStorage záznam se před zod validací postupně převede na aktuální
verzi. Většina kroků je čistý bump verze + zodí default, žádná destruktivní
transformace:

| v→v | Co přibylo |
|---|---|
| 1→2 | `biweekly.parity` → `everyWeeks: 2` |
| 2→3 | prázdné `overrides` |
| 3→4 | `Child.interests`/`availability` |
| 4→5 | `CustomEntry.kind` (default `'other'`) |
| 5→6 | `Child.travelBufferMinutes`/`travelMode` |
| 6→7 | `ActivityOverride.allowOnHolidays` |
| 7→8 | `sessionOverrides: []` |
| 8→9 | `Enrollment.sessionIds` |
| 9→10 | `revision: 0` (`updatedAt` se NEDOPLŇUJE — zůstává `undefined` u starších souborů) |

## 8. Kam se podívat dál

- [docs/ukladani-dat.md](ukladani-dat.md) — kde přesně data fyzicky žijí,
  detailní scénáře 1/2/N dětí.
- [.github/specs/design_review_99.md](../.github/specs/design_review_99.md) —
  plné odůvodnění FR-1..FR-8 (export typy, bezpečný merge, kanonizace).
- [packages/domain/src/state/export-merge.ts](../packages/domain/src/state/export-merge.ts) —
  implementace mergu/kanonizace, čistá bez vedlejších efektů, plně pokrytá
  `export-merge.test.ts`.
- [apps/web/src/store/plannerStore.ts](../apps/web/src/store/plannerStore.ts) —
  jediné místo, kudy prochází KAŽDÁ mutace stavu (`commit()`).
