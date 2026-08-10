# Design Review 7 — ICS/JSON import + full-fidelity ICS export

**Status:** IMPLEMENTED
**Change ID:** CHANGE-8 (import `.ics`/`.json`; enrich ICS so imports show everything; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-10
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** “Changes 5” in `.github/specs/changes.md`: (1) allow importing what was exported (`.ics` / `.json`) for further edits; (2) after importing the exported `.ics` into macOS Calendar not all info shows (addresses etc.) — enrich and validate the ICS.

> Delta base: **design_review_6.md (CHANGE-7)**. Additive engine surface (a parser + richer generator), no schema/state change — folds into the pending **0.2.0 → 0.3.0** MINOR.

---

## 0. SOTA analysis

### 0.1 Problem

1. **Import.** The app could only load `.json` (full state). The user wants to re-import an exported calendar (`.ics`) too, to keep editing. ICS carries no catalogue/enrollment structure, so the only faithful target is **custom events**.
2. **Missing info in Apple Calendar.** The exported ICS only put phone/lektor/price in `DESCRIPTION` and a short `street, city` in `LOCATION`. Apple Calendar therefore showed little — no full address, no web, no contact person/email, no category. The address existed but was incomplete (no PSČ), and there was no `URL` field.

### 0.2 Approach — chosen vs rejected

| Item | Chosen | Rejected alternative |
|---|---|---|
| ICS import (1) | New pure domain parser `parseIcs(text) → ParsedIcsEvent[]`: unfolds RFC-5545 lines, unescapes text, maps each `VEVENT` to one custom-event session (name, address, note, weekday/time, `everyWeeks` from `RRULE;INTERVAL`, window from `DTSTART`/`UNTIL`). The app wraps these into editable **custom entries**. | Re-link imported events back to catalogue enrollments → ICS lacks the ids/structure; unreliable. Tracked as **BL-015**. |
| JSON import | Keep full-fidelity `parsePlannerState` (already round-trips). The load button now auto-detects `.ics` vs `.json` by extension/content. | Separate buttons → more clutter. |
| Enrich export (2) | `LOCATION` = full address (`Ulice, Město, PSČ`); add a `URL` property (`sourceUrl ?? website`); `DESCRIPTION` = description + venue + full address + web + lektor + contact person + phone + e-mail + price + age + category. Everything the domain already holds. | Add proprietary `X-` fields → not shown by Apple Calendar; the standard `LOCATION`/`URL`/`DESCRIPTION` are what render. |
| Time zone on import | Read `HHMM` as local Europe/Prague wall-clock (matches how the app exports); no TZ conversion. | Convert via TZ database in the domain → the domain stays clock-free and deterministic. |

---

## 1. Requirements

- **FR-1 [engine]** `parseIcs(text)` MUST return one `ParsedIcsEvent` per `VEVENT` with `name`, optional `location` (split `street, city, zip`), optional `note`, and a session carrying `weekday` (from `DTSTART` date), `startMinutes`/`endMinutes` (from `DTSTART`/`DTEND`), `validFrom`/`validTo` (from `DTSTART`/`RRULE UNTIL`), and `everyWeeks` (from `RRULE INTERVAL` when > 1). It MUST unfold folded lines and unescape text.
- **FR-2 [engine]** `generateIcs` MUST emit the **full address** in `LOCATION` (incl. PSČ), a `URL` property when a web link exists, and a `DESCRIPTION` containing description, venue, address, web, lektor, contact person, phone, e-mail, price, age and category (present fields only).
- **FR-3 [app]** The load control MUST accept both `.json` and `.ics`; `.ics` MUST import as editable custom entries appended to the active schedule, `.json` MUST replace the state.
- **FR-4 [app]** The store MUST provide a bulk `addCustomEntries` that commits once (single undo step).

---

## 2. Acceptance criteria

- **AC-1 → FR-1** `packages/domain/test/ics-import.test.ts`: exporting an enrollment and parsing it back yields one event with the same name, address and Monday 15:00–16:00; `RRULE INTERVAL=3` round-trips to `everyWeeks: 3`; a string without `VEVENT` yields `[]`.
- **AC-2 → FR-2** The generated ICS `LOCATION` carries the full address and the (unfolded) `DESCRIPTION` contains `Adresa:`, `Telefon:` and `Kategorie:`.
- **AC-3 → FR-3/FR-4** Playwright: importing a sample `.ics` adds a custom event that appears in the grid and detail (name, weekday/time, parsed address, note) with a working remove; no runtime errors.

Global gate: `packages/domain test` (62) + `typecheck`, `apps/web typecheck` clean. ESLint is not installed in this environment.

---

## 3. Non-goals / notes

- **Re-linking imported events to catalogue enrollments** is out of scope — ICS has no catalogue ids, so all imported events become custom entries. Tracked as **BL-015**.
- **Full VTIMEZONE / DST handling on import** is out of scope; times are read as local Europe/Prague wall-clock (matches export). The domain stays clock-free.
- **Engine feature / no bump beyond pending:** FR-1/FR-2 are additive to `@krouzky/domain`; fold into **0.3.0**. No `schemaVersion`/state migration.
