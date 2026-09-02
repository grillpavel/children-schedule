# Design Review 103 — Vnořený dialog se ořezával kvůli CSS transformu na předkovi

**Status:** IMPLEMENTED
**Change ID:** CHANGE-111 (app-only, `apps/web`)
**Date:** 2026-09-02
**Repo:** monorepo `Children_schedule` — `apps/web/src/components/{DialogShell,DetailsPanel}.tsx`,
`test/specs/{panel,schedule}.spec.ts`
**Trigger:** uživatel otestoval CHANGE-110 (`design_review_102.md`) a nahlásil, že vlastní události
„Zpěv" a „Angličtina" otevírají „jiné okno než zbytek událostí".

## 0. SOTA analýza

### 0.1 Problém

CHANGE-110 sjednotil čtyři nezávislé implementace popup oken do jedné sdílené `DialogShell`, ale
neřešilo případ, kdy se jeden `DialogShell` otevře **uvnitř** jiného už otevřeného `DialogShellu` —
což se reálně děje pokaždé, když uživatel klikne na „Upravit" u vlastní události nebo „Upravit
údaje"/„Upravit časy" u katalogového kroužku zevnitř mobilního detailu (samo o sobě `DialogShell`).

Přímou reprodukcí (izolovaný headless Chromium, viz §0.2) potvrzeno: vnější dialog má
`animate-in zoom-in-95 duration-150` (Tailwind/`tailwindcss-animate`). Finální keyframe této animace
je **identitní** `transform: scale(1) translate(0)`, ne `transform: none` — a `tailwindcss-animate`
tuto hodnotu po doběhnutí animace nikdy neodstraní. Podle CSS specifikace **jakýkoliv nenulový/nenull
`transform` na předkovi z něj dělá "containing block" pro `position: fixed` potomky** — vnořený dialog
(vnitřní `DialogShell`) se tak místo celé obrazovky (390×844) ořízl na rozměry vnějšího boxu
(~356×707, s nenulovým offsetem), protože se jeho `fixed inset-0` backdrop/karta počítaly relativně
k tomuto transformovanému předkovi, navíc oříznuté jeho `overflow-hidden`.

Toto NENÍ specifické pro vlastní události — **stejný bug má i editace katalogového kroužku**
(`ActivityEditor`/`SessionTimeEditor` v `DetailsPanel.tsx`, „Upravit údaje"/„Upravit časy") — ty ale
CHANGE-110 vůbec nemigroval na `DialogShell` (mimo scope patche), takže měly úplně stejný ruční
`fixed inset-0 z-50 ... animate-in zoom-in-95` vzor, se stejným důsledkem. Ověřeno empiricky, ne jen
čtením kódu — viz §0.2.

### 0.2 Přístup

- **Fix**: `DialogShell` nově renderuje přes `createPortal(..., document.body)` — vnořený dialog už
  nikdy není potomkem žádného transformovaného předka, `position: fixed` se tak vždy počítá vůči
  reálnému viewportu bez ohledu na hloubku vnoření. `document.body` lze volat přímo bez SSR guardu,
  protože každé použití `DialogShell` je podmíněné klient-side `useState`/store stavem, který je při
  serverovém renderu vždy `false`/`null` — komponenta se tedy nikdy nevykreslí během serverového
  průchodu.
- **Zjištěno navíc, mimo původní hlášení**: `ActivityEditor`/`SessionTimeEditor` (editace katalogového
  kroužku) měly identický ruční vzor, nikdy nemigrovaný na `DialogShell` — CHANGE-110 §2 je nezmiňuje
  jako vědomě vyloučené, jde o mezeru ve scope patche, ne záměr. Migrovány na `DialogShell` ve stejné
  session — jinak by stejný report přišel znovu při testu editace kroužku.
