# Design Review 66 — Konsolidace tří „Spec-Driven Development" dokumentů v7 (design systém + ergonomie)

**Status:** DRAFT
**Change ID:** CHANGE-67 (kandidát — **NEEDS INPUT**, viz §3; scope by byl app `@krouzky/web` (+ případně
`@krouzky/domain` pro `ConflictKind`), žádná část zatím neimplementována)
**Date:** 2026-08-19
**Repo:** monorepo `Children_schedule` (apps/web)
**Trigger:** tři nahrané dokumenty v7 (sedmé kolo, tentokrát psané jako formální „Spec-Driven Development"
specifikace s tokeny, komponentami a Given/When/Then akceptačními kritérii, ne jako volný audit):
`analysis_66_a.md` (73 bodů, „v4.2" — design tokeny + ergonomie + kolizní matematika + kód komponent),
`analysis_66_b.md` (8 sekcí, P0–P2 prioritizace, DoD), `analysis_66_c.md` (73 bodů, nejobsáhlejší — plný
„design system governance" dokument s datovým modelem, „What Fits" enginem, QA maticí, analytics, success
metrics). Všechny tři popisují STEJNOU cílovou vizi (jednotný design systém + ergonomicky odlišná
kompozice + kolizní engine + „What Fits" doporučovač) jako `analysis_65_a/b/c.md` (v6, viz
`design_review_65.md`/CHANGE-66) — jde z velké části o rozšíření/formalizaci téhož zadání s konkrétnějším
kódem a akceptačními kritérii, ne o novou vizi.

## 0. SOTA analýza

### 0.1 Problém — křížová kontrola proti skutečnému kódu A proti již existujícímu backlogu

Stejný postup jako `design_review_65.md`: každé tvrzení ověřeno proti aktuálnímu zdrojovému kódu, NE
převzato na slovo. Navíc tentokrát i druhá kontrola — proti `docs/backlog.md`, protože v7 z velké části
popisuje přesně to, co `design_review_65.md` (CHANGE-66, o den dřív) už zanalyzoval a zapsal jako
BL-039 až BL-045. Klíčové zjištění tohoto review: **naprostá většina bodů v7 je buď už hotová, nebo už
existuje jako otevřená položka backlogu z minulého kola — v7 přidává hlavně detailnější formulaci a kód,
ne novou vizi.**

**Tvrzení, která jsou už HOTOVÁ (ověřeno v kódu):**

| # | Tvrzení (a/b/c) | Skutečný stav | Zdroj |
|---|---|---|---|
| 1 | Bottom nav 4 taby Domů/Kroužky/Rozvrh/Děti, `safe-area-inset-bottom`, `h-[100dvh]` | **Hotovo.** `page.tsx`: `nav` má `pb-[env(safe-area-inset-bottom,0px)]`, root `h-dvh` (CHANGE-29/55). | page.tsx |
| 2 | Tap-to-assign místo drag & drop na mobilu | **Duch splněn jinou cestou.** V aplikaci NEEXISTUJE drag & drop nikde (zrušeno už CHANGE-12) — mřížka se plní tapem na ghost sloty NEBO tlačítkem „Přidat do rozvrhu" v detailu. Doslovná choreografie z a) (tap „+" na kartě → auto-přepnutí na Rozvrh → zvýraznění zelených slotů) NENÍ implementována — dnešní tok (karta → detail sheet → „Přidat do rozvrhu") je funkčně rovnocenný (žádné gesto, dva tapy), jen jinak naaranžovaný a rozsáhle otestovaný (T-132, T-211 aj.). Neměnit bez silného zdůvodnění. | ScheduleGrid.tsx, memory CHANGE-12 |
| 3 | Non-blocking undo toast s tlačítkem ZPĚT, 4 s | **Hotovo (CHANGE-50/61).** Žádný `confirm()`, okamžité odebrání, toast 4 s, tlačítko „Zpět". | page.tsx, plannerStore.ts |
| 4 | Tablet landscape master-detail (katalog / detail-rozvrh) | **Hotovo (CHANGE-64).** Trvalý sloupec 900–1439 px, bez overlay. | page.tsx |
| 5 | Textové primární tlačítko „Přidat do rozvrhu" (ne holé „+") | **Hotovo.** `DetailsPanel.tsx` používá plný text, nikde v primárním flow není bare „+" bez labelu. | DetailsPanel.tsx |
| 6 | Explicitní volba termínu (session picker), ne automatické přidání všech | **Hotovo** (potvrzeno už v `design_review_65.md` bod 2). | DetailsPanel.tsx |
| 7 | Duplicate handling — stejný termín nelze přidat 2×? | **Hotovo, jinou UX cestou.** `enrollGroup()` v `plannerStore.ts`: klik na již zapsanou skupinu ji TOGGLE odebere, nikdy nevznikne druhý duplicitní záznam. Analýza navrhuje hlášku „Tento termín už v rozvrhu máte" a zablokování — dnešní toggle chování je striktně silnější záruka (structurally nemožné mít duplicitu), jen jinak komunikovaná. Neměnit bez důvodu. | plannerStore.ts `enrollGroup` |
| 8 | Snackbar nesmí překrývat bottom nav / primární CTA | **Hotovo.** Toast je `bottom-16` (64 px od spodu), bottom nav `h-12` (48 px) — toast je nad navigací, bez překryvu. | page.tsx |
| 9 | Volné dny v rozvrhu bez tečkovaného pozadí | **Hotovo.** Nikde v `ScheduleGrid.tsx`/`MonthView.tsx` není dot-pattern; prázdné buňky mají plnou barvu pozadí. | MonthView.tsx |
| 10 | Escape zavře bottom sheet | **Hotovo (CHANGE-55/C9-A4).** Globální `keydown` handler ruší výběr → sheet se zavře. | page.tsx |
| 11 | Barevné tokeny (`--color-success/-warning/-danger` sémantika) | **Částečně hotovo.** `globals.css` má `--success/-warning/-danger` (+ `-text` varianty) už od CHANGE-28/37/38 — barvy jsou sémantické tokeny, ne náhodné hex hodnoty. | globals.css |

