Specifikace UX/UI (v4.2): Design Systém, Ergonomie a Intuitivnost
Tento dokument slouží jako závazná technická a designová specifikace (Spec-Driven Development) pro kompletní přepracování mobilního a tabletového rozhraní aplikace rodinného plánovače.

1. Design System Tokens (Jednotný Vizuální Jazyk)
Všechny komponenty aplikace musí striktně využívat definované systémové tokeny. Jakékoliv ad-hoc stylování mimo tento systém je zakázáno.

1.1 Barevná paleta a sémantika
Token	CSS / Tailwind	Hex	Sémantické použití
Brand Primary	indigo-600	#4F46E5	Hlavní akční prvky, aktivní záložky, tlačítko +
Brand Primary Hover	indigo-700	#4338CA	Stisknutý stav akčních tlačítek
Background Surface	gray-50	#F9FAFB	Globální pozadí aplikace
Card Surface	white	#FFFFFF	Pozadí karet, dialogů a spodních panelů
Text Primary	gray-900	#111827	Nadpisy, názvy kroužků
Text Secondary	gray-500	#6B7280	Metadata (čas, věk, organizátor)
Status Success	emerald-500	#10B981	🟢 Bez kolize / Volný časový slot
Status Warning	amber-500	#F59E0B	🟠 Těsná logistická návaznost (přejezd)
Status Error	rose-500	#F43F5E	🔴 Přímá časová kolize
1.2 Typografická škála
Úroveň	Tailwind Class	Velikost / Řádkování	Použití
Display / Title	text-lg font-bold	18 px/28 px	Hlavní nadpisy sekcí, hlavička
Section Heading	text-base font-semibold	16 px/24 px	Názvy kroužků na kartě, jména dětí
Body Standard	text-sm font-normal	14 px/20 px	Popisky, hodnoty ve filtrech
Caption / Badge	text-xs font-medium	12 px/16 px	Časové údaje, věkové rozmezí, štítky
Micro Tag	text-[10px] font-semibold	10 px/12 px	Kompaktní indikátory stavu kolize
1.3 Tvarosloví a dotykové terče (Touch Targets)
Rádius prvků (Border Radius):
Tlačítka, vstupy, micro-karty: rounded-xl (12 px)
Kontejnery, Bottom Sheets, Modály: rounded-2xl (16 px)
Pill odznaky (Badges): rounded-full (9999 px)
Garantovaný Touch Target:
Každý interaktivní prvek (tlačítko, záložka, ikonka zavření) musí mít minimální velikost 44×44 px.
Pro ikonky menší než 24 px se používá transparentní padding (p-2.5).
2. Ergonomie & Layout podle typu zařízení
2.1 Mobilní telefony (<768 px) — Zóna jednoho palce
Rozhraní podřizuje veškeré klíčové ovládací prvky spodní třetině displeje (Natural Thumb Zone).

┌─────────────────────────────────────────┐
│ [ Header: Profil Dítěte + Stav ]        │ <- Horní okraj (Zobrazovací)
├─────────────────────────────────────────┤
│                                         │
│                                         │
│ [ Skrolovatelný obsah: Katalog / Agenda] │ <- Střední část (Skrolovací)
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ [ Floating Filter Trigger: "Filtry 3" ] │ <- Dolní dosah palce
├─────────────────────────────────────────┤
│ [ Sticky Bottom Navigation Bar ]        │ <- Dno obrazovky (Primární)
└─────────────────────────────────────────┘
Specifikace Spodní Navigace (<BottomNav/>)
Uložení: fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200
Výška a Bezpečná zóna: h-16 pb-[env(safe-area-inset-bottom)]
Viewport Fix: Rodičovský kontejner používá h-[100dvh] zabraňující posunům UI při změně adresního řádku v iOS Safari.
Položky navigace (4 taby):
Přehled (Dnešní program + Volné sloty)
Kroužky (Katalog a hledání)
Rozvrh (Týdenní/Denní kalendář)
Děti (Správa profilů dětí)
Eliminace Drag-and-Drop na mobilu
Na mobilních zařízeních je klasický Drag-and-Drop zcela vypnut.
Je nahrazen dvoufázovým vzorem Tap-to-Assign:
Klepnutí na tlačítko + u karty kroužku.
Aplikace automaticky přepne na pohled Rozvrhu a zvýrazní dostupné zelené sloty (animate-pulse).
Klepnutím na vybraný slot se kroužko zapsán do rozvrhu.
2.2 Tablety (768 px≤viewport<1024 px) — Split Master-Detail
Na tabletech se spodní navigace skryje (md:hidden) a layout se přepne do dvoupanelové architektury.

+-----------------------------------------------------------------------------------+
|  HEADER: [ 👦 Matěj (9 let) ▼ ]                  [ Uloženo ]  [ Export iCal/PDF ] |
+-----------------------------------+-----------------------------------------------+
|  MASTER PANE (40% šířky)          |  DETAIL PANE (60% šířky)                      |
|  Katalog & Filtry                 |  Živý trvalý rozvrh díteťa                    |
|                                   |                                               |
|  - Vyhledávání                    |  - Zobrazení aktuálního týdne                 |
|  - Rychlé kategorialní ikony      |  - Okamžitý náhled při klepnutí na kroužko    |
|  - Micro-karty v seznamu          |  - Přímá vizualizace kolizí                   |
+-----------------------------------+-----------------------------------------------+
3. Conflict & Logistics Engine (Matematika & UI)
Engine v reálném čase vyhodnocuje časový překryv doplňované aktivity B s již existujícími aktivitami A 
i
​	
  v rozvrhu daného dítěte.

