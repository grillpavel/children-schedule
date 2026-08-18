# Design Review 65 — Konsolidace tří UX auditů v6 (mobil + tablet, po CHANGE-65)

**Status:** DRAFT
**Change ID:** CHANGE-66 (kandidát — **NEEDS INPUT** pro FR-12/FR-13, viz §3; FR-9/FR-10/FR-11/FR-14 jsou
nízkoriziková a lze je zahájit bez další diskuze. Scope app `@krouzky/web`, žádná část zatím
neimplementována.)
**Date:** 2026-08-19
**Repo:** monorepo `Children_schedule` (apps/web)
**Trigger:** tři nahrané dokumenty v6 (šesté kolo UX auditu, testováno proti živému buildu PO CHANGE-60
až CHANGE-65 z 2026-08-18): `analysis_65_a.md`, `_b.md`, `_c.md`. Všechny tři nezávisle testují stejnou
verzi aplikace (katalog → osobní plánovač po dokončení redesignu v5) s různým důrazem: **a)** krátký,
skóre-orientovaný audit mobil/tablet (8 bodů, celkové skóre 4,9/10); **b)** technický touch/interakční
audit s kolizní stresovou maticí a tabletovým split-view; **c)** nejobsáhlejší (42 bodů) — informační
architektura, kolizní systém, edge cases, touch/accessibility checklist, roadmapa P0–P2.

## 0. SOTA analýza

### 0.1 Problém — křížová kontrola tvrzení proti skutečnému kódu

