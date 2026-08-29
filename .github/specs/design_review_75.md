# Design Review 75 — Vlna 2 velkého UI/UX redesignu (design_review_73.md)

**Status:** IMPLEMENTED (FR-W2-1, FR-W2-2, FR-W2-3); FR-W2-4/FR-W2-5 vědomě NEIMPLEMENTOVÁNY — viz §0.3
**Change ID:** CHANGE-82 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web`
**Trigger:** Uživatel požádal o pokračování Vlnou 2 a 3 z `design_review_73.md` po dokončení Vlny 1
(CHANGE-81, `design_review_74.md`).

## 0. SOTA analýza

### 0.1 Rozsah — 3 z 5 FR Vlny 2 implementovány

| FR | Nález (design_review_73.md) | Řešení |
|---|---|---|
| FR-W2-1 | Landscape na mobilu nemá vlastní layout — spodní navigace by v malé výšce zabrala příliš mnoho | Nový hook `useIsLandscapeCompact()` (`(orientation: landscape) and (max-height: 500px)`), spodní `<nav>` se v tomto stavu stane bočním railem (56px, `fixed inset-y-0 left-0`), obsah dostane `pl-14` |
| FR-W2-2 | `HOUR_PX` byla konstanta, ne proměnná reagující na výšku | `grid.ts`: `topPx`/`heightPx`/nová `gridHeightPx` přijímají volitelný `hourPx` parametr (výchozí `HOUR_PX=44`); `ScheduleGrid.tsx` v landscape-compact použije `hourPx=26` |
| FR-W2-3 | Sloupce dnů v mobilní mřížce se tísnily do `1fr` (~23–50px podle šířky) | Na mobilu `gridTemplateColumns: repeat(N, minmax(72px, 1fr))`, scroll kontejner dostal `overflow-x-auto`, časová osa `sticky left-0` |
| FR-W2-4 | Tabletové breakpointy 768px/1180px místo jediného 900px zlomu | **NEIMPLEMENTOVÁNO — viz §0.3, konflikt s existujícím rozhodnutím** |
| FR-W2-5 | Jeden React stav řídící layout napříč šířkami (CSS-driven, ne remount) | **NEIMPLEMENTOVÁNO — záviselo by na FR-W2-4** |

### 0.2 Zjednodušení oproti auditu (transparentně, jako u FR-W1-5 v design_review_74.md)

- FR-W2-2 nepočítá hustotu kontinuálně z `clientHeight` scroll kontejneru (jak audit navrhoval,
  „`--hour-px` reaguje na výšku") — místo toho používá DVĚ diskrétní hodnoty (44px normálně, 26px
  v landscape-compact). Kontinuální měření by přidalo `ResizeObserver`/re-render smyčku bez jasného
  přínosu oproti jednoduchému přepínači vázanému na stejný breakpoint jako FR-W2-1 (obě řeší tentýž
  scénář — mobil na šířku s malou výškou).
- FR-W2-1 nepočítá s `safe-area-inset-left` u toastu/sheetu (jen u samotného railu) — toast zůstává
  horizontálně centrovaný podle celého viewportu, ne podle zbylé plochy za railem. Kosmetická
  nepřesnost (pár px), ne funkční vada.
- Žádný z 6 profilů v `test/playwright.config.ts` nemá landscape-compact rozměry (všechny mobilní
  profily jsou na výšku) — nové testy T-226/T-227 proto vynucují vlastní viewport
  (`test.use({ viewport: { width: 844, height: 390 } })`) a běží jen na projektu `mobile`
  (`test.skip` na ostatních 5), ať se nezdvojuje 6× stejný test.

### 0.3 Proč FR-W2-4/FR-W2-5 NEimplementovány — konflikt s existujícím rozhodnutím

Audit navrhuje tabletové zlomy **768px** (dva sloupce) a **1180px** (tři sloupce místo dnešních
1440px). Při ověření proti aktuálnímu kódu a testům vyšel najevo přímý konflikt s dřívějším,
záměrným produktovým rozhodnutím:

- `desktop-narrow` profil (**1280px**) je dnes v „medium" pásmu (900–1440, Info jako slide-over) —
  třísloupcový layout začíná až od **1440px** (C9-L1, `design_review_XX.md` z dřívějška).
- Test **T-201** se jmenuje doslova „při 1280px nejsou tři stálé sloupce" a explicitně asertuje
  OPAK toho, co by FR-W2-4 zavedlo (1180px práh by 1280px překlopil na tři stálé sloupce).
- `tablet-portrait` (834px) je dnes v „compact" pásmu (<900, spodní navigace + jeden panel). Nový
  768–1179px „tablet" pás by ho přeřadil do zcela nové, dosud neexistující kategorie UI (2sloupcový
  layout, horní segmentovaná navigace místo spodní, katalog jako overlay) — to by dopadlo na
  desítky existujících testů vázaných na `isCompact()` (T-158, T-167, T-202, T-215…), ne jen na pár.

Implementace „naslepo" by tak buď (a) tiše přepsala dřívější explicitní rozhodnutí (a rozbila T-201,
který ho hlídá), nebo (b) vyžadovala rozsáhlý přepis `isCompact`/`isThreeColumn` a desítek testů na
NOVÝ třípásmový model (mobil/tablet/desktop) — to je svým rozsahem srovnatelné s celým vlastním
redesignem, ne „střední" položkou Vlny 2. Rozhodnutí, zda **posunout** hranici tří sloupců z 1440 na
1180px (a tím vědomě zneplatnit T-201), případně zavést třetí „tablet" pásmo mezi 768–1179px, je
proto ponecháno na uživateli — nejde o technický detail, ale o produktové rozhodnutí s dopadem na
chování dvou už otestovaných profilů (`desktop-narrow`, `tablet-portrait`). Sledováno jako BL-051.

## 1. Requirements (implementované)

- **FR-W2-1**: `useIsLandscapeCompact()` v `useBreakpoint.ts`; `<nav>` v `page.tsx` se v tomto stavu
  stává `fixed inset-y-0 left-0 w-14` railem s tlačítky ve sloupci; kořenový div dostane `pl-14`;
  mobilní sheet a toast přizpůsobí spodní odsazení (bez zbytečné rezervy na neexistující spodní nav).
- **FR-W2-2**: `grid.ts` exportuje `gridHeightPx(hourPx?)`, `topPx(min, hourPx?)`,
  `heightPx(start, end, hourPx?)` — všechny s výchozí hodnotou `HOUR_PX=44`, beze změny chování mimo
  `ScheduleGrid.tsx`. V landscape-compact `ScheduleGrid` použije `hourPx=26`.
- **FR-W2-3**: Na mobilu (`useIsMobile()`) mají sloupce dnů `minmax(72px, 1fr)` a scroll kontejner
  `overflow-x-auto`; časová osa je `sticky left-0`, ať zůstane čitelná při vodorovném scrollu.

## 2. Acceptance criteria

- **AC-1** (FR-W2-1): T-226 — v landscape-compact viewportu (844×390) je `<nav>` svislý pruh
  šířky ≤60px a výšky ≥300px; hlavička začíná až za ním (`x ≥ šířka railu`); žádné vodorovné
  přetečení stránky.
- **AC-2** (FR-W2-2): T-227 — 90minutová vlastní událost má v landscape-compact výšku bloku < 66px
  (hodnota při výchozí hustotě 44px/hod), ale ≥16px (spodní čitelná mez).
- **AC-3** (FR-W2-3): T-225 — na kompaktních profilech má `role="row"` `scrollWidth ≥ 7×72px`, ale
  dokument jako celek nepřetéká (`scrollWidth − clientWidth ≤ 1px`).
- Celá E2E sada (6 profilů + landscape override) zůstává zelená.

## 3. Non-goals / notes

- **FR-W2-4/FR-W2-5 zůstávají DRAFT** — čekají na explicitní rozhodnutí uživatele: buď (a) posunout
  práh tří sloupců z 1440 na 1180px a přepsat T-201, nebo (b) zavést nezávislé tabletové pásmo
  768–1179px vedle dnešního compact/medium/wide modelu (větší práce, dopad na desítky testů), nebo
  (c) ponechat beze změny. Sledováno jako **BL-051**.
- Vlna 3 (FR-W3-1 až FR-W3-8) zůstává samostatná — zpracovávána navazujícím spec dokumentem.