**Tvrzení, která jsou PRAVDIVÁ, ale ODPOVÍDAJÍ JIŽ EXISTUJÍCÍ POLOŽCE BACKLOGU (viz `design_review_65.md`,
o den starší) — v7 je jen formálněji popisuje, nejde o nový scope:**

| # | Tvrzení (a/b/c) | Existující backlog | Poznámka |
|---|---|---|---|
| 12 | „What Fits?"/„Najít volné místo" jako primární CTA s vysvětlením doporučení | `BL-040` | v7 přidává konkrétní ranking pořadí (no-conflict → age → day → category → budget → distance) — užitečné jako budoucí implementační detail, zapsáno do BL-040. |
| 13 | Rodinná/multi-dítě kolize (`FAMILY` conflict type) | `BL-041` | v7 formalizuje jako čtvrtý `ConflictKind` typ vedle TIME/TRAVEL/DUPLICATE — zapsáno do BL-041. |
| 14 | Cenový rozsahový filtr + „zahrnout bez ceny" | `BL-042` | beze změny scope. |
| 15 | Silnější/„command-center" vyhledávání | `BL-043` | beze změny scope. |
| 16 | Automatizovaná QA responsive/kolizní matice na každém nasazení | `BL-044` | v7 přidává konkrétní matici rozlišení (320×568 … 1440×900) a kolizních edge-case (adjacent intervals, 1-min gap, containment) — hodnotné jako budoucí test-plán, zapsáno do BL-044. |
| 17 | Systematický touch-target audit (44–48 px) | `BL-045` | beze změny scope. |
| 18 | 3-stavový vizuální slovník kolizí (🟢/🟠/🔴) na kartách katalogu, ne jen v mřížce | `BL-039` | beze změny scope — `conflictMessage` backend už hotovo (CHANGE-66), zbývá jen kartová UI vrstva. |

**Tvrzení, která jsou PRAVDIVÁ a JSOU skutečně nová (nekryje je žádná existující položka backlogu):**

