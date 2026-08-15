# Krouzky Planner: testovací specifikace

**Verze:** 1.0
**Datum:** 11. 8. 2026
**Rozsah:** funkčnost, viditelnost, použitelnost na desktopu, tabletu a mobilu
**Navazuje na:** Changes 6, 7, 8, 9 v1.1. Každý test má odkaz na ID požadavku, který ověřuje.
**Nástroje:** Playwright (hlavní), `@axe-core/playwright` (přístupnost), Lighthouse CI (výkon), vlastní assertions nad ICS

---

## 1. Zásady psaní testů

Bez nich testy do měsíce zplaní a začnou se přeskakovat.

| ID | Zásada | Důvod |
|---|---|---|
| Z-01 | **Žádné `waitForTimeout`.** Používej výhradně web-first assertions (`expect(locator).toBeVisible()`), které samy čekají. | Pevná čekání jsou hlavní zdroj flaky testů a zároveň zpomalují běh. |
| Z-02 | **Lokátory podle role a viditelného textu** (`getByRole('button', { name: 'Přidat do rozvrhu' })`), ne podle CSS tříd. | Test pak ověřuje, co uživatel vidí a co uvidí odečítač obrazovky. Změna stylů test nerozbije, změna přístupnosti ano, a to je správně. |
| Z-03 | `data-testid` jen tam, kde role a text nestačí: barevné tečky, buňky mřížky, pruh stavu karty. Nikdy jako náhrada za chybějící přístupný název. | Testid na tlačítku maskuje, že tlačítko nemá jméno. |
| Z-04 | **Každý test má odkaz na ID požadavku** v názvu: `C8-S3: klik na kartu neotevře přidání`. | Když požadavek padne, víš, který test smazat. Bez toho se testy hromadí. |
| Z-05 | Test nesmí záviset na stavu z předchozího testu. Každý začíná načtením a případným importem připraveného JSON. | |
| Z-06 | **Fixture data, ne živý katalog.** Testy běží nad zamraženým katalogem v repu. | Jinak ti test spadne, protože DDM změnil cenu. |
| Z-07 | Vizuální snímky pořizuj s vypnutými animacemi (`animations: 'disabled'`) a s pevným datem. | Now-line se hýbe každou minutou a rozbije každé srovnání. |
| Z-08 | Falešně zelený test je horší než žádný. Kde nástroj vrátí „nelze určit“, ber to jako selhání, ne jako průchod. Viz L3-A4. | |

---

## 2. Matice zařízení

Tři viewporty jsou povinné, čtvrtý je hraniční případ, který u tohoto layoutu nejvíc bolí.

| Profil | Šířka × výška | DPR | Dotyk | Ověřuje |
|---|---|---|---|---|
| **Desktop** | 1440 × 900 | 1 | ne | Třísloupcový layout (C9-L1) |
| **Desktop úzký** | 1280 × 800 | 1 | ne | **Hraniční případ.** Tři sloupce se zde nesmí zobrazit, Info musí být slide-over. |
| **Tablet na výšku** | 834 × 1112 | 2 | ano | Pod 900 px, tedy Agenda a drawer (C9-L5) |
| **Tablet na šířku** | 1112 × 834 | 2 | ano | Nad 900 px s dotykem: kombinace, na kterou se zapomíná |
| **Mobil** | 390 × 844 | 3 | ano | Tab bar, Agenda, bottom sheet |
| **Mobil malý** | 360 × 740 | 3 | ano | Nejmenší reálná šířka, kde se ještě musí vejít karta |

Ke každému profilu nastav `hasTouch` a `isMobile` podle sloupce Dotyk. Bez toho se netestuje dotykové chování, jen zúžené okno.

Doporučuji definovat viewporty explicitně místo pojmenovaných device descriptorů, aby test nezávisel na tom, jak se descriptor v dané verzi jmenuje a co přesně nastavuje.

---

## 3. Vrstvy testů

