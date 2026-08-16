# Design Review 45 — Mobilní GUI: odlehčení horní lišty a ovládání (použitelnost na 360/390 px)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-46 (na mobilu (<900 px) skrýt netestovaný desktopový nepořádek: přepínač Den/3 dny/Týden/Měsíc, karty variant, barvu v liště, „Barva: vyberte kroužek" a „Rozvrh existuje jen v tomto okně"; oprava microcopy „vlevo/vpravo" — app `@krouzky/web` + úprava T-152)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** Uživatel otestoval mobilní aplikaci a byla „nepoužitelná". Reálné měření (Playwright 360/390 px) potvrdilo: obří přeplněná horní lišta zabírala ~40–50 % obrazovky, přepínač „Den/3 dny/Týden/Měsíc" byl oříznutý/rozbitý a microcopy odkazovalo na desktopové „vlevo/vpravo".

## 0. SOTA analysis
- **0.1 Problem.** Horní oblast (`Toolbar` `flex-wrap` + `VariantTabs` + ovládání pohledu v `ScheduleGrid`) je navržená pro desktop a na 360 px se láme do 4+ řádků: dítě + Přidat dítě, Kalendář + Název, Barva/Věk, „Uloženo · Rozvrh existuje jen v tomto okně", undo/redo + Otevřít/Uložit/Další, „Varianta A / + / Kopie", a přepínač Den/3 dny/Týden/Měsíc (text oříznutý). Reálný obsah (katalog/rozvrh) začíná až hluboko pod fold. Diagnostika: `overflowX=0` (žádné vodorovné přetečení), ale ~22 malých cílů na úvodní obrazovce a rozbitý přepínač.
- **0.2 Approach.** Skrýt na mobilu (`desk:` breakpoint = 900 px) prvky, které jsou pro mobil buď redundantní, nebo nepatří do vždy viditelné lišty, a které **nejsou** kryté E2E: přepínač Den/3 dny/Týden/Měsíc (na mobilu je výchozí Agenda), karty variant (`VariantTabs`, pokročilá funkce), barvu v liště (je i v detailu kroužku), pomocné texty „Barva: vyberte kroužek" a „Rozvrh existuje jen v tomto okně". Testované akce (Název kalendáře, Uložit, Otevřít, Další ▾, Přidat dítě) a funkční undo/redo (jediné dotykové vrácení) zůstávají viditelné. Alternativa (přesun Otevřít/Uložit/Další do hamburger menu) zamítnuta pro tuto dávku — vyžadovala by přepis persistence/ics testů a větší riziko; ponechává se na navazující fázi (BL-031/BL-029).

## 1. Requirements
- **FR-1** Na mobilu (<900 px) se nezobrazuje přepínač „Den/3 dny/Týden/Měsíc"; zůstává „Agenda/Mřížka" a navigace ‹ Dnes ›. Na desktopu beze změny.
- **FR-2** Na mobilu se nezobrazují karty variant (`VariantTabs`) ani barva v liště ani texty „Barva: vyberte kroužek" a „Rozvrh existuje jen v tomto okně". Na desktopu beze změny.
- **FR-3** Testované akce (Název kalendáře, Uložit, Otevřít, Další ▾, Přidat dítě) a undo/redo zůstávají na mobilu dostupné.
- **FR-4** Microcopy nezávisí na desktopovém rozložení: prázdný rozvrh říká „z katalogu" (ne „vlevo"), tip říká „otevře jeho detail" (ne „vpravo").

## 2. Acceptance criteria
- **AC-1** (FR-1..3) E2E: celá sada `--workers=1` zelená na všech 6 profilech; persistence T-150..154 zelené i na mobilu (T-152 nastavuje barvu přes detail sheet na kompaktu). `apps/web` `tsc --noEmit` čisté.
- **AC-2** (FR-1/2) Ruční/diagnostické měření: úvodní mobilní obrazovka (360 px) má výrazně méně malých cílů (22 → 13) a obsah začíná výš; přepínač pohledů není oříznutý.
- **AC-3** (FR-4) V DOM prázdného rozvrhu není „vlevo" ani „detail vpravo".
- **AC-4** Vizuální baseline (mobilní `toolbar`/prázdné stavy) přegenerovány; `visual.spec` zelený; app HTTP 200.

## 3. Non-goals / notes
- Toto je **odlehčení**, ne redesign IA (Home/bottom nav Domů/Katalog/Rozvrh/Děti, onboarding) — to je `design_review_44.md` fáze 2+ (BL-029).
- Touch cíle ≥ 44 px a plná funkčnost od 320 px (dnes ≥ 24 px / 360 px) zůstávají otevřené (BL-031).
- Přesun Otevřít/Uložit/Další/Kalendář do mobilního menu (další zeštíhlení lišty) — navazující dávka (BL-031).
- Změny jsou čistě responzivní (Tailwind `desk:` + `isMobile`), desktop je beze změny.
