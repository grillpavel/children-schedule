Aktuální build jsem znovu prošel proti živé URL a tentokrát se zaměřil hlavně na to, co se změnilo, co je už správně a kde bych byl ještě velmi kritický před tím, než bych build pustil k reálným rodičům. Aktuálně se například více termínů zobrazují jako „+ 1 další termín“ / „+ 2 další termíny“, což je proti předchozí verzi UXově lepší. Katalog nyní obsahuje 37 kroužků a konzistentně zobrazuje věk, čas a cenu; některé aktivity ale stále nemají uvedenou cenu.
Executive verdict
Produktový koncept: 8/10
Desktop UX: 7/10
Mobile UX: 5,5/10
Tablet UX: 6/10
Discoverability: 6/10
Práce s rozhodovací složitostí: 6/10
Potenciál po redesignu: 9–9,5/10
Největší problém už není „ošklivé UI“ ani nedostatek funkcí.
Je to informační architektura.
Aplikace stále primárně říká:
Tady jsou kroužky. Najdi si jeden.
Měla by říkat:
Tady je tvoje dítě. Tady je jeho týden. A tady jsou nejlepší možnosti, které se do něj opravdu vejdou.
To je podle mě hlavní produktový posun, který ještě chybí.
1. Co je v aktuální verzi lepší
Některé věci se evidentně posunuly správným směrem.
Více termínů
Nově je například:
St 16:30 + 1 další termín
místo neurčitého +1. To je správně.
Ještě bych to ale dotáhl na:
St 16:30
+ 1 další termín
tedy vizuálně oddělit hlavní termín a sekundární akci.
Cena
Aktuálně je cena konzistentně:
1200 Kč/rok
a u některých aktivit:
Cena neuvedena
To je datově čisté.
UXově bych ale změnil formát na:
1 200 Kč / rok
a „Cena neuvedena“ vizuálně označil jako neznámou hodnotu, nikoli jako chybějící UI.
Hierarchie kategorií
Je vidět jasné rozdělení:
Sport a pohyb → Míčové a týmové sporty → konkrétní kroužky
a obdobně:
Věda a technika → Technika a programování → aktivity.
To je datově dobré.
Ale právě tato hierarchie se musí na mobilu výrazně zjednodušit.
2. Největší UX problém aktuálního buildu
Horní část aplikace má stále současně:
Hledat kroužek…
Další filtry
Po Út St Čt Pá So Ne
Jen vhodné pro věk 9
Bez konfliktu
Doporučení na míru
Další kroužky (37)
Rozbalit vše / Sbalit vše
To je příliš mnoho rozhodnutí před prvním výsledkem.
Z pohledu rodiče je tam najednou:
search
advanced filters
day filter
age filter
conflict filter
recommendations
categories
expand/collapse
To je vysoká decision density.
Na desktopu to ještě přežije.
Na mobilu je to přesně typ UI, které začne být „technicky funkční“, ale psychologicky únavné.
3. Mobile musí mít úplně jiný start
Na mobilu bych neotevíral:
Seznam všech kroužků
ale:
Matěj · 9 let
Dnes
16:30
🏀 Basketbal
Tento týden
Po — 2 aktivity
Út — 1 aktivita
St — volno
Čt — 1 aktivita
Co se ještě vejde?
4 vhodné možnosti
Tím se aplikace stane personalizovanou, ještě než uživatel cokoliv hledá.
4. Dítě musí být první-class entity
Aktuálně je věk 9 prezentován jako filtr:
Jen vhodné pro věk 9
To je podle mě pořád špatný mentální model.
Správně:
Matěj · 9 let
A aplikace od toho odvozuje:
vhodný věk,
konflikty,
rozvrh,
doporučení,
dostupné aktivity.
Filtr „věk 9“ může existovat interně, ale uživatel by měl myslet:
„Co se hodí Matějovi?“
ne:
„Zapnul jsem filtr věku 9.“
5. Velmi kritická věc: jeden prvek je v accessibility stromu nejasně označený
Aktuálně je mezi „Další filtry“ a dny ještě další anonymní Select, jehož účel není z přístupového stromu jednoznačný.
To je malý detail s velkým UX dopadem.
Každý select musí mít explicitní label:
Dítě
nebo:
Seřadit podle
nebo:
Kategorie
Ne:
„nějaký select“
Tohle bych dal do P0 accessibility/UX.
6. „Rozbalit vše“ je stále špatná mobilní strategie
Aktuálně má aplikace:
Rozbalit vše / Sbalit vše
Na desktopu:
OK.
Na tabletu:
příležitostně OK.
Na mobilu:
remove.
Proč?
Protože uživatel tím může vytvořit dlouhou stěnu:
Sport → všechny subkategorie → všechny aktivity → další kategorie → další aktivity…
To je přesně opačný princip než mobile-first progressive disclosure.
7. Kategorie na mobilu: jedna úroveň najednou
Místo:
Sport a pohyb
  Míčové a týmové sporty
    ...
  Atletika
    ...
  Bojové sporty
    ...
