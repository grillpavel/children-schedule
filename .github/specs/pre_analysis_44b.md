Aktuální verzi jsem znovu prošel a níže už nejdu jen po estetice. Hodnotím informační architekturu, user flow, mobilní UX, rozhodovací proces rodiče, komponenty, stavy, interakce a produktovou logiku. Aktuálně aplikace prezentuje 37 kroužků přes několik úrovní kategorií a u každého řádku kombinuje název, organizátora, kategorii, věk, termín, cenu a varianty.
MASTER UX/UI SPECIFICATION
Children's Activity Planner — Mobile First / iOS + Android
Produktový cíl
Aplikace nesmí působit jako:
databáze kroužků
Musí působit jako:
osobní plánovač volného času dítěte, který rodiči pomůže vybrat správné aktivity a poskládat z nich funkční týden.
To je základní produktová změna.
1. NEJDŮLEŽITĚJŠÍ PRINCIP
Aktuální model
Vyhledat
↓
Filtrovat
↓
Procházet kategorie
↓
Najít kroužek
↓
Rozhodnout se
To je špatně.
Nový model
Dítě
↓
Dostupný čas
↓
Preference
↓
Možnosti
↓
Kontrola konfliktů
↓
Shortlist
↓
Týdenní plán
Ještě lépe:
              ┌──────────────┐
              │    DÍTĚ      │
              └──────┬───────┘
                     ↓
          ┌────────────────────┐
          │ KDY MŮŽE / CHCE?   │
          └─────────┬──────────┘
                    ↓
          ┌────────────────────┐
          │ CO HO BAVÍ?        │
          └─────────┬──────────┘
                    ↓
          ┌────────────────────┐
          │ CO SE VEJDE?       │
          └─────────┬──────────┘
                    ↓
          ┌────────────────────┐
          │ CO JE NEJLEPŠÍ?    │
          └─────────┬──────────┘
                    ↓
             IDEÁLNÍ TÝDEN
2. P0 — REDESIGN DOMOVSKÉ OBRAZOVKY
Současný problém
Aplikace začíná:
search
filtry
dny
věk
„Vejde se mi to“
37 kroužků
To je database-first UX.
Nový Home
Header
Dobrý den 👋

Tento týden
Eliška · 9 let

[ změnit dítě ]
Pokud je více dětí:
Eliška 9       Tomáš 12
jako horizontal chips.
Hero
Tento týden

3 aktivity
2 150 Kč
0 konfliktů

Po     ⚽ Fotbal
Út     🥋 Karate
St     — volno —
Čt     🎨 Výtvarka
Pá     — volno —
CTA:
+ Přidat aktivitu
Potom
Doporučeno pro Elišku
3 nejlepší možnosti.
Ne 37.
🥋 Karate

Út · 17:30–18:30
6–15 let
1 300 Kč / rok

✓ Vhodné pro Elišku
✓ Bez kolize

[ Přidat ]
3. BOTTOM NAVIGATION
Na mobilech bych použil:
┌──────────────────────────────────┐
│                                  │
│        obsah obrazovky           │
│                                  │
├──────────────────────────────────┤
│ 🏠       🔎       ❤️       👧    │
│ Domů    Hledat   Výběr      Děti │
└──────────────────────────────────┘
4 položky maximum.
Ne 5–6.
Domů
aktuální týden
Hledat
discovery
Výběr
oblíbené / shortlist
Děti
profily + nastavení
4. P0 — PROFIL DÍTĚTE
Tohle je zásadní.
Aplikace musí znát kontext.
Profil
Eliška
9 let

Co ji baví?

⚽ Sport
🎨 Tvoření
🎵 Hudba
💻 Technologie

Preferované dny

Po ✓
Út ✓
St ✓
Čt ✓
Pá

Max. aktivit

3 týdně

Rozpočet

2 000 Kč / měsíc
5. ONBOARDING
Maximálně 30–45 sekund.
Step 1
Koho plánujeme?
Jméno + věk.
Step 2
Co dítě baví?
Velké vizuální chips:
⚽ Sport
🎨 Tvoření
🎵 Hudba
💻 Technologie
🥋 Pohyb
🔬 Věda
Step 3
Kdy má čas?
        14 15 16 17 18 19

