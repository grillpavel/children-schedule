# Design Review 109 — Jeden render, ne dvě funkce volající sdílené kusy

**Status:** IMPLEMENTED (2026-09-02)
**Change ID:** CHANGE-116 (`apps/web`, nahrazuje přístup z CHANGE-114/115)
**Date:** 2026-09-02
**Repo:** `apps/web/src/components/EventDetailSections.tsx` (nový `EventDetail`),
`apps/web/src/components/DetailsPanel.tsx` (obě komponenty přepsány na adaptéry)
**Trigger:** uživatel po CHANGE-114/115 řekl přesně: „Chci, abys provedl SOTA
analýzu a aby to fungovalo přes 1 universální template" — CHANGE-114 vytvořilo
sdílené SEKCE, ale `SelectedActivity` a `CustomEntryDetail` pořád byly dvě
samostatné funkce, které si ručně psaly vlastní obal a POŘADÍ volání těch
sekcí. To pořadí/mezery se dalo (a stalo, CHANGE-115) znovu rozejít, protože
nic strukturálně nebránilo tomu, aby se dvě nezávislé funkce v budoucnu
rozešly zase.

## 0. SOTA analýza — proč sdílené sekce (CHANGE-114) nestačily

Rozdíl mezi „sdílené komponenty" a „jedna šablona":

- **CHANGE-114 (předtím)**: `SelectedActivity()` a `CustomEntryDetail()` byly
  dvě funkce. Každá měla vlastní `return (<section>...</section>)` a uvnitř
  ručně volala `<DetailLocationCard/>`, `<DetailPriceAgeCard/>` atd. — ve
  SVÉM pořadí, se SVÝM obalovým markupem kolem nich. Sdílené byly jen listy
  stromu, ne kořen. Nic nebránilo tomu, aby se v jedné z nich přidala sekce
  jinam, s jinými mezerami, nebo aby jedna dostala novou obálku (primární
  karta) a druhá ne — přesně to se stalo (CHANGE-115 to muselo dohledávat
  ručně diffem dvou funkcí).
- **CHANGE-116 (teď)**: existuje JEDNA funkce `EventDetail(model)`
  (`EventDetailSections.tsx`), která vlastní CELÝ strom — hlavičku, primární
  kartu, pořadí všech sekcí, patičku s akcemi. `SelectedActivity` a
  `CustomEntryDetail` už nevrací JSX stromu detailu vůbec — jen sestaví DATA
  (view model) a zavolají `<EventDetail model={...} />`. Je strukturálně
  nemožné, aby se pořadí nebo obal příště rozešly, protože existuje jen
  JEDNO místo v kódu, které o layoutu rozhoduje.

Tohle je stejný princip, jaký CHANGE-110 aplikovalo na `DialogShell` (jedna
komponenta vlastní obálku VŠECH popup oken) — teď aplikovaný o úroveň výš, na
celý obsah detailu, ne jen na jeho dílčí sekce.

## 1. Design view modelu

`EventDetail` bere kombinaci prostých dat (pro sekce, které jsou opravdu
identické u obou typů — Místo konání, Cena a věk, Kontakt, Popis, Barva,
Prázdniny) a pojmenovaných `ReactNode` slotů pro to, co je OPRAVDU jiný
doménový koncept, ne jen jiný vzhled téhož:

| Slot | Activity | CustomEntry | Proč není sdíleno |
|---|---|---|---|
| `primaryCard` | stav zápisu + tlačítko + odkaz | jen odkaz na přihlášku (když existuje) | Activity má stav „zapsáno/nezapsáno" nezávislý na datech; CustomEntry ne (existuje jen v rozvrhu, nic „nepřidává") |
| `scheduleSection` | Varianty docházky (výběr z nabídky, kolize, dílčí docházka) | Termín (pevný rozpis) | výběr z nabídky vs. autorský pevný čas |
| `actions` | `<ActivityEditor/>` (self-contained trigger+dialog) | Upravit/Odebrat tlačítka + `<CustomEntryDialog/>` | katalog-vs-přepis rozlišení (dva editory) vs. uživatel vlastní 100 % dat (jeden dialog) |

