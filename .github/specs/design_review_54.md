# Design Review 54 — Mobile & tablet usability fix: safe-area, sheet lifecycle

**Status:** IMPLEMENTED
**Change ID:** CHANGE-55 (app `@krouzky/web` only: iOS safe-area pro spodní navigaci/sheet, automatické zavření
mobilního sheetu po přidání kroužku, explicitní tlačítko „Zavřít")
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** dvě externí analýzy (`analysis_53_a.md`, `analysis_53_b.md`) nahlásily P0 mobilní chyby: spodní
navigace může být na iOS Safari překrytá systémovou lištou a mobilní detail-sheet po přidání kroužku
zůstává trvale otevřený.

## 0. SOTA analysis

- **0.1 Problem.** Ověřeno v kódu (ne jen v analýze): (a) kořenový kontejner `page.tsx` používal `h-screen`
  (`100vh`), který na iOS Safari nezohledňuje dynamickou (schovávající se) adresní lištu — při viditelné liště
  přetéká skutečnou výšku viewportu; nikde v appce nebyl použit `env(safe-area-inset-bottom)`, ačkoli
  `viewport-fit=cover` je nastaven už od CHANGE-28. (b) `SelectedActivity` (DetailsPanel) po `enrollGroup(...)`
  z primárního tlačítka „Přidat do rozvrhu" nevolala nic, co by zavřelo výběr — mobilní spodní sheet
  (`page.tsx`) zůstával zobrazený (teď jen s jiným obsahem: „V rozvrhu" + „Odebrat z rozvrhu"). Sheet navíc
  neměl žádné explicitní tlačítko zavření (jen odkaz „← Zpět na souhrn" uvnitř scrollovatelného obsahu).
- **0.2 Approach.**
  - Nahradit `h-screen` (`100vh`) za Tailwind `h-dvh` (`100dvh`, podporováno od Safari 15.4) na kořenovém
    shellu — sheet i nav se tak vejdou do skutečně viditelné výšky bez ohledu na stav adresní lišty.
  - Spodní navigace (`<nav>`) dostává `padding-bottom: env(safe-area-inset-bottom, 0px)` — protože nav je
    normální flex položka (ne `position: fixed`), flexbox automaticky zmenší `<main>` o její (i vyšší)
    výšku; žádná ruční kompenzace paddingu na `<main>` není potřeba (na rozdíl od `analysis_53_a.md`, která
    počítala s `position: fixed` navigací — v naší architektuře to není tento případ).
  - Mobilní sheet dostává stejný safe-area posun (`margin-bottom: env(safe-area-inset-bottom, 0px)` navíc
    k nezměněné `bottom-12`), aby na zářezovaných zařízeních nezůstal schovaný pod (teď vyšší) navigací —
    a aby zůstal beze změny stabilní CSS selektor `.fixed.inset-x-0.bottom-12`, na který se váže locator ve
    čtyřech testovacích souborech (`panel.spec.ts`, `schedule.spec.ts`, `persistence.spec.ts`, `a11y.spec.ts`).
  - `DetailsPanel`/`SelectedActivity` dostává volitelný `onEnrolled` callback, volaný **jen** z primárního
    CTA „Přidat do rozvrhu" (ne z „Varianty docházky" ani „Odebrat z rozvrhu"). `page.tsx` ho předá **jen**
    instanci `DetailsPanel` v mobilním sheetu — desktopový/medium panel se chová beze změny (žádný test ani
    UX tam autoclose nečeká; uživatel má vidět potvrzující stav „V rozvrhu").
  - Sheet dostává explicitní tlačítko „Zavřít" (44×44 px, ikona `IconClose`) vedle úchytu pro
    zvětšení/zmenšení — nezávislé na scrollování k odkazu „Zpět na souhrn".
- **Alternativy zamítnuty.**
  - **Plný modal s zatemněným pozadím (backdrop) podle `analysis_53_b.md`.** Zamítnuto — současný sheet je
    záměrně neblokující „peek" (CHANGE-27, C8-F7): uživatel může dál procházet mřížku pod ním. Přidání
    plného backdropu by tuto vlastnost odstranilo a je to větší architektonická změna, než vyžaduje oprava
    hlášené chyby (sheet zůstává trvale otevřený). Řeší se automatickým zavřením + viditelným tlačítkem.
  - **Gesto swipe-down-to-close.** Zamítnuto pro tuto specifikaci — vyžaduje gesture-tracking knihovnu
    (`vaul` apod.), větší dopad na kód a test-harness (Playwright touch-drag simulace je křehká). Tažení za
    úchyt dnes přepíná zvětšení/zmenšení; zavření řeší nové tlačítko + automatické zavření. Sledováno jako
    `BL-033`.
  - **Tabletový hybrid layout (768–1024 px, `analysis_53_b.md` §4.3).** Zamítnuto pro tuto specifikaci —
    vlastní analýza to označuje jako P2 s odhadem 1–2 dny závislým na P0. Vyžadovalo by posunout breakpoint
    `desk:` (900 px) nebo zavést třetí rozvržení mezi mobilem a `isWide`, což by se dotklo velkého množství
    existujících testů (`isCompact`/`isThreeColumn` helpery). Sledováno jako `BL-033`.
  - **Defaultní pohled Rozvrhu = Agenda na mobilu (§4.2) a zjednodušený mobilní header (§4.4).** Obojí je
    **už hotové** (`ScheduleGrid` `mobileAgendaMode` výchozí `'agenda'` od CHANGE-39; horní lišta na mobilu
    zeštíhlena už CHANGE-46/47/49) — bez nového kódu, jen ověřeno E2E.

## 1. Requirements

- **FR-1** Kořenový shell (`page.tsx`) používá `100dvh` (Tailwind `h-dvh`), ne `100vh` (`h-screen`), aby na
  iOS Safari nedocházelo k přetečení skutečné viditelné výšky viewportu.
- **FR-2** Mobilní spodní navigace (`<nav>`) rezervuje `env(safe-area-inset-bottom, 0px)` jako dodatečný
  spodní padding, aby nebyla zakrytá systémovou lištou / home indikátorem.
- **FR-3** Mobilní spodní sheet detailu je posunutý o stejnou safe-area hodnotu, aby zůstal nad (i vyšší)
  navigací na zářezovaných zařízeních.
- **FR-4** Po kliknutí na primární tlačítko „Přidat do rozvrhu" v mobilním sheetu se sheet automaticky
  zavře (výběr se zruší, sheet se zmenší). Kliknutí na „Odebrat z rozvrhu" nebo na položky v sekci „Varianty
  docházky" sheet nezavírá (zachovává výběr více termínů najednou).
- **FR-5** Mobilní sheet má vlastní tlačítko „Zavřít" (přístupný název, ≥44×44 px) nezávislé na scrollování.

## 2. Acceptance criteria

- **AC-1** (FR-1) Nový zdrojový test čte `apps/web/app/page.tsx` a ověřuje, že kořenový `<div>` shellu
  obsahuje třídu `h-dvh` a neobsahuje `h-screen`.
- **AC-2** (FR-2, FR-3) Tentýž test ověřuje přítomnost `env(safe-area-inset-bottom` alespoň dvakrát v
  `page.tsx` (navigace + sheet).
- **AC-3** (FR-4) **T-218** (nový, `panel.spec.ts` nebo `responsive.spec.ts`, jen kompaktní profily): po
  kliknutí na kartu z katalogu → „Přidat do rozvrhu" v mobilním sheetu sheet zmizí (detail není v DOM /
  `hasSelection` false) a spodní navigace je okamžitě klikatelná (přepnutí na jinou záložku funguje).
- **AC-4** (FR-5) **T-219** (nový, kompaktní profily): tlačítko „Zavřít" v sheetu je vidět, má výšku i šířku
  ≥44 px a jeho kliknutí sheet zavře i bez předchozího přidání do rozvrhu.
- **AC-5** Plná E2E `--workers=1` na všech 6 profilech beze změny v existujících testech (zejména T-130
  „klik na kartu otevře detail a kroužek nepřidá", T-211 „peek ukáže název i primární akci", T-213 „dotykové
  cíle ≥44 px" — nový close button touch target ověřen ad-hoc, ne v T-213); `tsc --noEmit` čisté; visual
  baseline beze změny (sheet snímky T-403 zachytávají zavřený/otevřený stav skla, ne obsah tlačítek — pokud
  se pixelově posune, přegenerovat).

## 3. Non-goals / notes

- Plný modal s backdropem — sheet zůstává záměrně neblokující „peek" (viz 0.2). Netýká se zavření po
  přidání, které řeší FR-4/FR-5.
- Gesto swipe-down-to-close — sledováno jako `BL-033`.
- Tabletový hybrid layout pro 768–1024 px (dnes `<900px` = mobilní layout, takže portrétní tablety typu
  iPad 834 px vypadají jako zvětšený mobil) — sledováno jako `BL-033`.
- Defaultní Agenda na mobilu a zjednodušený mobilní header jsou už hotové (CHANGE-39/46/47/49) — bez akce.
- Touch targety obecně (≥44 px) jsou z většiny hotové (CHANGE-47); toto review přidává jen nové tlačítko
  „Zavřít" se stejným standardem, plošný re-audit není v scope.