udělat:
Sport
Umění
Hudba
Věda
Technologie
Příroda
Hry
Tap:
Sport

Míčové sporty
Atletika
Bojové sporty
Gymnastika
Tap:
Míčové sporty

Basketbal
Florbal
Fotbal
Hokejbal
Je to mnohem lépe skenovatelné palcem.
8. Activity card je stále moc databázová
Aktuální položky vypadají zhruba:
Sportovní kroužek I.
Dům dětí... · Sport · 5–9 let
Po 15:15
1000 Kč/rok
To je dobrý datový záznam.
Není to ještě dobrá rodičovská karta.
Na mobilu:
🏀 Basketbal — přípravka

Po 16:30–17:30
8–11 let

1 200 Kč / rok
📍 Rakovník

✓ Hodí se Matějovi

[ Přidat ]
Priorita je:
decision information first.
9. Chybí jeden extrémně důležitý údaj: konec aktivity
Aktuálně jsou v seznamu časy typu:
Po 16:30
Út 16:00
St 15:30
To je pro samotné hledání ještě přijatelné.
Pro kolize je to ale zásadní UX problém.
Uživatel potřebuje vidět:
16:30–17:30
ne jen:
16:30
Pokud délka není v datech, musí být vyřešena datovým modelem nebo alespoň odvozena.
Bez konce aktivity nemůžete udělat opravdu důvěryhodný collision engine.
10. Kolize musí být hlavní systém, ne checkbox
Aktuálně máme:
Bez konfliktu
To je příliš binární.
Doporučuji tři stavy:
🟢 Volné
✓ Bez kolize
🟡 Těsné
⚠ Těsná návaznost
🔴 Konflikt
⚠ Kolize s Fotbalem
To už člověk chápe na první pohled.
11. Kolize musí být vysvětlitelné
Nikdy jen:
🔴 Kolize
ale:
⚠ Kolize s Fotbalem
Fotbal 16:00–17:00
A pokud má uživatel více aktivit:
⚠ Kolize se 2 aktivitami
Tap →
Fotbal 16:00
Angličtina 16:30
12. Povinná collision test matrix
Backend/business logic bych proti tomu testoval automatizovaně.
A	B	Výsledek
16:00–17:00	16:00–17:00	🔴 konflikt
16:00–17:00	16:30–17:30	🔴 konflikt
16:00–18:00	16:30–17:00	🔴 konflikt
16:30–17:00	16:00–18:00	🔴 konflikt
16:00–17:00	17:00–18:00	🟡/🟢 podle travel bufferu
16:00–17:00	17:15–18:00	🟢
stejná aktivita	stejný termín	duplicate handling
dvě děti	stejný čas	🟢 není konflikt
vlastní událost	kroužek	konflikt dle času
opakující se události	aktivita	kontrolovat každou instanci
Boundary cases jsou zde stejně důležité jako běžné kolize.
13. Chybí třetí koncept: logistická kolize
Tohle bych určitě přidal do roadmapy.
Například:
Basketbal
16:00–17:00
📍 Rakovník
Karate
17:00–18:00
📍 Nové Strašecí
Technicky:
žádný překryv
Prakticky:
možná nemožné stihnout.
Proto:
Nastavení
Čas na přesun: 15 min
A potom:
⚠ Nestíháte přesun
To je velmi silný diferenciátor produktu.
14. „Bez konfliktu“ by mělo říkat „pro koho“
Aktuálně je konflikt zobrazen jako obecný stav.
Místo:
✓ Bez konfliktu
lépe:
✓ Bez kolize v Matějově rozvrhu
To je mnohem jasnější při více dětech.
15. „Doporučení na míru“ má obrovský potenciál, ale nesmí být další sekce
Aktuálně je:
Doporučení na míru
To je dobrý základ.
Ale produktově bych ho postavil úplně dopředu:
Co se hodí Matějovi?
3 možnosti
🏀 Basketbal
Po 16:30
✓ věk
✓ volno
1 200 Kč/rok
🥋 Karate
Po 17:30
✓ věk
✓ volno
1 300 Kč/rok
Aplikace by měla říct proč.
16. „Proč doporučeno?“ je zásadní pro důvěru
Příklad:
Proč doporučeno?
✓ věk 9 let odpovídá
✓ pondělí je volné
✓ žádná kolize
✓ v rozpočtu
To je mnohem důvěryhodnější než nějaké tajemné ranking skóre.
17. Tablet bych využil výrazně lépe než mobil
Na tabletu nechci čistý mobilní layout.
Chci master-detail.
┌──────────────┬────────────────────┬──────────────────────┐
│ FILTRY       │ KROUŽKY            │ MATĚJŮV ROZVRH       │
│              │                    │                      │
│ Věk 9        │ Basketbal          │ PO                   │
│ Po           │ Karate             │ 16:30 Basketbal      │
│ Sport        │ Atletika           │                      │
│              │ Florbal            │ ÚT                   │
│              │                    │ 16:00 Fotbal         │
│              │                    │                      │
└──────────────┴────────────────────┴──────────────────────┘
Kliknu na Basketbal:
pravý panel zobrazí detail.
Bez navigace pryč ze seznamu.
To je ideální tablet UX.
18. Tablet musí držet kontext
Největší chyba tabletových UI je:
otevřu detail → přijdu o seznam → vrátím se → hledám, kde jsem byl.
To nesmí nastat.
Při otevření detailu:
seznam zůstává,
zvolená karta zůstává zvýrazněná,
schedule zůstává,
filtr zůstává.
19. Mobile detail: bottom sheet
Na telefonu doporučuji:
tap karty → bottom sheet
Basketbal — přípravka

