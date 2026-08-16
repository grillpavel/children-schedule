# Design Review 44 — Přechod z katalogu na plánovač: personalizace + doporučovací engine (program + fáze 1)

**Status:** IMPLEMENTED (fáze 1 / CHANGE-45; směrové fáze FR-D1… zůstávají jako BL-029/031/032)
**Change ID:** CHANGE-45 (fáze 1: rozšíření modelu `Child` o zájmy/dostupnost/rozpočet + deterministický `activityFit` / `buildRecommendations` — engine `@krouzky/domain` + minimální defaulty ve store `@krouzky/web`)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (packages/domain + apps/web + test)
**Trigger:** Dvě produktové analýzy (`pre_analysis_44a/b.md`, `pre_design_review_44a/b.md`) navrhují transformaci z katalog-first na planner-first osobního asistenta. Tento spec je kriticky prověří, sjednotí a rozfázuje; fáze 1 staví čistý testovatelný základ (personalizační vstupy + doporučovací engine), na kterém teprve staví pozdější UI/IA.

## 0. SOTA analysis
- **0.1 Problem.**
  - **Jádro obou analýz je správné:** „katalog je prostředek, rozvrh je produkt" → planner-first, progressive disclosure, vysvětlitelná doporučení, deterministický engine, mobile agenda-first. Koherentní směr.
  - **Obě podceňují stávající doménu.** Už hotové (nepřestavovat, jen využít): strukturovaná `Price {amount, period}`; varianty `SessionGroup.sessions[]`; conflict engine (`detect.ts`: `time_overlap`, `travel_infeasible`, `school_not_finished`, `budget_exceeded`, `age_out_of_range`, `capacity_unknown`); `suggestVariantSwitches` (alternativní termín); skórování `ScheduleVariant {score, satisfiedSoft, tradeoffSummary}`; multi-child (CHANGE-40); agenda-first mobil (CHANGE-39); dark mode (CHANGE-38); WCAG A/AA (T-300..310); bohatý ICS export.
  - **Reálně chybí:** personalizační vstupy na `Child` (zájmy, časová dostupnost, měsíční rozpočet); **per-aktivita** match/recommendation s vysvětlením; Home/týden-first obrazovka; onboarding; bottom nav Domů/Katalog/Rozvrh/Děti; autosave; microcopy („N termínů" místo „+1", „Bez konfliktu"); 44px touch cíle; PDF.
  - **Konflikt s čerstvými rozhodnutími.** Analýzy chtějí konflikty maximálně viditelné a porovnání variant; CHANGE-44 (Changes 12) konflikty z pravého sloupce **odebral** a CHANGE-43 odebral „Porovnání variant" (BL-024). To je rozhodovací bod, ne automatické vrácení.
- **0.2 Approach.**
  - **Znovu využít doménu, nepřestavovat ji.** Přidat tenkou deterministickou doporučovací vrstvu nad existující conflict/budget/age logikou. Alternativa (přepis modelu dle analýz od nuly) zamítnuta — duplikovala by hotové a otestované.
  - **Rozfázovat.** Nejdřív čistý, testovatelný engine + datový model (tato fáze 1), UI/IA až v dalších specích. Alternativa (velký „big-bang" redesign v jednom kroku) zamítnuta — nezvládnutelné riziko a porušení „jedna CHANGE = jeden shippable krok".
  - **Zachovat čistotu domény.** Persistence (autosave/localStorage) i případný analytics žijí v app vrstvě, ne v doméně (bez `Date.now()`/IO v doméně; dnešek je vždy parametr). Alternativa (localStorage přímo v doméně) zamítnuta — porušuje doménovou čistotu.
  - **Graceful degradace.** Prázdné `interests`/`availability` → engine se chová neutrálně (žádný filtr navíc), takže fáze 1 nic nerozbije, i než vznikne onboarding UI.
  - **Odmítnuté/odložené z analýz:** analytics funnel (předčasné, GDPR plocha — BL-032), PWA/offline (BL-032), cloud/účty/sharing (BL-032), zobrazování % skóre (obě samy nedoporučují — jen důvody), PDF (BL-032). Konfliktní „konflikty zpět do pravého sloupce" → rozhodnutí uživatele (BL-028), tento spec to neřeší.

## 1. Requirements
Fáze 1 (závazné, CHANGE-45):
- **FR-1** Model `Child` (`childSchema`) získá volitelné personalizační vstupy: `interests: ActivityCategory[]` (default `[]`), `availability: { weekday: Weekday; startMinutes; endMinutes }[]` (default `[]`), `budgetMonthlyCzk?: number`. `schemaVersion` se zvýší 3 → 4 s migrací (starší stavy zůstanou platné, chybějící pole se doplní defaulty).
- **FR-2** Čistá funkce `activityFit(activity, child, schedule, catalog, today)` → `{ score: number (0..1); reasons: { key; ok: boolean; label: string }[] }`, deterministická (dnešek je parametr), kombinující: vhodnost věku, shodu zájmu (kategorie ∈ `child.interests`), časovou dostupnost (aspoň jedna varianta uvnitř některého `availability` okna), bezkolizní zařaditelnost (žádný `hard` `time_overlap` s aktuálním rozvrhem) a rozpočet (nepřekračuje `budgetMonthlyCzk`). Nepoužívá `Math.random`/`Date.now`.
- **FR-3** Čistá funkce `buildRecommendations(child, catalog, schedule, today, opts?)` → seřazený seznam top-N aktivit dle `activityFit.score`, vyloučí už zapsané a volitelně vyloučené kategorie; stabilní deterministické řazení (skóre desc, pak název asc).
- **FR-4** `reasons` jsou vysvětlitelné české popisky bez procent (např. „✓ Vhodné pro věk", „✓ Odpovídá zájmu Sport", „✓ Termín ve volném čase", „✓ Bez kolize", „✓ V rozpočtu" / negace „× …").
- **FR-5** Store `@krouzky/web` inicializuje nové `Child` pole defaulty (`interests: []`, `availability: []`) tak, aby aplikace i export fungovaly beze změny chování (fáze 1 nemá UI pro zadání těchto polí).

Směrové požadavky pozdějších fází (vlastní specy, nezávazné zde):
- **FR-D1** Home/týden-first obrazovka + bottom nav Domů/Katalog/Rozvrh/Děti; onboarding ≤ 30 s; UI doporučení s důvody (BL-029).
- **FR-D2** Autosave do `localStorage` v app vrstvě s verzovanou migrací (BL-030).
- **FR-D3** Microcopy („N termínů" místo „+1", „Bez konfliktu" místo „Vejde se mi to") a touch cíle ≥ 44 px, funkčnost od 320 px (BL-031).
- **FR-D4** PDF export, PWA/offline, analytics, cloud sharing — nízká priorita (BL-032).

## 2. Acceptance criteria
- **AC-1** (FR-1) `packages/domain` vitest: migrace v3 → v4 na starém stavu doplní `interests: []`, `availability: []`; `parsePlannerState` starého souboru projde. `state.test.ts`.
- **AC-2** (FR-2) vitest `matching.test.ts`: případy pro věk (in/out), zájem (match/neutral při prázdném), dostupnost (uvnitř/mimo okno), kolizi (překryv s existující docházkou → `ok:false`), rozpočet (pod/nad). Skóre deterministické.
- **AC-3** (FR-3) vitest: `buildRecommendations` vrací N nejlepších, vylučuje zapsané, řadí stabilně (skóre desc, název asc).
- **AC-4** (FR-4) vitest: `reasons` obsahují očekávané klíče a české popisky, žádné „%".
- **AC-5** (FR-5) `apps/web` `tsc --noEmit` čisté; existující E2E sada zůstává zelená (chování beze změny); app HTTP 200.
- **AC-6** `packages/domain` `tsc --noEmit` + celý vitest zelené; verze enginu bump MINOR při shipnutí.

## 3. Non-goals / notes
- **Nepřestavovat** existující doménu (conflict/price/varianty/scoring/ICS) — jen rozšířit (viz §0.2).
- **Konflikty v pravém sloupci:** analýzy je chtějí zpět a výrazné; CHANGE-44 je odebral na výslovné přání uživatele. Tento spec to **nemění** — je to produktové rozhodnutí (tracked as BL-028, NEEDS INPUT od uživatele).
- Fáze 1 **nezavádí UI** pro zájmy/dostupnost/rozpočet ani obrazovku doporučení — to je fáze 2 (tracked as BL-029).
- Autosave/localStorage jen v app vrstvě, ne v doméně (tracked as BL-030).
- Microcopy + touch cíle 44 px + 320 px (tracked as BL-031).
- PDF/PWA/analytics/cloud odloženy jako nízká priorita (tracked as BL-032).
- Supersedes nic z předchozích speců; rozšiřuje model z `design_review_4.md` (schemaVersion) a navazuje na `design_review_43.md`.
- KPI z analýz (Time to First Useful Schedule ≤ 90 s) jsou produktové cíle, ne testovatelné `FR` v této fázi.
