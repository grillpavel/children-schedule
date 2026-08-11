# Design Review 21 — Mapa až po explicitním kliknutí

**Status:** DRAFT
**Change ID:** CHANGE-22 (vlna 11 z Changes 8: náhled mapy v detailu se načítá až po kliknutí; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-D4/C8-D2: každý embed mapy při načtení je požadavek na třetí stranu; má se načíst až na výslovné přání, kvůli soukromí i šetření kvóty.

> Delta base: upravuje chování `MapLink` z CHANGE-2 (spec `design_review_2.md`). Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Náhled OpenStreetMap se v detailu načítal automaticky při zobrazení, tedy odesílal polohu třetí straně bez akce uživatele (C8-D2/C8-D4).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Mapa na vyžádání (C8-D4) | Iframe se vykreslí až po kliknutí na `Zobrazit mapu`; textové odkazy (OSM, Mapy.cz) zůstávají vždy. | Ponechat automatické načítání iframe při zobrazení detailu. |

## 1. Requirements

- **FR-1 [app]** Náhled mapy MUST se v detailu načíst až po kliknutí na `Zobrazit mapu`; před kliknutím MUST NOT existovat mapový iframe (žádný požadavek na OpenStreetMap).

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: po otevření detailu není mapový iframe přítomen; po kliknutí na `Zobrazit mapu` se objeví.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Volba mezi OSM a Mapy.com dlaždicemi (klíč/kvóta) není součástí; zůstává keyless OSM náhled na vyžádání.
- Chování se týká detailu kroužku i vlastní události (sdílený `MapLink`).
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
