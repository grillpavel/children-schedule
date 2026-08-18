Mobilní a Tablet UX Specifikace – v3 → v4
Prošel jsem aktuální stav aplikace (v3) i tato nová doporučení.
Shoda je velmi vysoká. Níže je syntetizovaná, prioritizovaná a implementovatelná specifikace pro mobil a tablet, která bere to nejlepší z obou pohledů.

Základní princip (musí se změnit)
Mobil není menší desktop.
Rodič nechce procházet 37 kroužků. Chce co nejrychleji odpovědět:
„Co může moje dítě dělat, kdy to je, kolik to stojí a jestli se to nekříží?“
Aplikace se musí ptát:
„Co se hodí vašemu dítěti?“
ne
„Jaké kroužky hledáte?“

1. Mobilní informační architektura
Bottom Navigation (povinné)

TabObsahPoznámkaPřehledDnes + Tento týden + DoporučeníHlavní obrazovkaKroužkySearch + Filtry + VýsledkyKatalogRozvrhAgenda (default) / MřížkaVýsledekDětiProfily dětí + nastaveníKontext
Rozvrh je produkt. Katalog je prostředek.

2. Mobilní karty kroužků (dramatické zjednodušení)
Aktuálně příliš mnoho informací najednou.
Nová mobilní karta (povinné):
text🏀 Basketbal — přípravka
8–11 let · Po 16:30
100 Kč/měs · DDM Rakovník

[ + Přidat ]
Po tapnutí → Bottom Sheet s kompletními informacemi:

Všechny termíny
Přesná lokalita
Cena (měsíční / roční)
Věkové rozmezí
Organizátor
Badge: ✓ Vhodné pro Matěje · ✓ Bez kolize
Velké tlačítko Přidat do rozvrhu

80 % informací schovat za detail.

3. „Najít volné místo“ – klíčová funkce
Přejmenovat a výrazně posílit současné „Vejde se mi to / Bez konfliktu“.
Nový koncept:
Najít volné místo
Po aktivaci aplikace ukáže:
textPro Matěje tento týden:

🟢 Basketbal — Po 16:30
   Bez kolize

🟢 Karate — Po 17:30
   Bez kolize

🔴 Fotbal — Po 16:00
   Kolize s Plaváním
Toto musí být jeden z nejsilnějších vstupních bodů.

4. Systém kolizí (vizuálně okamžitě pochopitelný)
Rozlišovat minimálně 3 stavy:

























StavVizuálTextBez kolize🟢✓ Bez kolizeTěsná návaznost🟠⚠️ Stihne přesun?Přímá kolize🔴❌ Kolize s „Karate“
Nikdy neblokovat přidání.
Vždy nabídnout: Přesto přidat

5. Dítě jako centrální kontext
Místo izolovaného filtru „Jen vhodné pro věk 9“:
text👦 Matěj · 9 let ▼
Po přepnutí dítěte se automaticky přepočítá:

Vhodný věk
Kolize
Doporučení
Rozvrh


6. Mobilní layout – Přehled (Tab 1)
textAhoj 👋
Matěj · 9 let ▼

┌─────────────────────────┐
│ DNES                    │
│ 15:30 Programování      │
│ 16:30 Basketbal         │
└─────────────────────────┘

Volné možnosti
[ Po ] [ Út ] [ St ] [ Čt ]

Doporučujeme
🥇 Basketbal — Po 16:30
   ✓ vhodný věk · ✓ bez kolize
🥈 Programování — Po 15:30
   ✓ vhodný věk · ✓ bez kolize

[ Zobrazit všechny ]

7. Filtry na mobilu
Místo „Další filtry“:
Filtry · 3
Otevře Bottom Sheet s:

Věk
Dny (Po–Pá + víkend)
Čas od–do
Cena
Kategorie

Dole sticky tlačítko:
Zobrazit 14 kroužků

8. Tablet – úplně jiné rozložení
Tablet není větší mobil.
Doporučený layout (768–1200 px):
text┌──────────────┬────────────────────┬──────────────────┐
│ Filtry       │ Kroužky            │ Rozvrh dítěte    │
│              │                    │                  │
│ Věk          │ Basketbal          │ Po 16:30 Basket. │
│ Den          │ Po 16:30           │ Út 16:00 Fotbal  │
│ Kategorie    │ 100 Kč             │ St —             │
│              │                    │                  │
└──────────────┴────────────────────┴──────────────────┘
Po otevření detailu kroužku se pravý panel může změnit na detail + stav pro aktuální dítě.

9. Sticky / persistentní rozvrh
Při procházení katalogu by měl být stále vidět alespoň zkrácený přehled:
textMatějův rozvrh
Po 16:30 Basketbal
Út 16:00 Fotbal
St —
Aby rodič nemusel neustále přepínat taby.

10. Okamžitá zpětná vazba
Po přidání:
text✓ Přidáno do Matějova rozvrhu
[ Zobrazit rozvrh ]
Snackbar 2–3 sekundy.
Žádné generické „Uloženo“.

11. Vlastní událost
Na mobilu přes FAB (+) v Rozvrhu:
textPřidat
• Kroužek
• Škola
• Lékař
• Trénink
• Jiné
Škola (Po–Pá 8:00–13:00) by měla být první věc, kterou rodič často přidá.

12. Prioritizovaný backlog (pouze mobil + tablet)
P0 – musí být v další verzi

Samostatný mobilní layout (ne zmenšený desktop)
Bottom navigation
Dítě jako centrální kontext
Přehled = schedule-first + doporučení
Dramaticky zjednodušené karty + Bottom Sheet detail
Silný systém kolizí (🟢🟠🔴)
„Najít volné místo“
Tablet split-view (3 sloupce)
Sticky přehled rozvrhu při výběru
Undo místo confirmation dialogů

P1

Čas na přesun (travel time)
Lepší empty states
FAB pro vlastní událost
Accessibility (44–48 px, kontrast, ne jen barva)
Agenda jako výchozí pohled rozvrhu na mobilu


13. Co z aktuální v3 zachovat

Bottom navigation už existuje → posílit
Badge „Vhodné pro věk / Bez kolize“ → rozšířit
Autosave → nechat, jen lepší copy („✓ Uloženo“)
Doporučení sekce → udělat z ní hlavní obsah Domů


Závěr
Tato doporučení jsou správná a jdou ještě dál než předchozí specifikace.
Největší posun, který teď aplikace potřebuje, je:
Od „mobilního katalogu“ → k „osobnímu týdennímu asistentovi dítěte“.