8–11 let

Po 16:30–17:30
+ 1 další termín

📍 DDM Rakovník
💰 1 200 Kč / rok

Matěj · 9 let

✓ Věk odpovídá
✓ Bez kolize

[ Přidat do rozvrhu ]
To je rychlejší než full-page navigation.
20. „Vlastní událost“ bych zvedl z úplného dna
Aktuálně je:
Vlastní událost
prakticky až na konci DOMu stránky.
A to je velká UX chyba.
Pro rodiče je vlastní událost základní stavební kámen rozvrhu, nikoli poslední položka seznamu.
Mobil:
＋ Přidat
Kroužek
Vlastní událost
Například:
Škola — Po–Pá 8:00–13:00
A až potom:
Co se ještě vejde?
21. Search by měl být mnohem silnější
Teď:
Hledat kroužek…
Je to dobrý start, ale na mobilu bych z něj udělal command center.
Například:
basket
→ Basketbal
sport
→ Sportovní kroužky
po
→ Kroužky v pondělí
Do budoucna:
sport po 16 do 500
→ aplikace pochopí intent.
Nemusí to být hned AI.
22. Filtry jsou stále příliš „technické“
Rodič nechce přemýšlet:
„Bez konfliktu“ + „věk 9“ + „Po“.
Chce:
„Najdi mi něco pro Matěje v pondělí po škole, co se vejde do rozvrhu.“
Proto bych na mobilu udělal jeden prominentní CTA:
Najít, co se vejde
A klasické filtry bych dal jako sekundární mechanismus.
23. Doporučený mobile filter UX
Filtry                              Vymazat

DÍTĚ
Matěj · 9 let

KDY
[Po] [Út] [St] [Čt] [Pá]

KATEGORIE
Sport
Hudba
Umění
Věda

CENA
0 Kč ───────── 500 Kč

KOLIZE
● Pouze volné
○ Vše

────────────────────────

