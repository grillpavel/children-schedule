# Design Review 90 — Popup umístění, aktuální čas na mobilu a rozdělení sloupce pro sourozence

**Status:** IMPLEMENTED
**Change ID:** CHANGE-97 (app `@krouzky/web`, engine beze změny)
**Date:** 2026-10-06
**Repo:** monorepo `Children_schedule` (`apps/web`, `test/`)
**Trigger:** uživatel po CHANGE-96 nahlásil, že stejný popup-position problém stále přetrvává, a
přidal 3 nové konkrétní nálezy z reálného používání na mobilu/tabletu:
1. Správná lokalizace „vyskakujícího okna" je jen pro Vlastní událost, ostatní se zobrazují níž.
2. Zobrazení aktuálního času (červená čára/zvýrazněná hodina) nefunguje korektně.
3. Na mobilu se aktuální čas ukáže jen v Týdnu, ne v pohledu 3 dny/Den; u tabletu ne vždy.
4. Sheet „Kalendář" → „Zobrazit i sourozence" → kroužky ve stejný čas se stále překrývají; se 2
   sourozenci by měl sloupec dne půlit na dvě poloviny, se 3 na třetiny.

## 0. SOTA analýza

### 0.1 Problém

**Nález 1 (popup lokalizace) — DRUHÁ, samostatná příčina od CHANGE-96.** CHANGE-96 opravil
přetrvávající `scrollTop` mezi přepnutím výběru (skutečná chyba, správně opravená), ale existovala
ještě zcela nezávislá strukturální chyba: `SelectedActivity` má nad `<h2>` tlačítko „← Zpět na
souhrn", zatímco `CustomEntryDetail` toto tlačítko nemělo — hlavička vlastní události proto
renderovala o ~34px výš než hlavička kroužku (změřeno: `SelectedActivity` h2 na y=647,
`CustomEntryDetail` h2 na y=613, oba při `scrollTop=0`). Uživatel viděl "jiné místo" nezávisle na
tom, že scroll byl už resetován správně.

**Nálezy 2+3 (aktuální čas) — jedna společná příčina.** Mobilní mount efekt (BL-055, CHANGE-94)
po přepnutí na mobil násilně kotvil `anchorDate` na pondělí aktuálního týdne
(`setAnchorDate(startOfIsoWeek(prev))`), aby nově přidaná vlastní událost s výchozím pondělím byla
vidět bez nutnosti navigace. Vedlejší efekt: `dates` pro `'day'`/`'3day'` pak vycházely z pondělí,
ne z dneška — `todayInView` (na němž visí červená čára i tučná hodina v ose) byl `false` každý den
mimo pondělí–středu. Uživatel to logicky vnímal jako "nefunguje to correctly" — na Týden to fungovalo,
protože týdenní pohled vždy zahrnuje celý týden včetně dneška.

**Nález 4 (sourozenci) — potvrzený, dosud neřešený.** `dayFamilyBlocks` (přehled kroužků
sourozenců) se vykresloval s pevným `left:2%, width:96%` — přes celou šířku dne, tedy přesně přes
vlastní bloky aktivního dítěte ve stejném čase. Nikdy neexistovalo žádné dělení sloupce.

### 0.2 Přístup

1. **Popup lokalizace**: `CustomEntryDetail` dostane STEJNOU strukturu hlavičky jako
   `SelectedActivity` — sticky wrapper s „← Zpět na souhrn" tlačítkem (`selectCustomEntry(null)`)
   nad `<h2>`. Zamítnutá alternativa: odebrat zpět-tlačítko ze `SelectedActivity` místo přidání do
   `CustomEntryDetail` — zamítnuto, tlačítko je uživatelsky žádoucí a už otestované (T-140 aj.).
