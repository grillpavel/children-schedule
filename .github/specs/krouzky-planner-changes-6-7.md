# Krouzky Planner: Changes 6 a Changes 7

**Verze dokumentu:** 1.0
**Datum:** 11. 8. 2026
**Rozsah:** Changes 6 (celá aplikace: data, export, kalendář, pravý sloupec, vizuál, mobil) a Changes 7 (levý sloupec: katalog, kategorizace, filtry, karty)
**Zdroje:** dvě nezávislá review sloučená a odporující si tvrzení označena k ověření
**Formát:** každá položka má ID, prioritu (P0 blokuje / P1 vysoká / P2 polish) a akceptační kritérium (AK)

---

## 0. Validace před implementací

### 0.1 Produkce zaostává za changelogem

Ve vyrenderovaném stavu produkce z 11. 8. 2026 jsou stále přítomné věci, které měly padnout v Changes 2 až 5. Ověř nasazení dřív, než přidáš další vrstvu, jinak budeš stavět na nediagnostikované regresi.

| ID | Zjištění | Mělo padnout v |
|---|---|---|
| V-01 | Předvyplněné „Moje dítě“ v názvu rozvrhu | Changes 2 |
| V-02 | Aktivní filtr „Jen vhodné pro věk 9“ při prvním načtení | Changes 4 |
| V-03 | „3 variant“ místo „3 varianty“ (skloňování) | neřešeno |
| V-04 | V seznamu chybí adresy, weby a kontakty | Changes 3, 4 |
| V-05 | Text „Rozvrh existuje jen v tomto okně“ jako drobný text v postranním panelu | neřešeno |
| V-06 | Není viditelné samostatné tlačítko Import | Changes 5 |

### 0.2 Rozpory mezi review, ověřit před zadáním

Tyhle body si obě review protiřečí. Nezadávej je k implementaci, dokud nezjistíš skutečný stav.

| ID | Rozpor | Jak ověřit |
|---|---|---|
| V-07 | Rozsah časové osy: jedno review uvádí 8:00 až 24:00, druhé pozorovalo 00:00 až 24:00 | Otevřít kalendář a odečíst první a poslední popisek |
| V-08 | Fulltextové hledání v katalogu: jedno review tvrdí, že existuje, druhé ho v DOM nenašlo | Zkontrolovat přítomnost input pole nad seznamem |
| V-09 | Drag and drop z katalogu do kalendáře: obě review nejisté | Otestovat myší na desktopu a dotykem na mobilu |
| V-10 | Kategorizace: jedno review tvrdí, že kategorie je jen text na kartě, druhé pozorovalo funkční dropdown s hierarchií | Zkontrolovat filtr kategorií |
| V-11 | Side-by-side layout překrývajících se událostí: README to tvrdí, vizuálně neověřeno | Přidat dvě události na stejný čas |

### 0.3 Externí závislosti

| ID | Zjištění | Dopad |
|---|---|---|
| V-12 | JS SDK Mapy.cz byl ukončen ke konci roku 2025, nástupcem je REST API Mapy.com s povinným API klíčem | Změna zadání z Changes 2, viz C6-D |
| V-13 | Per-event vlastnost `COLOR` (RFC 7986) Apple Kalendář ani Google Kalendář nerespektují, barví podle kalendáře | Změna zadání z Changes 1, viz C6-C |
| V-14 | Místní notifikace v ICS je Apple proprietární (`X-APPLE-PROXIMITY`), ostatní klienti ji zahodí | Změna zadání z Changes 1, viz C6-A |
| V-15 | Argument „kvůli GDPR neukládáme“ neobstojí. GDPR se týká zpracování správcem; když data neopustí prohlížeč, správcem nejsi. Na úložiště v zařízení dopadá ePrivacy s výjimkou pro službu výslovně vyžádanou uživatelem, což skládání rozvrhu je. | Omezení je produktové rozhodnutí, ne právní povinnost. Pokud zůstane, soubor je jediný nosič stavu a tomu musí odpovídat design, viz C6-B |

---

# Changes 6

## A. ICS export

Root cause pro nefunkční zobrazení adres v macOS Kalendáři (Changes 5). Projdi v tomto pořadí.

