# Design Review 70 — Rozvrhni: přejmenování aplikace + správa kalendářů v horní liště

**Status:** IMPLEMENTED
**Change ID:** CHANGE-75 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-19
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web` + aktivní (ne-historická) dokumentace
**Trigger:** Uživatel zadal 5 bodů v jednom promptu:
1. Přejmenovat aplikaci na **Rozvrhni** všude.
2. „Jméno Kalendáře“ — umožnit napsat vlastní jméno.
3. „+ Přidat dítě funguje, ale odebrat nefunguje.“
4. Místo „Přidat dítě“ → „Přidat kalendář“ s možností zvolit jméno (viz bod 2).
5. Horní lišta neumožňuje přepínat mezi více kalendáři.

## 0. SOTA analýza

### 0.1 Problém — co skutečně bylo v kódu (ověřeno čtením, ne odhadem)

- **Bod 1**: display název „Krouzky Planner“ žil v `apps/web/app/layout.tsx` (`<title>`), `README.md`
  a několika AKTIVNÍCH (dosud používaných) instrukčních/spec dokumentech (`.github/copilot-instructions.md`,
  `.github/instructions/dev-process.instructions.md`, `.github/docs/*.md`, `test/docs/test-spec.md`,
  `test/docs/test-report.md`). Historické, už IMPLEMENTOVANÉ analytické dokumenty
  (`.github/specs/krouzky-planner-changes-{6-7,8,9}.md`) záměrně **ne**přejmenovány — jsou to hotové
  vstupy z minulosti, ne živá dokumentace (stejná konvence jako u `design_review_<n>.md`, které se také
  nepřepisují zpětně).
- **Bod 2**: `Toolbar.tsx` mělo pole „Kalendář:“ vázané na EFEMÉRNÍ lokální `useState('')` (`calTitle`) —
  nepersistovalo se, po refreshi vždy prázdné, a ovlivňovalo JEN název `.ics` exportu (`calendarTitle`
  parametr `downloadIcs`/`generateIcs`), ne identitu kalendáře v přepínači. `generate.ts` řádek 366 už
  defaultuje `calendarTitle ?? child.name` — tzn. `child.name` byl VŽDY tím skutečným, ale needitovatelným
  (přes UI) jménem kalendáře.
- **Bod 3**: `plannerStore.ts` neměl `removeChild` vůbec — žádné tlačítko, žádná store akce. Nešlo o
  rozbité tlačítko, ale o zcela chybějící funkci.
- **Bod 4**: `addChild()` nepřijímalo žádné jméno, vždy `Dítě ${n}`; tlačítko se jmenovalo „Přidat dítě“.
- **Bod 5**: přepínač `<select aria-label="Dítě">` v `Toolbar.tsx` byl `hidden ... desk:block` — na
  šířkách <900px (FR-12/FR-13, `design_review_65.md`) se NEVYKRESLOVAL VŮBEC, jen statický `<span>` se
  jménem. Přepínání na mobilu šlo jen přes záložku „Děti“ (`MobileChildrenPanel`, `page.tsx`), ne z horní
  lišty — to je přesně to, na co si uživatel stěžuje doslovně („horní lišta“).

### 0.2 Přístup — proč takto, a co záměrně NE

- **Nepřejmenovávat doménový typ `Child` na `Calendar`.** `Child` nese věk/zájmy/dostupnost/rozpočet/
  přesun — atributy, které koncept „kalendáře“ sémanticky nemá. Přejmenování by bylo hluboký, riskantní
  zásah (desítky call-sites v `packages/domain` i `apps/web`, zod schéma, `schemaVersion` bump) a uživatel
  žádal jen UI vrstvu (tlačítko/pole/přepínač), ne přepis datového modelu. Zvoleno: **UI terminologie
  „kalendář“, doména beze změny** — přesně odpovídá bodům 2–5, které mluví jen o UI ovládání.
- **Sloučit „jméno kalendáře“ a `child.name` do jednoho pole.** Odstraněno duplicitní/matoucí efemérní
  `calTitle` (bod 2 byl přesně tento zmatek — uživatel psal jméno, ono nikam nevedlo). Pole „Název
  kalendáře“ teď PŘÍMO edituje `child.name` (nová akce `renameChild`), commit `onBlur`/Enter (stejný vzor
  jako ostatní textová pole v `DetailsPanel`).
- **`removeChild` s kaskádovým úklidem.** Bez smazání `enrollments`/`customEntries` daného `childId` napříč
  VŠEMI `state.schedules` (ne jen aktivní variantou) by zůstaly osiřelé záznamy v uloženém JSON — cizí
  `childId`, na který už nic needukazuje. Guard: nelze smazat poslední kalendář (`children.length <= 1`
  → no-op), aplikace vyžaduje ≥1 kalendář všude jinde.
- **Přidání s volitelným jménem = inline formulář, ne `window.prompt`.** Zvažováno `window.prompt()`
  (nejmíň kódu), ale styl appky nikde nepoužívá nativní dialogy pro vstup (jen `window.confirm` pro
  nevratné akce — viz níže). Inline `<form>` (text input + „Přidat“/„✕“) vedle tlačítka odpovídá
  existujícím vzorům (`CustomEntryDialog`, `SessionTimeEditor`).
- **Odebrání = `window.confirm`, ne vlastní modal.** Na rozdíl od přidání je tohle DESTRUKTIVNÍ akce
  (smaže zápisy) — nativní confirm je rychlé, spolehlivé, a shoduje se s tím, že akci lze vrátit tlačítkem
  Zpět (`commit`/historie), takže riziko je nízké i bez vlastního modalu.
- **Bod 5 fix = zrušit `desk:` gating přepínače, ne rozšířit `MobileChildrenPanel`.** Uživatel explicitně
  řekl „horní lišta“ — proto se `<select>`/pole názvu/přidání/odebrání teď zobrazují VŽDY (na všech
  šířkách) přímo v `<header>` (`Toolbar.tsx`), což je vědomá **revize rozhodnutí FR-12/FR-13**
  (`design_review_65.md`) pro tuto konkrétní skupinu ovládacích prvků. Věk/přesun (`Věk:`, `Přesun:`)
  zůstávají skryté na mobilu beze změny — nebyly předmětem stížnosti a mobilní lišta by se jinak přeplnila.
  `MobileChildrenPanel` (záložka „Děti“) zůstává zachován (věk/přesun tam pořád jen tam), teď i se stejným
  přejmenováním/přidáním/odebráním pro konzistenci — mírná redukce, ne odstraněna (nebylo požádáno).

## 1. Requirements

- **FR-1**: Zobrazovaný název aplikace je „Rozvrhni“ v `<title>` a v aktivně používaných dokumentech
  (README, aktivní `.github`/`test/docs` instrukce). Historické `.github/specs/krouzky-planner-changes-*.md`
  zůstávají beze změny (jsou to hotové, uzavřené vstupy).
- **FR-2**: Pole „Název kalendáře“ v horní liště je vždy vyplněné aktuálním jménem aktivního kalendáře,
  editovatelné (commit onBlur/Enter), a jeho hodnota je i výchozím `X-WR-CALNAME`/názvem `.ics` souboru
  (beze změny chování `generate.ts` — jen odstraněn duplicitní ephemerní override).
- **FR-3**: Existuje funkční `removeChild(childId)` — odebere kalendář ze `state.children` i všechny jeho
  `enrollments`/`customEntries` ze VŠECH `state.schedules`; pokud byl aktivní, aktivuje první zbývající;
  no-op, pokud by zbyl 0 kalendářů. Dostupné z UI (horní lišta + záložka „Děti“) s potvrzením před smazáním.
- **FR-4**: Tlačítko „Přidat dítě“ je všude přejmenováno na „Přidat kalendář“; klik odhalí inline pole na
  jméno (volitelné — prázdné padne na `Kalendář N`), potvrzení vytvoří nový kalendář a přepne na něj.
- **FR-5**: Přepínač kalendářů (`<select>`), pole „Název kalendáře“, „Přidat kalendář“ a „Odebrat“ jsou
  vždy viditelné v horní liště (`<header>`/`banner`) na VŠECH šířkách, ne jen na desktopu.

## 2. Acceptance criteria

- **AC-1** (FR-1): `apps/web/app/layout.tsx` title = `'Rozvrhni'`; žádný E2E test asertuje starý titulek
  (ověřeno grepem `test/specs` — 0 výskytů).
- **AC-2** (FR-2): T-101 (`catalog.spec.ts`) — pole „Název kalendáře“ má při prvním načtení hodnotu
  `'Moje dítě'` (výchozí jméno dítěte), ne prázdný řetězec.
- **AC-3** (FR-3): T-180 (`schedule.spec.ts`) — přidání druhého kalendáře, vlastní událost na něm,
  odebrání s potvrzením → uložený JSON (`Uložit`) obsahuje jen 1 dítě a žádný osiřelý `customEntry` s
  jeho jménem.
- **AC-4** (FR-4): T-180 — tlačítko „Přidat kalendář“ (ne „Přidat dítě“), inline pole „Název nového
  kalendáře“, po potvrzení je aktivní nově vytvořený kalendář se zadaným jménem.
- **AC-5** (FR-5): T-167 (`responsive.spec.ts`, mobilní profily) — `banner` obsahuje viditelné „Přidat
  kalendář“ i textbox „Název kalendáře“ i na `<900px`; T-158 (`persistence.spec.ts`) — totéž pro textbox
  konkrétně v kontextu zavřeného/otevřeného mobilního menu „Další ▾“ (které teď obsahuje jen
  Uložit/Otevřít/export, ne duplicitní pole názvu).

## 3. Non-goals / notes

- Nepřejmenováváme doménový typ `Child`/pole „Věk“/„Co dítě baví“/„Moje dítě“ v `HomeScreen`/
  `MobileChildrenPanel` na terminologii „kalendář“ — mimo scope (viz §0.2). Pokud to uživatel bude chtít
  příště, je to samostatná, větší změna (nová `BL-<NNN>`, zatím nezaložena — čeká na explicitní zadání).
- Neodstraňujeme mobilní záložku „Děti“ (`MobileChildrenPanel`) — zůstává pro Věk/Přesun, teď navíc se
  stejným přejmenovaným/rozšířeným přidáním/odebráním pro konzistenci s horní lištou.
- Label exportu „Kalendář — všechny děti (.ics)“ zůstává beze změny (nebyl součástí zadání, jen tlačítko
  „Přidat dítě“ bylo explicitně zmíněno).
- Odebrání používá `window.confirm` (nativní), ne vlastní modal — nízké riziko vzhledem k dostupnému Zpět.