| Vrstva | Co ověřuje | Kdy běží |
|---|---|---|
| **L0 Smoke** | Aplikace se načte a jde s ní pracovat | Každý commit |
| **L1 Funkčnost** | Chování podle Changes 6, 7, 8 | Každý commit |
| **L2 Responzivita a viditelnost** | Nic není oříznuté, skryté ani nedosažitelné | Každý commit |
| **L3 Přístupnost** | axe, klávesnice, kontrast, preference | Každý commit |
| **L4 Vizuální regrese** | Snímky proti baseline | Každý commit |
| **L5 Výkon** | Lighthouse, scroll, sklo | Nightly |
| **L6 Export a data** | ICS a JSON na úrovni bajtů | Každý commit |
| **L7 Manuální** | Co automat neumí, viz sekce 11 | Před releasem |

---

## 4. L0 Smoke

| ID | Test | Kritérium |
|---|---|---|
| T-000 | Načtení bez chyby | Žádná chyba v konzoli, žádný neošetřený `unhandledrejection` |
| T-001 | Katalog obsahuje očekávaný počet položek | Odpovídá fixture |
| T-002 | Kalendář se vykreslí | Mřížka nebo Agenda podle viewportu |
| T-003 | Aplikace není zaseknutá v načítání | Do 5 s je viditelný interaktivní prvek |

---

## 5. L1 Funkčnost

### 5.1 Vstup do aplikace

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-100 | V-02, C7-F4 | Věkový filtr při prvním načtení | Filtr je **vypnutý**, katalog ukazuje všechny položky |
| T-101 | V-01 | Název rozvrhu při prvním načtení | Pole je prázdné, ne „Moje dítě“ |
| T-102 | C6-E1 | Prázdný kalendář | Viditelný empty state s tlačítkem vedoucím do katalogu, ne jen prázdná mřížka |
| T-103 | C8-A1 | Prázdný pravý panel | Neobsahuje graf ani nulové metriky |
| T-104 | C6-E2 | Rozsah časové osy | Odpovídá obsazenému intervalu, ne 00:00 až 24:00 |

### 5.2 Katalog

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-110 | C7-C4 | Karta zobrazuje den a čas | Text karty obsahuje den i čas, nikoli „1 termín“ |
| T-111 | C7-F1 | Hledání bez diakritiky | Dotaz `hokejbal` i `Hokejbal` i `hokejbal ` vrátí stejný počet; dotaz `ucitel` najde položku s `učitel` |
| T-112 | C7-F2 | Vícevýběr dnů | Zapnutí Út a Čt vrátí sjednocení, ne průnik ani jen poslední volbu |
| T-113 | C7-F6 | Filtr času | „Začátek nejdřív v 15:30“ odfiltruje položku začínající v 15:00 |
| T-114 | C7-F3 | Filtr „vejde se mi to“ | Po přidání kroužku v Út 16:00 zmizí z katalogu kolidující položky |
| T-115 | C7-E3 | Tentýž filtr při prázdném rozvrhu | Přepínač je zašedlý s vysvětlením, seznam nezůstane prázdný |
| T-116 | C7-E1 | Filtr bez výsledku | Zobrazí se prázdný stav s tlačítkem zrušení filtrů a s nejbližšími alternativami |
| T-117 | C7-T9 | Prázdná kategorie | Kategorie s nulou je skrytá nebo zašedlá s `(0)`, klik nevede do prázdna |
| T-118 | C7-T12 | Počty u skupin | Součet počtů podskupin se rovná počtu u kořene |
| T-119 | C7-S1, C7-C9 | Stav „v rozvrhu“ | Po přidání se karta objeví v sekci nahoře a změní stav; `[+]` se změní na `[✓]` |
| T-120 | C6-J1 | Skloňování | Pro 1, 3 a 5 variant se zobrazí `1 varianta`, `3 varianty`, `5 variant` |

### 5.3 Přidání a rozvrh

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-130 | C8-S3, C9-M3 | Klik na kartu | Otevře se detail, kroužek se **nepřidá** do rozvrhu |
| T-131 | C8-S3 | Výběr termínu před přidáním | V detailu lze zvolit variantu a teprve pak potvrdit |
| T-132 | C6-E7 | Přidání bez tažení | Klik na kroužek a klik na slot vloží událost |
| T-133 | C6-E5, C9-K6 | Překryv dvou událostí | Oba bloky jsou viditelné vedle sebe, žádný není zcela zakrytý |
| T-134 | C6-E9 | Undo | `Ctrl+Z` vrátí poslední přidání |
| T-135 | C6-I3 | Toast | Po přidání se zobrazí potvrzení s akcí Zpět |

