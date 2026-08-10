# Design Review 1 — iOS-like calendar UX & flexible recurrence/export

**Status:** IMPLEMENTED
**Change ID:** CHANGE-1 (calendar UX + recurrence/export flexibility; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-10
**Repo:** monorepo `Children_schedule` (`packages/domain` engine + `apps/web` UI)
**Trigger:** The M0 calendar is functional but rigid — fixed 13:00–19:00 grid, week-only view, biweekly-parity-only recurrence, calendar title tied to the child, and no per-event repeat window, colour, location or notification control. `changes.md` (2026-08-10) asks for a more user-friendly, iOS-Calendar-like experience.

> **Process adaptation note.** `dev-process.instructions.md` originates from the Python KMS engine and references `.github/specs/`, `pyproject.toml`, and `ruff`/`mypy`/`pytest`. This repo is a TypeScript pnpm monorepo, so the equivalents are used throughout: spec lives in `.github/specs/`, version lives in `packages/domain/package.json` / `apps/web/package.json`, and the quality gates are `pnpm -C packages/domain test` (vitest), `tsc --noEmit`, and `eslint`. No prior `design_review_<m>` exists, so this is `n = 1` and the delta base is the existing design docs `docs/00`–`docs/08`.

---

## 0. SOTA analysis

### 0.1 Problem

Concrete gaps versus a familiar calendar app, taken from `changes.md`:

1. **Recurrence is too narrow.** The domain models only weekly + `biweekly.parity` (even/odd). Users need "every 14 / 21 / 28 days" and a custom interval.
2. **Repeat window is implicit.** Each event repeats across the whole school year; users want explicit *start-repeat* and *end-repeat* dates per event.
3. **Calendar identity is wrong for export.** The exported calendar name is derived per child; users want an **editable title** (e.g. the child's name) that they control before importing into Apple/Google/Outlook.
4. **Colour is not controllable on export.** After importing, a parent wants either one colour for the whole child's calendar or the per-activity palette — today the palette is UI-only and never reaches the `.ics`.
5. **Viewport is fixed.** The grid shows only 13:00–19:00 and only a full week. Users want Day / 3-Day / Week / Month views, month/day/week navigation, and a scrollable full-day hour axis.
6. **No location context.** Events carry an address but the UI never shows *where* on a map.
7. **Overlaps look like conflicts.** Overlapping events must be allowed and rendered side-by-side (iOS style), not treated as an error.
8. **No notification control.** The single 30-minute alarm is hard-coded; users want to choose the reminder (time; and, aspirationally, location).

### 0.2 Approach — chosen design vs rejected alternative

| Area | Chosen | Rejected alternative (why) |
|---|---|---|
| **Recurrence** | Replace `biweekly.parity` with a general `recurrence: { everyWeeks: number }` (1–N) plus keep validity window; ICS emits `RRULE:FREQ=WEEKLY;INTERVAL=everyWeeks`. `everyWeeks` covers 14/21/28 days (=2/3/4) and "own" (any N). | Keep parity **and** add interval → two overlapping concepts, ambiguous ICS, harder tests. General interval subsumes parity. |
| **Repeat window** | Reuse existing per-session `validFrom`/`validTo` as the repeat start/end; expose them in UI. No model change. | New `repeatStart/repeatEnd` fields → duplicates `validFrom/validTo`, two sources of truth for the same date range. |
| **Calendar title** | `generateIcs` takes an explicit `calendarTitle`; `X-WR-CALNAME` + filename use it; default = child name. | Silent auto-derivation → user cannot fix a wrong/ambiguous name before import. |
| **Colour on export** | Deterministic `colorMode: 'single' \| 'per_activity'`; emit RFC 7986 `COLOR` per `VEVENT` and Apple `X-APPLE-CALENDAR-COLOR` at calendar level. `single` uses one child colour; `per_activity` uses the existing palette. | Rely on the client to colour by calendar only → parents who merge into one calendar lose per-child distinction; palette never survives export. |
| **Views & hour axis** | UI-only view state (`day`/`3day`/`week`/`month`) + configurable visible hour range (default scrolled to afternoon, scrollable 00:00–24:00). Domain untouched. | Precompute month grids in the domain → pushes presentation into the pure core, violates the "domain is presentation-free" rule. |
| **Location/map** | Right column shows a **map link** built from `lat/lon` (or address) — no embedded third-party tiles by default. | Embed interactive tiles → sends the child's location to a third party on load; conflicts with the privacy stance. Deferred (BL-002). |
| **Overlap** | Keep the existing lane layout; make overlap explicitly non-blocking and visually side-by-side. | Block/stack-hide overlaps → hides real information the parent needs. |
| **Notifications** | Per-event reminder offset (minutes) flowing into `VALARM;TRIGGER`. Location/proximity alarms deferred (BL-001). | Hard-code one reminder → no user control; proximity now → non-standard, Apple-only, out of scope. |

---

## 1. Requirements

Each FR is tagged `[domain]` (pure `@krouzky/domain`, unit-testable) or `[web]` (`apps/web`, e2e-testable).

- **FR-1 `[domain]` — General weekly interval.** The model MUST express recurrence as an integer `everyWeeks ≥ 1` per session (replacing `biweekly.parity`). The ICS generator MUST emit `RRULE:FREQ=WEEKLY;INTERVAL=<everyWeeks>;BYDAY=…`, omitting `INTERVAL` when `everyWeeks === 1`. `DTSTART` MUST be the first non-exception occurrence consistent with the interval.
- **FR-2 `[domain]` — Explicit repeat window.** `generateIcs` MUST honour per-session `validFrom`/`validTo` as the repeat start/end, clamped to the school year, for both `DTSTART` and `RRULE:UNTIL`. (No new fields; UI edits `validFrom/validTo`.)
- **FR-3 `[domain]` — Editable calendar title.** `generateIcs` MUST accept an optional `calendarTitle`; `X-WR-CALNAME` and the download filename MUST use it. When absent, the title MUST default to `child.name`.
- **FR-4 `[domain]` — Export colour mode.** `generateIcs` MUST accept `colorMode: 'single' | 'per_activity'`. In `single` mode all events of one child MUST carry the same colour; in `per_activity` mode each activity MUST use its deterministic palette colour. The generator MUST emit RFC 7986 `COLOR` per `VEVENT` and `X-APPLE-CALENDAR-COLOR` once at calendar level.
- **FR-5 `[domain]` — Configurable reminder.** The reminder offset MUST be configurable per export (and, where set, per event) and flow into `VALARM;TRIGGER:-PT<minutes>M`; `null` MUST omit the `VALARM`.
- **FR-6 `[web]` — View modes.** The schedule view MUST offer Day, 3-Day, Week, and Month, with previous/next navigation and a visible current-range label. Week remains the default.
- **FR-7 `[web]` — Scrollable full-day hour axis.** The time axis MUST cover 00:00–24:00, be vertically scrollable, and default-scroll to the afternoon so current behaviour is preserved without hiding early/late events.
- **FR-8 `[web]` — Location on map.** When an event/activity has coordinates or an address, the right column MUST show a map link opening the location in an external map, and MUST render `neuvedeno` when absent (no invented coordinates).
- **FR-9 `[web]` — Overlap rendering.** Two events overlapping in time on the same day MUST both remain visible, side-by-side, and MUST NOT be blocked or auto-resolved.

---

## 2. Acceptance criteria

Each AC maps to one FR and names the proof.

- **AC-1 → FR-1.** `packages/domain/test/ics.test.ts`: a session with `everyWeeks: 3` produces `RRULE:FREQ=WEEKLY;INTERVAL=3;…`; `everyWeeks: 1` produces no `INTERVAL=`. Existing recurrence tests stay green. `pnpm -C packages/domain test`.
- **AC-2 → FR-2.** `ics.test.ts`: a session with `validFrom` after the school-year start yields a `DTSTART` on/after that date; `validTo` before the school-year end yields the matching `UNTIL`.
- **AC-3 → FR-3.** `ics.test.ts`: `generateIcs({ …, calendarTitle: 'TEST Julinka' })` emits `X-WR-CALNAME:TEST Julinka`; omitting it falls back to `child.name`.
- **AC-4 → FR-4.** `ics.test.ts`: in `single` mode every `VEVENT` `COLOR` line is identical and `X-APPLE-CALENDAR-COLOR` appears once; in `per_activity` mode two different activities emit two different `COLOR` values.
- **AC-5 → FR-5.** `ics.test.ts`: reminder `45` emits `TRIGGER:-PT45M`; reminder `null` emits no `BEGIN:VALARM`.
- **AC-6 → FR-6.** Playwright: switching to Day/3-Day/Month changes the visible column count; next/prev updates the range label. Command: scripted `run_playwright_code` flow against `next dev`.
- **AC-7 → FR-7.** Playwright: after scrolling the hour axis, both `07:00` and `21:00` are reachable/visible.
- **AC-8 → FR-8.** Playwright: selecting an activity with coordinates shows a map link whose href targets those coordinates; an activity without an address shows `neuvedeno`.
- **AC-9 → FR-9.** Playwright: enrolling two overlapping events on one day renders two blocks at reduced width, both hit-testable.

Global gate (must pass before merge): `pnpm -C packages/domain test` green, `tsc --noEmit` clean in both packages, `eslint` clean (incl. the domain purity rule).

---

## 3. Non-goals / notes

- **Location-based / proximity notifications** are out of scope now (non-standard, Apple-only). Tracked as **BL-001**.
- **Embedded interactive map tiles** in the right column are out of scope (privacy: would send the child's location to a third party on load); only an outbound link is provided. Tracked as **BL-002**.
- **Month-by-date recurrence** (e.g. "3rd Tuesday") is out of scope; recurrence stays weekly-interval only. Tracked as **BL-003**.
- **Time zones other than `Europe/Prague`** remain out of scope (unchanged from `docs/03`).
- **Colour semantics for conflicts** are unchanged — colour never encodes state (`docs/04 §4`); FR-4 only affects the exported `.ics`, not in-app conflict styling.
- **Model migration:** replacing `biweekly.parity` with `everyWeeks` is a breaking change to `PlannerState` `schemaVersion`. This spec bumps `schemaVersion` to `2` and adds a load-time migration for `schemaVersion: 1` files (parity → `everyWeeks: 2` on the correct start week). Migration correctness is an AC under FR-1's test file.
- **Versioning on ship:** `@krouzky/domain` MINOR bump (new engine behaviour); `apps/web` is app-only for FR-6–FR-9. Record under CHANGE-1 in a new `CHANGELOG.md` at ship time (RECORD step), not now.
- **NEEDS INPUT:** confirm the intended meaning of "1/14, 1/21, 1/28 days (per one month)" — this spec reads them as *every 2 / 3 / 4 weeks* (`everyWeeks` = 2/3/4) plus a free-form custom interval. If "per one month" means true monthly-by-date, that becomes BL-003 instead.
