# Design Review 19 — Klik na den obsazenosti přepne kalendář

**Status:** DRAFT
**Change ID:** CHANGE-20 (vlna 9 z Changes 8: klik na den v „Obsazenost týdne“ přepne mřížku na denní pohled daného dne; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-B7: přehled obsazenosti je statický; klik na den má rovnou přepnout kalendář na ten den.

> Delta base: navazuje na `design_review_18.md` (CHANGE-19, blok obsazenosti). Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. „Obsazenost týdne“ (CHANGE-19) je jen informativní; nelze z ní skočit do konkrétního dne (C8-B7).
2. Kalendář drží pohled/kotevní datum lokálně, souhrn na něj nemá vazbu.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Propojení souhrn → kalendář (C8-B7) | Store nese jednorázový požadavek `focusWeekday` + `focusNonce`; akce `focusDay(weekday)`. Mřížka na změnu `focusNonce` přepne na denní pohled daného dne v aktuálním týdnu. | Zvednout stav kalendáře (mode/anchorDate) do rodiče a protahovat props napříč stromem. |

## 1. Requirements

- **FR-1 [app]** Klik na den v „Obsazenost týdne“ MUST přepnout kalendář na **denní** pohled daného dne v aktuálně zobrazeném týdnu.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: z týdenního pohledu klik na `Po` přepne rozsah na `Pondělí …` (denní pohled, jeden sloupec).

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Přepnutí míří na den v aktuálně zobrazeném týdnu mřížky, ne na nejbližší budoucí výskyt.
- `focusWeekday`/`focusNonce` jsou efemérní UI stav mimo `PlannerState` (neserializují se).
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
