# Design Review 88 — 12 přímých požadavků + BL-057 (na výslovné potvrzení)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-95 (`@krouzky/domain` 0.8.0→0.9.0, `schemaVersion` beze změny — `age`
volitelný a `Activity.targetGender` jsou zpětně kompatibilní relaxace, žádná migrace nepotřeba;
`@krouzky/web`)
**Date:** 2026-08-31
**Trigger:** Uživatel nahlásil 11 konkrétních UI/UX chyb/požadavků z vlastního používání appky (ne
z externího auditu) a zároveň výslovně potvrdil „Implementuj BL-057" (dřív `design_review_87.md`
§6 NEEDS INPUT).

## 0. Poznámka k procesu

Toto NENÍ audit-derived spec — jde o přímé nálezy uživatele z živého používání appky. Každá
sekce níže odpovídá jedné položce z požadavku, v pořadí zadání. BL-057 je řešeno samostatně v §12
(bylo dřív explicitně NEEDS INPUT, teď potvrzeno).

## 1. Věk dítěte se nativně nevyplňuje

### 0. SOTA analýza
`Child.age` bylo v zod schématu (`packages/domain/src/model/schema.ts`) povinné
(`z.number().int()`), všechny konstrukční místa (`DEFAULT_CHILD`, `DEMO_CHILD`, `addChild`) dosazovaly
natvrdo `age: 9`, i když uživatel věk nikdy nezadal.

### Oprava
`age: z.number().int().min(3).max(19).optional()` — relaxace povinného pole na volitelné je
zpětně kompatibilní (staré JSONy s `age` dál validují), **žádná migrace/`schemaVersion` bump
není potřeba**. Všechna konstrukční místa (`novestraseci.ts`, `demoData.ts`, `plannerStore.ts`
`addChild`) přestala dosazovat `age: 9`. `setChildAge(childId, age: number | undefined)` — `undefined`
věk maže (podporuje i následné smazání, ne jen počáteční nevyplnění). Tři UI vstupy věku
(`DetailsPanel.tsx` `ChildSettings`, `HomeScreen.tsx` onboarding, `page.tsx`
`MobileChildrenPanel`) mají `placeholder="—"`, prázdné `defaultValue`, a `onBlur` handler, který
při prázdném vstupu volá `setChildAge(id, undefined)` místo revertu na starou hodnotu.

**Neznámý věk je neutrální, ne chyba** (stejná filosofie jako prázdné zájmy/dostupnost/rozpočet
v `activityFit`, CHANGE-45): `packages/domain/src/matching/index.ts` `activityFit()` kritérium
`age` úplně vynechá, pokud `child.age === undefined` (nepočítá se do jmenovatele skóre).
`packages/domain/src/conflicts/detect.ts` `detectAgeConflicts()` (H2) při neznámém věku zapíše
`skippedChecks` (`check: 'H2_age_out_of_range'`) místo falešného vyhodnocení. `CatalogPanel.tsx`
filtr „Jen vhodné pro věk" je bez zadaného věku zašedlý (`disabled`) a popisek zní „Jen vhodné
pro věk (nezadán)". `DetailsPanel.tsx` detail kroužku zobrazuje neutrální řádek „Věk {jméno} není
vyplněný — vhodnost neověřena" místo ✓/⚠.

## 2. Domů: „VYBRANÉ KROUŽKY" místo „DOPORUČUJEME"

### 0. SOTA analýza
`HomeScreen.tsx` mělo sekci „Doporučujeme" (`buildRecommendations`, limit 3) — sekundární
doporučovací engine, ne přehled toho, co dítě už MÁ zapsané. Primární tok appky je katalog →
rozvrh → export, ne doporučení (potvrzeno už při GUI redesignu, CHANGE-54).

### Oprava
Nová sekce „Vybrané kroužky" nahrazuje „Doporučujeme" — `useMemo` nad `view.blocks` (dedup podle
`activityId` pro katalogové zápisy / `ownerId` pro vlastní události), seřazeno abecedně, každá
položka klikatelná (`selectActivity`/`selectCustomEntry`) a nese barevnou tečku + den/čas
nejbližšího termínu. `CatalogPanel.tsx`'s VLASTNÍ sekce „Co se hodí…" (CHANGE-51/70) je
samostatná funkce a zůstává beze změny — jen HomeScreen's kopie doporučení byla nahrazena.

## 3. „Další filtry": přetékání a cenový filtr → filtr podle pohlaví

