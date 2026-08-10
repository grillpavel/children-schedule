# Design Review 3 — Per-activity overrides: editable details & colour

**Status:** IMPLEMENTED
**Change ID:** CHANGE-4 (per-activity user overrides for details + colour; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-10
**Repo:** monorepo `Children_schedule` (touches `packages/domain` and `apps/web`)
**Trigger:** “Changes 3” in `.github/specs/changes.md`: the user wants to (1) edit the information shown in the right column (address, phone, price, name) for a catalogue activity, and (2) pick a colour for each activity — both in the details panel and via a quick switch next to the calendar-name field.

> Delta base: **design_review_2.md (CHANGE-2)** and **design_review_1.md (CHANGE-1)**. This spec restates only what changes. Catalogue data stays read-only at runtime; the change introduces a **separate, persisted override layer** keyed by `activityId`, so no catalogue mutation occurs.

---

## 0. SOTA analysis

### 0.1 Problem

From “Changes 3” in `changes.md`:

1. The right column shows catalogue facts (address, phone, price, name) as **read-only**; the user needs to **correct or personalise** them (e.g. a moved venue) and have the change flow into the calendar export.
2. Activity colours are **auto-derived** from `hashFnv1a(activityId)` and cannot be chosen; the user wants to **pick** a colour per activity, reachable both in the details panel and next to the calendar-name field.

The catalogue (`DEMO_CATALOG`) is deliberately immutable at runtime (rule #1: no invented data mutated in place). Edits must therefore live in a distinct, serialisable layer that survives `.json` export/import and feeds `.ics` export, without touching the catalogue.

### 0.2 Approach — chosen vs rejected

| Item | Chosen | Rejected alternative |
|---|---|---|
| Where edits live | New **`overrides: ActivityOverride[]`** on `PlannerState`, keyed by `activityId`; effective value = `override ?? catalogue`. Serialised with the state, so it round-trips and feeds ICS. **`schemaVersion` 2→3** with a load-time migration adding `overrides: []` to v2 files. | Mutate the catalogue in the store → violates “catalogue read-only”, and catalogue is not part of `PlannerState` so it would not persist. |
| Override granularity | **Per activity** (`name`, `address`, `contactPhone`, `price`, `colorCss`), all optional. | Per enrolment → duplicates the same edit across a child’s multiple groups (CHANGE-2 FR-3) and per child → over-scoped for the current single-child demo. Tracked note in §3. |
| Colour model | Store a **palette CSS keyword** (`colorCss`) chosen from the existing 12-colour `PALETTE`; domain helper `colorByCss` resolves it back to fill/text for the grid; ICS uses it directly for `COLOR`. | Free hex picker → breaks the colour-blind-safe palette contract (`palette.ts`) and the ICS `COLOR` CSS3-keyword convention; deferred as **BL-006**. |
| Details editing UI | Inline edit form in `SelectedActivity` (right column): combined “Ulice, město” field (reusing CHANGE-2 FR-5 comma split), phone, price amount+period, name, plus a **“Obnovit z katalogu”** reset. | A separate modal → heavier; the panel already hosts the read-only view. |
| Colour placement | **Both** (per user answer): palette swatches in the details panel **and** a compact swatch row in the toolbar next to the calendar-name input, acting on the currently `selectedActivityId`. | Only one location → the user explicitly asked for both. |
| ICS wiring | Pass `overrides` into `generateIcs`; apply to enrolment events only (summary/name, `LOCATION`, description phone/price, `COLOR`). In `single` colour mode the child colour still wins. | Resolve overrides in the app and pre-bake events → duplicates domain logic and breaks determinism guarantees. |
| Grid wiring | Apply colour + name override in `useScheduleView` (app), leaving `resolvePlacedSessions` (shared by conflicts/summary) untouched. | Thread overrides through `resolvePlacedSessions` → widens the domain surface for a purely visual concern. |

---

## 1. Requirements

Engine FRs are `[engine]` (`@krouzky/domain`); app FRs are `[web]` (`apps/web`).

- **FR-1 [engine]** `PlannerState` MUST gain `overrides: ActivityOverride[]` where `ActivityOverride = { activityId, name?, address?, contactPhone?, price?, colorCss? }`, and `schemaVersion` MUST become `3`. Loading a `schemaVersion: 2` file MUST migrate by adding `overrides: []`; a v1 file MUST migrate 1→2→3.
- **FR-2 [engine]** `generateIcs` MUST accept `overrides` and, for enrolment events, apply the matching override: `name` → event summary base, `address` → `LOCATION`, `contactPhone` → description contact, `price` → description price, and `colorCss` → event `COLOR` (only when `colorMode = per_activity`). Missing override fields MUST fall back to catalogue values.
- **FR-3 [web]** The right column MUST let the user edit a catalogue activity’s `name`, address (separate **Ulice / Město / PSČ** fields), phone and price; edits MUST write to `overrides` (committed to history) and the panel MUST show the effective value (`override ?? catalogue`) with a reset action that clears the activity’s override. On an address edit the panel MUST re-geocode the entered address (keyless OSM Nominatim) and store the resulting coordinates so the map preview refreshes; on failure/offline the address is kept without coordinates (map hidden, links shown).
- **FR-4 [web]** The right column MUST offer a colour picker (the 12 palette swatches) for the selected activity; the chosen colour MUST appear on that activity’s grid blocks and in the `per_activity` ICS export.
- **FR-5 [web]** The toolbar MUST show, next to the calendar-name field, a compact colour switcher acting on the currently selected activity; with no activity selected it MUST be inert (disabled/hint), never guessing a target.
- **FR-6 [engine]** Overrides MUST survive a `serializePlannerState` → `parsePlannerState` round-trip unchanged.

---

## 2. Acceptance criteria

Engine ACs are proven by `vitest`; app ACs by `tsc --noEmit` + Playwright against `next dev`.

- **AC-1 → FR-1** `packages/domain/test/state.test.ts`: a `schemaVersion: 2` object without `overrides` parses to `schemaVersion: 3` with `overrides: []`; the existing v1 case now yields `schemaVersion: 3`; unknown versions still rejected.
- **AC-2 → FR-2** A new `packages/domain/test/ics-overrides` case: an enrolment whose activity has an override renders the overridden `SUMMARY`, `LOCATION`, description price/contact, and `COLOR` (in `per_activity`); in `single` mode the child colour is used.
- **AC-3 → FR-3** Playwright: editing the address to “Nová 5, Praha” in the selected activity updates the displayed address and the stored `overrides[activityId].address`; “Obnovit z katalogu” restores the catalogue value.
- **AC-4 → FR-4** Playwright: picking a palette swatch changes the activity’s grid-block fill to that palette colour.
- **AC-5 → FR-5** Playwright: with an activity selected, the toolbar swatch row is enabled and clicking a swatch sets the same override colour; with none selected the row is disabled.
- **AC-6 → FR-6** `state.test.ts`: a state carrying a fully-populated `overrides` entry is byte-stable across serialize → parse (`toEqual`).

Global gate: `pnpm -C packages/domain test`, `pnpm -C packages/domain typecheck`, `pnpm -C apps/web typecheck`, `pnpm -C packages/domain lint` all clean.

---

## 3. Non-goals / notes

- **Free-form colours** outside the 12-colour palette are out of scope — they would break the colour-blind-safe palette and the ICS CSS3-keyword `COLOR` convention. Tracked as **BL-006**.- **Per-child overrides**: overrides are keyed by `activityId` at the `PlannerState` level (global across children/schedules), matching the current single-child demo. A future per-child layer is a candidate deferral (**BL-007**).
- **Editing non-textual catalogue facts** (age range, category, capacity, `lastVerifiedAt`) stays out of scope; only user-facing display/export fields (name, address, phone, price, colour) are editable.
- **Conflict/summary labels**: the name override is applied to ICS and the grid label (in `useScheduleView`), but `resolvePlacedSessions` (shared by conflict detection and summary) is intentionally left on catalogue names to avoid widening the domain surface for a display concern.
- **Engine change / version bump:** FR-1/FR-2/FR-6 change `@krouzky/domain` (new schema field + migration + ICS input) — a backward-compatible feature, so **MINOR** bump **0.2.0 → 0.3.0**.
- **Address geocoding (FR-3):** the map refresh uses a keyless **OSM Nominatim** lookup on address commit (app-only, in the user’s browser). It is best-effort: no result / offline leaves the address without coordinates. This is a lightweight geocode, not the interactive address autocomplete tracked as **BL-004**.
