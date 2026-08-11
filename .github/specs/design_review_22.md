# Design Review 22 — Uzávěrky přihlášek a odkaz na přihlášku

**Status:** DRAFT
**Change ID:** CHANGE-23 (vlna 12 z Changes 8: pole `applicationUrl`/`applicationDeadline`, doménová `upcomingDeadlines`, blok `Uzávěrky` v souhrnu a řádek v detailu; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-D5/C8-B6: v září je uzávěrka nejčasověji kritické pole a odkaz na přihlášku jediná akce, kvůli které rodič aplikaci otevřel. Model to dosud neuměl (BL-017).

> Delta base: rozšiřuje `activitySchema` (CHANGE-5/7) o volitelná pole. Bez migrace (pole jsou volitelná).

## 0. SOTA analysis

### 0.1 Problem

1. Aktivita nemá pole pro odkaz na přihlášku ani uzávěrku (C8-D5, BL-017).
2. Souhrn nemá blok uzávěrek s odpočtem (C8-B6).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Model (C8-D5) | Volitelné `applicationUrl` (url) a `applicationDeadline` (`YYYY-MM-DD`) na aktivitě; obojí chybějící = neznámé. | Ukládat mimo model / nepodporovat. |
| Výpočet (C8-B6) | Čistá `upcomingDeadlines(catalog, schedule, childId, today)` — seřazené uzávěrky zapsaných kroužků s `daysLeft`; `today` je parametr (doména nečte čas). | Počítat odpočet v UI bez testovatelné jednotky. |
| UI | Detail ukáže uzávěrku (T0) když existuje a preferuje `applicationUrl` pro `Přihlásit se`; souhrn má blok `Uzávěrky` s odpočtem a zvýrazněním ≤ 7 dní. | Skrývat i když data jsou. |

## 1. Requirements

- **FR-1 [engine]** `activitySchema` MUST mít volitelné `applicationUrl` a `applicationDeadline`; `upcomingDeadlines(catalog, schedule, childId, today)` MUST vrátit uzávěrky zapsaných kroužků dítěte seřazené vzestupně s `daysLeft` počítaným vůči `today`; kroužky bez uzávěrky MUST vynechat. Čisté a deterministické.
- **FR-2 [app]** Detail MUST zobrazit uzávěrku, když je přítomná, a preferovat `applicationUrl` pro `Přihlásit se`; souhrn MUST zobrazit blok `Uzávěrky` s odpočtem, když existuje alespoň jedna.

## 2. Acceptance criteria

- **AC-1 → FR-1** `packages/domain` `vitest` `test/deadlines.test.ts`: uzávěrka `2026-09-14` vs `today 2026-09-10` → `daysLeft 4`; po termínu záporné; bez uzávěrek `[]`.
- **AC-2 → FR-2** Kód detailu i souhrnu vykresluje uzávěrky, když jsou v datech (ověřeno doménovou fixturou; shipovaná data Nové Strašecí uzávěrky nenesou, proto se v aplikaci nezobrazí — viz §3).

Globální gate: `packages/domain` i `apps/web` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Engine feature → započítává se do **pending MINOR 0.3.0**; verze se bumpne až při vydání.
- **Reálná data uzávěrek nejsou vymýšlena.** Schopnost (model + výpočet + UI) je hotová a otestovaná; doplnění ověřených termínů/odkazů do datové sady zůstává datovým úkolem ve **BL-017**.
- Barevné prahy odpočtu jsou jen ≤ 7 dní (červená) / jinak oranžová / po termínu šedá; jemnější eskalace není cílem.
