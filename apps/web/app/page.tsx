'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { serializePlannerState } from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { Toolbar } from '@/components/Toolbar';
import { VariantTabs } from '@/components/VariantTabs';
import { CatalogPanel } from '@/components/CatalogPanel';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { DetailsPanel } from '@/components/DetailsPanel';
import { CustomEntryDialog } from '@/components/CustomEntryDialog';

type MobileTab = 'catalog' | 'grid' | 'details';

export default function Page() {
  const state = usePlannerStore((s) => s.state);
  const historyLength = usePlannerStore((s) => s.history.length);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
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
  const [sheetExpanded, setSheetExpanded] = useState(false);
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

  // Escape zavře vybraný detail / mobilní sheet (C9-A4).
  useEffect(() => {
    if (!hasSelection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      selectActivity(null);
      selectCustomEntry(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSelection, selectActivity, selectCustomEntry]);

  // Ochrana proti ztrátě dat — nic se neukládá.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

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
      <VariantTabs />

      {/* Desktop: tři sloupce. Mobil: jeden panel podle spodní navigace. */}
      <main className="flex flex-1 overflow-hidden">
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
            onAddFirstActivity={() => setMobileTab('catalog')}
          />
        </section>

        <aside
          className={clsx(
            hasScheduleContent ? 'w-80 desk:w-80' : 'w-60 desk:w-60',
            'no-print shrink-0 overflow-hidden border-l border-slate-200 bg-white desk:block',
            mobileTab === 'details' ? 'block w-full' : 'hidden',
          )}
        >
          <DetailsPanel />
        </aside>
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
              'flex-1 py-2 text-xs',
              mobileTab === tab ? 'font-medium text-slate-900' : 'text-slate-500',
            )}
          >
            {label}
          </button>
        ))}
      </nav>

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
