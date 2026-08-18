# Design Review 55 — Vyhledávání se po přidání vyprázdní + oprava sčítání ceny

**Status:** IMPLEMENTED
**Change ID:** CHANGE-56 (engine `@krouzky/domain` + app `@krouzky/web`: cena kroužku se v souhrnu počítá
jednou bez ohledu na počet zapsaných skupin/termínů týdně; vyhledávací pole katalogu se po úspěšném přidání
kroužku vyprázdní)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (packages/domain + apps/web + test)
**Trigger:** dva nahlášené defekty (ne z analýz `analysis_53_a.md`/`analysis_55_b.md`, které byly zároveň
posouzeny — viz §3): (1) vyhledávací pole katalogu po přidání kroužku a přepnutí na jinou záložku zůstává
vyfiltrované na už přidaný kroužek; (2) souhrn nákladů násobí cenu kroužku podle počtu zapsaných skupin/
termínů týdně, ačkoli cena je za kroužek jako celek, ne za termín.

## 0. SOTA analysis

- **0.1 Problem.**
  - **Cena:** `scheduleSummary` (packages/domain/src/summary/index.ts) iterovala přes všechny `enrollments`
    a přičítala `activity.price.amount` za **každý** enrollment. `DetailsPanel` (CHANGE-44) ale explicitně
    umožňuje zapsat dítě do **více `sessionGroup` téže aktivity najednou** („Varianty docházky… Můžete
    vybrat i víc termínů najednou.") — kroužek konající se 2×/3× týdně přes oddělené skupiny tak měl cenu
    sečtenou 2×/3×, ačkoli `price` je vlastnost `Activity` (jedna platba za kroužek), ne `SessionGroup`.
  - **Vyhledávání:** `CatalogPanel` zůstává trvale připojený (na mobilu jen skrytý přes CSS `hidden`
    třídu při přepnutí spodní navigace), takže jeho lokální stav `query` (React `useState`) nikdy
    neresetuje. Po vyhledání a přidání kroužku a přepnutí na jinou záložku a zpět zůstává katalog
    vyfiltrovaný jen na už přidaný kroužek.
- **0.2 Approach.**
  - `scheduleSummary`: cena kroužku se do `costMap` přičítá jen jednou na `activityId` (deduplikace přes
    `Set<string>`), bez ohledu na počet enrollmentů pro tutéž aktivitu. `activityCount` (počet položek pro
    metriky typu „X kroužků") záměrně **beze změny** — počítá řádky enrollmentů/termínů, ne unikátní
    aktivity; toto review se drží nahlášeného defektu (cena), širší sjednocení sémantiky by bylo mimo scope.
  - Nový efemérní store slot `clearCatalogSearchNonce` (stejný vzor jako `focusNonce`/`focusWeekday` z
    CHANGE-2, C8-B7) + akce `clearCatalogSearch()`. `SelectedActivity` (DetailsPanel) ji volá **jen**
    z primárního CTA „Přidat do rozvrhu" (stejné místo jako `onEnrolled` z CHANGE-55) — ne z „Varianty
    docházky" ani „Odebrat". `CatalogPanel` sleduje nonce v `useEffect` a při změně vyprázdní `query`.
- **0.3 analysis_53_a.md a analysis_55_a/b.md posouzeny (bez nové implementace v tomto review).**
  `analysis_53_a.md` popisuje stejný safe-area/sheet-lifecycle problém, který už řeší CHANGE-55
  (`design_review_54.md`) — beze změny. `analysis_55_a.md` a `analysis_55_b.md` jsou dva rozsáhlé, vzájemně
  se doplňující dokumenty popisující stejnou vizi v4 (osobní týdenní asistent). `analysis_55_a.md` fázuje
  konfliktní engine na **P0** (jen binární 🟢 Bez kolize / 🔴 Kolize) a **P1** „Travel Time Matrix" (teprve
  tam přibývá 🟠 „logistická kolize" — těsná návaznost odvozená z matice čas-na-přesun mezi lokalitami
  `(S_B−E_A) < T_trans` při různé lokalitě, ne z pouhého časového překryvu). Dále popisuje: silný vstupní
  bod „Najít volné místo"/„Smart Recommendations", sticky souhrn rozvrhu při procházení katalogu, FAB pro
  vlastní událost s přednastavenými typy (Kroužek/Škola/Lékař/…), tabletový 3sloupcový layout
  (Filtry/Výsledky/Sticky Rozvrh), Undo Toast s 4s časovačem a zprávou na konkrétní akci (např. „Basketbal
  byl odebrán z rozvrhu."). Část je **už hotová**: bottom nav 4 záložky (CHANGE-53), Domů = schedule-first +
  doporučení (CHANGE-53), badge „Vhodné pro věk"/„Bez kolize" (CHANGE-51), Agenda jako výchozí mobilní
  pohled (CHANGE-39), dítě jako centrální kontext (`activeChildId`). **Jen částečně hotové:** toast při
  změně rozvrhu existuje (`page.tsx`), ale nesplňuje přesně specifikaci — obecná zpráva „Změna uložena do
  varianty" místo zprávy na konkrétní akci a 2,4s místo 4s časovače. Zajímavost: doménový modul
  `packages/domain/src/travel/index.ts` (haversine vzdálenost, rychlosti dopravy, výchozí rezerva na
  přesun) už existuje, ale **není nikde zapojený** — hotový základ přesně pro P1 „Travel Time Matrix" z
  analysis_55_a.md. Zbytek je svým rozsahem samostatný projekt vyžadující produktové rozhodnutí o
  prioritizaci — zapsáno jako `BL-034`, neimplementováno v tomto review.

## 1. Requirements

- **FR-1** `scheduleSummary` počítá cenu každé zapsané aktivity **jednou** bez ohledu na počet zapsaných
  `sessionGroup` téže aktivity.
- **FR-2** Po kliknutí na primární „Přidat do rozvrhu" se vyhledávací pole katalogu vyprázdní.

## 2. Acceptance criteria

- **AC-1** (FR-1) Nový doménový test `scheduleSummary.costByPeriod` (packages/domain/test/summary.test.ts):
  dítě zapsané do 2 samostatných skupin téže aktivity (`TEST_tanec`, 500 Kč/měs) → `costByPeriod` obsahuje
  `500`, ne `1000`.
- **AC-2** (FR-2) **T-127** (`catalog.spec.ts`): vyhledá „Basketbal", přidá první kartu do rozvrhu,
  vyhledávací pole je po přidání prázdné.
- **AC-3** Plná E2E `--workers=1` beze změny v existujících testech; doménová sada `vitest` zelená;
  `tsc --noEmit` (domain i web) čisté.

## 3. Non-goals / notes

- `activityCount`/„kroužků bez ceny" počítání zůstává beze změny (počítá řádky enrollmentů, ne unikátní
  aktivity) — nebylo součástí nahlášeného defektu, širší sjednocení by bylo nad rámec tohoto review.
- `analysis_55_b.md`: velký v4 redesign (3-stavové kolize, „Najít volné místo", sticky souhrn při
  procházení, FAB s typy vlastních událostí, tabletový 3sloupcový layout) — zapsáno jako `BL-034`,
  vyžaduje produktovou prioritizaci před implementací.