### 5.4 Pravý panel

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-140 | C8-D5 | Odkaz na přihlášku a uzávěrka | Obojí viditelné bez scrollování v detailu |
| T-141 | C8-B3 | Součet ceny s chybějícími cenami | Zobrazí se počet položek bez ceny, nikdy holý součet |
| T-142 | C8-B2 | Definice metrik | Každá metrika souhrnu má tooltip s definicí |
| T-143 | C8-B10 | Akce u konfliktu | Tlačítko Vyřešit nabídne konkrétní alternativu, nebo sdělí, že žádná není |
| T-144 | C8-F1 | Čtecí režim | Po otevření detailu nejsou viditelná editační pole, dokud se nepřepne |
| T-145 | C8-E2 | Značka úpravy | Po úpravě ceny pole nese značku „upraveno“ a ztratí odznak ověření |
| T-146 | C8-F6 | Chat | Tab Chat není v DOM, dokud není funkce hotová |
| T-147 | C8-B8 | Destruktivní akce | „Smazat vše“ není v panelu rychlých akcí |

### 5.5 Uložení a import

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-150 | C6-B6 | Symetrie | Uložit i Otevřít jsou na první úrovni, ne jedno pod menu Export |
| T-151 | C6-B7 | Neuložené změny | Po změně a pokusu o zavření se vyvolá varování; indikátor „neuloženo“ je viditelný |
| T-152 | C8-E5, C6-B4 | Round-trip | Export, import, export dá **bajtově shodný** JSON včetně overrides, poznámky a vybraného termínu |
| T-153 | C6-B5 | Poškozený soubor | Import nevalidního JSON zobrazí českou chybovou hlášku, nespadne, nesmaže stav |
| T-154 | C6-B4 | Starší schéma | Soubor s předchozím `schemaVersion` se načte přes migraci |

---

## 6. L2 Responzivita a viditelnost

Tyto testy běží **na všech šesti profilech** z matice.

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-200 | C9-L1 | Šířka dne v kalendáři | Při ≥ 1440 px je sloupec dne ≥ 105 px. Změř skutečnou `boundingBox`, nedomýšlej z CSS. |
| T-201 | C9-L1 | Úzký desktop | Při 1280 px **nejsou** tři stálé sloupce; Info je slide-over |
| T-202 | C9-L5, C9-M1 | Agenda pod 900 px | Při 834 px i 390 px je výchozím pohledem Agenda, ne sedmisloupcová mřížka |
| T-203 | obecné | Horizontální přetečení | `document.scrollingElement.scrollWidth <= clientWidth` na každém profilu a na každé záložce |
| T-204 | obecné | Oříznutý text | Žádný viditelný prvek nemá `scrollWidth > clientWidth + 1` s `overflow: hidden` bez ellipsis |
| T-205 | C9-M6 | Dotykové cíle | Každý klikací prvek má `boundingBox` ≥ 24 × 24; prvky označené jako primární ≥ 44 × 44 |
| T-206 | C9-M8 | Safe area | `<meta name="viewport">` obsahuje `viewport-fit=cover`; tab bar má nenulový spodní odsazení, když je inset nenulový |
| T-207 | C9-Y5 | Zvětšení písma | Při zoomu 200 % nevznikne horizontální scroll ani překryv prvků |
| T-208 | C9-Y2 | České diakritiky | Nadpis s textem `ĎŤÁŮŘĚ` není svisle oříznutý: `scrollHeight <= clientHeight` |
| T-209 | C9-K2 | Nejnižší událost | Blok 45minutové lekce má výšku ≥ 24 px a jeho název je viditelný |
| T-210 | C6-F1, C9-L3 | Prázdný pravý panel | Při nula kroužcích zabírá menší šířku než v naplněném stavu |
| T-211 | C9-M4 | Bottom sheet | Na mobilu je v peek stavu viditelný název, stav a primární tlačítko bez scrollování |
| T-212 | C7-M3 | Karta na malém mobilu | Při 360 px se karta vejde na dva řádky bez oříznutí názvu |

**Poznámka k T-204:** oříznutí je nejčastější vada, kterou testy neodhalí, protože prvek je „viditelný“. Měř skutečné rozměry, ne viditelnost.

---