[ Zobrazit 12 kroužků ]
CTA musí obsahovat počet výsledků.
To je mnohem lepší než:
Použít.
24. Zásadní mobilní změna: bottom navigation
Doporučení:
┌────────────────────────────────┐
│                                │
│             CONTENT            │
│                                │
├────────────────────────────────┤
│ 🏠        🔎        📅      👨‍👩‍👧 │
│ Domů    Kroužky   Rozvrh    Děti │
└────────────────────────────────┘
Tohle bych považoval za P0.
25. Rozvrh musí být centrum produktu
Dnes je katalog primární.
Já bych udělal:
Katalog = prostředek
Rozvrh = výsledek
To znamená:
Kroužky jsou discovery.
Rozvrh je destination.
26. Mobilní rozvrh musí ukazovat nejen aktivity
Například:
PO 18

15:00
Škola

16:30
🏀 Basketbal

17:45
🚗 Přesun / domů
A konflikt:
16:30
🏀 Basketbal

16:45
⚽ Fotbal

🔴 Kolize
Tím uživatel rozumí problému v kontextu, ne v samostatném popupu.
27. Drag & drop: opatrně
Na tabletu:
ano.
Na desktopu:
ano.
Na mobilu:
sekundární.
Primární:
Tap → Upravit
Protože drag na touch zařízení velmi snadno začne místo přesunu scrollovat stránku.
28. Empty states potřebují být chytré
Pokud uživatel vybere:
Matěj 9
Čt
Sport
bez konfliktu
do 500 Kč
a nic nenajde:
Ne:
0 výsledků
Ale:
Nic přesně nevyhovuje
Zkusit:
+ 1 den
+ 100 Kč
Zobrazit i těsné termíny
Aplikace by měla případně nabídnout:
Nejbližší možnost: Karate, Po 17:30.
29. Pozor na „Cena neuvedena“
V aktuálním katalogu je například u fotbalu opakovaně:
Cena neuvedena.
To je OK.
Ale musí být jednoznačné chování filtru:
Do 1 500 Kč
Co udělá Fotbal?
Doporučuji:
nezahrnout do tvrdého price cap,
ale nabídnout možnost:
„zahrnout i aktivity bez uvedené ceny“.
30. Další zásadní UX problém: délka názvů
Aktivity jako:
„Florbal I. — elévky + minižákyně“
nebo:
„Fotbal — starší žáci“
jsou reálná data.
Na mobilu musí být karta navržena tak, aby:
název mohl mít 2 řádky,
metadata nespadla do vizuálního chaosu,
tlačítko zůstalo dosažitelné,
žádný text nebyl zkrácen bez možnosti detailu.
Nikdy nefixovat výšku karty tak, aby se názvy ořezávaly.
31. Touch target audit
Každý interaktivní prvek:
min. 44×44 px
Platí pro:
dny,
dropdowny,
checkboxy,
close button,
expand/collapse,
add,
edit,
delete,
tabs,
back.
Na mobilu bych se spíše přikláněl k 48 px tam, kde je to možné.
32. Accessibility
Povinně:
keyboard navigation
visible focus
screen reader labels
semantic buttons
minimum contrast
text scaling
reduced motion
no color-only communication
accessible drag alternative
A zejména:
Bez konfliktu
nesmí být pouze zelené.
Použít:
✓ Bez kolize
a při problému:
⚠ Kolize s Fotbalem
33. Co bych automaticky testoval na každém deployi
Ne manuálně.
Automaticky.
Functional smoke test
search
filter
clear filter
category expand
category collapse
open activity
show additional term
add activity
remove activity
create custom event
edit event
delete event
switch child
Responsive smoke test
320 px
360 px
375 px
390 px
412 px
768 px
820 px
1024 px
A hledat:
horizontal overflow
clipped text
overlapping controls
sticky elements covering content
inaccessible buttons
keyboard/focus traps
broken bottom sheets
broken modal close behavior
34. Kritické edge cases
Tohle je podle mě v další fázi důležitější než další vizuální polish.
Testovat:
1. Aktivita právě končí, druhá právě začíná
16:00–17:00
17:00–18:00
2. 1 minuta překryvu
16:00–17:00
16:59–18:00
3. Aktivita je uvnitř jiné
16:00–18:00
16:30–17:00
4. Dvě stejné aktivity
same day + same time
5. Více termínů jedné aktivity
Pokud aktivita nabízí:
Po + St + Pá,
jak systém chápe přidání?
Tohle je velmi důležitá otázka datového modelu.
35. Kritický edge case: „+ 2 další termíny“
Aktuálně například Atletika nabízí:
Út 15:00 + 2 další termíny
Tady musí být jednoznačné:
Je to jedna aktivita se třemi možnými termíny?
nebo:
Jsou to tři samostatné skupiny?
UX toho musí být schopné explicitně říct.
Doporučuji:
Vyberte termín
Po tapnutí:
Atletika — přípravka