- **Diagnostická metoda**: sdílená stránka prohlížeče (browser tool) se po několika `page.reload()`
  a nahromaděném stavu dialogů přestala odpovídat na kliky (i programové `element.click()`), bez
  jediné console chyby — restart dev serveru problém nevyřešil na TÉŽE stránce. Přechod na
  jednorázový headless Chromium spuštěný přes nainstalovaný E2E Playwright
  (`chromium.launch()` + `newPage({viewport})`) reprodukci i ověření opravy vyřešil na první pokus.
  Obecnější verze již zaznamenané poučky (dřívější CHANGE-100/104/106 gotcha o nespolehlivosti
  sdílené stránky pro viewport testy) — nyní i pro úplnou neodpovídavost kliků/navigace.

## 1. Requirements

- **FR-1**: `DialogShell` renderuje svůj obsah přes `createPortal(..., document.body)` — vnořený
  dialog (editor otevřený zevnitř jiného dialogu) musí zabírat celý viewport (`{x:0,y:0,width,height}`
  rovné `window.innerWidth/innerHeight`), ne rozměry vnějšího boxu.
- **FR-2**: `ActivityEditor` a `SessionTimeEditor` (`DetailsPanel.tsx`) migrují na `DialogShell` —
  stejná unifikace jako CHANGE-110 pro `CustomEntryDialog`/`PrintRangeDialog`/`PrivacyDialog`/mobilní
  detail. Vnitřní obsah (formulářová pole, `SessionTimeRow` komponenty) zůstává beze změny.
- **FR-3**: Existující E2E testy, které SCOPE lokátor na `detail`/`main`/mobilní dialog za účelem
  dosažení na obsah těchto dvou editorů, musí být přepsány na `page.getByRole('dialog', {name:
  <titulek editoru>})` — portalovaný obsah už není DOM potomkem toho, čeho byl dřív (Playwright
  scoped lokátory jsou založené na DOM containment, ne na vizuální pozici).

## 2. Acceptance criteria

- **AC-1**: `tsc --noEmit` (apps/web) čisté.
- **AC-2**: `next build` čistý.
- **AC-3**: izolovaný repro skript (throwaway Chromium) potvrzuje `{x:0,y:0,width:390,height:844}`
  backdrop pro vnořený `CustomEntryDialog` (editace vlastní události) i pro vnořený
  `ActivityEditor`/`SessionTimeEditor` (editace katalogového kroužku), oba portalované přímo do
  `document.body` (`backdrop.parentElement === document.body`).
- **AC-4**: plná 6profilová E2E sada (`pnpm run test:e2e`) zelená — konkrétně T-145 (`panel.spec.ts`)
  a T-178/T-179 (`schedule.spec.ts`), které portál rozbil (scoped lokátor už nedosáhl na portalovaný
  obsah), opraveny na `page.getByRole('dialog', {name: ...})` a znovu zelené.

## 3. Non-goals / notes

- `BL-067` (design_review_102.md, doporučené regresní testy pro Escape/klik-mimo/44px napříč všemi
  `DialogShell` instancemi) zůstává otevřený — tento CHANGE ho nezavírá, jen přidává další dvě
  komponenty do jednotné obálky.
- `PopoverBackdrop` (ukotvené dropdown menu Toolbaru) zůstává mimo `DialogShell`, beze změny — stejné
  odůvodnění jako design_review_102.md §3.
- **Nová mezera zjištěná při ověřování (ne vyřešená tímto CHANGE)**: `Toolbar.tsx` má ještě TŘI další
  ruční `fixed inset-0 z-50 ... animate-in zoom-in-95` dialogy mimo scope CHANGE-110 i tohoto CHANGE —
  „Uložit rozvrh" (`saveDialogOpen`), „Potvrdit import" (`pendingImport`), „Otevřít kalendáře" (iOS
  export, `iosExportLinks`). Žádný z nich se dnes běžně neotevírá VNOŘENĚ do jiného dialogu (Toolbar
  není sám uvnitř `DialogShell`), takže je `createPortal` fix z FR-1 nutně nezasahuje — ale trpí
  stejnou nekonzistencí vzhledu/chování jako CHANGE-110 řešil u ostatních čtyř. Tracked as `BL-068`.
  Nezakládám je do FR-2 tohoto CHANGE, ať zůstane fokusovaný na konkrétně hlášený a ověřený bug.
