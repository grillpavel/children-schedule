# Design Review 102 — Vyskakovací okna neměla jednotnou implementaci

**Status:** IMPLEMENTED (2026-09-02) — patch aplikován, ověřeno lokálně
(`tsc --noEmit`, `next build`, plná 6profilová E2E sada, viz §4)
**Change ID:** CHANGE-110 (app-only, `apps/web`)
**Date:** 2026-09-02
**Repo:** `apps/web/src/components/{CustomEntryDialog,PrintRangeDialog,PrivacyDialog,DialogShell}.tsx`,
`apps/web/app/page.tsx`
**Trigger:** uživatel nahlásil, že i po předchozích opravách (design_review_97,
100, 101 — mobilní detail položky) se různá vyskakovací okna v appce chovají a
vypadají nekonzistentně — jiné informace, jiné umístění — a hodnotil to jako
„nedotaženou, amatérskou práci".

## 0. Analýza — kořenová příčina

Předchozí design review (97/100/101) řešily vždy JEDNU konkrétní obálku
(mobilní modál detailu položky v `page.tsx`). Uživatelovo nové hlášení je ale
širší: netýká se jen té jedné obálky, ale **celé rodiny popup oken** napříč
appkou, protože **žádná sdílená komponenta pro modální dialog neexistovala**.
Čtyři nezávislé implementace (`CustomEntryDialog`, `PrintRangeDialog`,
`PrivacyDialog`, mobilní detail v `page.tsx`) měly každá svůj ručně psaný
`<div className="fixed inset-0 z-50 ...">` strom, který se v čase nezávisle
rozjel v přesně těch vlastnostech, které uživatel popsal jako matoucí:

| Vlastnost | CustomEntryDialog | PrintRangeDialog | PrivacyDialog | Mobilní detail (`page.tsx`) |
|---|---|---|---|---|
| Barva podkladu | `slate-900/50` + blur | `black/40`, bez blur | `black/40`, bez blur | `slate-900/50` + blur |
| Klik mimo zavře? | **NE** (chybělo `onClick`) | ano | ano | ano |
| `role="dialog"`/`aria-modal` | **CHYBĚLO** | ano | ano | ano |
| Zavře Escape? | **NE** (`useEscapeToClose` nevolán) | ano | ano | **NE** (nevolán) |
| Vstupní animace | `zoom-in-95 150ms` | žádná | žádná | `zoom-in-95 150ms` |
| Close tlačítko | 44×44 px | ~28×28 px (`p-1.5`) | ~28×28 px (`p-1.5`) | 44×44 px |

**Empiricky potvrzeno čtením zdrojového kódu** (ne odhad) — viz commit diff.
Zvlášť pozoruhodné: existuje komponenta `PopoverBackdrop.tsx` s komentářem
*„stejný vizuál jako referenční CustomEntryDialog"*, ale používá se výhradně
v dropdown menu v `Toolbar.tsx` — žádný ze čtyř dialogů ji reálně nepoužívá.
Sjednocení bylo jednou navrženo, ale nikdy dotažené do všech míst, která na
něj odkazují v komentářích.