PO      █████████████
ÚT          █████████
ST      █████████████
ČT          █████████
PÁ
Step 4
Kolik aktivit chcete?
1–2
3
4+
Step 5
Najít možnosti
Aplikace okamžitě zobrazí výsledek.
6. P0 — SEARCH
Search nesmí být jen:
Hledat kroužek…
To je příliš obecné.
Placeholder:
Co by chtělo dítě dělat?
A pod search:
Populární

⚽ Sport
🎨 Tvoření
💻 Programování
🥋 Karate
🎵 Tanec
🔬 Věda
Search musí podporovat:
název
kategorii
organizaci
lokalitu
7. P0 — FILTERS
„Další filtry“ je příliš neurčité.
Použij:
Filtrovat
Po aktivaci zobrazit badge:
Filtrovat · 3
Filter bottom sheet
Pro dítě
Eliška · 9 let
Kategorie
multi-select
Den
PO ÚT ST ČT PÁ
Čas
slider / range
Cena
do 500
do 1 000
do 2 000
Vzdálenost
pokud bude location:
do 2 km
do 5 km
do 10 km
Konflikty
Pouze bez konfliktu
Dostupnost
Pouze dostupné termíny
Dole:
Zobrazit 12 možností
To je velmi důležité.
CTA musí říct, co se stane po kliknutí.
8. P0 — KARTY
Současný řádek je příliš informačně hustý. Například jeden záznam dnes kombinuje organizátora, kategorii, věk, termín, cenu a počet variant v několika řádcích.
Nová karta:
┌──────────────────────────────┐
│ 🥋  Karate             ♡     │
│                              │
│ Bojové sporty · 6–15 let     │
│                              │
│ 🕐 Út 17:30–18:30             │
│ 📍 DDM Rakovník               │
│                              │
│ 💰 1 300 Kč / rok             │
│                              │
│ ✓ Vhodné pro Elišku           │
│ ✓ Bez konfliktu               │
│                              │
│              [ + Přidat ]    │
└──────────────────────────────┘
9. KARTA NESMÍ MÍT STEJNOU VÁHU INFORMACÍ
Hierarchie:
Level 1
Název
Level 2
Termín
Level 3
Vhodnost / konflikt
Level 4
lokace
Level 5
cena
Level 6
organizátor / metadata
Organizátor není stejně důležitý jako termín.
10. ODSTRANIT +1, +2
Aktuálně se používá například:
St 16:30 · +1
nebo
Po 16:30 · +2
To je nejasné.
Nahraď:
3 možné termíny
Po kliknutí:
Vyberte termín

○ Po 16:30
○ St 16:30
○ Pá 15:30
11. P0 — CONFLICT ENGINE
Tohle je jedna z nejdůležitějších funkcí.
Pokud mám:
Út 16:00–17:00 Fotbal
a přidávám:
Út 16:30–17:30 Karate
musí se objevit:
⚠️ Časová kolize

Karate
16:30–17:30

Fotbal
16:00–17:00

[ Vybrat jiný termín ]
[ Přidat přesto ]
Nikdy nenechat uživatele zjistit konflikt až později.
12. „VEJDE SE MI TO“ PŘEPSAT
Současné:
Vejde se mi to
je dobrý koncept, ale špatná microcopy.
Použil bych:
Bez konfliktu
nebo:
Jen to, co se vejde
Ještě lepší:
✓ Vejde se do týdne
To je lidské.
13. P0 — IDEÁLNÍ TÝDEN
To je hlavní differentiator.
CTA:
✨ Sestavit týden
Aplikace vezme:
dítě
věk
preference
dostupnost
existující aktivity
rozpočet
konflikty
a navrhne:
Váš návrh

PO
⚽ Fotbal
16:00

ÚT
—

ST
🎨 Výtvarné
14:00

ČT
🥋 Karate
17:30

PÁ
—

────────────────

3 aktivity
1 875 Kč / rok

✓ Bez konfliktů

[ Přijmout plán ]
[ Upravit ]
Tohle je produkt, který bych chtěl.
14. P1 — SMART MATCHING
Každý doporučený kroužek může mít:
94% shoda
Ale nikdy bych nedával procento bez vysvětlení.
Raději:
Proč doporučujeme?
✓ věk 9 let
✓ preferovaný sport
✓ středa je volná
✓ ve vašem rozpočtu
✓ žádná kolize
To je transparentní.
15. P1 — SHORTLIST
Bottom navigation:
❤️ Výběr
Moje možnosti

