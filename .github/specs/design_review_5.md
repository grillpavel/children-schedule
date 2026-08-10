# Design Review 5 — Richer right-column info + age filter off by default

**Status:** IMPLEMENTED
**Change ID:** CHANGE-6 (more info in the activity detail + default the age filter off; scope: app `@krouzky/web` only)
**Date:** 2026-08-10
**Repo:** monorepo `Children_schedule` (touches `apps/web` only)
**Trigger:** “Changes 4” in `.github/specs/changes.md`: show more information in the right column (websites, contact details) with a SOTA review for user-friendliness, and turn the age filter off by default.

> Delta base: **design_review_4.md (CHANGE-5)**. App-only; the fields shown already exist on the domain `Activity`/`Provider` (`description`, `sourceUrl`, `contact`, `website`), so no engine change and no version bump. The adapter only populates `sourceUrl` from existing data.

---

## 0. SOTA analysis

### 0.1 Problem

The activity detail showed provider, category, address, price, capacity, a bare phone number and a verified-at date. The verified real data carries much more that the user needs to actually enrol: a **description**, a **link to the kroužek page** (`NS_ACTIVITY_META.sourceUrl`, e.g. ddmrako.cz), a **contact person** and (for some orgs) **email**. It was also unnecessarily hard to browse: the age filter defaulted **on**, hiding most of the 23 kroužky until the user found the checkbox.

### 0.2 Approach — chosen vs rejected

| Item | Chosen | Rejected alternative |
|---|---|---|
| More info | Show the activity **description** and a grouped **“Kontakt a odkazy”** card: 👤 contact person, 📞 phone (`tel:`), ✉️ email (`mailto:`), 🌐 “Více informací (web)” → `activity.sourceUrl ?? provider.website` (new tab). Uses fields already on the domain model. | Free-text dump of every meta field → noisy; new domain fields → unnecessary, the data maps onto existing `Activity.sourceUrl`/`description` and `Provider.contact`. |
| Web link source | Map `NS_ACTIVITY_META.sourceUrl` → `Activity.sourceUrl` in the adapter (per-kroužek page). | Add a bespoke link field → the schema already has `sourceUrl`. |
| Layout | One bordered, shaded contact card grouping all links/contacts; description as a short paragraph near the top. | Scatter links inline → less scannable, the user asked for a friendlier layout. |
| Age filter default | Default **off** (`ageOnly = false`) so all kroužky show immediately; the checkbox still narrows by the child’s age. | Keep default on → hides most of the catalogue on first load. |

---

## 1. Requirements

All FRs are `[web]` (`apps/web`); the engine is untouched.

- **FR-1** The catalogue age filter MUST default to **off** (all activities visible on load); toggling it on still restricts to the child’s age.
- **FR-2** The activity detail MUST show the activity `description` when present.
- **FR-3** The activity detail MUST show a “Kontakt a odkazy” block listing the contact person, phone (`tel:`), email (`mailto:`), and a web link to `activity.sourceUrl ?? provider.website` (opens in a new tab); each row appears only when its value exists (no invented data).
- **FR-4** The Nové Strašecí adapter MUST populate `Activity.sourceUrl` from `NS_ACTIVITY_META.sourceUrl` so FR-3’s web link resolves.

---

## 2. Acceptance criteria

App-only; verified with `tsc --noEmit` + Playwright against `next dev`.

- **AC-1 → FR-1** On load the age checkbox is unchecked and all 23 catalogue cards are visible.
- **AC-2 → FR-2** Selecting an activity with a description renders that description text.
- **AC-3 → FR-3/FR-4** The detail shows the “Kontakt a odkazy” block with the contact person and phone, and a “Více informací (web)” link whose `href` is the kroužek’s `ddmrako.cz` page.

Global gate: `pnpm -C apps/web typecheck` clean; domain tests unchanged (green).

---

## 3. Non-goals / notes

- **Enrollment instructions** (`NS_ACTIVITY_META.note`, e.g. “Přihlášky přes HB Dance Praha”, “BIOS = pouze místo konání”) are **not** surfaced yet — they live in metadata outside the domain model; surfacing them cleanly needs a model decision. Tracked as **BL-011**.
- **Additional fees** (`NS_ACTIVITY_META.additionalFees`) remain out of the displayed price — already tracked as **BL-010**.
- **No engine change / no version bump:** every FR lives in `apps/web`; `description`/`sourceUrl`/`contact`/`website` already exist on the domain model.
