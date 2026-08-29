# Design Review 73 — Velký UI/UX/responzivní redesign (after_review_71, HTML audit)

**Status:** DRAFT — čeká na prioritizaci, NEIMPLEMENTOVÁNO
**Change ID:** (nepřiděleno — přidělí se při implementaci první vlny)
**Date:** 2026-08-29
**Repo:** monorepo `Children_schedule`, dotkne se `apps/web` napříč layoutem/breakpointy/a11y
**Trigger:** Uživatel sdílel `.github/audit/after_review_71/Audit Planovac krouzku.dc.html` — rozsáhlý
UI/UX/responzivní audit (mobil portrait/landscape, tablet, desktop, vizuální systém, funkcionalita).
Samostatný, menší **funkční audit chyb** je zpracován a IMPLEMENTOVÁN v `design_review_72.md`/CHANGE-80.

## 0. SOTA analýza

### 0.1 Metoda — validace před plánováním (stejný postup jako u minulých velkých auditů)

7 nejpřekvapivějších/nejdopadovějších tvrzení ověřeno subagentem přímo proti zdroji (ne odhadem):

| # | Tvrzení | Ověřeno |
|---|---|---|
| 1 | 900px breakpoint definovaný **na 4 místech** nezávisle (`tailwind.config.ts` `desk:900px`, plus JS `matchMedia('(max-width: 899.98px)')` samostatně v `page.tsx`, `CatalogPanel.tsx` I `ScheduleGrid.tsx`) | ✅ PRAVDA — 4 místa, ne 3 |
| 2 | `isMobile`/`isWide` v `page.tsx` startují na `useState(false)` → první vykreslení na mobilu je krátce desktopová větev, než efekt s `matchMedia` přepne | ✅ PRAVDA |
| 3 | Globální CSS pravidlo je `button:not(.no-min-target){min-height:24px;min-width:24px}` (`globals.css`), ale konkrétní prvky (šipky ‹›, undo/redo, „✕" na odebrání kalendáře) mají 28px nebo méně — pod 44px ergonomickým standardem | ✅ PRAVDA (28px u šipek/undo-redo, ~16px u „✕") |
| 4 | `font-family: Inter, system-ui, sans-serif` je v `globals.css`, ale Inter se nikde reálně nenačítá (žádný `next/font/google`, žádný `@font-face`) — appka běží na systémovém fontu | ✅ PRAVDA |
| 5 | `ScheduleGrid.tsx`'s `role="grid"` obaluje jen JEDEN `role="row"` se všemi dny vedle sebe — odečítač ohlásí „řádek 1 z 1" | ✅ PRAVDA |
| 6 | Landscape na mobilu nemá žádný vlastní layout (žádné `orientation` media query/JS check) | ✅ PRAVDA (žádný nález v celém `apps/web/src`) |
| 7 | Toast „Zpět" (`bottom-16` = 64px) nepočítá se `safe-area-inset-bottom` spodní navigace (48px + až 34px na iPhone s home indikátorem = 82px) — na noteched iPhonech je toast pod navigací | ✅ PRAVDA |

Zbytek nálezů (desítky menších bodů napříč §01–§07 HTML reportu) NEBYL jednotlivě ověřován kód-po-kódu
kvůli rozsahu — considerujte je jako **nepotvrzené, ale věrohodné** (audit má u výše ověřených bodů
100% přesnost, žádné faktické chyby jako u některých dřívějších externích auditů).

### 0.2 Proč DRAFT, ne rovnou implementace

Toto NENÍ sada nezávislých bug-fixů (jako `design_review_72.md`) — je to **návrh přestavby layoutu**
napříč všemi breakpointy (mobil portrait i landscape, tablet, desktop), včetně: nové landscape
rozhraní s bočním railem, tabletového master-detail, tokenizace dark modu, ARIA přepisu mřížky na
řádky-po-hodinách, drag & drop pro vlastní události, sdílení rozvrhu URL odkazem a překryvu více dětí
v jedné mřížce. Implementace naslepo by znamenala:
- přegenerovat VŠECHNY vizuální baseline (mřížka/toolbar/empty states na všech 6 profilech),
- riziko regrese v desítkách existujících testů vázaných na dnešní breakpointy (900/1440px) a DOM
  strukturu mřížky,
- žádnou cestu zpět, kdyby některá část návrhu uživateli nesedla po zhlédnutí.

Proto: konsolidovaný seznam FR kandidátů rozdělený do vln (audit sám navrhuje 3 vlny podle rizika/
náročnosti) — uživatel vybere, která vlna/FR se má implementovat jako první, pak vznikne konkrétní
`design_review_<n>.md`/`CHANGE-<id>` pro TU vlnu.

## 1. Kandidáti na FR — podle vlny z auditu

### Vlna 1 — nízké riziko, žádná změna datového modelu (dny až ~1 týden)
- **FR-W1-1**: Sjednotit zdroj breakpointu 900px na JEDNO místo (custom hook/kontext), zrušit
  duplicitní `matchMedia` volání v `page.tsx`/`CatalogPanel.tsx`/`ScheduleGrid.tsx`.
