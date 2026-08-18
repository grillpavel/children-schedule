State-of-the-Art UX Review a Vývojová Specifikace (v4.0)
Aplikace na adrese children-schedule-web.vercel.app se po posledních úpravách posouvá správným směrem. Aby však dosáhla špičkové úrovně použitelnosti (world-class UX) na mobilních zařízeních a tabletech, je nutné dotáhnout interakční detaily, eliminovat zbývající třecí plochy (friction points) a plně adaptovat rozhraní pro dotykové ovládání.  
PDF

1. Kritický audit použitelnosti (UX & Touch Audit)
1.1 Mobilní telefony (<768 px)
Informační hlučnost na kartách kroužků:
Problém: Karty v katalogu stále zobrazují příliš mnoho sekundárních metadat najednou (kategorie, věková rozmezí, lokace, organizátor, počet lekcí).  
PDF
Dopad: Uživatel na 6" displeji vidí maximálně 1,5 až 2 kroužky bez nutnosti skrolovat.
Řešení: Zavedení 3-řádkového mobilního micro-card vzoru. Primární karta zobrazuje pouze: Název + ikonu věku, Čas/Den + Cenu a Akční tlačítko +. Vše ostatní se odsouvá do Bottom Sheetu.
Drag-and-Drop vs. Touch Gestures:
Problém: Snaha přetahovat kroužky do rozvrhu prstem na mobilním displeji způsobuje konflikt se vertikálním skrolováním stránky (Scroll Hijacking).
Dopad: Přesouvání prvků je nepřesné a frustrující.
Řešení: Striktní Tap-to-Assign model. Po klepnutí na tlačítko Přidat v katalogu se zobrazí pohled rozvrhu s vizuálně zvýrazněnými volnými časovými okny. Uživatel klepnutím na zelené okno akci dokončí.
Safe Area Insets a výška viewportu na iOS Safari:
Problém: Dynamické skrývání a zobrazování adresního řádku Safari mění hodnotu 100vh, což způsobuje odskakování spodní navigace a zakrývání spodních akčních tlačítek.
Řešení: Použití moderní CSS jednotky 100dvh (Dynamic Viewport Height) v kombinaci s pb-[env(safe-area-inset-bottom)].
1.2 Tablety (768 px≤viewport<1024 px)
Absence Master-Detail využité plochy:
Problém: Tablet v režimu na výšku i na šířku často přebírá rozložení z mobilu (jednosloupcový výpis) nebo roztažený desktopový layout s přebytečným hluchým místem.
Dopad: Rodič přichází o možnost vidět katalog a týdenní kalendář dítěte současně na jedné obrazovce.
Řešení: Sticky Split-View. Levý panel (40% šířky) slouží k prohledávání a filtraci katalogu, pravý panel (60% šířky) zobrazuje fixní, živý rozvrh aktivního dítěte.
2. Architektura Logického Enginu Kolizí & Přesunů
Aplikace musí vyhodnocovat dva odlišné typy konfliktů v reálném čase: fyzický překryv časů a logistickou neproveditelnost přesunu.

[Nová aktivita: B] ───► Evaluace vs. [Existující aktivity: A_i]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Časový překryv?                   Rozdílná lokalita?
   (S_B < E_A) ∧ (E_B > S_A)         (L_A ≠ L_B)
            │                                 │
     ANO ───┼─── NE                    ANO ───┼─── NE
            │                                 │
            ▼                                 ▼
    🔴 PŘÍMÁ KOLIZE                  Přesun < T_buffer?
   (Červený varovný stav)            (0 ≤ S_B - E_A < T_buffer)
                                              │
                                       ANO ───┴─── NE
                                        │           │
                                        ▼           ▼
                                🟠 LOGISTICKÁ    🟢 BEZ
                                    VAROVÁNÍ     KONFLIKTU
Formální specifikace podmínek
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
UI Reakce: Akční tlačítko změní barvu na červenou s textem Kolize s [Název A]. Tlačítko zůstává aktivní pro možnost vědomého ignorování kolize rodičem.
Logistická kolize / Nedostatek času na přejezd (Orange Alert / 🟠):
0≤(S 
B
​	
 −E 
A
​	
 )<T 
buffer
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
 
kde T 
buffer
​	
  je uživatelsky nastavený minimální čas na přejezd (např. 15 minut).
