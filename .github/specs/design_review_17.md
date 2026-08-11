# Design Review 17 — Odvozený rozsah lekcí v detailu

**Status:** DRAFT
**Change ID:** CHANGE-18 (vlna 7 z Changes 8: délka lekce a počet lekcí za sezonu odvozené z platnosti termínů a školních výjimek; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-D2: detail neukazuje odvozené údaje o rozsahu docházky (délka lekce, počet lekcí za sezonu), přitom je lze poctivě spočítat z platnosti termínů a školního kalendáře.

> Delta base: navazuje na `design_review_11.md` (CHANGE-12) a `design_review_14.md` (CHANGE-15). Bez změny doménového modelu; využívá existující `weeklyOccurrences` a `relevantExceptionDates`.

## 0. SOTA analysis

### 0.1 Problem

1. Detail ukazuje termíny a cenu, ale ne odvozený rozsah (délka lekce, počet lekcí za sezonu) (C8-D2).
2. Počet lekcí musí zohlednit svátky a prázdniny, jinak by přeceňoval docházku.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Délka lekce (C8-D2) | `endMinutes − startMinutes` z prvního sessionu vybraného termínu. | Zadávat ručně / neukazovat. |
| Počet lekcí za sezonu (C8-D2) | Součet `weeklyOccurrences(validFrom..validTo, everyWeeks)` napříč sessiony termínu **minus** `relevantExceptionDates` (svátky/prázdniny okresu). Vše z existující domény. | Odhad z počtu týdnů bez odečtení výjimek (nadhodnocuje). |

## 1. Requirements

- **FR-1 [app]** Detail MUST zobrazit délku lekce (min) z vybraného termínu, když je k dispozici.
- **FR-2 [app]** Detail MUST zobrazit počet lekcí za sezonu odvozený z platnosti termínů minus školní výjimky/svátky, když je > 0.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: detail ukazuje `Délka lekce: N min` (N > 0).
- **AC-2 → FR-2** Playwright: detail ukazuje `Lekcí za sezonu: K` (K > 0), odvozené z reálné platnosti termínu.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- `Kč/lekce` (C8-D3) není součástí — vyžadovalo by jednoznačný sezónní cenový model (per-period), který zůstává ve **BL-018**.
- Rozsah se počítá z vybraného/prvního termínu; agregace přes více vybraných variant není cílem.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
