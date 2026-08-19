# Design Review 68 — Školní prázdniny okresu Rakovník + potlačení výskytu v mřížce

**Status:** IMPLEMENTED
**Change ID:** CHANGE-73 (scope engine `@krouzky/domain` 0.5.0 → 0.6.0 + app `@krouzky/web`, schemaVersion 6 → 7)
**Date:** 2026-08-19
**Repo:** monorepo `Children_schedule`
**Trigger:** uživatelský spec `spec-skolni-a-statni-svatky-prazdniny.md` požadoval, aby se aktivity ve
výchozím stavu negenerovaly o školních prázdninách/státních svátcích, s explicitním override „i o
prázdninách“. Souvisí s `BL-020` (krajská variabilita jarních prázdnin) — tento CHANGE ho **neuzavírá**,
jen doplňuje reálná data pro jeden konkrétní okres.

## 0. SOTA analýza

### 0.1 Co už existuje (ověřeno proti kódu, ne jen podle vstupního spec dokumentu)

- `czechNationalHolidays()` ([holidays.ts](../../packages/domain/src/calendar/holidays.ts)) počítá
  státní svátky deterministicky (zákon č. 245/2000 Sb. + velikonoční algoritmus), bez sítě.
- `CalendarException`/`isExceptionRelevant` ([exceptions.ts](../../packages/domain/src/calendar/exceptions.ts))
  už rozlišují `scope: 'national' | 'district' | 'school'` a `districtCode` — mechanismus je hotový,
  ale **nikde v appce dnes neexistuje žádný `district`/`school` záznam**, jen `national`.
- `districtCode` je **povinné** pole `PlannerState.districtCode` ([schema.ts](../../packages/domain/src/model/schema.ts)),
  tedy už perzistované — ale reálná data (`novestraseci.ts`) ho nastavují na `''` a
  `NOVE_STRASECI_EXCEPTIONS` na prázdné pole. `exceptions` (samostatné pole v Zustand store, ne
  součást `PlannerState`) se navíc při startu plní jen z `schoolYearHolidays()` (národní svátky) —
  `NOVE_STRASECI_EXCEPTIONS` se nikde nepoužívá. Vstupní spec §3.3 tvrdil, že mechanismus chybí; ve
  skutečnosti chybí jen **data a jejich zapojení do startovního stavu**, ne API.
- `ScheduleGrid` iteruje reálná kalendářní data ve sloupcích mřížky (`dates.map(...)`,
  [ScheduleGrid.tsx](../../apps/web/src/components/ScheduleGrid.tsx)) a dnes jen ztlumí pozadí dne
  (`bg-slate-50/60`) — blok kroužku se vykreslí vždy.
- Mobilní **Agenda** (výchozí mobilní pohled) čerpá ze `view.blocks`
  ([useScheduleView.ts](../../apps/web/src/hooks/useScheduleView.ts)), což je **týdenní šablona bez
  vazby na konkrétní kalendářní datum** (jen den v týdnu). Nemá tedy dnes vůbec koncept „toto konkrétní
  pondělí je svátek“ — to není detail k doladění, je to chybějící předpoklad pro celou funkci v tomto
  pohledu.
- ICS export počítá `exceptionDates` jednou globálně pro celý export
  ([generate.ts](../../packages/domain/src/ics/generate.ts) `generateIcs()`) a aplikuje ho stejně na
  každou událost přes `buildRecurringEvent`/`buildExpandedEvents`.
- `ActivityOverride` ([schema.ts](../../packages/domain/src/model/schema.ts)) je existující, zavedený
  mechanismus „uživatel přizpůsobuje jednu katalogovou aktivitu“ (název, adresa, cena, barva, poznámka)
  přes `setActivityOverride(activityId, patch)` — přesně vzor pro nové uživatelské pole na aktivitě.

### 0.2 Rozhodnutí a zamítnuté alternativy

