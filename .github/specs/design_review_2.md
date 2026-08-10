# Design Review 2 — Calendar polish: now-line, multi-variant, custom-event detail & map preview

**Status:** IMPLEMENTED
**Change ID:** CHANGE-2 (calendar UX polish; scope: app `@krouzky/web` only — no engine change)
**Date:** 2026-08-10
**Repo:** monorepo `Children_schedule` (touches `apps/web` only)
**Trigger:** Follow-up usability feedback in `.github/specs/changes.md` (“Changes 2”) after CHANGE-1: the grid needs a current-time indicator and better centring, attendance variants should allow more than one time, custom events need a detail view and richer form, and the address needs a small map preview.

> Delta base: **design_review_1.md (CHANGE-1)**. This spec restates only what changes on top of it. All engine behaviour (`@krouzky/domain`) stays as shipped in 0.2.0 — this is an **app-only** change, so no engine version bump.

---

## 0. SOTA analysis

### 0.1 Problem

From “Changes 2” in `changes.md`:

1. The default scroll top-aligns the afternoon; the **current hour should sit nearer the middle** of the viewport.
2. There is **no line marking the exact current time** (a familiar "now" indicator).
3. Attendance variants allow selecting **only one** time; a child may legitimately attend the same activity on **several** variants.
4. The export calendar name behaves like it may be pre-filled with the child’s name; it should be a **free, empty field**.
5. Street and city are two disconnected inputs; they should **fill together**.
6. The custom-event form has **fewer fields** than a catalogue event (no price/lektor), so custom events look poorer in the detail panel.
7. Clicking a **custom event** does nothing — it must open its **detail in the right column**, like catalogue events.
8. There is **no map preview** under the address; the user asks for a small embedded **Mapy.cz** excerpt.

### 0.2 Approach — chosen vs rejected

| Item | Chosen | Rejected alternative |
|---|---|---|
| Centre current hour (1) | On mount scroll so **now** is centred in the visible area (`scrollTop = topPx(now) − viewportHeight/2`), falling back to afternoon when now is outside the day. | Keep top-aligned afternoon → user must scroll every time. |
| Now-line (2) | A 1px absolutely-positioned line at `topPx(nowMinutes)` spanning the day columns, updated on a 60s timer; time read in the **app** (never in the domain). | Compute in domain → violates “no `Date.now()` in domain”. |
| Multi-variant (3) | Allow **multiple enrollments of one activity** (one per SessionGroup) for a child; variant buttons become toggles. This is a deliberate **delta on `docs/01 §4` INV-2** for the app layer. | Keep single-enrollment → cannot express “swimming twice a week via two groups”. |
| Free calendar name (4) | Title input stays **empty** (placeholder only shows the child’s name as a hint); export falls back to child name only when blank. | Pre-seed the value → user must clear it every time. |
| Address together (5) | One **“Ulice, město”** field that splits on the first comma into `street` + `city` simultaneously; individual parts still stored on the model. | External autocomplete (Mapy.cz suggest) → needs an API key/network; deferred as **BL-004**. |
| Richer custom form (6) | Add **cena (částka + období)** and **lektor** to the custom-event dialog, matching catalogue fields already on `CustomEntry`. | New model fields → unnecessary; `CustomEntry` already carries `price`, and sessions carry `instructor`. |
| Custom-event detail (7) | Add `selectedCustomEntryId` to the store; clicking a custom block opens a **custom-entry detail** in the right panel (name, times, address, contact, price, note). | Reuse the activity detail component → shapes differ; a small dedicated view is clearer. |
| Map preview (8) | Embed a small **OpenStreetMap** `<iframe>` (keyless) under the address when coordinates exist, plus an **“Otevřít v Mapy.cz”** link. This **closes BL-002** and accepts the privacy trade-off the user explicitly requested (a note is shown). | Native Mapy.cz `<iframe>` → needs an API key / share code, no keyless bbox embed; deferred as **BL-005**. |

---

