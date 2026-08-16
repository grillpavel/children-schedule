'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { serializePlannerState } from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { loadAutosave, saveAutosave } from '@/lib/autosave';
import { Toolbar } from '@/components/Toolbar';
import { VariantTabs } from '@/components/VariantTabs';
import { CatalogPanel } from '@/components/CatalogPanel';
import { DetailsPanel } from '@/components/DetailsPanel';
import { CustomEntryDialog } from '@/components/CustomEntryDialog';

// Mřížka odvozuje zobrazený týden z aktuálního data. Kdyby ji Next vykreslil na
// serveru, hydratace by narazila na jiný „dnešek" na klientu (CHANGE-34). Proto
// jen na klientu.
const ScheduleGrid = dynamic(
  () => import('@/components/ScheduleGrid').then((m) => m.ScheduleGrid),
  { ssr: false },
);

type MobileTab = 'catalog' | 'grid' | 'details';

export default function Page() {
  const state = usePlannerStore((s) => s.state);
  const catalog = usePlannerStore((s) => s.catalog);
  const historyLength = usePlannerStore((s) => s.history.length);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const hydrate = usePlannerStore((s) => s.hydrate);
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const selectedCustomEntryId = usePlannerStore((s) => s.selectedCustomEntryId);
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const selectCustomEntry = usePlannerStore((s) => s.selectCustomEntry);
  const stateSignature = serializePlannerState(state);
  const hasScheduleContent = usePlannerStore((s) => {
    const schedule = activeSchedule(s.state);
    return schedule.enrollments.length > 0 || schedule.customEntries.length > 0;
  });

  const [customOpen, setCustomOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('grid');
  const [savedSignature, setSavedSignature] = useState(stateSignature);
  const [showChangeToast, setShowChangeToast] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [mediumInfoOpen, setMediumInfoOpen] = useState(false);
  const [glassOff, setGlassOff] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const previousHistoryRef = useRef(historyLength);
  const isDirty = stateSignature !== savedSignature;
  const hasSelection = selectedActivityId !== null || selectedCustomEntryId !== null;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 899.98px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Třísloupcový layout platí až od 1440 px (C9-L1). Mezi 900–1440 je Info slide-over.
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1440px)');
    const sync = () => setIsWide(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Manuální přepínač skla je primární cesta vypnutí (C9-B3); ukládá se do relace.
  useEffect(() => {
    const stored = window.sessionStorage.getItem('glassOff') === '1';
    setGlassOff(stored);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.glass = glassOff ? 'off' : '';
    window.sessionStorage.setItem('glassOff', glassOff ? '1' : '0');
  }, [glassOff]);

  // Klávesové zkratky undo/redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // Escape zavře vybraný detail / mobilní sheet / Souhrn drawer (C9-A4).
  useEffect(() => {
    if (!hasSelection && !mediumInfoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      selectActivity(null);
      selectCustomEntry(null);
      setMediumInfoOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSelection, mediumInfoOpen, selectActivity, selectCustomEntry]);

  // Autosave (BL-030): obnova po připojení + uložení při každé změně stavu.
  // Subscribe místo efektu nad `state`, aby výchozí mount-render nepřepsal obnovu.
  useEffect(() => {
    const restored = loadAutosave();
    if (restored) {
      hydrate(restored);
      setSavedSignature(serializePlannerState(restored));
    }
    const unsubscribe = usePlannerStore.subscribe((s) => saveAutosave(s.state));
    return unsubscribe;
  }, [hydrate]);

  const markSaved = (signature?: string) => {
    setSavedSignature(signature ?? stateSignature);
  };

  useEffect(() => {
    if (historyLength <= previousHistoryRef.current) {
      previousHistoryRef.current = historyLength;
      return;
    }
    previousHistoryRef.current = historyLength;
    setShowChangeToast(true);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setShowChangeToast(false);
      toastTimerRef.current = null;
    }, 2400);
  }, [historyLength]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Toolbar gridRef={gridRef} isDirty={isDirty} onMarkSaved={markSaved} />
      {/* Varianty rozvrhu jsou pokročilá funkce — na mobilu skryté (C11 UX). */}
      <div className="hidden desk:block">
        <VariantTabs />
      </div>

      {/* Desktop: tři sloupce. Mobil: jeden panel podle spodní navigace. */}
      <main className="relative flex flex-1 overflow-hidden">
        <aside
          className={clsx(
            'no-print w-72 shrink-0 overflow-hidden border-r border-slate-200 bg-white desk:block',
            mobileTab === 'catalog' ? 'block w-full desk:w-72' : 'hidden',
          )}
        >
          <CatalogPanel onOpenCustom={() => setCustomOpen(true)} />
        </aside>

        <section
          className={clsx(
            'flex-1 overflow-hidden p-3 desk:block',
            mobileTab === 'grid' ? 'block' : 'hidden desk:block',
          )}
        >
          <ScheduleGrid
            gridRef={gridRef}
            onAddFirstActivity={() => {
              setMobileTab('catalog');
              const first = catalog.activities[0];
              if (first) selectActivity(first.id);
              requestAnimationFrame(() => {
                document
                  .querySelector<HTMLInputElement>('[data-catalog-search]')
                  ?.focus();
              });
            }}
          />
        </section>

        {/* Info je stálý sloupec jen na širokém desktopu (≥1440, C9-L1);
            na mobilu je to záložka a mezi 900–1440 slide-over níže. */}
        <aside
          className={clsx(
            'no-print overflow-hidden border-l border-slate-200 bg-white',
            isWide
              ? clsx('block shrink-0', hasScheduleContent ? 'w-80' : 'w-60')
              : isMobile
                ? mobileTab === 'details'
                  ? 'block w-full'
                  : 'hidden'
                : 'hidden',
          )}
        >
          {/* Mount jen v aktivním slotu, ať je DetailsPanel v DOM právě jednou (C12). */}
          {(isWide || (isMobile && mobileTab === 'details')) && <DetailsPanel />}
        </aside>

        {/* Info slide-over pro střední šířky 900–1440 (C9-L1): overlay uvnitř
            <main>, aby nezakrýval nástrojovou lištu; otevře výběr nebo „Souhrn". */}
        {!isMobile && !isWide && (hasSelection || mediumInfoOpen) && (
          <div
            data-testid="info-drawer"
            className="no-print absolute inset-y-0 right-0 z-40 flex w-96 max-w-[90vw] flex-col border-l border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex shrink-0 justify-end border-b border-slate-200 p-1">
              <button
                type="button"
                onClick={() => {
                  selectActivity(null);
                  selectCustomEntry(null);
                  setMediumInfoOpen(false);
                }}
                className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                aria-label="Zavřít detail"
              >
                Zavřít
              </button>
            </div>
            <aside className="flex-1 overflow-y-auto" aria-label="Detail kroužku">
              <DetailsPanel />
            </aside>
          </div>
        )}
      </main>

      {/* Mobilní spodní navigace */}
      <nav className="no-print flex border-t border-slate-200 bg-white desk:hidden">
        {(
          [
            ['catalog', 'Katalog'],
            ['grid', 'Rozvrh'],
            ['details', 'Info'],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={clsx(
              'flex flex-1 items-center justify-center h-11 text-xs',
              mobileTab === tab ? 'font-medium text-slate-900' : 'text-slate-500',
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Info slide-over pro střední šířky 900–1440 (C9-L1): Info není stálý
          sloupec, otevře se přes obsah při výběru nebo tlačítkem „Souhrn". */}
      {!isMobile && !isWide && !(hasSelection || mediumInfoOpen) && (
        <button
          type="button"
          onClick={() => setMediumInfoOpen(true)}
          className="no-print fixed right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-md bg-slate-800 px-2 py-4 text-xs font-medium text-white shadow-lg hover:bg-slate-700"
        >
          Souhrn
        </button>
      )}

      {/* Mobilní spodní sheet detailu (C8-F7): při výběru nad mřížkou. */}
      {isMobile && hasSelection && mobileTab !== 'details' && (
        <div className="no-print fixed inset-x-0 bottom-12 z-40 desk:hidden">
          <div
            className={clsx(
              'glass flex flex-col rounded-t-2xl border border-slate-200 shadow-2xl transition-[height] motion-safe:duration-200',
              sheetExpanded ? 'h-[70vh]' : 'h-56',
            )}
          >
            <div className="flex items-center justify-between px-3">
              <span className="w-10" />
              <button
                type="button"
                onClick={() => setSheetExpanded((v) => !v)}
                className="flex flex-1 items-center justify-center py-2"
                aria-label={sheetExpanded ? 'Zmenšit detail' : 'Zvětšit detail'}
              >
                <span className="h-1 w-10 rounded-full bg-slate-300" />
              </button>
              <button
                type="button"
                onClick={() => setGlassOff((v) => !v)}
                className="w-10 text-[11px] text-slate-500"
                aria-pressed={glassOff}
              >
                {glassOff ? 'Sklo' : 'Bez skla'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              <DetailsPanel />
            </div>
          </div>
        </div>
      )}

      {showChangeToast && (
        <div className="no-print pointer-events-none fixed bottom-16 left-1/2 z-50 -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg motion-safe:animate-[toastIn_180ms_ease-out]">
            <span>Změna uložena do varianty</span>
            <button
              type="button"
              onClick={() => {
                undo();
                setShowChangeToast(false);
              }}
              className="rounded bg-white/15 px-2 py-0.5 text-xs hover:bg-white/25"
            >
              Zpět
            </button>
          </div>
        </div>
      )}

      {customOpen && <CustomEntryDialog onClose={() => setCustomOpen(false)} />}
    </div>
  );
}
