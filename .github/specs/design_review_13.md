# Design Review 13 — Zpřehledni detail: sticky hlavička, návrat a sbalitelný popis

**Status:** DRAFT
**Change ID:** CHANGE-14 (vlna 3 z Changes 8: sticky hlavička detailu s primární akcí, návrat na souhrn, sbalitelný popis; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-F2/C8-F4/C8-F5: primární akce se při čtení dlouhého detailu odscrolluje, chybí návrat na souhrn a málo důležitý popis zabírá místo nad foldem.

> Delta base: supersedes `design_review_11.md` §0–§2 (CHANGE-12) ve struktuře detailu. Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Název a primární akce `Přidat do rozvrhu` jsou uvnitř scrollovaného obsahu, takže při delším detailu zmizí (C8-F2).
2. Z detailu není rychlý návrat na souhrn (C8-F5).
3. Popis (T2) je vždy rozbalený a tlačí důležitější údaje níž (C8-F4/C8-F9).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Sticky hlavička (C8-F2) | Hlavička detailu (návrat + název + poskytovatel + primární akce) je `sticky top-0` uvnitř scroll kontejneru panelu. | Nechat hlavičku scrollovat s obsahem. |
| Návrat (C8-F5) | Tlačítko `← Zpět na souhrn` zruší výběr (`selectActivity(null)`). | Jen klik mimo panel (na mobilu nedostupné). |
| Popis (C8-F4/F9) | Popis je sbalitelná sekce, výchozí sbalená; prázdný popis se nezobrazuje. | Popis vždy rozbalený nad foldem. |

## 1. Requirements

- **FR-1 [app]** Detail kroužku MUST mít sticky hlavičku (návrat, název, poskytovatel, primární akce), která zůstává viditelná při scrollu obsahu panelu.
- **FR-2 [app]** Hlavička MUST obsahovat `← Zpět na souhrn`, které zruší výběr a vrátí souhrn.
- **FR-3 [app]** Popis MUST být sbalitelná sekce s výchozím stavem sbaleno; prázdný popis se MUST NOT zobrazit.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: hlavička detailu má `position: sticky`.
- **AC-2 → FR-2** Playwright: klik na `← Zpět na souhrn` odstraní detail (zruší výběr).
- **AC-3 → FR-3** Playwright: `Popis` je výchozí sbalený a klik ho rozbalí (0 → 1 odstavec).

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Mobilní spodní sheet detailu se snap pointy (C8-F7) zůstává mimo tuto vlnu (tracked as **BL-018**).
- Sbalitelnost dalších sekcí (Zdroj, Poznámka) a rodičovská poznámka (C8-D8) nejsou součástí; jen Popis.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
