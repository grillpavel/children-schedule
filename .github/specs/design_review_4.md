# Design Review 4 — Real catalogue: venues + categories, load Nové Strašecí data

**Status:** IMPLEMENTED
**Change ID:** CHANGE-5 (place-of-holding entity + extra categories + load real DDM data; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-10
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `packages/domain/data`, `apps/web`)
**Trigger:** The user added verified real data in `packages/domain/data/novestraseciData.ts` (DDM Rakovník, pracoviště Nové Strašecí, 2026/2027) and asked to convert it for real use and loading. The file's own header lists the domain gaps that block it.

> Delta base: **design_review_3.md (CHANGE-4)**. Catalogue is read-only at runtime and is not part of `PlannerState`, so the new fields are catalogue-level and **backward compatible** — no `schemaVersion` bump, no state migration. The data file is kept as-is; the app derives a domain `Catalog` from it.

---

## 0. SOTA analysis

### 0.1 Problem

`novestraseciData.ts` cannot be loaded as a domain `Catalog` because:

1. **Categories** — the data uses `science`, `tech`, `games`, `outdoor`, `martial_arts`; the enum had only `crafts | sport | music | …`.
2. **Place of holding is missing** — the domain modelled only `Provider.address`, but the organiser (DDM Rakovník, sídlo v Rakovníku) is **not** the venue: kroužky běží v hale BIOS, ZŠ, Sokolovně, na Kocourku a v Řevničově. Without a venue at the session level, the map, ICS `LOCATION`, and travel-from-school are all anchored to the wrong place (Rakovník).
3. **Price period `per_year`** — DDM účtuje ročně. *(Already supported by `pricePeriodSchema`; no change needed.)*
4. **Unknown coordinates** — the data uses `NaN` for venues whose GPS is not published; these must become `undefined` (rule #1), not a broken map pin.

### 0.2 Approach — chosen vs rejected

| Item | Chosen | Rejected alternative |
|---|---|---|
| Categories (1) | Extend `activityCategorySchema` with the five new values, keeping `science_tech` for backward compatibility. | Rename `science_tech` → split → breaks demo/tests and prior catalogues. |
| Venue (2) | New **`Venue` entity**: `Catalog.venues?: Venue[]` + `SessionGroup.venueId?: string`. Location resolution becomes `session.locationOverride ?? venue(group.venueId).address ?? provider.address`, applied in `resolvePlacedSessions` (grid/travel/summary) and `generateIcs` (`LOCATION`). | Per-group `location: Address` inline → loses shared venue identity/name and dedup; the data explicitly models venues. Keeping only `Provider.address` → wrong location & travel. |
| Loading (2) | App-side adapter `apps/web/src/lib/novestraseci.ts` builds a `Catalog` from `NS_CATALOG` + `NS_VENUES` + `NS_ACTIVITY_META` (injects `venues` and per-group `venueId`), keeping the data file untouched. Exposed via the package export `@krouzky/domain/data/*`. | Editing `novestraseciData.ts` to inline venues → user asked to keep it; adapter is non-destructive. Putting city data in the domain barrel → couples the pure engine to one city. |
| Unknown coords (4) | `cleanAddress` drops `NaN`/non-finite `lat`/`lon` and empty `zip`. | Keep `NaN` → `MapLink` renders a broken pin (`NaN !== undefined`). |
| Default child | One neutral child with the **real ZŠ Nové Strašecí** school address (public, from `NS_VENUES`) so travel-from-school is meaningful; empty `schoolEndByWeekday` (unknown, no constraint). | Invent school-end times → violates rule #1. |
| Exceptions | Empty — no okres-Rakovník holiday file is published. | Reuse demo exceptions → invented data. |

---

## 1. Requirements

- **FR-1 [engine]** `activityCategorySchema` MUST additionally accept `science`, `tech`, `games`, `outdoor`, `martial_arts` while keeping the existing values.
- **FR-2 [engine]** The catalogue MUST support a `Venue` entity: `venueSchema { id, name, address }`, optional `Catalog.venues`, and optional `SessionGroup.venueId`.
- **FR-3 [engine]** Session location resolution (`resolvePlacedSessions` and `generateIcs`) MUST use `session.locationOverride ?? venue(group.venueId).address ?? provider.address`, so grid, travel/conflicts, summary and ICS `LOCATION` all reflect the place of holding.
- **FR-4 [app]** An adapter MUST build a valid domain `Catalog` from `novestraseciData.ts` (venues from `NS_VENUES`, `venueId` from `NS_ACTIVITY_META`), dropping `NaN` coordinates and empty `zip`, without modifying the data file.
- **FR-5 [app]** The store MUST load this real catalogue and a real initial state (one child with the real ZŠ school address, school year 2026/2027, empty exceptions/overrides) instead of the demo.
- **FR-6 [app]** The UI MUST label the new categories (catalogue filter + detail) and show the venue (“Místo konání”) with its address and map in the activity detail.

---

## 2. Acceptance criteria

- **AC-1 → FR-1/FR-2** `pnpm -C packages/domain typecheck` + `vitest` stay green with the extended enum and new schema (existing 58 tests unchanged; catalogues without `venues` still valid).
- **AC-2 → FR-3** With a `venueId` set, the placed session’s `address` and the ICS `LOCATION` come from the venue, not the provider. (Covered by the resolution code path; verified in-app via the map/detail.)
- **AC-3 → FR-4/FR-5** `pnpm -C apps/web typecheck` clean; the app loads the real catalogue (e.g. “Astronomický kroužek”), the demo is gone, and no runtime errors occur.
- **AC-4 → FR-6** Selecting a real activity shows “Místo konání: <venue>”, the venue address (incl. PSČ) and a map centred on the venue coordinates; the category filter lists the new categories. (Verified with Playwright.)

Global gate: `pnpm -C packages/domain test`, `packages/domain typecheck`, `apps/web typecheck` clean. ESLint is not installed in this environment and could not be run.

---

## 3. Non-goals / notes

- **Venues without published GPS** (hala BIOS, Sokolovna, MŠ Kocourek, ZŠ Řevničov) load with address but no coordinates → the map preview is hidden until coordinates are added. Tracked as **BL-008**.
- **`NS_PENDING` organisations** (ZUŠ, Kelti, HBC, Sokol oddíly, skaut, hasiči, …) are **not** loaded — they lack a published schedule/price; adding them would require inventing data (rule #1). Tracked as **BL-009**.
- **Additional fees** (`NS_ACTIVITY_META.additionalFees`: karate +1000, basketbal členské příspěvky) are not folded into the displayed price — the model carries a single `price`. Tracked as **BL-010**.
- **Package export:** `@krouzky/domain` now maps `"./data/*": "./data/*.ts"` so the source data file resolves under Bundler moduleResolution.
- **Engine feature / version:** FR-1..FR-3 change `@krouzky/domain` (new optional schema surface, backward compatible) — folds into the pending **MINOR 0.2.0 → 0.3.0** already opened by CHANGE-4. No `schemaVersion`/state migration (catalogue is not persisted state).
- **Data file kept:** `novestraseciData.ts` is unchanged; the adapter is additive.