UI Reakce: Zobrazení varování ⚠️ Nestíháte přejezd ([Lokalita A] → [Lokalita B]).
Plná kompatibilita (Green Light / 🟢):
(S 
B
​	
 −E 
A
​	
 )≥T 
buffer
​	
 ∨L 
A
​	
 =L 
B
​	
 
UI Reakce: Zobrazení štítku 🟢 Bez konfliktu.
3. Technická specifikace komponent (Developer Spec v4.1)
3.1 Zjednodušená mobilní karta (<MobileActivityCard/>)
TypeScript
interface MobileActivityCardProps {
  activity: Activity;
  conflictStatus: 'none' | 'warning' | 'direct';
  onTapDetail: (id: string) => void;
  onQuickAdd: (id: string) => void;
}

export const MobileActivityCard: React.FC<MobileActivityCardProps> = ({
  activity,
  conflictStatus,
  onTapDetail,
  onQuickAdd,
}) => {
  const statusStyles = {
    none: 'border-l-4 border-emerald-500 bg-white',
    warning: 'border-l-4 border-amber-500 bg-amber-50/30',
    direct: 'border-l-4 border-red-500 bg-red-50/30',
  };

  return (
    <div 
      onClick={() => onTapDetail(activity.id)}
      className={`p-3 mb-2 rounded-r-xl shadow-sm border border-gray-100 flex items-center justify-between min-h-[64px] ${statusStyles[conflictStatus]}`}
    >
      <div className="flex-1 pr-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">{activity.title}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
            {activity.ageRange}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
          <span>{activity.dayShort} {activity.startTime}–{activity.endTime}</span>
          <span>•</span>
          <span className="font-medium text-gray-700">{activity.price} Kč/měs</span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickAdd(activity.id);
        }}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-blue-600 active:bg-blue-700 text-white rounded-lg shadow-sm font-bold text-lg"
        aria-label="Přidat do rozvrhu"
      >
        +
      </button>
    </div>
  );
};
3.2 Destruktivní mutace a Non-Blocking Undo (<UndoToast/>)
Při odstranění aktivity z rozvrhu se nepoužívá blokovací potvrdzovací dialog (confirm()). Změna se provede okamžitě v lokálním stavu a zobrazí se neblokující Toast s možností zpětného kroku.

TypeScript
interface UndoToastProps {
  message: string;
  isVisible: boolean;
  onUndo: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ message, isVisible, onUndo }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between animate-slide-up">
      <span className="text-xs font-medium">{message}</span>
      <button
        onClick={onUndo}
        className="ml-4 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-bold rounded-md transition-colors min-h-[36px]"
      >
        ZPĚT
      </button>
    </div>
  );
};
3.3 Tablet Master-Detail Container (<TabletMasterDetailLayout/>)
TypeScript
export const TabletMasterDetailLayout: React.FC = ({ children }) => {
  return (
    <div className="hidden md:grid md:grid-cols-12 gap-6 h-[calc(100dvh-4rem)] p-6 bg-gray-50">
      {/* Levý panel: Katalog a Filtry (40% šířky) */}
      <section className="col-span-5 lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          {/* Vyhledávání a Filtrační Pilly */}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* Seznam karet kroužků */}
        </div>
      </section>

      {/* Pravý panel: Živý rozvrh aktivního dítěte (60% šířky) */}
      <section className="col-span-7 lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden sticky top-0">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          {/* Hlavička rozvrhu dítěte a přepínač dětí */}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {/* Týdenní mřížka nebo Agenda */}
        </div>
      </section>
    </div>
  );
};
4. Akceptační kritéria (Acceptance Criteria)
AC-1 (Undo Protocol): Při smazání kroužku z rozvrhu je prvek okamžitě odebrán z mřížky. Zobrazí se toast notifikace na 4 sekundy. Kliknutí na tlačítko "ZPĚT" obnoví původní stav bez straty dat.
AC-2 (Logistické varování): Pokud má dítě v rozvrhu kroužek A (16:00–17:00, Místo X) a uživatel přidává kroužek B (17:05–18:05, Místo Y), aplikace zobrazí varování 🟠 s upozorněním na těsný přesun.
AC-3 (Mobile Viewport Isolation): Na mobilním zařízení se spodní navigace nekryje se systémovým ovládáním iOS/Androidu a výška kontejneru striktně respektuje 100dvh.
AC-4 (Tablet Layout Split): Na zařízeních se šířkou displeje ≥768 px je pravý panel s rozvrhem trvale viditelný během skrolování levým panelem katalogu.