# Design Review 87 — 5 nahlášených chyb + BL-055/056 (BL-057 pozastaveno)

**Status:** IMPLEMENTED (BL-057 vědomě NEIMPLEMENTOVÁNO — konflikt s CHANGE-75, viz §5)
**Change ID:** CHANGE-94 (`@krouzky/domain` 0.7.0→0.8.0, `schemaVersion` 8→9; `@krouzky/web`)
**Date:** 2026-08-30
**Trigger:** Uživatel nahlásil 5 konkrétních chyb a požádal o dokončení `BL-055`/`BL-056`/`BL-057`
(design_review_86.md).

## 1. Tisk rozvrhu → PDF je bílá stránka; ukládá jen 00:00–14:00

### 0. SOTA analýza
Kořen appky (`h-dvh flex flex-col`), `<main>` (`flex-1 overflow-hidden`) a sekce s mřížkou
(`hidden`/`block` podle mobilní záložky) jsou stavěné čistě pro OBRAZOVKU. Na tiskové stránce:
- `dvh` (dynamic viewport height) nemá na papíře smysl — může se vyhodnotit jako 0 → celý strom
  se zhroutí na nulovou výšku → bílá stránka.
- Pokud uživatel tiskl, zatímco mobilní záložka NEBYLA „Rozvrh", byla sekce s mřížkou doslova
  `hidden` (Tailwind `display:none`) → nic k vytištění.
- Vnitřní scroll kontejner mřížky (`overflow-y-auto overflow-x-auto`) byl v tiskovém CSS
  přehlížen — `.print-grid` (vnější `ref={gridRef}` div) dostal `height:auto`, ale jeho PŘÍMÉ
  dítě (skutečný scroll kontejner s časovou osou a dny) ne. Zůstal proto „zamrzlý" na tom, kam
  byl zrovna odrolovaný (typicky kolem aktuálního/oknového času) → vytiskl se jen výřez.

### Oprava
`globals.css`: nové třídy `.print-shell`/`.print-section` (`display/height/overflow: auto/visible
!important` v `@media print`) na kořenu, `<main>` a sekci s mřížkou (`page.tsx`). `.print-grid, .print-grid > div { overflow: visible !important; height: auto !important; }` — teď se vytiskne CELÝ
den, ne jen odrolovaný výřez. `[data-testid='now-line'] { display: none !important; }` — „teď" čára
je stav obrazovky v okamžiku tisku, ne součást rozvrhu k uložení.

## 2. Přidat uložit/vytisknout agendu (souhrn kroužků)

Souhrnná tabulka „Přehled kroužků" (`.print-summary`) v `ScheduleGrid.tsx` už existovala, ale jen
jako vedlejší produkt tisku CELÉHO rozvrhu (grid + tabulka pod ním). Nová `printAgenda()`
(`exportClient.ts`) nastaví `document.body.dataset.printMode = 'agenda'` před `window.print()` a
po `afterprint` ho uklidí; CSS `[data-print-mode='agenda'] .print-grid { display: none !important; }`
skryje mřížku a ukáže jen agendu. Nová položka menu „Tisk agendy (souhrn kroužků)" v `Toolbar.tsx`
vedle „Tisk rozvrhu" — prohlížečův dialog tisku nabízí „Uložit jako PDF" stejně jako u „Tisk
rozvrhu", žádná zvláštní PDF cesta není potřeba.

## 3. Výběr jen JEDNOHO termínu ze skupiny s více schůzkami týdně (basketbal přípravka)

