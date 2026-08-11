# Design Review 20 — Porovnání variant v souhrnu

**Status:** DRAFT
**Change ID:** CHANGE-21 (vlna 10 z Changes 8: sbalitelná tabulka porovnání pojmenovaných variant s klíčovými metrikami; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-G1: bez porovnání je „Kopie“ jen druhý stav, ne varianta. Rodič potřebuje vedle sebe klíčové metriky variant.

> Delta base: navazuje na souhrn ze `design_review_11.md` (CHANGE-12) a metriky z CHANGE-15/19. Bez změny doménového modelu; využívá `scheduleSummary` a `detectConflicts`.

## 0. SOTA analysis

### 0.1 Problem

1. Varianty rozvrhu (`Kopie`) nelze porovnat vedle sebe (C8-G1).
2. Metriky pro porovnání už doména umí spočítat, ale jen pro aktivní rozvrh v UI.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Porovnání variant (C8-G1) | Sbalitelná tabulka: pro každou variantu klíčové metriky (kroužky, obsazené dny z 5, Kč/měs, konflikty) z `scheduleSummary` + `detectConflicts`; aktivní varianta zvýrazněná. | Duplikovat výpočty v UI nebo ukazovat jen aktivní variantu. |

## 1. Requirements

- **FR-1 [app]** Při ≥ 2 variantách MUST souhrn nabídnout sbalitelné `Porovnání variant` s tabulkou klíčových metrik (počet kroužků, obsazené dny z 5, Kč/měs, počet konfliktů) pro každou variantu; aktivní varianta MUST být zvýrazněna.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: po vytvoření druhé varianty (`Kopie`) ukazuje `Porovnání variant` tabulku se dvěma řádky metrik.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Další sloupce (hodiny/týden, nejtěsnější přestup) a přepnutí na variantu klikem v tabulce nejsou součástí této vlny.
- Kč/měs je per-period odhad (stejný model jako v souhrnu), ne plná sezónní normalizace (zbytek **BL-018**).
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