### 0. SOTA analýza
Rozbalený panel „Další filtry" byl `grid grid-cols-2` — `<input type="time">` má vlastní
prohlížečovou minimální šířku, která na úzkém katalogu (mobil/medium) přetékala mimo kartu.

### Oprava
`grid-cols-2` → `grid-cols-1` (jeden sloupec vždy sedí, bez ohledu na šířku katalogu). Cenový
filtr („Cena do (Kč)" + „Zahrnout i bez uvedené ceny") nahrazen filtrem podle pohlaví — nové pole
`Activity.targetGender?: 'boys' | 'girls'` (nezadáno = smíšené/bez omezení, nikdy neuhádnuto —
doplněno jen tam, kde je to v názvu katalogu čitelně uvedené: `ddm-basketbal-chlapci`). Filtr
vylučuje jen aktivity s explicitně OPAČNÝM `targetGender`, mixed/undefined vždy projde.

## 4. Sheet „Kalendář": scroll od 12:00, jasnější přehled sourozenců, „now“ čára přes celou šířku

### a) Nativní scroll od 12:00
`ScheduleGrid.tsx`'s scroll efekt dřív centroval na aktuální čas (nebo střed okna 07–21), teď
zarovná 12:00 na VRCH viditelné oblasti (`el.scrollTop = topPx(12*60, hourPx)`), bez ohledu na
aktuální čas — stabilní výchozí pohled požadovaný uživatelem.

### b) Barvy sourozenců podle DÍTĚTE, ne podle aktivity
`useScheduleView.ts`'s `familyBlocks` (přehled termínů OSTATNÍCH dětí, FR-W3-3) používaly barvu
AKTIVITY (`colorOf(p).fill`) — dvě děti zapsané do STEJNÉHO kroužku měly stejnou barvu překryvu,
nerozlišitelné. Přepnuto na `colorForChild(p.childId).fill` (už existující deterministická
funkce v `packages/domain/src/model/palette.ts`, dřív používaná jen pro ICS `single` režim) —
konzistentní barva napříč VŠEMI bloky daného sourozence, jako barevně odlišené kalendáře na
iOS/Androidu. Nová legenda vedle přepínače „Zobrazit i sourozence" (barevná tečka + jméno
každého NEaktivního dítěte).

### c) „Now“ čára přes celou šířku
Dřív se čára kreslila PER SLOUPEC (uvnitř `dates.map`, jen v `isToday` sloupci) — vizuálně
nespojitá přes více dní. Přesunuto na JEDNU čáru přes celou šířku mřížky (sourozenec `role="row"`
uvnitř nového `relative` wrapperu), zobrazí se, pokud je dnešek vůbec v zobrazeném rozsahu
(`todayInView`). Odpovídající hodina na časové ose se navíc zvýrazní tučně červeně
(`currentHourMark`).

## 5. Zobrazení tablet: sheety „Domů" a „Děti"

### 0. SOTA analýza
Střední/tabletové šířky (768–1179px, `!isMobileLayout && !isWide`) měly jen JEDNO plovoucí
tlačítko „Souhrn" otevírající `<DetailsPanel/>` — žádný přístup k domovské obrazovce, žádná
skutečná správa dětí (na rozdíl od mobilu, kde záložka „Děti" mountuje `MobileChildrenPanel` +
`DetailsPanel` dohromady).

### Oprava
Dvě plovoucí tlačítka: „Domů" (nový `mediumHomeOpen` stav, otevře `<HomeScreen/>` v drawer),
„Děti" (přejmenováno z „Souhrn", stejný `mediumInfoOpen` stav — nyní otevře `MobileChildrenPanel`
+ `DetailsPanel` DOHROMADY, ne jen `DetailsPanel`). Výběr aktivity/události má vždy přednost před
„Domů" obsahem (přepne drawer na detail). **Vedlejší oprava duplicity:** `DetailsPanel.tsx`'s
`ChildSettings` (věk/přesun) se dřív zobrazovalo na VŠECH nemobilních šířkách (`!isMobile`) — na
médiu teď duplikovalo stejná pole s nově přidaným `MobileChildrenPanel`. Gate změněn na
`useIsWide()` (≥1180px) — `ChildSettings` je teď jen na širokém desktopu, kde je jediným zdrojem.

## 6. Tisk/PNG: nejprve vyber rozsah hodin (nativně 13:00–21:00), jen grafika, ne agenda

