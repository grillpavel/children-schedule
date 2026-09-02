# Design Review 107 — Jeden sdílený template pro detail položky místo dvou nezávislých

**Status:** IMPLEMENTED (2026-09-02) — patch aplikován, ověřeno lokálně
včetně plné E2E sady (viz §4). Obsahuje i CHANGE-113 (společný patch).
**Change ID:** CHANGE-114 (`apps/web`, navazuje na CHANGE-113)
**Date:** 2026-09-02
**Repo:** nový `apps/web/src/components/EventDetailSections.tsx`;
`apps/web/src/components/DetailsPanel.tsx` (oba typy detailu přepsány na sdílené sekce)
**Trigger:** uživatel po CHANGE-112/113 (obsahová parita polí) řekl přímo: „mělo by to
být tak, že existuje template, který je identický pro všechny události" — tedy
neopravovat rozdíly jednotlivě dokola, ale odstranit PŘÍČINU, proč vůbec mohly
vzniknout.

## 0. Analýza — proč šlo o stejný vzorec jako CHANGE-110

`SelectedActivity` (detail katalogové aktivity) a `CustomEntryDetail` (detail vlastní
události) byly od začátku DVĚ nezávislé implementace téhož — každá měla svou vlastní
kopii markupu pro „Místo konání", „Cena a věk", „Kontakt", skládací popis, výběr
barvy, checkbox prázdnin. Přesně tenhle vzorec (nezávislé kopie téhož, které se v čase
nezávisle rozjíždějí) už jednou způsobil problém, který CHANGE-110 řešilo u OBÁLEK
popup oken (`DialogShell`). Tady šlo o stejný vzorec, jen o úroveň níž — u OBSAHU
uvnitř obálky. Dokud existují dvě kopie, každá příští oprava/nové pole se musí psát
dvakrát a nevyhnutelně se to znovu rozejde (přesně to se stalo mezi CHANGE-112 a
zprávou uživatele s screenshoty).

## 1. Requirements

- **FR-1**: Nový soubor `EventDetailSections.tsx` obsahuje sdílené sekce používané
  OBĚMA typy detailu: `DetailSectionCard` (generický karetní obal), `DetailDescriptionAccordion`,
  `DetailLocationCard`, `DetailPriceAgeCard` (včetně `child`-age-match indikátoru —
  dřív ho vlastní událost NEMĚLA vůbec, teď automaticky dostává stejnou logiku),
  `DetailContactCard`, `DetailColorSection`, `DetailHolidaySection`, `DetailApplicationLink`.
  Také sem přesunuty dřív duplicitní `MapLink`, `EditedMark`, `PRICE_PERIOD_LABELS`.
- **FR-2**: `SelectedActivity` i `CustomEntryDetail` volají STEJNÉ komponenty ve
  STEJNÉM pořadí sekcí (Popis → Termín/Varianty → Místo konání → Cena a věk → Kontakt
  → Barva → Prázdniny → akce). Vlastní obsah (formulář/logika) zůstává v komponentě,
  jen vizuální/strukturální vrstva je sdílená.
- **FR-3**: Záměrně NENÍ sdíleno (jsou to odlišné doménové koncepty, ne jen jiný
  vzhled téhož) — viz §2.

## 2. Co zůstává vlastní každému typu (a proč to tak má být)

- **Hlavička**: Activity má poskytovatele + název s `EditedMark`; CustomEntry má tužku
  + typ/kategorii jako badge. Obsahově odlišné, sdílet by znamenalo vynucovat cizí pole.
- **Primární akce / rozpis termínů**: Activity = „Varianty docházky" (výběr JEDNOHO
  z VÍCE nabízených `sessionGroups`, s enroll/un-enroll tokem a kolizní kontrolou).
  CustomEntry = „Termín" (jeden pevný rozpis, který si uživatel sám navrhl). Tohle je
  skutečný funkční rozdíl — katalogová položka nabízí VÝBĚR, vlastní událost je
  AUTORSKÁ. Vynucený společný komponent by buď ochudil Activity o výběr variant,
  nebo předstíral, že CustomEntry má něco, co nemá.
- **Akce na konci**: Activity → „Upravit údaje"/„Upravit časy" (dva samostatné
  editory, protože Activity rozlišuje katalogová vs. uživatelem přepsaná data).
  CustomEntry → „Upravit"/„Odebrat" (jeden dialog, protože uživatel vlastní 100 % dat).

## 3. Acceptance criteria

- **AC-1**: `tsc --noEmit` čisté.
- **AC-2**: Doménový vitest 155/155 (nedotčeno — čistě `apps/web` refaktor).
- **AC-3**: Vizuální regrese — katalogová aktivita musí vypadat PIXEL identicky jako
  před refaktorem. Ověřeno headless Chromiem (390×844): screenshot před/po refaktoru
  strukturálně totožný (stejné sekce, stejné pořadí, stejný text).
- **AC-4**: Vlastní událost se všemi poli vyplněnými (kategorie/věk/popis/odkaz/barva/
  kontakt/prázdniny) zobrazuje všechny odpovídající sekce ve stejném vizuálním jazyce
  jako katalogová aktivita — ověřeno headless Chromiem s plně vyplněným testovacím
  záznamem.
- **AC-5**: Žádná nová vlastnost nesmí být přidána do jedné komponenty, aniž by byla
  automaticky dostupná i druhé — to je celý smysl refaktoru. Konkrétní ověření: `child`
  age-match indikátor (dřív jen u Activity) teď funguje i u CustomEntry BEZ jakéhokoli
  dalšího kódu v `CustomEntryDetail` — jen proto, že sdílí `DetailPriceAgeCard`.

## 4. Implementace — stav

Patch aplikován (`git apply --exclude=<oba loose spec soubory>`). Ověřeno lokálně:

- `tsc --noEmit` čisté, doménový vitest **155/155** (nedotčeno, jak se čekalo).
- `next build` čistý.
- Plná 6profilová E2E sada — **780 passed / 252 skipped / 0 failed** (shodné s
  baseline před tímto CHANGE, nulová regrese — na rozdíl od CHANGE-112 se tu
  nedělaly žádné poziční změny v DOM pořadí existujících prvků katalogové
  aktivity, jen přesun stejného markupu do sdílených komponent, takže žádné
  stávající lokátory nebylo třeba měnit).
- Ručně znovu ověřeno (viz design_review_106.md §4) inline Barva/Prázdniny
  u vlastní události + `.ics` barva v exportu.

Doporučené nové pokrytí pro sdílené sekce (Barva/Prázdniny inline, Kontakt
jako vlastní karta) nebylo přidáno — sledováno společně s CHANGE-113 jako
`BL-070`.
