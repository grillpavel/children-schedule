# Design Review 84 — BL-053 + BL-051: šířky panelů a znovu-zavedení tabletových breakpointů

**Status:** IMPLEMENTED
**Change ID:** CHANGE-91 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-30
**Trigger:** Uživatel požádal o dokončení celé Vlny 2/3 (design_review_73.md) — poslední dva
otevřené kusy vázané na FR-W2-4/5.

## 0. SOTA analýza a řešení

### 0.1 BL-053 — min. šířka sloupce mřížky + horizontální scroll i na desktopu

`design_review_77.md` (CHANGE-84, předchozí pokus o BL-051) změřil dvě konkrétní regrese při
posunu breakpointů: sloupec dne klesl na 83px (tři sloupce při 1280px) a ~24px (medium layout
při 834px). Kořenová příčina: `ScheduleGrid.tsx` dovolovalo sloupcům dne SMRŠTIT se na `minmax(0,
1fr)` na všech nekompaktních šířkách — žádná záchranná síť, na rozdíl od mobilu, který už měl
FR-W2-3 (`minmax(72px, 1fr)` + horizontální scroll).

**Řešení**: zobecněna STEJNÁ záchranná síť z mobilu na všechny šířky — nová `dayMinPx = isMobile
? 72 : 105` (105px je existující prah T-200), `overflow-x-auto` na scroll kontejneru VŽDY (dřív
jen `isMobile &&`), `minWidth: dates.length * dayMinPx` na kontejneru dnů VŽDY (dřív `undefined`
mimo mobil). Bezpečné pro současné šířky (přirozené vyplnění dnes už dosahuje ≥105px, floor se
neuplatní) — potvrzeno: `responsive.spec.ts`/`schedule.spec.ts` beze změny 227 passed / 91
skipped PŘED úpravou breakpointů.

### 0.2 BL-051 — tabletové breakpointy 768px/1180px, TENTOKRÁT bezpečně

Se záchrannou sítí z BL-053 v místě byly breakpointy znovu posunuty přesně podle auditu:
- `MOBILE_BREAKPOINT_QUERY`/`desk:`/`isCompact`: 900px → **768px**
- `WIDE_BREAKPOINT_QUERY`/`isThreeColumn`: 1440px → **1180px**

**Naměřeno tentokrát**: `test/specs/responsive.spec.ts` (95 passed, 0 failed) — T-200 (sloupec
dne ≥105px) nyní BĚŽÍ i na `desktop-narrow` (1280px, nově `isThreeColumn`) a PROŠEL (dřív by
selhal s 83px, teď díky floor+scroll splňuje minimum). T-201 automaticky SKIPUJE na
`desktop-narrow` (skip podmínka `isThreeColumn(width) || isCompact(width)` je teď pravdivá) —
žádná ruční úprava testu nebyla potřeba, test byl napsaný obecně přes helper funkce, ne přes
tvrdá čísla.

`test/specs/schedule.spec.ts` + `panel.spec.ts` + `catalog.spec.ts` (368 passed, 0 failed) —
`tablet-portrait` (834px, nově NE `isCompact`) prošel VŠEMI master-detail testy (T-132 ghost
click, T-162 medium layout, T-229 rodinný přepínač) bez úprav.

## 1. Requirements

- **FR-W2-4** (`design_review_73.md`): tabletové zlomy 768px (dva sloupce/medium) a 1180px (tři
  sloupce) — DOKONČENO.
- **BL-053**: min. šířka sloupce mřížky + horizontální scroll i na desktopu/medium šířkách —
  DOKONČENO, zobecněním FR-W2-3.

## 2. Acceptance criteria

- **AC-1**: `tablet-portrait` (834px) už NENÍ `isCompact` — master-detail layout (katalog +
  mřížka + info-drawer současně), ne mobilní bottom-nav.
- **AC-2**: `desktop-narrow` (1280px) už JE `isThreeColumn` — trvalý katalog + mřížka + info
  sloupec.
- **AC-3 (T-200)**: sloupec dne na `desktop-narrow` (nově tři sloupce) má ≥105px — floor +
  scroll, ne smrštění.
- **AC-4**: `tsc --noEmit` (web) čisté; plná E2E sada 0 failed na všech 6 profilech.

## 3. Non-goals

- Nemění vizuální šířky panelů samotné (katalog `w-80`, info `w-80`/`w-96`) — jen dává mřížce
  záchrannou síť, ať tyto pevné šířky nezpůsobí smrštění sloupců dne pod čitelnou hranici.
- Vizuální baseline (`toolbar`/`catalog-filtered`/`empty-info`/`info-dark` na `desktop-narrow` a
  `tablet-portrait`) přegenerovány — layout těchto dvou profilů se opravdu změnil (byly
  mobil/dvousloupec, teď medium/tři sloupce).

BL-051 i BL-053 jsou tímto DOKONČENY.