Dvě z těchto čtyř rozdílů jsou navíc reálné funkční/accessibility bugy, ne jen
vizuální nekonzistence:
- `CustomEntryDialog` (appka ho na několika místech označuje jako
  „referenční" chování) šlo zavřít jen tlačítkem — ne Escape, ne kliknutím
  mimo — přesně obráceně, než by referenční implementace měla demonstrovat.
- `PrintRangeDialog`/`PrivacyDialog` měly close tlačítko ~28×28 px, pod
  vlastním README deklarovaným standardem „dotykové cíle ≥44 px" a pod
  WCAG 2.2 SC 2.5.8 — žádný existující E2E test (T-213) to nezachytil, protože
  T-213 testuje jen close tlačítko `CustomEntryDialog`, ne ostatní tři dialogy.

## 1. Requirements

- **FR-1**: Vznikne jedna sdílená komponenta `DialogShell` (`apps/web/src/
  components/DialogShell.tsx`) nesoucí VŠECHNY průřezové vlastnosti
  centrovaného modálního dialogu: backdrop (`slate-900/50` + blur), klik na
  podklad zavírá, `Escape` zavírá (`useEscapeToClose`), `role="dialog"
  aria-modal="true"` + `aria-labelledby`/`aria-label`, vstupní animace
  `zoom-in-95 150ms`, close tlačítko vždy 44×44 px.
- **FR-2**: `CustomEntryDialog`, `PrintRangeDialog`, `PrivacyDialog` a mobilní
  detail položky v `page.tsx` migrují na `DialogShell` — obsah (formulář,
  text, `DetailsPanel`) zůstává beze změny, mění se jen obálka.
- **FR-3**: `DialogShell` NENAHRAZUJE `PopoverBackdrop` — ukotvené dropdown
  menu (Toolbar „Další ▾", výběr kalendáře) je odlišný, oprávněně jiný vzor
  (ukotvený k triggeru, ne centrovaný na obrazovce) a zůstává, jak je.
- **FR-4**: Zachovat existující API rozdíly, na kterých závisí E2E:
  - mobilní detail položky nadále `aria-label="Detail kroužku"` a close
    tlačítko `aria-label="Zavřít detail"` (T-219, T-220, schedule.spec.ts) —
    `DialogShell` proto má volitelný prop `closeLabel` (výchozí `"Zavřít"`).
  - `PrivacyDialog` nadále přístupné jméno dialogu „Soukromí a data"
    (persistence.spec.ts T-181) — řešeno přes `title` prop + `aria-labelledby`
    (accessible name se počítá z textu nadpisu, ne z konkrétní hodnoty ID).
  - mobilní detail nadále pevná výška `h-[85dvh]` (design_review_101.md) —
    `DialogShell` prop `height="fixed"` vs. `height="auto"` (`max-h-[92dvh]`)
    pro ostatní tři.
  - mobilní detail nadále `glass` efekt na vnějším rámu s PLNĚ bílým vnitřním
    obsahem (design_review_73.md — sklo je jen ambientní rám, ne přes text) —
    `DialogShell` prop `glass`.
- **FR-5**: Vnější backdrop/kartu obou dialogů zachovat pod stejným CSS
  selektorem `.fixed.inset-0.z-50`, na kterém závisí 16 existujících E2E testů
  (`page.locator('.fixed.inset-0.z-50')`) — `DialogShell` používá identický
  řetězec tříd na backdrop wrapperu.

## 2. Co NENÍ součástí tohoto CHANGE (vědomě odloženo)

`DetailsPanel` (detail/edit obsah položky) je dnes mountovaný ve **čtyřech**
strukturálně odlišných kontextech (`page.tsx`): trvalý sloupec na širokém
desktopu (`isWide`), plná záložka „Děti" na mobilu, slide-over drawer na
středních šířkách (900–1440, `info-drawer`), a centrovaný modál na mobilu
(právě opravovaný tímto CHANGE). První tři NEJSOU modální dialogy — jsou to
legitimně odlišné layout kontejnery (persistentní panel vs. záložka vs.
drawer), ne varianty téhož popupu, a `DialogShell` pro ně není vhodný beze
změny jejich účelu v layoutu. Případné sjednocení hlavičky/close chování mezi
drawerem (textové „Zavřít") a modálem (ikona) by vyžadovalo samostatnou
UX rozvahu nad tím, co tyto kontexty mají/nemají sdílet — navrhuji jako
samostatný backlog item, ne součást tohoto CHANGE.

## 3. Acceptance criteria

- **AC-1**: `tsc --noEmit` čisté (ověřeno v této session).
- **AC-2**: `CustomEntryDialog` nově zavírá Escape i kliknutím mimo (dřív ani
  jedno) — regresní test chybí, doporučeno přidat do `panel.spec.ts` nebo
  `a11y.spec.ts` jako nový T-ID.
- **AC-3**: `PrintRangeDialog` a `PrivacyDialog` close tlačítko ≥44×44 px —
  doporučeno rozšířit T-213 (`responsive.spec.ts`), aby iterovalo přes VŠECHNY
  `DialogShell` instance, ne jen `CustomEntryDialog` (mezera, kvůli které tenhle
  konkrétní bug prošel nepovšimnut).
- **AC-4**: Existující E2E specifické pro tyto dialogy musí projít beze změny
  (aria jména, `closeLabel`, `.fixed.inset-0.z-50` selektor) — viz FR-4/FR-5.
- **AC-5**: Vizuální baseline `sheet-glass-on/off` (mobile, mobile-small,
  tablet-portrait) **musí být regenerovány** — `PrintRangeDialog`/
  `PrivacyDialog` backdrop se změnil z `black/40` na `slate-900/50` + blur
  (očekávaná, žádoucí změna, ne regrese). `CustomEntryDialog` a mobilní
  detail nemění vzhled (jen přidávají chování), takže jejich baseline by
  změněny být NEMĚLY — pokud diff ukáže rozdíl i tam, jde o skutečnou
  regresi k dohledání.
- **AC-6**: Plná 6profilová E2E sada (`pnpm run test:e2e`) zelená.

## 4. Implementace — stav

Patch aplikován (`git apply CHANGE-110.patch`, čistě, bez konfliktů) a ověřen
lokálně:

- `tsc --noEmit` (apps/web) — čisté.
- `next build` — čistý build, statické stránky vygenerovány (síťový přístup
  na `fonts.googleapis.com` v tomto prostředí dostupný).
- Plná 6profilová E2E sada (`pnpm run test:e2e` ekvivalent, `--workers=1`) —
  **780 passed / 252 skipped / 0 failed**, identické s baseline před CHANGE-110
  (CHANGE-108) → nulová regrese.
- **AC-5 upřesnění**: žádný `toHaveScreenshot` test ve `visual.spec.ts`
  nesnímkuje `PrintRangeDialog`/`PrivacyDialog` přímo (jen `toolbar`/
  `empty-info`/`catalog-filtered`/`info-dark`/`sheet-glass-on`/`sheet-glass-off`)
  — změna jejich backdropu proto NEVYŽADOVALA regeneraci žádné baseline;
  `sheet-glass-on/off` (mobilní detail) prošly beze změny snímku, přesně jak
  §3 předpokládala (obálka se chová stejně, jen přibylo chování).
- AC-2/AC-3 (nové regresní testy pro Escape/klik-mimo u `CustomEntryDialog` a
  ≥44px close tlačítko napříč všemi čtyřmi dialogy) nebyly v této session
  přidány — sledováno jako `BL-067`.
