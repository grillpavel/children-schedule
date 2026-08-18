Testování aktualizované verze aplikace potvrzuje správný směr vývoje směrem k rodinnému plánovači. Pro dosažení absolutní špičky v intuitivnosti a použitelnosti (state-of-the-art UX) na mobilech a tabletech je však nutné odstranit zbývající mikro-interakční překážky a přizpůsobit ovládání dotykovým zařízením.

1. Kritická analýza uživatelského zážitku (UX & Touch Audit)
Mobilní Thumb Zone (Zóna palce):
Stávající problém: Hlavní ovládací prvky (přepínání dětí, hlavní filtry, hledání) se nachází v horní třetině obrazovky. Na moderních smartphonéch (>6,1 
′′
 ) je toto místo bez přehmatávání ruky těžko dostupné.
Řešení: Přesunout hlavní navigaci do spodní fixní lišty (Bottom Navigation Bar: Přehled, Kroužky, Rozvrh, Děti).
Interakční konflikt kalendáře (Drag vs. Scroll):
Stávající problém: Přetahování prvků v týdenní mřížce na mobilním displeji koliduje s vertikálním a horizontálním skrolováním stránky.
Řešení: Na mobilních zařízeních zcela vyřadit Drag & Drop. Nahradit jej dvoufázovým Tap-to-Assign: klepnutí na kroužek v katalogu zvýrazní dostupné volné sloty v rozvrhu, druhým klepnutím na vybraný slot se kroužek vloží.
Informační přetížení mobilní karty:
Stávající problém: Seznam kroužků zobrazuje příliš mnoho sekundárních dat najednou (organizátor, podrobný věk, kategorie, lokalita, počet lekcí), což vede k nutnosti neustálého skrolování.
Řešení: Zavedení 3-řádkového micro-card designu. Karta obsahuje pouze: Název + ikonu, Den/Čas + Cenu, Akční tlačítko +. Kompletní detail (lokace, lektor, kontakt) se otevírá přes vysouvací Bottom Sheet.
2. Stresový test Kolizního a Logistického Enginu

Aplikace musí v reálném čase přesně rozlišovat mezi fyzickým překryvem časů a logistickou neproveditelností.

Scénář kolize	Rizikový stav	Cílové State-of-the-Art řešení
Přímý časový překryv


(Po 16:00–17:00 vs Po 16:30–17:30)

Blokování přidání nebo nejasné chování.	Vizuální varování 🔴 Kolize s [Název]. Akce přidání zůstává povolená (tlačítko Přesto přidat), protože rodič může chtít kolizi vědomě řešit sám.
Těsná logistická návaznost


(Konec 17:00 v místě A → Start 17:00 v místě B)

Aplikace hlásí stav bez kolize (0 min překryv).	Upozornění 🟠 Nestíháte přejezd (Místo A → Místo B). Aplikace počítá s uživatelsky nastavitelnou pauzou na přesun (např. 15 minut).
Souběh s vlastní událostí


(Škola, kroužek, lékař)

Různá logika pro kroužky a vlastní události.	Jednotný kolizní model. Vlastní událost blokuje časové okno se stejnou vahou jako katalogový kroužek.
Paralelní rozvrh více dětí	Ztráta přehledu při přepínání profilů.	Vizuální indikace obsazenosti rodinného času (přehled, že v 16:00 již má aktivitu druhé dítě).
3. Architektura rozvržení pro Tablet (768 px≤viewport<1024 px)

Tablet nesmí fungovat jako roztažený mobilní telefon. Využívá se dvoupanelový Split Master-Detail Layout:

+-----------------------------------------------------------------------+
|  HEADER: [ Profil Dítěte ▼ ]                       [ Export / Akce ]  |
+------------------------------------+----------------------------------+
|  LEFT PANE (40% šířky)             |  RIGHT PANE (60% šířky)          |
|  Katalog & Filtry                  |  Živý, trvale viditelný rozvrh   |
|                                    |                                  |
|  - Vyhledávání a kategorie         |  - Týdenní mřížka aktivního      |
|  - Micro-karty kroužků             |    dítěte                        |
|  - Tlačítko "Náhled v rozvrhu"     |  - Okamžitý náhled při hoveru/   |
|                                    |    klepnutí na kroužek vlevo     |
+------------------------------------+----------------------------------+
4. Klíčová mikro-UX vylepšení pro okamžitou intuitivnost
Non-blocking Undo namísto dialogů:
Při odstranění kroužku nekonfrontovat uživatele s otázkou "Opravdu chcete smazat?". Kroužek okamžitě odebrat a zobrazit spodní 4sekundový Undo Toast s tlačítkem ZPĚT.
Chytrý režim „Najít volné místo“:
Místo ručního nastavení filtrů (den, čas, věk) přidat jedno dominantní tlačítko, které sečte volná časová okna v rozvrhu dítěte a vyfiltruje pouze kroužky, které do nich přesně zapadají.
Práce s vizuální přístupností (Accessibility):
Stavy kolizí nesmí být identifikovatelné pouze barvou (červená/zelená). Vždy kombinovat barvu s jednoznačným symbolem a textovým štítkem: 🟢 ✓ Bez kolize, 🟠 ⚠️ Těsný přesun, 🔴 ❌ Časová kolize.
5. Prioritizovaná roadmapa úprav
P0 (Kritické pro ovládání):
Spodní navigace (Bottom Nav Bar) na mobilu.
Zjednodušení karty kroužku v seznamu + detail v Bottom Sheetu.
Zrušení mobilního Drag & Drop ve prospěch Tap-to-Assign.
Undo Toast při mazání aktivit.
P1 (Pokročilá funkcionalita):
Výpočet logistického času na přesun mezi různými lokalitami.
Tablet Split Master-Detail rozvržení s živým náhledem rozvrhu.
Algoritmus pro automatické doporučování kroužků do volných oken.