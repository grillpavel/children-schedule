# Design Review 12 — Konflikty s akcí: navrhni a přepni bezkolizní variantu

**Status:** DRAFT
**Change ID:** CHANGE-13 (vlna 2 z Changes 8: doménový návrh bezkolizních variant + akce `Vyřešit` v souhrnu a počet konfliktů; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-B9/C8-B10: výpis konfliktů je dnes jen stížnost bez akce. Rodič potřebuje u časové kolize konkrétní řešení, ne jen zjištění.

> Delta base: supersedes `design_review_11.md` §0–§2 (CHANGE-12) ve vrstvě souhrnu. Částečně plní **BL-018** (položka C8-B10).

## 0. SOTA analysis

### 0.1 Problem

1. Detekce konfliktů (`detectConflicts`) vrací u časové kolize jen textovou hlášku a obecný `suggestion`; chybí konkrétní proveditelná alternativa (C8-B10, C8-X6).
2. Souhrn neukazuje počet konfliktů jako odznak, takže není hned jasná míra problému (C8-B9).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Návrh řešení (C8-B10) | Nová **čistá doménová funkce** `suggestVariantSwitches` — pro časovou kolizi vrátí varianty téhož kroužku, které striktně sníží počet tvrdých časových kolizí dítěte; deterministicky řazené. UI je jen tenká vrstva. | Počítat alternativy v Reactu — netestovatelné, duplikuje doménovou logiku překryvů. |
| Akce v souhrnu (C8-B10) | Tlačítko `Vyřešit` u tvrdé časové kolize nabídne konkrétní přepnutí; aplikace přes `changeVariant`. Když varianta není, řekne to. | Ponechat jen textový `suggestion` bez akce. |
| Míra problému (C8-B9) | Odznak s počtem konfliktů v hlavičce. | Bez počtu, jen seznam. |

## 1. Requirements

- **FR-1 [engine]** `suggestVariantSwitches(catalog, schedule, childId, conflict)` MUST pro `conflict.kind === 'time_overlap'` vrátit alternativní `sessionGroup` zapsaných kroužků, které **striktně sníží** počet tvrdých časových kolizí dítěte, seřazené podle zbývajících kolizí a pak podle popisku; MUST vrátit `[]` pro jiné druhy konfliktu i když žádná varianta nepomůže. MUST být čistá a deterministická (bez `Date`/náhody).
- **FR-2 [app]** Hlavička sekce konfliktů MUST zobrazit odznak s počtem konfliktů.
- **FR-3 [app]** Každá tvrdá časová kolize MUST nabídnout akci `Vyřešit` s konkrétními alternativami; aplikace alternativy MUST přepnout variantu (`changeVariant`) a odstranit překryv; když alternativa neexistuje, MUST to sdělit.

## 2. Acceptance criteria

- **AC-1 → FR-1** `packages/domain` `vitest` `test/suggest.test.ts`: navrhne bezkolizní variantu, vrátí `[]` bez alternativy i pro jiný druh konfliktu.
- **AC-2 → FR-2** Ruční/Playwright: hlavička konfliktů ukazuje počet.
- **AC-3 → FR-3** Playwright: překryv dvou kroužků nabídne `Vyřešit` s konkrétní variantou; po aplikaci tvrdá časová kolize zmizí.

Globální gate: `packages/domain` i `apps/web` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Engine feature → započítává se do **pending MINOR 0.3.0**; verze balíčku se bumpne až při vydání (dev-process §6), ne teď v `[Unreleased]`.
- Návrhy řešení pro jiné než časové kolize (dojezd, sourozenci, věk) nejsou součástí — pouze `time_overlap` (zbytek zůstává ve **BL-018**).
- Vizuální rozdělení upozornění do tří tříd nad rámec `hard`/`soft`/`info`, blok `Uzávěrky` (BL-017) a pole sezony (BL-018) zůstávají mimo tuto vlnu.
