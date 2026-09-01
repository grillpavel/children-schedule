'use client';

import { useEffect, useRef, useState } from 'react';
import {
  parseIcs,
  parseExportEnvelope,
  mergeSingleChildImport,
  serializePlannerState,
  type CustomEntry,
  type IcsColorMode,
  type PlannerState,
  type SingleChildMergeResult,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import {
  downloadIcs,
  downloadPng,
  downloadFamilyJson,
  downloadSingleChildJson,
  downloadFamilyIcs,
  printSchedule,
  printAgenda,
  isIosDevice,
  icsExportHref,
  type ExportHourRange,
} from '@/lib/exportClient';
import { newId } from '@/lib/ids';
import { encodeStateToShareUrl } from '@/lib/shareLink';
import { useEscapeToClose } from '@/hooks/useEscapeToClose';
import { PopoverBackdrop } from './PopoverBackdrop';
import { PrivacyDialog } from './PrivacyDialog';
import { PrintRangeDialog } from './PrintRangeDialog';
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
  IconCopy,
  IconClose,
} from './Icons';

// FR-2/FR-5/FR-7/FR-8 (design_review_99.md): import už nikdy tiše nepřepíše —
// 'family' čeká na potvrzení s porovnáním počtu dětí/data; 'single-child' čeká
// na potvrzení jen když merge NENÍ 'silent' (viz `importJson` v komponentě níže).
type PendingImport =
  | { kind: 'family'; data: PlannerState }
  | {
      kind: 'single-child';
      merge: SingleChildMergeResult;
      childId: string;
      sourceUpdatedAt?: string;
    };

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
  const applySingleChildMerge = usePlannerStore((s) => s.applySingleChildMerge);
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
  // FR-3 (design_review_99.md): "Uložit" nabídne explicitní volbu rozsahu —
  // "Celá rodina" nebo konkrétní dítě — místo tichého vždy-celá-rodina exportu.
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveScope, setSaveScope] = useState<string>('family');
  // FR-2/FR-5/FR-7/FR-8 (design_review_99.md): import už nikdy tiše nepřepíše —
  // 'family' čeká na potvrzení s porovnáním počtu dětí/data; 'single-child' čeká
  // na potvrzení jen když merge NENÍ 'silent' (viz `importJson`).
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  // Ruční odkazy pro export více kalendářů na iOS (design_review_98.md) — místo
  // automatického stažení, viz komentář u `exportAllChildrenIcs`. Každé `href` je
  // `blob:` URL, kterou je třeba při zavření/změně uvolnit (viz efekt níže).
  const [iosExportLinks, setIosExportLinks] = useState<
    { id: string; name: string; href: string }[] | null
  >(null);
  // Nejprve vyber rozsah hodin, pak teprve vygeneruj tisk/obrázek (design_review_88.md).
  const [printRangeAction, setPrintRangeAction] = useState<'print' | 'png' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [mobileMenuPos, setMobileMenuPos] = useState<{ top: number; right: number } | null>(null);
  // BL-057 (design_review_88.md): na mobilu se správa kalendářů (přejmenování/
  // přepnutí/přidání/odebrání) sbalí za jedno „⋯" tlačítko, ať zůstane hlavička
  // jednořádková — na desktopu beze změny (design_review_70.md požadavek zůstává
  // v platnosti tam, kde na šířce nezáleží).
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const calendarMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [calendarMenuPos, setCalendarMenuPos] = useState<{ top: number; left: number } | null>(null);

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

  // Stejný fixed-position vzor jako u mobilního „Další ▾" menu (design_review_71.md) —
  // kotví se doleva k tlačítku, ohraničené uvnitř viewportu.
  useEffect(() => {
    if (!calendarMenuOpen || !calendarMenuBtnRef.current) {
      setCalendarMenuPos(null);
      return;
    }
    const rect = calendarMenuBtnRef.current.getBoundingClientRect();
    const menuWidth = 288;
    const margin = 8;
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, window.innerWidth - menuWidth - margin),
    );
    setCalendarMenuPos({ top: rect.bottom + 4, left });
  }, [calendarMenuOpen]);

  // Všechna tři menu (desktop/mobil „Další ▾“, „Správa kalendářů“) zavírá Escape
  // stejně jako referenční CustomEntryDialog (design_review_95.md).
  useEscapeToClose(() => {
    setMenuOpen(false);
    setMobileMenuOpen(false);
    setCalendarMenuOpen(false);
    setIosExportLinks(null);
    setSaveDialogOpen(false);
    setPendingImport(null);
  });

  // `icsExportHref` vrací `blob:` URL — uvolnit při zavření dialogu i při
  // odmountování komponenty, jinak uniká paměť (design_review_98.md).
  useEffect(() => {
    if (!iosExportLinks) return;
    return () => {
      iosExportLinks.forEach((l) => URL.revokeObjectURL(l.href));
    };
  }, [iosExportLinks]);

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
      sessionOverrides: state.sessionOverrides,
      ...(mode ? { mode } : {}),
    });
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  // C6-C2: každé dítě do vlastního souboru jedním kliknutím (samostatný kalendář).
  // Sekvenčně s odstupem (audit after_review_71 §1) — prohlížeče bez pauzy mezi
  // programovými stahováními blokují druhý a další soubor beze zprávy.
  //
  // Na iOS Safari `setTimeout` odstup u VÍCE kalendářů ztrácí "user gesture" —
  // jediný přímý klik pak spouští N odložených navigací a druhá a další se na
  // iPhonu tiše zahodí, beze zprávy. Na iOS proto místo automatického stažení
  // nabídneme odkazy — klepnutí na KAŽDÝ z nich je vlastní, čerstvé gesto.
  const exportAllChildrenIcs = () => {
    if (isIosDevice()) {
      const schedule = activeSchedule(state);
      setIosExportLinks(
        state.children.map((c) => {
          const { href } = icsExportHref({
            child: c,
            schedule,
            catalog,
            schoolYear: state.schoolYear,
            exceptions,
            districtCode: state.districtCode,
            colorMode,
            overrides: state.overrides,
            sequence: editCount,
            sessionOverrides: state.sessionOverrides,
          });
          return { id: c.id, name: c.name, href };
        }),
      );
      setMenuOpen(false);
      setMobileMenuOpen(false);
      return;
    }
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
          sessionOverrides: state.sessionOverrides,
        });
        if (i === children.length - 1) announce(`Staženo ${children.length} kalendářů`);
      }, i * 400);
    });
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const exportPng = async (range: ExportHourRange) => {
    if (!gridRef.current) return;
    try {
      await downloadPng(gridRef.current, child, range);
    } catch {
      alert('Obrázek se nepodařilo vytvořit, zkuste tisk rozvrhu.');
    }
    setMenuOpen(false);
    setMobileMenuOpen(false);
  };

  // FR-W3-4 (design_review_73.md): appka nemá backend, rozvrh proto žije celý
  // v URL fragmentu (nikdy neopustí prohlížeč přes access log serveru).
  const shareLink = async () => {
    try {
      const url = await encodeStateToShareUrl(state);
      await navigator.clipboard.writeText(url);
      announce('Odkaz na rozvrh zkopírován do schránky');
    } catch {
      alert('Odkaz se nepodařilo vytvořit.');
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
      const parsedInput: unknown = JSON.parse(text);
      const envelope = parseExportEnvelope(parsedInput);
      if (!envelope.ok) {
        alert(`Soubor nelze načíst: ${envelope.error}`);
        return;
      }
      if (envelope.value.exportType === 'family') {
        // FR-2: nikdy tiché — vždy potvrzení s porovnáním počtu dětí/data.
        setPendingImport({ kind: 'family', data: envelope.value.data });
        return;
      }
      // single-child (FR-5/FR-7/FR-8) — merge je čistá doménová funkce, appka
      // jen rozhodne, jestli výsledek potřebuje potvrzení, nebo je 'silent'.
      const merge = mergeSingleChildImport(state, envelope.value.data, catalog);
      const warnSkipped = () => {
        if (merge.skipped.length === 0) return;
        alert(
          `${merge.skipped.length} položka(y) byly při slučování vynechány (katalogová položka už neexistuje):\n` +
            merge.skipped.map((s) => `- ${s.reason}`).join('\n'),
        );
      };
      if (merge.resolution.kind === 'silent') {
        applySingleChildMerge(merge.nextState, envelope.value.childId);
        warnSkipped();
        return;
      }
      setPendingImport({
        kind: 'single-child',
        merge,
        childId: envelope.value.childId,
        ...(envelope.value.sourceUpdatedAt ? { sourceUpdatedAt: envelope.value.sourceUpdatedAt } : {}),
      });
    } catch {
      alert('Soubor není platný JSON ani .ics.');
    }
  };

  const confirmFamilyImport = () => {
    if (!pendingImport || pendingImport.kind !== 'family') return;
    loadState(pendingImport.data);
    onMarkSaved(serializePlannerState(pendingImport.data));
    setPendingImport(null);
  };

  const confirmSingleChildMerge = () => {
    if (!pendingImport || pendingImport.kind !== 'single-child') return;
    applySingleChildMerge(pendingImport.merge.nextState, pendingImport.childId);
    if (pendingImport.merge.skipped.length > 0) {
      alert(
        `${pendingImport.merge.skipped.length} položka(y) byly při slučování vynechány (katalogová položka už neexistuje):\n` +
          pendingImport.merge.skipped.map((s) => `- ${s.reason}`).join('\n'),
      );
    }
    setPendingImport(null);
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
        {state.children.length > 1 && (
          <MenuItem
            onClick={() => {
              downloadFamilyIcs({
                children: state.children,
                schedule: activeSchedule(state),
                catalog,
                schoolYear: state.schoolYear,
                exceptions,
                districtCode: state.districtCode,
                colorMode,
                overrides: state.overrides,
                sequence: editCount,
                sessionOverrides: state.sessionOverrides,
              });
              setMenuOpen(false);
              setMobileMenuOpen(false);
            }}
          >
            <div className="flex items-center gap-2">
              <IconDownload className="h-4 w-4 text-slate-500" />
              <span>Sdílený rodinný kalendář (.ics)</span>
            </div>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            setPrintRangeAction('png');
            setMenuOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          <div className="flex items-center gap-2">
            <IconFolderOpen className="h-4 w-4 text-slate-500" />
            <span>Obrázek rozvrhu (.png)</span>
          </div>
        </MenuItem>
        <MenuItem onClick={() => void shareLink()}>
          <div className="flex items-center gap-2">
            <IconCopy className="h-4 w-4 text-slate-500" />
            <span>Sdílet odkaz na rozvrh</span>
          </div>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setPrintRangeAction('print');
            setMenuOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          <div className="flex items-center gap-2">
            <IconPrinter className="h-4 w-4 text-slate-500" />
            <span>Tisk rozvrhu</span>
          </div>
        </MenuItem>
        <MenuItem
          onClick={() => {
            printAgenda();
            setMenuOpen(false);
            setMobileMenuOpen(false);
          }}
        >
          <div className="flex items-center gap-2">
            <IconPrinter className="h-4 w-4 text-slate-500" />
            <span>Tisk agendy (souhrn kroužků)</span>
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

  // Obsah správy kalendářů (design_review_70.md, BL-057 design_review_88.md) — sdílený
  // mezi VŽDY-viditelným desktopovým shlukem a mobilním sheetem za „⋯" tlačítkem
  // (avatar zůstává v obou místech vykreslen zvlášť, ten uvnitř sheetu není potřeba).
  const calendarControls = (
    <>
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
    </>
  );

  return (
    <header
      className="no-print relative z-50 flex flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-slate-200/80 bg-white px-3 py-2 shadow-sm desk:flex-wrap desk:gap-2 desk:overflow-visible"
    >
      {/* Správa kalendářů (design_review_70.md): název (přejmenovatelné pole),
          přepínač mezi kalendáři a přidání/odebrání jsou VŽDY v horní liště NA DESKTOPU
          (`hidden desk:flex`) — na mobilu se od BL-057 (design_review_88.md) sbalí za
          jedno „⋯" tlačítko, ať zůstane hlavička jednořádková (dřív tu žil `flex-nowrap
          overflow-x-auto` shluk přímo v řádku, i tak dvouřádkový na užších telefonech). */}
      <div className="hidden w-full min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-50/70 p-1 text-sm desk:flex desk:w-auto">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 font-semibold text-white text-xs shadow-sm">
          {child.name ? child.name[0]?.toUpperCase() : <IconUser className="h-3.5 w-3.5" />}
        </div>
        {calendarControls}
      </div>

      {/* Mobil (BL-057): kompaktní avatar+jméno tlačítko otevírá sheet se stejnou
          správou kalendářů jako na desktopu. `aria-label` je stabilní bez ohledu
          na iniciálu avataru (ta je `aria-hidden`, ať nekontaminuje accessible name). */}
      <div className="relative flex shrink-0 desk:hidden">
        <button
          ref={calendarMenuBtnRef}
          type="button"
          onClick={() => setCalendarMenuOpen((v) => !v)}
          aria-expanded={calendarMenuOpen}
          aria-label={`Správa kalendářů (aktivní: ${child.name})`}
          className="flex h-11 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2 text-sm shadow-2xs hover:bg-slate-100 transition"
        >
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 font-semibold text-white text-xs shadow-sm"
          >
            {child.name ? child.name[0]?.toUpperCase() : <IconUser className="h-3.5 w-3.5" />}
          </span>
          <span aria-hidden className="max-w-[96px] truncate font-medium text-slate-800">
            {child.name || 'Kalendář'}
          </span>
          <span aria-hidden className="text-slate-400">▾</span>
        </button>
        {calendarMenuOpen && calendarMenuPos && (
          <>
            <PopoverBackdrop onClose={() => setCalendarMenuOpen(false)} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Správa kalendářů (aktivní: ${child.name})`}
              style={{ top: calendarMenuPos.top, left: calendarMenuPos.left }}
              className="fixed z-50 max-h-[calc(100vh-5rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
            >
              <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto text-sm">
                {calendarControls}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status indikátor uložení. `h-11` na mobilu srovnává výšku s undo/redo a „Další ▾“
          (design_review_71.md dodatek — bez toho měly 3 různé výšky 22/34/44px ve stejném řádku). */}
      <div className="flex h-11 shrink-0 items-center gap-1.5 text-xs desk:h-auto">
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
      <div className="flex flex-nowrap shrink-0 items-center gap-1.5 desk:ml-auto desk:flex-wrap desk:justify-end">
        <div className="flex h-11 items-center rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-2xs desk:h-auto">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            className="flex h-11 w-11 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent desk:h-7 desk:w-7"
            title="Zpět (Cmd/Ctrl+Z)"
            aria-label="Zpět (Cmd/Ctrl+Z)"
          >
            <IconUndo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            className="flex h-11 w-11 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent desk:h-7 desk:w-7"
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
              setSaveScope(activeChildId);
              setSaveDialogOpen(true);
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
              <>
                <PopoverBackdrop onClose={() => setMenuOpen(false)} />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Další akce"
                  className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-slate-200/90 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95"
                >
                  {exportItems}
                </div>
              </>
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
            <>
              <PopoverBackdrop onClose={() => setMobileMenuOpen(false)} />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Další akce"
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
                      setSaveScope(activeChildId);
                      setSaveDialogOpen(true);
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
            </>
          )}
        </div>
      </div>
      {privacyOpen && <PrivacyDialog onClose={() => setPrivacyOpen(false)} />}
      {saveDialogOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setSaveDialogOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Uložit rozvrh"
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold text-slate-800">Uložit rozvrh</h2>
              <button
                type="button"
                onClick={() => setSaveDialogOpen(false)}
                aria-label="Zavřít"
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <p className="px-4 pb-3 text-xs text-slate-500">
              Vyberte, co se má uložit do souboru (design_review_99.md).
            </p>
            <div className="flex-1 space-y-1 overflow-y-auto px-4 pb-2">
              <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                <input
                  type="radio"
                  name="save-scope"
                  checked={saveScope === 'family'}
                  onChange={() => setSaveScope('family')}
                />
                <span>Celá rodina</span>
              </label>
              {state.children.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="save-scope"
                    checked={saveScope === c.id}
                    onChange={() => setSaveScope(c.id)}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setSaveDialogOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (saveScope === 'family') {
                    downloadFamilyJson(state);
                    onMarkSaved();
                  } else {
                    const c = state.children.find((c) => c.id === saveScope);
                    if (c) downloadSingleChildJson(c, activeSchedule(state), catalog, state);
                  }
                  setSaveDialogOpen(false);
                }}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingImport && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setPendingImport(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Potvrdit import"
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold text-slate-800">Potvrdit import</h2>
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                aria-label="Zavřít"
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-3 text-sm text-slate-700">
              {pendingImport.kind === 'family' && (
                <>
                  <p>Soubor obsahuje CELÝ rodinný rozvrh — nahradí aktuální stav.</p>
                  <p className="text-xs text-slate-500">
                    Aktuální stav: {state.children.length} dětí, naposledy upraveno{' '}
                    {state.updatedAt ?? 'neznámo (starší formát)'}.
                  </p>
                  <p className="text-xs text-slate-500">
                    Soubor: {pendingImport.data.children.length} dětí, naposledy upraveno{' '}
                    {pendingImport.data.updatedAt ?? 'neznámo (starší formát)'}.
                  </p>
                </>
              )}
              {pendingImport.kind === 'single-child' && pendingImport.merge.resolution.kind === 'new-child' && (
                <p>
                  Přidat „{pendingImport.merge.nextState.children.find((c) => c.id === pendingImport.childId)?.name}"
                  jako nové dítě?
                </p>
              )}
              {pendingImport.kind === 'single-child' && pendingImport.merge.resolution.kind === 'name-mismatch' && (
                <p>
                  Importovaná data pro „{pendingImport.merge.resolution.sourceName}" sloučit do „
                  {pendingImport.merge.resolution.targetName}"?
                </p>
              )}
              {pendingImport.kind === 'single-child' && pendingImport.merge.resolution.kind === 'content-differs' && (
                <>
                  <p>
                    Data dítěte „{state.children.find((c) => c.id === pendingImport.childId)?.name}" v appce se
                    liší od dat v souboru — přesto přepsat?
                  </p>
                  <p className="text-xs text-slate-500">
                    Soubor exportován {pendingImport.sourceUpdatedAt ?? 'neznámo (starší formát)'}, aktuální data
                    upravena {state.updatedAt ?? 'neznámo (starší formát)'}.
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={pendingImport.kind === 'family' ? confirmFamilyImport : confirmSingleChildMerge}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                {pendingImport.kind === 'single-child' && pendingImport.merge.resolution.kind === 'new-child'
                  ? 'Přidat'
                  : pendingImport.kind === 'single-child' && pendingImport.merge.resolution.kind === 'name-mismatch'
                    ? 'Sloučit'
                    : 'Přepsat'}
              </button>
            </div>
          </div>
        </div>
      )}
      {iosExportLinks && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setIosExportLinks(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Otevřít kalendáře"
            onClick={(e) => e.stopPropagation()}
            className="glass flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-semibold text-slate-800">Otevřít kalendáře</h2>
              <button
                type="button"
                onClick={() => setIosExportLinks(null)}
                aria-label="Zavřít"
                className="flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <p className="px-4 pb-3 text-xs text-slate-500">
              Na iPhonu/iPadu se každý kalendář otevírá zvlášť — klepněte postupně na
              každý název, systém pak nabídne „Přidat do kalendáře".
            </p>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
              {iosExportLinks.map((l) => (
                <a
                  key={l.id}
                  href={l.href}
                  data-testid="ics-manual-link"
                  onClick={() => announce(`Kalendář „${l.name}“ otevřen`)}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 shadow-2xs hover:bg-blue-50"
                >
                  Otevřít „{l.name}“ v Kalendáři
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
      {printRangeAction && (
        <PrintRangeDialog
          title={printRangeAction === 'print' ? 'Tisk rozvrhu' : 'Obrázek rozvrhu (.png)'}
          confirmLabel={printRangeAction === 'print' ? 'Vytisknout' : 'Uložit obrázek'}
          onClose={() => setPrintRangeAction(null)}
          onConfirm={(range) => {
            if (printRangeAction === 'print') {
              printSchedule(gridRef.current, range);
            } else {
              void exportPng(range);
            }
            setPrintRangeAction(null);
          }}
        />
      )}
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
