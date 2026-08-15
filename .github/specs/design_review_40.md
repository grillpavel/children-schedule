# Design Review 40 — Souběžný export všech dětí (C6-C2)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-41 (jedním kliknutím stáhnout samostatný `.ics` na každé dítě — app `@krouzky/web` + E2E T-610)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** Po CHANGE-40 (správa více dětí, T-609) šlo exportovat jen aktivní dítě — na víc dětí musel uživatel ručně přepínat a exportovat zvlášť. BL-020 uzavírá souběžný export všech dětí.

## 0. SOTA analysis
- **0.1 Problem.** Export běžel jen nad aktivním dítětem. S víc dětmi to znamenalo N ručních přepnutí + exportů.
- **0.2 Approach.** Toolbar dostal položku menu „Kalendář — všechny děti (.ics)" (jen když `children.length > 1`), která iteruje `state.children` a pro každé zavolá `downloadIcs` nad aktivním rozvrhem; `generateIcs` filtruje zápisy i vlastní události podle `child.id`, takže každý soubor nese jen dané dítě a vlastní `X-WR-CALNAME`. Alternativa (ZIP jedním souborem) zamítnuta — přidávala by závislost (`jszip`); N samostatných stažení je jednodušší a klient je zvládá z jednoho gesta.

## 1. Requirements
- **FR-1 [app]** Při >1 dítěti nabídne export menu akci, která pro **každé** dítě stáhne samostatný `.ics` (různé názvy souborů) jedním kliknutím. Každý soubor nese jen zápisy/události daného dítěte.

## 2. Acceptance criteria
- **AC-1 → FR-1** E2E T-610: po přidání druhého dítěte a kliknutí na „všechny děti" se stáhnou 2 soubory s různými názvy (desktop+mobil). `apps/web` `tsc --noEmit` čisté.

## 3. Non-goals / notes
- Krajské jarní prázdniny podle `districtCode` zůstávají v **BL-020** (potřebují oficiální rozpis MŠMT = data).
- Nesloučuje děti do jednoho kalendáře ani ZIP — záměrně N souborů.
- Vizuální baseline se nemění (položka je jen uvnitř rozbaleného menu, ne v zavřené liště).