## 7. L3 Přístupnost

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-300 | obecné | axe na každé obrazovce a profilu | Nula porušení úrovně A a AA |
| T-301 | **kritické** | Sklo a kontrast | axe u průsvitných povrchů často vrací **„incomplete“ místo porušení**, protože neumí určit skutečné pozadí. **Každý „incomplete“ typu color-contrast na skleněném povrchu ber jako selhání.** Jinak ti glass panely projdou falešně zelené. |
| T-302 | C9-T3 | Kontrast tokenů | Samostatný test nad definicí tokenů, ne nad DOM. Padá pod 4.5:1 pro text a pod 3:1 pro prvky rozhraní. |
| T-303 | C9-A1 | Focus ring | Průchod Tabem přes celou stránku: každý fokusovaný prvek má viditelný obrys s nenulovým offsetem |
| T-304 | C9-A4 | Klávesová obsluha kalendáře | Šipky pohyb, Enter otevře detail, Escape zavře. Bez myši lze přidat kroužek. |
| T-305 | C6-E7 | Alternativa k tažení | Celý tok přidání funguje bez `dragAndDrop` |
| T-306 | C9-A2 | `prefers-reduced-motion` | Při emulaci nejsou spuštěny žádné animace |
| T-307 | C9-B3 | Vypnutí skla | Ve všech čtyřech režimech (bez podpory, přepínač, vysoký kontrast, reduced transparency) je text čitelný a `backdrop-filter` je `none`. Podporu emulace `contrast` si ověř ve své verzi Playwrightu; kde chybí, testuj přepínač a `@supports` cestu. |
| T-308 | C9-A5 | Heatmapa | Obsahuje textová čísla, ne jen pruhy; přístupný název nese hodnotu |
| T-309 | C9-T3f | Barva jako jediný nosič | Konflikt má vedle barvy i ikonu a text |
| T-310 | C9-A6 | Dark mode | Emulace `prefers-color-scheme: dark` přepne motiv; axe projde i v dark |

---

## 8. L4 Vizuální regrese

| ID | Test | Kritérium |
|---|---|---|
| T-400 | Snímky klíčových obrazovek na všech šesti profilech | Odchylka pod prahem; animace vypnuté, datum zmrazené |
| T-401 | Prázdné stavy: kalendář, katalog po filtru, pravý panel | Baseline existuje pro každý |
| T-402 | Dark mode varianty | Samostatná baseline |
| T-403 | Sklo zapnuté vs. vypnuté | Obě varianty mají baseline; vypnutá varianta musí být plně čitelná |

Snímky pořizuj po jednotlivých komponentách, ne celé stránky. Celostránkový snímek padá při každé změně a lidé ho pak přebaselinují bez čtení.

---

## 9. L5 Výkon

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-500 | C9-P6 | Scroll katalogu s 200 položkami | Měř s CPU throttlingem přes CDP. Playwright sám o sobě FPS neměří spolehlivě; použij trace nebo `PerformanceObserver` na dlouhé úlohy. |
| T-501 | C7-S6 | Odezva hledání | Od stisku klávesy do překreslení pod 100 ms při 200 položkách |
| T-502 | C9-P2 | Sklo nad scrollem | Statická kontrola: žádný prvek uvnitř scrollovaného seznamu nemá `backdrop-filter` |
| T-503 | C9-B5 | Vnořené sklo | Statická kontrola DOM: žádný prvek s `backdrop-filter` nemá předka s `backdrop-filter`; žádný skleněný panel ani jeho předek nemá `will-change` nebo `contain` |
| T-504 | obecné | Lighthouse CI | Performance a Accessibility nad dohodnutým prahem, měřeno na mobilním profilu |

T-502 a T-503 jsou levné statické kontroly nad výslednou stránkou a odchytí přesně ty chyby, které se v prohlížeči projeví jen na slabém telefonu.

---

## 10. L6 Export a data

