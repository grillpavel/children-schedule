# Design Review 24 — Poctivé Kč/lekce v detailu

**Status:** DRAFT
**Change ID:** CHANGE-25 (BL-018: doménová `pricePerLesson` + zobrazení Kč/lekce v detailu; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** BL-018 (Changes 8 C8-D3): detail neukazuje cenu za jednu lekci, ač ji lze u jednoznačných cenových režimů poctivě odvodit z ceny a počtu lekcí za sezonu.

> Delta base: navazuje na `design_review_17.md` (CHANGE-18, rozsah lekcí) a `design_review_14.md` (CHANGE-15, délka sezony). Zužuje **BL-018**.

## 0. SOTA analysis

### 0.1 Problem

1. Cena za lekci chybí, přitom u `per_session`/`per_year`/`per_month` je odvození jednoznačné (C8-D3).
2. U `per_semester` není počet pololetí v sezoně jednoznačný — nesmí se hádat.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Kč/lekce (C8-D3) | Čistá `pricePerLesson(price, lessonCount, seasonMonths)`: `per_session`=částka, `per_year`=částka/lekce, `per_month`=(částka×měsíce)/lekce, `per_semester`=(částka×počet pololeští)/lekce s počtem pololeští = `round(seasonMonths/5)`. | Vynechat `per_semester` (necelý cenový model). |
| Zobrazení | Detail ukáže `Kč/lekce`, jen když je hodnota definovaná. | Ukazovat i nejednoznačné odhady. |

## 1. Requirements

- **FR-1 [engine]** `pricePerLesson(price, lessonCount, seasonMonths)` MUST vrátit cenu za lekci pro `per_session`/`per_year`/`per_month`/`per_semester` (pololeští odvozená z délky sezony, `round(seasonMonths/5)`, min 1) a `undefined` pro nula lekcí, nulovou délku sezony u odvozovaných period nebo neznamou cenu. Čisté a deterministické.
- **FR-2 [app]** Detail MUST zobrazit `Kč/lekce`, pouze když je hodnota definovaná.

## 2. Acceptance criteria

- **AC-1 → FR-1** `packages/domain` `vitest` `test/price.test.ts`: `per_session`→částka; `1500/rok, 30 lekcí`→50; `200/měs, 36 lekcí, 9 měsíců`→50; `per_semester 1200, 20 lekcí, 10 měsíců`→120 (5 měsíců→60); nula lekcí/`NaN`→undefined.
- **AC-2 → FR-2** Playwright: u ročního kroužku (1500 Kč/rok, 43 lekcí) detail ukazuje `35 Kč/lekce`.

Globální gate: `packages/domain` i `apps/web` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Engine feature → započítává se do **pending MINOR 0.3.0**; verze se bumpne až při vydání.
- Pololeští se odvozuje z délky sezony (`round(seasonMonths/5)`), konzistentně s měsíčním přepočtem (`per_semester` ≈ částka/5 za měsíc); samostatné datové pole počtu pololeští není potřeba.
- Kč/lekce se počítá z vybraného/prvního termínu, ne agregací přes více variant.
