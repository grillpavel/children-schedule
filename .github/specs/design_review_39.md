# Design Review 39 — X-APPLE strukturovaná lokace a správa více dětí (C6-A4, C6-C2)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-40 (ICS `X-APPLE-STRUCTURED-LOCATION` se souřadnicemi + offline fallback geokódu; správa více dětí s exportem na dítě — engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (packages/domain + apps/web + test)
**Trigger:** E2E L6 hlásilo červené: T-603 (chybí `X-APPLE-STRUCTURED-LOCATION`, takže Apple Kalendář neumí navigaci na místo) a T-609 (aplikace byla jednodětná, bez správy více dětí a samostatného exportu na dítě). T-140 zůstává datová mezera (BL-017).

## 0. SOTA analysis
- **0.1 Problem.** (a) ICS export nesl jen `LOCATION` (text). Apple Kalendář pro navigaci potřebuje `X-APPLE-STRUCTURED-LOCATION` s `geo:lat,lon`. Adresy custom událostí jsou ale bez sítě (v testu) nezgeokódované → chybí souřadnice. (b) Store měl jediné dítě `child-1`, žádné `addChild`, UI bez přepínače → export nešel dělat na dítě.
- **0.2 Approach.** (a) Doména emituje `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="…";X-APPLE-RADIUS=72;X-TITLE="…":geo:lat,lon`, kdykoli má adresa `lat`/`lon` (helper `geoOf`). Adresy katalogu (venues/providers) souřadnice mají; pro custom události doplní `CustomEntryDialog.save` **offline střed města** (`offlineGeocode`, tabulka Nové Strašecí/Rakovník/Kladno) synchronně hned při uložení, online Nominatim je pak zpřesní. Alternativa (jen online geokód) zamítnuta — nedeterministické a offline nefunkční. (b) Store dostal `addChild()` (commit → undo, nastaví nové dítě aktivním); Toolbar má přepínač dětí (`<select>` při >1 dítěti) + tlačítko „+ Přidat dítě". Export běží nad aktivním dítětem (X-WR-CALNAME = jméno/název) → samostatný soubor na dítě.
- **0.3 Non-fix.** T-140 (uzávěrka) je čistě **datová** položka; UI/doména hotové (CHANGE-23/24). Ověřený `applicationDeadline` chybí a ústava (design_review_23 §3) zakazuje odhad → T-140 zůstává `test.fixme` s odkazem na BL-017.

## 1. Requirements
- **FR-1 [engine]** `generateIcs` MUST emitovat `X-APPLE-STRUCTURED-LOCATION` s `geo:lat,lon`, právě když má adresa události konečné `lat` a `lon`; jinak vlastnost vynechá. Čisté a deterministické.
- **FR-2 [app]** Uložení vlastní události s adresou v známém městě MUST hned doplnit offline souřadnice (střed města), aby export fungoval i bez sítě.
- **FR-3 [app]** Store MUST umět `addChild()` (nové dítě, aktivní); Toolbar MUST nabídnout přepínač dětí a akci „Přidat dítě". Export běží nad aktivním dítětem.

## 2. Acceptance criteria
- **AC-1 → FR-1** Doménový test `ics.test.ts` „emituje X-APPLE-STRUCTURED-LOCATION se souřadnicemi"; E2E T-603 zelené (desktop+mobil).
- **AC-2 → FR-2** T-603 prochází bez sítě (offline střed Nového Strašecí).
- **AC-3 → FR-3** E2E T-609 zelené; T-205/T-207 dál zelené (Toolbar prvky se vejdou); funkční+ics+panel bez regrese; `tsc --noEmit` (domain+web) čisté; doména `vitest` 84 zelených; app HTTP 200.

## 3. Non-goals / notes
- Souběžný export VÍCE dětí do více souborů jedním kliknutím — teď jeden soubor na aktivní dítě (přepnout + exportovat). Rozšíření sledováno v BL-020.
- Reálné uzávěrky `applicationDeadline` (T-140) — **BL-017**, čeká na ověřená data; nesmí se odhadovat.
- Offline geokód je jen střed města (přibližný); online Nominatim ho po uložení zpřesní.