| ID | Změna | Prio |
|---|---|---|
| C6-A1 | `LOCATION` musí být přítomné u každé události a escapované podle RFC 5545: `,` na `\,`, `;` na `\;`, `\` na `\\`, nový řádek na `\n`. Neescapovaná čárka v adrese rozseká hodnotu a klient zobrazí jen část, nebo nic. | P0 |
| C6-A2 | Zalamování řádků na 75 oktetů: `CRLF` plus jedna mezera. Limit je v bajtech, ne znacích, takže se nesmí zalomit uprostřed vícebajtového UTF-8 znaku (ě, ř, č). Nejčastější důvod ztráty dlouhé adresy. | P0 |
| C6-A3 | Celý soubor v `CRLF`, ne `LF`. | P0 |
| C6-A4 | Pro špendlík a mapu na macOS a iOS nestačí `LOCATION`. Přidej `X-APPLE-STRUCTURED-LOCATION;VALUE=URI;X-ADDRESS="...";X-APPLE-RADIUS=100;X-TITLE="...":geo:LAT,LON`. | P0 |
| C6-A5 | Hlavička: `PRODID`, `VERSION:2.0`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`. | P0 |
| C6-A6 | Vložený `VTIMEZONE` pro `Europe/Prague` a `DTSTART;TZID=Europe/Prague`. Bez toho si klient pásmo hádá a při přechodu na zimní čas události ujedou o hodinu. | P0 |
| C6-A7 | Stabilní `UID` odvozené deterministicky z ID kroužku a varianty termínu, plus `DTSTAMP`, `LAST-MODIFIED` a `SEQUENCE` inkrementované při reexportu. Bez toho druhý import vytvoří duplicity místo aktualizace. | P0 |
| C6-A8 | `RRULE` s `WKST=MO` a `UNTIL` na konec sezony ve formátu UTC. | P0 |
| C6-A9 | `EXDATE` pro státní svátky a školní prázdniny, jarní prázdniny podle okresu Rakovník. Jediná věc z exportu, kterou rodič pozná okamžitě a odpustí naposledy. | P0 |
| C6-A10 | `URL` s odkazem na poskytovatele, `DESCRIPTION` s kontaktem, cenou a poznámkou, `CATEGORIES` s kategorií kroužku. | P1 |
| C6-A11 | `VALARM` s `ACTION:DISPLAY` a `TRIGGER:-PT30M`, volitelně druhý alarm den předem. Místní notifikaci nabídni jen volitelně a s upozorněním, že funguje pouze na Apple (viz V-14). | P1 |
| C6-A12 | `X-WR-CALNAME` a `X-WR-TIMEZONE` pro pojmenování kalendáře při importu, plus `NAME` a `REFRESH-INTERVAL` z RFC 7986. | P1 |

**AK-A:** Vygenerovaný soubor projde validátorem RFC 5545 bez chyb a varování. V macOS Kalendáři je u každé události viditelná adresa a špendlík na mapě.

## B. Import, uložení, round-trip

| ID | Změna | Prio |
|---|---|---|
| C6-B1 | JSON je kanonický formát stavu, ICS je jednosměrný výstup. ICS neunese varianty, barvy, poznámky ani rozpracovaný stav. Nedělej z ICS nosič stavu. | P0 |
| C6-B2 | Import ICS jako best-effort merge s náhledem: ukaž, co se rozpoznalo, co se přiřadilo ke katalogovému kroužku a co skončí jako vlastní událost. Nikdy needituj stav bez potvrzení. | P0 |
| C6-B3 | Do exportovaného ICS přidej `X-KROUZKY-ID` a `X-KROUZKY-VARIANT`. Neškodné pro cizí klienty, tobě umožní přesný round-trip vlastního souboru. | P1 |
| C6-B4 | JSON opatři `schemaVersion` a napiš migrace hned, ne až budeš mít v terénu tři nekompatibilní verze. | P0 |
| C6-B5 | Validace při uploadu s čitelnou chybou v češtině. Ne tiché selhání, ne stack trace. | P0 |
| C6-B6 | Jedno tlačítko **Uložit** a jedno **Otevřít** na první úrovni, symetricky. Export ICS a tisk patří pod rozbalovací menu, ne naopak. Dnes je „Načíst“ nahoře a uložení schované pod „Export“. | P0 |
| C6-B7 | Varování `beforeunload` při neuložených změnách a indikátor „neuloženo“ v hlavičce. Když je soubor jediný nosič stavu, není to nice to have. | P0 |
| C6-B8 | Název souboru smysluplně: `rozvrh-jmeno-variantaA-2026-08-11.json`. | P2 |

