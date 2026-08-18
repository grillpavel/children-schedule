# Design Review 53 — GUI redesign: ikony, sbalitelná doporučení, a11y/perf opravy po redesignu

**Status:** IMPLEMENTED (retroaktivní spec — kód shipnut jako commit `4b28b7b` 2026-08-17 bez spec/CHANGE-id;
tento dokument doplňuje proces zpětně, jak vyžaduje `.github/instructions/dev-process.instructions.md`)
**Change ID:** CHANGE-54 (app `@krouzky/web` + testy: GUI redesign z branche `moje-uprava` přenesený na
`main` — nové SVG ikony, přepracované komponenty, sbalitelná sekce doporučení, a11y/perf opravy)
**Date:** 2026-08-17
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** uživatel na jiném počítači vytvořil GUI redesign na orphan branchi `moje-uprava` (bez společného
předka s `main`) a požádal o jeho promítnutí do `main`. Branch zároveň mazala `.github/docs` a
`design_review_*.md` — proto nebyl mergnut přímo, ale přenesen soubor po souboru (viz §3).

## 0. SOTA analysis

- **0.1 Problem.** Aplikace používala ASCII/textové značky místo ikon (↶ ↷ ▾ 📍 ×), katalogová sekce
  „Doporučení na míru" byla vždy plně rozbalená a zabírala značnou část katalogu ještě před tím, než uživatel
  cokoli hledal, a řada vizuálních detailů (barvy, stíny, skleněné povrchy) neodpovídala aktuálním a11y/perf
  pravidlům aplikace po předchozích design-system změnách (Changes 9).
- **0.2 Approach.** Převzít redesign z `moje-uprava` (nová `Icons.tsx` sada SVG ikon, přepis
  Toolbar/VariantTabs/CatalogPanel/ScheduleGrid/DetailsPanel/HomeScreen/CustomEntryDialog/MonthView/
  ColorSwatches/`page.tsx`), ale **jen aplikační a testovací soubory** — `.github/docs`/`design_review_*.md`/
  `dev-process.instructions.md` na `main` zůstávají nedotčené (branch je mazala, což nebylo cílem redesignu).
  Během E2E triáže dodatečně opraveno: text kontrast (`text-slate-400` → tmavší), dark mode (nové
  poloprůhledné třídy typu `bg-slate-50/70` nebyly v dark `@media` bloku namapované — CHANGE-38 mapoval jen
  plné třídy), focus-ring offset na barevných puntících (`!important`, jinak přebíjela kaskáda), sklo uvnitř
  scrollovaných hlaviček (rozbíjelo pravidlo „žádné sklo ve scrollu"), gradientové pozadí (`bg-gradient-to-b`)
  na kartě doporučení (axe nedokázal spočítat kontrast — `bgGradient` incomplete), šířka sloupce mřížky na
  1440 px.
- **0.3 Produktová zpětná vazba (tento dokument, po prvním nasazení).** Sekce „Doporučení na míru" byla
  vždy vidět a s limitem 4 položek zabírala moc místa; hlavní tok aplikace je *procházet katalog → sestavit
  rozvrh → exportovat*, ne doporučení. Řešení: sekce je defaultně **sbalená** (přepínač, `aria-expanded`) a
  po rozbalení ukazuje jen **3** doporučení (bylo 4).
- **Alternativy zamítnuty.** Plný `git merge` orphan branche do `main` — smazal by veškerou dokumentaci a
  specs (viz Trigger). Ponechání doporučení stále rozbalených — v rozporu s produktovou zpětnou vazbou.

## 1. Requirements

- **FR-1** Textové/ASCII značky napříč UI (↶ ↷ ▾ 📍 ×) jsou nahrazené škálovatelnými SVG ikonami (`Icons.tsx`).
- **FR-2** Katalogová sekce „Doporučení na míru" je defaultně sbalená (přepínač s `aria-expanded`) a po
  rozbalení ukazuje nejvýše 3 doporučení.
- **FR-3** Po redesignu zůstává beze změny: kontrastní poměr textu (WCAG AA), viditelný focus ring s
  nenulovým offsetem, dark mode (`prefers-color-scheme: dark`) a pravidlo „žádné sklo (`backdrop-filter`) ve
  scrollovaném kontejneru / vnořené sklo".
- **FR-4** Šířka sloupce dne v týdenní mřížce je při `≥1440px` alespoň 105 px.

## 2. Acceptance criteria

- **AC-1** (FR-1) Vizuální ověření + žádný regresní E2E nález vázaný na textové značky (visual baseline
  regenerovány pro nové UI, 6 profilů).
- **AC-2** (FR-2) **T-122–T-126** (`catalog.spec.ts`, upraveny): rozbalí sekci tlačítkem „Doporučení na míru"
  před interakcí; doporučení jsou nejvýše 3.
- **AC-3** (FR-3) **T-300/T-301/T-303/T-310** (`a11y.spec.ts`) a **T-502/T-503** (`perf.spec.ts`) zelené na
  všech 6 profilech.
- **AC-4** (FR-4) **T-200** (`responsive.spec.ts`) zelený na `desktop`/`desktop-narrow`.
- **AC-5** Plná E2E `--workers=1` zelená na všech 6 profilech (508 passed / 0 failed / 104 skipped, ověřeno
  2× nezávislým čistým během); `tsc --noEmit` (apps/web) čisté; visual baseline přegenerovány.

## 3. Non-goals / notes

- `.github/docs`, `design_review_*.md`, `dev-process.instructions.md` — beze změny; branch `moje-uprava` je
  mazala, ale to nebylo cílem tohoto redesignu, proto se nepřenášely.
- `package.json`/`pnpm-lock.yaml` změny z `moje-uprava` (přidání `@axe-core/playwright`/`@playwright/test` do
  `devDependencies`) se nepřenášely — mimo scope GUI redesignu, riziko nekonzistence lockfilu bez skutečné
  reinstalace.
- Token v `push-to-github.sh` byl při přenosu jednou vypsán v konverzaci — doporučeno zneplatnit/rotovat
  (mimo scope tohoto commitu, akce pro uživatele).
- Branch `moje-uprava` zůstala na remote nedotčená (smazat/ponechat = rozhodnutí uživatele).
