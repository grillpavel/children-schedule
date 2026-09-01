# Analýza: ukládání dat kalendářů v Rozvrhni

Datum: 2026-09-01
Rozsah: `packages/domain` (schéma, migrace) + `apps/web` (store, autosave, export)

## 1. Kde data žijí — tři nezávislé cesty

| Cesta | Mechanismus | Soubor | Kdy se použije |
|---|---|---|---|
| **Autosave** | `localStorage` klíč `krouzky:autosave:v1` | [apps/web/src/lib/autosave.ts](../apps/web/src/lib/autosave.ts) | automaticky při každé změně (subscribe na store) |
| **Export/import souboru** | stažení/nahrání `.json` | `downloadStateJson`/`importJson` v [Toolbar.tsx](../apps/web/src/components/Toolbar.tsx) | tlačítka „Uložit“/„Otevřít“ |
| **Sdílený odkaz** | URL fragment `#share=...` (gzip + base64url) | [apps/web/src/lib/shareLink.ts](../apps/web/src/lib/shareLink.ts) | „Sdílet odkaz na rozvrh“ |

Aplikace **nemá backend** — všechny tři cesty ukládají/přenášejí **stejnou strukturu**, `PlannerState`, jen jinak zabalenou (surový JSON do localStorage/souboru, gzip+base64url do URL fragmentu, který se nikdy neposílá na server).

## 2. Přesná struktura `PlannerState`

Zdroj pravdy: [packages/domain/src/model/schema.ts](../packages/domain/src/model/schema.ts) (Zod), TS typy se z něj odvozují v `types.ts`.

```ts
PlannerState {
  schemaVersion: 9                        // aktuální verze, viz migrace níž
  children: Child[]                       // VŠECHNY kalendáře (děti) pohromadě
  schedules: NamedSchedule[]               // "varianty" rozvrhu (min. 1)
  activeScheduleId: string                 // která varianta je právě aktivní
  constraints: ConstraintRecord[]           // omezení (per-child i globální)
  overrides: ActivityOverride[]             // uživatelské přepisy katalogových aktivit
  sessionOverrides: SessionOverride[]       // uživatelské přepisy termínů
  schoolYear: { start: string; end: string }
  districtCode: string                     // okres (svátky/prázdniny)
}
```

### `Child` (jeden „kalendář“)

```ts
Child {
  id, name
  birthYear?, age?              // věk NIKDY nedohadovaný, undefined = neznámý
  interests: []                 // personalizace doporučení
  availability: []              // volné časové okna
  budgetMonthlyCzk?
  travelBufferMinutes?, travelMode?   // per-dítě přesun mezi kroužky
  colorSeed?
  schoolEndByWeekday: {}         // konec školy podle dne
  schoolAddress?
}
```

### `NamedSchedule` (jedna „varianta“ — **ne** jedna na dítě!)

```ts
NamedSchedule {
  id, name
  enrollments: Enrollment[]       // KAŽDÝ záznam má childId — patří VŠEM dětem najednou
  customEntries: CustomEntry[]    // stejně — vlastní události s childId
  origin: 'manual'|'solver'|'duplicated'|'imported'
  createdAt
}
```

**Klíčový bod:** varianta rozvrhu (co v UI vidíte jako záložky „Varianta A/B“) je sdílený kontejner pro **všechny děti současně**. Zápis do rozvrhu (`Enrollment`) i vlastní událost (`CustomEntry`) nesou vlastní `childId` — nerozlišuje se tabulkou/souborem na dítě, ale polem uvnitř jednoho pole záznamů.

## 3. Jak to funguje pro 1 / 2 / N dětí

### Jedno dítě
- `children = [child-1]`, `activeChildId` (viz níž) na něj vždy ukazuje.
- `enrollments`/`customEntries` mají všechny `childId: 'child-1'`.
- Export `.ics` → jeden soubor (`Toolbar.tsx exportIcs()`).