3.1 Vyhodnocovací matice
Přímá časová kolize (Red Alert / 🔴):
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
(kde S je čas začátku a E je čas konce aktivity)
UI Stav: Štítek 🔴 Kolize s [Název A].
Interakce: Akční tlačítko nabídne možnost Přesto přidat (neblokovat vědomou volbu rodiče).
Logistická kolize / Nedostatek času na přejezd (Orange Alert / 🟠):
0≤(S 
B
​	
 −E 
A
​	
 )<T 
travel
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
 
(kde L je lokalita a T 
travel
​	
  je uživatelsky nastavený čas na přesun, výchozí 15 min)
UI Stav: Štítek 🟠 Nestíháte přesun ([Lokalita A] → [Lokalita B]).
Kompatibilní slot (Green Light / 🟢):
(S 
B
​	
 −E 
A
​	
 )≥T 
travel
​	
 ∨L 
A
​	
 =L 
B
​	
 
UI Stav: Štítek 🟢 Bez kolize.
4. Intuitivní Mikro-Interakce & Komponenty
4.1 Mobilní Micro-Karta (<MobileActivityCard/>)
Zobrazuje pouze 20% nejkritičtějších dat v maximálně 3 řádcích.Zbylá data jsou schována do Bottom Sheetu.

TypeScript
export const MobileActivityCard: React.FC<MobileActivityCardProps> = ({
  activity,
  conflictStatus,
  conflictText,
  onTapDetail,
  onQuickAdd,
}) => {
  const borderColors = {
    none: 'border-l-emerald-500 bg-white',
    warning: 'border-l-amber-500 bg-amber-50/20',
    direct: 'border-l-rose-500 bg-rose-50/20',
  };

  return (
    <div
      onClick={() => onTapDetail(activity.id)}
      className={`p-3 mb-2.5 rounded-r-xl border border-gray-100 border-l-4 shadow-sm flex items-center justify-between min-h-[64px] active:scale-[0.99] transition-transform ${borderColors[conflictStatus]}`}
    >
      <div className="flex-1 pr-3 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-gray-900 truncate">{activity.title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium shrink-0">
            {activity.ageRange} let
          </span>
        </div>
        
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 truncate">
          <span className="font-medium text-gray-700">{activity.dayShort} {activity.startTime}–{activity.endTime}</span>
          <span>•</span>
          <span>{activity.price} Kč/měs</span>
        </div>

        {conflictStatus !== 'none' && (
          <div className="text-[11px] font-semibold mt-1 flex items-center gap-1 text-gray-700">
            {conflictStatus === 'direct' ? '🔴' : '🟠'} {conflictText}
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickAdd(activity.id);
        }}
        className="w-11 h-11 flex items-center justify-center bg-indigo-600 active:bg-indigo-700 text-white rounded-xl font-bold text-xl shadow-sm shrink-0"
        aria-label="Přidat do rozvrhu"
      >
        +
      </button>
    </div>
  );
};
4.2 Non-Blocking Undo Pattern (<UndoToast/>)
Nahrazuje destruktivní potvrdzovací okna (confirm()). Smazání proběhnou okamžitě a uživateli je nabídnut 4sekundový návratový časovač.

TypeScript
export const UndoToast: React.FC<{
  message: string;
  isVisible: boolean;
  onUndo: () => void;
}> = ({ message, isVisible, onUndo }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5">
      <span className="text-xs font-medium text-gray-200">{message}</span>
      <button
        onClick={onUndo}
        className="ml-4 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-bold rounded-lg transition-colors min-h-[36px]"
      >
        ZPĚT
      </button>
    </div>
  );
};
4.3 Dynamický Filtrační Sheet (<MobileFilterSheet/>)
Filtrační tlačítko v dolním rohu dynamicky přepočítává počet odpovídajících výstupů ještě před aplikací.

TypeScript
<button className="sticky bottom-4 w-full h-12 bg-indigo-600 active:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg flex items-center justify-center">
  Zobrazit {filteredCount} {filteredCount === 1 ? 'kroužek' : filteredCount < 5 ? 'kroužky' : 'kroužků'}
</button>
5. Akceptační Kritéria (Acceptance Criteria)
AC-1: Safe Area & Touch Navigation
Given uživatel přistupuje k aplikaci na mobilním zařízení,
When se načte rozhraní,
Then spodní navigace se ukotví na dně obrazovky s respektováním env(safe-area-inset-bottom) a veškerá akční tlačítka mají minimální touch target 44×44 px.
AC-2: Tap-to-Assign Flow
Given uživatel klepne na tlačítko + u kroužku na mobilu,
When je vyvolána akce přidání,
Then nedochází k zahájení drag-and-drop gesta, ale aplikace přesměruje uživatele do pohledu rozvrhu se zvýrazněním kompatibilních volných slotů.
AC-3: Detekce logistického přesunu
Given dítě má v rozvrhu aktivitu končící v 16:00 v lokalitě A,
When rodič vybírá další aktivitou začínající v 16:10 v lokalitě B (při nastaveném čase na přesun 15 min),
Then karta zobrazí oranžové varování 🟠 Nestíháte přesun.
AC-4: Non-Blocking Delete & Undo
Given uživatel odstraňuje kroužek z rozvrhu,
When klepne na ikonu odebrání,
Then kroužek se okamžitě smaže bez blokovacího modálu a zobrazí se neblokující 4s toast notifikace s tlačítkem ZPĚT.
AC-5: Responsive Tablet Split View
Given uživatel otevře aplikaci na zařízeních s šířkou ≥768 px,
When se aplikace zobrazí,
Then spodní navigace se skryje a obrazovka se rozdělí na 40% panel katalogu vlevo a 60% trvale viditelný rozvrh vpravo.