# Design Review 37 — Dark mode (tmavý motiv podle `prefers-color-scheme`)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-38 (tmavý motiv: mapování povrchů/textu/ohraničení/akcentů v `@media (prefers-color-scheme: dark)` — app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** E2E T-310 vyžaduje, aby aplikace při systémovém tmavém režimu měla tmavé pozadí (`body` luminance < 0.5) a zároveň axe nula porušení. Aplikace žádný dark mode neměla — plochy zůstaly světlé, kontrast selhával.

## 0. SOTA analysis
- **0.1 Problem.** (a) Bez dark stylu `body` i všechny `bg-white/bg-slate-*` plochy zůstaly světlé → T-310 (tmavé pozadí) padal. (b) Tailwind utility jsou v CSS výstupu plain (žádné native `@layer`), takže vlastní přepis vyhrává jen zdrojovým pořadím a shodnou specificitou. To platí pro plné třídy, ale **`hover:` varianty Tailwindu vyhrávaly** i přes pozdější zdrojové pořadí → hover na červeném tlačítku „Odebrat z rozvrhu" zůstal světle červený (`#fef2f2`) s tmavě-červeným textem = 1.73:1.
- **0.2 Approach.** (a) Přidat blok `@media (prefers-color-scheme: dark)` na **konec** `globals.css` (za `body { @apply bg-slate-100 }`, jinak by světlé `body` přepsalo tmavé) a namapovat tokeny + třídy povrchů (`bg-white`, `bg-slate-50/100/200/800/900` a `hover:` varianty), textu (`slate-900..500`, `blue-600`), ohraničení (`slate-100..400`) a akcentů (emerald/amber/red) na tmavou paletu s ověřeným kontrastem. (b) Na dark `hover:` přepisy dát `!important`, protože Tailwind hover varianty jinak vyhrají (ověřeno: bez `!important` computed hover bg zůstal `rgb(254,242,242)`; s `!important` je `rgb(69,10,10)`). Alternativa (zvýšit specificitu prefixem `body`) zamítnuta — křehčí a hůř čitelné. (c) Test T-310 posune myš na `(0,0)` a emuluje `reducedMotion` před axe — přístupnostní audit nesmí záviset na pozici myši ani na fade animaci.

## 1. Requirements
- **FR-1** Při `prefers-color-scheme: dark` má `body` tmavé pozadí (relativní luminance < 0.5).
- **FR-2** V tmavém režimu axe hlásí nula porušení A/AA (včetně `color-contrast`) ve stavu s vybraným a zapsaným kroužkem.
- **FR-3** Hover stavy v tmavém režimu neshazují kontrast — dark `hover:` přepisy skutečně platí (červené i slate tlačítka).
- **FR-4** Světlý režim zůstává beze změny (přepisy jsou uvnitř `@media dark`).

## 2. Acceptance criteria
- **AC-1..3** E2E T-310 zelený na desktop i mobile-small (stabilně). Diagnostika potvrdila computed hover bg `rgb(69,10,10)` po opravě.
- **AC-4** `apps/web` `tsc --noEmit` čisté (změna je jen CSS + test). Vizuální baseline `info-dark.png` přegenerovány napříč profily; `visual.spec` zelený.

## 3. Non-goals / notes
- Uživatelský přepínač motivu (světlo/tma nezávisle na systému) — teď jen `prefers-color-scheme` (tracked as BL-019).
- Přechod ploch na plné token barvy místo bodového mapování `slate-*`/akcentů — širší refaktor (tracked as BL-019).
- Zbytek BL-019: T-202 (Agenda mobil), T-205 (dotykové cíle), T-207 (200% zoom), T-304 (šipky v mřížce), T-504 (Lighthouse CI) — samostatné dávky.
