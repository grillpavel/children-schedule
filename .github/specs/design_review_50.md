# Design Review 50 — Doporučení kroužků s důvody + výběr zájmů (planner-first, fáze 2a)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-51 (UI doporučení nad enginem z CHANGE-45: sekce „Doporučujeme" v katalogu + výběr zájmů dítěte — app `@krouzky/web` + testy T-122/T-123/T-124)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** BL-029 (planner-first IA), první shippable blok. CHANGE-45 dodal čistý doménový engine (`activityFit`/`buildRecommendations`), který dosud neměl UI. Tento blok ho zpřístupní uživateli s vysvětlitelnými důvody a minimální personalizací (zájmy).

## 0. SOTA analysis
- **0.1 Problem.** Doporučovací engine existuje (CHANGE-45), ale aplikace ho nevyužívá; katalog je čistě „procházecí". Chybí personalizace (zájmy) a vysvětlitelná doporučení.
- **0.2 Approach.** Do `CatalogPanel` přidat sekci „Doporučujeme" (top-N `buildRecommendations` s pozitivními důvody z `activityFit`) a výběr zájmů (chipy kategorií, ukládané do `Child.interests` novou store akcí `setChildInterests`). Sekce se zobrazuje **jen v nefiltrovaném pohledu** (`!hasActiveFilters`) — při hledání/filtru ustoupí výsledkům. `today` je vstup enginu, počítá se v app vrstvě (doména čistá). Doporučovací karty mají `aria-label` bez ceny, aby nekolidovaly s katalogovým lokátorem karet (`/Kč|Cena neuvedena/`).
- **Alternativy zamítnuty.** Zobrazovat % skóre (analýzy samy nedoporučují — jen důvody). Přestavba celé IA (Home/bottom nav/onboarding) — samostatné bloky BL-029, příliš velké riziko na jeden krok.

## 1. Requirements
- **FR-1** V nefiltrovaném katalogu se zobrazí sekce „Doporučujeme" s top-N (4) aktivitami dle `buildRecommendations`; každá s pozitivními důvody (✓ …) bez procent.
- **FR-2** Výběr zájmů: chipy kategorií (z katalogu) přepínají `Child.interests` aktivního dítěte; doporučení se okamžitě přepočtou (zapnutý zájem → důvod „✓ Odpovídá zájmu …").
- **FR-3** Sekce je vidět jen v nefiltrovaném pohledu; při hledání/filtru zmizí (výsledky mají přednost).
- **FR-4** Klik na doporučení otevře detail kroužku (stejně jako karta v katalogu).
- **FR-5** Beze změny chování zbytku: katalogové lokátory, počty položek ani vizuální baseline se nemění (doporučovací karty nenesou v přístupném názvu cenu; sekce je skrytá ve všech snímcích s filtrem).

## 2. Acceptance criteria
- **AC-1** (FR-1/3) **T-122**: sekce „Doporučujeme" je v nefiltrovaném katalogu; po zadání dotazu zmizí.
- **AC-2** (FR-2) **T-123**: zapnutí kategorie prvního doporučení přidá k němu důvod „✓ Odpovídá zájmu …".
- **AC-3** (FR-4) **T-124** (desktop): klik na doporučení zobrazí v detailu „Přidat do rozvrhu".
- **AC-4** (FR-5) Plná E2E `--workers=1` zelená na desktop + mobile-small (165 passed) **bez regenerace** vizuálních baseline; a11y T-300..310 zelené; `apps/web` `tsc` čisté; app HTTP 200.

## 3. Non-goals / notes
- Nezavádí Home/týden-first obrazovku, bottom nav Domů/Katalog/Rozvrh/Děti ani onboarding — další bloky BL-029.
- Zadávání časové dostupnosti a rozpočtu (další personalizační vstupy z CHANGE-45) zatím bez UI — engine je respektuje, až vznikne UI.
- `setChildInterests` jde přes `commit` (undo/redo + autosave z CHANGE-50 se aplikují).
- Doména se nemění; `today` je parametr enginu počítaný v app vrstvě.