○ Po 15:00
○ St 15:00
○ Pá 16:00

[ Přidat vybraný termín ]
To je mnohem lepší než nechat uživatele hádat význam „+2“.
36. Jeden velmi důležitý produktový model
Pokud má aktivita více možných termínů, nepřidával bych automaticky všechny termíny do rozvrhu.
Uživatel by měl přidat:
konkrétní session/group/slot
Například:
Atletika — přípravka
Termín:
Út 15:00
ne:
Atletika + 2 další termíny
To může být jeden z největších UX edge cases celé aplikace.
37. Multi-child collision model
Při více dětech:
Matěj — Basketbal 16:30
Anička — Taneční 16:30
není to konflikt v jejich vlastních rozvrzích.
Ale může vzniknout:
⚠ Rodič musí být na dvou místech současně.
To je budoucí vyšší úroveň plánování.
Proto bych v architektuře už nyní oddělil:
Child conflict
od
Family conflict
To bude velmi cenná možnost do budoucna.
38. State-of-the-art doporučení: family feasibility
Ve výsledku bych nepočítal pouze:
„Je volno v rozvrhu dítěte?“
Ale:
„Je to reálně proveditelné pro rodinu?“
Příklad:
Matěj → Basketbal 16:30
Anička → Taneční 16:30
→
🔴 Rodinná kolize
To je skutečná hodnota produktu.
39. P0 — co bych nyní opravdu implementoval
P0.1
Mobile-first information architecture
Domů / Kroužky / Rozvrh / Děti
P0.2
Selected child context
Matěj · 9 let
P0.3
Home = personalized schedule
Ne katalog.
P0.4
"Co se vejde?"
Hlavní CTA.
P0.5
Explicitní collision model
🟢 / 🟡 / 🔴
P0.6
Activity detail bottom sheet
P0.7
Mobile filter sheet
P0.8
Activity session selection
Pro +1, +2.
P0.9
Tablet master-detail
P0.10
Custom event jako first-class action
40. P1
travel buffer
smart recommendations
explainable recommendations
smart empty states
multiple children
family conflicts
stronger search
accessible drag/drop
automated responsive QA
41. P2 — skutečný „wow“
Později:
„Najdi mi nejlepší kombinaci aktivit pro Matěje.“
Input:
9 let
sport
Po–Čt po 15:00
max. 5 000 Kč/rok
nechci více než 3 odpoledne týdně
Output:
Nejlepší kombinace
🥇 Basketbal + Atletika
🥈 Karate + Basketbal
🥉 Fotbal + Výtvarné tvoření
Proč?
žádné kolize
2 volná odpoledne
v rozpočtu
věkově vhodné
To už je skutečně state-of-the-art family scheduling experience.
42. Moje finální kritika současné verze
Nejsem už ve fázi, kdy bych doporučoval další kosmetické úpravy.
Aktuální build má dost funkcí a data jsou dobře strukturovaná. Vidím například 37 aktivit, hierarchické kategorie, více termínů, věkové rozsahy, ceny i „Vlastní událost“.
Problém je, že tyto funkce jsou stále prezentované převážně jako datový katalog.
Moje hlavní doporučení je proto:
Přestaňte optimalizovat seznam kroužků.
Začněte optimalizovat:
rozhodnutí rodiče.
Cílový UX flow
1. Vyberu dítě
        ↓
2. Vidím jeho týden
        ↓
3. Kliknu "Co se vejde?"
        ↓
4. Aplikace najde vhodné možnosti
        ↓
5. Vidím PROČ jsou vhodné
        ↓
6. Vidím případnou kolizi
        ↓
7. Vyberu konkrétní termín
        ↓
8. Jedním tapem přidám
        ↓
9. Okamžitě vidím aktualizovaný týden
Toto bych stanovil jako hlavní UX benchmark nové verze.
Ne „má aplikace všechny filtry?“
Ale:
Dokáže rodič během několika sekund pochopit, co se jeho dítěti tento týden skutečně vejde?
To je podle mě správný standard pro další iteraci.