### 0. SOTA analýza
„Tisk rozvrhu"/„Obrázek rozvrhu (.png)" generovaly výstup okamžitě přes CELÝ den (00:00–24:00,
CHANGE-94), bez možnosti omezit rozsah. `.print-summary` tabulka se navíc tiskla VŽDY (i u „Tisk
rozvrhu"), ne jen u „Tisk agendy".

### Oprava
Nový `PrintRangeDialog.tsx` (Od/Do, `type="time"`, nativně předvyplněno 13:00–21:00) se otevře
před „Tisk rozvrhu" i „Obrázek rozvrhu (.png)" (agenda je čistě textová, rozsah hodin se jí
netýká). Po potvrzení `applyExportRange()` (`exportClient.ts`) dočasně ořízne scrollovatelný obsah
mřížky (`[data-testid="grid-scroll"]`, dopočet `pxPerMinute` z reálné `scrollHeight`, `!important`
inline styl kvůli tiskovému CSS) na zvolený rozsah, spustí tisk/`toPng()`, pak obnoví původní stav.
`globals.css`: `body:not([data-print-mode='agenda']) .print-summary { display:none !important }` —
„Tisk rozvrhu" ukazuje JEN grafickou mřížku, žádné doplňkové info (DetailsPanel/katalog už byly
`.no-print` odjakživa).

## 7. BL-057 — správa kalendářů sbalená za „⋯" na mobilu (potvrzeno uživatelem)

Viz `docs/backlog.md` BL-057 a `design_review_87.md` §6 pro historii NEEDS INPUT rozhodnutí.
Uživatel teď výslovně potvrdil implementaci navzdory dřívějšímu opačnému požadavku
(`design_review_70.md`/CHANGE-75).

### Oprava
`Toolbar.tsx`: obsah správy kalendářů (přejmenování/přepnutí/přidání/odebrání, `calendarControls`)
zůstává VŽDY viditelný v liště na desktopu (`hidden desk:flex`, beze změny chování). Na mobilu
(`desk:hidden`) nahrazen kompaktním tlačítkem „avatar + jméno + ▾" s `aria-label="Správa
kalendářů (aktivní: {jméno})"` (avatar/jméno/šipka uvnitř jsou `aria-hidden`, ať nekontaminují
accessible name) — otevírá `fixed`-pozicovaný sheet (stejný vzor jako mobilní „Další ▾", CHANGE-71
gotcha) se stejným obsahem. Header dostal `flex-nowrap overflow-x-auto` (mobil) / `desk:flex-wrap
desk:overflow-visible` (desktop) a `shrink-0` na všechny 3 přímé skupiny — dřív by i s kompaktním
tlačítkem `flex-wrap` mohlo zalomit do 2 řádků při mírném přetečení; teď je hlavička na mobilu
VŽDY přesně 1 řádek (změřeno: 113px → 61px), přebytek jen vodorovně scrolluje.

### Fallout v testech
`getByLabel('Věk dítěte')` bez scope na `role` je nespolehlivé (na rozdíl od `getByRole`,
`getByLabel.count()`/`.fill()` NEVYLUČUJE `display:none` elementy — nový gotcha, liší se od
zavedeného předpokladu „hidden element = žádný strict-mode konflikt"). `getByRole('spinbutton',
{name})` je bezpečné vždy. T-101/T-158/T-167/T-180/T-185/T-186/T-222/T-223 přepsány na nový
`openCalendarMenuIfCompact(page, width)` helper (`test/helpers/profiles.ts`) a/nebo `getByRole`
scoping. T-167 přepsáno na opačné tvrzení (nová bl-057 dokumentace přímo v title testu).

## 8. Acceptance criteria

- **AC-1**: `tsc --noEmit` (web + domain) čisté.
- **AC-2**: domain vitest 135/135 (nové: neznámý věk neutrální v `activityFit`, `detectAgeConflicts`
  skip do `skippedChecks`).
- **AC-3**: plná E2E sada (6 profilů) 0 failed po regeneraci vizuálních baseline (katalog/filtry
  a hlavička se vizuálně změnily).
- **AC-4**: mobilní hlavička je přesně 1 řádek (změřeno `getBoundingClientRect()`, ne jen
  screenshotem — CHANGE-79 poučení).

## 9. Non-goals / nové BL

- **BL-059** (nové, `limitation`): filtr podle pohlaví má dnes jen JEDEN katalogový kandidát
  („Basketbal — chlapci"). Pokud se katalog v budoucnu rozšíří o další čitelně genderované
  kroužky (např. dívčí oddíly), je potřeba je ručně doplnit stejným polem — žádné hádání dat.