**AK-B:** Export, import a znovu export dá bajtově shodný JSON. Zavření tabu s neuloženou změnou vyvolá varování.

## C. Barvy, oprava zadání z Changes 1

| ID | Změna | Prio |
|---|---|---|
| C6-C1 | Nespoléhej na per-event `COLOR`. Apple i Google barví podle kalendáře a `COLOR` ignorují (V-13). | P0 |
| C6-C2 | Požadavek „stejná barva pro všechny události jednoho dítěte“ splň exportem **jednoho .ics na dítě**. Uživatel přiřadí barvu jednou k celému kalendáři. Nabídni jako výchozí volbu exportu. | P0 |
| C6-C3 | Barvy v aplikaci ponech jako interní vizuální pomůcku a v dialogu exportu poctivě uveď, že se do kalendáře nepřenášejí. | P1 |

## D. Adresy a mapy

| ID | Změna | Prio |
|---|---|---|
| C6-D1 | Rozhodni explicitně mezi dvěma variantami a napiš to do Info: (a) bez třetích stran, adresa jako text plus odkaz „Otevřít v mapách“ otevíraný až na kliknutí; (b) s mapou, statický obrázek z Mapy.com REST API nebo dlaždice OSM v Leafletu, lazy load. | P1 |
| C6-D2 | Doporučená volba: varianta (a) jako výchozí, varianta (b) až za explicitním kliknutím „Zobrazit mapu“. Zachovává příběh o soukromí a šetří kvótu. Každý embed při načtení stránky je požadavek na třetí stranu, což je přesně ten přenos, kvůli kterému jsi rezignoval na localStorage. | P1 |
| C6-D3 | Geokóduj adresy jednou při buildu, ne v prohlížeči. Ulož `lat`/`lon` do katalogu. Získáš mapu bez API volání za běhu, souřadnice pro `X-APPLE-STRUCTURED-LOCATION` a základ pro dojezdové konflikty. | P0 |
| C6-D4 | Automatické doplňování ulice a města jen u vlastních událostí, s debounce a klíčem omezeným na doménu. U katalogových kroužků zbytečné. | P2 |

## E. Kalendář

| ID | Změna | Prio |
|---|---|---|
| C6-E1 | **Empty state kalendáře.** Dnes prázdná bílá mřížka bez nápovědy, což je největší konverzní problém aplikace. Nahraď velkým empty state uprostřed plochy: nadpis, jedna věta, primární CTA „Přidat první kroužek“ (skočí do katalogu, na mobilu přepne tab), pod tím dva až tři tipy. | P0 |
| C6-E2 | Rozsah hodin ořízni dynamicky na obsazený interval s možností rozbalit na 24 h. Pro kroužky je relevantní zhruba 13:00 až 20:00. Ověř skutečný současný rozsah (V-07). | P0 |
| C6-E3 | Popisek „24:00“ nahraď nebo vynech, správně je to 00:00 následujícího dne. | P2 |
| C6-E4 | Now-line: při načtení odscrolluj tak, aby čára byla zhruba ve 40 % výšky. Je-li aktuální čas mimo obsazený interval, scrolluj na nejhustší část dne. | P1 |
| C6-E5 | Překryv událostí řeš column packingem jako iOS a Google Calendar: události ve stejném pásmu se dělí o šířku. Ověř současný stav (V-11). Pokud to není dotažené, je to fatální vada. | P0 |
| C6-E6 | Drag and drop z katalogu do mřížky a přesun události uvnitř mřížky. Během tažení zvýrazni cílový slot a zobraz náhled události. | P1 |
| C6-E7 | Alternativa k tažení: klik na kroužek, klik na slot. Povinné pro mobil a pro klávesovou obsluhu. | P0 |
| C6-E8 | Hover na prázdný slot zobrazí nenápadnou výzvu „Klikni pro vlastní událost“. | P2 |
| C6-E9 | Undo a redo doplň o `Ctrl+Z` a `Ctrl+Shift+Z` plus tooltip. Holé glyfy neobjeví nikdo. | P1 |
| C6-E10 | Snap na 5 minut, ne na hodinu. | P2 |
| C6-E11 | Měsíční pohled: omez na maximálně tři události na den plus „+2 další“, jinak se hustota rozpadne. | P2 |

## F. Pravý sloupec