🥋 Karate
Út 17:30

🎨 Výtvarka
Čt 14:00

⚽ Fotbal
Út 16:00
Možnost:
Porovnat
16. POROVNÁNÍ
Nechci porovnávat dlouhé texty.
                 Karate   Fotbal   Výtvarka

Věk                ✓        ✓         ✓
Volný termín       ✓        ⚠         ✓
Cena             1300     1200      1300
Kolize             —        ⚠         —
Vzdálenost        2 km     4 km      1 km
A nahoře:
Nejlépe vychází: Výtvarka
17. P1 — DETAIL
Detail musí být decision page, nikoli databázový detail.
←

🥋
Karate

DDM Rakovník

6–15 let

──────────────

KDY

Út 17:30–18:30
Čt 17:30–18:30

──────────────

KDE

DDM Rakovník

[ Zobrazit mapu ]

──────────────

CENA

1 300 Kč / rok

──────────────

PRO ELIŠKU

✓ Věk sedí
✓ Čas sedí
✓ Bez konfliktu

──────────────

[ Přidat do týdne ]
CTA musí být sticky bottom.
18. P1 — WEEK VIEW
Týden musí být vizuálně dominantní.
Na mobilu ne klasická desktopová tabulka.
Použij:
Tento týden

PO 15.

⚽ Fotbal
16:00–17:00
📍 Sokol

ÚT 16.

🥋 Karate
17:30–18:30
📍 DDM

ST 17.

Volno

[ + Přidat ]
Swipe:
← minulý | tento | další →
19. P1 — DRAG & DROP
Na mobilech bych nevyžadoval klasický desktop drag & drop.
Použij:
Podržet → Přesunout
nebo:
⋯ → Změnit termín
Důležité je, aby to fungovalo i jednou rukou.
20. P1 — MULTIPLE CHILDREN
Produkt musí od začátku počítat s:
Eliška · 9
Tomáš · 12
Protože jinak se architektura později rozbije.
Home:
Eliška
Tento týden

[ přepnout dítě ]
Možná později:
Rodinný přehled
PO

Eliška   ⚽ 16:00
Tomáš    🥋 17:00
21. P2 — LOGISTIKA
Tohle může být obrovská výhoda.
Nejen:
časově nekoliduje
ale:
stihnu tam dojet?
Například:
⚠️ Těsný přesun

Fotbal končí 17:00
Karate začíná 17:15

📍 18 min autem

Doporučení:
Vyberte jiný termín.
Stavy:
🟢 bezpečné
🟡 těsné
🔴 nereálné
22. P2 — RODINNÝ ROZPOČET
Nezobrazovat pouze:
83 Kč/měs
ale umožnit:
Měsíční přehled
Aktivity

Fotbal       100 Kč
Karate       108 Kč
Výtvarka     108 Kč

Celkem
316 Kč / měsíc
A pokud je cena roční:
1 300 Kč / rok
sekundárně:
≈ 108 Kč / měsíc
23. P2 — EXTERNÍ KALENDÁŘ
Velká hodnota:
Přidat do kalendáře
Apple Calendar
Google Calendar
Event musí obsahovat:
název
čas
lokaci
dítě
organizátora
případně poznámku
24. P2 — NOTIFICATIONS
Ne spam.
Jen skutečně užitečné:
Zítra v 16:00 má Eliška fotbal.
nebo:
Karate změnilo termín.
nebo:
Přihlášky na výtvarku končí za 3 dny.
25. DESIGN SYSTEM
Typography
Doporučení:
Inter / SF Pro / system font
Nepoužívat více fontů.
H1
28–32 px
H2
22–24 px
Card title
17–18 px
Body
15–16 px
Metadata
13–14 px
Minimum textu:
12 px.
26. SPACING
Používat 4/8 grid.
4
8
12
16
24
32
40
48
Ne náhodné hodnoty.
Mobile page padding:
16 px
Card padding:
16 px
Section spacing:
24–32 px
27. CORNERS
Moderní consumer UI:
12–16 px
Cards:
16 px
Buttons:
12–14 px
Bottom sheet:
24 px top radius
28. TOUCH TARGETS
Minimum:
44 × 44 px
Ideálně:
48 × 48 px
Nikdy malé textové checkboxy.
29. ACCESSIBILITY
Musí být:
WCAG AA contrast
Dynamic Type
screen reader labels
focus states
keyboard navigation
reduced motion
ne pouze barvou rozlišované stavy
Například konflikt nesmí být jen červený.
Musí být:
⚠️ Konflikt
30. BARVY
Ne 15 barev.
Doporučil bych jednu primary brand color + semantic colors.
Primary
aktivní UI

