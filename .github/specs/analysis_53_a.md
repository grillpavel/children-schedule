Technical Specification: Mobile & Tablet UX Optimization (v2.1)
Feature Target: Mobile Navigation & Modal Overlay Lifecycle Fixes

Application Target: children-schedule-web.vercel.app

Stack: React, Next.js, Tailwind CSS, TypeScript

1. Overview & Root Cause Analysis
Aplikace ve verzi v2 trpí na mobilních zařízeních (zejména iOS Safari) dvěma kritickými chybami v oblasti UX a DOM event managementu:
iOS Safe Area Inset Overlap: Spodní navigační lišta používá absolutní/fixní pozici bez resekce systémových výřezů (Safe Area Insets), což způsobuje překrytí prvku interním panelem prohlížeče Safari.
Persistent Drawer Locking State: Komponenta detailu kroužku (<ActivityDetailDrawer/>) neodpojuje po provedení akce onAdd svůj vizuální strom ani pointer-events overlay, což trvale blokuje spodní navigaci a znemožňuje další interakci uživatele.  
PDF
2. Component Specification
2.1 <BottomNavContainer/>
Kontejner spodní navigace určený výhradně pro viewporty < 768px.
CSS Architecture:
Base: fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg md:hidden
Dynamic Inset Padding: pb-[env(safe-area-inset-bottom,0px)]
Layout Layout Container Requirement (<main />):
Aby nedocházelo ke skrývání obsahu pod navigační lištou, hlavní obal obsahu (<main>) musí dynamicky kompenzovat výšku navigace včetně systémové bezpečné zóny:
Class: pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0
2.2 <ActivityDetailDrawer/>
Spodní vysouvací panel (Bottom Sheet) zobrazující podrobnosti kroužku s podporou gest a detekce kolizí.
Interface Contract:
TypeScript
interface ActivityDetailDrawerProps {
  activityId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAddActivity: (activityId: string) => void;
}
State Lifecycle & Event Contracts:
isOpen === false → Komponenta MUST vracet null (zamezení zanechání pointer-events: auto vrstvy v DOMu).
onAddActivity(id) → Handler MUST synchronně vyvolat callback onClose().
Backdrop Click → Vyvolá onClose().
Escape Key / Swipe Down → Vyvolá onClose().
Z-Index Layer Architecture:
z-0: Všechny vrstvy v <main> (Katalog, Rozvrh)
z-40: Spodní navigace (<BottomNavContainer/>)
z-50: Backdrop overlay (<DrawerBackdrop/>)
z-50: Panel detailu kroužku (<DrawerContent/>)
3. Reference Implementation (TSX)
TypeScript
import React, { useEffect } from 'react';

export const ActivityDetailDrawer: React.FC<ActivityDetailDrawerProps> = ({
  activityId,
  isOpen,
  onClose,
  onAddActivity,
}) => {
  // ESC key listener pro usnadnění přístupnosti
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent DOM rendering when closed (Prevents pointer-events locking)
  if (!isOpen || !activityId) return null;

  const handleAdd = () => {
    onAddActivity(activityId);
    onClose(); // SYNCHRONNÍ UZAVŘENÍ DRAWERU
  };

  return (
    <div class="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        class="fixed inset-0 bg-black/50 transition-opacity animate-fade-in"
        onClick={onClose}
        data-testid="drawer-backdrop"
      />

      {/* Sheet Content Container */}
      <div class="relative z-50 w-full max-h-[85vh] bg-white rounded-t-2xl p-4 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-xl animate-slide-up">
        
        {/* Visual Drag Indicator */}
        <div 
          class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-pointer"
          onClick={onClose} 
        />
        
        {/* Dismiss Button */}
        <button 
          onClick={onClose}
          class="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-800 rounded-full"
          aria-label="Zavřít"
        >
          ✕
        </button>

        {/* Action Panel */}
        <div class="mt-6">
          <button
            onClick={handleAdd}
            class="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl flex items-center justify-center transition-colors shadow-sm"
          >
            Přidat do rozvrhu
          </button>
        </div>
      </div>
    </div>
  );
};
4. Acceptance Criteria & Test Cases
AC-1: iOS Safe Area Compliance
Given uživatel přistupuje k aplikaci na zařízení iOS v prohlížeči Safari,
When je zobrazena spodní navigační lišta,
Then spodní okraj lišty respektuje env(safe-area-inset-bottom) a nepřekrývá se s navigačním panelem Safari.
AC-2: Drawer Lifecycle on Add
Given uživatel má otevřený detail kroužku v <ActivityDetailDrawer/>,
When klikne na tlačítko „Přidat do rozvrhu“,
Then vybraný kroužek se přidá do stavu rozvrhu,
And drawer se okamžitě uzavře a unmountne z DOMu,
And spodní navigační lišta je okamžitě plně interaktivní bez blokace touch eventů.
AC-3: Backdrop Dismissal
Given uživatel má otevřený detail kroužku,
When klepne na ztmavlé pozadí (backdrop) mimo kartu detailu,
Then drawer se okamžitě uzavře a obnoví se standardní stav viewports.