# Design Review 46 — Mobilní dotykové cíle ≥ 44 px a funkčnost od 320 px (primární ovládání)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-47 (mobilní primární ovládání na ≥ 44 px: spodní navigace Katalog/Rozvrh/Info, přepínač Agenda/Mřížka a filtr dnů; ověření bez vodorovného scrollu od 320 px — app `@krouzky/web` + nové testy T-213/T-214)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** Navazující dávka po CHANGE-46 (odlehčení lišty). BL-031: dotykové cíle byly na mobilu jen ≥ 24 px (WCAG AA, T-205) a funkčnost nebyla ověřená od 320 px. Klíčová mobilní navigace (spodní taby, Agenda/Mřížka) měla ~24–28 px výšku — pod pohodlný dotykový práh 44 px (WCAG 2.1 AAA 2.5.5 / Apple HIG).

## 0. SOTA analysis
- **0.1 Problem.** Primární mobilní ovládání bylo příliš malé pro spolehlivý dotyk: spodní navigace (`page.tsx`, `py-2 text-xs` ≈ 32 px), přepínač Agenda/Mřížka (`ScheduleGrid`, `px-2 py-1` ≈ 28 px) a filtr dnů v katalogu (`CatalogPanel`, `px-2 py-0.5` ≈ 24 px). Zároveň nebyla ověřená použitelnost od 320 px (nejmenší reálný mobil), jen od 360 px (T-212).
- **0.2 Approach.** Zvětšit tři primární mobilní ovládací prvky na výšku 44 px pomocí třídy z výchozí Tailwind škály `h-11` (= 2.75 rem = 44 px) + `flex items-center justify-center` pro svislé vycentrování. Spodní navigace a přepínač Agenda/Mřížka jsou už jen mobilní (`desk:hidden` / `{isMobile}`), takže desktop je beze změny bez dalších úprav. Filtr dnů katalogu je i na desktopu → 44 px platí jen na mobilu, na desktopu se přes `desk:h-auto desk:px-2 desk:py-0.5` vrací kompaktní vzhled (desktop baseline beze změny). Barevné tečky (24×24, WCAG AA) a checkboxy záměrně nezvětšovány — nejsou primární navigace a splňují AA (viz Non-goals). Arbitrary hodnota `min-h-[44px]` v tomto Tailwind setupu **negenerovala** CSS (v repu se arbitrary hodnoty jinde nepoužívají) → použita bezpečná třída z výchozí škály `h-11`.

## 1. Requirements
- **FR-1** Spodní mobilní navigace (Katalog/Rozvrh/Info) má na kompaktních profilech (<900 px) výšku ≥ 44 px.
- **FR-2** Přepínač Agenda/Mřížka má na mobilu výšku ≥ 44 px.
- **FR-3** Filtr dnů v katalogu má na mobilu výšku ≥ 44 px; na desktopu zůstává kompaktní (beze změny vzhledu).
- **FR-4** Aplikace je použitelná bez vodorovného scrollu od šířky 320 px (úvod i otevřený katalog).

## 2. Acceptance criteria
- **AC-1** (FR-1..3) Nový test **T-213** (`responsive.spec.ts`, kompaktní profily): spodní navigace, taby Agenda/Mřížka i filtr dnů „Po" mají `boundingBox().height ≥ 44`. Zelený na `mobile`, `mobile-small`, `tablet-portrait`.
- **AC-2** (FR-4) Nový test **T-214** (`responsive.spec.ts`): při viewportu 320×720 je `scrollWidth − clientWidth ≤ 1` na úvodu i po otevření katalogu a „Rozbalit vše".
- **AC-3** Desktop beze změny: `visual.spec` T-400..403 zelené na `desktop` bez regenerace baselines.
- **AC-4** Mobilní vizuální baseline (catalog-filtered, empty-info, info-dark na mobile/mobile-small/tablet-portrait) přegenerovány kvůli zamýšlené vyšší navigaci/chipům; `visual.spec` zelený; `apps/web` `tsc --noEmit` čisté; app HTTP 200.

## 3. Non-goals / notes
- **Barevné tečky (24×24) a checkboxy** se nezvětšují — nejde o primární navigaci a splňují WCAG AA (T-205 ≥ 24 px zůstává). Zvětšení jen primárních cílů (nav/přepínače/filtr) je záměrné omezení této dávky.
- **Přesun Otevřít/Uložit/Další/Kalendář do mobilního menu** (další zeštíhlení lišty) zůstává otevřený (BL-031 zbytek) — vyžaduje přepis persistence/ics testů, vyšší riziko.
- Microcopy „N termínů"/„Bez konfliktu" z BL-031 je samostatná položka (netýká se dotykových cílů) — zůstává otevřená.
- Změny jsou čistě responzivní (Tailwind `h-11` + `desk:` reset), desktop je beze změny.