Success
✓ bez konfliktu

Warning
⚠ těsný termín

Danger
× konflikt

Neutral
metadata
Kategorie mohou mít jemné tinty, ale nesmí vzniknout „duhový dashboard“.
31. IKONY
Používat konzistentní icon set.
Například:
Calendar
Clock
MapPin
Heart
User
Users
Filter
Search
Plus
Chevron
AlertTriangle
Check
Ikona nikdy nesmí nahrazovat text tam, kde význam není jasný.
32. ANIMACE
Ano, ale minimálně.
Použít:
card add → krátký transition
filter sheet → spring
week change → subtle slide
conflict → subtle shake / emphasis
favorite → micro-animation
Ne:
❌ permanentní animace
❌ bouncing UI
❌ dekorativní loading
33. LOADING STATES
Nikdy jen prázdná stránka.
Skeleton:
████████████████
████████

████████████
████████████
34. EMPTY STATES
Žádné aktivity
Váš týden je zatím prázdný 🌱
Najít první aktivitu
Žádné výsledky
Nic jsme nenašli.
Zkus:
Rozšířit čas
Zrušit filtr dne
Povolit jiné věkové kategorie
Žádný shortlist
Zatím nemáte uložené žádné možnosti.
Prozkoumat kroužky
35. ERROR STATES
Nikdy:
Something went wrong.
Raději:
Kroužky se nepodařilo načíst.
Zkusit znovu
A pokud lze:
Vaše uložené aktivity jsou stále dostupné.
36. MICROCOPY
Současný produkt má místy technické výrazy.
Nedoporučuji
„Další kroužky“
Lepší
Najít další aktivitu
Nedoporučuji
„Další filtry“
Lepší
Filtrovat
Nedoporučuji
„Vejde se mi to“
Lepší
Bez konfliktu
Nedoporučuji
„+1“
Lepší
3 možné termíny
Nedoporučuji
„Vlastní událost“
Lepší
+ Přidat vlastní aktivitu
37. DESKTOP
Desktop nesmí být jen zvětšený mobil.
Použil bych:
┌──────────┬───────────────────────────────┐
│          │                               │
│  logo    │       Týden dítěte            │
│          │                               │
│ Přehled  │   calendar / agenda           │
│ Hledat   │                               │
│ Výběr    │                               │
│ Děti     │                               │
│          │                               │
│          ├───────────────────────────────┤
│          │ Doporučení / shortlist        │
└──────────┴───────────────────────────────┘
Desktop:
sidebar
Mobile:
bottom navigation
38. NEJDŮLEŽITĚJŠÍ USER FLOW
Celý produkt bych testoval na tomto scénáři:
„Mám devítiletou dceru. Chci jí najít maximálně 3 kroužky, nechci úterý před 16:00, rozpočet max. 2 000 Kč ročně a nechci žádné časové konflikty.“
Ideální flow:
Open
 ↓
Eliška
 ↓
9 let
 ↓
Sport + tvoření
 ↓
Po–Čt
 ↓
max 3
 ↓
bez konfliktů
 ↓
12 vhodných možností
 ↓
3 doporučené
 ↓
detail
 ↓
přidat
 ↓
automaticky kontrolovat konflikt
 ↓
hotový týden
 ↓
uložit
 ↓
