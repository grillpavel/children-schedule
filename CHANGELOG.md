# Changelog

Všechny podstatné změny enginu `@krouzky/domain` a aplikace `@krouzky/web`.
Formát vychází z [Keep a Changelog](https://keepachangelog.com/), verzování dle
[SemVer](https://semver.org/). Každý řádek nese `CHANGE-<id>`, který propojuje
spec ↔ kód ↔ tento záznam (viz `.github/instructions/dev-process.instructions.md`).

## [Unreleased]
### Vlna 1 velkého UI/UX redesignu (CHANGE-81)

Trigger: `design_review_73.md` (DRAFT) konsolidoval velký HTML UI/UX audit do 3 vln FR kandidátů —
implementována **Vlna 1** (nízké riziko, žádná změna datového modelu). Scope: **app `@krouzky/web`**.

- Nový sdílený hook `src/hooks/useBreakpoint.ts` (`useIsMobile`/`useIsWide`) nahrazuje 3 nezávislá
  `matchMedia('(max-width: 899.98px)')` volání v `page.tsx`/`CatalogPanel.tsx`/`ScheduleGrid.tsx` —
  jediný zdroj 900px zlomu (FR-W1-1). Hook používá `useLayoutEffect` (isomorfní fallback na
  `useEffect` na serveru), ne `useEffect` — na mobilu už nezabliká krátce desktopová větev při
  prvním vykreslení (FR-W1-2).
- Shluk správy kalendářů v `Toolbar.tsx`: `flex-wrap`→`flex-nowrap overflow-x-auto` + `w-full` na
  mobilu — dlouhé jméno kalendáře nebo víc kalendářů dřív mohlo zalomit shluk na 2 řádky, což s
  řádkem 2 dávalo nepředvídatelně 3 řádky hlavičky; teď přebytek jen vodorovně scrolluje a hlavička
  zůstává max. na 2 řádcích (FR-W1-3).
- Toast (`showChangeToast`) na mobilu počítá odstup od spodní navigace přes
  `bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))]` místo pevných `bottom-16` — na
  zaříznutých iPhonech (home indicator) už nemizí pod spodní navigací (FR-W1-4).
- `<input>`/`<select>`/`<textarea>` na mobilu mají vynucené `font-size: 16px !important` —
  iOS Safari už nepřibližuje stránku při fokusu na pole (FR-W1-5, zúženo na mechanickou/měřitelnou
  část; plná typografická škála 13/15/20/28px nebyla implementována, viz Non-goals ve spec).
- Font Inter se reálně načítá přes `next/font/google` (`subsets: ['latin', 'latin-ext']` kvůli
  české diakritice) — dřív byl `font-family: Inter` v `globals.css` jen deklarovaný, appka běžela na
  systémovém fontu (FR-W1-6).
- Nové testy T-221 (toast safe-area), T-222 (hlavička nezalomí do 3 řádků), T-223 (16px pole na
  mobilu), T-224 (Inter reálně načtený).
- Vedlejší nález/oprava při ověřování: `w-full` na shluku správy kalendářů byl nutný, protože bez
  něj by na 390px šířce (`mobile` profil) shluk uvolnil místo pro sdílení řádku se stavovou
  pilulkou, což rozbíjelo zarovnání řádku 2 (T-184 regrese, opraveno před commitem).

Spec: `.github/specs/design_review_74.md`. Verifikováno: `tsc --noEmit` (web) čisté, doménové testy
125 passed, plná E2E `--workers=1` na všech 6 profilech = 678 passed / 138 skipped / 0 failed
(vizuální baseline `toolbar.png`/`empty-info.png`/`catalog-filtered.png`/`info-dark.png`/
`sheet-glass-*.png` přegenerovány — Inter má jinou metriku než systémový font).

### Funkční audit chyb: 8 tichých selhání opraveno (CHANGE-80)

Trigger: uživatel sdílel audit `.github/audit/after_review_71/` — funkční audit chybových stavů (8
nálezů, všech 8 potvrzeno subagentem proti zdroji) a rozsáhlý UI/UX/responzivní redesign audit
(zpracován samostatně jako DRAFT `design_review_73.md`, čeká na prioritizaci). Scope: **app
`@krouzky/web`** (bez schema/verze změny).

- Export všech kalendářů (`exportAllChildrenIcs`) teď stahuje soubory sekvenčně s odstupem ~400 ms
  (prohlížeče blokovaly druhý a další soubor bez pauzy) a po dokončení zobrazí toast „Staženo N
  kalendářů" — nová store akce `announce(label)` (lehký `set()`, nejde do historie undo/redo).
- `saveAutosave()` vrací `boolean`; status pilulka má nově TŘETÍ stav „Ukládání selhalo" (červená),
  když `localStorage.setItem` selže (soukromý režim, plné úložiště) — dřív se to tiše ignorovalo a
  UI dál tvrdilo „Uloženo".
- Export obrázku (.png) a import poškozeného `.ics` teď mají `try/catch` s uživatelskou hláškou
  (dřív jen tichá konzolová chyba / unhandled rejection).
- `setChildAge` validuje rozsah 3–19 a `NaN` (dřív se cokoliv zapsalo bez kontroly, i přes vložení
  přes schránku mimo HTML `min`/`max`).
- Nový `apps/web/app/error.tsx` (Next.js error boundary) — neošetřená chyba renderu teď nabídne
  „Obnovit" místo bílé obrazovky bez cesty zpět.
- `removeChild`/`removeSchedule` teď nastavují `lastActionLabel` stejně jako ostatní destruktivní
  akce — odebrání kalendáře i varianty rozvrhu zobrazí toast s akcí „Zpět" (dřív jen `window.confirm`
  bez zpětné vazby, že šlo vrátit).
- `VariantTabs.tsx` získal viditelný popisek „Varianty rozvrhu:" s vysvětlením rozdílu vůči
  „kalendáři" (dítěti) — dřív jen skrytý `title`.
- Nové testy T-185 (věk mimo rozsah), T-186 (toast po odebrání kalendáře/rozvrhu).
- Vedlejší nález při ověřování: nový popisek „Varianty rozvrhu:" měl nedostatečný kontrast
  (`text-slate-400`, 4.34:1) — opraveno na `text-slate-600` (T-300/301/310 zůstaly zelené).

Spec: `.github/specs/design_review_72.md`. Verifikováno: `tsc --noEmit` (web) čisté; plná E2E
`--workers=1` na všech 6 profilech = 663 passed / 129 skipped / 0 failed.

### Oprava: nesourodé výšky prvků v horní liště na mobilu (CHANGE-79)

Trigger: uživatel důrazně nahlásil, že položky v horní liště na mobilu mají různou výšku a nejsou
centrované; vyžádal si přesné pixelové ověření, ne jen vizuální dojem. `getBoundingClientRect()` na
390px potvrdil reálnou vadu: ve druhém řádku lišty (od CHANGE-76) měly „Uloženo" pilulka 22px, obal
Zpět/Vpřed 34px a „Další ▾" 44px — tři různé výšky ve stejném řádku. V prvním řádku (kalendář) byl menší
rozdíl 24 vs 28px (avatar vs pole/tlačítka).

- `Toolbar.tsx`: obal stavového indikátoru a obal Zpět/Vpřed dostaly `h-11` (44px, jako „Další ▾"),
  na desktopu `desk:h-auto` zachovává původní přirozenou výšku (beze změny vzhledu na desktopu — tam už
  bylo vše zarovnané kvůli více sousedním prvkům se srovnatelnou výškou).
- Pole/tlačítka v kalendářovém clusteru (`Název kalendáře`, přepínač, „Přidat kalendář“, „Odebrat“,
  inline formulář přidání) sjednocena z `py-0.5` na `py-1` → 28px, shodně s 28px avatarem.
- Nový test **T-184** (responsive.spec.ts) přímo měří `boundingBox()` všech tří skupin druhého řádku a
  ověřuje shodnou výšku i horní okraj (±1px) — jde nad rámec vizuálního snímku, chytí i budoucí
  regrese v přesných pixelech.
- Zbytek appky (katalogové karty, spodní navigace, čipy zájmů, dialog vlastní události, detail kroužku)
  prošel stejnou pixelovou kontrolou — bez dalších nálezů (variabilní výška katalogových karet je
  záměrná, daná obsahem/odznaky, ne vada).

Ověřeno: `tsc --noEmit` (web) čisté; vizuální baseline (T-400) beze změny (rozdíl pod prahem); plná E2E
`--workers=1` na všech 6 profilech.

### Oprava: mobilní menu „Další ▾" přetékalo mimo viewport (CHANGE-78)

Trigger: uživatel nahlásil, že po CHANGE-76 se na mobilu po kliknutí na „Další ▾" zobrazí velká část
nabídky mimo okno (text uřezaný vlevo). Ověřeno reálným screenshotem a přesným měřením souřadnic.

- Kořen: mobilní dropdown byl `absolute right-0` vůči svému MALÉMU wrapperu (jen tlačítko). Před
  CHANGE-76 byl tento wrapper vždy vtažený `ml-auto` až k pravému okraji lišty, takže `right-0` vycházelo.
  Po CHANGE-76 (`desk:ml-auto` — tlačítko teď na mobilu sedí uprostřed řádku, ne u okraje) zůstalo menu
  (288px) ukotvené k pravému okraji tlačítka a přetékalo vlevo mimo obrazovku.
- Oprava (`Toolbar.tsx`): dropdown je teď `fixed` s pozicí dopočtenou z reálné pozice tlačítka
  (`getBoundingClientRect()` v `useEffect` na otevření), `right` ohraničené uvnitř viewportu (8px okraj
  na obou stranách) — menu se teď vejde na obrazovku bez ohledu na to, kde tlačítko ve wrap flow skončí.
- Test **T-158** (persistence.spec.ts) upraven na nový `div.fixed` lokátor (dřív `div.absolute`, které se
  změnou třídy přestalo sedět).

Verifikováno reálnými screenshoty (360/390/834px) — menu plně uvnitř viewportu na všech; `tsc --noEmit`
(web) čisté; plná E2E `--workers=1` na všech 6 profilech.

### Kompletní mobil/tablet audit: duplicitní nadpis v katalogu (CHANGE-77)

Trigger: uživatel požádal o kompletní otestování mobil/tablet UX (ne jen horní lištu). Reálný headless
screenshot audit (360/390/834/1112px, přes Home/Katalog/Detail/Rozvrh/Děti) odhalil skutečnou, dřív
nezachycenou vadu nezávislou na CHANGE-76: v mobilním drill-down procházení katalogu (`<900px`, výchozí
stav bez rozkliknuté kategorie/filtru) se nadpis „Další kroužky (N)" vykresloval **dvakrát pod sebou** —
`CatalogPanel.tsx`'s `renderMobileCategoryBrowser()` měl vlastní kopii stejného nadpisu navíc k tomu, co
už vykresloval obalující `<section>`. Opraveno odstraněním duplicitní kopie. Nový test **T-183**
(catalog.spec.ts) hlídá počet výskytů nadpisu = 1. Toolbarová oprava z CHANGE-76 (`desk:ml-auto`) byla při
tomto auditu znovu vizuálně ověřena jako správná na všech čtyřech šířkách — žádná další "rozházená" lišta
nenalezena.

Verifikováno: `tsc --noEmit` (web) čisté; plná E2E `--workers=1` na všech 6 profilech = 645 passed / 123
skipped / 0 failed (+ T-183 zvlášť zeleně na kompaktních profilech).

### Soukromí a data v menu „Další ▾" + oprava rozházené mobilní lišty (CHANGE-76)

Trigger: uživatel požádal o vysvětlení automatického geokódování adresy na Nominatim, přidání položky
„Soukromí“ do menu „Další ▾" a vyřešení cookies/soukromí/impressum na SOTA úrovni; a otestování mobil/
tablet UX, kde nahlásil rozházené/neseřazené položky v horní liště. Scope: **app `@krouzky/web`** (bez
schema/verze změny).

- Nový `PrivacyDialog.tsx` (nová ikona `IconShield`), dostupný z menu „Další ▾" (položka „Soukromí a
  data", sdílené `exportItems` — funguje na desktopu i mobilu) — shrnuje: žádné cookies/sledování, data
  jen v `localStorage` tohoto prohlížeče, jedinou výjimku (geokódování adresy na Nominatim/OpenStreetMap
  s odkazem na jejich zásady), že export (.ics/.png/.json) se generuje lokálně a jen stahuje, upozornění
  že jde o demo (katalog kroužků je ukázková datová sada z volně dostupných serverů, informace nemusí
  být aktuální), a kontakt (odkaz na GitHub repozitář — osobní/nekomerční projekt, žádné formální
  impressum).
- `CustomEntryDialog.tsx` a `DetailsPanel.tsx` (adresa kroužku): jednořádková poznámka u pole adresy
  vysvětlující, že se adresa při uložení automaticky odesílá na Nominatim (dřív bez jakéhokoliv
  upozornění v UI).
- **Oprava reálné mobilní vady**: pravá akční skupina Toolbaru (Zpět/Vpřed/Otevřít/Uložit/Další ▾) měla
  `ml-auto`/`justify-end` bez `desk:` prefixu — na šířkách <900px, kde je většina prostředních prvků
  skrytá, to od stavového indikátoru „Uloženo" odtrhlo velkou prázdnou mezeru. Opraveno na `desk:ml-auto
  desk:justify-end` — na mobilu teď akce navazují plynule, na desktopu beze změny.
- Testy: nový **T-181** (persistence) ověřuje dialog „Soukromí a data" a jeho obsah, nový **T-182**
  (schedule) ověřuje poznámku u adresy. Vizuální baseline `toolbar-*` přegenerovány pro profily
  ovlivněné opravou mezery.

Spec: `.github/specs/design_review_71.md`. Verifikováno: `tsc --noEmit` (web) čisté; plná E2E
`--workers=1` na všech 6 profilech.

### Rozvrhni: přejmenování + správa kalendářů v horní liště (CHANGE-75)

Trigger: uživatel zadal 5 bodů — (1) přejmenovat aplikaci na „Rozvrhni“, (2) umožnit napsat vlastní
jméno kalendáře, (3) oprava nefunkčního odebrání kalendáře (dítěte), (4) „Přidat dítě“ → „Přidat
kalendář“ s volbou jména, (5) horní lišta neumožňovala přepínat mezi více kalendáři. Scope: **app
`@krouzky/web`** (bez schema/verze změny) + přejmenování v aktivní (ne-historické) dokumentaci.

- Zobrazovaný název aplikace je „Rozvrhni“ (`<title>`, README, aktivní `.github`/`test/docs`
  instrukce); historické `.github/specs/krouzky-planner-changes-*.md` záměrně beze změny.
- `plannerStore.ts`: nové akce `renameChild(childId, name)` a `removeChild(childId)` (kaskádově smaže
  `enrollments`/`customEntries` daného kalendáře ze VŠECH variant rozvrhu, no-op pro poslední zbývající
  kalendář, po smazání aktivního přepne na první zbývající). `addChild(name?)` nyní přijímá volitelné
  jméno (výchozí `Kalendář N` místo `Dítě N`).
- `Toolbar.tsx`: efemérní, nepersistované pole „Kalendář:“ (`calTitle`, ovlivňovalo jen jednorázový
  export) nahrazeno editovatelným polem „Název kalendáře“ vázaným přímo na `child.name` (commit
  onBlur/Enter) — to je teď i výchozí `X-WR-CALNAME`/název `.ics` souboru. Přepínač kalendářů, pole
  názvu, „Přidat kalendář“ (dřív „Přidat dítě“, teď s inline formulářem na jméno) a nové tlačítko
  „Odebrat“ (s `window.confirm`) jsou od teď VŽDY viditelné v horní liště na všech šířkách (dřív jen
  na desktopu, FR-12/FR-13 z `design_review_65.md` — vědomá revize jen pro tuto skupinu prvků). Stejné
  přejmenování/přidání/odebrání doplněno i do mobilní záložky „Děti" (`MobileChildrenPanel`, `page.tsx`).
- Testy: **T-101** (catalog), **T-158** (persistence), **T-167** (responsive), **T-609/T-610** (ics)
  přepsány na nové UI; nový **T-180** (schedule) ověřuje přejmenování + přidání s vlastním jménem +
  odebrání včetně kaskádového úklidu (přes uložený JSON). Vizuální baseline `toolbar`/`empty-info`/
  `catalog-filtered`/`info-dark` přegenerovány (layout lišty se změnil).

Spec: `.github/specs/design_review_70.md`. Verifikováno: `tsc --noEmit` (web) čisté; plná E2E
`--workers=1` na všech 6 profilech zelená po přegenerování vizuálních baselinů.

### SOTA vizuální kontrola: 3 opravené vady v editaci času (CHANGE-74, dodatek)

Trigger: uživatel požádal o kompletní vizuální otestování napříč rozhraními po CHANGE-74 se zaměřením
na chyby, překrytý text a symetrii. Manuální průchod skutečným prohlížečem (ne jen DOM assertions)
napříč šířkami odhalil tři reálné vady v novém `SessionTimeEditor` (FR-5, `design_review_69.md`), které
Playwright asercemi samy o sobě nezachytila předchozí E2E sada. Scope: **app `@krouzky/web`** (bez
schema/verze změny), + úprava 1 existujícího a 1 nový E2E test.

- **Chybějící validace `start < end`** — editace jen jednoho pole (start nebo konec) mohla zapsat
  neplatný časový rozsah do `sessionOverrides` bez kontroly (store mutuje přímo, mimo zod validaci).
  Oprava: `SessionTimeRow` nyní drží řízený místní stav a validuje aktuální dvojici před zápisem. Nový
  test **T-179**.
- **Vizuální přetečení „upraveno vámi" + „Obnovit"** z pravého panelu na desktopu (jeden přeplněný
  `flex` řádek). Oprava: značka a tlačítko na vlastní řádek pod časy (`flex-wrap`).
- **Duplicitní React `key={activity.id}`** mezi `SessionTimeEditor` a `ActivityEditor` (přímí
  sourozenci) — konzolové varování „two children with the same key". Oprava: `key={`times-${activity.id}`}`.

Spec: `.github/specs/design_review_69.md` §4. Upraven **T-178** (dvoupolní platná úprava místo
jednopolní, která je nyní správně odmítnuta), nový **T-179** (negativní případ). `vitest` (domain, 125
testů) zelené; `tsc --noEmit` (domain+web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech
(627 passed / 123 skipped / 0 failed).

### Vlastní barva u vlastních událostí + editace času katalogové aktivity (CHANGE-74)

Trigger: uživatel požádal o dvě úpravy — (1) možnost zvolit barvu u vlastních událostí, (2) možnost
editovat čas katalogové aktivity (cena/adresa už editovatelné byly, `ActivityOverride`, CHANGE-4; čas
ne — katalog nemusí odrážet aktuální stav). Scope: **engine `@krouzky/domain` 0.6.0 → 0.7.0** + **app
`@krouzky/web`**, `schemaVersion` 7 → 8.

- `CustomEntryDialog.tsx` získal sekci „Barva“ (`ColorSwatches`) zapisující do existujícího
  `CustomEntry.colorOverride` (doména ho už podporovala, jen chybělo UI).
- Nová entita `SessionOverride` (`sessionId` + volitelné `weekday`/`startMinutes`/`endMinutes`) —
  `PlannerState.sessionOverrides`. Nové čisté funkce `effectiveSession()`/`applySessionOverrides()`
  ([session-override.ts](packages/domain/src/model/session-override.ts)).
  `plannerStore.ts`'s `catalog` pole se nově přepočítává s aplikovanými přepisy při každé změně i při
  `loadState`/`hydrate` — všichni čtenáři katalogu (konflikty, ICS export, souhrn, doporučení, UI) tak
  transparentně vidí opravený čas beze změny vlastního kódu.
- `DetailsPanel.tsx` získal sekci „Upravit časy“ (per Session, s označením „upraveno vámi“ a tlačítkem
  „Obnovit“).

Spec: `.github/specs/design_review_69.md`. Nové testy: `session-override.test.ts` (6 testů),
`state.test.ts` (migrace v7→v8), E2E `T-177` (barva vlastní události) + `T-178` (editace času
katalogové aktivity) v `schedule.spec.ts`. `vitest` (domain, 125 testů) zelené; `tsc --noEmit`
(domain+web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech (621 passed / 123 skipped / 0
failed).

### Školní prázdniny okresu Rakovník + potlačení výskytu v mřížce (CHANGE-73)

Trigger: uživatelský spec požadoval, aby se aktivity ve výchozím stavu negenerovaly o školních
prázdninách/státních svátcích, s explicitním override „i o prázdninách“. Spec byl přepsán do
`design_review_68.md` (viz `§0` pro věcné opravy proti vstupnímu dokumentu — `allowOnHolidays` patří na
`ActivityOverride`, ne na `Activity`; vícedenní prázdniny se rozepisují po jednotlivých dnech; Agenda a
`CustomEntry` zůstávají mimo scope, viz nové `BL-047`/`BL-048`). Scope: **engine `@krouzky/domain` 0.5.0
→ 0.6.0** + **app `@krouzky/web`**, `schemaVersion` 6 → 7.

- Nová doménová funkce `districtSchoolHolidays(schoolYear, districtCode)` — 21 záznamů (`scope:
  'district'`) pro okres Rakovník, školní rok 2026/2027 (podzimní/vánoční/jarní prázdniny). `BL-020`
  zůstává otevřený (obecný výběr okresu/MŠMT rozpis).
- `ActivityOverride.allowOnHolidays?: boolean` — nové pole, override na úrovni celé aktivity.
- `districtCode: 'rakovnik'` nastaven v reálných datech (`novestraseci.ts`); `plannerStore.ts` slučuje
  `districtSchoolHolidays()` s `schoolYearHolidays()` do počátečních `exceptions`.
- `ScheduleGrid` v týdenním/denním pohledu nevykreslí blok katalogové aktivity v den prázdnin/svátku bez
  zapnutého override (vizuální ztlumení pozadí dne zůstává). `CustomEntry` se nikdy nepotlačuje.
- `DetailsPanel` získal přepínač „Povolit i o prázdninách a státních svátcích“.
- ICS export (`generateIcs`) respektuje override per-událost — `EXDATE`/posun `DTSTART` se u aktivit s
  `allowOnHolidays: true` neaplikuje.

**Kritický nález při implementaci:** `setActivityOverride()` v `plannerStore.ts` měl natvrdo vypsaný
seznam klíčů pro kanonické pořadí (bajtově shodný round-trip, `BL-021`) — nové pole `allowOnHolidays` v
něm chybělo, takže se při každém zápisu tiše zahodilo. Odhaleno E2E testem, ne code review; opraveno
doplněním klíče do seznamu (viz `design_review_68.md` §4).

Spec: `.github/specs/design_review_68.md`. Nové testy: `holidays.test.ts` (`districtSchoolHolidays`),
`state.test.ts` (migrace v6→v7), `ics.test.ts` (`allowOnHolidays` per-event), E2E `T-176`
(`schedule.spec.ts`). `vitest` (domain, 118 testů) zelené; `tsc --noEmit` (domain+web) čisté; plná E2E
`--workers=1` zelená na všech 6 profilech (609 passed / 88 skipped / 0 failed).

### Realizace backlogu z v6/v7 UX kol (CHANGE-68 až CHANGE-72)

Trigger: uživatel po validaci `design_review_65.md`/`design_review_66.md` požádal o realizaci vybraných otevřených položek backlogu. Scope: **engine `@krouzky/domain` 0.4.0 → 0.5.0** (CHANGE-68, CHANGE-69) + **app `@krouzky/web`** + testy.

- **CHANGE-68 (BL-038)**: per-dítě konfigurovatelný čas na přesun (`Child.travelBufferMinutes`) a dopravní mód (`Child.travelMode`: pěšky/auto/MHD) — `schemaVersion` 5→6. H9 detekce (`detectTightTransfers`) je používá místo globálního výchozího nastavení. UI v Toolbaru (desktop) i záložce „Děti" (mobil).
- **CHANGE-69 (BL-039)**: nová doménová funkce `previewGroupConflict()` simuluje přidání aktivity do rozvrhu BEZ zápisu a vrátí nejzávažnější konflikt — karta katalogu tak ukáže 🔴/🟡 odznak ještě před přidáním. `capacity_unknown` je z náhledu záměrně vyloučeno (jinak by označilo skoro každou kartu, viz `design_review_67.md` §0.2).
- **CHANGE-70 (BL-040)**: tlačítko sekce doporučení nese popisek „Co se hodí [dítě]? (N)" s počtem plnohodnotných shod místo obecného „Doporučení na míru".
- **CHANGE-71 (BL-042)**: cenový rozsahový filtr („Cena do (Kč)") s přepínačem „Zahrnout i aktivity bez uvedené ceny" (výchozí vypnuto).
- **CHANGE-72 (BL-045, částečně)**: zavírací tlačítko a „Odebrat termín" v dialogu „Vlastní událost" mají touch target ≥44×44 px na kompaktních šířkách; zavírací tlačítko navíc získalo přístupný název (dřív žádný nemělo).

Spec: `.github/specs/design_review_67.md`. Nové testy T-172 až T-175 (E2E) + doménové testy pro `previewGroupConflict`/per-dítě travel buffer/mode (`conflicts.test.ts`) + migrace v5→v6 (`state.test.ts`). Vizuální baseline `toolbar`/`empty-info`/`catalog-filtered`/`info-dark` regenerovány (desktop, desktop-narrow, mobil, mobile-small, tablet-portrait — nové ovládací prvky v Toolbaru/CatalogPanel). `vitest` (domain, 110 testů) zelené; `tsc --noEmit` (domain+web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech.

### Konsolidace v6 UX auditu — 5 opravených nálezů (CHANGE-66)

Trigger: tři nové UX analýzy (`analysis_65_a/b/c.md`) testovaly živý build po CHANGE-60..65. Scope: **app `@krouzky/web`** + testy. Před psaním FR byl každý nález ověřen proti aktuálnímu kódu — 8 z ~14 tvrzení bylo buď už hotovo, nebo věcně nepřesné (viz `design_review_65.md` §0.1); FR-14 (přesun „Vlastní událost") byl na základě vlastní zpětné kontroly zrušen, protože tlačítko je díky flex layoutu vždy viditelné bez scrollu.

- **FR-9**: kompaktní karta katalogu (`sessionLabel()`) nyní ukazuje časový rozsah `start–end`, ne jen začátek termínu (data měla `endMinutes` k dispozici, jen se nepoužívalo).
- **FR-10**: cena všude (karta katalogu, „Cena a věk" u kroužku i vlastní události) používá `toLocaleString('cs-CZ')` stejně jako Domů/Souhrn — konzistentní tisícový oddělovač.
- **FR-11**: konkrétní odůvodnění konfliktu (jméno obou kolidujících položek) se nyní zobrazuje i u tvrdých (červených) konfliktů, ne jen u logistických (dřív se generovaná zpráva u H1–H5 zahazovala). Mobilní Agenda (výchozí pohled) nově nese stejný odznak jako mřížka — dřív tam konflikty nebyly vidět vůbec.
- **FR-12 + FR-13**: mobilní horní lišta (`<900px`) je odlehčená — „Věk" vstup, přepínač dítěte a „Přidat dítě" se přesunuly ze vždy-viditelného Toolbaru do nové sekce `MobileChildrenPanel` v záložce „Děti" (dřív tato záložka jen duplicitně ukazovala týdenní souhrn). Undo/redo zůstala v Toolbaru (nízké riziko, žádný test na ně necílil).

Spec: `.github/specs/design_review_65.md` (IMPLEMENTED; NEEDS INPUT otázky pro FR-12/FR-13 vyřešeny agentem dle §3, uživatel zadal „implementuj vše"). Nové testy T-164, T-165, T-166, T-167; upraveny T-609/T-610 (na kompaktních profilech nejdřív otevřou záložku „Děti"). Vizuální baseline `toolbar`/`empty-info`/`info-dark`/`catalog-filtered` regenerovány pro mobil/mobile-small (+ `empty-info` pro tablet-portrait). `vitest` (domain, 102 testů, beze změny) zelené; `tsc --noEmit` (domain+web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech.

### Dokončení redesignu v5: zbylých 5 FR z design_review_58.md (CHANGE-61 až CHANGE-65)

Trigger: uživatel požádal o dokončení celého seznamu FR z `design_review_58.md` (DRAFT CHANGE-59). Scope: **engine `@krouzky/domain` 0.3.0 → 0.4.0** (CHANGE-63, CHANGE-65) + **app `@krouzky/web`** + testy.

- **CHANGE-61 (FR-2 + FR-3 + FR-5, app-only):** Domů obrazovka dostala blok „Dnes" (dnešní události, řazené časem) nad „Tento týden"; detail kroužku ukazuje explicitní porovnání věku aktivního dítěte s rozsahem aktivity („✓ Věk odpovídá"/„⚠ Mimo doporučený věk"); toast po přidání/odebrání nese jméno konkrétní položky (ne obecnou zprávu) a zobrazuje se 4 s (bylo 2,4 s) — nové efemérní store pole `lastActionLabel`/`lastActionNonce`, `commit()` helper dostal volitelný `after(store)` callback.
- **CHANGE-62 (FR-6, app-only):** mobilní katalog (`<900px`) defaultně prochází kategorie po jedné úrovni (kořen → podkategorie → aktivity) místo „Rozbalit vše" zobrazujícího celý strom. „Rozbalit vše"/„Sbalit vše" záměrně zůstávají dostupné i na mobilu jako zkratka (odchylka od doslovného zadání — cca 36 existujících testovacích call-sites na nich stálo napříč 9 spec soubory).
- **CHANGE-63 (FR-4, engine + app):** nové pole `CustomEntry.kind` (Kroužek/Škola/Lékař/Jiné), `schemaVersion` 4 → 5 s migrací. „Vlastní událost" nabízí typ s výchozí barvou; `useScheduleView` nově skutečně používá `colorOverride`/typ pro barvu bloku (dřív nepoužité pole).
- **CHANGE-64 (FR-7, app-only):** střední šířky (900–1439 px) dostaly trvalý master-detail sloupec (katalog + detail současně, bez překryvu) místo `absolute` slide-over overlay — jen změna CSS pozicování, breakpointy a test id (`info-drawer`) beze změny.
- **CHANGE-65 (FR-8, engine + app):** nová detekce logistické kolize `travel_infeasible` (🟠) mezi dvěma různými lokalitami s krátkou mezerou — konečně zapojuje dříve nepoužitý `packages/domain/src/travel/index.ts` (haversine/`travelMinutes`). Amber „●" indikátor v `ScheduleGrid` nese konkrétní odůvodnění místo obecného „Upozornění".

Spec: `.github/specs/design_review_60.md` až `design_review_64.md` (delty na `design_review_58.md`, nyní IMPLEMENTED). Nové testy T-137, T-160, T-161, T-162, T-163 + 5 doménových testů (`conflicts.test.ts`) + 1 migrační test (`state.test.ts`). Uzavřeny `BL-034`/`BL-035`/`BL-036`/`BL-037`; nový `BL-038` (per-dítě nastavení buffer/mód přesunu). `vitest` (domain, 102 testů) zelené; `tsc --noEmit` (domain + web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech.

### Srozumitelný zápis dalších termínů na kartě katalogu (CHANGE-60)

Trigger: první prioritizovaná položka (FR-1) z redesign backlogu `design_review_58.md` (DRAFT CHANGE-59). Scope: **app `@krouzky/web`** + testy.

- **FR-1** Kompaktní karta kroužku (i shodně použitá pro seznam „V rozvrhu") nahrazuje strohé „Po 16:30 · +1" srozumitelným zápisem se správným českým skloňováním — „Po 16:30 + 1 další termín" / „+ 2 další termíny" / „+ 5 dalších termínů" (nová `extraTerminText()`). Klik na kartu (jediný interaktivní cíl) beze změny otevře detail se sekcí „Varianty docházky" vypisující úplný seznam termínů — tím FR-1 plní i požadavek „klik zobrazí úplný výpis", aniž by bylo nutné vnořovat další interaktivní prvek do karty (nevalidní `<button>` v `<button>`). Vedlejší úklid: odstraněna mrtvá, nikdy nevolaná `pluralizeVariants()` (chybně kombinovala „termín"/„varianty"/„variant" pro stejný počet).

Spec: `.github/specs/design_review_59.md` (delta na `design_review_58.md` §1 FR-1). Nový test T-129 (`catalog.spec.ts`); upřesněn `BL-035` (BL-031's dřívější tvrzení o vyřešení bylo nepřesné). `tsc --noEmit` (web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech; vizuální baseline beze změny.

### Redesign v5: konsolidace tří UX auditů — spec dokumentace + drobné opravy sheetu (CHANGE-58, CHANGE-59 DRAFT)

Trigger: tři nahrané dokumenty v5 (`analysis_redesign_specification_a/b/c.md`) + tři konkrétní nahlášené drobnosti v mobilním sheetu detailu. Scope: **app `@krouzky/web`** + testy + dokumentace.

- **CHANGE-58** (IMPLEMENTED): mobilní spodní sheet detailu ztrácí matoucí textový přepínač „Sklo"/„Bez skla" (zůstávají tři automatické cesty vypnutí skla — `@supports`, `prefers-contrast`, `prefers-reduced-transparency`); dekorativní posuvný pruh nahrazen tlačítkem s ikonou maximalizovat/minimalizovat se stejnou existující logikou (`sheetExpanded`); zavírací „x" beze změny. Navíc oprava dalšího přehlédnutého výskytu přepočtu ceny na měsíc — dlaždice „Náklady" na Domů obrazovce (stejný root cause jako CHANGE-57, `HomeScreen.tsx` nebyl v jeho rozsahu kontrolován).
- **CHANGE-59** (DRAFT, neimplementováno): konsolidace tří UX auditů do jedné spec-dev dokumentace s křížovou kontrolou proti již odvedené práci (většina požadavků z dokumentů už hotová — bottom nav, doporučení s vysvětlením, dítě jako kontext, safe-area, tap-to-add). Zapsané mezery: ambiguous „+1" notace termínů na kartě katalogu, chybějící „Dnes" blok na Domů, chybějící explicitní porovnání věku dítěte s rozsahem aktivity, obecná (ne na akci) zpráva toastu s 2,4s místo 4s, „Rozbalit vše" místo postupného procházení kategorií na mobilu, chybějící trvalý tabletový master-detail layout, chybějící 3-stavový kolizní systém s logistikou přejezdu (dormant `packages/domain/src/travel`). Vyžaduje produktovou prioritizaci před implementací — nové `BL-035`/`BL-036`/`BL-037`, upřesněn `BL-034`.

Spec: `.github/specs/design_review_57.md` (CHANGE-58), `.github/specs/design_review_58.md` (CHANGE-59, DRAFT). Testy T-307/T-403 upraveny (bez ručního přepínače skla). `tsc --noEmit` (web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech; vizuální baseline `sheet-glass-on/off` přegenerovány.

### Skutečná cena bez přepočtu, detail kroužku bez fixního souhrnu, oprava ikony hledání (CHANGE-57)

Trigger: čtyři konkrétní chyby nahlášené uživatelem přímo z používání aplikace. Scope: **app `@krouzky/web`** + testy.

- **FR-1** Cena kroužku/vlastní události se všude (detail kroužku, detail vlastní události, souhrn nákladů, karta katalogu) zobrazuje ve **skutečně zadané** částce a období — odstraněn přepočet `toMonthlyCzk` na měsíc, který byl v rozporu s vlastním principem domény (ceny za různá období se nikdy neslévají). „Náklady na kroužky" v souhrnu nově vypisují `costByPeriod` po jednotlivých obdobích místo jednoho blendovaného ročního/měsíčního odhadu.
- **FR-2** `DetailsPanel` zobrazuje týdenní souhrn (Obsazenost týdne/Souhrn týdne/Náklady) **jen** když není nic vybráno. Po kliknutí na kroužek nebo vlastní událost se zobrazí **jen** jeho detail — bez matoucího připnutého agregátního záhlaví nad ním. Vedlejší efekt: „Varianty docházky" (víc termínů pro tentýž kroužek) je teď hned viditelná pod primárním CTA, bez nutnosti scrollovat pod týdenní souhrn.
- **FR-3** Neplatná Tailwind třída `pl-8.5` (v3 nemá krok `8.5` ve výchozí škále mezer → negenerovala žádné CSS) ve vyhledávacím poli katalogu nahrazena `pl-9` — ikona lupy už nepřekrývá zadaný ani placeholder text.

Spec: `.github/specs/design_review_56.md`. Testy T-148 a T-308 přepsány na nové chování; nový T-128 (ikona lupy, `catalog.spec.ts`). Visual baseline `sheet-glass-on/off` přegenerovány (obsah mobilního sheetu se vizuálně změnil po odstranění souhrnu z vybraného stavu). `vitest` (96 zelených) + `tsc --noEmit` (domain i web) čisté; plná E2E `--workers=1` zelená na všech 6 profilech.

### Vyhledávání se po přidání vyprázdní + oprava sčítání ceny (CHANGE-56)

Trigger: dva nahlášené defekty. Scope: **engine `@krouzky/domain`** + **app `@krouzky/web`** + testy.

- **FR-1** `scheduleSummary` počítala cenu kroužku za každý enrollment — kroužek zapsaný do 2/3 samostatných skupin (2×/3× týdně) měl cenu sečtenou 2×/3×, ačkoli cena je za kroužek jako celek. Oprava: deduplikace podle `activityId`.
- **FR-2** Vyhledávací pole katalogu po přidání kroužku (přes primární CTA) zůstávalo vyfiltrované i po přepnutí na jinou záložku a zpět (`CatalogPanel` je trvale připojený, jen skrytý na mobilu). Nový efemérní store nonce `clearCatalogSearchNonce` (vzor `focusNonce`) vyprázdní pole po úspěšném přidání.

Spec: `.github/specs/design_review_55.md`. Nový doménový test `scheduleSummary.costByPeriod`; nový E2E T-127 (`catalog.spec.ts`). Posouzeny i `analysis_53_a.md` (už řeší CHANGE-55) a `analysis_55_a.md`/`analysis_55_b.md` (velký v4 redesign — zapsáno jako `BL-034`, neimplementováno). `vitest` (96 zelených) + `tsc --noEmit` (domain i web) čisté; E2E beze změny v existujících testech.

### Mobile & tablet usability fix: safe-area, sheet lifecycle (CHANGE-55)

Trigger: analýzy `analysis_53_a.md`/`analysis_53_b.md` (P0 mobilní chyby). Scope: **app `@krouzky/web`** + testy.

- **FR-1** Kořenový shell (`page.tsx`) používá `h-dvh` (100dvh) místo `h-screen` (100vh) — iOS Safari nezohledňuje dynamickou adresní lištu u `100vh`.
- **FR-2/FR-3** Mobilní spodní navigace i sheet rezervují `env(safe-area-inset-bottom, 0px)` (nav paddingem, sheet `margin-bottom` navíc k nezměněné třídě `bottom-12`, ať zůstane stabilní CSS selektor napříč testy).
- **FR-4** Mobilní sheet se po kliknutí na primární „Přidat do rozvrhu" automaticky zavře (`onEnrolled` callback, jen z primárního CTA — ne z „Varianty docházky"/„Odebrat").
- **FR-5** Nové tlačítko „Zavřít" (44×44 px) v hlavičce sheetu, nezávislé na scrollování k „Zpět na souhrn".

Zamítnuté alternativy: plný modal s backdropem (sheet zůstává záměrně neblokující „peek", CHANGE-27) a gesto swipe-down (vyžaduje gesture knihovnu) — obojí sledováno jako `BL-033`, spolu s tabletovým hybrid layoutem 768–1024 px. Spec: `.github/specs/design_review_54.md`. Nové testy T-218/T-219/T-220 (`responsive.spec.ts`). Regrese odhalené plným E2E během opraveny: sdílený helper `enrollFirst` v `a11y.spec.ts` nově má variantu `enrollFirstAndReopen` (T-307/308/310 potřebují sheet znovu otevřený po auto-close; T-303 by tím dostal jiný počáteční bod Tab a odhalil nesouvisející existující mezeru v focus ringu karet katalogu — ponecháno beze změny, `enrollFirst` zůstal původní). Visual baseline `sheet-glass-on/off` přegenerovány (nové tlačítko v hlavičce). Plná E2E `--workers=1` zelená přes **všech 6 profilů (520 passed, 0 failed)**; `tsc` (web) čisté; app HTTP 200.

### GUI redesign: SVG ikony, doporučení sbalitelná, a11y/perf opravy (CHANGE-54)

Retroaktivní záznam — kód shipnut jako commit `4b28b7b` 2026-08-17. Scope: **app `@krouzky/web`** + testy.

- **FR-1** Nová sada SVG ikon (`Icons.tsx`) nahrazuje ASCII znaky (↶ ↷ ▾ 📍 ×) napříč Toolbar/VariantTabs/CatalogPanel/DetailsPanel/HomeScreen/ScheduleGrid/CustomEntryDialog/`page.tsx`/ColorSwatches/MonthView.
- **FR-2** Katalogová sekce „Doporučení na míru" je defaultně sbalená (přepínač) a omezená na 3 položky (bylo 4) — hlavní tok je katalog → rozvrh → export, ne doporučení.
- **FR-3/4** Opravy zjištěné E2E po redesignu: kontrast (`text-slate-400`), focus ring offset na barevných puntících, dark mode (nové poloprůhledné třídy nebyly v dark bloku namapované), sklo mimo scroll/vnořené sklo, gradientové pozadí bránící axe spočítat kontrast, šířka sloupce mřížky na 1440 px.

Spec: `.github/specs/design_review_53.md`. Testy T-122–126/T-140/141/155/156/602/603 upraveny na nové UI. Plná E2E `--workers=1` zelená přes **všech 6 profilů (508 passed, 0 failed)**, ověřeno 2× nezávislým čistým během; `tsc` (web) čisté; visual baseline přegenerovány; app HTTP 200.

### Planner-first shell: Domů (týden-first) + bottom nav + onboarding (CHANGE-53)

BL-029 fáze 2c (poslední bloky). Scope: **app `@krouzky/web`** (+ testy T-215/T-216/T-217).

- **FR-1** Mobilní spodní navigace na 4 záložky **Domů/Katalog/Rozvrh/Děti** (výchozí Domů); „Info" → „Děti".
- **FR-2** Nová `HomeScreen` (jen mobil): týden-first souhrn (kroužky/volné dny/náklady/kolize přes `useScheduleView`) + top-3 doporučení; CTA na Katalog/Rozvrh.
- **FR-3** Neblokující onboarding karta „Rychlé nastavení" (věk + zájmy) při prvním spuštění; „Hotovo" uloží do `localStorage` a přepne na Katalog.
- **FR-4** Desktop beze změny (tři sloupce, bottom nav je `desk:hidden`); „Katalog"/„Rozvrh" navigace zachována.

Onboarding je karta, ne modal (modal by přebil E2E i UX). Spec: `.github/specs/design_review_52.md`. Plná E2E `--workers=1` zelená přes **všech 6 profilů (508 passed, 0 failed)**; a11y zelené; `tsc` (web) čisté; app HTTP 200. **Tím je BL-029 hotový.** Při plném běhu odhaleny a opraveny dva profil-specifické nálezy: dark-kontrast sekce „Doporučení" (`bg-slate-50/60` → `bg-slate-50`, dark blok mapuje na #1e293b; T-310) a přegenerovány tablet-landscape vizuální baseline (zamýšlený drift lišty z CHANGE-49/50).

### Personalizace: dostupnost (dny) + měsíční rozpočet (CHANGE-52)

BL-029 fáze 2b. Scope: **app `@krouzky/web`** (+ testy T-125/T-126). Dokončuje personalizační vstupy enginu z CHANGE-45.

- **FR-1** Přepínače „Které dny může?" → `Child.availability` (celodenní okno na vybraný den); doporučení → „✓ Termín ve volném čase".
- **FR-2** Pole „Měsíční rozpočet (Kč)" → `Child.budgetMonthlyCzk` (prázdné/0 = bez limitu); doporučení → „✓ V rozpočtu". Ukládá se při Enter/blur (ne per-úhoz).
- **FR-3** Obě v sekci „Doporučujeme" (jen nefiltrovaný pohled); undo/redo + autosave se aplikují (`setChildAvailability`/`setChildBudget` přes `commit`).
- **FR-4** Chipy dnů dostupnosti mají `aria-label` „Volno {zkratka}" → nekolidují s filtrovacími chipy dnů; vizuální baseline beze změny.

Spec: `.github/specs/design_review_51.md`. Plná E2E `--workers=1` zelená (desktop + mobile-small, 169 passed) bez regenerace baseline; a11y zelené; `tsc` (web) čisté; app HTTP 200. Tím jsou hotové všechny personalizační vstupy z CHANGE-45; zbývá Home/týden-first, bottom nav a onboarding (velký shell redesign, BL-029).

### Doporučení kroužků s důvody + výběr zájmů (CHANGE-51)

BL-029 fáze 2a (planner-first). Scope: **app `@krouzky/web`** (+ testy T-122/T-123/T-124). Konzumuje engine z CHANGE-45.

- **FR-1** V nefiltrovaném katalogu sekce „Doporučujeme" — top-4 `buildRecommendations` s pozitivními důvody (✓ …) bez procent.
- **FR-2** Chipy kategorií přepínají `Child.interests` (nová store akce `setChildInterests` přes `commit` → undo + autosave); doporučení se přepočítá („✓ Odpovídá zájmu …").
- **FR-3** Sekce jen v nefiltrovaném pohledu (`!hasActiveFilters`); při hledání ustoupí výsledkům.
- **FR-4** Klik na doporučení otevře detail kroužku.
- **FR-5** Doporučovací karty mají `aria-label` bez ceny → nekolidují s katalogovým lokátorem; vizuální baseline i počty položek beze změny.

`today` je vstup enginu počítaný v app vrstvě (doména čistá). Spec: `.github/specs/design_review_50.md`. Plná E2E `--workers=1` zelená (desktop + mobile-small, 165 passed) **bez regenerace baseline**; a11y T-300..310 zelené; `tsc` (web) čisté; app HTTP 200. Další bloky BL-029: Home/týden-first, bottom nav Domů/Katalog/Rozvrh/Děti, onboarding.

### Personalizace Child + doporučovací engine, fáze 1 (CHANGE-45)

BL-029 základ. Scope: **engine `@krouzky/domain`** (0.2.0 → **0.3.0**) + defaulty ve store `@krouzky/web`.

- **FR-1** `Child` získal volitelné personalizační vstupy: `interests: ActivityCategory[]` (default `[]`), `availability: { weekday, startMinutes, endMinutes }[]` (default `[]`), `budgetMonthlyCzk?`. `schemaVersion` 3 → **4** s migrací (starší stavy se doplní defaulty).
- **FR-2** Čistá `activityFit(activity, child, schedule, catalog, today)` → `{ score 0..1, reasons[] }`: věk, zájem, dostupnost, bezkolizní zařaditelnost, rozpočet. Deterministická (`today` je parametr, žádné `Date.now`/`Math.random`).
- **FR-3** Čistá `buildRecommendations(child, catalog, schedule, today, opts?)` → top-N dle skóre; vylučuje zapsané i vybrané kategorie; stabilní řazení (skóre desc, název asc).
- **FR-4** `reasons` jsou vysvětlitelné české popisky bez procent („✓ Vhodné pro věk", „✓ Bez kolize", …).
- **FR-5** Store inicializuje nová pole defaulty; aplikace i export fungují beze změny chování (fáze 1 nemá UI pro tato pole).

Nový modul `src/matching/`. Testy: `matching.test.ts` (10) + migrace v3→v4 v `state.test.ts`; celý domain vitest zelený (95). Pořadí klíčů `Child` sjednoceno se store literály (byte-shodný round-trip T-152). Spec: `.github/specs/design_review_44.md` (fáze 1 IMPLEMENTED). `apps/web` `tsc` čisté; plná E2E zelená (desktop + mobile-small); app HTTP 200. UI doporučení = fáze 2 (BL-029).

### Autosave stavu do prohlížeče (CHANGE-50)

BL-030. Scope: **app `@krouzky/web`** (doména beze změny) + testy T-151/T-159.

- **FR-1** Změny rozvrhu se automaticky ukládají do `localStorage` (`krouzky:autosave:v1`); po reloadu se stav obnoví. Ukládání přes `usePlannerStore.subscribe` (registrace až po obnově → mount-render obnovu nepřepíše).
- **FR-2** Obnova novou store akcí `hydrate` nezakladá položku do historie (undo nesmalže obnovená data).
- **FR-3** Verzovaná migrace přes `parsePlannerState` (stejná cesta jako import souboru); nedostupný/poškozený `localStorage` je best-effort.
- **FR-4** `beforeunload` varování odstraněno (data se již neztrácejí); pruh lišty přeznačen na „Ukládá se do prohlížeče; Uložit vytvoří záložní soubor.".

Nový modul `src/lib/autosave.ts`. Testy: T-151 zúžen na indikátor „Neuloženo" (bez `beforeunload`), nový T-159 ověřuje přežití reloadu. Spec: `.github/specs/design_review_49.md`. Plná sada `--workers=1` zelená (desktop + mobile-small + tablet-portrait, 234 passed); `tsc` (web) čisté; vizuál beze změny; app HTTP 200. Indikátor „Uloženo/Neuloženo" nadále = stav exportu do souboru.

### Mobilní lišta: akce do jednoho menu „Další ▾“ (CHANGE-49)

BL-031 poslední kus. Scope: **app `@krouzky/web`** (+ testy T-101/T-150/T-152/T-154, nový T-158).

- **FR-1** Na mobilu (<900 px) se Otevřít, Uložit a pole Kalendář přesunuly z lišty do jednoho menu „Další ▾“. Desktop beze změny (přímo v liště).
- **FR-2** Mobilní menu obsahuje Název kalendáře, Otevřít, Uložit, Barvy událostí a exporty (sdílené `exportItems` s desktopem).
- **FR-3** Undo/redo a stav „Uloženo/Neuloženo“ zůstávají na mobilu viditelné.
- **FR-4** Mobilní menu má stejný přístupný název „Další ▾“ → ICS testy fungují na obou profilech beze změny. Mobilní dropdown má `z-50` (nad detail sheetem `z-40`).

Testy: T-150 zúžen na desktop (`test.skip` na compact), T-101 + `saveAndRead` (T-152/T-154) na compactu otevřou menu, nový T-158 ověřuje mobilní strukturu. Spec: `.github/specs/design_review_48.md`. Plná sada `--workers=1` zelená (desktop + mobile-small + tablet-portrait, 231 passed); mobilní `toolbar-*` baseline přegenerovány; `tsc` (web) čisté; app HTTP 200. Tím je **BL-031 uzavřen**.

### Microcopy filtru: „Bez konfliktu“ místo „Vejde se mi to“ (CHANGE-48)

BL-031 microcopy. Scope: **app `@krouzky/web`** (+ testy T-114/T-115).

- **FR-1** Filtr `fitOnly` přejmenován z „Vejde se mi to“ na výstižnější „Bez konfliktu“ (skrývá kroužky kolidující s rozvrhem). Chování beze změny.
- „+1“ → „N termínů“ je již vyřešeno (T-110/T-120), v kódu žádné „+1“.

T-114/T-115 aktualizovány (název + lokátor). Spec: `.github/specs/design_review_47.md`. Vizuál beze změny (popisek není v záběru baseline); `tsc` (web) čisté.

### Mobilní dotykové cíle ≥ 44 px a funkčnost od 320 px (CHANGE-47)

Navazuje na CHANGE-46. Scope: **app `@krouzky/web`** (+ nové testy T-213/T-214).

- **FR-1** Spodní mobilní navigace (Katalog/Rozvrh/Info) má na <900 px výšku ≥ 44 px (`h-11` + `flex items-center justify-center`).
- **FR-2** Přepínač Agenda/Mřížka má na mobilu ≥ 44 px.
- **FR-3** Filtr dnů v katalogu má na mobilu ≥ 44 px; na desktopu zůstává kompaktní (`desk:h-auto desk:px-2 desk:py-0.5`), desktop baseline beze změny.
- **FR-4** Funkčnost bez vodorovného scrollu ověřena od 320 px (úvod i otevřený katalog).
- Poznámka: arbitrary `min-h-[44px]` v tomto Tailwind setupu negenerovala CSS → použita třída z výchozí škály `h-11`.

Nové testy: **T-213** (primární dotykové cíle ≥ 44 px na kompaktních profilech) a **T-214** (320 px bez vodorovného scrollu) v `responsive.spec.ts`. Barevné tečky (24×24) a checkboxy záměrně nezvětšeny (WCAG AA, T-205 zůstává). Spec: `.github/specs/design_review_46.md`. Mobilní vizuální baseline (catalog-filtered/empty-info/info-dark) přegenerovány; desktop `visual` beze změny; `tsc` (web) čisté; app HTTP 200.

### Mobilní GUI: odlehčení horní lišty a ovládání (CHANGE-46)

Mobilní aplikace byla přeplněná/nepoužitelná. Scope: **app `@krouzky/web`** (+ úprava T-152).

- **FR-1** Na mobilu (<900 px) skryt přepínač „Den/3 dny/Týden/Měsíc" (byl oříznutý/rozbitý); zůstává Agenda/Mřížka + ‹ Dnes ›. Výchozí je Agenda.
- **FR-2** Na mobilu skryty karty variant (`VariantTabs`), barva v liště (je i v detailu) a pomocné texty „Barva: vyberte kroužek" / „Rozvrh existuje jen v tomto okně".
- **FR-3** Testované akce (Název kalendáře, Uložit, Otevřít, Další ▾, Přidat dítě) a undo/redo zůstávají na mobilu dostupné.
- **FR-4** Microcopy nezávislé na rozložení: „z katalogu" místo „z katalogu vlevo", „otevře jeho detail" místo „detail vpravo".
- Test: T-152 na kompaktu nastavuje barevný override přes detail sheet (lišta barvu na mobilu už neukazuje).

Změny jsou čistě responzivní (`desk:` breakpoint + `isMobile`), desktop beze změny. Měření: úvodní mobil (360 px) 22 → 13 malých cílů, obsah výš. Spec: `.github/specs/design_review_45.md`. Odlehčení, ne redesign IA (ten je `design_review_44.md` fáze 2+, BL-029; touch cíle 44 px / 320 px = BL-031). Vizuální baseline mobilu přegenerovány; `tsc` (web) čisté.

### Changes 12: konflikty pryč z pravého sloupce, jeden panel v DOM, varianty pod „Přihlásit" (CHANGE-44)

Tři UX úpravy z testování. Scope: **app `@krouzky/web`** (+ úpravy testů).

- **FR-1** Sekce „Konflikty a upozornění" (včetně akce „Vyřešit") se z pravého sloupce odstranila; kolize zůstává vidět v mřížce (překrývající se události vedle sebe). Doménová `suggestVariantSwitches` zůstává (BL-027).
- **FR-2** `DetailsPanel` se v `page.tsx` vykresloval na 3 místech (aside + drawer + mobilní sheet) → v aktivním slotu se teď mountuje jen jeden → každý odkaz na mapu je v detailu právě jednou.
- **FR-3** Blok „Varianty docházky" přesunut na začátek těla detailu (hned pod hlavičku s „Přihlásit se"), místo na konec.
- Dark-mode kontrast: doplněno mapování `.text-red-600` (tlačítko „Odebrat vše z rozvrhu" mělo na tmavém povrchu 3.02:1) → T-310 zůstává čisté.

Spec: `.github/specs/design_review_43.md`. Nový **BL-027**. Testy: T-143 + T-309 přepsány (kolize v mřížce, ne v panelu), T-148 kotva rolování, T-150→**T-155** (oprava kolize ID s persistence.spec z CHANGE-43), nové T-156/T-157. Plná sada `--workers=1` zelená (desktop + mobil); `tsc` (web) čisté; vizuální baseline přegenerovány; app HTTP 200. `pnpm`/`eslint` nejsou v prostředí na PATH.

### Changes 11: filtr pořadatele, oprava CTA, připnutý souhrn, celodenní osa (CHANGE-43)

Čtyři vady z uživatelského testování. Scope: **app `@krouzky/web`** (+ úpravy testů).

- **FR-1** Levý sloupec má filtr podle pořadatele (`catalog.providers`); počítá se do „aktivních filtrů" a resetuje „Zrušit filtry".
- **FR-2** „Přidat první kroužek" na desktopu zaměří hledání v katalogu a vybere první kroužek (otevře detail) — dřív jen přepínal mobilní záložku, tj. mrtvé tlačítko.
- **FR-3/4** Pravý sloupec: **připnutá** hlavička (a) Obsazenost týdne, b) Souhrn týdne, c) Náklady celkem: částka/rok) + rolovací tělo. Detail zeštíhlen na 6 skupin (název+info+výběr dne+přidat/odebrat/upravit, barva, popis, kontakt, cena, adresa+mapy). Odebráno z detailu: kapacita, uzávěrka, „ověřeno", Kč/lekce, drift, poznámka rodiče; ze souhrnu: Uzávěrky, Moje limity, Porovnání variant. Konflikty zůstávají (rolovací). Ruší zobrazení uzávěrky z CHANGE-42 FR-1 (data zůstávají).
- **FR-5** Mapa: Mapy.cz + nativní mapy podle platformy (Apple/Google); vložený náhled OpenStreetMap odstraněn (ruší náhled z CHANGE-33).
- **FR-6** Osa kalendáře je opět celodenní (00–24); výchozí okno ukazuje denní hodiny (~07–21), noc dosažitelná rolováním; ruší tvrdý ořez 07–21 z CHANGE-36.

Spec: `.github/specs/design_review_42.md`. Nové **BL-023..BL-026** (odložené odebrané funkce). Nové/upravené testy T-104 (přepis), T-121, T-136, T-140, T-148, T-149, T-155 (mapy). Dotčené vrstvy zelené na desktop (81 passed) + mobile-small; `tsc` (web) čisté; vizuální baseline (`info-dark`, prázdné stavy) přegenerovány; app HTTP 200. `pnpm`/`eslint` v prostředí nejsou na PATH.

### Ověřená uzávěrka 26/27 a oprava Info slide-overu (CHANGE-42)

Dokončení T-140 + reálná UX oprava. Scope: **app `@krouzky/web`** (+ testy).

- **FR-1** (T-140/C8-D5, BL-017) Adaptér `novestraseci` plní ověřenou uzávěrku ročníku `2027-06-30` (jednotná pro 26/27; META přebije per kroužek). `DetailsPanel` zobrazí datum česky (`formatCzDate` → `30. 6. 2027`). `test.fixme` u T-140 odstraněn.
- **FR-2** Info slide-over (900–1440) přesunut dovnitř `<main>` jako `absolute` overlay (main `relative`) → už **nezakrývá nástrojovou lištu** (dřív `fixed inset-y-0` přes Uložit/Další). Testy `panel`/`catalog`/`schedule` na středních šířkách míří na `info-drawer` a otevírají Souhrn.

Spec: `.github/specs/design_review_41.md`. Uzavírá **BL-017**. Celá sada `--workers=1`: 445 passed, 0 failed; `tsc` (web) čisté; vizuální baseline (medium `empty-info`/`info-dark`) přegenerovány; app HTTP 200.
### Souběžný export všech dětí (CHANGE-41)

Dokončení správy více dětí. Scope: **app `@krouzky/web`** (+ E2E T-610).

- **FR-1** (T-610/C6-C2) Export menu má při >1 dítěti akci „Kalendář — všechny děti (.ics)": jedním kliknutím stáhne samostatný `.ics` na každé dítě (`downloadIcs` v cyklu přes `state.children`; `generateIcs` filtruje podle `child.id`). Různé názvy souborů, každý s vlastním `X-WR-CALNAME`.

Spec: `.github/specs/design_review_40.md`. Uzavírá souběžný export z **BL-020** (zbývají krajské jarní prázdniny). `tsc --noEmit` (web) čisté; E2E T-609+T-610 zelené (desktop+mobil).

### X-APPLE strukturovaná lokace a správa více dětí (CHANGE-40)

Oprava červených L6. Scope: **engine `@krouzky/domain` + app `@krouzky/web`**.

- **FR-1** (T-603/C6-A4) `generateIcs` emituje `X-APPLE-STRUCTURED-LOCATION;…:geo:lat,lon`, když má adresa `lat`/`lon` → Apple Kalendář umí navigaci na místo. Doménový test doplněn (vitest 84).
- **FR-2** (T-603) `CustomEntryDialog.save` doplní **offline střed města** (`offlineGeocode`: Nové Strašecí/Rakovník/Kladno) hned při uložení, takže souřadnice existují i bez sítě; online Nominatim je pak zpřesní.
- **FR-3** (T-609/C6-C2) Store má `addChild()` (undo, aktivuje nové dítě); Toolbar dostal přepínač dětí (`<select>` při >1) a tlačítko „+ Přidat dítě". Export běží nad aktivním dítětem (samostatný soubor na dítě).
- T-140 (uzávěrka) zůstává `test.fixme` — chybí **ověřená** `applicationDeadline` (BL-017), odhad ústava zakazuje.

Spec: `.github/specs/design_review_39.md`. Uzavírá zbytek **BL-020** (X-APPLE + více dětí). `tsc --noEmit` (domain+web) čisté; doména vitest 84; E2E ics+panel+funkční bez regrese; app HTTP 200.

### Responzivita a klávesová obsluha mřížky (CHANGE-39)

Oprava červených L2/L3 proti cílovému stavu Changes 9. Scope: **app `@krouzky/web`** (+ úpravy responsivních/a11y testů).

- **FR-1** (T-201/C9-L1) Tři stálé sloupce až od 1440 px (`isWide` = matchMedia `min-width:1440`); mezi 900–1440 je Info **slide-over** (`info-drawer`) otevíraný výběrem nebo tlačítkem „Souhrn", zavíraný křížkem/Escape.
- **FR-2** (T-202/C9-M1) Přepínač rozvrhu je `role="tablist"`/`role="tab"`, vždy viditelný na mobilu, výchozí vybraná je **Agenda**.
- **FR-3** (T-205/C9-M6) Globální `button{min-height:24px;min-width:24px}` → dotykové cíle ≥ 24×24 (dřív `Varianta A`, denní hlavičky, kategorie, `‹`/`›` měly 20/22 px).
- **FR-4** (T-207/C9-Y5) Toolbar: akční skupina `flex-wrap`, vstup názvu kalendáře zúžen + `min-w-0` → při zoomu 200 % žádný vodorovný scroll.
- **FR-5** (T-304/C9-A4) Buňky mřížky mají roving `tabIndex` + `aria-label` a `role=grid` obsluhuje šipky ←/→ (přesun fokusu mezi dny).
- Testy: T-210 platí jen od 1440 px; T-308/T-309/T-401/T-402 na středních šířkách otevřou Souhrn slide-over (nový design). Oprava `test/helpers/ics-raw.ts` (`unfold` měl `return` mimo funkci).

Spec: `.github/specs/design_review_38.md`. Uzavírá část **BL-019** (T-201/202/205/207/304). `tsc --noEmit` (web) čisté; E2E `responsive`+`a11y`+`visual` zelené napříč profily; vizuální baseline přegenerovány; app HTTP 200. `@playwright/test` musí být `^1.62.1` (1.47.x rozbíjí `emulateMedia({contrast})`).

### Dark mode — tmavý motiv podle `prefers-color-scheme` (CHANGE-38)

Doplnění tmavého motivu (T-310). Scope: **app `@krouzky/web`** (+ zpřesnění T-310).

- **FR-1** `@media (prefers-color-scheme: dark)` na konci `globals.css` mapuje tokeny a plochy (`bg-white`, `bg-slate-50/100/200/800/900` + `hover:` varianty), text (`slate-900..500`, `blue-600`), ohraničení a akcenty (emerald/amber/red) na tmavou paletu → `body` má tmavé pozadí (`#0f172a`).
- **FR-2** V tmavém režimu axe nula porušení A/AA (stav s vybraným a zapsaným kroužkem).
- **FR-3** Dark `hover:` přepisy dostaly `!important` — Tailwind hover varianty jinak vyhrály (hover na „Odebrat z rozvrhu" byl `#fef2f2` s tmavě-červeným textem = 1.73:1; po opravě `#450a0a`).
- Test T-310 posune myš na `(0,0)` a emuluje `reducedMotion` před axe (audit nezávisí na pozici myši ani na fade).

Spec: `.github/specs/design_review_37.md`. Uzavírá část **BL-019** (T-310). `tsc --noEmit` (web) čisté; E2E T-310 zelené (desktop+mobile-small, stabilně); vizuální baseline `info-dark.png` přegenerovány; `pnpm` v prostředí není na PATH.

### Kontrast a přístupnost mřížky — axe nula porušení (CHANGE-37)

Oprava a11y nálezů T-300/T-301. Scope: **app `@krouzky/web`** (+ zpřesnění a11y testů).

- **FR-1** Text ztmaven na `slate-600` / `red-700` (bylo `slate-400` ≈ 2.5:1, `view-range` na slate-100, `red-600` na `red-50`) → vše ≥ 4.5:1.
- **FR-2** Mřížka má strukturu `role="grid" > role="row" > role="gridcell"` (bylo grid→gridcell, kritická ARIA vada).
- **FR-3** Select kategorie dostal `aria-label`.
- **FR-4** Toast `@keyframes toastIn` bez `opacity` (jen posun); dekorativní symboly `↶ ●` mimo přístupný název (undo/redo mají `aria-label`).
- Testy: T-300/T-301 emulují `reducedMotion` (determinismus axe); T-301 vylučuje neškodné `incomplete` (`nonBmp`, `elmPartiallyObscur*`), cílí jen na sklo.

Spec: `.github/specs/design_review_36.md`. Uzavírá část **BL-019** (T-300/301). `tsc --noEmit` (web) čisté; E2E T-300/T-301 zelené (desktop+mobil, stabilně); vizuální baseline přegenerovány; `pnpm` v prostředí není na PATH.

### Denní osa, „Zrušit filtry“ a svátky v exportu (CHANGE-36)

Oprava tří reálných nálezů z E2E. Scope: **engine `@krouzky/domain` + app `@krouzky/web`**.

- **FR-1** (T-104/C6-E2) Osa mřížky pokrývá `07:00–21:00` místo 00:00–24:00 (`grid.ts`).
- **FR-2** (T-116/C7-E1) Prázdný výsledek katalogu s aktivním filtrem nabídne tlačítko „Zrušit filtry“.
- **FR-3** (T-606/C6-A9) Nový `schoolYearHolidays()` (doména) staví státní svátky ČR (pevné + velikonoční);
  store jimi inicializuje `exceptions`, takže ICS export vylučuje svátky přes `EXDATE`. Root cause: `store.exceptions` bylo `[]`.

Spec: `.github/specs/design_review_35.md`. Uzavírá **BL-022**, posouvá **BL-020** (zbývá X-APPLE T-603, více dětí T-609, krajské prázdniny).
`tsc --noEmit` (domain+web) čisté; `vitest` 83 zelených (+2 holidays); E2E T-104/T-116/T-606 zelené; `pnpm` v prostředí není na PATH.

### ICS revize (WKST/SEQUENCE) a determinismus přepisů (CHANGE-35)

Oprava tří reálných nálezů z E2E. Scope: **engine `@krouzky/domain` + app `@krouzky/web`**.

- **FR-1** (T-608/C6-A8) `RRULE` nese `WKST=MO`.
- **FR-2** (T-607/C6-A7) Každý VEVENT nese `SEQUENCE:<n>`; app předává `n = history.length`, takže po změně roste.
- **FR-3** (T-152/C8-E5) `setActivityOverride` ukládá přepis v kanonickém pořadí klíčů schématu →
  export→import→export je bajtově shodný. Root cause: objekt vznikal inkrementálně, zod ho po importu přeuspořádal.

Spec: `.github/specs/design_review_34.md`. Uzavírá **BL-021**, částečně **BL-020** (zbývá X-APPLE/EXDATE/více dětí).
`tsc --noEmit` (domain+web) čisté; `vitest` 81 zelených; E2E T-152/T-607/T-608 zelené; `pnpm` v prostředí není na PATH.

### Testy: kompletní E2E sada Playwright (bez CHANGE-id — tooling)

Přírůstek testovací infrastruktury, **žádná změna enginu `@krouzky/domain` ani app**, proto
bez `CHANGE-id` a beze změny verze. Sada dle `.github/copilot-instructions.md` a
[test/docs/test-spec.md](test/docs/test-spec.md).

- Napsány vrstvy L0 smoke, L1 funkčnost (katalog/rozvrh/panel/perzistence), L2 responzivita,
  L3 přístupnost (axe), L4 vizuální regrese (baseline), L5 výkon (CDP throttling, statické
  kontroly skla) a L6 export ICS (nad syrovým textem). Ověřeno na profilech desktop a mobile-small.
- Sada je záměrně z části červená — červené testy popisují cílový stav a odhalily reálné mezery,
  ne chyby testů. Nálezy zaznamenány do backlogu: **BL-020** (mezery ICS exportu: X-APPLE lokace,
  EXDATE svátků, SEQUENCE, WKST=MO, více dětí), **BL-021** (round-trip JSON není bajtově shodný —
  pořadí klíčů `overrides`), **BL-022** (osa mřížky 00:00–24:00, chybějící „Zrušit filtry"),
  doplnění **BL-019** (kontrast/dark/šipky/dotykové cíle) a **BL-017** (chybějící `applicationDeadline`).
- Souhrn a doporučení: [test/docs/test-report.md](test/docs/test-report.md).

### Kalendářová mřížka jen na klientu — oprava hydratace (CHANGE-34)

Oprava chyby odhalené E2E testem T-000. Scope: **pouze app `@krouzky/web`**.

- **FR-1** `ScheduleGrid` se importuje přes `next/dynamic` s `ssr: false`. Root cause:
  mřížka odvozuje zobrazený týden z aktuálního data; SSR použil serverový čas a klient
  svůj → `Text content did not match` (hydratační nesoulad) a chyba v konzoli.

Spec: `.github/specs/design_review_33.md`.
`tsc --noEmit` (web) čisté; `vitest` (81) beze změny; E2E T-000 na profilu desktop `1 passed`;
`pnpm` v prostředí není na PATH.

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
