# Design Review 99 — Explicitní typy exportu (per dítě / rodina) + bezpečný import

**Status:** IMPLEMENTED (2026-09-01) — domain + store + UI + E2E hotovo, doménový
vitest 155/155, plná 6profilová E2E sada 780 passed / 252 skipped / 0 failed
(včetně 6 nových testů T-234..T-239 kryjících AC-2/3/5/7/8)
**Change ID:** CHANGE-106 (engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-09-01
**Repo:** monorepo `Children_schedule` (`packages/domain/src/model/schema.ts`, `state/io.ts`,
`ics/generate.ts`; `apps/web/src/store/plannerStore.ts`, `src/lib/exportClient.ts`,
`src/components/Toolbar.tsx`)
**Trigger:** uživatel nahlásil, že se mu data "občas přepisují/mizí" a přiložil dva
soubory (`rozvrh-julie.json`/`rozvrh-jonda.json`), které si pletl s "kalendářem per
dítě" — appka ale takový export doteď neumí, `.json` je vždy CELÝ rodinný stav.
Zároveň přiložil dvě analýzy (`analyza-ztraty-dat.md`, `spec_export_typy.md`)
navrhující (a) explicitní rozlišení "export jednoho dítěte" vs. "export celé
rodiny" s bezpečným importem podle typu, (b) opravy datového modelu, které měly
za cíl zamezit budoucí ztrátě dat.

## 0. SOTA analýza

### 0.1 Problém — validace vstupních analýz proti skutečnému kódu

Než cokoliv navrhovat, ověřil jsem KAŽDÉ tvrzení z `analyza-ztraty-dat.md` přímo
v `packages/domain`/`apps/web` (per zavedený postup tohoto repa — CHANGE-73/93/97
už dřív ukázaly, že i dobře napsaná externí analýza může mít reálné chyby):

| Tvrzení analýzy | Ověřeno | Skutečnost |
|---|---|---|
| §1.1 `importJson`/`loadState` = plný přepis, žádný merge | **PRAVDA** | `plannerStore.ts` `loadState`/`hydrate`: `s.state = state` — bezpodmínečné přepsání celého stavu, žádná validace ani potvrzení. `Toolbar.tsx importJson` volá `loadState(parsed.value)` přímo. |
| §1.2 autosave = jeden `localStorage` klíč, žádná koordinace mezi taby, žádný debounce | **PRAVDA** | `page.tsx`: `usePlannerStore.subscribe((s) => setAutosaveOk(saveAutosave(s.state)))` — synchronně na každou změnu, žádný `storage` listener ani `BroadcastChannel`. |
| §1.3 `sessionOverrides` — precedence global vs. per-dítě závisí na pořadí v poli, může "vyhrát" špatná verze | **NEPRAVDA — vyvráceno** | Rozlišení NENÍ jeden `.find()` nad celým polem. `applySessionOverrides()` (aplikuje se na sdílený `catalog`) explicitně filtruje `o.childId === undefined` — per-dítě záznamy se do sdíleného katalogu NIKDY nepromítnou. `effectiveSessionForChild()` pak nad TOUTO již globálně vyřešenou session hledá `o.sessionId === session.id && o.childId === childId` a přepis navrší NAD ni. Jde o dvoustupňové, striktně oddělené řešení (nejdřív globální, pak per-dítě navrch) — per-dítě přepis vyhrává VŽDY deterministicky, bez ohledu na pořadí položek v poli. Ukázková dvojice v přiloženém souboru (globální `endMinutes:695` + per-dítě `endMinutes:750` pro `child-1`) se tedy correctly vyřeší na 750, ne 695. Tohle už jednou opravovalo CHANGE-103 přesně proto, aby toto NEBYLA chyba — spec i kód na to mají cílený test (`session-override.test.ts`). |
| §1.4 `child-1` hardcoded, `addChild()` generuje UUID | **PRAVDA** | `novestraseci.ts:103` `id: 'child-1'` (literál), `ids.ts newId()` = `crypto.randomUUID()`-based. Reálné riziko JEN pro budoucí cross-device merge (viz §3, BL-065) — dnešní jednozařízenné použití ho nevyvolá. |
| §1.6 migrace `schemaVersion` nejsou destruktivní, ale interagují se full-replace importem | **PRAVDA** | Migrace v `state/io.ts` jsou čistě aditivní/bump-only; problém je výhradně v tom, že import PAK plně přepíše, ne v migraci samotné. |
| Chybí `revision`/`updatedAt` na `PlannerState` | **PRAVDA** | `plannerStateSchema` nemá nic než `schemaVersion` (formát dat, ne časová revize obsahu). |

**Závěr:** hlavní, prokazatelně reálná příčina nahlášeného "data se přepisují/mizí"
je **§1.1** — `rozvrh-julie.json` a `rozvrh-jonda.json` jsou bajtově identické
(celý rodinný stav), takže je uživatel zjevně pojmenoval jako "kalendář pro
Julii"/"kalendář pro Jondu" v domnění, že jde o oddělené exporty — a jakýkoliv
následný import staršího z nich by tiše smazal mezitím provedené změny u
DRUHÉHO dítěte, protože appka žádný jiný import než plný přepis neumí. §1.3
(nejednoznačná precedence `sessionOverrides`) je vyvrácena — NEBUDE součástí FR
níže. Ostatní body (§1.2, §1.4, chybějící revize) jsou reálné, ale nižší
závažnosti/rizika a jsou rozebrány jako budoucí BL v §3, ne jako urgentní FR.

### 0.2 Přístup

**Zvoleno (per `spec_export_typy.md`, s korekcemi):** explicitní `ExportEnvelope`
s polem `exportType: 'single-child' | 'family'` obalující export/import JSON.
Import se podle typu chová jinak:
- `single-child` → **merge podle `childId`** (nahradí jen dotčené dítě, zbytek
  rodiny nedotčen; neznámé `childId` → nabídka přidat jako nové dítě).
- `family` (i beze-obálkový, starší formát — zpětná kompatibilita) → zůstává
  plný přepis, ale **už NIKDY tichý** — nejdřív potvrzovací dialog s rozdílem
  (počet dětí + `updatedAt` obou stran).

**Zamítnuto:** implementovat plný per-entity 3-way merge i pro `family` import
(navrhováno v analýze §6 jako budoucí směr) — bez backendu a bez konceptu
"společného předka" verzí by šlo o hádání, ne merge; ponechat jako `family` =
vždy vědomý plný přepis, jen ne tichý.

**Zvoleno:** `revision`/`updatedAt` na `PlannerState` (FR-1) — nutná predispozice
pro potvrzovací dialog (FR-2) i pro budoucí chytřejší merge, kdyby přišel.
`updatedAt` u starších (migrovaných) souborů zůstává `undefined` — **nikdy se
nedopočítává** ani nefabrikuje aktuální čas (Pravidlo #1 tohoto repa), UI ho
zobrazí jako "neznámo (starší formát)".

**Zamítnuto (viz §1.3 výše):** restrukturalizace `sessionOverrides` z pole na
indexovaný objekt (analýza §2.3) — řeší bug, který ve skutečnosti neexistuje;
ponecháno jako nízkoprioritní tech-debt BL (bezpečnostní síť proti BUDOUCÍ
regresi téhle logiky), ne jako oprava současného chování.

**Zamítnuto (zatím):** sjednocení `child-1` → UUID (analýza §2.2) — reálné, ale
zasahuje desítky existujících fixture/testovacích call-sites (`novestraseci.ts`,
demoData, domain testy). **Upřesnění po zpětné vazbě uživatele:** riziko srážky
NENÍ jen teoretické/budoucí — FR-5 v tomto CHANGE fakticky zavádí manuální
cross-device merge (dva rodiče, dvě appky, dva nezávisle vzniklé `child-1`,
export/import mezi nimi). Neřešíme to plnou UUID migrací (BL-065 zůstává mimo
rozsah), ale levnou pojistkou přímo ve FR-5/FR-8 níže — porovnáním jména a
revize před tichým sloučením.

**Zvoleno (reakce na zpětnou vazbu uživatele):** FR-5 merge podle `childId`
NESMÍ být slepý přepis. Dvě nezávislé pojistky:
1. **Kontrola jména** — pokud nalezené `childId` v cílovém stavu patří dítěti
   s JINÝM jménem, než má importovaný soubor, jde s vysokou pravděpodobností
   o srážku dvou nezávisle vzniklých `child-1` (viz odstavec výše) — appka
   nabídne stejné potvrzení jako u neznámého `childId`, ne tichý merge.
2. **Kontrola OBSAHU, ne revize** — `PlannerState.revision`/`updatedAt` (FR-1)
   je na úrovni CELÉ rodiny, ne dítěte: kdyby FR-8 srovnávala revizi, dialog by
   naskočil při KAŽDÉM importu, kde se mezitím upravilo cokoliv u LIBOVOLNÉHO
   dítěte, i kdyby dat toho importovaného dítěte se to netýkalo vůbec — v
   rodině s víc dětmi prakticky "skoro pořád", což je přesně mechanismus, kterým
   bezpečnostní dialog ztrácí smysl (lidi ho začnou proklikávat bez čtení).
   Místo revize appka porovná OBSAH: sestaví z cílového stavu stejný výřez
   dat dítěte, jaký by vznikl exportem PRÁVĚ TEĎ (stejná filtrace jako FR-4),
   a strukturálně ho porovná s daty v importovaném souboru — **KANONICKY, ne
   syntakticky** (viz FR-8 níže: `JSON.stringify` rovnost je citlivá na pořadí
   prvků v poli i klíčů v objektu, takže by nesouvisející reorganizace dat
   jinde ve stavu znovu vyvolala falešný poplach, jen jiným mechanismem než
   revize). Shodují-li se KANONICKY, merge proběhne ticho (není co řešit — i
   opakovaný import stejného souboru je tak bezpečně no-op); liší-li se,
   appka zobrazí potvrzení, kde `updatedAt` obou stran slouží JEN jako
   doplňkový text ("soubor exportován X, aktuální data upravena Y"), ne jako
   spouštěcí podmínka — tou je výhradně zjištěný obsahový rozdíl.

**Zamítnuto:** rozhodovat FR-8 podle `PlannerState.revision`/`updatedAt` (můj
původní návrh) — viz bod 2 výše, špatná granularita (rodinná, ne per dítě) by
dialog spouštěla nadbytečně skoro při každém importu. **Zamítnuto i jako
alternativa:** přidat nové pole per-dítě revize/timestamp na `Child` — vyžaduje
schema migraci navíc a řeší stejný problém hůř než přímé obsahové porovnání,
které žádnou novou migraci nepotřebuje.

**Zvoleno:** nový export mód "Sdílený rodinný kalendář (.ics)" jako JEDEN soubor
(oproti dnešním N souborům při "Kalendář — všechny děti") — `UID` odvozený z
`enrollment.id`/`customEntry.id` (nikdy z `activityId`+`sessionGroupId`, protože
dvě děti běžně sdílí stejnou katalogovou aktivitu → kolize UID by v cílové appce
smazala jednu z událostí), `SUMMARY` s prefixem jména dítěte, `CATEGORIES` =
jméno dítěte pro appky, co podle kategorie umí filtrovat/barvit. **Potvrzeno
uživatelem:** vždy VŠECHNY vytvořené události — `Enrollment` i `CustomEntry`
stejnou logikou prefixu, žádná z nich se nevynechává.

**Objasnění datového modelu (vyvolané dotazem uživatele „má každé dítě víc
variant kalendáře?"):** NE — varianty (`NamedSchedule`) nejsou per dítě, jsou
sdílené pro CELOU rodinu (viz `docs/ukladani-dat.md` §2/§3); „Varianta A"
obsahuje zápisy všech dětí najednou, rozlišené `childId`. Neexistuje tedy
koncept "varianta patřící jednomu dítěti" — proto FR-4/FR-5 pracují vždy s
PRÁVĚ JEDNOU (aktivní) variantou cílového/zdrojového stavu, ne s nějakou
"variantou daného dítěte", protože nic takového datový model nezná.

## 1. Requirements

- **FR-1**: `PlannerState` získá `revision: number` (default `0`, inkrementuje se
  při každém `commit()` v store) a volitelné `updatedAt?: string` (ISO, nastavuje
  se při každém `commit()` na aktuální čas z app vrstvy — doména `Date.now()`
  nikdy nevolá, čas je parametr). `schemaVersion` 9→10, migrace v9→v10 doplní
  `revision: 0`, `updatedAt` NEDOPLŇUJE (zůstává `undefined` u starších souborů).
- **FR-2**: Import souboru bez `exportType` nebo s `exportType: 'family'` MUSÍ
  před přepsáním stavu zobrazit potvrzovací dialog s porovnáním (počet dětí a
  `updatedAt`/"neznámo" obou stran) a explicitní volbou Přepsat/Zrušit — nikdy
  tiché `loadState()`.
- **FR-3**: Exportní dialog nabídne explicitní volbu rozsahu PŘÍMO v sobě —
  seznam VŠECH dětí v rodině (ne jen aktivní) + volba "Celá rodina". Aktivní
  dítě je jen PŘEDVYPLNĚNÁ výchozí volba; uživatel může zvolit kterékoli jiné
  dítě rovnou v dialogu, bez nutnosti nejdřív přepnout aktivní kartu v hlavním
  UI. Výstup se obalí do `ExportEnvelope { exportType, exportVersion: 1, data }`.
- **FR-4**: Export "Toto dítě" (`single-child`) obsahuje jen: vybrané dítě;
  `enrollments`/`customEntries` AKTIVNÍ varianty s `childId` rovným vybranému;
  `overrides`, jejichž `activityId` se objevuje v enrollmentech vybraného dítěte;
  `sessionOverrides` globální (pro `sessionId` použité vybraným dítětem) +
  per-dítě záznamy vybraného dítěte; `schoolYear`/`districtCode` beze změny.
  Obálka navíc nese `sourceUpdatedAt` — snímek `PlannerState.updatedAt` (FR-1)
  v okamžiku exportu, použitý JEN jako doplňkový kontext v textu
  potvrzovacího dialogu (FR-8), ne jako rozhodovací podmínka (viz FR-8).
- **FR-5**: Import `single-child` souboru MERGUJE podle `childId` do AKTIVNÍ
  varianty cílového stavu: nahradí `enrollments`/`customEntries`/per-dítě
  `sessionOverrides` odpovídající `childId`, zbytek rodiny (ostatní děti,
  globální `overrides`, ostatní varianty) zůstává nedotčen.
  - Pokud `childId` v cílovém stavu NEEXISTUJE → appka nabídne potvrzení
    "Přidat `<jméno>` jako nové dítě?" místo tichého zahození nebo pádu.
  - Pokud `childId` EXISTUJE, ale jméno dítěte v cílovém stavu se LIŠÍ od jména
    v importovaném souboru — reálné riziko srážky (dvě nezávisle vzniklé appky
    běžně obě očíslují své první dítě `child-1`, viz §0.2) — appka NESMÍ tiše
    sloučit; zobrazí stejný typ potvrzení jako u neznámého `childId`:
    "Importovaná data pro `<jméno v souboru>` sloučit do `<jméno v appce>`?".
- **FR-6**: Nový export "Sdílený rodinný kalendář (.ics)" — jeden soubor pro
  VŠECHNY vytvořené události všech dětí aktivní varianty (`Enrollment` i
  `CustomEntry` bez výjimky), `UID` z `enrollment.id`/`customEntry.id`,
  `SUMMARY` s prefixem `"<jméno dítěte>: <název>"`, `CATEGORIES:<jméno dítěte>`.
- **FR-7**: Merge při importu `single-child` souboru (FR-5), jehož
  `activityId`/`sessionGroupId` už v aktuálním katalogu neexistuje (katalog se
  mezitím změnil) — takový záznam se PŘESKOČÍ (ne tichá ztráta, ne pád), appka
  po dokončení importu zobrazí varování se seznamem přeskočených položek podle
  názvu/data.
- **FR-8**: Před samotným přepsáním cílového dítěte (FR-5) appka porovná
  OBSAH, ne revizi: sestaví z CÍLOVÉHO stavu stejný výřez dat dítěte (stejná
  filtrace jako FR-4 — `enrollments`/`customEntries` s daným `childId` +
  per-dítě `sessionOverrides`), jaký by vznikl exportem tohoto dítěte PRÁVĚ
  TEĎ, a porovná ho s daty uvnitř importovaného souboru **KANONICKY, NE
  syntakticky** — sdílenou funkcí `canonicalizeChildSlice()` použitou na OBOU
  stranách porovnání (export i re-extrakce ze živého store).

  **Kanonizace je OBECNÝ, na jménech polí NEZÁVISLÝ tree-walk** (ne enumerace
  konkrétních polí typu `sessions`/`sessionIds`/`interests` — čtyři po sobě
  jdoucí kola zpětné vazby ukázala, že enumerace pokaždé najde další pole se
  stejnou třídou problému: `CustomEntry.sessions` je vnořené pole s `id`,
  `Enrollment.sessionIds` je pole primitiv, `Child.interests` je další pole
  primitiv, `Child.availability` je pole objektů BEZ `id` — enumerace by se
  táhla donekonečna s každým dalším polem, které schéma kdy přibude):

  ```
  canonicalize(value):
    if array:
      items = value.map(canonicalize)          // nejdřív rekurzivně prvky
      if items are objects with stable `.id`  → sort by id
      elif items are primitives                → sort by value
      else (objekty BEZ id, např. availability) → sort by JSON.stringify(item)
      return items
    if object:
      return { ...value, [k]: canonicalize(value[k]) for each k }
    return value                                 // primitivum beze změny
  ```

  Rekurze do KAŽDÉ hodnoty (pole i objektu) znamená, že žádné budoucí pole
  (personalizace, BL-062 refaktor `sessionOverrides` apod.) nevyžaduje novou
  větev — funkce nezná a nepotřebuje znát jména polí, jen jejich TVAR (pole
  objektů s `id` / pole primitiv / pole objektů bez `id` / objekt / primitivum).
  Až po tomto rekurzivním převodu obou stran appka porovná hloubkovou rovností
  (NE `JSON.stringify` na PŮVODNÍCH datech — to by bylo přesně tou samou třídou
  falešného poplachu jako zavržené srovnání revize, jen jiným mechanismem).
  - Jsou-li KANONICKY shodné → merge proběhne TICHO (není co řešit; i
    opakovaný import stejného souboru je tak bezpečně no-op, bez ohledu na
    to, jak jsou pole aktuálně seřazená).
  - Liší-li se → appka zobrazí potvrzení ("Data dítěte `<jméno>` v appce se
    liší od dat v souboru — přesto přepsat?"), kde `sourceUpdatedAt` (FR-4) a
    aktuální `state.updatedAt` slouží JEN jako doplňkový kontext v textu
    ("soubor exportován X, aktuální data upravena Y"), NE jako spouštěcí
    podmínka — tou je výhradně zjištěný obsahový rozdíl. `PlannerState.revision`
    (FR-1) se zde NEPOUŽÍVÁ — je na úrovni celé rodiny, ne dítěte, takže by
    dialog spouštěla nadbytečně skoro při každém importu (viz §0.2).

## 2. Acceptance criteria

- **AC-1** (FR-1): nový domain test `state.test.ts` — `migrateToCurrent` v9→v10
  doplní `revision: 0`, ponechá `updatedAt` chybějící; store test/E2E potvrdí,
  že `revision` roste při každé editaci.
- **AC-2** (FR-2): nový E2E test (`persistence.spec.ts`) — import staršího
  rodinného `.json` s jiným počtem dětí zobrazí dialog s oběma počty PŘED
  změnou stavu; "Zrušit" nechá stav nedotčený, "Přepsat" ho vymění.
- **AC-3** (FR-3): E2E — exportní dialog nabízí seznam VŠECH dětí (ne jen
  aktivní) + "Celá rodina"; aktivní dítě je předvybrané, ale lze zvolit jiné;
  stažený soubor má na kořeni `exportType`/`exportVersion`.
- **AC-4** (FR-4): domain unit test nad 2-dětnou fixturou — `single-child`
  export obsahuje jen filtrovaná data, ne zápisy druhého dítěte; obálka nese
  `sourceUpdatedAt` odpovídající zdrojovému stavu.
- **AC-5** (FR-5): E2E — export dítěte A, mezitím změna u dítěte B, import
  souboru dítěte A zpět → změna u B přežije, A se obnoví na exportovaný stav;
  import s neexistujícím `childId` nabídne "přidat jako nové dítě"; import se
  STEJNÝM `childId`, ale JINÝM jménem v cílovém stavu (simulace srážky dvou
  nezávisle vzniklých `child-1`) zobrazí potvrzení se jmény obou stran, ne
  tichý merge.
- **AC-6** (FR-6): domain ICS test — 2 děti se stejným `activityId` ve
  sdíleném exportu dají 2 VEVENTy s ROZDÍLNÝM `UID` a `SUMMARY` prefixovaným
  jménem; třetí VEVENT ověří, že `CustomEntry` je ve stejném souboru se stejným
  prefixovým schématem (ne jen `Enrollment`).
- **AC-7** (FR-7): domain unit test — merge `single-child` souboru s
  enrollmentem odkazujícím na smazaný `activityId` tento záznam vynechá a vrátí
  seznam přeskočených položek; E2E potvrdí, že appka po takovém importu ukáže
  varování se jmény vynechaných položek, ne tichý úspěch ani pád.
- **AC-8** (FR-8): domain unit test — merge se stejným obsahem (opakovaný
  import beze změny) proběhne BEZ příznaku potvrzení; merge s odlišným obsahem
  (cílové dítě má mezitím upravený enrollment) příznak vyžadující potvrzení
  vrátí; test explicitně ověří, že sama vyšší `PlannerState.revision` cíle
  BEZ obsahového rozdílu potvrzení NEVYVOLÁ (kryje přesně scénář z
  připomínky — úprava jiného dítěte nesmí zbytečně spustit dialog).

  **Obecný test místo enumerace (kryje čtvrté kolo zpětné vazby):** čtyři kola
  zpětné vazby postupně odhalila `sessions`/`sessionIds`/`interests`/
  `availability` jako další pole se stejnou třídou problému — enumerovaný
  seznam case by se táhl s každým dalším polem donekonečna. Místo toho JEDEN
  property-based test (nový domain devDependency `fast-check`, nebo ruční
  generátor bez nové závislosti): vygeneruje validní výřez dat dítěte
  (`enrollments`/`customEntries`/`sessionOverrides` včetně vyplněných
  `interests`/`availability`/`sessionIds`), na NÁHODNĚ vybraném poli KDEKOLI
  ve struktuře (libovolná hloubka) prohodí pořadí prvků, a ověří, že
  `canonicalizeChildSlice()` obou variant dá stejný výsledek → merge proběhne
  TICHO. Konkrétní pojmenované případy (top-level pole, `CustomEntry.sessions`,
  `Enrollment.sessionIds`) zůstávají jako čitelné regresní kotvy vedle
  obecného testu, ne jako jediná záruka.

  E2E potvrdí zobrazení varovné hlášky s `updatedAt` obou stran jako kontextem.

## 3. Non-goals / notes
- **Vyvrácené tvrzení analýzy (§1.3)** — precedence `sessionOverrides` NENÍ
  chyba, viz §0.1 tabulka. Restrukturalizace pole na indexovaný objekt
  (analýza §2.3) je jen bezpečnostní síť do budoucna, ne oprava — **BL-061**.
- **BL-062**: migrace `localStorage` → `IndexedDB` (analýza §2.4) — velký,
  samostatný tech-debt, umožnil by částečné zápisy místo celého blobu.
- **BL-063**: koordinace mezi taby (`storage` event / `BroadcastChannel`) proti
  tichému multi-tab přepisu (analýza §1.2/§3 bod 3).
- **BL-064**: automatická verzovaná záloha (ring-buffer posledních N autosave
  stavů) jako doplňková záchranná síť nad rámec FR-2 (analýza §3 bod 4).
- **BL-065 (NEEDS INPUT)**: sjednocení `child-1` → `crypto.randomUUID()` (analýza
  §2.2). **Upřesnění po zpětné vazbě uživatele:** riziko srážky ID NENÍ jen
  budoucí — FR-5 v tomto CHANGE fakticky zavádí manuální cross-device merge,
  který ho může vyvolat už teď (dvě appky, dva nezávisle vzniklé `child-1`).
  Bezprostřední dopad je ale zmírněn levnou pojistkou přímo v tomto CHANGE
  (FR-5 kontrola jména + FR-8 kontrola revize, viz §0.2) — appka takovou
  srážku nikdy tiše nesloučí, vždy se zeptá. Plná UUID migrace (dopad na
  desítky fixture/testovacích call-sites) zůstává mimo rozsah tohoto CHANGE.
- **Vyřešeno (uživatel potvrdil 2026-09-01):** FR-5 merguje do AKTIVNÍ varianty
  cílového stavu — jiná volba ani nedává smysl, protože varianty jsou sdílené
  pro celou rodinu, ne per dítě (viz objasnění v §0.2 u FR-6).
- **Vyřešeno (uživatel potvrdil 2026-09-01):** FR-6 (sdílený rodinný `.ics`)
  zahrnuje VŽDY `CustomEntry` i `Enrollment`, žádná výjimka.
- **Vyřešeno (uživatel potvrdil 2026-09-01):** FR-7 — osiřelý odkaz na smazanou
  katalogovou položku se při mergi PŘESKOČÍ + zobrazí varování se seznamem, ne
  tichá ztráta ani pád.
- **BL-066 (nová, výhled do budoucna — VĚDOMĚ NEIMPLEMENTOVÁNO nyní):** uživatel
  navrhl, že místo generování statického souboru ke stažení by appka mohla do
  budoucna vystavit stabilní endpoint (ve stylu `webcal://` subscription — viz
  `spec_export_typy.md` §4), který by při každém requestu vracel AKTUÁLNÍ stav
  — řešilo by to i osiřelé odkazy interaktivně (endpoint by mohl reagovat na
  změnu katalogu za běhu, ne jen v okamžiku exportu). Toto je zásadní
  architektonický posun (appka by přestala být čistě bezserverová SPA, viz
  README „Aplikace nemá backend") — explicitně mimo rozsah tohoto CHANGE,
  zaznamenáno jako budoucí vize, ne k implementaci teď ani v dohledné době.
- Mimo rozsah: skutečný cross-zařízení sync bez ručního exportu/importu (viz
  analýza §6 — vyžadovalo by tenký cloud backend, mimo "appka nemá backend"
  filozofii této appky). Viz i BL-066 výše — related, ale odlišný požadavek
  (živý endpoint pro ORIGINÁLNÍ export, ne obecná synchronizace mezi zařízeními).
- Zbývající otevřený bod před implementací: **BL-065** (sjednocení `child-1` →
  UUID) zůstává NEEDS INPUT — dopad na testy/fixtures neznámý, mimo rozsah
  tohoto CHANGE; jeho bezprostřední riziko ale kryje FR-5/FR-8, viz výše.
- **Druhé kolo zpětné vazby (uživatel, 2026-09-01) zapracováno:** FR-3 upřesněn
  na explicitní výběr KTERÉHOKOLI dítěte přímo v exportním dialogu (ne jen
  aktivní karta); FR-5 doplněn o kontrolu jména při shodě `childId`; nový FR-8
  doplňuje kontrolu čerstvosti PODLE OBSAHU (ne podle rodinné `revision`, viz
  §0.2 — třetí kolo zpětné vazby opravilo špatnou granularitu prvního návrhu).
  Všechny ostatní NEEDS INPUT body jsou vyřešené — DRAFT je připraven k
  implementaci.
