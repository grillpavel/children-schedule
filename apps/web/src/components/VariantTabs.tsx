'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { usePlannerStore } from '@/store/plannerStore';

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
    <div className="no-print flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 py-1">
      {schedules.map((s) => {
        const active = s.id === activeId;
        return (
          <div
            key={s.id}
            className={clsx(
              'flex items-center gap-1 rounded-t px-2 py-1 text-sm',
              active ? 'bg-white font-medium shadow-sm' : 'text-slate-500',
            )}
          >
            {editingId === s.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                className="w-24 rounded border border-slate-300 px-1 text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => setActive(s.id)}
                onDoubleClick={() => startRename(s.id, s.name)}
                title="Dvojklikem přejmenujete"
              >
                {s.name}
              </button>
            )}
            {schedules.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Smazat rozvrh „${s.name}"?`)) remove(s.id);
                }}
                className="text-slate-400 hover:text-red-600"
                aria-label="Smazat rozvrh"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addSchedule}
        className="px-2 py-1 text-sm text-slate-500 hover:text-slate-800"
        title="Nový rozvrh"
      >
        +
      </button>
      <button
        type="button"
        onClick={duplicate}
        className="ml-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
        title="Kopie aktivního rozvrhu"
      >
        Kopie
      </button>
    </div>
  );
}