### Dvě a víc dětí
- `addChild()` ([plannerStore.ts:672](../apps/web/src/store/plannerStore.ts)) přidá nový `Child` do **stejného** pole `children` a přepne `activeChildId` na něj — **nevytváří** nový `NamedSchedule`.
- Zápisy do rozvrhu pro různé děti **žijí ve stejné variantě** vedle sebe, rozlišené `childId`. UI (`ScheduleGrid`) je filtruje podle `activeChildId` (a volitelně přimíchá i „sourozence“ přes `showFamily`).
- `removeChild(childId)` ([plannerStore.ts:694](../apps/web/src/store/plannerStore.ts)) prochází **VŠECHNY** `schedules` (ne jen aktivní variantu) a z každé odstraní `enrollments`/`customEntries` daného dítěte — cascade delete napříč všemi variantami.
- **Export .ics zůstává per-dítě**: „Kalendář (.ics)“ exportuje jen aktivní dítě; „Kalendář — všechny děti (.ics)“ vygeneruje N samostatných souborů (jeden `generateIcs()` volání na dítě, filtrující `enrollments`/`customEntries` podle `childId`).
- **Uložení/JSON export je ale VŽDY celý stav najednou** — jeden `.json` soubor obsahuje všechny děti i všechny varianty současně. Není možné exportovat/uložit „jen jedno dítě“ do JSON (jen do .ics).

### Varianty (NamedSchedule) vs. děti — nezaměňovat
„Přidat kalendář“ (dítě) ≠ „Nový“ (varianta). Druhé vytvoří **kopii** aktuální varianty (`duplicateSchedule`) se VŠEMI dětmi uvnitř — používá se třeba pro „co kdyby“ scénář celé rodiny, ne pro oddělení dětí od sebe.

## 4. Co je a není globální

| Pole | Rozsah | Poznámka |
|---|---|---|
| `overrides` (ActivityOverride) | **vždy globální** — klíč jen `activityId`, žádné `childId` | úprava ceny/adresy/barvy kroužku ovlivní všechny děti zapsané do stejné katalogové aktivity |
| `sessionOverrides` (SessionOverride) | **globální NEBO per-dítě** — `childId?` volitelné | bez `childId` = platí pro všechny (CHANGE-74); s `childId` = jen pro to dítě (CHANGE-103, kvůli sdíleným položkám typu ZŠ „Výuka“, kde má každé dítě jiný reálný rozvrh) |
| `constraints` (ConstraintRecord) | per-dítě NEBO `'all'` | `childId: string \| 'all'` |
| `Child.travelBufferMinutes/travelMode` | vždy per-dítě | žádný sdílený default kromě fallbacku v H9 detekci kolizí |

## 5. `activeChildId` — NENÍ součástí uloženého stavu

`activeChildId` je pole store**u** (Zustand), ne `PlannerState`. Nikdy se neukládá do JSON/localStorage/URL. Při `loadState`/`hydrate` (otevření souboru, obnova autosave, dekódování odkazu) se vždy nastaví na **první dítě v poli** (`state.children[0]?.id`) — takže po refreshi stránky se výběr aktivního dítěte nepamatuje, jen vlastní data.

## 6. Migrace schémat (schemaVersion 1→9)

Řetězová migrace v [packages/domain/src/state/io.ts](../packages/domain/src/state/io.ts) `migrateToCurrent()` — každý starý soubor/localStorage záznam se před validací postupně převede na aktuální verzi:

| v→v | Co přibylo |
|---|---|
| 1→2 | `biweekly.parity` → `everyWeeks: 2` |
| 2→3 | prázdné `overrides` |
| 3→4 | `Child.interests`/`availability` (defaulty ze schématu) |
| 4→5 | `CustomEntry.kind` (default `'other'`) |
| 5→6 | `Child.travelBufferMinutes`/`travelMode` (volitelné) |
| 6→7 | `ActivityOverride.allowOnHolidays` (volitelné) |
| 7→8 | `sessionOverrides: []` |
| 8→9 | `Enrollment.sessionIds` (volitelné) |

Většina kroků je jen bump verze + zodí default — žádná destruktivní transformace dat.

## 7. Shrnutí modelu jednou větou

**Jeden JSON soubor = jedna rodina.** Děti (`children`) jsou nezávislé entity uvnitř jednoho stavu; rozvrh (`NamedSchedule`) je sdílený „dokument“ pro všechny děti současně, kde se jednotlivé záznamy rozlišují polem `childId`; export do kalendáře (.ics) je jediné místo, kde se data reálně dělí na samostatné soubory podle dítěte.
