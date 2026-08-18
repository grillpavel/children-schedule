# Design Review 63 — Tabletový master-detail: trvalý sloupec místo overlay (FR-7)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-64 (app `@krouzky/web`: implementace FR-7 z `design_review_58.md`)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web)
**Trigger:** pokračování v implementaci `design_review_58.md` (DRAFT CHANGE-59) po CHANGE-60/61/62/63.

## 0. SOTA analysis

- **0.1 Problem.** Supersedes `design_review_58.md` §1 FR-7 (CHANGE-59, DRAFT). Na středních šířkách
  (900–1439 px, profily `desktop-narrow` 1280 a `tablet-landscape` 1112) se detail/souhrn otevíral jako
  `absolute inset-y-0 right-0` panel s `shadow-2xl` a `z-40` — vizuálně overlay nad obsahem, i když ve
  skutečnosti nezakrýval katalog (ten je `desk:w-80` trvalý sloupec vlevo), jen se **vizuálně tvářil**
  jako dočasný slide-over místo trvalého sloupce.
- **0.2 Approach.** Zamítnutá alternativa: snížit práh `isWide`/`isThreeColumn` (dnes 1440 px) tak, aby
  medium šířky spadly do stávající trvalé 3sloupcové logiky — zamítnuto, protože `isThreeColumn`/
  `info-drawer` test ID je svázané s **~46 místy v 7 spec souborech** (větvení `detailScope`,
  `openSummaryIfMedium` apod.); změna prahu by změnila, který profil dostane „drawer" vs „trvalý sloupec"
  větev v desítkách testů současně — neúměrné riziko vůči přínosu.
  Zvolené řešení: **beze změny podmínky** kdy se panel zobrazí (`!isMobile && !isWide && (hasSelection ||
  mediumInfoOpen)`) ani test id (`data-testid="info-drawer"`) — jen CSS pozicování z `absolute` overlay na
  normální flex-sloupec (`shrink-0`, bez `absolute`/`z-40`/`shadow-2xl`, `shadow-2xs` jako ostatní trvalé
  panely). Protože `<main>` je `flex`, mřížka (`flex-1`) se nyní skutečně zmenší o šířku panelu místo
  toho, aby byla panelem překrytá — pravé „master-detail" bez překryvu, se stejným breakpointem a stejnými
  testovacími lokátory jako dřív.

## 1. Requirements

- **FR-7** Na středních šířkách (900–1439 px) zůstává katalog viditelný souběžně s otevřeným detailem/
  souhrnem — bez překryvu, ne jako overlay nad obsahem.

## 2. Acceptance criteria

- **AC-1** Nový **T-162** (`responsive.spec.ts`, jen `desktop-narrow`/`tablet-landscape`): po výběru
  kroužku má katalogové vyhledávací pole rozumnou šířku (>150 px) a jeho pravý okraj nepřesahuje levý
  okraj detailu (žádný překryv).
- **AC-2** Existující testy závislé na `info-drawer`/`isThreeColumn` (46 míst v 7 souborech) zůstávají
  beze změny a zelené (ověřeno `responsive`/`panel`/`catalog`/`schedule`/`visual` na `desktop-narrow` a
  `tablet-landscape`).
- **AC-3** Vizuální baseline (`T-400`–`T-403`) beze změny — obsah panelu je stejný, jen jeho CSS pozice v
  rámci stránky (locator scope zůstává na panelu samotném).
- **AC-4** `tsc --noEmit` (web) čisté; plná E2E `--workers=1` zelená.

## 3. Non-goals / notes

- Breakpointy `isCompact`/`isThreeColumn` (900 / 1440 px) zůstávají beze změny — `tablet-portrait`
  (834 px) je stále `isCompact` (mobilní layout), což je oddělený, dosud otevřený bod (`BL-033` bod 2,
  hybridní layout 768–1024 px) — mimo scope tohoto change.
- Šířka panelu (`w-96`, 384 px) beze změny — pokud se v budoucnu ukáže na 1112 px příliš velká/malá
  vzhledem k mřížce, jde doladit samostatně.