| ID | Změna | Prio |
|---|---|---|
| C6-F1 | Panel se při nula kroužcích sbalí nebo zúží. Dnes zabírá plnou šířku, aby zobrazil „0 kroužků, žádné konflikty“, což je plýtvání nejcennějším místem obrazovky. | P0 |
| C6-F2 | Struktura detailu shora dolů: název a barva, poskytovatel s odkazem na web, adresa s odkazem do map, termíny včetně variant, cena a co zahrnuje, věkové rozmezí, kontakt (telefon a e-mail klikatelné), přihlašovací odkaz a uzávěrka, poznámka uživatele, zdroj a datum ověření. | P0 |
| C6-F3 | Vlastní událost musí mít **totožnou strukturu detailu** jako katalogová. | P1 |
| C6-F4 | Editace polí na místě, ne v modálu. Ručně upravená pole odliš značkou „upraveno“. | P1 |
| C6-F5 | Akce v detailu: změnit termín, změnit barvu, odebrat z rozvrhu. Dnes chybí. | P0 |
| C6-F6 | Tab Chat: pokud není hotový, **skryj ho**. Prázdný tab působí jako nedokončená funkce a snižuje důvěru víc, než kolik ta funkce přinese. Až bude, omez ho na převodník přirozeného jazyka na filtr s deterministickým výsledkem. Nikdy nesmí generovat fakta o kroužku. | P0 |
| C6-F7 | Nahraď „Žádné konflikty 🎉“ při nula kroužcích prázdným stavem s výzvou. Dnes to vypadá jako úspěch, přitom je to prázdno. | P0 |

## G. Rozhodovací vrstva

| ID | Změna | Prio |
|---|---|---|
| C6-G1 | Srovnání variant jako tabulka: celková cena, počet obsazených odpolední, počet volných dnů, součet hodin týdně, počet konfliktů, nejtěsnější přestup. Bez toho je „Kopie“ jen druhý stav, ne varianta. | P1 |
| C6-G2 | Rozšiř detekci konfliktů nad rámec překryvu času, seřazeno podle hodnoty: dojezd mezi místy (souřadnice z C6-D3), kolize doprovodu mezi sourozenci, kumulativní zátěž dítěte, překročení rozpočtu. | P1 |
| C6-G3 | Přepínání mezi více dětmi v jednom rozvrhu. Sourozenecká logistika je problém, který se v hlavě nedá vyřešit, a je to největší nevyužitá hodnota produktu. | P1 |
| C6-G4 | U ceny zobraz odvozený údaj Kč/měsíc vedle roční částky. Roční čísla 1 000 a 6 500 jsou obě pravdivá a společně zavádějící, protože nejde o stejný cenový režim. Není to chyba dat, je to chyba prezentace. | P0 |

## H. Mobil

| ID | Změna | Prio |
|---|---|---|
| C6-H1 | Na mobilu je výchozím pohledem **Agenda**, chronologický seznam událostí, ne sedmisloupcová mřížka. Sedm sloupců na 375 px je nepoužitelných. Mřížku ponech jako volitelný pohled. | P0 |
| C6-H2 | Zmenši hlavičku. Název, barva, věk, undo, redo, načíst a export dnes zabírají neúměrnou část výšky. Sluč do jednoho řádku plus přetečení do menu. | P1 |
| C6-H3 | Přidání kroužku na mobilu je tlačítko `[+]`, ne tažení. | P0 |
| C6-H4 | Přepnutí mezi tabem Katalog a Rozvrh musí být okamžité a s jasným feedbackem: po přidání kroužku ukaž toast s akcí „Zobrazit v rozvrhu“. | P1 |

## I. Mikrointerakce a feedback

Tahle sekce je důvod, proč aplikace působí jako developer demo. Jednotlivě jsou to drobnosti, dohromady je to rozdíl mezi „funguje to“ a „chci to používat“.

| ID | Změna | Prio |
|---|---|---|
| C6-I1 | Hover stav na kartách katalogu: jemný stín a zvýraznění okraje. | P1 |
| C6-I2 | Animace při přidání události do kalendáře: událost se vykreslí s krátkým rozjezdem, mřížka na okamžik zvýrazní cílový den. Trvání do 200 ms. | P1 |
| C6-I3 | Toast po každé změně stavu: „Přidáno do varianty A“ s tlačítkem „Zpět“. Zároveň to řeší slabý feedback undo. | P1 |
| C6-I4 | Skeleton stavy při načítání katalogu a mapy. | P2 |
| C6-I5 | Náhled při najetí: hover nad kartou v katalogu vykreslí v kalendáři průsvitného ducha události na místě, kam by spadla. Levné na implementaci, zásadně zrychluje rozhodování. | P1 |
| C6-I6 | Respektuj `prefers-reduced-motion`, všechny animace vypni. | P2 |

