# Design Review 29 — Tabulární číslice v číselných sloupcích

**Status:** DRAFT
**Change ID:** CHANGE-30 (vlna 3 z Changes 9: `tabular-nums` u časové osy a tabulky porovnání variant; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-9.md` C9-Y3: číselné sloupce (časová osa, ceny, porovnání) mají mít tabulární číslice, aby se čísla zarovnávala.

> Delta base: navazuje na typografii z CHANGE-28. Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Časová osa a číselné sloupce používaly proporcionální číslice, takže se hodnoty nezarovnávaly (C9-Y3).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Tabulární číslice (C9-Y3) | `tabular-nums` na časové ose mřížky a na tabulce porovnání variant. | Ponechat proporcionální číslice. |

## 1. Requirements

- **FR-1 [app]** Časová osa kalendáře a tabulka porovnání variant MUST používat `font-variant-numeric: tabular-nums`.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: computed `fontVariantNumeric` časové osy je `tabular-nums`.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Plošné `tabular-nums` na všech cenách/číslech napříč aplikací není součástí (tracked as **BL-019**).
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
