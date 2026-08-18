Specifikace vývoje – Mobile & Tablet Usability Fix
Children Schedule Planner v2
Verze specifikace: 1.0
Datum: 18. 8. 2026
Priorita: P0 (Kritická – mobilní verze je v současné podobě nepoužitelná)

1. Cíl
Opravit dvě kritické chyby, které činí mobilní (a částečně tabletovou) verzi aplikace nepoužitelnou, a uvést mobilní/tabletové chování do souladu se state-of-the-art standardy roku 2026.
Hlavní cíle:

Spodní navigace musí být vždy plně viditelná a trefitelná na iOS Safari.
Detailní panel (bottom sheet) se musí po úspěšném přidání kroužku spolehlivě uzavřít a nesmí blokovat zbytek aplikace.
Celková mobilní a tabletová použitelnost musí splňovat WCAG 2.2 AA a moderní iOS/Android konvence.

2. Scope
In scope

Oprava safe-area pro bottom navigation
Oprava životního cyklu detailního panelu / bottom sheetu
Touch targety
Default pohled Rozvrhu na mobilu
Základní tabletové chování (768–1024 px)
Meta viewport a základní CSS environment variables

Out of scope (pro tuto specifikaci)

Redesign katalogu nebo matching engine
Cloud sharing
Travel time / family conflict
Desktop-specific změny


3. Kritické požadavky (P0)
3.1 Safe Area – Bottom Navigation (iOS Safari)
Problém
Spodní navigace (Domů / Katalog / Rozvrh / Děti) je na iOS Safari částečně nebo úplně překrytá systémovou spodní lištou a home indikátorem.
Požadavek

Bottom navigation musí respektovat safe-area-inset-bottom.
Navigace musí být vždy plně viditelná a interaktivní, ať je Safari address bar viditelný nebo schovaný.
Výška a padding musí správně reagovat na dynamickou změnu viewportu.

Technická specifikace
HTML<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
CSS.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  /* ... */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  height: calc(56px + env(safe-area-inset-bottom, 0px)); /* 56px = výška obsahu navigace */
  box-sizing: border-box;
  background: /* neprůhledné nebo s backdrop-filter */;
}
Acceptance Criteria

Na iPhone SE, iPhone 13/14/15/16 (včetně Pro modelů) je celá navigace viditelná a trefitelná.
Při scrollování (schování/zobrazení Safari lišty) nedochází k překrytí.
Testováno v reálném Safari (ne pouze Chrome DevTools).


3.2 Detail Panel / Bottom Sheet – povinné uzavření
Problém
Po kliknutí na kroužek se otevře informační panel. I po úspěšném přidání kroužku do rozvrhu panel zůstane otevřený a blokuje celou aplikaci včetně spodní navigace.
Požadavek

Po úspěšném přidání kroužku se panel musí automaticky uzavřít.
Panel musí jít uzavřít swipe-down gestem, kliknutím na backdrop a klávesou Escape.
Po uzavření musí být spodní navigace a zbytek UI plně interaktivní (žádný residual focus trap / pointer-events / scroll lock).

Technická specifikace
TypeScriptconst handleAddToSchedule = (activityId: string, variantId: string) => {
  addActivityToSchedule(activityId, variantId);
  
  // povinné
  closeDetailSheet();
  
  // doporučené
  showToast("Přidáno do rozvrhu");
};
Chování sheetu

Controlled state (isOpen / onOpenChange)
closeOnBackdropClick = true
closeOnEscape = true
Swipe-down to close (mobil)
Po zavření musí být odstraněn body scroll lock a focus trap

Acceptance Criteria

Po kliknutí na „Přidat do rozvrhu“ se sheet uzavře do 300 ms.
Spodní navigace je ihned po uzavření plně funkční.
Sheet lze uzavřít swipe-down, backdrop klikem i Escape.
Testováno na iOS Safari i Android Chrome.


4. Další mobilní a tabletové požadavky (P1)
4.1 Touch Targets

Všechny interaktivní prvky (tlačítka, karty, navigační položky) musí mít minimální velikost 44 × 44 px (doporučeno 48 × 48 px).

4.2 Default pohled Rozvrhu na mobilu

Na viewportu < 768 px musí být výchozí pohled Agenda.
Time-grid (mřížka) je dostupný pouze jako sekundární přepínač.

4.3 Tablet (768–1024 px)

V tomto rozsahu se má aplikace chovat blíže desktopovému 2-panel layoutu, nebo alespoň nesmí vypadat jako „zvětšený mobil“ s přeplněným headerem.

4.4 Header na mobilu

Header musí být maximálně zjednodušený (jméno dítěte + stav uložení + menu).
Nesmí zabírat zbytečně velkou část viewportu.

5. Non-functional Requirements

Accessibility: WCAG 2.2 AA (zejména focus management, screen reader, non-color status).
Performance: Uzavření sheetu a přepínání tabů musí působit instantně (žádný vnímatelný lag).
Testování: Povinné testování na reálných zařízeních:
iPhone SE (malý display)
iPhone 15/16
iPad (tablet)
Android zařízení střední třídy


6. Implementační priority

PrioritaÚkolOdhadZávislostP0Safe-area bottom navigation0.5–1 den—P0Automatické uzavření detail sheetu po přidání0.5–1 den—P1Touch targets ≥ 44–48 px0.5 dne—P1Default Agenda na mobilu0.5 dne—P1Zjednodušení mobilního headeru0.5 dne—P2Tablet hybrid layout1–2 dnyP0 hotovo

7. Definition of Done

 Bottom navigation je na všech testovaných iOS zařízeních plně viditelná a trefitelná.
 Po přidání kroužku se detail panel vždy uzavře.
 Spodní navigace je po uzavření panelu okamžitě interaktivní.
 Všechny primární touch targety ≥ 44 px.
 Na mobilu je výchozí pohled Rozvrhu = Agenda.
 Projito manuálním testem na reálném iPhone + Android.
 Žádné residual scroll-lock nebo focus-trap po uzavření sheetu.


8. Poznámky pro vývojáře

Preferovat moderní bottom-sheet řešení (vaul, Radix Dialog + custom, nebo nativní <dialog> s polyfillem).
Nikdy nenechávat sheet otevřený po úspěšné primární akci.
env(safe-area-inset-bottom) používat vždy s fallbackem 0px.
Testovat nejen v DevTools, ale primárně na reálném hardwaru.


Tato specifikace je prioritní a musí být implementována před jakýmikoliv dalšími UX vylepšeními mobilní verze.