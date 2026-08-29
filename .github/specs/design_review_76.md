# Design Review 76 — Vlna 3 velkého UI/UX redesignu, první část (design_review_73.md)

**Status:** IMPLEMENTED (FR-W3-5 zúženě, FR-W3-8 zúženě); zbytek Vlny 3 zůstává DRAFT — viz §0.3
**Change ID:** CHANGE-83 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web`
**Trigger:** Pokračování `design_review_73.md` po Vlně 1 (CHANGE-81) a Vlně 2 (CHANGE-82, částečně).

## 0. SOTA analýza

### 0.1 Rozsah — 2 z 8 FR Vlny 3 implementovány, zúženě

| FR | Nález (design_review_73.md) | Řešení |
|---|---|---|
| FR-W3-5 | `role="grid"` obaluje jen 1 `role="row"` (dny vedle sebe) — čtečka ohlásí „řádek 1 z 1" | Přidána `sr-only` textová alternativa (souhrn dne/času/názvu/konfliktu) vedle vizuální mřížky — **ne** přepis struktury na řádky-po-hodinách, viz §0.2 |
| FR-W3-8 | Chybí `/` skok do hledání a klávesy pro přepnutí pohledu | `/` fokusuje hledání katalogu (page.tsx); `1`/`2`/`3`/`4` přepnou Den/3 dny/Týden/Měsíc na desktopu (ScheduleGrid.tsx) — **ne** ↑/↓ mezi „časovými sloty" ani Enter/Delete na zápis/odebrání, viz §0.2 |
| FR-W3-1 (drag&drop) | — | NEIMPLEMENTOVÁNO, viz §0.3 |
| FR-W3-2 (návrh alternativ) | — | NEIMPLEMENTOVÁNO, viz §0.3 |
| FR-W3-3 (multi-dítě překryv) | — | NEIMPLEMENTOVÁNO, viz §0.3 |
| FR-W3-4 (sdílený odkaz) | — | NEIMPLEMENTOVÁNO, viz §0.3 |
| FR-W3-6 (tokenizace dark modu) | — | NEIMPLEMENTOVÁNO, viz §0.3 |
| FR-W3-7 (decluttering toolbaru) | — | NEIMPLEMENTOVÁNO, viz §0.3 |

### 0.2 Proč zúženo — validace proti aktuálnímu kódu (stejná disciplína jako design_review_74/75.md)

- **FR-W3-5**: doslovný přepis na „poctivé řádky-po-hodinách" by změnil `gridcell` model ze
  „den" na „den×hodina" — desítky testů (`getByRole('gridcell', {{name: den}})`,
  `getByRole('grid').getByRole('button', …)`, T-304 klávesová navigace) jsou vázané na DNEŠNÍ
  strukturu (1 buňka = 1 den). Audit sám nabízí alternativu — `aria-hidden` + textová souhrnná
  alternativa — a TA byla zvolena jako bezpečnější: nic se neodebírá ani nepřejmenovává, jen
  přibývá `sr-only` seznam se stejnými daty jako existující Agenda pohled, vedle vizuální mřížky.
  Vizuální mřížka NENÍ `aria-hidden` (na rozdíl od druhé poloviny audit-navrhované alternativy),
  protože by to require odebrání z tab-pořadí, jinak by axe nahlásil `aria-hidden-focus` — a
  odebrání z tab-pořadí by rozbilo T-304 (šipky mezi dny). Čtečka tak má na výběr: sr-only souhrn,
  NEBO plnou navigaci mřížkou (obojí funkční, jen mřížka si zachovává nepřesné „řádek 1 z 1").
- **FR-W3-8**: „↑/↓ mezi časovými sloty" a „Enter na zápis" nemají v dnešní architektuře (bloky
  pozicované absolutně přes `top`/`height` v px, žádná diskrétní jednotka „slot") jasný ekvivalent
  bez zavedení celého nového interakčního modelu (na jaký čas by ↑/↓ přesně skákalo? po kolika
  minutách?) — to by bylo hádání bez konkrétního zadání, ne implementace. „Delete na odebrání"
  vyžaduje v `page.tsx` znát enrollment/custom-entry ID za vybranou aktivitou (dnes drženo jen v
  `DetailsPanel.tsx`) — bezpečné zapojení by vyžadovalo zdvojit selekční logiku nebo ji zvednout
  výš, riziko chyby (smazání špatné položky) bez jasného přínosu oproti existujícím tlačítkům
  „Odebrat z rozvrhu"/„Smazat". Implementovány proto jen 2 mechanicky bezpečné kusy: `/` (fokus
  hledání) a `1`–`4` (přepnutí pohledu, jen desktop kde je přepínač i vidět).

### 0.3 Proč zbytek Vlny 3 NEimplementován — jde o 6 samostatných, netriviálních prací

Zbylých 6 FR nejsou drobné úpravy, ale samostatné funkce/refaktory srovnatelné rozsahem s Vlnou 1/2
každý zvlášť:

- **FR-W3-1** (drag & drop): nový interakční model (pointer events, 5min snap, klávesová obdoba
  POVINNÁ dle zadání) jen pro vlastní události — vyžaduje vlastní návrh chování při kolizi
  s existujícím zápisem, undo/redo integraci, a11y ekvivalent. Netriviální samostatná feature.
- **FR-W3-2** (návrh alternativních termínů): `suggestVariantSwitches` v doméně řeší jinou otázku
  (přepnutí varianty), ne „najít nekolidující termín TÉHOŽ kroužku" — vyžaduje nový domain dotaz +
  UI prezentaci návrhů v `DetailsPanel`/toastu, včetně validace přesného chování konfliktního
  motoru (`detectConflicts`) předem.
- **FR-W3-3** (multi-dítě překryv): vyžaduje nové UI pro výběr „která další dítě zobrazit" a
  vizuální odlišení bloků různých dětí v jedné mřížce (barva/vzor), plus rozhodnutí co dělá klik.
- **FR-W3-4** (sdílený odkaz): serializace stavu do URL fragmentu — vyžaduje rozhodnutí o limitu
  délky URL (typicky ~2000 znaků u některých prohlížečů/CDN), kompresi, a co se stane při
  konfliktu s existujícím lokálním stavem po otevření odkazu (přepsat? sloučit? zeptat se?).
- **FR-W3-6** (tokenizace dark modu): `globals.css` má ~60 řádků ručních `.trida-utility{...}`
  přepisů pro dark mode — nahradit tokeny (CSS proměnnými) by znamenalo projít a přepsat
  barevné utility třídy NAPŘÍČ VŠEMI komponentami (Toolbar, CatalogPanel, ScheduleGrid,
  DetailsPanel, HomeScreen…), ne jen `globals.css`. Reálně srovnatelné s plnou vizuální migrací —
  requires přegenerovat všechny vizuální baseline a pečlivě ověřit kontrast na obou motivech
  znovu (T-300/301/310), přesně ten „opakovaný gotcha z CHANGE-44/rewrite", na který FR-W3-6 sám
  upozorňuje.
- **FR-W3-7** (decluttering toolbaru): Věk/Přesun/Barva dnes existují JEN v desktopovém Toolbaru
  (mobil má vlastní editaci v záložce „Děti", ale desktop ne) — přesun by vyžadoval nejdřív
  postavit ekvivalentní UI jinam (např. do `DetailsPanel`), pak teprve odebrat z Toolbaru, a
  přepsat několik existujících testů, které dnes cílí `getByRole('banner').getByRole('spinbutton')`
  apod. (např. T-185 věková validace). Vyšší riziko než čistě aditivní FR-W3-5/8.

Všech 6 je proto ponecháno jako DRAFT — sledováno jako **BL-052** (souhrnná položka, konkrétní
rozdělení do jednotlivých FR při výběru, kterým pokračovat).

## 1. Requirements (implementované)

- **FR-W3-5 (zúženě)**: `ScheduleGrid.tsx` v ne-agenda gridu (den/3dny/týden) vykreslí `sr-only`
  seznam obsahující den, čas, název a případný konflikt každého bloku ve viditelném rozsahu.
  Vizuální `role="grid"` struktura beze změny.
- **FR-W3-8 (zúženě)**: `/` (mimo textová pole) fokusuje `[data-catalog-search]` (na mobilu nejprve
  přepne na záložku „Katalog"). `1`/`2`/`3`/`4` (mimo textová pole, jen `!isMobile`) přepnou
  `mode` na Den/3 dny/Týden/Měsíc.

## 2. Acceptance criteria

- **AC-1** (FR-W3-5): T-313 — po zápisu kroužku a přepnutí na vizuální mřížku existuje přesně
  jeden `.sr-only` prvek s nadpisem „Rozvrh — textový souhrn" a obsahem odpovídajícím formátu
  `HH:MM–HH:MM`.
- **AC-2** (FR-W3-8a): T-311 — stisk „/" (mimo textové pole) zaměří `[data-catalog-search]`.
- **AC-3** (FR-W3-8b): T-312 — stisk „1"/"3" (desktop) přepne aktivní tlačítko přepínače na
  Den/Týden (`bg-white` třída = aktivní stav dle existujícího stylu přepínače).
- Celá E2E sada zůstává zelená, žádná vizuální baseline se nemění (čistě aditivní změny).

## 3. Non-goals / notes

- Zbylých 6 FR (FR-W3-1/2/3/4/6/7) zůstává DRAFT — sledováno jako BL-052, čeká na rozhodnutí
  uživatele, kterým pokračovat (každý je svým rozsahem samostatná práce, ne dokončení jedné vlny).