## J. Vizuál a texty

| ID | Změna | Prio |
|---|---|---|
| C6-J1 | Oprav české skloňování. „3 variant“ má být „3 varianty“. Plurálová funkce pro 1 / 2 až 4 / 5+, projet všechny počitatelné řetězce. Malý detail, který okamžitě signalizuje amatérskou práci. | P0 |
| C6-J2 | Nahraď emoji (📋 📅 ℹ️ 🎉) jednou SVG sadou (Lucide, Phosphor). Emoji se renderují jinak na každé platformě, nejdou obarvit a nesedí do typografické mřížky. | P1 |
| C6-J3 | Barva nesmí být jediný nosič informace. Přidej ikonu kategorie nebo textový štítek, kontrast textu na barevném bloku minimálně 4.5:1. | P1 |
| C6-J4 | Definuj jasnou hierarchii akcí. Primární akce je přidání kroužku a musí být v celé aplikaci vizuálně jednoznačná a jediná svého druhu. Dnes není jasné, jestli klik na kartu přidává, nebo otevírá detail. | P0 |
| C6-J5 | Navrhni explicitně všechny stavy: prázdný katalog po filtru, prázdný rozvrh, chyba importu, neuloženo, načítání. Kvalita se pozná tady, ne na šťastné cestě. | P0 |
| C6-J6 | Věta „Rozvrh existuje jen v tomto okně“ patří natrvalo do hlavičky, ne drobným písmem do postranního panelu. | P0 |
| C6-J7 | Třísloupcový layout působí jako enterprise nástroj, ne rodičovská aplikace. Zmírni to zúžením pravého panelu (C6-F1), zvýšením hustoty katalogu (Changes 7) a teplejší barevnou paletou s jedním akcentem. | P1 |
| C6-J8 | Název a doména: „Krouzky Planner“ na `children-schedule-web.vercel.app` je vývojářská adresa a anglicismus bez diakritiky. Vlastní česká doména a český název. | P2 |

## K. Tisk

| ID | Změna | Prio |
|---|---|---|
| C6-K1 | Samostatný `@media print` stylesheet, ne zmenšená obrazovka. | P1 |
| C6-K2 | Jedna A4 na šířku: mřížka týdne, pod ní tabulka kroužků s cenou, adresou a kontaktem, v patičce jméno dítěte, varianta a datum tisku. | P1 |
| C6-K3 | Skryj UI chrom, filtry, tlačítka a now-line. | P1 |
| C6-K4 | Ověř tisk do PDF v Chrome, Safari a Firefoxu, chovají se odlišně u zalomení mřížky. | P1 |

---

# Changes 7: levý sloupec, katalog

## 1. Zjištění, které mění zadání

**Kategorie nemůže být primární osa filtrace.** Katalog má 40 položek a 24 z nich je sport. Klik na Sport vrátí 60 % katalogu, klik na Hudbu vrátí nulu. Kategorie prostor rozhodování nezúží, jen přeskládá.

Primární osa je **věk dítěte a volný čas v týdnu**. Kategorie zůstává jako osa **seskupení výsledku**, ne jako hlavní filtr, a musí být dvouúrovňová, aby Sport nebyl nepoužitelný kbelík.

**Karty neukazují den ani čas.** Místo toho „1 termín“, což je nulová informace. Den a čas jsou přitom to jediné, co rodič potřebuje k rozhodnutí, jestli položku vůbec zvažovat. Nejzávažnější vada levého sloupce.

**Chybí fulltext.** Při 40 položkách obtěžující, při 200 (po přidání ZUŠ, skautu, hasičů, knihovny, jazykovek) blokující. Ověř současný stav (V-08).

## 2. Taxonomie: dvě úrovně, sedm kořenů

| ID | Kořen | Podkategorie | Počet v současných datech |
|---|---|---|---|
| C7-T1 | Sport a pohyb | Atletika, Míčové a týmové sporty, Bojové sporty, Gymnastika a všestrannost | 24 |
| C7-T2 | Věda a technika | Věda, Technika a programování | 5 |
| C7-T3 | Umění a tvoření | Výtvarka, Rukodělky | 2 |
| C7-T4 | Hudba a tanec | Tanec, Hudba | 2 |
| C7-T5 | Příroda a dobrodružství | Turistika, Skauting | 1 |
| C7-T6 | Hry a myšlení | Deskové hry, Logika | 1 |
| C7-T7 | Jazyky | | 0 |