| Otázka | Zvoleno | Zamítnuto — proč |
|---|---|---|
| Kam patří `allowOnHolidays`? | nové pole `ActivityOverride.allowOnHolidays?: boolean` | pole přímo na `Activity` (vstupní spec §4) — `Activity` je needitovatelná katalogová/adaptérová data, ne uživatelský stav; porušilo by to existující vzor overrides |
| Jak zapsat vícedenní prázdniny do `CalendarException`? | rozepsat každý den zvlášť (`scope:'district'`, jeden záznam na den) | přidat `startDate`/`endDate` rozsah do schématu — `calendarExceptionSchema.date` je dnes jeden ISO den a EXDATE v ICS stejně potřebuje výčet jednotlivých dnů, rozšíření schématu by bylo zbytečné riziko migrace |
| Zdroj státních svátků | zachovat `czechNationalHolidays()` (deterministický, offline) | stahovat z veřejného API (vstupní spec §2.2) — porušuje pravidlo čistoty domény (žádná síť v `packages/domain`) a svátky ze zákona se mění výjimečně, nulový reálný přínos |
| Potlačení bloku — kde? | jen v `ScheduleGrid` (týden/den) — jediné místo s vazbou na reálné datum | v `useScheduleView`/Agendě zároveň — Agenda nemá dnes koncept konkrétního data, udělat ji datově ukotvenou je samostatná, větší UX změna (viz §3 Non-goals, `BL-047`) |
| `CustomEntry` (Kroužek/Škola/Lékař/Jiné) | **nikdy** nepotlačovat v V1 | potlačovat stejně jako katalogové zápisy — nemají `ActivityOverride`, plošné potlačení by schovalo legitimní jednorázové položky (např. návštěva lékaře o prázdninách); vlastní řešení viz `BL-048` |

## 1. Requirements

- **FR-1**: `packages/domain/src/calendar/holidays.ts` získá novou funkci
  `districtSchoolHolidays(schoolYear, districtCode)` vracející `CalendarException[]` se `scope:
  'district'` — jeden záznam na každý kalendářní den (ne rozsah) pro okres Rakovník, školní rok
  2026/2027: podzimní 29.–30. 10. 2026 (2 dny), vánoční 23. 12. 2026 – 3. 1. 2027 (12 dnů), jarní 8.–14.
  3. 2027 (7 dnů) — celkem 21 záznamů, `districtCode: 'rakovnik'`, `source` cituje okres a školní rok.
- **FR-2**: `activityOverrideSchema` získá nové volitelné pole `allowOnHolidays: z.boolean().optional()`.
  `plannerStateSchema.schemaVersion` `6 → 7`; migrace v `io.ts` je no-op blok (pole je `.optional()`,
  žádná transformace dat), stejný vzor jako `schemaVersion` 5→6 v `design_review_67.md`.
- **FR-3**: `novestraseci.ts`'s `buildNovestraseciState()` nastaví `districtCode: 'rakovnik'` (dnes
  `''`); `plannerStore.ts` sloučí `districtSchoolHolidays(initialState.schoolYear, 'rakovnik')` do
  počátečního pole `exceptions` vedle stávajícího `schoolYearHolidays(...)`.
- **FR-4**: `useScheduleView.ts`'s `Block` získá pole `allowOnHolidays: boolean` — `true` jen pro bloky
  se zapsanou katalogovou aktivitou (`p.activityId` definováno) a existujícím
  `overrides.get(activityId)?.allowOnHolidays === true`; pro bloky z `CustomEntry` (`activityId`
  nedefinováno) je vždy `false` a tyto bloky se v `ScheduleGrid` **nikdy** nefiltrují (viz FR-5).
- **FR-5**: `ScheduleGrid.tsx` v týdenním/denním pohledu (den = reálné kalendářní datum) vynechá
  z vykreslení dané buňky každý blok, pro který platí `holidayDates.has(iso) && block.activityId !==
  undefined && !block.allowOnHolidays`. Vizuální ztlumení pozadí dne (`bg-slate-50/60`) zůstává
  beze změny jako doplňková informace. Mobilní Agenda a `MonthView` se v této iteraci nemění (Non-goal).
- **FR-6**: `DetailsPanel.tsx` (detail katalogové aktivity) získá přepínač „Povolit i o prázdninách a
  státních svátcích“ napojený na existující `setActivityOverride(activityId, { allowOnHolidays })` —
  žádná nová store akce. Výchozí stav vypnutý; při zapnutí krátký vysvětlující text.