| # | Nález | Důkaz | Riziko zavedení hned |
|---|---|---|---|
| 19 | Žádný systém spacing/radius tokenů — komponenty míchají `rounded-md`/`rounded-lg`/`rounded-xl`/`rounded-2xl`/`rounded-full` bez systémového pravidla naprosto volně (146 výskytů v 9 souborech, často different radius pro vizuálně stejnou roli — např. input pole mají `rounded-md` i `rounded-lg` na různých místech). Barevné tokeny existují (bod 11), ale radius/spacing ne. | `apps/web/src/components/*.tsx` (Toolbar, CatalogPanel, DetailsPanel, CustomEntryDialog, HomeScreen mixují všechny 4 radius třídy) | **VYSOKÉ** — plošná unifikace by změnila vizuální rozměry desítek prvků najednou → nutná regenerace prakticky všech vizuálních baseline (`visual.spec.ts`), vysoké riziko regresí bez jasného funkčního přínosu (jen kosmetická konzistence). |
| 20 | Bottom sheet nejde zavřít klikem na backdrop (klik mimo sheet） — dnes žádný dimming/backdrop overlay neexistuje, obsah nad sheetem zůstává interaktivní (to je ZÁMĚR — uživatel může přepínat spodní navigaci i s otevřeným sheetem, ověřeno v kódu `mobileTab !== 'details'` podmínkou). | `page.tsx` (mobilní sheet blok, žádný `backdrop`/`overlay` prvek) | **STŘEDNÍ** — přidání by mohlo rozbít existující (byť netestovaný explicitně) tok „přepni tab se sheetem otevřeným"; vyžaduje přesné vymezení oblasti backdropu, aby nepřekrylo funkční bottom nav. |

### 0.2 Přístup

- Body 1–11 jsou hotové — žádná akce.
- Body 12–18 už mají řádek v `docs/backlog.md` (BL-039..045) — jen doplním detaily z v7 do textu
  existujících řádků, nezakládám duplicitní nové položky.
- Bod 19 (design token systém pro radius/spacing) je legitimní, ale VELKÝ a RIZIKOVÝ zásah bez jasné
  okamžité funkční hodnoty (jen vizuální konzistence) — navrhuji **novou položku BL-046**, ne okamžitou
  implementaci; plošná změna bez skutečné byznys potřeby by rozbila desítky vizuálních baseline pro nulový
  funkční zisk, což je přesně to, čemu se má agent vyhýbat (`implementationDiscipline` — neopravovat, co
  nikdo nežádal opravit funkčně).
- Bod 20 (backdrop-click-to-close) je menší, ale koliduje s dosud NEOTESTOVANÝM, ale zdá se ZÁMĚRNÝM
  chováním (přepínání tabů se otevřeným sheetem) — **NEEDS INPUT**, viz §3, než se do toho sáhne.
- **Závěr tohoto review**: na rozdíl od `design_review_58.md`→CHANGE-60..66 (v5/v6 kola), toto v7 kolo
  NEPŘINÁŠÍ žádnou položku, kterou by bylo možné zodpovědně implementovat ihned s nízkým rizikem. Jde buď
  o už hotové věci, o duplicitu existujícího backlogu, nebo o velké/rizikové zásahy vyžadující vlastní
  rozhodnutí o prioritě. Proto tento DRAFT **nezakládá žádné FR k okamžité implementaci** — jen aktualizuje
  `docs/backlog.md` (BL-039/040/041/044 dostávají doplňující detail z v7) a přidává jednu novou položku
  (BL-046).

## 1. Requirements

Žádné nové FR k okamžité implementaci — viz §0.2. Existující otevřené položky (`BL-039`, `BL-040`,
`BL-041`, `BL-042`, `BL-043`, `BL-044`, `BL-045`) zůstávají v platnosti beze změny priority; nová `BL-046`
založena pro design token systém (radius/spacing).

## 2. Acceptance criteria

Nevztahuje se — žádný FR. Pokud uživatel zvolí zahájit některou z `BL-039..046`, dostane vlastní
`design_review_<n>.md` s FR/AC v okamžiku zahájení (stejný postup jako u `BL-034`'s dřívějších fází).

## 3. Non-goals / notes — otázka k rozhodnutí a shrnutí stavu backlogu

**NEEDS INPUT:** chcete, abych bod 20 (backdrop-click-to-close u mobilního sheetu) přesto zahájil jako
malý samostatný `CHANGE`? Vyžaduje to napřed ověřit/rozhodnout, zda „přepnutí spodní navigace se sheetem
otevřeným" je skutečně žádané chování, nebo jen vedlejší efekt současné implementace, který lze obětovat.

Aktualizace existujících backlogových položek (viz `docs/backlog.md`):

- `BL-040` doplněn o konkrétní pořadí rankingu doporučení z `analysis_66_c.md` §47 (no-conflict → age
  match → preferred day → preferred category → budget → distance, deterministicky).
- `BL-041` doplněn o formální čtvrtý `ConflictKind`: `FAMILY` (souběh dvou dětí na různých místech ve
  stejný čas — rodič nemůže doprovodit obě), vedle existujících `TIME`/`TRAVEL` typů v doméně.
- `BL-044` doplněn o konkrétní QA matici rozlišení a kolizních edge-case z `analysis_66_c.md` §60–61.
- Nová **BL-046**: jednotný systém spacing/radius design tokenů (dnes jen barevné tokeny v `globals.css`
  existují — `rounded-*` třídy jsou v `apps/web/src/components/*.tsx` míchány bez systémového pravidla).
  Velký, rizikový zásah (desítky vizuálních baseline) — čeká na vlastní rozhodnutí o prioritě, ne
  jednorázová oprava.

Vědomě NEŘEŠENO (mimo scope, viz §0.1 tvrzení 1–11): bottom nav (hotovo), tap-to-assign (duch splněn
jinak), non-blocking undo (hotovo), tablet master-detail (hotovo), textové CTA (hotovo), session picker
(hotovo), duplicate handling (hotovo jinak — toggle), snackbar pozice (hotovo), tečkované pozadí volných
dnů (neexistuje, tedy hotovo), Escape (hotovo), barevné tokeny (hotovo).
