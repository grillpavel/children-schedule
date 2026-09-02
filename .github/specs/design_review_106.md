# Design Review 106 — Vlastní událost pořád chyběla dvě strukturální pole, ne jen data

**Status:** IMPLEMENTED (2026-09-02) — patch aplikován, ověřeno lokálně
včetně plné E2E sady (viz §4)
**Change ID:** CHANGE-113 (`packages/domain` + `apps/web`)
**Date:** 2026-09-02
**Repo:** `packages/domain/src/model/schema.ts`, `packages/domain/src/ics/generate.ts`,
`apps/web/src/components/DetailsPanel.tsx`
**Trigger:** uživatel po CHANGE-112 (obsahová parita — kategorie/věk/popis/odkaz)
poslal screenshoty „Angličtina“ (vlastní událost) vs. „Atletika — přípravka“
(katalog) a trval na tom, že rozdíl v obsahu i „typu oken“ pořád existuje.

## 0. Analýza — co bylo skutečně jinak

Rozdíl měl DVĚ různé příčiny a bylo důležité je nesměšovat:

1. **„Angličtina“ konkrétně nemá vyplněná volitelná pole** z CHANGE-112
   (kategorie/věk/popis/odkaz na přihlášku) — to není bug, CHANGE-112 dal
   schématu a formuláři *možnost* tato pole vyplnit, nedoplnil je retroaktivně
   do existujících záznamů. Pokud má „Angličtina“ vypadat bohatší, je potřeba
   ji přes „Upravit“ doplnit — to už dnes jde.
2. **Dvě sekce byly u `Activity` VŽDY vidět v detailu bez ohledu na data,
   u `CustomEntry` chyběly úplně** — to skutečně byl bug/mezera, potvrzeno
   přímým čtením kódu:
   - **„Barva kroužku“** — `SelectedActivity` ji ukazuje přímo v detailu
     (`DetailsPanel.tsx:540-546`); vlastní událost barvu šla změnit jen skrz
     otevření editačního dialogu, ne inline.
   - **„Povolit i o prázdninách a státních svátcích“** — `ActivityOverride`
     má `allowOnHolidays` (design_review_68.md); `CustomEntry` neměl
     odpovídající pole VŮBEC — `packages/domain/src/ics/generate.ts` pro
     vlastní události natvrdo posílal `allowOnHolidays: false`, takže
     uživatel neměl žádnou možnost o prázdninách/svátcích, na rozdíl od
     kroužku.

Při opravě barvy se navíc našel **samostatný, závažnější bug** (ne kosmetický):
`ics/generate.ts` volalo `eventCss(undefined, undefined)` pro každou vlastní
událost — `entry.colorOverride` se do exportu (.ics) vůbec nedostal. Barva
zvolená v appce byla čistě kosmetická jen uvnitř prohlížeče; export vždy
spadl na jednu plochou barvu dítěte. Opraveno stejným commitem, protože jde
o stejné pole (`colorOverride`) a bez opravy by inline swatch picker (FR-2
níže) tvářil funkčnost, která ve výsledném souboru nikam nevede.

## 1. Requirements

- **FR-1**: `customEntrySchema` rozšířen o `allowOnHolidays: z.boolean().optional()`
  (stejný název/sémantika jako `ActivityOverride.allowOnHolidays`).
- **FR-2**: `CustomEntryDetail` zobrazuje „Barva kroužku“ (swatch picker) a
  „Povolit i o prázdninách…“ (checkbox) VŽDY, ve stejné pozici a stylu jako
  `SelectedActivity` — obojí zapisuje přímo přes `updateCustomEntry`, beze
  nutnosti otevřít editační dialog.
- **FR-3**: `ics/generate.ts` pro `CustomEntry`:
  - `allowOnHolidays: entry.allowOnHolidays === true` (dřív natvrdo `false`).
  - `colorCss: eventCss(entry.id, entry.colorOverride)` — `eventCss` je
    generická funkce (`colorMode === 'single' || !activityId → childCss;
    jinak overrideCss ?? colorForActivity(id).css`) — `colorForActivity` navzdory
    názvu jen deterministicky hashuje libovolné ID do palety, takže funguje
    stejně dobře s `entry.id` jako s `activity.id`. Každá vlastní událost tak
    v multi-color exportu dostane stabilní vlastní barvu (dřív splynuly do
    jedné plosché barvy dítěte), a uživatelův `colorOverride` se konečně
    do exportu propíše.

## 2. Co zůstává mimo rozsah (a proč)

`ics/generate.ts` pro vlastní události bez `colorOverride` padá na obecný
hash `colorForActivity(entry.id)`, NE na `KIND_DEFAULT_CSS`/`CUSTOM_COLOR`
mapu, kterou appka používá pro zobrazení v gridu
(`apps/web/src/hooks/useScheduleView.ts`). Sjednotit i tohle by znamenalo
buď přesunout `KIND_DEFAULT_CSS` do `packages/domain` (posunutí prezentační
konstanty do doménové vrstvy), nebo duplikovat mapu na dvou místech — obojí
je samostatné architektonické rozhodnutí, ne oprava parity. Barva bez
override tak může být v exportu jiná (ale stabilní a odlišitelná), než jakou
appka vykresluje v gridu, dokud/pokud se toto neřeší zvlášť.

## 3. Acceptance criteria

- **AC-1**: `tsc --noEmit` čisté (`apps/web`).
- **AC-2**: `pnpm -C packages/domain test` — 155/155 zelených, žádná regrese
  (ověřeno; `ics.test.ts` neobsahoval test závislý na starém `false`/flat-color
  chování pro CustomEntry, takže žádný test se nerozbil, ale žádný ani
  nepokrýval tenhle případ — proto mohla mezera vzniknout a zůstat
  nepovšimnutá; doporučeno přidat regresní test).
- **AC-3**: Manuálně ověřeno v headless Chromiu (390×844) reprodukcí přesně
  scénáře ze zaslaného screenshotu („Angličtina“, jen název + typ + čas,
  nic jiného vyplněno) — sekce Barva a Prázdniny se teď zobrazují vždy;
  zbylá „prázdnota“ oproti katalogové položce odpovídá přesně tomu, co
  „Angličtina“ nemá vyplněno (adresa, cena, věk, kategorie, popis) — což je
  očekávané chování pro nepovinná pole, ne chyba.
- **AC-4**: Existující export (.ics) pro rozvrhy BEZ `allowOnHolidays`/nového
  chování barvy zůstává čitelný (pole optional, `colorMode: 'single'` beze
  změny — stále vrací `childCss`).

## 4. Implementace — stav

Patch aplikován (soubory tohoto CHANGE dodané společně s CHANGE-114 v jednom
patchi, viz design_review_107.md §4). Ověřeno lokálně:

- `pnpm -C packages/domain test` — **155/155 zelených**.
- `pnpm -C apps/web typecheck` a `pnpm -C apps/web build` — čisté.
- Plná 6profilová E2E sada — **780 passed / 252 skipped / 0 failed** (shodné s
  CHANGE-112 baseline, nulová regrese).
- **Ručně dodatečně ověřeno** (headless Chromium, 390×844): přidána vlastní
  událost, klik na barevný swatch a checkbox prázdnin přímo v detailu (bez
  otevření „Upravit“) fungoval; následně stažený `.ics` obsahoval
  `COLOR:steelblue` pro danou událost — potvrzuje FR-3 opravu (dřív export
  barvu vůbec neobsahoval).

AC-2 doporučilo přidat regresní test pro tento případ — nebylo součástí
tohoto patche, sledováno jako `BL-070`.
