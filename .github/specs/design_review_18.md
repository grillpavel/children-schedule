# Design Review 18 — Neutrální rozpad obsazenosti po dnech

**Status:** DRAFT
**Change ID:** CHANGE-19 (vlna 8 z Changes 8: blok „Obsazenost týdne“ s per-den počty Po–Pá, bez normativní škály; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-B1/C8-B4: souhrn ukazuje jen agregát „obsazená odpoledne“, chybí přehled po dnech; a to bez barevné škály zelená–červená, protože „kolik je moc“ rozhoduje rodič.

> Delta base: navazuje na metriky ze `design_review_11.md` (CHANGE-12). Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Souhrn nezobrazuje, které dny jsou obsazené a kolika kroužky (C8-B1).
2. Případná barevná škála by rozhodovala za rodiče, což je nežádoucí (C8-B4).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Rozpad po dnech (C8-B1) | Seznam Po–Pá s počtem kroužků daného dne a `volno` pro prázdný den; neutrální značky bez barevné škály. | Barevná heatmapa zelená–červená hodnotící „moc/málo“. |

## 1. Requirements

- **FR-1 [app]** Souhrn MUST zobrazit rozpad obsazenosti po dnech Po–Pá s počtem kroužků; prázdný den MUST být označen `volno`; zobrazení MUST NOT používat normativní barevnou škálu.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: po zapsání kroužku v pondělí ukazuje řádek `Po … 1 kroužek` a ostatní dny `volno`.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Přepnutí kalendáře klikem na den (C8-B7) není součástí této vlny; zůstává jako budoucí navázání.
- Rozpad počítá kroužky (bloky) daného dne, nikoli cesty vs. sdružené přesuny.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
