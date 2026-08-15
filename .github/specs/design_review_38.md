# Design Review 38 — Responzivita a klávesová obsluha mřížky (C9-L/M/Y/A4)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-39 (třísloupcový layout až od 1440 s Info slide-overem 900–1440; Agenda jako výchozí mobilní záložka; dotykové cíle ≥ 24×24; bez horizontálního scrollu při 200 %; šipková obsluha kalendáře — app `@krouzky/web` + úpravy responsivních/a11y testů)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** E2E vrstvy L2/L3 hlásily červené proti cílovému stavu Changes 9: T-201 (tři stálé sloupce už na 1280), T-202 (mobil nezačínal Agendou; přepínač nebyl `role=tab`), T-205 (dotykové cíle < 24×24), T-207 (zoom 200 % → horizontální scroll), T-304 (kalendář nešel ovládat šipkami).

## 0. SOTA analysis
- **0.1 Problem.** (a) Layout používal jediný zlom `desk: 900px` pro všechny tři sloupce → Info byl stálý sloupec i na 1112/1280 (C9-L1 chce tři sloupce až od 1440, jinak slide-over). (b) Přepínač Agenda/Mřížka se renderoval jen při neprázdném rozvrhu a byl to obyčejný `<button>` bez `role=tab`, takže mobil neměl výchozí Agenda-tab (C9-M1). (c) Řada ovládacích prvků byla vysoká 20 px / široká 22 px (`Varianta A`, denní hlavičky, kategorie katalogu, `‹`/`›`) < 24 (C9-M6). (d) Toolbar byl jeden neobtékající řádek → při zoomu 200 % přetekl o 140 px (C9-Y5). (e) Buňky mřížky nebyly fokusovatelné a neměly obsluhu šipek (C9-A4).
- **0.2 Approach.** (a) Přidat JS stav `isWide` (matchMedia `min-width:1440`) a `isMobile` (`max-width:899.98`); Info je stálý sloupec jen na `isWide`, mezi 900–1440 je slide-over (`data-testid="info-drawer"`) otevíraný výběrem nebo tlačítkem „Souhrn" a zavíraný křížkem/Escape. Alternativa (Tailwind `wide:` třídy) zamítnuta — trojmodální chování je čitelnější přes JS stav a vyhne se problému skrytého sloupce v accessibility tree. (b) Přepínač Agenda/Mřížka je teď `role="tablist"` se dvěma `role="tab"` (aria-selected), renderuje se vždy na mobilu, výchozí je Agenda. (c) Globální `button:not(.no-min-target){min-height:24px;min-width:24px}` vynutí dotykové cíle. (d) Toolbar: akční skupina dostala `flex-wrap`, vstup názvu kalendáře zúžen a `min-w-0` → nic nepřeteče při 200 %. (e) Buňky mřížky: roving `tabIndex` (0 pro aktivní, -1 pro ostatní), `aria-label` se dnem, `onKeyDown` na `role=grid` posouvá fokus šipkami ←/→.

## 1. Requirements
- **FR-1** Na 1112 a 1280 px není Info stálý sloupec (`infoPanel` skrytý); tři sloupce až od 1440. Info 900–1440 je slide-over otevíraný výběrem i tlačítkem „Souhrn".
- **FR-2** Pod 900 px je přepínač rozvrhu `role=tablist`/`role=tab`; výchozí vybraná záložka je „Agenda".
- **FR-3** Každý viditelný `button` má bounding box ≥ 24×24.
- **FR-4** Při zoomu 200 % nevzniká vodorovný scroll dokumentu.
- **FR-5** Fokus na buňce mřížky lze šipkou ←/→ přesunout na jinou buňku (buňky mají roving tabindex + `aria-label`).

## 2. Acceptance criteria
- **AC-1** E2E T-201 (desktop-narrow, tablet-landscape) + T-210 (jen ≥1440) zelené.
- **AC-2** T-202 zelené (mobil, mobile-small, tablet-portrait).
- **AC-3** T-205 zelené napříč všemi profily.
- **AC-4** T-207 zelené (mobil, mobile-small).
- **AC-5** T-304 zelené (desktop, desktop-narrow, tablet-*).
- **AC-6** Bez regrese: celá sada `a11y.spec` + `responsive.spec` + `visual.spec` zelená; `apps/web` `tsc --noEmit` čisté; app HTTP 200. Vizuální baseline (`toolbar`, `catalog-filtered`, `empty-info`, `info-dark`) přegenerovány.

## 3. Non-goals / notes
- T-308/T-309/T-402/T-401 dostaly na středních šířkách krok „otevři Souhrn slide-over" (Info tam není stálý sloupec) — úprava testu podle nového designu, ne změkčení.
- T-304 pokrývá šipky ←/→ mezi dny; Enter/šipky nahoru–dolů uvnitř bloků nejsou cílem teď (Escape zavírá už z CHANGE-32).
- Uživatelský přepínač motivu, plné token barvy ploch a Lighthouse CI (T-504) zůstávají v BL-019.
- Prostředí: `@playwright/test` musí odpovídat `^1.62.1` (starší 1.47.x nemapuje `emulateMedia({contrast})`, T-307 by pak spadl falešně).