Než byl napsán jakýkoli nový FR, byl každý nález ze všech tří dokumentů ověřen proti aktuálnímu zdrojovému
kódu (`apps/web/src`, `packages/domain/src`), ne jen odsouhlasen na slovo. Toto je požadovaný postup dle
`.github/instructions/dev-process.instructions.md` (viz i `design_review_58.md`'s stejný přístup u v5).

**Tvrzení, která jsou ve skutečnosti NEPŘESNÁ nebo už HOTOVÁ** (audit je psal proti staršímu vjemu, ne
proti aktuálnímu commitu, nebo nález nebyl reprodukovatelný v kódu):

| # | Tvrzení analýzy | Skutečný stav v kódu | Zdroj |
|---|---|---|---|
| 1 | (c#5) „anonymní Select" bez labelu mezi „Další filtry" a dny | Oba existující selecty (`Kategorie kroužku`, `Pořadatel kroužku`) mají explicitní `aria-label` (`CatalogPanel.tsx` řádky 658, 681). Nález není v aktuálním kódu reprodukovatelný — buď starší build, nebo axe/SR nuance, kterou nelze potvrdit bez živého screen-readeru. | CatalogPanel.tsx |
| 2 | (c#35/36) „musí být explicitní volba termínu, ne automatické přidání všech" | **Už přesně takto funguje.** `DetailsPanel.tsx` má `<select>Vyberte termín</select>`, který blokuje „Přidat do rozvrhu" dokud uživatel nevybere konkrétní `chosenVariant` (skupinu); vícetermínové aktivity se nikdy nepřidají „všechny najednou". Jediná mezera je zobrazení konce termínu na kompaktní kartě v seznamu (viz FR-9). | DetailsPanel.tsx ř. 214–248 |
| 3 | (a) „onboarding karta přetrvává" | `showOnboarding = !onboarded && view.summary.activityCount === 0` — mizí po odkliknutí NEBO po prvním přidání kroužku, podle libovolného z obou. Pokud se stále zobrazuje, jde o konkrétní repro krok (např. incognito/vymazaný localStorage), ne o obecnou vadu — nelze bez reprodukce tvrdit, že je to bug. | HomeScreen.tsx |
| 4 | (a) „Tablet je stále katastrofa", žádný specifický layout 768–1024 px | **CHANGE-64 (2026-08-18, den před těmito audity) už zavedlo trvalý master-detail sloupec pro 900–1439 px.** Zbývá jen dříve trackovaný `BL-033` bod 2 — portrétní tablet 768–899 px (`isCompact` hranice 900 px) pořád dostává mobilní layout. Toto NENÍ nová položka, jen potvrzení existující `BL-033`. | page.tsx, docs/backlog.md BL-033/036 |
| 5 | (a/b) „bottom navigation musí být P0" | **Už existuje přesně jak popsáno** — 4 taby Domů/Katalog/Rozvrh/Děti, `nav` fixní dole, `env(safe-area-inset-bottom)` (CHANGE-29/55). Skóre 7/10 v analýze a) je pravděpodobně kvůli obsahu tabu „Děti" (viz FR-13), ne kvůli navigaci samotné. | page.tsx |
| 6 | (b) „zrušit mobilní drag & drop, nahradit tap-to-assign" | V aplikaci **žádné drag & drop neexistuje** na žádné šířce — mřížka se plní klikem/tapem na ghost sloty nebo tlačítkem „Přidat do rozvrhu" (CHANGE-12 zpětně zrušilo dřívější drag koncept). Doporučení je bezpředmětné pro aktuální kód. | ScheduleGrid.tsx, memory CHANGE-12 |
| 7 | (b) „Non-blocking Undo toast místo potvrzovacího dialogu" | **Hotovo od CHANGE-50/61** — žádný `window.confirm`, okamžité odebrání + toast se jménem položky + tlačítkem „Zpět", 4 s (CHANGE-61). | page.tsx, plannerStore.ts |
| 8 | (c#1) „+ 1 další termín" formát | **Hotovo (CHANGE-60).** Analýza to sama potvrzuje jako pozitivum. | CatalogPanel.tsx `extraTerminText` |

**Tvrzení, která jsou PRAVDIVÁ a zůstávají otevřená** (ověřeno čtením kódu, ne jen převzato):

| # | Nález | Důkaz v kódu |
|---|---|---|
| 9 | (c#9) Kompaktní karta katalogu ukazuje jen začátek termínu („Po 16:30"), ne rozsah, ačkoli doména `endMinutes` má u každé `Session` k dispozici. | `CatalogPanel.tsx` `sessionLabel()`: `` `${WEEKDAYS[s.weekday-1]?.short} ${formatTime(s.startMinutes)}` `` — `s.endMinutes` se nikde nepoužívá. (Mřížka/Agenda v `ScheduleGrid.tsx` rozsah UŽ zobrazuje — mezera je jen v katalogu.) |
| 10 | (c#2) Cena bez tisícového oddělovače na části míst — nekonzistentní s jinými místy, která oddělovač mají. | `CatalogPanel.tsx` karta a `DetailsPanel.tsx` „Cena a věk" blok: `` `${amount} Kč` `` (žádné `toLocaleString`). Ale `DetailsPanel.tsx` PinnedSummary (ř. 861) a `HomeScreen.tsx` (ř. 222) **už** `toLocaleString('cs-CZ')` používají — nekonzistence, ne chybějící funkce. |
| 11 | (a/c) Tvrdý (červený) konflikt v mřížce nemá konkrétní odůvodnění, jen statický text „Tvrdý konflikt", zatímco doména už generuje přesnou zprávu s názvy obou kolidujících položek. | `packages/domain/src/conflicts/detect.ts` (H1 ř. 82): `` `${a.label} a ${b.label} se v ${den} překrývají o ${overlap} minut.` `` existuje, ale `useScheduleView.ts`'s `travelMessageByOwner` mapuje **jen** `kind==='travel_infeasible'` — zpráva pro H1/H2/H3/H5 se nikam nepropaguje, `ScheduleGrid.tsx` ukazuje pevný `title="Tvrdý konflikt"`. |
| 12 | (a/c) Mobilní horní lišta je hustá — najednou dítě/přepínač, věk, stav uložení, undo/redo, „Další". | `Toolbar.tsx`: „Věk dítěte" input a undo/redo tlačítka **nemají** `hidden desk:` (na rozdíl od Kalendáře/barvy, které CHANGE-46 už skryl) — jsou vždy viditelné na všech šířkách. |
| 13 | (a/c) Spodní tab „Děti" ve skutečnosti nezobrazuje správu dětí (jméno/věk/přidat/přepnout) — jen `DetailsPanel` (souhrn týdne / detail vybrané položky), identicky s desktopovým Info sloupcem. | `page.tsx`: `mobileTab==='details'` mountuje `<DetailsPanel/>`; jediná správa dětí žije v `Toolbar.tsx` (vždy viditelná lišta), ne v tabu, který se tak jmenuje. Toto je vlastní zjištění agenta při validaci (analýzy tento konkrétní nesoulad štítku/obsahu explicitně nepojmenovaly, ale plyne přímo z bodů 1+5). |
| 14 | (a/c) „Vlastní událost" je až na konci katalogu, za 37 aktivitami a stromem kategorií. | `CatalogPanel.tsx`: tlačítko `onOpenCustom` je na ř. ~1057 z ~1070 řádků JSX — poslední prvek v panelu. |

### 0.2 Přístup

- U bodů 9/10/11/14 jde o úzké, nízkoriziké opravy jednoho renderovacího místa — implementovat rovnou,
  bez čekání na prioritizaci (stejný vzor jako `design_review_59.md`/CHANGE-60 pro v5's FR-1).
- U bodů 12/13 jde o zásah do informační architektury mobilní lišty a spodní navigace, který se dotýká
  testů přes všechny mobilní/tabletové profily (Věk input, undo/redo tlačítka, „Přidat dítě" mají dnes
  stabilní locator napříč `persistence.spec.ts`/`schedule.spec.ts`/`panel.spec.ts`) — **NEEDS INPUT**,
  navrhuji spojit do jednoho `CHANGE` až po potvrzení cílového řešení (viz otázky v §3).
- Zamítnuté/odložené velké koncepty (3-stavový barevný slovník napříč kartami, „Najít volné místo" jako
  primární CTA, rodinná/multi-dítě kolize, cenový rozsahový filtr, „command-center" vyhledávání,
  automatizované CI smoke testy, systematický touch-target audit) jsou popsány v §3 jako nové kandidáty na
  backlog — jsou to samostatné, vícetýdenní iniciativy, ne jednorázové opravy, a zasluhují si vlastní
  design review až budou na řadě (stejný důvod jako `BL-034`'s zbytek).

## 1. Requirements

- **FR-9**: Kompaktní karta kroužku v katalogu (`sessionLabel()` v `CatalogPanel.tsx`) MUSÍ zobrazit
  časový rozsah `start–end` (např. „Po 16:30–17:30"), ne jen začátek, pro každý unikátní termín i pro
  variantu se „+ N dalších termínů".
- **FR-10**: Všechna zobrazení peněžní částky v `CatalogPanel.tsx` (karta) a `DetailsPanel.tsx` („Cena a
  věk" u `SelectedActivity` i `CustomEntryDetail`) MUSÍ použít `toLocaleString('cs-CZ')` stejně jako
  `PinnedSummary`/`HomeScreen` už dělají, aby byl formát konzistentní všude (např. „1 200 Kč", ne
  „1200 Kč").
- **FR-11**: `useScheduleView.ts` MUSÍ propojit konkrétní zprávu `Conflict.message` (ne jen pro
  `travel_infeasible`) ke každému bloku s tvrdým i měkkým konfliktem; `ScheduleGrid.tsx`'s `title` atribut
  červeného i jantarového indikátoru MUSÍ zobrazit tuto konkrétní zprávu místo statického textu „Tvrdý
  konflikt".
- **FR-12** *(NEEDS INPUT — viz §3)*: Mobilní (`<900px`) horní lišta (`Toolbar.tsx`) MUSÍ mít nižší
  informační hustotu — „Věk" vstup a undo/redo tlačítka se přesunou mimo vždy-viditelný první řádek.
- **FR-13** *(NEEDS INPUT — viz §3)*: Spodní mobilní záložka „Děti" MUSÍ zobrazovat skutečnou správu
  dětí (přepínač, věk, přidat dítě) — dnes duplicitně ukazuje totéž co záložka „Rozvrh"/Info sloupec.
- **FR-14**: Tlačítko „Vlastní událost" (`onOpenCustom` v `CatalogPanel.tsx`) MUSÍ být viditelné bez
  scrollování celým seznamem — přesune se pod vyhledávací/filtrovací blok jako sekundární CTA, viditelné i
  po zafiltrování katalogu.

## 2. Acceptance criteria

- **AC-9**: Nový/rozšířený E2E test v `catalog.spec.ts` otevře aktivitu se známým `endMinutes` (např.
  „Atletická školička") a ověří, že kompaktní karta i seznam termínů v detailu obsahují `\d{1,2}:\d{2}–\d{1,2}:\d{2}` vzor. Vitest doména beze změny (žádná úprava schema/logiky, jen UI čtení existujícího pole).
- **AC-10**: Nový test ověří, že karta s cenou ≥ 1000 Kč zobrazí mezeru jako oddělovač tisíců (`cs-CZ`
  formát, např. „1 200 Kč"); regresně zkontrolovat, že `Cena neuvedena` zůstává beze změny pro `NaN` ceny.
- **AC-11**: Rozšířený test H1 (`time_overlap`) v `schedule.spec.ts` ověří, že `title` atribut červeného
  indikátoru obsahuje jméno kolidující aktivity (ne jen „Tvrdý konflikt"); existující T-163 (H9 travel)
  zůstává zelený beze změny chování.
- **AC-12**: Po dohodě na cílovém řešení — nový/upravený responsive test ověří sníženou výšku/hustotu
  mobilní lišty (např. počet viditelných interaktivních prvků v prvním řádku), undo zůstává funkční přes
  klávesovou zkratku i toast tlačítko „Zpět" (existující T-134/T-135/T-137 zůstávají zelené).
- **AC-13**: Po dohodě na cílovém řešení — nový test otevře záložku „Děti" na mobilu a ověří přítomnost
  přepínače dítěte / vstupu věku / tlačítka „Přidat dítě" uvnitř této záložky (ne jen v Toolbaru).
  Existující T-152 (barva přes detail sheet) a T-609/T-610 (více dětí) se přizpůsobí novému umístění, pokud
  se přesune i funkcionalita z Toolbaru.
- **AC-14**: Nový test v `catalog.spec.ts` ověří, že „Vlastní událost" je viditelné/dosažitelné bez
  scrollu i se zapnutým filtrem (např. po zadání hledaného textu, který nic nenajde) — `toBeInViewport()`
  nebo ekvivalentní kontrola pozice.

## 3. Non-goals / notes — otázky k rozhodnutí a odložené položky

**NEEDS INPUT (FR-12/FR-13):** než založím `CHANGE-<id>` na tyto dvě položky, potřebuji potvrdit:

1. Pro FR-12: kam přesně přesunout „Věk" vstup na mobilu, když se dnes edituje jen v Toolbaru (vždy
   viditelný) a v Home onboarding kartě (jen před prvním nastavením)? Navrhuji sloučit s FR-13 — věk by
   žil v přepracované záložce „Děti". Souhlasíte s tímto sloučením do jednoho `CHANGE`?
2. Pro FR-13: má nová záložka „Děti" nahradit dnešní duplicitní `DetailsPanel` obsah úplně, nebo k němu
   přidat sekci správy dětí navrch (scroll)? Odebrání duplicity by uvolnilo tab pro svůj skutečný účel;
   přidání navrch je bezpečnější (méně testů se rozbije), ale zachová redundanci se záložkou „Rozvrh".
3. Undo/redo tlačítka z Toolbaru: přesunout do mobilního „Další ▾" menu, nebo je nechat viditelná (jen
   zmenšit) vzhledem k tomu, že toast „Zpět" pokrývá nejčastější případ (poslední akce), ale menu by
   pokrylo hlubší historii?

Nové položky backlogu vzniklé při validaci (viz `docs/backlog.md`):

- **BL-039**: 3-stavový vizuální slovník kolizí (🟢 Bez kolize / 🟡 Těsná návaznost / 🔴 Kolize) s ikonou +
  textem napříč kartami katalogu, ne jen v mřížce rozvrhu — dnes existují jen 2 stavy (tvrdý/měkký) a jen
  v mřížce. Rozšiřuje FR-11 (zprávy) o vizuální/kartový vrstvu. Velký zásah přes `CatalogPanel`/
  `ScheduleGrid`/`DetailsPanel` — potřebuje vlastní design review.
- **BL-040**: „Najít volné místo"/„Co se hodí dítěti tento týden?" jako primární CTA (dnes jen kombinace
  filtrů „Bez konfliktu" + „Jen vhodné pro věk"). Rozšiřuje zbytek `BL-034`.
- **BL-041**: Rodinná/multi-dítě kolize — souběh, kdy dvě děti mají aktivitu ve stejný čas na různých
  místech a rodič je nemůže doprovodit obě (nový koncept, žádná dosavadní položka backlogu ho nepokrývá).
- **BL-042**: Cenový rozsahový filtr („do X Kč") s explicitní volbou „zahrnout i aktivity bez uvedené
  ceny" — dnes žádný cenový filtr v katalogu neexistuje.
- **BL-043**: Silnější/„command-center" vyhledávání (např. „sport po 16 do 500" pochopeno jako kombinovaný
  filtr) — velké, výzkumné, mimo scope jednorázové opravy.
- **BL-044**: Automatizované responsive/functional smoke testy „na každém nasazení" (CI gate) — technicky
  už pokryto z velké části existující E2E sadou (678 testů/6 profilů/`test/specs/`), ale ne jako povinná
  deploy-blocking CI brána. Infrastrukturní úloha, ne UI/UX změna.
- **BL-045**: Systematický touch-target audit (44–48 px) nad rámec už řešených komponent (CHANGE-46/47
  pokryly bottom nav/Agenda tabs/weekday chips na 44 px; globální CSS pravidlo je jen 24 px). Zbývá ověřit
  zbylé interaktivní prvky (close/expand/back v `DetailsPanel`/`CustomEntryDialog`) jeden po druhém —
  nelze tvrdit hotovo ani nehotovo bez prvku-po-prvku měření, proto samostatná položka místo dohady.

Vědomě NEŘEŠENO v tomto spec dokumentu (mimo scope, viz tvrzení 1–8 v §0.1): domnělý anonymní select
(nereprodukovatelné), přetrvávající onboarding (nereprodukovatelné bez konkrétních kroků), drag & drop na
mobilu (neexistuje), non-blocking undo (hotovo), tabletový master-detail (hotovo CHANGE-64, zbývá jen
`BL-033`), bottom navigace (hotovo), „+1 termín" microcopy (hotovo CHANGE-60), explicitní volba termínu
při zápisu (hotovo).
