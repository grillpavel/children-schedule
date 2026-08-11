# Design Review 30 — Liquid Glass: systém, vypínání a mobilní sheet

**Status:** DRAFT
**Change ID:** CHANGE-31 (vlna 4 z Changes 9: skleněný systém `.glass`, čtyři cesty vypnutí, ruční přepínač a aplikace na mobilní bottom sheet; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-9.md` C9-B/G: zavést Liquid Glass jako opt-out ambientní vrstvu s garantovaným kontrastem a přístupnostními fallbacky.

> Delta base: navazuje na tokeny a typografii z CHANGE-28. Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Aplikace neměla jednotný skleněný povrch ani mechanismus jeho bezpečného vypnutí (C9-B3).
2. Sklo nesmí zhoršit kontrast textu ani přístupnost (C9-B2), a smí být jen na ambientních plochách, ne na kartách/eventech/mřížce (C9-G6/G7/G8).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Skleněný povrch (C9-T2) | Jedna třída `.glass` + tokeny `--bg-glass`/`--border-glass`; `backdrop-filter: blur(20px) saturate(160%)` vč. `-webkit-`. | Ad-hoc `backdrop-blur` utility rozeseté po komponentách. |
| Vypnutí skla (C9-B3) | Čtyři cesty: `@supports not`, `[data-glass='off']`, `prefers-contrast: more`, `prefers-reduced-transparency: reduce`. | Spoléhat jen na `@supports`. |
| Řízení uživatelem | Ruční přepínač na `<html data-glass>`, stav v `sessionStorage` (efemérní). | Persistence do souboru rozvrhu (engine) — odloženo do BL-019. |
| Rozsah povrchu (C9-G5) | Sklo jen na mobilní bottom sheet; text na solidním vnitřním povrchu (C9-B2). | Sklo na kartách/eventech/mřížce. |

## 1. Requirements

- **FR-1 [app]** MUST existovat třída `.glass` a tokeny `--bg-glass`/`--border-glass`; `.glass` MUST používat `backdrop-filter: blur(20px) saturate(160%)` i `-webkit-backdrop-filter`.
- **FR-2 [app]** MUST existovat čtyři cesty vypnutí skla (C9-B3): `@supports not ((backdrop-filter) or (-webkit-backdrop-filter))`, `[data-glass='off']`, `@media (prefers-contrast: more)` (+ neprůhledný okraj), `@media (prefers-reduced-transparency: reduce)`; každá vrací `.glass` na solidní povrch bez blur.
- **FR-3 [app]** MUST být ruční přepínač skla, který nastaví `data-glass` na `<html>` a drží stav v `sessionStorage` pro danou relaci.
- **FR-4 [app]** Sklo MUST být aplikováno pouze na jeden schválený ambientní povrch — mobilní bottom sheet (C9-G5) — a obsah sheetu MUST sedět na solidním vnitřním povrchu (C9-B2). Karty, eventy ani mřížka sklo NEMAJÍ.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright (375 px): computed `backdropFilter` skleněného sheetu je `blur(20px) saturate(1.6)`.
- **AC-2 → FR-2/FR-3** Po kliknutí na přepínač je `document.documentElement.dataset.glass === 'off'` a computed `backdropFilter` sheetu je `none`.
- **AC-3 → FR-4** Sklo je jen na obalu sheetu; obsah (`DetailsPanel`) je na solidním `bg-white`. Žádné `pageerror`.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` (81) zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Sklo na bočních panelech se solidním vnitřním povrchem (C9-B2), dark mode a persistence přepínače do souboru rozvrhu (C9-A6) nejsou součástí — tracked as **BL-019**.
- Zbývající skleněné povrchy a plný přístupnostní audit mřížky zůstávají v **BL-019**.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