- **FR-W1-2**: `isMobile`/`isWide` inicializovat ze skutečné šířky při prvním renderu (ne `false`),
  ať nezabliká desktopová větev na mobilu.
- **FR-W1-3**: Hlavička (Toolbar) na mobilu nikdy nezalomí do 2–3 řádků — jeden pevný řádek s
  ellipsis na dlouhá jména, zbytek pod „Další ▾"/sheetem.
- **FR-W1-4**: Toast (`bottom-16`) respektuje `safe-area-inset-bottom` spodní navigace (~82px na
  iPhone s home indikátorem), ne pevných 64px.
- **FR-W1-5**: Typografická škála 13/15/20/28px místo dnešního jednoho pásma 10–12px; pole (`input`)
  min. 16px font, ať iOS Safari nezoomuje při fokusu.
- **FR-W1-6**: Buď Inter reálně načíst (`next/font/google`), nebo deklaraci odstranit a psát na
  systémový font stack záměrně.

### Vlna 2 — střední rozsah (týdny)
- **FR-W2-1**: Landscape na mobilu (příčná orientace, úzká výška) dostane vlastní layout — boční
  rail (56px) místo spodní navigace, mřížka dostane většinu výšky.
- **FR-W2-2**: Hustota časové osy v mřížce reaguje na dostupnou výšku, ne jen na šířku (`HOUR_PX`
  jako proměnná, ne konstanta).
- **FR-W2-3**: Sloupce dnů v mobilní mřížce mají pevnou minimální šířku (scroll vodorovně), ne
  `1fr/7`, která je při kolizi nečitelná (23px sloupec).
- **FR-W2-4**: Tabletové breakpointy 768px (dva sloupce) a 1180px (tři sloupce) — dnešní jediný
  zlom 900px řadí všechny běžné tablety na výšku do „telefonního" UI.
- **FR-W2-5**: Jeden React stav řídící layout napříč šířkami s CSS-driven přeskládáním (ne remount
  komponent) — zachová pozici scrollu/výběru při rotaci/resize.

### Vlna 3 — větší, může měnit datový model nebo interakční vzory
- **FR-W3-1**: Drag & drop pro vlastní události (pointer events, snap po 5 min, klávesová obdoba
  povinná) — katalogové kroužky zůstávají needitovatelné (termín určuje poskytovatel).
- **FR-W3-2**: Návrh alternativních (nekolidujících) termínů téhož kroužku při kolizi, ne jen
  hlášení — domain motor na to už částečně počítá (`suggestVariantSwitches` existuje, BL-027).
- **FR-W3-3**: Překryv rozvrhů více dětí v jedné mřížce (rodič řeší „stihnu odvézt obě") — motor
  kolizí napříč dětmi už funguje (H9/`detectTightTransfers`), UI ne.
- **FR-W3-4**: Sdílený odkaz na rozvrh (serializace do URL fragmentu nebo podobně) — appka nemá
  backend, takže „nejmenší varianta" z auditu.
- **FR-W3-5**: ARIA mřížka přepsaná na poctivé řádky-po-hodinách (nebo `aria-hidden` + textová
  souhrnná alternativa pro odečítače) — dnešní 1-řádková struktura je zavádějící.
- **FR-W3-6**: Tokenizace dark modu — nahradit `.text-slate-400{color:...}`-styl přepisy utility
  tříd v `globals.css` skutečnými CSS proměnnými, ať nová třída bez ruční dark-mapace nerozbije dark
  mode (viz opakovaný gotcha z CHANGE-44/rewrite).
- **FR-W3-7**: Toolbar zúžit na identitu+historii+export — Věk/Přesun přesunout do panelu Děti,
  Barva do detailu kroužku (dnes 9 nesouvisejících věcí v jedné liště na desktopu).
- **FR-W3-8**: Plná klávesová sada v mřížce (↑/↓ mezi časovými sloty, Enter na zápis, Delete na
  odebrání, `/` skok do hledání, klávesa na přepnutí Den/3dny/Týden/Měsíc).

## 2. Co ponechat beze změny (audit sám to uvádí jako „udělané dobře")
- Konflikt nese barvu i textový odznak (ne jen barvu).
- Tři nezávislé cesty vypnutí skleněného efektu (`@supports`, `prefers-contrast`,
  `prefers-reduced-transparency`).
- Prázdný stav rozvrhu jako skutečný onboarding.
- Tiskový styl (A4 na šířku + tabulkový přehled).
- Agenda jako plnohodnotný mobilní pohled, spodní navigace, autosave.

## 3. Non-goals / notes
- Zbylé desítky drobnějších nálezů z HTML reportu (např. „now-line" přes hlavičku dne, hover-jen
  odznaky v mřížce) nebyly jednotlivě ověřeny — při výběru konkrétní vlny k implementaci je nutné je
  validovat proti aktuálnímu kódu stejně důkladně jako těch 7 výše, ne implementovat naslepo.
- Žádná vlna nebyla implementována v tomto spec — čeká na rozhodnutí uživatele, která vlna/FR má
  prioritu. Až se vybere, vznikne konkrétní `design_review_<n+1>.md` + `CHANGE-<id>` jen pro tu část.
