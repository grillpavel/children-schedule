# Design Review 51 — Personalizace: dostupnost (dny) + měsíční rozpočet (planner-first, fáze 2b)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-52 (UI pro zbylé personalizační vstupy z CHANGE-45: dny dostupnosti + měsíční rozpočet dítěte, napojené na doporučení — app `@krouzky/web` + testy T-125/T-126)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** BL-029, dokončení personalizačních vstupů. CHANGE-51 dodal výběr zájmů; engine (CHANGE-45) umí i dostupnost a rozpočet, ale bez UI byly neaktivní.

## 0. SOTA analysis
- **0.1 Problem.** `activityFit` počítá s časovou dostupností a rozpočtem, ale uživatel je neměl jak zadat → dvě z pěti kritérií zůstávala neutrální.
- **0.2 Approach.** Do sekce „Doporučujeme" (jen nefiltrovaný pohled) přidat: (a) přepínače dnů „Které dny může?" (celodenní okno na vybraný den → `Child.availability`), (b) číselné pole „Měsíční rozpočet (Kč)" (→ `Child.budgetMonthlyCzk`). Nové store akce `setChildAvailability`/`setChildBudget` (přes `commit` → undo + autosave). Rozpočet se ukládá při Enteru/blur (ne per-úhoz, aby se neplnila historie). Chipy dnů dostupnosti mají `aria-label` „Volno {zkratka}", aby nekolidovaly s filtrovacími chipy dnů (`name: 'Po'`).
- **Alternativy zamítnuty.** Plný editor časových oken (od–do na den) — nadbytečné pro MVP; celodenní okno „ten den může" je srozumitelné a stačí pro filtr termínů. Zobrazovat % — analýzy nedoporučují.

## 1. Requirements
- **FR-1** Přepínače „Které dny může?" nastavují `Child.availability` (na zapnutý den celodenní okno); doporučení se přepočtou (zapadnutý termín → „✓ Termín ve volném čase").
- **FR-2** Pole „Měsíční rozpočet (Kč)" nastavuje `Child.budgetMonthlyCzk` (prázdné/0 = bez limitu); doporučení do rozpočtu → „✓ V rozpočtu".
- **FR-3** Oba vstupy jsou v sekci „Doporučujeme" (jen nefiltrovaný pohled); undo/redo i autosave se aplikují.
- **FR-4** Beze změny chování zbytku: chipy dnů dostupnosti nekolidují s filtrovacími chipy; vizuální baseline i katalogové lokátory se nemění.

## 2. Acceptance criteria
- **AC-1** (FR-2) **T-125**: rozpočet 100000 → u doporučení „✓ V rozpočtu".
- **AC-2** (FR-1) **T-126**: zapnutí všech dnů → u doporučení „✓ Termín ve volném čase".
- **AC-3** (FR-4) Plná E2E `--workers=1` zelená na desktop + mobile-small (169 passed) bez regenerace baseline; a11y T-300..310 zelené (číselné pole i chipy mají přístupné názvy); `apps/web` `tsc` čisté; app HTTP 200.

## 3. Non-goals / notes
- Časová okna od–do na den (jemnější dostupnost) — pozdější refinement.
- Home/týden-first obrazovka, bottom nav Domů/Katalog/Rozvrh/Děti a onboarding zůstávají otevřené bloky BL-029 (velký shell redesign, vlastní specy).
- `setChildAvailability`/`setChildBudget` jdou přes `commit` (undo/redo + autosave z CHANGE-50).
