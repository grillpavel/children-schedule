# Design Review 36 — Kontrast a přístupnost mřížky (axe nula porušení)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-37 (zvýšení kontrastu textu; ARIA struktura mřížky `grid>row>gridcell`; název selectu; odstranění fade artefaktu toastu — app `@krouzky/web` + zpřesnění a11y testů)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** E2E T-300/T-301 hlásily axe porušení: nízký kontrast textu (`text-slate-400` ≈ 2.5:1, `view-range` na slate-100, červená tlačítka red-600/red-50), dále `aria-required-children/parent` u mřížky a `select-name` u kategorie.

## 0. SOTA analysis
- **0.1 Problem.** (a) Řada textů byla pod prahem 4.5:1 (`text-slate-400`, `view-range`, `text-red-600` na `bg-red-50`). (b) `role="grid"` obsahoval `role="gridcell"` přímo, bez `role="row"` → kritická ARIA vada. (c) `<select>` kategorie neměl přístupný název. (d) axe u průsvitných/překrývajících prvků a symbolových glyfů vrací `incomplete` (`nonBmp`, `elmPartiallyObscur*`), což není glass-nález.
- **0.2 Approach.** (a) Ztmavit text na `slate-600` / `red-700`; kritické povrchy tak splní ≥ 4.5:1. (b) Obalit buňky `role="row"` a přesunout na něj CSS grid. (c) Doplnit `aria-label` selectu. (d) Toast: odstranit `opacity` z `@keyframes toastIn` (zůstane posun), aby text nebyl měřen během fade; symboly `↶ ● ` dostat mimo měření (`aria-hidden` + `aria-label` na undo/redo). (e) Testy T-300/T-301: emulovat `reducedMotion` (determinismus) a v T-301 vyloučit neškodné `incomplete` (`nonBmp`, `elmPartiallyObscur*`) — spec cílí jen na incomplete ze **skla**.

## 1. Requirements
- **FR-1** Veškerý běžný text splňuje ≥ 4.5:1 (axe `color-contrast` bez porušení).
- **FR-2** Mřížka má strukturu `role="grid" > role="row" > role="gridcell"`.
- **FR-3** Select kategorie má `aria-label`.
- **FR-4** Toast se neanimuje průhledností; dekorativní symboly nejsou v přístupném názvu.
- **FR-5** T-300 = nula porušení A/AA; T-301 = nula skutečných `color-contrast` porušení i glass-`incomplete` (neškodné `nonBmp`/`elmPartiallyObscur*` vyloučeny).

## 2. Acceptance criteria
- **AC-1..5** E2E T-300 a T-301 zelené na desktop i mobile-small (stabilně, 2× běh). `apps/web` `tsc --noEmit` čisté. Vizuální baseline přegenerovány (barvy se ztmavily), `visual.spec` zelený.

## 3. Non-goals / notes
- Přechod na plné token barvy (`--text-*`) místo `slate-*` tříd — širší refaktor, teď jen bodové ztmavení (BL-019).
- Šipková navigace mřížky (T-304) a dark mode (T-310) — samostatné dávky 3c/3b (BL-019).
- Skutečný glass-`incomplete` (text na skle) by test dál zachytil; současný design drží text na neprůhledném vnitřku sheetu.
