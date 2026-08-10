# Changelog

Všechny podstatné změny enginu `@krouzky/domain` a aplikace `@krouzky/web`.
Formát vychází z [Keep a Changelog](https://keepachangelog.com/), verzování dle
[SemVer](https://semver.org/). Každý řádek nese `CHANGE-<id>`, který propojuje
spec ↔ kód ↔ tento záznam (viz `.github/instructions/dev-process.instructions.md`).

## [Unreleased]

### Import .ics/.json + plný obsah v exportovaném ICS (CHANGE-8)

Podle „Changes 5“ v `.github/specs/changes.md`. Scope: **engine `@krouzky/domain`**
(parser + bohatší generátor) **i app `@krouzky/web`** — spadá do pending 0.3.0.

- **FR-1** Nový `parseIcs()` — každý `VEVENT` → vlastní událost (název, adresa,
  poznámka, den/čas, `everyWeeks` z `RRULE INTERVAL`, okno z `DTSTART`/`UNTIL`).
- **FR-2** ICS export nově nese **plnou adresu** v `LOCATION` (vč. PSČ), `URL`
  (web) a `DESCRIPTION` se vším (popis, místo, adresa, web, lektor, kontakt,
  telefon, e-mail, cena, věk, kategorie) — aby Apple Kalendář zobrazil vše.
- **FR-3** Tlačítko „Načíst“ přijímá `.json` i `.ics`; `.ics` se naimportuje
  jako editovatelné vlastní události, `.json` nahradí celý stav.
- **FR-4** Store: hromadné `addCustomEntries` (jeden krok zpět).

Spec: `.github/specs/design_review_7.md`. Otevírá **BL-015**.
`vitest` (62; +4) + `tsc --noEmit` (doména i web) čisté; ESLint v tomto prostředí není.

### Aktualizovaná data (v3): atletika, SCNS a fotbal, neznámé ceny (CHANGE-7)

Načtení `packages/domain/data/novestraseciData-2.ts` (37 kroužků: DDM + SCNS
atletika/box/gymnastika + TJ Sokol fotbal). Scope: **engine `@krouzky/domain`**
(kategorie + odolná cena) **i app `@krouzky/web`** — spadá do pending 0.3.0.

- **FR-1** Nová kategorie `athletics` („Atletika“) ve schématu i UI.
- **FR-2** Neznámá cena (`NaN`) se nepočítá do rozpočtu ani do ICS — není to nula.
- **FR-3** Store načítá nová data (venues + `venueId`; u vícemístných skupin primární).
- **FR-4** Katalog i detail ukazují „Cena neuvedena“ u fotbalu (nezveřejněné příspěvky).

Spec: `.github/specs/design_review_6.md`. Otevírá **BL-012**, **BL-013**, **BL-014**.
`vitest` (58) + `tsc --noEmit` (doména i web) čisté; ESLint v tomto prostředí není.

### Více informací v detailu + filtr věku vypnutý defaultně (CHANGE-6)

Podle „Changes 4“ v `.github/specs/changes.md`. Scope: **pouze aplikace `@krouzky/web`**
— pole už existují na doménovém modelu (`description`, `sourceUrl`, `contact`,
`website`), takže **bez změny enginu a bez bumpu**.

- **FR-1** Filtr „Jen vhodné pro věk“ je defaultně **vypnutý** — hned se zobrazí
  všechny kroužky; zaškrtnutím se stále zafímě podle věku dítěte.
- **FR-2/3** Detail kroužku ukazuje **popis** a kartu **„Kontakt a odkazy“**
  (👤 osoba, 📞 telefon `tel:`, ✉️ e-mail `mailto:`, 🌐 „Více informací (web)“
  → `sourceUrl ?? website`, nová záložka); řádek se zobrazí jen když hodnota existuje.
- **FR-4** Adaptér doplní `Activity.sourceUrl` z `NS_ACTIVITY_META.sourceUrl`,
  aby web odkaz mířil na stránku kroužku (ddmrako.cz).

Spec: `.github/specs/design_review_5.md`. Otevírá **BL-011**.
`tsc --noEmit` (web) čistý; doménové testy (58) beze změny zelené.

### Reálný katalog: místo konání, kategorie a data Nové Strašecí (CHANGE-5)

Načtení ověřených dat `packages/domain/data/novestraseciData.ts` (DDM Rakovník,
pracoviště Nové Strašecí, 2026/2027) místo ukázky. Scope: **engine `@krouzky/domain`**
(nová entita + kategorie) **i app `@krouzky/web`** — katalog není součástí
`PlannerState`, takže **bez migrace** (spadne do již otevřeného MINOR 0.2.0 → 0.3.0).

- **FR-1** `activityCategorySchema` rozšířen o `science`, `tech`, `games`,
  `outdoor`, `martial_arts` (původní hodnoty zůstávají).
- **FR-2/3** Nová entita **Venue** (`Catalog.venues`, `SessionGroup.venueId`);
  adresa konání = `locationOverride ?? venue ?? poskytovatel` v mřížce, dojezdu,
  souhrnu i ICS `LOCATION`. Organizátor (Rakovník) ≠ místo (BIOS, ZŠ, Řevničov…).
- **FR-4/5** Adaptér `apps/web/src/lib/novestraseci.ts` postaví doménový `Catalog`
  z dat (venues + `venueId`, `NaN` souřadnice → `undefined`, PSČ), store načítá
  reálný katalog + stav (dítě s reálnou adresou ZŠ, rok 2026/2027, bez výjimek).
- **FR-6** Kategorie ve filtru i detailu; v detailu „Místo konání“ + adresa a mapa
  na souřadnicích místa. Datový soubor zůstává beze změny; export balíčku nově
  mapuje `"./data/*": "./data/*.ts"`.

Spec: `.github/specs/design_review_4.md`. Otevírá **BL-008**, **BL-009**, **BL-010**.
`vitest` (58) + `tsc --noEmit` (doména i web) čisté; ESLint v tomto prostředí není.

### Přepisy kroužků: editace údajů a výběr barvy (CHANGE-4)

Podle „Changes 3“ v `.github/specs/changes.md`. Uživatel může u katalogového
kroužku přepsat zobrazované/exportované údaje a zvolit barvu. Katalog zůstává
neměnný — přepisy žijí v nové vrstvě `overrides` (klíč `activityId`), efektivní
hodnota = `override ?? katalog`. Scope: **engine `@krouzky/domain`** (schéma +
migrace + ICS) **i app `@krouzky/web`** → při vydání **MINOR bump 0.2.0 → 0.3.0**.

- **FR-1** `PlannerState.overrides: ActivityOverride[]`; `schemaVersion` 2→3 s
  migrací (v2 → v3 doplní `overrides: []`, řetězeně i v1 → v2 → v3).
- **FR-2** `generateIcs` aplikuje přepis na zápisy z katalogu: název → `SUMMARY`,
  adresa → `LOCATION`, telefon/cena → `DESCRIPTION`, barva → `COLOR`
  (jen v režimu `per_activity`; v `single` vítězí barva dítěte).
- **FR-3** Pravý sloupec umožní editovat název, adresu (samostatná pole
  **Ulice / Město / PSČ**), telefon a cenu; zápis jde do `overrides` (do historie)
  + „Obnovit z katalogu“. Po úpravě adresy se poloha znovu dohledá (keyless OSM
  Nominatim) a náhled mapy se aktualizuje; při offline/bez výsledku zůstane bez map.
- **FR-4** Paleta 12 barev u kroužku; volba se projeví v mřížce i v exportu.
- **FR-5** Rychlý přepínač barvy v liště vedle pole „Kalendář“ pro vybraný kroužek
  (bez výběru je neaktivní).
- **FR-6** Přepisy přežijí round-trip `serialize` → `parse` beze změny.

Spec: `.github/specs/design_review_3.md`. Otevírá **BL-006**, **BL-007**.
`vitest` (58 zelených; +5 pro CHANGE-4) + `tsc --noEmit` (doména i web) čisté.
ESLint v tomto prostředí není nainstalován — bránu lintu nebylo možné spustit.

### Úklid lišty: odstranění popisku „Okres DEMO“

Z hlavičky zmizel neúčelný text „Okres DEMO“ (ukázkový `districtCode`). Triviální
**app-only** úprava navazující na CHANGE-2 FR-4 (volné pole názvu kalendáře) —
bez samostatného specu a bez bumpu verze. `tsc --noEmit` (web) čistý.

### Navigace kalendáře: šipky pro všechny pohledy (CHANGE-3)

Doplnění FR-6 (CHANGE-1): Týden a Měsíc neměly šipky pro předchozí/další.
Mřížka nově pracuje s **kotevním datem** — jedny šipky ‹ › + tlačítko „Dnes"
fungují ve všech pohledech (Den/3 dny/Týden/Měsíc), popisek ukazuje konkrétní
rozsah (`10. 8. – 16. 8. 2026`, `září 2026`, …), hlavičky sloupců mají datum,
svátky se ztlumí a „now" čára je jen na dnešním sloupci. Scope: **app-only**,
bez bumpu verze. Triviální oprava app-only defektu → bez samostatného specu.
`tsc --noEmit` (web) čistý.

### Vylepšení kalendáře: now-line, multi-varianta, detail vlastní události, mapa (CHANGE-2)

Navazuje na CHANGE-1 podle „Changes 2" v `.github/specs/changes.md`. Scope: **pouze
aplikace `@krouzky/web`** — engine `@krouzky/domain` beze změny, proto **bez bumpu verze**.

- **FR-1** Mřížka se po načtení vycentruje na aktuální čas.
- **FR-2** Vodorovná „now" čára označuje přesný aktuální čas (čas se čte v aplikaci).
- **FR-3** Dítě lze zapsat do více variant docházky téže aktivity (varianty jsou přepínače).
- **FR-4** Pole názvu kalendáře je prázdné (jen placeholder se jménem dítěte).
- **FR-5** Jedno pole „Ulice, město", které se rozdělí na čárce.
- **FR-6** Vlastní událost má i cenu a lektora; zobrazují se v detailu.
- **FR-7** Klik na vlastní událost otevře její detail v pravém sloupci.
- **FR-8** Náhled mapy (OpenStreetMap, keyless) pod adresou + odkaz do Mapy.cz.

Spec: `.github/specs/design_review_2.md`. **Closes BL-002**; otevírá **BL-004**, **BL-005**.
`tsc --noEmit` (web) čistý; `vitest` (doména, 53) beze změny zelený.

## [0.2.0] - 2026-08-10

### iOS-like kalendář & pružné opakování/export (CHANGE-1)

Kalendář zpřístupněn běžnému uživateli podle `.github/specs/changes.md`.
Rozsah: **engine** `@krouzky/domain` (FR-1–FR-5) + **app** `@krouzky/web` (FR-6–FR-9).

- **FR-1** Obecný interval opakování `everyWeeks` nahradil `biweekly.parity`;
  ICS emituje `RRULE:FREQ=WEEKLY;INTERVAL=N`. `schemaVersion` 1→2 s migrací
  starých souborů (`parity` → `everyWeeks: 2`).
- **FR-2** `validFrom`/`validTo` řídí začátek/konec opakování (`DTSTART`/`UNTIL`).
- **FR-3** Volitelný název kalendáře (`X-WR-CALNAME` + název souboru).
- **FR-4** Režim barev exportu `single`/`per_activity` (`COLOR` per událost,
  `X-APPLE-CALENDAR-COLOR` na úrovni kalendáře).
- **FR-5** Nastavitelná připomínka → `VALARM;TRIGGER`.
- **FR-6** Pohledy Den / 3 dny / Týden / Měsíc s navigací.
- **FR-7** Rolovatelná celodenní osa 00:00–24:00, výchozí odpoledne.
- **FR-8** Odkaz na mapu v panelu detailů (bez vkládání cizích dlaždic).
- **FR-9** Překrývající se události se zobrazují vedle sebe, neblokují.

Spec: `.github/specs/design_review_1.md`. Otevírá **BL-001**, **BL-002**, **BL-003**.
`vitest` (53 zelených) + `tsc --noEmit` (doména i web) zelené.
