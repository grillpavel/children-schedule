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
import {
  IconUndo,
  IconRedo,
  IconPlus,
  IconFolderOpen,
  IconDownload,
  IconPrinter,
  IconChevronDown,
  IconUser,
  IconCheck,
} from './Icons';

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
        kind: 'other',
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
      } else {
        alert(`Soubor nelze načíst: ${parsed.error}`);
      }
    } catch {
      alert('Soubor není platný JSON ani .ics.');
    }
  };

  // Sdílené položky exportu pro desktopové i mobilní menu.
  const exportItems = (
    <div className="py-1">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
        <label className="block text-xs font-medium text-slate-600">
          Barevné schéma
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as IcsColorMode)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="per_activity">Podle kroužku (různobarevné)</option>
            <option value="single">Jedna barva pro dítě</option>
          </select>
        </label>
      </div>

      <div className="pt-1">
        <MenuItem onClick={() => exportIcs()}>
          <div className="flex items-center gap-2">
            <IconDownload className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-slate-800">Kalendář (.ics)</span>
          </div>
        </MenuItem>
        {state.children.length > 1 && (
          <MenuItem onClick={exportAllChildrenIcs}>
            <div className="flex items-center gap-2">
              <IconDownload className="h-4 w-4 text-slate-500" />
              <span>Kalendář — všechny děti (.ics)</span>
            </div>
          </MenuItem>
        )}
        <MenuItem onClick={() => void exportPng()}>
          <div className="flex items-center gap-2">
            <IconFolderOpen className="h-4 w-4 text-slate-500" />
            <span>Obrázek rozvrhu (.png)</span>
          </div>
        </MenuItem>
        <MenuItem
          onClick={() => {
            printSchedule();
            setMenuOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          <div className="flex items-center gap-2">
            <IconPrinter className="h-4 w-4 text-slate-500" />
            <span>Tisk rozvrhu</span>
          </div>
        </MenuItem>
        <div className="my-1 border-t border-slate-100" />
        <MenuItem onClick={() => exportIcs('expanded')}>
          <span className="text-xs text-slate-500">Mám problém s importem (rozbalené .ics)</span>
        </MenuItem>
      </div>
    </div>
  );

  return (
    <header className="no-print relative z-50 flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-white px-3 py-2 shadow-sm">
      {/* Sekce Profil dítěte */}
      <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 p-1 text-sm">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 font-semibold text-white text-xs shadow-sm">
          {child.name ? child.name[0]?.toUpperCase() : <IconUser className="h-3.5 w-3.5" />}
        </div>
        {state.children.length > 1 ? (
          <select
            value={activeChildId}
            onChange={(e) => setActiveChild(e.target.value)}
            aria-label="Dítě"
            className="min-w-0 rounded-md border-0 bg-transparent py-0.5 pl-1 pr-6 font-medium text-slate-800 text-sm focus:ring-1 focus:ring-blue-500"
          >
            {state.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="truncate font-medium text-slate-800 px-1">{child.name}</span>
        )}
        <button
          type="button"
          onClick={addChild}
          className="shrink-0 rounded-md border border-slate-200/90 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
          title="Přidat další dítě (samostatný rozvrh a export)"
        >
          <span className="inline-flex items-center gap-1">
            <IconPlus className="h-3 w-3" />
            <span>Přidat dítě</span>
          </span>
        </button>
      </div>

      {/* Věk dítěte */}
      <label className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2 py-1 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Věk:</span>
        <input
          type="number"
          min={3}
          max={19}
          value={child.age}
          onChange={(e) => setChildAge(child.id, Number(e.target.value))}
          className="w-12 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-center font-semibold text-slate-800 text-xs shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <span className="text-slate-400">let</span>
      </label>

      {/* Kalendář title (Desktop) */}
      <label className="hidden min-w-0 desk:flex items-center gap-1.5 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Kalendář:</span>
        <input
          value={calTitle}
          onChange={(e) => setCalTitle(e.target.value)}
          placeholder="Název kalendáře"
          className="w-32 min-w-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          aria-label="Název kalendáře"
        />
      </label>

      {/* Color picker kroužku (Desktop) */}
      <div
        className="hidden desk:flex items-center gap-1.5 rounded-lg border border-slate-200/80 px-2 py-1 text-xs"
        title={
          selectedActivityId
            ? 'Barva vybraného kroužku'
            : 'Vyberte kroužek pro změnu barvy'
        }
      >
        {selectedActivityId ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Barva:</span>
            <ColorSwatches
              value={selectedColorCss}
              onPick={(css) =>
                setActivityOverride(selectedActivityId, { colorCss: css })
              }
            />
          </div>
        ) : (
          <span className="text-slate-400">Barva: vyberte kroužek</span>
        )}
      </div>

      {/* Status indikátor uložení */}
      <div className="flex items-center gap-1.5 text-xs">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition ${
            isDirty
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isDirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {isDirty ? 'Neuloženo' : 'Uloženo'}
        </span>
        <span className="ml-1 hidden text-slate-400 desk:inline text-[11px]">
          Ukládá se do prohlížeče
        </span>
      </div>

      {/* Pravá část akcí: Undo/Redo, Otevřít, Uložit, Další exporty */}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
        <div className="flex items-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Zpět (Cmd/Ctrl+Z)"
            aria-label="Zpět (Cmd/Ctrl+Z)"
          >
            <IconUndo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            title="Vpřed (Cmd/Ctrl+Shift+Z)"
            aria-label="Vpřed (Cmd/Ctrl+Shift+Z)"
          >
            <IconRedo className="h-3.5 w-3.5" />
          </button>
        </div>

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

        {/* Desktopové akce */}
        <div className="hidden desk:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="Načíst rozvrh (.json) nebo kalendář (.ics)"
          >
            <IconFolderOpen className="h-3.5 w-3.5 text-slate-500" />
            <span>Otevřít</span>
          </button>
          <button
            type="button"
            onClick={() => {
              downloadStateJson(state, child);
              onMarkSaved();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-slate-800 transition active:scale-98"
            title="Uložit rozvrh do souboru (.json)"
          >
            <IconDownload className="h-3.5 w-3.5 text-slate-200" />
            <span>Uložit</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              Další ▾
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl border border-slate-200/90 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
                {exportItems}
              </div>
            )}
          </div>
        </div>

        {/* Mobilní menu tlačítko */}
        <div className="relative desk:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-11 items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            Další ▾
          </button>
          {mobileMenuOpen && (
            <div className="absolute right-0 z-50 mt-1 max-h-[calc(100vh-5rem)] w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
              <label className="block p-3 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-600">
                Název kalendáře
                <input
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  placeholder="Název kalendáře"
                  aria-label="Název kalendáře"
                  className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </label>
              <div className="py-1">
                <MenuItem
                  onClick={() => {
                    fileInput.current?.click();
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <IconFolderOpen className="h-4 w-4 text-slate-500" />
                    <span>Otevřít</span>
                  </div>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    downloadStateJson(state, child);
                    onMarkSaved();
                    setMobileMenuOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <IconDownload className="h-4 w-4 text-slate-500" />
                    <span>Uložit</span>
                  </div>
                </MenuItem>
              </div>
              <div className="border-t border-slate-100" />
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
      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
    >
      {children}
    </button>
  );
}
