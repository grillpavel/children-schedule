# Design Review 31 — Přístupnost po skle: Escape zavírá výběr, focus ring na skle

**Status:** DRAFT
**Change ID:** CHANGE-32 (vlna 5 z Changes 9: klávesa Escape zavře vybraný detail/sheet a focus ring na skleněných plochách dostane vnější bílý stín; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-9.md` C9-A4 (klávesová obsluha: Escape zavření panelu) a C9-A1 (viditelný focus ring, na skle s vnějším bílým stínem).

> Delta base: navazuje na skleněný systém z CHANGE-31 a focus ring z CHANGE-28. Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Vybraný detail (pravý panel / mobilní sheet) šlo zavřít jen myší přes „← Zpět“; chyběla klávesa Escape (C9-A4).
2. Po zavedení skla (CHANGE-31) nemá focus ring na skleněné ploše garantovanou viditelnost na světlém i tmavém podkladu (C9-A1).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Zavření výběru klávesou (C9-A4) | Globální `keydown` na `window` — Escape volá `selectActivity(null)` + `selectCustomEntry(null)`; listener aktivní jen když je výběr. | Listener na jednotlivých panelech (křehké při přepnutí mobil/desktop). |
| Focus na skle (C9-A1) | `.glass:focus-visible, .glass :focus-visible { box-shadow: 0 0 0 1px #fff }` navíc k outline. | Měnit barvu outline podle podkladu (nelze staticky určit). |

## 1. Requirements

- **FR-1 [app]** Stisk klávesy **Escape** MUST zavřít aktuálně vybraný detail (pravý panel i mobilní sheet) vymazáním výběru; když není nic vybráno, klávesa nemá vedlejší efekt.
- **FR-2 [app]** Prvky s `:focus-visible` uvnitř skleněné plochy (a samotná skleněná plocha) MUST mít navíc vnější bílý stín `0 0 0 1px #fff`, aby byl focus ring viditelný na světlém i tmavém podkladu.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright (1440 px): po výběru kroužku je v pravém panelu nadpis „Programování“ (h2); po Escape nadpis zmizí (výběr vymazán).
- **AC-2 → FR-2** V CSS existuje pravidlo `.glass:focus-visible` / `.glass :focus-visible` s `box-shadow` `rgb(255,255,255) 0 0 0 1px`.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` (81) zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Plná klávesová navigace mřížky šipkami (C9-A4 „šipky pohyb“) a ARIA `role="row"` mezi gridem a buňkami zůstávají v **BL-019**. Bloky událostí jsou už dnes `<button>` (fokusovatelné, Enter nativně).
- Nativní chování Escape ve vyhledávacím poli (vymazání textu) má přednost, dokud je pole zaostřené; zavření výběru funguje z ostatních fokusovatelných prvků.
- Dark mode (C9-A6) a měření kontrastu v CI (C9-T3e) nejsou součástí — **BL-019**.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