přidat do Apple/Google Calendar
Toto musí být dokončitelné přibližně za 60–90 sekund.
To je KPI.
39. PRODUKTOVÉ KPI
Nejen:
kolik lidí otevřelo stránku.
Měřil bych:
Discovery
Time to first relevant activity
Kolik sekund trvá najít první relevantní kroužek?
Decision
Shortlist rate
Kolik lidí si uloží alespoň jeden?
Planning
Plan completion rate
Kolik lidí vytvoří skutečný týden?
Conflict
Conflict resolution rate
Kolik konfliktů uživatel vyřeší?
Activation
First schedule created
Retention
Week 2 return
40. HARD UX RULES
Toto bych dal přímo do zadání designerovi/developerovi:
RULE 01
Uživatel nikdy nesmí být zahlcen 30+ výsledky bez prioritizace.
RULE 02
Primární otázka je „hodí se mi to?“, ne „co to je?“.
RULE 03
Každý kroužek musí mít jasný termín.
RULE 04
Každý konflikt musí být explicitně vysvětlen.
RULE 05
+1, +2 se nepoužívá.
RULE 06
Primární CTA musí být vždy jedna.
RULE 07
Na mobilu žádné desktopové tabulky.
RULE 08
Filtry jsou schované v bottom sheetu.
RULE 09
Aktivní filtry musí být viditelné.
RULE 10
Uživatel musí vždy vědět, pro které dítě plánuje.
RULE 11
Cena musí být srozumitelná.
RULE 12
Detail nesmí být datový dump.
RULE 13
Doporučení musí vysvětlit proč.
RULE 14
Prázdný stav musí nabídnout další krok.
RULE 15
Každá destruktivní akce musí být vratná nebo potvrzená.
41. PRIORITY IMPLEMENTACE
Sprint 1 — FOUNDATION
P0
nový mobile navigation
child profile
home dashboard
week agenda
nový card design
nový detail
filter bottom sheet
search
shortlist
Sprint 2 — INTELLIGENCE
P0/P1
conflict detection
available slots
„fits my week“
recommended activities
explainability
budget
Sprint 3 — FAMILY
P1
multiple children
family overview
shared schedule
calendar export
Sprint 4 — ADVANCED
P2
travel time
auto scheduling
notifications
smart recommendations
registration/deep links
42. Co bych NEDĚLAL
Tohle je stejně důležité.
❌ Nedával bych hned AI chat
Chatbot typu:
„Ahoj, jak ti mohu pomoci?“
je zde horší UX než dobře udělaný planner.
Nejdřív vyřešit data + constraints + UI.
❌ Nedával bych dashboard plný statistik
Rodiče nepotřebují:
14 activities / 37 events / 82% utilization
To je planner pro software engineer.
Ne pro rodiče.
❌ Nedával bych všechno na první obrazovku
State-of-the-art UI není:
více informací
ale:
správná informace ve správný okamžik.
43. FINÁLNÍ PRODUKTOVÁ ARCHITEKTURA
Výsledná aplikace:
                         APP
                          │
          ┌───────────────┼───────────────┐
          │               │               │
        DÍTĚ            TÝDEN           KATALOG
          │               │               │
      věk/zájmy       aktivity         search
      dostupnost      konflikty        filters
      preference      rozpočet         categories
          │               │               │
          └───────────────┼───────────────┘
                          │
                    MATCH ENGINE
                          │
              ┌───────────┴───────────┐
              │                       │
         DOPORUČENÍ               KONFLIKTY
              │                       │
              └───────────┬───────────┘
                          │
                    IDEÁLNÍ TÝDEN
44. A moje finální hodnocení současné verze
Podle mě současná aplikace nemá problém s nedostatkem funkcí.
Má problém s prioritizací funkcí a informační architekturou.
Současná verze:
Databáze → filtry → seznam → detail
by měla být:
Dítě → týden → doporučení → výběr → konflikt → hotovo
A to je zásadní.
Současný katalog může klidně zůstat jako data layer / discovery layer — jeho obsah je použitelný. Například aktuální dataset už obsahuje věk, kategorii, organizátora, termíny, cenu i varianty; není tedy nutné začínat od datové nuly.
Ale UI bych skutečně předělal od základů. Nesnažil bych se současnou stránku „vylepšit“. Udělal bych nový UX koncept, který současná data využije.
A pokud je cílem opravdu „the best“, můj další krok by nebyl další seznam doporučení. Udělal bych z toho konkrétní obrazovkovou specifikaci 1:1: cca 15–20 obrazovek, každou s přesným layoutem, pořadím prvků, CTA, stavy, chybami, empty states, bottom sheets, modaly, navigací, breakpointy pro iPhone/Android a přesným českým microcopy. To už by byla prakticky Figma-ready specifikace pro kompletní redesign.