### 0. SOTA analýza
„Vyberte termín" (`DetailsPanel.tsx`) se zobrazí jen `groups.length > 1` — funguje SPRÁVNĚ pro
aktivity s VÍCE alternativními skupinami (design_review_65.md #2, ověřeno). Basketbal — přípravka
(`ddm-basketbal-pripravka`) má ale jen JEDNU skupinu se DVĚMA schůzkami týdně (Po+St) —
`g('ddm-basketbal-pripravka', [s(1,...), s(3,...)])` v `novestraseciData-2.ts` — stejný vzor jako
„bezpečný případ" Florbal I z CHANGE-56. Zápis do TÉTO skupiny proto vždy zahrne OBĚ schůzky —
žádná chyba v enrollovací logice, mezera je v tom, že skupina s >1 schůzkou nemá způsob, jak si
vybrat jen podmnožinu.

**Vědomě NEUPRAVENA reálná katalogová data** (nerozdělena na dvě alternativní skupiny) — zda dítě
smí docházet jen v pondělí NEBO jen ve středu, je fakt o reálném klubu, který nelze uhodnout
(stejná disciplína jako BL-009/T-140 dřív v projektu). Místo toho obecná funkce pro VŠECHNY
aktivity s tímto vzorem.

### Řešení — `Enrollment.sessionIds` (schemaVersion 8→9)
Nové volitelné pole `sessionIds?: string[]` na `Enrollment` (`packages/domain/src/model/schema.ts`)
— podmnožina `SessionGroup.sessions[].id`. `undefined` (výchozí) = všechny termíny skupiny, beze
změny chování pro existující data (žádná migrace dat, jen bump verze). Migrace v8→v9 v `io.ts` je
no-op.

- `resolve.ts`'s `placeEnrollment` a `ics/generate.ts`'s export smyčka teď filtrují
  `group.sessions` podle `enrollment.sessionIds`, pokud je nastaveno — `detectConflicts`/
  `scheduleSummary`/`buildRecommendations` dostávají filtr ZDARMA (všechny sdílejí
  `resolvePlacedSessions`).
- Nová store akce `setEnrollmentSessions(enrollmentId, sessionIds)` (`plannerStore.ts`) — odmítne
  prázdný výběr (aspoň jeden termín musí zůstat).
- `DetailsPanel.tsx`: sekce „Varianty docházky" pod vybranou (zapsanou) skupinou s >1 schůzkou
  nově ukáže checkbox seznam jednotlivých dnů — odškrtnutím dne se enrollment omezí jen na
  zbylé, zaškrtnutím zpět na všechny se `sessionIds` vrátí na `undefined` (čistá data).

## 4. Nefunguje změna věku dítěte

### 0. SOTA analýza (skutečný root cause)
`setChildAge` v `plannerStore.ts` (od CHANGE-80) validuje rozsah 3–19 a mimo rozsah tiše NEPROVEDE
zápis (no-op). Vstup věku ve všech 3 místech (`DetailsPanel.tsx` `ChildSettings`, `HomeScreen.tsx`
onboarding, `page.tsx` `MobileChildrenPanel`) byl ale KONTROLOVANÝ (`value={child.age}` +
`onChange` volající `setChildAge` PŘI KAŽDÉM STISKU KLÁVESY). Běžná editace (smazat staré číslo,
napsat nové) prochází mezistavem `''`/jednociferné číslo, které je MIMO rozsah — `setChildAge`
no-op, store se nezmění, ale řízený vstup se PŘI PŘÍŠTÍM RENDERU vrátí zpátky na starou hodnotu,
čímž vymaže, co uživatel právě napsal, dřív než stihne dopsat druhou číslici. Věk se tak
reálně NEDAL změnit žádnou běžnou editační sekvencí, jen inkrementem/dekrementem šipek na `<input
type=number>`.

### Oprava
Stejný vzor jako `SessionTimeEditor` (CHANGE-74): nekontrolovaný vstup (`defaultValue`, `key=
{child.id}` pro reset při přepnutí dítěte), commit až na `onBlur` — mezistavy při psaní se
nevalidují za běhu. Neplatná hodnota při odchodu z pole se vrátí na poslední platnou (`e.target.value
= String(child.age)`); platná se zapíše do store beze změny zobrazené hodnoty (žádné škubnutí).

## 5. BL-055 + BL-056 (design_review_86.md, M5/M6)

- **BL-055**: výchozí mobilní pohled `'week'` → `'3day'` OD PONDĚLÍ AKTUÁLNÍHO TÝDNE (ne od
  „dneška") — `ScheduleGrid.tsx` nový jednorázový efekt (`appliedMobileDefaultRef` hlídá, ať se
  nespustí znovu při každé změně `isMobile`) volá `setAnchorDate(startOfIsoWeek(prev))`. Volba
  „od pondělí" místo „od dneška" NENÍ svévolná — zachovává viditelnost nově přidané vlastní
  události (dialog defaultuje na pondělí) BEZ nutnosti navigace, čímž se vyhnula testovému
  fallout, který audit sám předpověděl. 3 existující testy (T-220 vedlejší efekt dřívější
  print-shell úpravy, T-225 a T-176 skutečně vázané na týdenní pohled) upraveny — T-225/T-176
  teď explicitně kliknou na nově dostupný přepínač „Týden" před testováním týdenní mechaniky.
- **BL-056**: `touch-action:none` na CELÉM bloku vlastní události (`ScheduleGrid.tsx`) nahrazeno
  malým úchytem (`⠿`, `data-testid="drag-handle"`, 16×16px, levý dolní roh bloku) — jen úchyt má
  `touch-none`+pointer handlery, zbytek plochy bloku zůstává scrollovatelný prstem i na dlouhé
  vlastní události (např. „Škola" 6 h). Klávesová obdoba (šipky) a klik pro otevření detailu
  zůstávají na celém bloku beze změny. T-233 (přetažení myší) upraveno — cílí na
  `data-testid="drag-handle"` místo středu bloku.
  - **Dva skryté bugy odhalené TEPRVE test-driven ověřením (T-233 selhal na
    `desktop-narrow`/`tablet-portrait`, ne na `desktop`), oba opraveny ve stejném CHANGE:**
    (1) `setPointerCapture()` volaný až po překročení 6px prahu (uvnitř `pointermove`) fungoval
    pro CELÝ blok, ale s 16px úchytem kurzor opouští jeho hranice DŘÍV, než 6px nastane — capture
    se nikdy nenastavil, tažení nikdy nepotvrdilo. Přesunuto do `pointerdown` (nastaví se hned,
    práh dál gatuje jen KDY se `dragging` stane `true`, ne KAM se eventy doručují).
    (2) `snap-x snap-mandatory` přidané k M5 (BL-055) donutilo prohlížeč přiskočit `scrollLeft` na
    40px (šířku sticky časové osy) místo 0, protože osa sama není platný snap bod — levý okraj
    pondělního sloupce byl fyzicky SCHOVANÝ pod osou (`z-10`). Odstraněno (`snap-x`/`snap-mandatory`
    /`snap-start` pryč) — riziko nestálo za drobnou UX vychytávku vodorovného scrollu.

## 6. BL-057 — VĚDOMĚ NEIMPLEMENTOVÁNO (konflikt s CHANGE-75)

Audit navrhuje přesunout správu kalendářů (přejmenování/přepnutí/přidání/odebrání) z vždy
viditelné horní lišty do sheetu za jedno „⋯" tlačítko, ať zůstane jen identita + stav uložení na
jednom řádku. **Toto přímo OBRACÍ explicitní rozhodnutí z `design_review_70.md`/CHANGE-75**, kde
uživatel doslova řekl „horní lišta neumožňuje přepínat mezi více kalendáři" a požádal o odstranění
VŠECH `desk:` skrývacích tříd z tohoto shluku — přepínač byl předtím schovaný na mobilní záložce
„Děti" a uživatel to explicitně odmítl.

Vzhledem k tomu, že jde o přímý konflikt s dřívějším explicitním požadavkem stejného uživatele
(ne jen nezávaznou preferenci auditu), a že jde o nevratnou UX regresi bez opětovného potvrzení,
**tato část zůstává otevřená a čeká na výslovné potvrzení uživatele**, zda si i přes dřívější
požadavek přeje přesun správy kalendářů zpět za skryté menu. `BL-057` v `docs/backlog.md`
aktualizován s touto poznámkou místo označení jako `done`.

## 7. Acceptance criteria

- **AC-1**: `tsc --noEmit` (web + domain) čisté.
- **AC-2**: domain vitest 133/133 (nové: 2× `resolvePlacedSessions` sessionIds, 1× migrace v8→v9).
- **AC-3**: `test/specs/mobile-audit-v2.spec.ts` 14/14 zelených (0 `test.fixme` — M5 i M6 hotovo).
- **AC-4**: plná E2E sada (6 profilů) 0 failed.
