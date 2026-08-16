'use client';

import { useRef, useState } from 'react';
import {
  colorForActivity,
  parseIcs,
  parsePlannerState,
  serializePlannerState,
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

export function Toolbar({
  gridRef,
  isDirty,
  onMarkSaved,
}: {
  gridRef: React.RefObject<HTMLDivElement>;
  isDirty: boolean;
  onMarkSaved: (savedSignature?: string) => void;
}) {
  const state = usePlannerStore((s) => s.state);
  const catalog = usePlannerStore((s) => s.catalog);
  const exceptions = usePlannerStore((s) => s.exceptions);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const setActiveChild = usePlannerStore((s) => s.setActiveChild);
  const addChild = usePlannerStore((s) => s.addChild);
  const setChildAge = usePlannerStore((s) => s.setChildAge);
  const loadState = usePlannerStore((s) => s.loadState);
  const addCustomEntries = usePlannerStore((s) => s.addCustomEntries);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const canUndo = usePlannerStore((s) => s.history.length > 0);
  const editCount = usePlannerStore((s) => s.history.length);
  const canRedo = usePlannerStore((s) => s.future.length > 0);
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const setActivityOverride = usePlannerStore((s) => s.setActivityOverride);

  const child = state.children.find((c) => c.id === activeChildId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      sequence: editCount,
      ...(calTitle.trim() ? { calendarTitle: calTitle.trim() } : {}),
      ...(mode ? { mode } : {}),
    });
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  // C6-C2: každé dítě do vlastního souboru jedním kliknutím (samostatný kalendář).
  const exportAllChildrenIcs = () => {
    const schedule = activeSchedule(state);
    for (const c of state.children) {
      downloadIcs({
        child: c,
        schedule,
        catalog,
        schoolYear: state.schoolYear,
        exceptions,
        districtCode: state.districtCode,
        colorMode,
        overrides: state.overrides,
        sequence: editCount,
      });
    }
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const exportPng = async () => {
    if (gridRef.current) await downloadPng(gridRef.current, child);
    setMenuOpen(false);
    setMobileMenuOpen(false);
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
      if (parsed.ok) {
        loadState(parsed.value);
        onMarkSaved(serializePlannerState(parsed.value));
      }
      else alert(`Soubor nelze načíst: ${parsed.error}`);
    } catch {
      alert('Soubor není platný JSON ani .ics.');
    }
  };

  // Sdílené položky exportu pro desktopové i mobilní menu.
  const exportItems = (
    <>
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
      {state.children.length > 1 && (
        <MenuItem onClick={exportAllChildrenIcs}>
          Kalendář — všechny děti (.ics)
        </MenuItem>
      )}
      <MenuItem onClick={() => void exportPng()}>Obrázek (.png)</MenuItem>
      <MenuItem
        onClick={() => {
          printSchedule();
          setMenuOpen(false);
          setMobileMenuOpen(false);
        }}
      >
        Tisk
      </MenuItem>
      <MenuItem onClick={() => exportIcs('expanded')}>
        Mám problém s importem (rozbalené)
      </MenuItem>
    </>
  );

  return (
    <header className="no-print flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-1 text-sm text-slate-600">
        {state.children.length > 1 ? (
          <select
            value={activeChildId}
            onChange={(e) => setActiveChild(e.target.value)}
            aria-label="Dítě"
            className="min-w-0 rounded border border-slate-200 px-2 py-0.5 text-sm"
          >
            {state.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate">{child.name}</span>
        )}
        <button
          type="button"
          onClick={addChild}
          className="shrink-0 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
          title="Přidat další dítě (samostatný rozvrh a export)"
        >
          + Přidat dítě
        </button>
      </div>

      <label className="hidden min-w-0 desk:flex items-center gap-1 text-sm text-slate-600">
        Kalendář
        <input
          value={calTitle}
          onChange={(e) => setCalTitle(e.target.value)}
          placeholder="Název kalendáře"
          className="w-28 min-w-0 rounded border border-slate-200 px-2 py-0.5 text-sm"
          aria-label="Název kalendáře"
        />
      </label>
      <div
        className="hidden desk:flex items-center gap-1"
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
          <span className="text-xs text-slate-600">Barva: vyberte kroužek</span>
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

      <div className="text-xs">
        <span className={isDirty ? 'font-medium text-amber-700' : 'text-emerald-700'}>
          {isDirty ? 'Neuloženo' : 'Uloženo'}
        </span>
        <span className="ml-2 hidden text-slate-500 desk:inline">Ukládá se do prohlížeče; Uložit vytvoří záložní soubor.</span>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className="rounded px-2 py-1 text-sm disabled:opacity-30"
          title="Zpět (Cmd/Ctrl+Z)"
          aria-label="Zpět (Cmd/Ctrl+Z)"
        >
          <span aria-hidden>↶</span>
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className="rounded px-2 py-1 text-sm disabled:opacity-30"
          title="Vpřed (Cmd/Ctrl+Shift+Z)"
          aria-label="Vpřed (Cmd/Ctrl+Shift+Z)"
        >
          <span aria-hidden>↷</span>
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
        <div className="hidden desk:flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50"
            title="Načíst rozvrh (.json) nebo kalendář (.ics)"
          >
            Otevřít
          </button>
          <button
            type="button"
            onClick={() => {
              downloadStateJson(state, child);
              onMarkSaved();
            }}
            className="rounded bg-slate-800 px-3 py-1 text-sm text-white hover:bg-slate-700"
            title="Uložit rozvrh do souboru (.json)"
          >
            Uložit
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded border border-slate-200 px-3 py-1 text-sm hover:bg-slate-50"
            >
              Další ▾
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {exportItems}
              </div>
            )}
          </div>
        </div>

        <div className="relative desk:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-11 items-center rounded border border-slate-200 px-3 text-sm hover:bg-slate-50"
          >
            Další ▾
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <label className="block px-3 py-2 text-xs text-slate-500">
                Název kalendáře
                <input
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  placeholder="Název kalendáře"
                  aria-label="Název kalendáře"
                  className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
                />
              </label>
              <div className="my-1 border-t border-slate-100" />
              <MenuItem
                onClick={() => {
                  fileInput.current?.click();
                  setMobileMenuOpen(false);
                }}
              >
                Otevřít
              </MenuItem>
              <MenuItem
                onClick={() => {
                  downloadStateJson(state, child);
                  onMarkSaved();
                  setMobileMenuOpen(false);
                }}
              >
                Uložit
              </MenuItem>
              <div className="my-1 border-t border-slate-100" />
              {exportItems}
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
