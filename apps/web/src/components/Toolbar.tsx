'use client';

import { useEffect, useRef, useState } from 'react';
import {
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
import { PrivacyDialog } from './PrivacyDialog';
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
  IconShield,
} from './Icons';

export function Toolbar({
  gridRef,
  isDirty,
  autosaveOk,
  onMarkSaved,
}: {
  gridRef: React.RefObject<HTMLDivElement>;
  isDirty: boolean;
  /** `false`, když poslední zápis do localStorage selhal (soukromý režim, plné
   * úložiště…) — zobrazí varování místo tichého "Uloženo" (audit after_review_71 §2). */
  autosaveOk: boolean;
  onMarkSaved: (savedSignature?: string) => void;
}) {
  const state = usePlannerStore((s) => s.state);
  const catalog = usePlannerStore((s) => s.catalog);
  const exceptions = usePlannerStore((s) => s.exceptions);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const setActiveChild = usePlannerStore((s) => s.setActiveChild);
  const addChild = usePlannerStore((s) => s.addChild);
  const renameChild = usePlannerStore((s) => s.renameChild);
  const removeChild = usePlannerStore((s) => s.removeChild);
  const loadState = usePlannerStore((s) => s.loadState);
  const addCustomEntries = usePlannerStore((s) => s.addCustomEntries);
  const undo = usePlannerStore((s) => s.undo);
  const redo = usePlannerStore((s) => s.redo);
  const canUndo = usePlannerStore((s) => s.history.length > 0);
  const editCount = usePlannerStore((s) => s.history.length);
  const canRedo = usePlannerStore((s) => s.future.length > 0);
  const announce = usePlannerStore((s) => s.announce);

  const child = state.children.find((c) => c.id === activeChildId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addingCalendar, setAddingCalendar] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [colorMode, setColorMode] = useState<IcsColorMode>('per_activity');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [mobileMenuPos, setMobileMenuPos] = useState<{ top: number; right: number } | null>(null);

  // Tlačítko „Další ▾“ už od design_review_70.md není vtžené k pravému okraji hlavičky
  // (ml-auto platí až desk:) — menu proto NESMí být `absolute` vůči svému malému
  // wrapperu (přetekalo mimo viewport, design_review_71.md dodatek), ale `fixed`
  // s pozicí dopočítanou z reálné pozice tlačítka, ohraníčenou uvnitř viewportu.
  useEffect(() => {
    if (!mobileMenuOpen || !mobileMenuBtnRef.current) {
      setMobileMenuPos(null);
      return;
    }
    const rect = mobileMenuBtnRef.current.getBoundingClientRect();
    const menuWidth = 288;
    const margin = 8;
    const right = Math.min(
      Math.max(margin, window.innerWidth - rect.right),
      Math.max(margin, window.innerWidth - menuWidth - margin),
    );
    setMobileMenuPos({ top: rect.bottom + 4, right });
  }, [mobileMenuOpen]);

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
      ...(mode ? { mode } : {}),
    });
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  // C6-C2: každé dítě do vlastního souboru jedním kliknutím (samostatný kalendář).
  // Sekvenčně s odstupem (audit after_review_71 §1) — prohlížeče bez pauzy mezi
  // programovými stahováními blokují druhý a další soubor beze zprávy.
  const exportAllChildrenIcs = () => {
    const schedule = activeSchedule(state);
    const children = state.children;
    children.forEach((c, i) => {
      setTimeout(() => {
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
        if (i === children.length - 1) announce(`Staženo ${children.length} kalendářů`);
      }, i * 400);
    });
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const exportPng = async () => {
    if (!gridRef.current) return;
    try {
      await downloadPng(gridRef.current, child);
    } catch {
      alert('Obrázek se nepodařilo vytvořit, zkuste tisk rozvrhu.');
    }
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    const isIcs =
      /\.ics$/i.test(file.name) || text.trimStart().startsWith('BEGIN:VCALENDAR');
    if (isIcs) {
      let events: ReturnType<typeof parseIcs>;
      try {
        events = parseIcs(text);
      } catch {
        alert('Soubor .ics se nepodařilo přečíst.');
        return;
      }
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
        <div className="my-1 border-t border-slate-100" />
        <MenuItem
          onClick={() => {
            setPrivacyOpen(true);
            setMenuOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          <div className="flex items-center gap-2">
            <IconShield className="h-4 w-4 text-slate-500" />
            <span>Soukromí a data</span>
          </div>
        </MenuItem>
      </div>
    </div>
  );

  return (
    <header className="no-print relative z-50 flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-white px-3 py-2 shadow-sm">
      {/* Správa kalendářů (design_review_70.md): název (přejmenovatelné pole),
          přepínač mezi kalendáři a přidání/odebrání jsou VŽDY v horní liště, na
          všech šířkách — dřív žila správa jen na mobilní záložce „Děti". `flex-nowrap
          overflow-x-auto` místo `flex-wrap` (FR-W1-3, design_review_73.md): dlouhé
          jméno kalendáře nebo víc kalendářů dřív mohly zalomit TENTO shluk na 2
          řádky, což s řádkem 2 dávalo nepředvídatelně 3 řádky hlavičky na mobilu —
          teď přebytek jen vodorovně scrolluje, hlavička zůstává max. na 2 řádcích.
          `w-full` na mobilu (`desk:w-auto`): shluk musí zabrat celý řádek 1 sám,
          jinak by se na volné místo vedle něj vešel i stavový pilulek z řádku 2
          (T-184 regrese) — na desktopu vedle sebe žijí i s dalšími skupinami. */}
      <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-50/70 p-1 text-sm desk:w-auto">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 font-semibold text-white text-xs shadow-sm">
          {child.name ? child.name[0]?.toUpperCase() : <IconUser className="h-3.5 w-3.5" />}
        </div>
        <input
          key={activeChildId}
          defaultValue={child.name}
          onBlur={(e) => renameChild(child.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="Název kalendáře"
          aria-label="Název kalendáře"
          className="min-w-0 w-28 shrink-0 truncate rounded-md border-0 bg-transparent px-1 py-1 font-medium text-slate-800 text-sm focus:bg-white focus:ring-1 focus:ring-blue-500"
        />
        {state.children.length > 1 && (
          <select
            value={activeChildId}
            onChange={(e) => setActiveChild(e.target.value)}
            aria-label="Přepnout kalendář"
            className="min-w-0 max-w-[110px] shrink-0 truncate rounded-md border-0 bg-transparent py-1 pl-1 pr-6 text-xs text-slate-600 focus:ring-1 focus:ring-blue-500"
          >
            {state.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {addingCalendar ? (
          <form
            className="flex shrink-0 items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              addChild(newCalName);
              setNewCalName('');
              setAddingCalendar(false);
            }}
          >
            <input
              autoFocus
              value={newCalName}
              onChange={(e) => setNewCalName(e.target.value)}
              placeholder="Název nového kalendáře"
              aria-label="Název nového kalendáře"
              className="w-32 min-w-0 shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md border border-blue-600 bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-2xs hover:bg-blue-700 transition"
            >
              Přidat
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingCalendar(false);
                setNewCalName('');
              }}
              aria-label="Zrušit přidání kalendáře"
              className="shrink-0 rounded-md px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingCalendar(true)}
            className="shrink-0 rounded-md border border-slate-200/90 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            title="Přidat další kalendář (samostatný rozvrh a export)"
          >
            <span className="inline-flex items-center gap-1">
              <IconPlus className="h-3 w-3" />
              <span>Přidat kalendář</span>
            </span>
          </button>
        )}
        {state.children.length > 1 && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  `Opravdu odebrat kalendář „${child.name}“ a všechny jeho zápisy z rozvrhu? Akci lze vrátit tlačítkem Zpět.`,
                )
              ) {
                removeChild(child.id);
              }
            }}
            aria-label={`Odebrat kalendář ${child.name}`}
            title="Odebrat tento kalendář (nevratné, jde vrátit přes Zpět)"
            className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-600 shadow-2xs hover:bg-red-50 transition"
          >
            Odebrat
          </button>
        )}
      </div>

      {/* Status indikátor uložení. `h-11` na mobilu srovnává výšku s undo/redo a „Další ▾“
          (design_review_71.md dodatek — bez toho měly 3 různé výšky 22/34/44px ve stejném řádku). */}
      <div className="flex h-11 items-center gap-1.5 text-xs desk:h-auto">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition ${
            !autosaveOk
              ? 'bg-red-50 text-red-700 border border-red-200'
              : isDirty
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
          title={
            autosaveOk
              ? undefined
              : 'Ukládání do prohlížeče selhalo (soukromý režim nebo plné úložiště) — stáhněte si zálohu tlačítkem Uložit.'
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${!autosaveOk ? 'bg-red-500' : isDirty ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}
          />
          {!autosaveOk ? 'Ukládání selhalo' : isDirty ? 'Neuloženo' : 'Uloženo'}
        </span>
        <span className="ml-1 hidden text-slate-400 desk:inline text-[11px]">
          {autosaveOk ? 'Ukládá se do prohlížeče' : 'Stáhněte si zálohu (.json)'}
        </span>
      </div>

      {/* Pravá část akcí: Undo/Redo, Otevřít, Uložit, Další exporty. `ml-auto`/`justify-end`
          jen na desktopu — na mobilu by to od status indikátoru odtrhlo velkou prázdnou
          mezeru (nahlášeno jako "rozházená" lišta), místo aby akce navazovaly hned za sebou. */}
      <div className="flex flex-wrap items-center gap-1.5 desk:ml-auto desk:justify-end">
        <div className="flex h-11 items-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs desk:h-auto">
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
            ref={mobileMenuBtnRef}
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-11 items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            Další ▾
          </button>
          {mobileMenuOpen && mobileMenuPos && (
            <div
              style={{ top: mobileMenuPos.top, right: mobileMenuPos.right }}
              className="fixed z-50 max-h-[calc(100vh-5rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl"
            >
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
      {privacyOpen && <PrivacyDialog onClose={() => setPrivacyOpen(false)} />}
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