| ID | Ověřuje | Test | Kritérium |
|---|---|---|---|
| T-600 | C6-A3 | Konce řádků | **Kontroluj syrové bajty.** Každý řádek končí `CRLF`. |
| T-601 | C6-A2 | Zalamování | Žádný řádek nepřesahuje 75 oktetů; pokračovací řádky začínají mezerou; zalomení nikdy neprotne vícebajtový znak |
| T-602 | C6-A1 | Escapování | `LOCATION` s čárkou v adrese obsahuje `\,`; hodnota se po parsování rovná původní adrese |
| T-603 | C6-A4 | Apple lokace | Přítomné `X-APPLE-STRUCTURED-LOCATION` se souřadnicemi |
| T-604 | C6-A6 | Časové pásmo | Přítomný `VTIMEZONE` pro `Europe/Prague`; `DTSTART` nese `TZID` |
| T-605 | C6-A6 | Přechod na zimní čas | Událost v 16:00 zůstává v 16:00 i po 25. 10. 2026 |
| T-606 | C6-A9 | Prázdniny | Datum státního svátku a školních prázdnin je v `EXDATE`; v rozvinuté řadě se nevyskytuje |
| T-607 | C6-A7 | Stabilita UID | Dva exporty téhož rozvrhu dají shodné `UID`; po změně stoupne `SEQUENCE` |
| T-608 | C6-A8 | Opakování | `RRULE` obsahuje `WKST=MO` a `UNTIL` na konci sezony |
| T-609 | C6-C2 | Kalendář na dítě | Export s více dětmi vytvoří samostatný soubor na dítě s vlastním `X-WR-CALNAME` |
| T-610 | C6-C2 | Export všech dětí | Jedním kliknutím se stáhne samostatný `.ics` na každé dítě (různé názvy souborů) |

**Zásadní upozornění k T-600 a T-601:** většina knihoven pro práci s ICS při parsování normalizuje konce řádků i zalomení. Pokud testuješ přes parser, chyby ve foldingu a v `CRLF` ti projdou. Tyto dva testy musí pracovat nad syrovým textem souboru, ostatní mohou přes parser.

---

## 11. L7 Co automat neodhalí

Tohle patří do manuální kontroly před releasem. Nesnaž se to automatizovat, stálo by to víc, než přinese.

| ID | Test | Zařízení |
|---|---|---|
| M-01 | Import ICS a kontrola adresy, špendlíku a upozornění | macOS Kalendář, iOS Kalendář, Google Kalendář, Outlook web, Thunderbird |
| M-02 | Druhý import téhož souboru | Nesmí vzniknout duplicity |
| M-03 | Plynulost scrollu se sklem | Skutečný střední telefon Android a starší iPhone, ne emulátor |
| M-04 | Tab bar vs. indikátor domů | Fyzický iPhone |
| M-05 | Tisk do PDF | Chrome, Safari, Firefox, kontrola zalomení mřížky |
| M-06 | Odečítač obrazovky | VoiceOver na iOS, NVDA na Windows: projít tok přidání kroužku |
| M-07 | Čitelnost skla na jasném slunci | Venku, mobil, maximální jas |
| M-08 | Test s reálným rodičem | Zadání: „složte dítěti rozvrh na tři kroužky a pošlete si ho do kalendáře.“ Nezasahovat, měřit dokončení a místa zaváhání. |

M-08 je jediný test, který odhalí problémy s použitelností. Ostatní ověřují jen to, že aplikace dělá, co jsme si předepsali.

---

## 12. Zapojení do CI

| Krok | Kdy | Blokuje merge |
|---|---|---|
| L0, L1, L6 na profilu Desktop a Mobil | Každý push | ano |
| L2 na všech šesti profilech | Každý push | ano |
| L3 (axe, kontrast tokenů) | Každý push | ano |
| L4 vizuální regrese | Každý push | ano, s možností schválené aktualizace baseline |
| L5 výkon | Nightly | ne, jen report |
| L7 manuální | Před releasem | ano |

Přebaselinování vizuálních snímků vyžaduje schválení v pull requestu. Bez toho se baseline stane skládkou.

---

## 13. Definition of Done pro testovací sadu

1. Každý požadavek s prioritou P0 z Changes 6 až 9 má alespoň jeden test s odkazem na své ID.
2. Testy běží na všech šesti profilech z matice, včetně obou hraničních (1280 px a 360 px).
3. V sadě není žádné `waitForTimeout`.
4. Žádný lokátor nesahá na CSS třídu.
5. Každý „incomplete“ z axe je buď vyřešen, nebo výslovně zdůvodněn v repu; u skleněných povrchů je vždy selháním.
6. ICS testy T-600 a T-601 pracují nad syrovým textem, ne přes parser.
7. Sada doběhne pod deset minut, jinak ji lidé začnou obcházet.
8. Manuální matice L7 je odškrtaná před každým releasem, s datem a jménem.