**Přemapování současných dat:**

- Atletika (6): Atletika 0, I, II, přípravka, mladší žactvo, starší žactvo a dorost
- Míčové a týmové sporty (15): Sportovní kroužek I a II, Míčové hry, Florbal I až III, Hokejbal I až III, Basketbal přípravka, Basketbal chlapci, Fotbal mini přípravka, mladší přípravka, starší přípravka, mladší žáci, starší žáci, dorost
- Bojové sporty (2): Karate, Škola boxu
- Gymnastika a všestrannost (1): Gymnastika pro děti
- Věda (2): Astronomický kroužek, Věda je zábava
- Technika a programování (3): Inteligentní robotika, Mladý elektrotechnik, Programování
- Výtvarka (1): Výtvarné tvoření
- Rukodělky (1): Dovedné ruce
- Tanec (2): Street dance NS začátečníci, Street dance NS pokročilí
- Turistika (1): Venkovní dobrodružství
- Deskové hry (1): Deskové a jiné hry

**Pravidla:**

| ID | Pravidlo | Prio |
|---|---|---|
| C7-T8 | Kategorii ukládej v datech jako `category` plus `subcategory`, ne jako jeden řetězec. Dodatečná migrace taxonomie u 200 položek je drahá, udělej to teď. | P0 |
| C7-T9 | Kořen s nulou skryj, nebo zobraz zašedle s `(0)`. Nikdy nesmí vést do prázdna. | P0 |
| C7-T10 | Kořen s méně než třemi položkami nerozbaluj na podkategorie, je to zbytečná úroveň. | P1 |
| C7-T11 | Sport rozbal na podkategorie vždy. | P0 |
| C7-T12 | U každé úrovně vždy zobraz počet: `Sport a pohyb (24)`, `Atletika (6)`. | P0 |

## 3. Filtrační lišta

Sticky při scrollu, pořadí shora.

**Vždy viditelné:**

| ID | Prvek | Detail | Prio |
|---|---|---|---|
| C7-F1 | Hledat | Fulltext přes název, poskytovatele a kategorii. **Musí být necitlivé na diakritiku a velikost písmen**: „hokejbal“ najde „Hokejbal“, „ucitel“ najde „učitel“. Normalizace přes `NFD` a odstranění diakritických znaků na obou stranách. Bez toho je hledání v češtině nefunkční. Zvýrazni shodu v názvu. | P0 |
| C7-F2 | Dny | Sedm přepínatelných čipů `Po Út St Čt Pá So Ne`, **vícevýběr**. Dnešní jednovýběrový dropdown je špatně, rodič uvažuje „úterý nebo čtvrtek“. | P0 |
| C7-F3 | Vejde se mi to | Výrazný přepínač, skryje vše, co koliduje s aktuálním rozvrhem. **Jediný filtr, který žádná konkurenční služba nemá, protože nikdo jiný nedrží rozvrh.** Nejvyšší poměr hodnoty k práci v celém dokumentu. | P0 |

**Pod „Další filtry (2)“ s počtem aktivních v odznaku:**

| ID | Prvek | Detail | Prio |
|---|---|---|---|
| C7-F4 | Věk | Stepper, **výchozí vypnuto** (Changes 4). Je-li v hlavičce rozvrhu vyplněné dítě, předvyplň hodnotu, ale filtr nech vypnutý, dokud ho uživatel nezapne. | P0 |
| C7-F5 | Kategorie | Stromový vícevýběr podle sekce 2. | P1 |
| C7-F6 | Čas | „Začátek nejdřív v“ a „konec nejpozději v“. Nejčastější reálné omezení vůbec, dnes chybí. | P0 |
| C7-F7 | Cena | Posuvník na Kč/měsíc, ne Kč/rok. | P1 |
| C7-F8 | Poskytovatel | Vícevýběr, tři checkboxy. | P2 |

**Pod lištou:**

| ID | Prvek | Prio |
|---|---|---|
| C7-F9 | Aktivní filtry jako odstranitelné čipy plus `Zrušit vše`. | P0 |
| C7-F10 | Řádek stavu: `Zobrazeno 12 ze 40` a vedle `Seskupit: Kategorie ▾` s volbami Kategorie, Den, Poskytovatel, Cena, Abecedně. | P1 |

