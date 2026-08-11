# Changelog

Všechny podstatné změny enginu `@krouzky/domain` a aplikace `@krouzky/web`.
Formát vychází z [Keep a Changelog](https://keepachangelog.com/), verzování dle
[SemVer](https://semver.org/). Každý řádek nese `CHANGE-<id>`, který propojuje
spec ↔ kód ↔ tento záznam (viz `.github/instructions/dev-process.instructions.md`).

## [Unreleased]

### Changes 10: mapa u každé adresy + editace vlastní události (CHANGE-33)

Oprava dvou uživatelských defektů z Changes 10. Scope: **pouze app `@krouzky/web`**.

- **FR-1** `MapLink` nabídne „Zobrazit mapu“ u každé adresy (i bez souřadnic) a chybějící
  `lat`/`lon` dohledá geokódováním na vyžádání; při neúspěchu ponechá odkazy + poznámku.
  Root cause: náhled byl vázán jen na předem uložené souřadnice, které vlastní události
  nikdy neměly.
- **FR-2** Vytvoření vlastní události s adresou spustí geokódování a doplní souřadnice.
- **FR-3/FR-4** Store má `updateCustomEntry`; detail nabízí „Upravit“, který otevře
  předvyplněný `CustomEntryDialog` (režim úprav), „Uložit“ zachová `id`/`childId`.

Spec: `.github/specs/design_review_32.md`.
`tsc --noEmit` (web) čisté; `vitest` (81) beze změny; E2E ověřilo tlačítko mapy u adresy
bez souřadnic i editaci názvu vlastní události; `pnpm` v prostředí není na PATH.

### Přístupnost po skle: Escape zavírá výběr, focus ring na skle (CHANGE-32)

Pátá vlna Changes 9 (fáze přístupnost, C9-A1/A4). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Klávesa Escape zavře vybraný detail (pravý panel i mobilní sheet) vymazáním výběru.
- **FR-2** `:focus-visible` na skleněných plochách má navíc vnější bílý stín `0 0 0 1px #fff`
  pro viditelnost na světlém i tmavém podkladu.

Spec: `.github/specs/design_review_31.md`. Navazuje na **BL-019**.
`tsc --noEmit` (web) čisté; `vitest` (81) beze změny; E2E ověřilo Escape (detail 1 → 0) a
pravidlo bílého stínu na skle; `pnpm` v prostředí není na PATH.

### Liquid Glass: systém, vypínání a mobilní sheet (CHANGE-31)

Čtvrtá vlna Changes 9 (fáze glass, C9-B/G). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Třída `.glass` a tokeny `--bg-glass`/`--border-glass` (C9-T2); backdrop-filter
  `blur(20px) saturate(160%)` vč. `-webkit-` varianty.
- **FR-2** Čtyři povinné cesty vypnutí skla (C9-B3): `@supports not (backdrop-filter)`,
  `[data-glass='off']`, `prefers-contrast: more`, `prefers-reduced-transparency: reduce`.
- **FR-3** Ruční přepínač skla (primární cesta vypnutí) nastaví `data-glass` na `<html>`,
  stav se drží v `sessionStorage` pro danou relaci.
- **FR-4** Sklo se aplikuje jen na jeden schválený ambientní povrch — mobilní bottom sheet
  (C9-G5); text sedí na solidním vnitřním povrchu (C9-B2). Karty/eventy/mřížka bez skla.

Spec: `.github/specs/design_review_30.md`. Navazuje na **BL-019**.
`tsc --noEmit` (web) čisté; `vitest` (81) beze změny; E2E ověřilo blur → `none` po přepnutí;
`pnpm` v prostředí není na PATH.

### Tabulární číslice v číselných sloupcích (CHANGE-30)

Třetí vlna Changes 9 (C9-Y3). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Časová osa kalendáře a tabulka porovnání variant používají `tabular-nums`.

Spec: `.github/specs/design_review_29.md`. Navazuje na **BL-019**.
`tsc --noEmit` (web) čisté; `vitest` (81) zelené; `pnpm` v prostředí není na PATH.

### Sjednocený zlom rozvržení na 900 px (CHANGE-29)

Druhá vlna Changes 9 (fáze layout, C9-L5). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Přepnutí mobil/desktop (spodní navigace, sloupce, výchozí Agenda, mobilní sheet)
  je jednotně na 900 px (Tailwind screen `desk: 900px` + JS `max-width: 899.98px`).

Spec: `.github/specs/design_review_28.md`. Navazuje na **BL-019**.
`tsc --noEmit` (web) čisté; `vitest` (81) zelené; `pnpm` v prostředí není na PATH.

### Základ design systému: viewport, tokeny, fonty, focus (CHANGE-28)

První vlna Changes 9 (fáze 1). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Viewport má `viewport-fit=cover` (C9-M8) pro safe-area insety.
- **FR-2** `:root` tokeny vč. `--success-text`/`--warning-text`/`--focus-ring` (C9-T).
- **FR-3** Pořadí fontů `Inter, system-ui, sans-serif` (C9-Y4).
- **FR-4** Globální `:focus-visible` outline z `--focus-ring` (C9-A1).

Spec: `.github/specs/design_review_27.md`. Otevírá **BL-019**.
`tsc --noEmit` (web) čisté; `vitest` (81) zelené; `pnpm` v prostředí není na PATH.

### Mobilní spodní sheet detailu (CHANGE-27)

BL-018/C8-F7. Scope: **pouze app `@krouzky/web`**.

- **FR-1** Na mobilu se při výběru (mimo záložku Info) detail zobrazí jako spodní sheet
  nad mřížkou se dvěma stavy (peek / rozbaleno) přepínanými úchytem.

Spec: `.github/specs/design_review_26.md`. `tsc --noEmit` (web) čisté; `vitest` (81) zelené.

### Detekce změny zdroje u uživatelských úprav (CHANGE-26)

BL-018/C8-E3. Scope: **engine `@krouzky/domain`** (podpis + funkce) **i app `@krouzky/web`** —
pending MINOR **0.3.0**.

- **FR-1** `ActivityOverride` má `editedAt`/`baseSignature`; `activitySignature` a
  `overrideSourceChanged` detekují drift názvu/ceny proti katalogu.
- **FR-2** Store razítkuje metadata při úpravě; detail při driftu nabídne
  `Přijmout nový údaj z katalogu`.

Spec: `.github/specs/design_review_25.md`. Zužuje **BL-018**.
`tsc --noEmit` (doména i web) čisté; `vitest` (81; +4) zelené; `pnpm` v prostředí není na PATH.

### Poctivé Kč/lekce v detailu (CHANGE-25)

BL-018: cena za lekci. Scope: **engine `@krouzky/domain`** (nová funkce) **i app `@krouzky/web`** —
spadá do pending MINOR **0.3.0**.

- **FR-1** `pricePerLesson(price, lessonCount, seasonMonths)` — všechny periody včetně `per_semester`
  (počet pololeští = `round(seasonMonths/5)`), konzistentně s měsíčním přepočtem.
- **FR-2** Detail ukazuje `Kč/lekce`, jen když je hodnota definovaná.

Spec: `.github/specs/design_review_24.md`. Zužuje **BL-018**.
`tsc --noEmit` (doména i web) čisté; `vitest` (77; +6) zelené; `pnpm` v prostředí není na PATH.

### Dokonči datovou vrstvu uzávěrek/přihlášek (CHANGE-24)

Dokončení BL-017 v datech. Scope: **data `@krouzky/domain/data`** **i app `@krouzky/web`** — bez bumpu.

- **FR-1** Adaptér plní `applicationUrl` z reálného `sourceUrl` a mapuje `applicationDeadline`
  z META; `NsActivityMeta` má šablonová pole `applicationUrl?`/`applicationDeadline?`.

Reálné termíny uzávěrek se nevymýšlejí — šablona je připravena k doplnění (zbytek **BL-017**).
Spec: `.github/specs/design_review_23.md`. `tsc --noEmit` (doména i web) čisté; `vitest` (76) zelené.

### Uzávěrky přihlášek a odkaz na přihlášku (CHANGE-23)

Dvanáctá vlna Changes 8 (C8-D5/C8-B6). Scope: **engine `@krouzky/domain`** (nová pole + funkce)
**i app `@krouzky/web`** — spadá do pending MINOR **0.3.0** (bump až při vydání).

- **FR-1** Aktivita má volitelné `applicationUrl` a `applicationDeadline`; nová
  `upcomingDeadlines(catalog, schedule, childId, today)` vrací seřazené uzávěrky s odpočtem.
- **FR-2** Detail ukazuje uzávěrku a preferuje `applicationUrl` pro `Přihlásit se`;
  souhrn má blok `Uzávěrky` s odpočtem.

Schopnost je hotová a otestovaná fixturou; reálné termíny/odkazy do datové sady zůstávají
datovým úkolem (**BL-017**), proto se v shipovaných datech uzávěrky nezobrazují.
Spec: `.github/specs/design_review_22.md`. `tsc --noEmit` (doména i web) čisté; `vitest` (71; +3) zelené;
`pnpm` v prostředí není na PATH.

### Mapa až po explicitním kliknutí (CHANGE-22)

Jedenáctá vlna Changes 8 (C8-D4). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Náhled mapy se v detailu načte až po kliknutí na `Zobrazit mapu`; textové odkazy
  (OSM, Mapy.cz) zůstávají vždy. Před kliknutím nevzniká požadavek na OpenStreetMap.

Spec: `.github/specs/design_review_21.md`. `tsc --noEmit` (web) čisté; `vitest` (68) zelené;
`pnpm` v prostředí není na PATH.

### Porovnání variant v souhrnu (CHANGE-21)

Desátá vlna Changes 8 (C8-G1). Scope: **pouze app `@krouzky/web`** (využívá existující doménu).

- **FR-1** Při ≥ 2 variantách souhrn nabídne sbalitelné `Porovnání variant` s tabulkou
  klíčových metrik (kroužky, obsazené dny z 5, Kč/měs, konflikty); aktivní varianta je zvýrazněná.

Spec: `.github/specs/design_review_20.md`. `tsc --noEmit` (web) čisté; `vitest` (68) zelené;
`pnpm` v prostředí není na PATH.

### Klik na den obsazenosti přepne kalendář (CHANGE-20)

Devátá vlna Changes 8 (C8-B7). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Klik na den v `Obsazenost týdne` přepne mřížku na denní pohled daného dne
  (store `focusDay` → `focusWeekday`/`focusNonce`, na které reaguje `ScheduleGrid`).

Spec: `.github/specs/design_review_19.md`. `tsc --noEmit` (web) čisté; `vitest` (68) zelené;
`pnpm` v prostředí není na PATH.

### Neutrální rozpad obsazenosti po dnech (CHANGE-19)

Osmá vlna Changes 8 (C8-B1/C8-B4). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Souhrn má blok `Obsazenost týdne` s per-den počty Po–Pá a `volno` pro prázdné dny,
  bez normativní barevné škály.

Spec: `.github/specs/design_review_18.md`. `tsc --noEmit` (web) čisté; `vitest` (68) zelené;
`pnpm` v prostředí není na PATH.

### Odvozený rozsah lekcí v detailu (CHANGE-18)

Sedmá vlna Changes 8 (C8-D2). Scope: **pouze app `@krouzky/web`** (využívá existující doménu).

- **FR-1** Detail ukazuje délku lekce (min) z vybraného termínu.
- **FR-2** Detail ukazuje počet lekcí za sezonu odvozený z platnosti termínů minus svátky/prázdniny.

Spec: `.github/specs/design_review_17.md`. `tsc --noEmit` (web) čisté; `vitest` (68) zelené;
`pnpm` v prostředí není na PATH.

### Uživatelské stropy v souhrnu (CHANGE-17)

Šestá vlna Changes 8 (C8-B5). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Souhrn nabízí volitelné stropy `max obsazených odpolední` a `max Kč/měsíc`;
  hodnoty se pamatují v relaci.
- **FR-2** Upozornění se zobrazí jen po překročení nastaveného stropu.

Spec: `.github/specs/design_review_16.md`. `tsc --noEmit` (web) čisté; `vitest` (68) zelené;
`pnpm` v prostředí není na PATH.

### Poznámka rodiče ke kroužku (CHANGE-16)

Pátá vlna Changes 8 (C8-D8). Scope: **engine `@krouzky/domain`** (volitelné `note` v override)
**i app `@krouzky/web`** — spadá do pending MINOR **0.3.0** (bump až při vydání).

- **FR-1** `ActivityOverride` má volitelné `note`; přežije `serialize → parse` (bez migrace).
- **FR-2** Detail nabízí editovatelnou `Poznámku rodiče` ukládanou do `override.note`.

Spec: `.github/specs/design_review_15.md`. Zužuje **BL-018**.
`tsc --noEmit` (doména i web) čisté; `vitest` (68; +1) zelené; `pnpm` v prostředí není na PATH.

### Poctivá délka sezony z platnosti termínů (CHANGE-15)

Čtvrtá vlna Changes 8 (C8-D2/C8-B3). Scope: **engine `@krouzky/domain`** (rozšíření `ScheduleSummary`)
**i app `@krouzky/web`** — spadá do pending MINOR **0.3.0** (bump až při vydání).

- **FR-1** `scheduleSummary` vrací `seasonMonths` odvozené z `validFrom`/`validTo` termínů
  (celé měsíce inkluzivně, 0 při prázdnu).
- **FR-2** Souhrn používá tuto délku v přepočtu `Kč/měsíc` místo pevných 9.

Spec: `.github/specs/design_review_14.md`. Zužuje **BL-018**.
`tsc --noEmit` (doména i web) čisté; `vitest` (67; +2) zelené; `pnpm` v prostředí není na PATH.

### Detail: sticky hlavička, návrat na souhrn, sbalitelný popis (CHANGE-14)

Třetí vlna Changes 8 (C8-F2/F4/F5). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Hlavička detailu (návrat, název, poskytovatel, primární akce) je sticky a nescrolluje pryč.
- **FR-2** `← Zpět na souhrn` zruší výběr a vrátí souhrn.
- **FR-3** Popis je sbalitelná sekce, výchozí sbalená.

Spec: `.github/specs/design_review_13.md`. `tsc --noEmit` (web) čisté; `vitest` (65) zelené;
`pnpm` v prostředí není na PATH.

### Konflikty s akcí „Vyřešit“ + počet konfliktů (CHANGE-13)

Druhá vlna Changes 8 (C8-B9/C8-B10). Scope: **engine `@krouzky/domain`** (nová čistá funkce)
**i app `@krouzky/web`** — spadá do pending MINOR **0.3.0** (bump až při vydání).

- **FR-1** Nová `suggestVariantSwitches(catalog, schedule, childId, conflict)` — pro časovou
  kolizi vrátí varianty téhož kroužku, které striktně sníží počet tvrdých kolizí; deterministické.
- **FR-2** Souhrn ukazuje počet konfliktů jako odznak.
- **FR-3** Tvrdá časová kolize má akci `Vyřešit` s konkrétními variantami; aplikace přepne termín
  (`changeVariant`) a překryv zmizí. Když varianta není, panel to sdělí.

Spec: `.github/specs/design_review_12.md`. Částečně plní **BL-018** (C8-B10).
`tsc --noEmit` (doména i web) čisté; `vitest` (65; +3) zelené; `pnpm` v prostředí není na PATH.

### Pravý panel jako rozhodovací: detail před přidáním + poctivý souhrn (CHANGE-12)

První vlna Changes 8 (`.github/specs/krouzky-planner-changes-8.md`). Scope: **pouze app `@krouzky/web`**.

- **FR-1** Klik na kartu v katalogu už kroužek nepřidává — jen otevře čtecí detail.
- **FR-2** Detail má výběr termínu a primární akci `Přidat do rozvrhu`; u zapsaného
  kroužku místo toho `Odebrat z rozvrhu`, a `Přihlásit se` když existuje odkaz.
- **FR-3** Souhrn ceny už není holý součet: uvádí počet kroužků bez ceny a měsíční ekvivalent.
- **FR-4** Souhrn má primární metriky `obsazená odpoledne z 5` a `cest týdně` s definicí v tooltipu;
  hodiny týdně jsou sekundární.
- **FR-5** Prázdný souhrn ukazuje nadpis, CTA a tipy místo nulových metrik.
- **FR-6** Upravená pole nesou značku `upraveno vámi` a ztrácí odznak `Ověřeno`.

Spec: `.github/specs/design_review_11.md`. Otevírá **BL-017**, **BL-018**.
`tsc --noEmit` (doména i web) čisté; `vitest` (62) zelené; `pnpm` v prostředí není na PATH.

### Taxonomie katalogu + mikrointerakce + tiskový přehled (CHANGE-11)

Třetí vlna Changes 6/7 navazující na CHANGE-10. Scope: **pouze app `@krouzky/web`**.

- **FR-1** Katalog je seskupen do dvou úrovní (kořen + podkategorie) s počty.
- **FR-2** Kořenové i podskupiny jsou sbalitelné, stav je zapamatován v relaci.
- **FR-3** Přidány akce `Rozbalit vše` / `Sbalit vše`.
- **FR-4** Po změně se zobrazuje toast s akcí `Zpět` (undo).
- **FR-5** Přidán reduced-motion režim (`prefers-reduced-motion`) a motion-safe animace.
- **FR-6** Tiskový výstup doplněn o tabulkový přehled kroužků (název, den, čas).

Spec: `.github/specs/design_review_10.md`. Navazuje na **BL-016**.
TS diagnostika upravených souborů je čistá; `pnpm` není v prostředí na PATH.

### Rozhodovací filtry + mobilní agenda + Kč/měsíc (CHANGE-10)

Druhá vlna Changes 6/7 navazující na CHANGE-9. Scope: **pouze app `@krouzky/web`**.

- **FR-1** Katalog má vícevýběr dnů (`Po–Ne`) a pokročilé časové filtry
  (`začátek nejdřív`, `konec nejpozději`).
- **FR-2** Přepínač `Vejde se mi to` skryje aktivity, které se nevejdou do
  aktuálního rozvrhu (kolizní ve všech variantách).
- **FR-3** Seznam je rozdělen na sekci `V rozvrhu` a zbylé položky; přidané karty
  nesou stav `Přidáno`.
- **FR-4** Na mobilu je výchozí pohled `Agenda` s možností přepnout na `Mřížku`.
- **FR-5** Ceny se v katalogu i detailu zobrazují jako `Kč/měsíc` s původní periodou
  v závorce.
- **FR-6** Pravý panel je při prázdném rozvrhu užší.

Spec: `.github/specs/design_review_9.md`. Navazuje na **BL-016**.
TS diagnostika upravených souborů je čistá; `pnpm` není v prostředí na PATH.

### Onboarding katalogu a ukládání: fulltext, empty state, Uložit/Otevřít (CHANGE-9)

První vlna Changes 6/7 z `.github/specs/krouzky-planner-changes-6-7.md`.
Scope: **pouze app `@krouzky/web`** — bez změn domény a bez bumpu verze.

- **FR-1** Katalog fulltext nyní hledá přes název + poskytovatele + kategorii,
  necitlivě na diakritiku a velikost písmen; shoda se zvýrazní v názvu.
- **FR-2** Karty kroužků nově ukazují den/čas (`Út 16:00`) a opravují pluralizaci
  `termín / varianty / variant`.
- **FR-3** Prázdný rozvrh už není bílá mřížka: místo ní je explicitní empty state
  s CTA „Přidat první kroužek“.
- **FR-4** Hlavička má symetrické `Otevřít` + `Uložit`, stav `Neuloženo/Uloženo`
  a `beforeunload` varování pouze při skutečně neuložených změnách.
- **FR-5** Nedokončený Chat tab v pravém panelu je skrytý.

Spec: `.github/specs/design_review_8.md`. Otevírá **BL-016**.
TypeScript diagnostika upravených web souborů je čistá; `pnpm` v prostředí není dostupný,
proto nebylo možné spustit standardní `pnpm -C apps/web typecheck`.

### Import .ics/.json + plný obsah v exportovaném ICS (CHANGE-8)

Podle „Changes 5“ v `.github/specs/changes.md`. Scope: **engine `@krouzky/domain`**
(parser + bohatší generátor) **i app `@krouzky/web`** — spadá do pending 0.3.0.

- **FR-1** Nový `parseIcs()` — každý `VEVENT` → vlastní událost (název, adresa,
  poznámka, den/čas, `everyWeeks` z `RRULE INTERVAL`, okno z `DTSTART`/`UNTIL`).
- **FR-2** ICS export nově nese **plnou adresu** v `LOCATION` (vč. PSČ), `URL`
  (web) a `DESCRIPTION` se vším (popis, místo, adresa, web, lektor, kontakt,
  telefon, e-mail, cena, věk, kategorie) — aby Apple Kalendář zobrazil vše.
- **FR-3** Tlačítko „Načíst“ přijímá `.json` i `.ics`; `.ics` se naimportuje
  jako editovatelné vlastní události, `.json` nahradí celý stav.
- **FR-4** Store: hromadné `addCustomEntries` (jeden krok zpět).

Spec: `.github/specs/design_review_7.md`. Otevírá **BL-015**.
`vitest` (62; +4) + `tsc --noEmit` (doména i web) čisté; ESLint v tomto prostředí není.

### Aktualizovaná data (v3): atletika, SCNS a fotbal, neznámé ceny (CHANGE-7)

Načtení `packages/domain/data/novestraseciData-2.ts` (37 kroužků: DDM + SCNS
atletika/box/gymnastika + TJ Sokol fotbal). Scope: **engine `@krouzky/domain`**
(kategorie + odolná cena) **i app `@krouzky/web`** — spadá do pending 0.3.0.

- **FR-1** Nová kategorie `athletics` („Atletika“) ve schématu i UI.
- **FR-2** Neznámá cena (`NaN`) se nepočítá do rozpočtu ani do ICS — není to nula.
- **FR-3** Store načítá nová data (venues + `venueId`; u vícemístných skupin primární).
- **FR-4** Katalog i detail ukazují „Cena neuvedena“ u fotbalu (nezveřejněné příspěvky).

Spec: `.github/specs/design_review_6.md`. Otevírá **BL-012**, **BL-013**, **BL-014**.
`vitest` (58) + `tsc --noEmit` (doména i web) čisté; ESLint v tomto prostředí není.

### Více informací v detailu + filtr věku vypnutý defaultně (CHANGE-6)

Podle „Changes 4“ v `.github/specs/changes.md`. Scope: **pouze aplikace `@krouzky/web`**
— pole už existují na doménovém modelu (`description`, `sourceUrl`, `contact`,
`website`), takže **bez změny enginu a bez bumpu**.

- **FR-1** Filtr „Jen vhodné pro věk“ je defaultně **vypnutý** — hned se zobrazí
  všechny kroužky; zaškrtnutím se stále zafímě podle věku dítěte.
- **FR-2/3** Detail kroužku ukazuje **popis** a kartu **„Kontakt a odkazy“**
  (👤 osoba, 📞 telefon `tel:`, ✉️ e-mail `mailto:`, 🌐 „Více informací (web)“
  → `sourceUrl ?? website`, nová záložka); řádek se zobrazí jen když hodnota existuje.
- **FR-4** Adaptér doplní `Activity.sourceUrl` z `NS_ACTIVITY_META.sourceUrl`,
  aby web odkaz mířil na stránku kroužku (ddmrako.cz).

Spec: `.github/specs/design_review_5.md`. Otevírá **BL-011**.
`tsc --noEmit` (web) čistý; doménové testy (58) beze změny zelené.

### Reálný katalog: místo konání, kategorie a data Nové Strašecí (CHANGE-5)

Načtení ověřených dat `packages/domain/data/novestraseciData.ts` (DDM Rakovník,
pracoviště Nové Strašecí, 2026/2027) místo ukázky. Scope: **engine `@krouzky/domain`**
(nová entita + kategorie) **i app `@krouzky/web`** — katalog není součástí
`PlannerState`, takže **bez migrace** (spadne do již otevřeného MINOR 0.2.0 → 0.3.0).

- **FR-1** `activityCategorySchema` rozšířen o `science`, `tech`, `games`,
  `outdoor`, `martial_arts` (původní hodnoty zůstávají).
- **FR-2/3** Nová entita **Venue** (`Catalog.venues`, `SessionGroup.venueId`);
  adresa konání = `locationOverride ?? venue ?? poskytovatel` v mřížce, dojezdu,
  souhrnu i ICS `LOCATION`. Organizátor (Rakovník) ≠ místo (BIOS, ZŠ, Řevničov…).
- **FR-4/5** Adaptér `apps/web/src/lib/novestraseci.ts` postaví doménový `Catalog`
  z dat (venues + `venueId`, `NaN` souřadnice → `undefined`, PSČ), store načítá
  reálný katalog + stav (dítě s reálnou adresou ZŠ, rok 2026/2027, bez výjimek).
- **FR-6** Kategorie ve filtru i detailu; v detailu „Místo konání“ + adresa a mapa
  na souřadnicích místa. Datový soubor zůstává beze změny; export balíčku nově
  mapuje `"./data/*": "./data/*.ts"`.

Spec: `.github/specs/design_review_4.md`. Otevírá **BL-008**, **BL-009**, **BL-010**.
`vitest` (58) + `tsc --noEmit` (doména i web) čisté; ESLint v tomto prostředí není.

### Přepisy kroužků: editace údajů a výběr barvy (CHANGE-4)

Podle „Changes 3“ v `.github/specs/changes.md`. Uživatel může u katalogového
kroužku přepsat zobrazované/exportované údaje a zvolit barvu. Katalog zůstává
neměnný — přepisy žijí v nové vrstvě `overrides` (klíč `activityId`), efektivní
hodnota = `override ?? katalog`. Scope: **engine `@krouzky/domain`** (schéma +
migrace + ICS) **i app `@krouzky/web`** → při vydání **MINOR bump 0.2.0 → 0.3.0**.

- **FR-1** `PlannerState.overrides: ActivityOverride[]`; `schemaVersion` 2→3 s
  migrací (v2 → v3 doplní `overrides: []`, řetězeně i v1 → v2 → v3).
- **FR-2** `generateIcs` aplikuje přepis na zápisy z katalogu: název → `SUMMARY`,
  adresa → `LOCATION`, telefon/cena → `DESCRIPTION`, barva → `COLOR`
  (jen v režimu `per_activity`; v `single` vítězí barva dítěte).
- **FR-3** Pravý sloupec umožní editovat název, adresu (samostatná pole
  **Ulice / Město / PSČ**), telefon a cenu; zápis jde do `overrides` (do historie)
  a tlačítko „Obnovit z katalogu“. Po úpravě adresy se poloha znovu dohledá (keyless OSM
  Nominatim) a náhled mapy se aktualizuje; při offline/bez výsledku zůstane bez map.
- **FR-4** Paleta 12 barev u kroužku; volba se projeví v mřížce i v exportu.
- **FR-5** Rychlý přepínač barvy v liště vedle pole „Kalendář“ pro vybraný kroužek
  (bez výběru je neaktivní).
- **FR-6** Přepisy přežijí round-trip `serialize` → `parse` beze změny.

Spec: `.github/specs/design_review_3.md`. Otevírá **BL-006**, **BL-007**.
`vitest` (58 zelených; +5 pro CHANGE-4) + `tsc --noEmit` (doména i web) čisté.
ESLint v tomto prostředí není nainstalován — bránu lintu nebylo možné spustit.

### Úklid lišty: odstranění popisku „Okres DEMO“

Z hlavičky zmizel neúčelný text „Okres DEMO“ (ukázkový `districtCode`). Triviální
**app-only** úprava navazující na CHANGE-2 FR-4 (volné pole názvu kalendáře) —
bez samostatného specu a bez bumpu verze. `tsc --noEmit` (web) čistý.

### Navigace kalendáře: šipky pro všechny pohledy (CHANGE-3)

Doplnění FR-6 (CHANGE-1): Týden a Měsíc neměly šipky pro předchozí/další.
Mřížka nově pracuje s **kotevním datem** — jedny šipky ‹ › + tlačítko „Dnes"
fungují ve všech pohledech (Den/3 dny/Týden/Měsíc), popisek ukazuje konkrétní
rozsah (`10. 8. – 16. 8. 2026`, `září 2026`, …), hlavičky sloupců mají datum,
svátky se ztlumí a „now" čára je jen na dnešním sloupci. Scope: **app-only**,
bez bumpu verze. Triviální oprava app-only defektu → bez samostatného specu.
`tsc --noEmit` (web) čistý.

### Vylepšení kalendáře: now-line, multi-varianta, detail vlastní události, mapa (CHANGE-2)

Navazuje na CHANGE-1 podle „Changes 2" v `.github/specs/changes.md`. Scope: **pouze
aplikace `@krouzky/web`** — engine `@krouzky/domain` beze změny, proto **bez bumpu verze**.

- **FR-1** Mřížka se po načtení vycentruje na aktuální čas.
- **FR-2** Vodorovná „now" čára označuje přesný aktuální čas (čas se čte v aplikaci).
- **FR-3** Dítě lze zapsat do více variant docházky téže aktivity (varianty jsou přepínače).
- **FR-4** Pole názvu kalendáře je prázdné (jen placeholder se jménem dítěte).
- **FR-5** Jedno pole „Ulice, město", které se rozdělí na čárce.
- **FR-6** Vlastní událost má i cenu a lektora; zobrazují se v detailu.
- **FR-7** Klik na vlastní událost otevře její detail v pravém sloupci.
- **FR-8** Náhled mapy (OpenStreetMap, keyless) pod adresou + odkaz do Mapy.cz.

Spec: `.github/specs/design_review_2.md`. **Closes BL-002**; otevírá **BL-004**, **BL-005**.
`tsc --noEmit` (web) čistý; `vitest` (doména, 53) beze změny zelený.

## [0.2.0] - 2026-08-10

### iOS-like kalendář & pružné opakování/export (CHANGE-1)

Kalendář zpřístupněn běžnému uživateli podle `.github/specs/changes.md`.
Rozsah: **engine** `@krouzky/domain` (FR-1–FR-5) + **app** `@krouzky/web` (FR-6–FR-9).

- **FR-1** Obecný interval opakování `everyWeeks` nahradil `biweekly.parity`;
  ICS emituje `RRULE:FREQ=WEEKLY;INTERVAL=N`. `schemaVersion` 1→2 s migrací
  starých souborů (`parity` → `everyWeeks: 2`).
- **FR-2** `validFrom`/`validTo` řídí začátek/konec opakování (`DTSTART`/`UNTIL`).
- **FR-3** Volitelný název kalendáře (`X-WR-CALNAME` + název souboru).
- **FR-4** Režim barev exportu `single`/`per_activity` (`COLOR` per událost,
  `X-APPLE-CALENDAR-COLOR` na úrovni kalendáře).
- **FR-5** Nastavitelná připomínka → `VALARM;TRIGGER`.
- **FR-6** Pohledy Den / 3 dny / Týden / Měsíc s navigací.
- **FR-7** Rolovatelná celodenní osa 00:00–24:00, výchozí odpoledne.
- **FR-8** Odkaz na mapu v panelu detailů (bez vkládání cizích dlaždic).
- **FR-9** Překrývající se události se zobrazují vedle sebe, neblokují.

Spec: `.github/specs/design_review_1.md`. Otevírá **BL-001**, **BL-002**, **BL-003**.
`vitest` (53 zelených) + `tsc --noEmit` (doména i web) zelené.
