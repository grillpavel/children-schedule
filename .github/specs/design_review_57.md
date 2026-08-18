# Design Review 57 — Mobilní sheet: bez textu „sklo“, maximalizovat/minimalizovat místo pruhu

**Status:** IMPLEMENTED
**Change ID:** CHANGE-58 (app `@krouzky/web`: mobilní spodní sheet detailu ztrácí ruční přepínač skla a
dostává explicitní ikonu maximalizovat/minimalizovat místo dekorativního posuvného pruhu; navíc oprava
dalšího výskytu přepočtu ceny na měsíc na Home obrazovce, nalezeného při této revizi)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** tři nahlášené drobnosti v hlavičce mobilního spodního sheetu detailu kroužku: (1) zavírací
„x“ je v pořádku, beze změny; (2) textový přepínač „Sklo"/„Bez skla" je matoucí vývojářský žargon a má
zmizet; (3) prostřední dekorativní pruh (jen vizuální náznak „lze táhnout") má být nahrazen jasnou ikonou
maximalizovat/minimalizovat se stejnou funkcí, jakou už přepínání velikosti sheetu má.

## 0. SOTA analysis

- **0.1 Problem.**
  - Hlavička sheetu (`page.tsx`, mobilní spodní sheet z CHANGE-27/55) měla tři ovládací prvky vedle sebe:
    zavírací „x" (`Zavřít detail`), prostřední `flex-1` tlačítko s jen dekorativním pruhem
    (`<span className="h-1.5 w-12 rounded-full bg-slate-300" />`) přepínající `sheetExpanded`, a napravo
    textové tlačítko „Sklo"/„Bez skla" přepínající `glassOff` (jeden ze čtyř povinných způsobů vypnutí
    skla z CHANGE-31, C9-B3).
  - Textové „Sklo"/„Bez skla" je interní pojem z implementace liquid-glass efektu (CHANGE-31), ne něco, co
    běžný rodič očekává v UI vlastního rozvrhu — zmatečné, bez vysvětlení co dělá.
  - Prostřední pruh sice fungoval (přepínal `sheetExpanded` mezi `h-60`/`h-[70vh]`), ale vypadal jako
    netříznou dekoraci/„grabber" bez zjevné akce — nekomunikoval, že klik něco udělá, natož co přesně.
- **0.2 Approach.**
  - Odstraněn celý ruční přepínač skla: state `glassOff`, oba `useEffect` (čtení/zápis
    `sessionStorage`/`dataset.glass`) i tlačítko. Zbývají **tři** automatické cesty vypnutí skla beze
    změny (`@supports not backdrop-filter`, `prefers-contrast: more`, `prefers-reduced-transparency:
    reduce`) — odstraněno i mrtvé CSS pravidlo `[data-glass='off'] .glass`, které bez tlačítka nikdy nikdo
    nenastaví.
  - Prostřední tlačítko nese nově explicitní ikonu (nové `IconMaximize`/`IconMinimize` v `Icons.tsx`, styl
    šipek do rohů/od rohů) místo dekorativního pruhu — **stejná** existující logika přepínání
    `sheetExpanded` (h-60 ↔ h-[70vh]) a **stejné** přístupné názvy („Zvětšit detail"/„Zmenšit detail"),
    jen s viditelnou, srozumitelnou ikonou namísto abstraktního pruhu. Tlačítko je nyní pevná velikost
    44×44 px (bylo `flex-1` přes celou šířku) a spolu se zavíracím „x" tvoří dvojici na opačných rozích
    hlavičky — vzor blízký nativním okenním ovladačům (zavřít vlevo, maximalizovat/minimalizovat vpravo).

## 1. Requirements

- **FR-1** Hlavička mobilního sheetu detailu neobsahuje žádný text „Sklo"/„Bez skla" ani jiný odkaz na
  interní pojem "sklo"/glass.
- **FR-2** Prostřední ovládací prvek hlavičky je tlačítko s ikonou, které při kliknutí zvětší sheet na
  téměř celou výšku obrazovky (zobrazí všechny informace) a ikona se změní na „minimalizovat"; opětovné
  kliknutí zmenší sheet zpět na původní výšku a ikona se vrátí na „maximalizovat".
- **FR-3** Zavírací „x" zůstává funkčně i vizuálně beze změny.
- **FR-4** Dlaždice „Náklady“ na Domů obrazovce zobrazuje skutečně zadanou částku a období (nikdy
  přepočet na měsíc), stejně jako ostatní místa opravená CHANGE-57.

## 2. Acceptance criteria

- **AC-1** (FR-1) `page.getByRole('button', { name: /Bez skla|Sklo/ })` nikde v DOM neexistuje. **T-307**
  přepsán na ověření jen automatické cesty (`prefers-contrast: more`). **T-403** (visual) druhou baseline
  („vypnuté sklo") vyvolává přes `emulateMedia({ contrast: 'more' })` místo kliknutí na odstraněné
  tlačítko.
- **AC-2** (FR-2) Tlačítko `aria-label` přepíná mezi „Zvětšit detail"/„Zmenšit detail" (beze změny přístup.
  názvu — testy T-140/T-155 aj. používající tento název zůstávají zelené); uvnitř je `IconMaximize`, po
  kliknutí `IconMinimize`.
- **AC-3** `tsc --noEmit` (web) čisté; plná E2E `--workers=1` zelená; vizuální baseline `sheet-glass-on/
  off` přegenerovány (změněná ikona uvnitř hlavičky sheetu).
- **AC-4** (FR-4) Domů obrazovka nikde neobsahuje `monthlyCzk`; dlaždice „Náklady“ používá
  `view.summary.costByPeriod` přímo.

## 3. Non-goals / notes

- Automatické cesty vypnutí skla (`@supports`, `prefers-contrast`, `prefers-reduced-transparency`) zůstávají
  beze změny — jen ruční UI přepínač byl odstraněn coby matoucí.
- Nahrazení pruhu ikonou nemění chování „lze zavřít i tažením/gestem" — sheet nikdy nepodporoval swipe
  gesto (`BL-033` to už sleduje jako otevřenou položku), jen tap na tlačítka.
