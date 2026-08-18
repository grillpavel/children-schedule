Předložená UX zpětná vazba je špičkový produktový rozbor, který přesně pojmenovává zásadní architektonický posun: změnu z pasivní databáze kroužků na inteligentní rodičovský plánovač.

Níže je návrh přepracování těchto doporučení do technické a produktové specifikace (Spec-Driven Doc), podle které lze přímo zadávat vývojové úlohy.

1. Změna mentálního modelu aplikace
Oblast	Současný stav (Katalog)	Cílový stav v4 (Osobní plánovač)
Hlavní entita	Kroužek / Aktivita	Dítě a jeho týdenní časový budžet
Primární view	Filtr databáze → Seznam kroužků	Dnes / Týdenní přehled dítěte → Doporučení
Práce s kolizemi	Uživatelská kontrola textu	Automatický Conflict Engine + Varování logistiky
Interakce	Modal confirmations („Opravdu smazat?“)	Non-blocking mutace s možností Undo
2. Logistický a kolizní engine (Conflict & Travel Matrix)
Aplikace musí oddělit časovou kolizi (fyzický překryv) a logistickou kolizi (nedostatek času na přejezd).

2.1 Vyhodnocovací logika matice
Pro dvě aktivity A a B ve stejném dni (S = začátek, E = konec, L = lokalita, T 
trans
​	
  = nastavený čas na přesun):
Přímá kolize (Red / 🔴):
(S 
B
​	
 <E 
A
​	
 )∧(E 
B
​	
 >S 
A
​	
 )
UI Reakce: Štítek 🔴 Kolize s [Název aktivity]. Tlačítko akce zčervená, ale neblokuje možnost „Přesto přidat“.
Logistická kolize / Těsná návaznost (Orange / 🟠):
0≤(S 
B
​	
 −E 
A
​	
 )<T 
trans
​	
 p 
r
ˇ
 iL 
A
​	
 

=L 
B
​	
 
UI Reakce: Štítek ⚠️ Nestíháte přesun ([Lokalita A] → [Lokalita B]).
Bez kolize (Green / 🟢):
(S 
B
​	
 −E 
A
​	
 )≥T 
trans
​	
 ∨L 
A
​	
 =L 
B
​	
 
UI Reakce: Štítek 🟢 Bez kolize.
3. UI/UX Specifikace pro Mobilní telefony (<768 px)
3.1 Zjednodušená mobilní karta kroužku (<MobileActivityCard/>)
Mobilní karta zobrazuje pouze 20% nejkritičtějších informací. Zbylých 80% je dostupné až po klepnutí na kartu.

┌─────────────────────────────────────────────────────────┐
│ 🏀 Basketbal — přípravka                    [🟢 Volno]  │
│ 8–11 let · DDM Rakovník                                 │
│ Po 16:30–17:30 · 100 Kč/měs                     [ + ]   │
└─────────────────────────────────────────────────────────┘
Touch target tlačítka +: Minimálně 44×44 px.
Klepnutí na tělo karty: Otevře Bottom Sheet s detaily.
3.2 Modalita detailu (<ActivityDetailBottomSheet/>)
Gestu přizpůsobené zavírání: Swipe-down nebo klepnutí na backdrop.
Obsah: Kompletní adresní lokalita, lektor, věková vhodnost pro aktivní dítě, tlačítko Přidat do rozvrhu [Jméno Dítěte].
3.3 Filtrační systém (<MobileFilterSheet/>)
Nahrazení generického tlačítka „Použít“ dynamickým akčním tlačítkem:
HTML
<button class="sticky bottom-4 w-full h-12 bg-blue-600 text-white font-bold rounded-xl shadow-lg">
  Zobrazit 14 kroužků
</button>
Skrytí neaktivních dnů (víkendy) pod přepínač + víkend.
4. UI/UX Specifikace pro Tablet (768 px≤viewport<1024 px)
Tablet nepoužívá spodní navigaci. Rozhraní se přepíná do třísloupcového nebo dvou-panelového Master-Detail layoutu.

+-----------------------------------------------------------------------------------+
|  Header: [ 👦 Matěj (9) ▼ ]              [ Status: Uloženo ]  [ Export iCal / PDF ]|
+----------------───────+───────────────────────────────────+───────────────────────+
| LEFT: Filtry (25%)    | CENTER: Výsledky & Detail (40%)   | RIGHT: Sticky Rozvrh  |
|                       |                                   | (35%)                 |
| - Věk (8-11)          | Basketbal — přípravka             | Pondělí               |
| - Dny [Po][St]        | Po 16:30 · 100 Kč                 |  15:30 Škola          |
| - Kategorie           | 📍 DDM Rakovník                   |  16:30 [ Basketbal ]  |
|   ├ 🏃 Sport          | --------------------------------- | Úterý                 |
|   └ 🎨 Umění          | Karate                            |  16:00 Fotbal (🔴)    |
| - Čas na přesun: 15m  | Po 17:30 · 108 Kč                 |                       |
+----------------───────+───────────────────────────────────+───────────────────────+
5. Destruktivní akce a destruktivní vzory (Undo vs. Confirm)
Aplikace nahrazuje neefektivní potvrzovací dialogy („Opravdu chcete smazat kroužek?“) okamžitou mutací stavu s možností vracení (Undo).

5.1 Toast Notification Protocol (<UndoToast/>)
Trigger: Odstranění aktivity z rozvrhu dítěte.
Chování:
Aktivita je okamžitě odebrána ze stavu UI a mřížky rozvrhu.
Zobrazí se neblokující Snackbar v dolní části obrazovky (nad Bottom Nav) s časovačem 4 sekundy.
UI:
HTML
<div class="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 bg-gray-900 text-white px-4 py-3 rounded-xl flex items-center justify-between shadow-2xl z-50 animate-slide-up">
  <span class="text-sm">Basketbal byl odebrán z rozvrhu.</span>
  <button class="text-amber-400 font-bold text-sm hover:underline ml-4 min-h-[44px] px-2">
    ZPĚT (UNDO)
  </button>
</div>
6. Prioritizovaný plán implementace (Roadmap pro Vývoj)
Fáze P0 (Kritická infrastruktura & Core UX)
Child-Centric State: Přepnutí globálního stavu aplikace tak, aby aktivní dítě (activeChildId) tvořilo obal nad rozvrhem i filtry.
Mobile Bottom Nav: Implementace 4 hlavních záložek (Přehled / Kroužky / Rozvrh / Děti).
Redukce karty & Bottom Sheet: Ořezání karet na mobilu na 3 řádky + detail do Bottom Sheetu.
Zjednodušený Conflict Engine: Vizuální odlišení 🟢 Bez kolize a 🔴 Kolize.
Undo Toast: Nahrazení potvrzovacích modálů při mazání 4s Undo toastem.
Fáze P1 (Pokročilá logistika & Tablet UI)
Travel Time Matrix: Přidání filtru/nastavení „Minimální čas na přesun“ a detekce logistických varování (🟠).
Tablet Split-View: 3-sloupcové rozvržení pro rozlišení nad 768 px.
Smart Search Fullscreen: Celobraovkové mobilní vyhledávání s našeptávačem lokality, lektorů a kategorií.
Smart Recommendations: Režim „Najít volné místo“, který po výběru okamžitě vyfiltruje a seřadí kroužky podle volného času v týdnu dítěte.