# Design Review 71 — Soukromí a data (menu „Další ▾") + oprava rozházené mobilní lišty

**Status:** IMPLEMENTED
**Change ID:** CHANGE-76 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-19
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web`
**Trigger:** Uživatel zadal 2 body v jednom promptu:
1. Vysvětlit, proč se adresa při uložení automaticky (ne jen na klik) posílá na Nominatim.
2. Přidat do menu „Další ▾" položku „Soukromí“/„Privacy“ a dořešit cookies/soukromí/impressum na SOTA
   úrovni; a otestovat mobil/tablet — uživatel nahlásil, že položky v horní liště na mobilu jsou
   „rozházené a ne seřazené“.

## 0. SOTA analýza

### 0.1 Problém

- **Geokódování**: `CustomEntryDialog.save()` a `DetailsPanel`'s `ActivityEditor.commitAddress()` volají
  `geocodeAddress()` (HTTP request na `nominatim.openstreetmap.org/search` s textem adresy) jako VEDLEJŠÍ
  EFEKT samotného uložení — ne po kliknutí na explicitní akci typu „najít na mapě“. `offlineGeocode()`
  proběhne první, synchronně a bez sítě (jen tabulka známých měst), ale `geocodeAddress()` se spustí
  VŽDY (`void geocodeAddress(location).then(...)`), bez ohledu na to, jestli offline odhad už něco našel.
  README (řádek 176, historicky) tvrdil, že v UI je na to upozornění — v aktuálním kódu žádné nebylo
  (patrně pozůstatek dřívější verze s mapovým náhledem, kterou CHANGE-43 odstranilo).
- **Cookies**: aplikace žádné nepoužívá (jen `localStorage` pro autosave) — potvrzeno grepem
  `document.cookie`/cookie knihoven v `apps/web/src` (0 výskytů).
- **Mobilní lišta „rozházená“**: ověřeno reálnými screenshoty (skutečný headless Chromium na 360/390px,
  ne jen `setViewportSize` na sdílené stránce nástroje prohlížeče — to viewport nezměnilo, `window.
  innerWidth` zůstalo 1329, proto první pokus o reprodukci vypadal zavádějícě). Kořen: pravá akční
  skupina (`Undo/Redo`, `Otevřít`, `Uložit`, `Další ▾`) měla `ml-auto` BEZ `desk:` prefixu — na desktopu
  to správně natlačí skupinu k pravému okraji řádku (mezi ní a stavovým indikátorem „Uloženo“ je spousta
  dalších desktop-only prvků, takže mezera vypadá přirozeně). Na mobilu (<900px), kde je z prostředních
  prvků skryté téměř vše (Věk/Přesun/Barva/Kalendář-title), zůstaly na řádku jen 2 skupiny — `ml-auto`
  je od sebe roztrhlo obří prázdnou mezerou → přesně to uživatel popsal jako „rozházené“.

### 0.2 Přístup

- **Vysvětlení geokódování** = dokumentační (žádná kódová změna nutná) + přidání jednořádkové poznámky
  přímo k oběma polím adresy („Adresa se pro odkaz na mapu odešle na OpenStreetMap (Nominatim).“) — malé,
  transparentní, ne rušivé (`text-[11px] text-slate-400`, stejný vzor jako ostatní hint texty v appce).
- **„Soukromí a data“ = dialog, ne samostatná stránka.** Appka nemá router/vícestránkovou navigaci
  (jediná route `/`), takže samostatná `/privacy` stránka by byla architektonicky cizí. Modal
  (`PrivacyDialog.tsx`, stejný `.fixed.inset-0.z-50` vzor jako `CustomEntryDialog`) dostupný z JEDNÉ
  položky menu „Další ▾“ (sdílené `exportItems`, funguje identicky na desktopu i mobilu) je konzistentní
  s existujícími vzory a nevyžaduje žádnou routing infrastrukturu.
- **Obsah dialogu**: cookies (žádné), kde žijí data (jen prohlížeč, autosave), jediná výjimka
  (geokódování s odkazem na zásady OSM), export (lokální generování, nic se neodesílá), upozornění
  na demo charakter (katalog je ukázková sada z volně dostupných serverů, informace nemusí být
  aktuální), a kontakt (GitHub repozitář — osobní/nekomerční projekt bez formálního impressa; žádná
  fiktivní firma/adresa nebyla vymýšlena).
- **Oprava lišty**: `ml-auto flex flex-wrap items-center justify-end` → `flex flex-wrap items-center
  desk:ml-auto desk:justify-end` na obalu akční skupiny. Na mobilu tak skupina „Uloženo“ + akce plynule
  navazují za sebou (žádná umělá mezera), na desktopu je chování identické jako předtím (`desk:` prefix
  aplikuje pravidlo až od 900px, kde už předtím platilo neustále).
- **Reálné ověření na přesných šířkách**: `setViewportSize()` na existující, dlouhodobě sdílené stránce
  prohlížecího nástroje NEFUNGOVALO (viewport zůstal na své předchozí hodnotě z dřívějšího session).
  Pro spolehlivé mobil/tablet screenshoty použit samostatný headless Chromium přes nainstalovaný
  Playwright (`chromium.launch()` + `newPage({viewport})`) — stejná technika jako u PDF exportu návodu.

## 1. Requirements

- **FR-1**: Textová poznámka u pole adresy v `CustomEntryDialog` a `DetailsPanel`'s `ActivityEditor`
  vysvětluje odeslání adresy na Nominatim/OpenStreetMap.
- **FR-2**: Menu „Další ▾“ (desktop i mobil, sdílené `exportItems`) obsahuje položku „Soukromí a data“,
  která otevře modal s: cookies, umístěním dat, výjimkou geokódování (s odkazem na zásady OSM), popisem
  exportu, kontaktem.
- **FR-3**: Horní lišta na šířkách <900px nemá mezi viditelnými skupinami prvků žádnou nezáměrnou velkou
  prázdnou mezeru — akční skupina (Undo/Redo/Otevřít/Uložit/Další) navazuje plynule za stavovým
  indikátorem uložení.

## 2. Acceptance criteria

- **AC-1** (FR-1): T-182 (`schedule.spec.ts`) — otevření „Vlastní událost“ ukáže text
  „OpenStreetMap (Nominatim)“ u pole adresy.
- **AC-2** (FR-2): T-181 (`persistence.spec.ts`) — klik na „Další ▾“ → „Soukromí a data“ otevře dialog
  (`role=dialog`, název „Soukromí a data“) obsahující texty o cookies, `localStorage` a Nominatim;
  zavírací tlačítko dialog skryje.
- **AC-3** (FR-3): Ověřeno vizuálně (reálné headless screenshoty 360/390/834/1112px) — žádná neúměrná
  mezera mezi „Uloženo“ pilulkou a akční skupinou; vizuální baseline `toolbar-*` přegenerovány pro
  ovlivněné profily.

## 3. Non-goals / notes

- Nepřidáváme cookie lištu/banner — aplikace cookies nepoužívá, lišta by byla zavádějící šum (viz §0.1).
- Impressum je „light“ (odkaz na GitHub repozitář) — appka nemá formální provozovatele/firmu k uvedení;
  pokud se to změní (vlastní doména, komerční provoz), je potřeba doplnit konkrétní kontaktní údaje.
- Nepřidáváme žádné nové domain/schema pole — čistě UI vrstva.