## 1. Requirements

All FRs are `[web]` (`apps/web`); the engine is untouched.

- **FR-1** The weekly/day/3-day grid MUST, on mount, scroll so the current time is vertically centred in the visible area; when the current time is outside the rendered day it MUST fall back to the afternoon default.
- **FR-2** The grid MUST render a “now” indicator line at the current time across the visible day columns, refreshed at least once per minute. The time MUST be read in the app, never in the domain.
- **FR-3** A child MUST be able to enrol in more than one SessionGroup of the same activity; the variant list MUST let the user toggle each group independently, and the grid MUST show all enrolled groups.
- **FR-4** The export calendar-title field MUST be empty by default (placeholder only); a blank field MUST fall back to the child’s name on export.
- **FR-5** The custom-event form MUST offer a single address field that fills `street` and `city` together (split on the first comma).
- **FR-6** The custom-event form MUST allow entering price (amount + period) and instructor, and those values MUST appear in the custom-event detail.
- **FR-7** Clicking a custom-event block MUST open that event’s detail in the right column (name, day/time, address, contact, price, note) with a remove action.
- **FR-8** When a selected event has coordinates, the right column MUST show a small embedded map preview (OpenStreetMap, keyless) beneath the address plus an “Otevřít v Mapy.cz” link; without coordinates it MUST show nothing extra (no invented location).

---

## 2. Acceptance criteria

App-only change; ACs are verified with Playwright against `next dev` plus `tsc --noEmit`.

- **AC-1 → FR-1** After load, the grid scroll container’s `scrollTop` is greater than 0 and positions the current hour within the middle third of the viewport.
- **AC-2 → FR-2** A now-indicator element is present with a vertical offset equal to `topPx(currentMinutes)` (±1px).
- **AC-3 → FR-3** Enrolling two different groups of one activity yields two sets of blocks in the grid and two toggled-on variants in the detail; toggling one off removes only that group.
- **AC-4 → FR-4** The calendar-title input’s value is empty on open; exporting with it empty produces `X-WR-CALNAME:<child name>`.
- **AC-5 → FR-5** Typing “Ulice 1, Město” in the address field stores `street = "Ulice 1"` and `city = "Město"` on the created custom entry.
- **AC-6 → FR-6** A custom entry created with price and instructor shows both in its detail panel.
- **AC-7 → FR-7** Clicking a custom-event block renders its name as a heading in the right panel and a working “Odebrat” action.
- **AC-8 → FR-8** Selecting an activity with coordinates renders an `<iframe>` whose `src` targets `openstreetmap.org` and a link to `mapy.cz`; an entry without coordinates renders no map iframe.

Global gate: `pnpm -C apps/web typecheck` clean; `pnpm -C packages/domain test` stays green (unchanged).

---

## 3. Non-goals / notes

- **External address autocomplete** (Mapy.cz suggest with street/city/PSČ suggestions) is out of scope — it needs an API key and network calls. Tracked as **BL-004**; FR-5 ships the comma-split lightweight version instead.
- **Native Mapy.cz embed** (branded tiles in the preview) needs a Mapy.cz API key / share code and is out of scope; FR-8 uses a keyless OpenStreetMap preview plus a Mapy.cz link. Tracked as **BL-005**.
- **Closes BL-002** (embedded map tiles): FR-8 embeds an OpenStreetMap preview. The privacy trade-off (the child’s location is sent to a third party when the preview loads) is accepted per the explicit user request and surfaced with a short note in the UI.
- **INV-2 delta:** allowing multiple enrollments per activity (FR-3) intentionally supersedes `docs/01 §4` INV-2 at the app layer. The domain schema never enforced INV-2 (only the store did), so no engine change is required; `docs/01` should be annotated in a later docs-only change.
- **No engine change / no version bump:** every FR lives in `apps/web`. `@krouzky/domain` stays at 0.2.0.
- **Time zone / determinism:** the now-line uses the browser clock in the app only; the domain remains clock-free.