## 4. Struktura seznamu

```
[ sticky: hledání + filtry ]
[ aktivní čipy filtrů ]
[ Zobrazeno 12 ze 40        Seskupit: Kategorie ▾ ]

▾ V ROZVRHU (3)                          ← připnuto nahoře, sbalitelné
  ● Karate                    Út 16:00
  ● Programování              St 15:00
  ● Basketbal přípravka       Čt 17:30

▾ SPORT A POHYB (24)                     ← sticky hlavička skupiny
  ▾ Atletika (6)
    ...
  ▾ Míčové a týmové sporty (15)
    ...

▾ VĚDA A TECHNIKA (5)
    ...

[ sticky dole: + Vlastní událost ]
```

| ID | Změna | Prio |
|---|---|---|
| C7-S1 | Sekce „V rozvrhu“ připnutá nahoře. Dnes se vybraný kroužek v seznamu nijak neliší od nevybraného, takže rodič ztrácí přehled, co už má. | P0 |
| C7-S2 | Sticky hlavičky skupin. Při 40 řádcích a čtyřech obrazovkách scrollu je bez nich uživatel ztracený. | P1 |
| C7-S3 | Sbalitelné skupiny, stav zapamatovaný v rámci relace. Výchozí stav: první dvě až tři skupiny otevřené, zbytek sbalený. Sport sbalený znamená, že zbytek katalogu se vejde na jednu obrazovku. Přidej `Rozbalit vše` a `Sbalit vše`. | P0 |
| C7-S4 | „+ Vlastní událost“ připnuté dole, ne až za čtyřicátou položkou. Dnes působí jako afterthought. | P1 |
| C7-S5 | Virtualizace seznamu nad 100 řádků. | P2 |
| C7-S6 | Fulltext přes předpočítaný index, ne lineární `filter()` nad polem při každém stisku klávesy. Debounce 150 ms. | P1 |

## 5. Karta kroužku

Dnes tři řádky, z toho jeden zabírá „Dům dětí a mládeže Rakovník, příspěvková organizace“ opakovaný 23krát. Cíl: dva řádky, výška 64 až 72 px.

```
┌────────────────────────────────────────────────┐
│ ● Florbal II. — mladší žákyně              [+] │
│   8–12 let · Út 16:00 · 83 Kč/měs · DDM        │
└────────────────────────────────────────────────┘
```

| ID | Prvek | Detail | Prio |
|---|---|---|---|
| C7-C1 | Barevný bod | Klik otevře paletu. Zobrazuj jen u položek, které jsou v rozvrhu. U ostatních je barva šum. | P1 |
| C7-C2 | Název | Plná šířka, bold 15 až 16 px, nezkracovat. | P0 |
| C7-C3 | Poskytovatel | **Zkratka** (`DDM`, `SCNS`, `Sokol`) s tooltipem na plný název. Ušetří 40 % šířky. Drž v datech jako `shortName`, ne odvozené z názvu. | P0 |
| C7-C4 | Den a čas | Místo dnešního „1 termín“. U více variant `Út/Čt 16:00 · +1`. **Nejdůležitější jediná změna v levém sloupci.** | P0 |
| C7-C5 | Cena | Kč/měsíc jako primární, roční v tooltipu. | P0 |
| C7-C6 | Věk | Jako čip, zeleně když sedí na zadaný věk dítěte, šedě jinak. | P1 |
| C7-C7 | `[+]` vpravo | Přidá do rozvrhu. Klik na zbytek karty otevře detail v pravém sloupci. Tyhle dvě akce musí být oddělené a vizuálně jednoznačné. | P0 |

**Stavy karty**, odlišené levým pruhem 3 px:

| ID | Stav | Vizuál |
|---|---|---|
| C7-C8 | Volné | bez pruhu |
| C7-C9 | V rozvrhu | plný pruh v barvě kroužku, `[+]` se změní na `[✓]` s popiskem „Přidáno“, tlumené pozadí |
| C7-C10 | Koliduje | červený pruh, tooltip „koliduje s Karate, Út 16:00“ |
| C7-C11 | Těsný přestup | oranžový pruh, tooltip „12 min na přesun z DDM na Sokolovnu“ |
| C7-C12 | Mimo věk | tlumené o 50 %, štítek s věkem červeně (jen když je věkový filtr vypnutý) |
| C7-C13 | Hover | jemný stín a zvýrazněný okraj, plus náhled ducha události v kalendáři (C6-I5) |

