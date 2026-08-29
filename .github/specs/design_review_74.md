# Design Review 74 — Vlna 1 velkého UI/UX redesignu (design_review_73.md)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-81 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web`
**Trigger:** `design_review_73.md` (DRAFT) konsolidoval velký HTML UI/UX audit
(`.github/audit/after_review_71/Audit Planovac krouzku.dc.html`) do 3 vln FR kandidátů. Uživatel
požádal o implementaci od začátku — tento spec pokrývá **Vlnu 1** (FR-W1-1 až FR-W1-6): nízké
riziko, žádná změna datového modelu. Vlna 2/3 zůstávají v `design_review_73.md` jako DRAFT.

## 0. SOTA analýza

### 0.1 Rozsah — přesně 6 FR z Vlny 1, každý ověřen proti aktuálnímu kódu před implementací

| FR | Nález (design_review_73.md) | Řešení |
|---|---|---|
| FR-W1-1 | 900px zlom duplikovaný ve 4 nezávislých místech (`tailwind.config.ts` + 3× `matchMedia` v `page.tsx`/`CatalogPanel.tsx`/`ScheduleGrid.tsx`) | nový sdílený hook `useBreakpoint.ts` (`useIsMobile`/`useIsWide`), JS zdroj sjednocen na 1 místo |
| FR-W1-2 | `isMobile`/`isWide` startují na `false`, krátce zabliká desktopová větev na mobilu | hook používá `useLayoutEffect` (ne `useEffect`) — stav se opraví PŘED prvním vykreslením prohlížeče |
| FR-W1-3 | dlouhé jméno kalendáře/víc kalendářů mohlo zalomit shluk správy kalendářů na 2 řádky → s řádkem 2 nepředvídatelně 3 řádky hlavičky | shluk `flex-wrap`→`flex-nowrap overflow-x-auto` (vodorovný scroll místo zalomení), jméno/přepínač `truncate` |
| FR-W1-4 | toast (`bottom-16`=64px) nepočítal se `safe-area-inset-bottom` spodní navigace (48px+home indicator) | mobilní toast `bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]`, desktop `desk:bottom-16` beze změny |
| FR-W1-5 | pole `<input>` na mobilu pod 16px → iOS Safari při fokusu přiblíží stránku | `@media (max-width:899.98px){input,select,textarea{font-size:16px!important}}` |
| FR-W1-6 | `font-family: Inter` deklarovaný, ale nikde reálně nenačtený | `next/font/google` (`subsets:['latin','latin-ext']` kvůli české diakritice) v `layout.tsx`, `globals.css` odkazuje na `var(--font-inter)` |

### 0.2 Vědomě NEimplementováno v této vlně (viz `design_review_73.md` §3)

- Plná „typografická škála 13/15/20/28px" z FR-W1-5 nebyla implementována — audit ji nezadává jako
  konkrétní mapu tříd, jen směr. Implementace bez konkrétního rozhodnutí, které texty na jakou
  velikost, by byla hádání. Zúženo na měřitelnou, mechanickou část (16px pro pole na mobilu).
- Hlavička na mobilu záměrně zůstává na **2 řádcích** (shluk kalendářů + stav/historie), ne na 1 —
  design_review_70.md explicitně chtěl správu kalendářů „VŽDY v horní liště, na všech šířkách"; její
  úplné schování za „Další ▾" by tuto dřívější FR zrušilo. FR-W1-3 je tak vyřešena jako „hlavička se
  nikdy nezalomí do NEPŘEDVÍDATELNÉHO počtu řádků" (max. 2, měřeno), ne doslovně „jeden řádek".

## 1. Requirements

- **FR-W1-1**: Jediný zdroj pravdy pro 900px zlom v JS (`useIsMobile()`/`useIsWide()` z
  `src/hooks/useBreakpoint.ts`), používaný v `page.tsx`, `CatalogPanel.tsx`, `ScheduleGrid.tsx`.
- **FR-W1-2**: Zlom se korigují přes `useLayoutEffect` (isomorfní fallback na `useEffect` na
  serveru), ne `useEffect` — žádný viditelný „flash" špatné větve na mobilu při prvním vykreslení.
- **FR-W1-3**: Shluk správy kalendářů v `Toolbar.tsx` (`flex-nowrap overflow-x-auto`) se nikdy
  nezalomí na 2 řádky bez ohledu na délku jména/počet kalendářů; hlavička jako celek zůstává max.
  na 2 odlišných řádcích (měřeno přes `getBoundingClientRect().top`).
- **FR-W1-4**: Toast (`showChangeToast`) na mobilu nikdy nepřekrývá spodní navigaci — jeho spodní
  okraj zůstává nad horním okrajem `<nav>` i se `safe-area-inset-bottom`.
- **FR-W1-5**: Každé `<input>`/`<select>`/`<textarea>` na mobilu (<900px) má vypočtený
  `font-size ≥ 16px`.
- **FR-W1-6**: `document.fonts` obsahuje `FontFace` s `family` odpovídající `/Inter/i` a
  `status === 'loaded'`; `body`'s computed `font-family` obsahuje `Inter` (přes next/font
  vygenerovaný název).

## 2. Acceptance criteria

- **AC-1** (FR-W1-1/2): žádný `matchMedia('(max-width: 899.98px)')` mimo `useBreakpoint.ts` —
  ověřeno manuální revizí (`grep` po refaktoru vrací jen 1 výskyt). Celá E2E sada (816 testů, 6
  profilů) zůstává zelená — breakpoint-dependent testy (T-162/167/200-220) beze změny chování.
- **AC-2** (FR-W1-3): `test/specs/responsive.spec.ts` T-222 — dlouhé jméno kalendáře, hlavička má
  ≤2 odlišné řádky, shluk kalendářů má `scrollWidth ≥ clientWidth` (k dispozici vodorovný scroll).
- **AC-3** (FR-W1-4): T-221 — po přidání kroužku na kompaktním profilu je spodek toastu ≤ vrch `<nav>`.
- **AC-4** (FR-W1-5): T-223 — `getByLabel('Název kalendáře')` má na kompaktním profilu
  `font-size ≥ 16`.
- **AC-5** (FR-W1-6): T-224 — `body`'s font-family matchuje `/Inter/i`, `document.fonts` má
  `loaded` Inter `FontFace`.

## 3. Non-goals / notes

- Vlna 2 (FR-W2-1 až FR-W2-5: landscape layout, hustota mřížky podle výšky, pevné sloupce dnů,
  tabletové zlomy 768/1180px, sjednocený layout stav) a Vlna 3 (FR-W3-1 až FR-W3-8: drag&drop,
  návrh alternativních termínů, multi-dítě překryv, sdílený odkaz, poctivá ARIA mřížka, tokenizace
  dark modu, decluttering toolbaru, plná klávesová sada) zůstávají DRAFT v `design_review_73.md` —
  čekají na další rozhodnutí uživatele, která vlna má pokračovat.
- Vizuální baseline (`toolbar.png` na všech 6 profilech, mobilní `empty-info.png`/`catalog-filtered.png`)
  přegenerovány — Inter má jinou metriku než systémový font a 16px pole mění výšku/šířku vstupů na
  mobilu.
