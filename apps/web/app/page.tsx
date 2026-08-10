'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { Toolbar } from '@/components/Toolbar';
import { VariantTabs } from '@/components/VariantTabs';
import { CatalogPanel } from '@/components/CatalogPanel';
import { ScheduleGrid } from '@/components/ScheduleGrid';
import { DetailsPanel } from '@/components/DetailsPanel';
import { CustomEntryDialog } from '@/components/CustomEntryDialog';

type MobileTab = 'catalog' | 'grid' | 'details';

export default function Page() {
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const hasContent = usePlannerStore((s) => {
    const schedule = activeSchedule(s.state);
    return schedule.enrollments.length > 0 || schedule.customEntries.length > 0;
  });

  const [customOpen, setCustomOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('grid');
  const gridRef = useRef<HTMLDivElement>(null);

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

  // Ochrana proti ztrátě dat — nic se neukládá.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasContent) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasContent]);

  return (
    <div className="flex h-screen flex-col">
      <Toolbar gridRef={gridRef} />
      <VariantTabs />

      {/* Desktop: tři sloupce. Mobil: jeden panel podle spodní navigace. */}
      <main className="flex flex-1 overflow-hidden">
        <aside
          className={clsx(
            'w-72 shrink-0 overflow-hidden border-r border-slate-200 bg-white md:block',
            mobileTab === 'catalog' ? 'block w-full md:w-72' : 'hidden',
          )}
        >
          <CatalogPanel onOpenCustom={() => setCustomOpen(true)} />
        </aside>

        <section
          className={clsx(
            'flex-1 overflow-hidden p-3 md:block',
            mobileTab === 'grid' ? 'block' : 'hidden md:block',
          )}
        >
          <ScheduleGrid gridRef={gridRef} />
        </section>

        <aside
          className={clsx(
            'w-80 shrink-0 overflow-hidden border-l border-slate-200 bg-white md:block',
            mobileTab === 'details' ? 'block w-full md:w-80' : 'hidden',
          )}
        >
          <DetailsPanel />
        </aside>
      </main>

      {/* Pruh o dočasnosti dat */}
      <div className="no-print flex items-center justify-center border-t border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
        Rozvrh existuje jen v tomto okně. Uložte si ho přes Export → Rozvrh jako
        soubor.
      </div>

      {/* Mobilní spodní navigace */}
      <nav className="no-print flex border-t border-slate-200 bg-white md:hidden">
        {(
          [
            ['catalog', '📋 Katalog'],
            ['grid', '📅 Rozvrh'],
            ['details', 'ℹ️ Info'],
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

      {customOpen && <CustomEntryDialog onClose={() => setCustomOpen(false)} />}
    </div>
  );
}