- **FR-7**: `packages/domain/src/ics/generate.ts`'s `ResolvedEvent` získá pole `allowOnHolidays:
  boolean` (odvozeno stejně jako ve FR-4, uvnitř `resolveEvents()` kde se `override` už dnes hledá).
  `buildRecurringEvent`/`buildExpandedEvents` použijí pro danou událost prázdnou množinu výjimek, když
  `allowOnHolidays === true` (žádné `EXDATE`, `DTSTART` = první výskyt bez ohledu na výjimky).

## 2. Acceptance criteria

- **AC-1** (FR-1): nový test `packages/domain/test/holidays.test.ts` — `districtSchoolHolidays(...)`
  vrací přesně 21 záznamů se `scope:'district'` a očekávaným datumovým výčtem (2+12+7 dnů).
- **AC-2** (FR-2): `packages/domain/test/state.test.ts` — nový test migrace v6 (bez `allowOnHolidays`) →
  v7 je no-op; `parsePlannerState`/`serializePlannerState` round-trip s `allowOnHolidays: true` na
  přepisu prochází beze změny pořadí klíčů (viz existující kanonické pořadí, `BL-021`).
- **AC-3** (FR-3, FR-4, FR-5): nový E2E test v `test/specs/schedule.spec.ts` — pro reálný týden
  obsahující 2026-10-29 (podzimní prázdniny) je zapsaný kroužek v ten den v mřížce **nepřítomný**
  (`toHaveCount(0)` nad blokem toho dne), zatímco ztlumené pozadí dne zůstává viditelné.
- **AC-4** (FR-6, FR-5): pokračování AC-3 ve stejném testu — po zapnutí „Povolit i o prázdninách a
  státních svátcích“ v `DetailsPanel` se blok pro 2026-10-29 v mřížce znovu objeví okamžitě (bez
  reloadu).
- **AC-5** (FR-7): nový test v `packages/domain/test/ics.test.ts` — export bez override vynechá
  (`EXDATE` nebo posunuté `DTSTART`) výskyty v `districtSchoolHolidays` datech; export s
  `allowOnHolidays: true` na přepisu dané aktivity žádný z těchto dnů nevynechá.
- **AC-6** (zachování čistoty domény): žádná nová závislost ani import sítě/DOM v `packages/domain` —
  ověřeno existujícím `eslint` domain-purity pravidlem a `tsc --noEmit`.

## 3. Non-goals / notes

- **BL-020 zůstává otevřený.** Tento CHANGE dodává hardcoded data pro okres Rakovník, ne obecný
  výběr okresu/kraje ani napojení na oficiální rozpis MŠMT.
- **Mobilní Agenda a `MonthView` se v V1 nemění** — Agenda je týdenní šablona bez vazby na konkrétní
  kalendářní datum, takže potlačení bloku podle data by vyžadovalo její přepracování na datově
  ukotvený pohled. Nová položka **`BL-047`**: datové ukotvení Agendy + promítnutí potlačení prázdnin
  do mobilního výchozího pohledu.
- **`CustomEntry` (Kroužek/Škola/Lékař/Jiné) se v V1 nikdy nepotlačuje**, bez ohledu na den — nemá
  `ActivityOverride`, tedy ani koncept „i o prázdninách“. Nová položka **`BL-048`**: per-položkový
  override potlačení pro vlastní události, pokud se ukáže jako potřebné.
- **Import výjimek přes `parseExceptionsFile` se nezapojuje.** Funkce v doméně existuje a je testovaná,
  ale UI napojení (nahrání vlastního souboru výjimek uživatelem) není součástí tohoto CHANGE — zůstává
  možné budoucí rozšíření, žádná nová `BL-<NNN>` položka není potřeba (jde o nevyužitou, ale funkční
  cestu, ne o závadu).
- **Žádné síťové volání pro státní svátky** — `czechNationalHolidays()` zůstává deterministický.
- **Override je jen na úrovni celé aktivity**, ne na úrovni jednotlivého termínu/výskytu — konzistentní
  s tím, jak `ActivityOverride` funguje dnes pro všechna ostatní pole.

## 4. Zjištění při implementaci

**Kritický nález (skutečná chyba v `plannerStore.ts`, ne v testu):** `setActivityOverride()` po
zápisu patche přeskládá override do kanonického pořadí klíčů kvůli bajtově shodnému round-tripu
(`BL-021`, CHANGE-35) — přes natvrdo vypsaný seznam klíčů `['name','address','contactPhone','price',
'colorCss','note','editedAt','baseSignature']`. Nové pole `allowOnHolidays` v tomto seznamu chybělo,
takže se při každém zápisu tiše zahodilo (override zůstal jen s metadaty `editedAt`/`baseSignature`,
checkbox se v UI nikdy nezaškrtl). Odhaleno E2E testem AC-3/AC-4 (T-176), ne code review — diagnostický
test dumpující `localStorage` potvrdil chybějící klíč. Opraveno přidáním `'allowOnHolidays'` na konec
seznamu. **Poučení: kdykoliv se do `ActivityOverride`/`Child`/jiné entity s vlastním kanonickým
key-order rebuild přidává nové pole, zkontrolovat, zda existuje podobný natvrdo vypsaný seznam klíčů
(round-trip determinismus) a nové pole tam přidat — schema samo o sobě nestačí.**
