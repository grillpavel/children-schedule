# Design Review 6 — Load updated catalogue (v3): athletics + unknown prices

**Status:** IMPLEMENTED
**Change ID:** CHANGE-7 (load the updated Nové Strašecí data set; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-10
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** The user replaced the data with `packages/domain/data/novestraseciData-2.ts` (v3): adds providers (SCNS atletika/box/gymnastika, TJ Sokol fotbal), a new `athletics` category, multi-venue groups, price tiers, and **unknown prices encoded as `NaN`** to fail visibly instead of counting as 0.

> Delta base: **design_review_4.md (CHANGE-5)** and **design_review_5.md (CHANGE-6)**. Catalogue is not part of `PlannerState`, so this is backward compatible — no `schemaVersion` change. Folds into the pending **0.2.0 → 0.3.0** MINOR.

---

## 0. SOTA analysis

### 0.1 Problem

The v3 file cannot load unchanged:
1. It uses `category: 'athletics'`, absent from the enum → `Catalog` typecheck fails.
2. Fotbal activities carry `price = { amount: NaN }` (příspěvky nezveřejněny). NaN passes the `number` type but renders “NaN Kč” and poisons the budget sum (NaN), and the ICS description.
3. `NS_ACTIVITY_META.venueId` can now be a **list** (a group whose venue differs by day) — the adapter assumed a single string.

### 0.2 Approach — chosen vs rejected

| Item | Chosen | Rejected alternative |
|---|---|---|
| athletics (1) | Add `'athletics'` to `activityCategorySchema` + both UI label maps. | Reuse `sport` → loses the atletika distinction the data draws. |
| Unknown price (2) | Keep the data’s `NaN` sentinel; make consumers **NaN-safe**: `scheduleSummary` skips non-finite amounts (unknown ≠ 0), ICS omits the price line, and the UI shows **“Cena neuvedena”**. | Make `price.amount` nullable across the model → wide breaking change; the data chose NaN precisely to “fail visibly”, so guard at the edges instead. Silently treating NaN as 0 → wrong budget. |
| Multi-venue group (3) | Adapter takes the **first** venue as the group’s primary `venueId`. | Model per-session venues → larger schema change; deferred as **BL-014**. |
| Data source | Point the adapter at `novestraseciData-2`; keep the old file on disk. | Delete old data → user asked to keep prior data files. |

---

## 1. Requirements

- **FR-1 [engine]** `activityCategorySchema` MUST accept `'athletics'`.
- **FR-2 [engine]** Cost aggregation (`scheduleSummary`) and the ICS description MUST ignore non-finite price amounts (unknown price is not counted, not zero).
- **FR-3 [app]** The store MUST load `novestraseciData-2` (37 activities: DDM + SCNS + fotbal), building venues + `venueId` (first of a list) and sanitising `NaN` coordinates.
- **FR-4 [app]** The catalogue and detail MUST render “Cena neuvedena” when `price.amount` is not finite, and list the `athletics` category label + filter option.

---

## 2. Acceptance criteria

- **AC-1 → FR-1/FR-2** `pnpm -C packages/domain test` + `typecheck` green (58 tests unchanged); enrolling a fotbal activity does not make the summary cost `NaN`.
- **AC-2 → FR-3** `apps/web typecheck` clean; the app loads 37 catalogue cards including “Atletická školička (Atletika I)” and “Fotbal — starší žáci”, no runtime errors.
- **AC-3 → FR-4** A fotbal card shows “Cena neuvedena”; the category filter lists “Atletika”. (Verified with Playwright.)

Global gate: `packages/domain test` + `typecheck`, `apps/web typecheck` clean. ESLint is not installed in this environment.

---

## 3. Non-goals / notes

- **Variable price by number of trainings** (`NS_ACTIVITY_META.priceTiers`: SCNS 4 800 vs 6 500 Kč for 1× vs 2×+ weekly) is not modelled — the catalogue carries a single base `price` (the shown tier). Tracked as **BL-012**.
- **Seasonal venue validity** (`winterVenueOnly` — tělocvičny platí jen pro zimní část) is not modelled. Tracked as **BL-013**.
- **Per-day / multiple venues per group** (atletika starší žactvo, gymnastika) collapse to the first venue. Tracked as **BL-014**.
- **`NS_PENDING`** organisations (Kelti, HBC, ZUŠ, skaut, …) remain out of the catalogue (missing schedule/price) — **BL-009**.
- **Engine feature / no bump beyond pending:** FR-1/FR-2 touch `@krouzky/domain` (additive) and fold into the pending **0.3.0**. No `schemaVersion`/state migration.
- **Data source:** the app now reads `novestraseciData-2`; the previous `novestraseciData.ts` is kept on disk but unused.