| ID | Změna | Prio |
|---|---|---|
| C7-C14 | Rozbalení variant: kroužek se třemi termíny po kliknutí na `+1` rozbalí tři řádky s radio výběrem. Dnešní text „3 variant“ je mrtvý štítek a navíc špatně skloňovaný. | P0 |
| C7-C15 | Rychlé akce na hover (na mobilu long-press): Přidat, Zobrazit detail, Přidat jiný termín. | P2 |

## 6. Prázdné a mezní stavy

| ID | Stav | Řešení | Prio |
|---|---|---|---|
| C7-E1 | Filtr nevrátil nic | „Žádný kroužek neodpovídá filtru“, tlačítko `Zrušit filtry`, plus **tři nejbližší shody s vysvětlením, proč vypadly** („mimo věk o 1 rok“, „koliduje s Karate“). Nabídnout alternativy je rozdíl mezi nástrojem a slepou uličkou. | P0 |
| C7-E2 | Hledání bez výsledku | Nejbližší shoda podle Levenshteinovy vzdálenosti: „Mysleli jste florbal?“ | P2 |
| C7-E3 | „Vejde se mi to“ při prázdném rozvrhu | Přepínač zašedni s vysvětlením, nedávej prázdný seznam. | P1 |
| C7-E4 | První načtení | Žádný filtr aktivní, všechny skupiny sbalené kromě prvních dvou, plný počet viditelný. | P0 |

## 7. Mobil

| ID | Změna | Prio |
|---|---|---|
| C7-M1 | Katalog jako spodní tab, hledání a čipy dnů zůstávají v hlavičce, zbytek filtrů do spodního sheetu. | P1 |
| C7-M2 | Přidání kroužku je `[+]`, ne tažení. | P0 |
| C7-M3 | Karta zůstává dvouřádková, skryje se jen zkratka poskytovatele. | P1 |

---

# Pořadí implementace

## Vlna 1: nefunkčnost a slepé cesty

1. C6-A1 až C6-A9: ICS export, root cause chybějících adres
2. C7-C4: den a čas na kartě místo „1 termín“
3. C7-F1: fulltext s normalizací diakritiky
4. C6-E1: empty state kalendáře
5. C6-B6, C6-B7: symetrické Uložit a Otevřít, varování při odchodu
6. C6-J1: české skloňování

## Vlna 2: rozhodovací hodnota

7. C7-F2, C7-F6: vícevýběr dnů, filtr času
8. C7-F3: „vejde se mi to“
9. C7-S1, C7-C9: sekce V rozvrhu a stav „Přidáno“
10. C6-H1: agenda view na mobilu
11. C6-D3, C6-G4: geokódování při buildu, cena v Kč/měsíc
12. C6-F1, C6-F6: sbalitelný pravý panel, skrytí nedokončeného chatu

## Vlna 3: hustota, feedback, polish

13. C7-T8 až C7-T12: dvouúrovňová taxonomie
14. C7-S3: sbalitelné skupiny
15. C6-I1 až C6-I5: mikrointerakce
16. C6-E5, C6-E6: column packing, drag and drop
17. C6-G1, C6-G2: srovnání variant, rozšířené konflikty
18. C6-K1 až C6-K4: tisk

---

# Definition of Done

1. Vygenerovaný .ics projde validátorem RFC 5545 bez chyb a varování.
2. Testovací matice importu: macOS Kalendář, iOS Kalendář, Google Kalendář web, Outlook web, Thunderbird. U každého ověř: adresa viditelná, mapa nebo špendlík, opakování na správné dny, žádná událost o prázdninách, upozornění dorazí, druhý import nevytvoří duplicity.
3. Přechod na zimní čas 25. 10. 2026: událost v 16:00 zůstane v 16:00.
4. Round-trip JSON: export, import, export dá bajtově shodný soubor.
5. Lighthouse accessibility nad 95, kalendář i katalog plně obsluhovatelné klávesnicí.
6. Tisk do PDF v Chrome, Safari a Firefoxu vypadá stejně.
7. Levý sloupec s 200 položkami scrolluje plynule (60 fps) a hledání odpovídá do 100 ms.
8. Žádná obrazovka aplikace nemá nedefinovaný prázdný stav.
