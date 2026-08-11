# Design Review 27 — Základ design systému: viewport, tokeny, fonty, focus

**Status:** DRAFT
**Change ID:** CHANGE-28 (vlna 1 z Changes 9: `viewport-fit=cover`, barevné tokeny, pořadí fontů, viditelný focus ring; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-9.md` fáze 1: bez token vrstvy, správného viewportu, pořadí fontů a viditelného focusu nelze stavět další design-systémové vlny (sklo, dark mode, kontrast).

> Delta base: první vlna Changes 9; navazuje na stávající Tailwind styly. Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Viewport neměl `viewport-fit=cover`, takže safe-area insety by na mobilu vracely nulu (C9-M8).
2. Chyběla token vrstva barev se semantickými `-text` variantami a `--focus-ring` (C9-T1/T3a/T3d).
3. Pořadí fontů nebylo `Inter, system-ui, …` (C9-Y4).
4. Nebyl garantovaný viditelný focus ring (C9-A1).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Viewport (C9-M8) | Next `export const viewport` s `viewportFit: 'cover'`. | Ruční `<meta>` bez `viewport-fit`. |
| Tokeny (C9-T) | CSS proměnné v `:root` vč. `--success-text`/`--warning-text` a `--focus-ring`; barvy se zatím nevynucují na body, jen připravují vrstvu. | Rozházené hex hodnoty v komponentách. |
| Fonty (C9-Y4) | `font-family: Inter, system-ui, sans-serif` na `body`. | `system-ui` s fallbackem na Inter (Inter by se nepoužil). |
| Focus (C9-A1) | Globální `:focus-visible` outline 2 px z `--focus-ring`. | Spoléhat na výchozí focus prohlížeče. |

## 1. Requirements

- **FR-1 [app]** Viewport meta MUST obsahovat `viewport-fit=cover`.
- **FR-2 [app]** `:root` MUST definovat barevné tokeny včetně `--text-primary`, `--success-text`, `--warning-text` a `--focus-ring`.
- **FR-3 [app]** `body` `font-family` MUST začínat `Inter`, pak `system-ui`, `sans-serif`.
- **FR-4 [app]** `:focus-visible` MUST vykreslit outline 2 px z `--focus-ring`.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: `meta[name=viewport]` obsahuje `viewport-fit=cover`.
- **AC-2 → FR-2** Playwright: computed `--bg-app`/`--text-primary`/`--success-text`/`--focus-ring` mají očekávané hodnoty.
- **AC-3 → FR-3** Playwright: `getComputedStyle(body).fontFamily` = `Inter, system-ui, sans-serif`.
- **AC-4 → FR-4** Ruční/statická kontrola: `:focus-visible` pravidlo je v `globals.css`.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Liquid Glass (C9-G/B), dark mode (C9-A6), přepracované breakpointy (C9-L), paleta kroužků (C9-T5), měření kontrastu v CI (C9-T3e), plošné `tabular-nums` (C9-Y3) a vynucení token barev na plochy nejsou součástí této vlny (tracked as **BL-019**).
- Tokeny jsou zatím jen vrstva; komponenty se na ně přepnou v dalších vlnách.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
