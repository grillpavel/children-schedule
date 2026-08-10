'use client';

import { useRef, useState } from 'react';
import {
  colorForActivity,
  parseIcs,
  parsePlannerState,
  type CustomEntry,
  type IcsColorMode,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import {
  downloadIcs,
  downloadPng,
  downloadStateJson,
  printSchedule,
} from '@/lib/exportClient';
import { newId } from '@/lib/ids';
import { ColorSwatches } from './ColorSwatches';

export function Toolbar({ gridRef }: { gridRef: React.RefObject<HTMLDivElement> }) {
  const state = usePlannerStore((s) => s.state);
  const catalog = usePlannerStore((s) => s.catalog);
  const exceptions = usePlannerStore((s) => s.exceptions);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const setChildAge = usePlannerStore((s) => s.setChildAge);
  const loadState = usePlannerStore((s) => s.loadState);
  const addCustomEntries = usePlannerStore((s) => s.addCustomEntries);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const canUndo = usePlannerStore((s) => s.history.length > 0);
  const canRedo = usePlannerStore((s) => s.future.length > 0);
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const setActivityOverride = usePlannerStore((s) => s.setActivityOverride);

  const child = state.children.find((c) => c.id === activeChildId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [calTitle, setCalTitle] = useState('');
  const [colorMode, setColorMode] = useState<IcsColorMode>('per_activity');
  const fileInput = useRef<HTMLInputElement>(null);

  const selectedColorCss = selectedActivityId
    ? state.overrides.find((o) => o.activityId === selectedActivityId)?.colorCss ??
      colorForActivity(selectedActivityId).css
    : undefined;

  if (!child) return null;

  const exportIcs = (mode?: 'expanded') => {
    downloadIcs({
      child,
      schedule: activeSchedule(state),
      catalog,
      schoolYear: state.schoolYear,
      exceptions,
      districtCode: state.districtCode,
      colorMode,
      overrides: state.overrides,
      ...(calTitle.trim() ? { calendarTitle: calTitle.trim() } : {}),
      ...(mode ? { mode } : {}),
    });
    setMenuOpen(false);
  };

  const exportPng = async () => {
    if (gridRef.current) await downloadPng(gridRef.current, child);
    setMenuOpen(false);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    const isIcs =
      /\.ics$/i.test(file.name) || text.trimStart().startsWith('BEGIN:VCALENDAR');
    if (isIcs) {
      const events = parseIcs(text);
      if (events.length === 0) {
        alert('V souboru .ics nejsou žádné události.');
        return;
      }
      const entries: CustomEntry[] = events.map((ev) => ({
        id: newId('ce'),
        childId: activeChildId,
        name: ev.name,
        sessions: ev.sessions.map((s) => ({
          id: newId('cs'),
          weekday: s.weekday,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
          validFrom: s.validFrom,
          validTo: s.validTo,
          ...(s.everyWeeks ? { everyWeeks: s.everyWeeks } : {}),
        })),
        ...(ev.location ? { location: ev.location } : {}),
        ...(ev.note ? { note: ev.note } : {}),
      }));
      addCustomEntries(entries);
      alert(`Naimportováno ${entries.length} událostí jako vlastní — můžete je upravit.`);
      return;
    }
    try {
      const parsed = parsePlannerState(JSON.parse(text));
      if (parsed.ok) loadState(parsed.value);
      else alert(`Soubor nelze načíst: ${parsed.error}`);
    } catch {
      alert('Soubor není platný JSON ani .ics.');
    }
  };

  return (
    <header className="no-print flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <label className="flex items-center gap-1 text-sm text-slate-600">
        Kalendář
        <input
          value={calTitle}
          onChange={(e) => setCalTitle(e.target.value)}
          placeholder="Název kalendáře"
          className="w-40 rounded border border-slate-200 px-2 py-0.5 text-sm"
          aria-label="Název kalendáře"
        />
      </label>
      <div
        className="flex items-center gap-1"
        title={
          selectedActivityId
            ? 'Barva vybraného kroužku'
            : 'Vyberte kroužek pro změnu barvy'
        }
      >
        {selectedActivityId ? (
          <ColorSwatches
            value={selectedColorCss}
            onPick={(css) =>
              setActivityOverride(selectedActivityId, { colorCss: css })
            }
          />
        ) : (
          <span className="text-xs text-slate-400">Barva: vyberte kroužek</span>
        )}
      </div>
      <label className="flex items-center gap-1 text-sm text-slate-600">
        Věk
        <input
          type="number"
          min={3}
          max={19}
          value={child.age}
          onChange={(e) => setChildAge(child.id, Number(e.target.value))}
          className="w-14 rounded border border-slate-200 px-1 py-0.5"
        />
      </label>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="rounded px-2 py-1 text-sm disabled:opacity-30"
          title="Zpět (Cmd/Ctrl+Z)"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="rounded px-2 py-1 text-sm disabled:opacity-30"
          title="Vpřed (Cmd/Ctrl+Shift+Z)"
        >
          ↷
        </button>

        <input
          ref={fileInput}
          type="file"
          accept=".json,.ics,application/json,text/calendar"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importJson(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
          title="Načíst rozvrh (.json) nebo kalendář (.ics)"
        >
          Načíst
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
          >
            Export ▾
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div className="px-3 py-2">
                <label className="block text-xs text-slate-500">
                  Barvy událostí
                  <select
                    value={colorMode}
                    onChange={(e) => setColorMode(e.target.value as IcsColorMode)}
                    className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
                  >
                    <option value="per_activity">Podle kroužku</option>
                    <option value="single">Jedna barva pro dítě</option>
                  </select>
                </label>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem onClick={() => exportIcs()}>Kalendář (.ics)</MenuItem>
              <MenuItem onClick={() => void exportPng()}>Obrázek (.png)</MenuItem>
              <MenuItem
                onClick={() => {
                  printSchedule();
                  setMenuOpen(false);
                }}
              >
                Tisk
              </MenuItem>
              <MenuItem
                onClick={() => {
                  downloadStateJson(state, child);
                  setMenuOpen(false);
                }}
              >
                Rozvrh jako soubor (.json)
              </MenuItem>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem onClick={() => exportIcs('expanded')}>
                Mám problém s importem (rozbalené)
              </MenuItem>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
    >
      {children}
    </button>
  );
}
