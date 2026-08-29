'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { usePlannerStore } from '@/store/plannerStore';
import { IconPlus, IconCopy, IconClose } from './Icons';

export function VariantTabs() {
  const schedules = usePlannerStore((s) => s.state.schedules);
  const activeId = usePlannerStore((s) => s.state.activeScheduleId);
  const setActive = usePlannerStore((s) => s.setActiveSchedule);
  const addSchedule = usePlannerStore((s) => s.addSchedule);
  const duplicate = usePlannerStore((s) => s.duplicateActiveSchedule);
  const rename = usePlannerStore((s) => s.renameSchedule);
  const remove = usePlannerStore((s) => s.removeSchedule);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setDraft(name);
  };

  const commitRename = () => {
    if (editingId && draft.trim()) rename(editingId, draft.trim());
    setEditingId(null);
  };

  return (
    <div className="no-print flex items-center gap-1.5 overflow-x-auto border-b border-slate-200/80 bg-slate-100/70 px-3 py-1.5">
      {/* Krátká pojmová nápověda (audit after_review_71 §8): „Varianta" je alternativní
          verze rozvrhu TÉHOŽ kalendáře (dítěte) — ne nový kalendář, ten se přidává v liště. */}
      <span
        className="shrink-0 text-[11px] text-slate-600"
        title="Varianta = alternativní verze rozvrhu pro stejný kalendář (dítě). Druhý kalendář se přidává v horní liště tlačítkem „Přidat kalendář“."
      >
        Varianty rozvrhu:
      </span>
      <div className="flex items-center gap-1">
        {schedules.map((s) => {
          const active = s.id === activeId;
          return (
            <div
              key={s.id}
              className={clsx(
                'group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition',
                active
                  ? 'bg-white font-semibold text-slate-900 shadow-xs ring-1 ring-slate-200/70'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
              )}
            >
              {editingId === s.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                  className="w-24 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-xs text-slate-900 outline-none ring-1 ring-blue-400"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setActive(s.id)}
                  onDoubleClick={() => startRename(s.id, s.name)}
                  title="Dvojklikem přejmenujete"
                  className="flex items-center gap-1.5 focus:outline-none"
                >
                  <span
                    className={clsx(
                      'h-2 w-2 rounded-full transition-colors',
                      active ? 'bg-blue-600' : 'bg-slate-300 group-hover:bg-slate-400',
                    )}
                  />
                  <span>{s.name}</span>
                </button>
              )}
              {schedules.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Smazat rozvrh „${s.name}"?`)) remove(s.id);
                  }}
                  className="ml-0.5 rounded p-0.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition"
                  aria-label="Smazat rozvrh"
                  title="Smazat rozvrh"
                >
                  <IconClose className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 pl-1">
        <button
          type="button"
          onClick={addSchedule}
          className="flex h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 text-xs font-medium text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
          title="Nová varianta rozvrhu pro stejný kalendář (ne nový kalendář — ten je v horní liště)"
        >
          <IconPlus className="h-3 w-3" />
          <span>Nový</span>
        </button>
        <button
          type="button"
          onClick={duplicate}
          className="flex h-6 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 text-xs font-medium text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
          title="Kopie aktivního rozvrhu"
        >
          <IconCopy className="h-3 w-3" />
          <span>Kopie</span>
        </button>
      </div>
    </div>
  );
}
