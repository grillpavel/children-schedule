# Design Review 14 — Poctivá délka sezony z platnosti termínů

**Status:** DRAFT
**Change ID:** CHANGE-15 (vlna 4 z Changes 8: `seasonMonths` odvozené z `validFrom`/`validTo` termínů a jeho použití v přepočtu Kč/měsíc; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-D2/C8-B3: souhrn dosud hlásil „za 9 měsíců“ jako pevný odhad (BL-018), i když skutečná délka sezony plyne z platnosti termínů v datech.

> Delta base: supersedes `design_review_11.md` §0–§2 (CHANGE-12) v přepočtu ceny. Rozšiřuje doménový `ScheduleSummary`.

## 0. SOTA analysis

### 0.1 Problem

1. Přepočet „≈ Kč/měs za N měsíců“ používal pevných 9 měsíců bez vazby na data (C8-B3, BL-018).
2. Platnost termínů (`validFrom`/`validTo`) reálnou délku sezony nese, ale nikde se z ní neodvozovala.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Délka sezony (C8-D2) | Doménový `ScheduleSummary.seasonMonths` odvozený z nejdřívějšího `validFrom` a nejpozdějšího `validTo` umístěných termínů (celé měsíce inkluzivně, min 1; 0 při prázdnu). Čisté a testovatelné. | Ponechat pevných 9 měsíců v UI. |
| Použití v ceně (C8-B3) | Souhrn zobrazí `za N měsíců sezony` z odvozené hodnoty, se zálohou 9 při prázdnu. | Vymýšlet pole sezony na aktivitě bez opory v datech. |

## 1. Requirements

- **FR-1 [engine]** `scheduleSummary` MUST vracet `seasonMonths` = počet celých měsíců mezi nejdřívějším `validFrom` a nejpozdějším `validTo` umístěných termínů dítěte (inkluzivně, min 1); MUST být 0 pro prázdný rozvrh. Čisté a deterministické (bez `Date`/náhody).
- **FR-2 [app]** Souhrn MUST v přepočtu Kč/měsíc použít `seasonMonths` z domény (se zálohou 9, když je 0), ne pevnou konstantu.

## 2. Acceptance criteria

- **AC-1 → FR-1** `packages/domain` `vitest` `test/summary.test.ts`: prázdný rozvrh → 0; termín platný 09/2026–06/2027 → 10.
- **AC-2 → FR-2** Playwright: po zapsání kroužku (platnost 09/2026–06/2027) souhrn ukazuje `za 10 měsíců sezony`, ne 9.

Globální gate: `packages/domain` i `apps/web` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Engine feature → započítává se do **pending MINOR 0.3.0**; verze se bumpne až při vydání (dev-process §6).
- Přepočet stále používá per-period normalizaci `Kč/měsíc` (rok/12, pololetí/5, lekce×4); tento inkrement mění jen zobrazenou délku sezony `N`, ne cenový model per-period.
- Samostatné pole sezony na aktivitě (`sezona od/do`) a plná normalizace nákladů na sezonu zůstávají mimo tuto vlnu (zbytek **BL-018**).