Sekce, které JSOU teď stoprocentně identické (ne jen podobné): hlavička
(zpět-link, nadpis, `subtitle` slot), primární karta OBAL (i když obsah je
jiný — sama karta je `DetailPrimaryCard`), `Popis` (jednotný popisek,
CHANGE-115), Místo konání, Cena a věk (včetně child-age-match indikátoru),
Kontakt a odkazy, poznámka, Barva kroužku, Prázdniny — všechno vykresluje
JEDNA instance `EventDetail`, ne dvě kopie volající tytéž komponenty.

## 2. Acceptance criteria

- **AC-1**: `tsc --noEmit` čisté (ověřeno).
- **AC-2**: Doménový vitest 155/155 (nedotčeno, čistě `apps/web` refaktor).
- **AC-3**: Vizuální regrese — katalogová aktivita pixel-identická před/po
  refaktoru (ověřeno headless Chromiem, screenshot strukturálně totožný,
  vč. sjednoceného popisku „Popis").
- **AC-4**: Přesná reprodukce uživatelova scénáře („Angličtina" se všemi
  poli) — vykresluje se korektně přes nový `EventDetail`, primární karta s
  odkazem na přihlášku zachována z CHANGE-115.
- **AC-5**: Žádný nepoužitý import — `DetailsPanel.tsx` už needefinuje ani
  nevolá `DetailLocationCard`/`DetailPriceAgeCard`/`DetailContactCard`/
  `DetailColorSection`/`DetailHolidaySection`/`DetailDescriptionAccordion`
  přímo (to teď dělá výhradně `EventDetail`) — ověřeno gřepem přes všechny
  symboly, žádný duchový import.

## 3. Co zůstává mimo sdílení (a proč to tak musí být)

Beze změny oproti design_review_107.md §2 — `scheduleSection`/`primaryCard`/
`actions` obsah zůstává specifický, protože reflektuje SKUTEČNÝ rozdíl mezi
katalogovou aktivitou (poskytovatel, výběr z variant, enroll tok,
katalog-vs-přepis) a vlastní událostí (100% uživatelská data, pevný rozpis,
jeden editor). Šablona teď určuje jejich POZICI pevně; obsah uvnitř slotů je
a musí zůstat jiný, protože předstírat jinak by znamenalo buď vymyslet stav
zápisu, který u vlastní události neexistuje, nebo ochudit aktivitu o výběr
variant, který potřebuje.

## 4. Implementace — stav

Patch aplikován (`git apply --exclude='.github/specs/design_review_109.md'
CHANGE-116.patch` — spec soubor byl přiložen zvlášť, již existoval identický
v pracovním adresáři). Ověřeno lokálně:

- `tsc --noEmit` čisté, doménový vitest **155/155** (nedotčeno, jak se
  čekalo — patch se `packages/domain` netýká).
- `next build` čistý.
- Plná 6profilová E2E sada — **780 passed / 252 skipped / 0 failed** (shodné
  s baseline před tímto CHANGE, nulová regrese — refaktor přesunul existující
  markup do `EventDetail` beze změny DOM pořadí/tříd, takže žádný test
  nebylo třeba opravovat).
- Ručně dodatečně ověřeno (headless Chromium, 390×844): katalogová aktivita
  ukazuje všech 5 očekávaných sekcí (Varianty docházky/Místo konání/Cena a
  věk/Kontakt a odkazy/Barva kroužku); nově přidaná vlastní událost bez
  vyplněných volitelných polí (jen název+čas) korektně SKRÝVÁ prázdné sekce
  (Cena a věk/Kontakt) i primární kartu celou (ne jako prázdný rám) —
  potvrzuje `primaryCard`/`priceAge`/`contact` slotů podmíněné chování.