2. **Aktuální čas**: mobilní mount efekt přestává volat `startOfIsoWeek` — `anchorDate` zůstává na
   své počáteční hodnotě `new Date()` (dnešek) i po přepnutí do `'3day'`. Zamítnutá alternativa:
   měnit výchozí den ve `CustomEntryDialog` z pondělí na dnešek — zamítnuto, rozbilo by to
   existující testy (`T-232` explicitně testuje přesun „z pondělí (default) na úterý") a je to
   samostatná, mnohem méně závažná okrajová chyba (nově přidaná pondělní událost může být krátce
   mimo výchozí 3denní okno) oproti tomu, že červená čára chybí prakticky každý den v týdnu.
3. **Scroll na 12:00 při přepnutí Agenda→Mřížka** (vedlejší nález při ověřování bodu 2): scroll
   efekt měl závislosti `[mode, hasBlocks]`, ale mobilní mřížka se PODMÍNĚNĚ MOUNTUJE (JSX ternary
   dle `mobileAgendaMode`) — přepnutí Agenda→Mřížka vytváří čerstvý DOM se `scrollTop=0`, který
   efekt nikdy neresetoval, protože ani jedna z jeho závislostí se nezměnila. Přidána
   `mobileAgendaMode` do pole závislostí.
4. **Sourozenci — rozdělení sloupce**: nová čistá funkce `familySlicePct(childId)` počítá
   `{left, width}` procentuální výřez dne pro N aktivních dětí (aktivní dítě + všichni
   zobrazovaní sourozenci dohromady tvoří `familyChildOrder`, `familySliceCount = N`). Aplikováno
   na (a) vlastní bloky aktivního dítěte, (b) preview při přetahování, (c) `dayFamilyBlocks`
   sourozenců — každé dítě dostane přesně `100/N` % šířky dne, žádný překryv. Přidána tenká
   přerušovaná dělicí čára mezi slice. Zamítnutá alternativa: barevné odlišení bez fyzického
   dělení prostoru — zamítnuto, uživatel explicitně žádal "rozpůlit sloupec"/"na 1/3", ne jen
   barvu.

## 1. Requirements

- **FR-1**: Hlavička `CustomEntryDetail` (vlastní událost) se renderuje na STEJNÉ Y-pozici jako
  hlavička `SelectedActivity` (kroužek) při stejném `scrollTop`.
- **FR-2**: Červená "teď" čára a tučně zvýrazněná aktuální hodina v ose se zobrazují v pohledech
  `'day'`/`'3day'`/`'week'` KDYKOLI je dnešek uvnitř zobrazeného rozsahu dat, nezávisle na dni v
  týdnu.
- **FR-3**: Přepnutí mobilní Agendy do Mřížky vždy scrolluje na cca 12:00 (stejně jako přímý vstup
  do Mřížky), i když k tomu dojde na stejném renderu jako změna `mode`.
- **FR-4**: Se zapnutým „Zobrazit i sourozence" a N aktivními dětmi (aktivní + zobrazovaní
  sourozenci) se sloupec každého dne rozdělí na N stejných vertikálních částí; bloky aktivního
  dítěte i každého sourozence se vykreslují výhradně ve své části, bez vzájemného překryvu.

## 2. Acceptance criteria

- **AC-1** (FR-1): diagnostický skript (headless Chromium, 390×844) porovná `boundingBox()` `<h2>`
  uvnitř sheetu pro nově vybraný kroužek vs. nově přidanou vlastní událost — obě `y=647`. Ověřeno.
- **AC-2** (FR-2): headless test s zmrazeným časem (úterý 2026-10-06) potvrzuje
  `data-testid="now-line"` count=1 ve výchozím mobilním `'3day'` pohledu (dřív by úterý bylo mimo
  pondělí-kotvené okno [Po,Út,St] jen náhodou — po opravě `anchorDate` zůstává na dnešku, takže
  [Út,St,Čt] vždy obsahuje dnešek). Ověřeno.
- **AC-3** (FR-3): headless test — enroll → Rozvrh (Agenda) → přepnutí do Mřížky → screenshot
  potvrzuje viditelný rozsah 11:00–23:00 (12:00 v horní části), stejně jako přímý vstup do Mřížky.
  Ověřeno.
- **AC-4** (FR-4): DOM-měření v pondělním sloupci s aktivním dítětem (vlastní blok) + 1
  sourozencem (`family-block`) potvrzuje `left:0/width:52.5` vs. `left:54.6/width:48.3` (ze 106px
  celkem) — žádný překryv. Ověřeno.
- **AC-5** (regrese): plná 6profilová E2E sada (972 testů) = 740 passed / 232 skipped / 0 failed;
  `tsc --noEmit` čisté (domain+web); domain vitest 135/135.

## 3. Non-goals / notes

- Tablet portrait/landscape "chybějící sheety Domů/Děti" (nález uživatele, položka 3 z jeho
  seznamu) — NEBYLO reprodukováno při standardních testovacích rozměrech (834×1112 / 1112×834,
  headless screenshot potvrzuje obě tlačítka viditelná). Beze změny kódu tento kolo; pokud se
  potvrdí na reálném zařízení s jinými rozměry, potřeba dalšího ladění (kandidát na nový `BL-060`,
  zatím nezaložen — čeká na reprodukci).
- "Mobil vertikálně nefunguje" (položka 4 uživatelova seznamu) — příliš obecné bez konkrétního
  symptomu; pravděpodobně pokryto opravami FR-2/FR-3 výše (chybějící now-line a scroll byly
  hlavní pozorovatelné vady v defaultním mobilním pohledu). Nebyl nalezen žádný DALŠÍ konkrétní
  defekt při širším kouřovém testu (enroll, Agenda↔Mřížka, přidání vlastní události, kolize).
- Vedlejší dopad opravy FR-2 na testy: pomocné funkce `addCustom`/`addCustomWithAddress`
  (`schedule.spec.ts`) a `addCustomEntry` (`mobile-audit-v2.spec.ts`), které přidávaly vlastní
  událost BEZ explicitní volby dne (spoléhaly na výchozí pondělí dialogu), nyní na kompaktních
  profilech (`isCompact(width)`) explicitně volí úterý (`selectOption('2')`, odpovídá
  "dnešku" ve zmrazeném testovacím čase) — jinak by pondělní výchozí den spadl mimo nově
  dnes-kotvené výchozí 3denní okno mobilu. Netýká se testů běžících jen na širokých profilech
  (`isCompact` guard je `false` tam, žádná změna chování).
