'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  colorForActivity,
  relevantExceptionDates,
  type CustomEntry,
  type Weekday,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { useScheduleView, type Block } from '@/hooks/useScheduleView';
import { useIsMobile, useIsLandscapeCompact } from '@/hooks/useBreakpoint';
import { MonthView } from './MonthView';
import {
  HOUR_MARKS,
  HOUR_PX,
  DAY_WINDOW_START_MIN,
  DAY_WINDOW_END_MIN,
  WEEKDAYS,
  dateRangeLabel,
  formatTime,
  gridHeightPx,
  heightPx,
  isSameDay,
  isoDateOf,
  isoWeekdayOf,
  shiftAnchor,
  startOfIsoWeek,
  topPx,
  visibleDates,
  type ViewMode,
} from '@/lib/grid';
import { IconCalendar, IconPlus } from './Icons';

interface Ghost {
  activityId: string;
  groupId: string;
  weekday: Weekday;
  startMinutes: number;
  endMinutes: number;
  fill: string;
}

interface Positioned<T> {
  item: T;
  leftPct: number;
  widthPct: number;
}

/** Přiřadí překrývajícím se blokům v jednom dni pruhy vedle sebe (FR-9). */
function layoutDay<T extends { startMinutes: number; endMinutes: number }>(
  items: T[],
): Positioned<T>[] {
  const sorted = [...items].sort((a, b) => a.startMinutes - b.startMinutes);
  const laneEnds: number[] = [];
  const lane = new Map<T, number>();
  for (const item of sorted) {
    let assigned = laneEnds.findIndex((end) => end <= item.startMinutes);
    if (assigned === -1) {
      assigned = laneEnds.length;
      laneEnds.push(item.endMinutes);
    } else {
      laneEnds[assigned] = item.endMinutes;
    }
    lane.set(item, assigned);
  }
  const lanes = Math.max(1, laneEnds.length);
  return sorted.map((item) => ({
    item,
    leftPct: ((lane.get(item) ?? 0) / lanes) * 100,
    widthPct: (1 / lanes) * 100,
  }));
}

const VIEW_LABELS: Record<ViewMode, string> = {
  day: 'Den',
  '3day': '3 dny',
  week: 'Týden',
  month: 'Měsíc',
};

export function ScheduleGrid({
  gridRef,
  onAddFirstActivity,
}: {
  gridRef?: React.Ref<HTMLDivElement>;
  onAddFirstActivity?: () => void;
}) {
  const view = useScheduleView();
  const catalog = usePlannerStore((s) => s.catalog);
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const selectedCustomEntryId = usePlannerStore((s) => s.selectedCustomEntryId);
  const hoveredGroupId = usePlannerStore((s) => s.hoveredGroupId);
  const enrollGroup = usePlannerStore((s) => s.enrollGroup);
  const setHoveredGroup = usePlannerStore((s) => s.setHoveredGroup);
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const selectCustomEntry = usePlannerStore((s) => s.selectCustomEntry);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const children = usePlannerStore((s) => s.state.children);
  const enrollments = usePlannerStore((s) => activeSchedule(s.state).enrollments);
  const customEntries = usePlannerStore((s) => activeSchedule(s.state).customEntries);
  const updateCustomEntry = usePlannerStore((s) => s.updateCustomEntry);
  const exceptions = usePlannerStore((s) => s.exceptions);
  const districtCode = usePlannerStore((s) => s.state.districtCode);
  const focusWeekday = usePlannerStore((s) => s.focusWeekday);
  const focusNonce = usePlannerStore((s) => s.focusNonce);

  const [mode, setMode] = useState<ViewMode>('week');
  // BL-055 (design_review_87.md): hlídá, aby se jednorázový mobilní výchozí
  // pohled ('3day') nastavil jen JEDNOU, ne při každé změně `isMobile`.
  const appliedMobileDefaultRef = useRef(false);
  const [mobileAgendaMode, setMobileAgendaMode] = useState<'agenda' | 'calendar'>('agenda');
  // FR-W3-3 (design_review_73.md): překryv rozvrhů více dětí v jedné mřížce, ať rodič vidí
  // najednou, jestli obě děti stihne odvézt. Vypnuto výchozí, ať mřížka jednoho dítěte
  // nezůstala vizuálně přeplněná, když ji nikdo nepotřebuje.
  const [showFamily, setShowFamily] = useState(false);
  // FR-W3-1 (design_review_73.md): drag & drop pro vlastní události — katalogové kroužky
  // zůstávají needitovatelné (termín určuje poskytovatel), viz `item.activityId === undefined`
  // guard na místech použití. `dragRef` nese živý stav gesta (nepotřebuje re-render při
  // každém pixelu), `dragPreview` jen viditelnou náhledovou pozici.
  interface DragState {
    pointerId: number;
    entryId: string;
    sessionId: string;
    startClientX: number;
    startClientY: number;
    duration: number;
    dragging: boolean;
  }
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<{
    sessionId: string;
    weekday: Weekday;
    startMinutes: number;
    duration: number;
  } | null>(null);
  // Zdroj 768px zlomu je sdílený hook (FR-W1-1, design_review_73.md; BL-051 design_review_84.md).
  const isMobile = useIsMobile();
  // Mobil na šířku s málo výškou potřebuje nižší hustotu časové osy, jinak by
  // blok nebyl čitelný ani po odrolování (FR-W2-2, design_review_73.md).
  // M2 (design_review_86.md): 26px/h bylo POD hranicí, kde se do bloku vejde i
  // jeho vlastní čas (naměřeno 38px potřeba u hodinového bloku s p-1.5+název+čas)
  // — 34px navrhoval audit, ale naměřením vyšlo, že ještě těsně ořezává (38 vs
  // 34), 40px je nejnižší hustota, při které se čas vejde i s rezervou.
  const isLandscapeCompact = useIsLandscapeCompact();
  const hourPx = isLandscapeCompact ? 40 : HOUR_PX;
  // BL-053 (design_review_84.md): stejná záchranná síť jako mobilní FR-W2-3, jen s vyšším
  // prahem — sloupec dne nikdy neklesne pod 105px (T-200), přebytek vodorovně scrolluje
  // místo aby se sloupce stísnaly do nečitelna. Bez rizika pro současné šířky (dnešní
  // přirozené vyplnění je nad prahem), ale bezpečně umožňuje BL-051 (tabletové zlomy).
  const dayMinPx = isMobile ? 72 : 105;
  const [focusedCol, setFocusedCol] = useState(0);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // „Now“ čára (FR-2) — čas se čte v aplikaci, nikdy v doméně.
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    };
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // M5 (design_review_86.md; BL-055 design_review_87.md): sedm sloupců na mobilu
  // nikdy nejde vidět celé bez vodorovného scrollu — výchozí pohled na mobilu je
  // '3day' od PONDĜLÍ aktuálního týdne (ne od dneška), ať nově přidaná událost
  // (dialog výchozí na pondělí) nezmizela mimo výchozí okno beze změny navigace.
  // Ref hlídá, ať se pozdější ruční volba uživatele (jiný režim/den) nepřepsála zpět.
  useEffect(() => {
    if (isMobile && !appliedMobileDefaultRef.current) {
      appliedMobileDefaultRef.current = true;
      setMode('3day');
      setAnchorDate((prev) => startOfIsoWeek(prev));
    }
  }, [isMobile]);

  // Souhrn požádal o den (C8-B7): přepni na denní pohled zvoleného dne v týdnu.
  useEffect(() => {
    if (focusWeekday === null || focusNonce === 0) return;
    setMode('day');
    setMobileAgendaMode('calendar');
    setAnchorDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (focusWeekday - isoWeekdayOf(prev)));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce]);

  // Osa je celodenní (C11); po zobrazení mřížky odroluj na denní okno a
  // vycentruj aktuální čas, pokud je přes den (jinak střed okna 07–21).
  const hasBlocks = view.blocks.length > 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const focus =
      nowMinutes >= DAY_WINDOW_START_MIN && nowMinutes <= DAY_WINDOW_END_MIN
        ? nowMinutes
        : (DAY_WINDOW_START_MIN + DAY_WINDOW_END_MIN) / 2;
    const centered = topPx(focus, hourPx) + 26 - el.clientHeight / 2;
    el.scrollTop = Math.max(0, centered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasBlocks]);

  // Klávesové zkratky 1–4 přepnou pohled Den/3 dny/Týden/Měsíc (FR-W3-8,
  // design_review_73.md) — jen na desktopu, kde je přepínač vidět; na mobilu
  // `mode` řídí jen datový rozsah bez viditelného UI (přepínač je `!isMobile`).
  useEffect(() => {
    if (isMobile) return;
    const map: Record<string, ViewMode> = { '1': 'day', '2': '3day', '3': 'week', '4': 'month' };
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      setMode(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile]);

  const dates = visibleDates(mode, anchorDate);
  const holidayDates = useMemo(
    () => relevantExceptionDates(exceptions, districtCode),
    [exceptions, districtCode],
  );

  // FR-W3-1 (design_review_73.md): přesune JEN dotčenou session vlastní události (ne celý
  // zápis) — vícedenní vlastní událost má jednu session na den, drag jedné z nich nesmí
  // pohnout ostatními dny.
  const moveCustomEntrySession = (
    entryId: string,
    sessionId: string,
    weekday: Weekday,
    startMinutes: number,
    duration: number,
  ) => {
    const entry = customEntries.find((e) => e.id === entryId);
    if (!entry) return;
    const updated: CustomEntry = {
      ...entry,
      sessions: entry.sessions.map((s) =>
        s.id === sessionId ? { ...s, weekday, startMinutes, endMinutes: startMinutes + duration } : s,
      ),
    };
    updateCustomEntry(updated);
  };

  const DAY_MAX_MINUTES = 24 * 60;

  /** Klávesová obdoba drag & drop (POVINNÁ, FR-W3-1): ↑/↓ posune o 5 min, ←/→ o den.
   * `stopPropagation` — bez ní by bublalo do `role="grid"` listeneru, který ←/→ používá
   * pro navigaci mezi sloupci (T-304), ne pro posun události. */
  const handleBlockKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    item: Block,
  ) => {
    if (item.activityId !== undefined) return; // katalogové kroužky needitovatelné
    const duration = item.endMinutes - item.startMinutes;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.key === 'ArrowUp' ? -5 : 5;
      const next = Math.max(0, Math.min(DAY_MAX_MINUTES - duration, item.startMinutes + delta));
      moveCustomEntrySession(item.ownerId, item.sessionId, item.weekday, next, duration);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.key === 'ArrowLeft' ? -1 : 1;
      const next = Math.max(1, Math.min(7, item.weekday + delta)) as Weekday;
      moveCustomEntrySession(item.ownerId, item.sessionId, next, item.startMinutes, duration);
    }
  };

  /** Pointer drag & drop (FR-W3-1): práh 6px odliší tažení od kliknutí (ten dál otevírá
   * detail). Cílový den/čas se čte z `data-weekday` nejbližší buňky pod ukazatelem —
   * odolnější vůči zaokrouhlování šířek sloupců než ruční výpočet z `clientX`. */
  const handleBlockPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    item: Block,
  ) => {
    if (item.activityId !== undefined) return;
    // M6 (design_review_87.md, BL-056): zachytit pointer HNED, ne až po překročení
    // 6px prahu — úchyt je jen 16px vysoký/široký, takže tažení směrem od středu
    // opustí jeho hranice DřÍV, než vzdálenost dosáhne 6px — bez okamžitého capture by
    // další pointermove již cílil na element pod kurzorem, ne na úchyt, a tažení by
    // se nikdy nepotvrdilo (`d.dragging` by zůstalo `false`).
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      entryId: item.ownerId,
      sessionId: item.sessionId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      duration: item.endMinutes - item.startMinutes,
      dragging: false,
    };
  };

  const handleBlockPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.dragging && Math.hypot(dx, dy) < 6) return;
    if (!d.dragging) {
      d.dragging = true;
    }
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const cell = under?.closest<HTMLElement>('[data-weekday]');
    if (!cell) return;
    const weekday = Number(cell.dataset.weekday) as Weekday;
    const rect = cell.getBoundingClientRect();
    const rawMinutes = ((e.clientY - rect.top - 26) / hourPx) * 60;
    const snapped = Math.round(rawMinutes / 5) * 5;
    const clamped = Math.max(0, Math.min(DAY_MAX_MINUTES - d.duration, snapped));
    setDragPreview({ sessionId: d.sessionId, weekday, startMinutes: clamped, duration: d.duration });
  };

  const handleBlockPointerUp = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (d.dragging) {
      const preview = dragPreview;
      setDragPreview(null);
      suppressClickRef.current = true;
      if (preview && preview.sessionId === d.sessionId) {
        moveCustomEntrySession(d.entryId, d.sessionId, preview.weekday, preview.startMinutes, d.duration);
      }
    }
  };

  // Skupiny této aktivity, které už jsou zapsané — jejich duchy neukazujeme (FR-3).
  const enrolledGroupIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of enrollments) {
      if (e.childId === activeChildId && e.activityId === selectedActivityId) {
        set.add(e.sessionGroupId);
      }
    }
    return set;
  }, [enrollments, activeChildId, selectedActivityId]);

  const ghosts: Ghost[] = useMemo(() => {
    if (!selectedActivityId) return [];
    const color = colorForActivity(selectedActivityId);
    return catalog.sessionGroups
      .filter((g) => g.activityId === selectedActivityId)
      .flatMap((g) =>
        g.sessions.map((s) => ({
          activityId: selectedActivityId,
          groupId: g.id,
          weekday: s.weekday,
          startMinutes: s.startMinutes,
          endMinutes: s.endMinutes,
          fill: color.fill,
        })),
      );
  }, [selectedActivityId, catalog]);

  const agendaItems = useMemo(
    () =>
      [...view.blocks].sort(
        (a, b) => a.weekday - b.weekday || a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes,
      ),
    [view.blocks],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Ovládání pohledu (FR-6) */}
      <div className="no-print mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Přepínač Den/3 dny/Týden/Měsíc (M5, design_review_86.md): dřív jen na desktopu —
              mobil tak neměl jak uniknout ze sedmidenního týdne, který se nikdy nevejde bez
              vodorovného scrollu. Výchozí hodnota pro mobil se nastavuje níže na '3day'. */}
          <div className="inline-flex rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 text-xs shadow-2xs">
            {(['day', '3day', 'week', 'month'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={clsx(
                  'rounded-md px-3 py-1 font-medium transition',
                  mode === m
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {VIEW_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Navigace pro všechny pohledy */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchorDate((d) => shiftAnchor(mode, d, -1))}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition desk:h-7 desk:w-7"
              aria-label="Předchozí"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(new Date())}
              className="flex h-11 items-center justify-center rounded-lg border border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition desk:h-7"
            >
              Dnes
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate((d) => shiftAnchor(mode, d, 1))}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition desk:h-7 desk:w-7"
              aria-label="Další"
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700" data-testid="view-range">
          <IconCalendar className="h-3.5 w-3.5 text-slate-500" />
          <span>{dateRangeLabel(mode, anchorDate)}</span>
        </div>
      </div>

      {/* FR-W3-3 (design_review_73.md): jen když je víc než 1 dítě a jsme v pohledu
          s mřížkou (ta má prostor pro překryv) — mobilní Agenda (seznam) ho nemá.
          M8 (design_review_86.md): dřív šlo jen o `!isMobile`, takže "stihnu odvézt
          obě děti" — nejsilnější mobilní úloha vůbec — nebyla na mobilu dostupná
          vůbec, i když mobilní Mřížka (mobileAgendaMode==='calendar') prostor má. */}
      {children.length > 1 && (!isMobile || mobileAgendaMode === 'calendar') && (
        <div className="no-print mb-2">
          <button
            type="button"
            aria-pressed={showFamily}
            onClick={() => setShowFamily((v) => !v)}
            className={clsx(
              'rounded-full border px-2.5 py-0.5 text-xs font-medium transition',
              showFamily
                ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            👪 Zobrazit i sourozence
          </button>
        </div>
      )}

      <div className="print-only mb-2 text-lg font-semibold">
        Rozvrh — {view.childName} · {view.scheduleName}
      </div>

      {isMobile && (
        <div
          role="tablist"
          aria-label="Zobrazení rozvrhu"
          className="no-print mb-2 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/70 p-1 text-sm shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileAgendaMode === 'agenda'}
            onClick={() => setMobileAgendaMode('agenda')}
            className={clsx(
              'flex flex-1 items-center justify-center h-11 rounded-lg text-xs font-medium transition',
              mobileAgendaMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Agenda
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileAgendaMode === 'calendar'}
            onClick={() => setMobileAgendaMode('calendar')}
            className={clsx(
              'flex flex-1 items-center justify-center h-11 rounded-lg text-xs font-medium transition',
              mobileAgendaMode === 'calendar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Mřížka
          </button>
        </div>
      )}

      {view.blocks.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white p-8 shadow-xs">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-xs">
              <IconCalendar className="h-6 w-6" />
            </div>
            <h2 className="mt-3 text-lg font-bold text-slate-900">Rozvrh je zatím prázdný</h2>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Vyberte v katalogu nalevo zájmové kroužky pro dítě a rozvrh vám okamžitě ukáže časovou osu i případné kolize.
            </p>
            <button
              type="button"
              onClick={onAddFirstActivity}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <IconPlus className="h-4 w-4" />
              <span>Přidat první kroužek</span>
            </button>
            <div className="mt-6 rounded-xl bg-slate-50 p-3 text-left text-xs text-slate-600 border border-slate-100">
              <span className="font-semibold text-slate-700 block mb-1">Rychlé tipy:</span>
              <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-500">
                <li>Kliknutím na kroužek v katalogu otevřete jeho detail a termíny.</li>
                <li>Změny se automaticky ukládají v prohlížeči.</li>
                <li>Hotový rozvrh můžete exportovat do Apple / Google Kalendáře (.ics).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {view.blocks.length > 0 && (
        <>
          {isMobile && mobileAgendaMode === 'agenda' ? (
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-2">
              {agendaItems.map((item) => {
                const isSelected =
                  (item.activityId && item.activityId === selectedActivityId) ||
                  (item.ownerId && item.ownerId === selectedCustomEntryId);
                return (
                  <button
                    key={item.sessionId}
                    type="button"
                    onClick={() =>
                      item.activityId
                        ? selectActivity(item.activityId)
                        : selectCustomEntry(item.ownerId)
                    }
                    className={clsx(
                      'w-full rounded-xl border p-3 text-left transition shadow-2xs',
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{WEEKDAYS[item.weekday - 1]?.long}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                        {formatTime(item.startMinutes)}–{formatTime(item.endMinutes)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                      {/* Konfliktní odznak (FR-11, design_review_65.md): dřív chyběl v Agendě, jen v mřížce. */}
                      {item.hasHardConflict && (
                        <span
                          data-testid="agenda-hard-conflict-badge"
                          className="ml-auto shrink-0 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white"
                          title={item.conflictMessage ?? 'Tvrdý konflikt'}
                        >
                          Kolize
                        </span>
                      )}
                      {item.hasSoftConflict && !item.hasHardConflict && (
                        <span
                          data-testid="agenda-soft-conflict-badge"
                          className="ml-auto shrink-0 text-amber-500"
                          title={item.conflictMessage ?? 'Upozornění'}
                        >
                          ●
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : mode === 'month' ? (
            <div
              ref={gridRef}
              className="print-grid flex-1 overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs"
            >
              <MonthView blocks={view.blocks} anchorDate={anchorDate} />
            </div>
          ) : (
            <div
              ref={gridRef}
              className="print-grid flex flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"
            >
              {/* Textová souhrnná alternativa pro čtečky obrazovky (FR-W3-5,
                  design_review_73.md): vizuální mřížka má dny vedle sebe v JEDNOM
                  `role="row"` — čtečka by ohlásila „řádek 1 z 1", což je zavádějící.
                  Přepsat mřížku na poctivé řádky-po-hodinách by vyžadovalo změnit
                  `gridcell` model z „den" na „den×hodina" a rozbilo by desítky
                  testů vázaných na dnešní `getByRole('gridcell', {{name: den}})` —
                  proto radši PŘIDAT čitelnou alternativu, ne měnit stávající
                  strukturu (mřížka i klávesová navigace šipkami zůstávají beze
                  změny, viz design_review_75.md §0.3 pro obdobné odůvodnění). */}
              <div className="sr-only" aria-live="off">
                <h3>Rozvrh — textový souhrn</h3>
                {agendaItems.length === 0 ? (
                  <p>V zobrazeném rozsahu nejsou žádné kroužky.</p>
                ) : (
                  <ul>
                    {agendaItems.map((item) => (
                      <li key={`sr-${item.sessionId}`}>
                        {WEEKDAYS[item.weekday - 1]?.long} {formatTime(item.startMinutes)}–
                        {formatTime(item.endMinutes)}: {item.label}
                        {item.hasHardConflict ? `, tvrdý konflikt: ${item.conflictMessage ?? ''}` : ''}
                        {item.hasSoftConflict && !item.hasHardConflict ? ', upozornění na kolizi' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div ref={scrollRef} className="flex flex-1 overflow-y-auto overflow-x-auto">
                {/* Časová osa 00:00–24:00. `sticky`, ať zůstává viditelná při vodorovném
                    scrollu pevně širokých sloupců dnů — mobil FR-W2-3, desktop/medium BL-053. */}
                <div
                  className="relative w-10 shrink-0 sticky left-0 z-10 border-r border-slate-100 bg-white text-[11px] tabular-nums text-slate-500 font-medium"
                  style={{ height: gridHeightPx(hourPx) + 26 }}
                >
                  {HOUR_MARKS.map((m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 -translate-y-1/2 pl-1.5 text-slate-400"
                      style={{ top: topPx(m, hourPx) + 26 }}
                    >
                      {formatTime(m)}
                    </div>
                  ))}
                </div>

                {/* Dny. Na mobilu mají sloupce pevnou minimální šířku a přebytek
                    scrolluje vodorovně, místo aby se při 7 sloupcích stísnaly do
                    nečitelných ~23px (FR-W2-3, design_review_73.md). */}
                <div
                  className={clsx(isMobile ? 'shrink-0' : 'flex-1')}
                  style={{
                    height: gridHeightPx(hourPx) + 26,
                    minWidth: dates.length * dayMinPx,
                  }}
                  role="grid"
                  aria-label="Rozvrh"
                  onKeyDown={(e) => {
                    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                    e.preventDefault();
                    setFocusedCol((c) => {
                      const next =
                        e.key === 'ArrowRight'
                          ? Math.min(c + 1, dates.length - 1)
                          : Math.max(c - 1, 0);
                      cellRefs.current[next]?.focus();
                      return next;
                    });
                  }}
                >
                  <div
                    role="row"
                    className="grid h-full"
                    style={{
                      gridTemplateColumns: `repeat(${dates.length}, minmax(${dayMinPx}px, 1fr))`,
                    }}
                  >
                  {dates.map((date, idx) => {
                    const weekday = isoWeekdayOf(date);
                    const info = WEEKDAYS[weekday - 1]!;
                    const iso = isoDateOf(date);
                    const holiday = holidayDates.has(iso);
                    const isToday = isSameDay(date, today);
                    // Potlačí katalogové zápisy o prázdninách/svátcích bez override (design_review_68.md
                    // FR-5); CustomEntry (activityId undefined) se nikdy nepotlačuje (§3 Non-goals).
                    const dayBlocks = view.blocks.filter(
                      (b) =>
                        b.weekday === weekday &&
                        !(holiday && b.activityId !== undefined && !b.allowOnHolidays),
                    );
                    const positioned = layoutDay<Block>(dayBlocks);
                    const dayGhosts = ghosts.filter(
                      (g) => g.weekday === weekday && !enrolledGroupIds.has(g.groupId),
                    );
                    const dayFamilyBlocks = showFamily
                      ? view.familyBlocks.filter((b) => b.weekday === weekday)
                      : [];
                    return (
                      <div
                        key={iso}
                        role="gridcell"
                        ref={(el) => {
                          cellRefs.current[idx] = el;
                        }}
                        tabIndex={idx === focusedCol ? 0 : -1}
                        aria-label={`${info.long} ${date.getDate()}.${date.getMonth() + 1}.`}
                        onFocus={() => setFocusedCol(idx)}
                        data-weekday={weekday}
                        className={clsx(
                          'relative border-r border-slate-100 last:border-r-0',
                          holiday && 'bg-slate-50/60',
                        )}
                      >
                        <div
                          className={clsx(
                            'sticky top-0 z-10 border-b border-slate-100 py-1.5 text-center text-xs font-semibold transition',
                            isToday
                              ? 'bg-blue-50 text-blue-800'
                              : holiday
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-50/80 text-slate-700',
                          )}
                          title={holiday ? 'Svátek nebo prázdniny' : undefined}
                        >
                          <span className={isToday ? 'inline-block rounded-full bg-blue-600 px-2 py-0.5 text-white' : ''}>
                            {info.short} {date.getDate()}.{date.getMonth() + 1}.
                          </span>
                        </div>
                        {HOUR_MARKS.map((m) => (
                          <div
                            key={m}
                            className="pointer-events-none absolute left-0 right-0 border-t border-slate-100"
                            style={{ top: topPx(m, hourPx) + 26 }}
                          />
                        ))}

                        {/* „Now“ čára jen na dnešním sloupci (FR-2) */}
                        {isToday && (
                          <div
                            data-testid="now-line"
                            className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                            style={{ top: topPx(nowMinutes, hourPx) + 26 }}
                          >
                            <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white shadow-xs" />
                          </div>
                        )}

                        {/* Duchové (možné termíny) */}
                        {dayGhosts.map((g, i) => {
                          const dim = hoveredGroupId && hoveredGroupId !== g.groupId;
                          return (
                            <button
                              key={`${g.groupId}-${i}`}
                              type="button"
                              onMouseEnter={() => setHoveredGroup(g.groupId)}
                              onMouseLeave={() => setHoveredGroup(null)}
                              onClick={() => enrollGroup(g.activityId, g.groupId)}
                              className={clsx(
                                'absolute rounded-lg border-2 border-dashed text-[10px] transition-all duration-150 hover:opacity-90',
                                dim ? 'opacity-20' : 'opacity-60',
                              )}
                              style={{
                                top: topPx(g.startMinutes, hourPx) + 26,
                                height: heightPx(g.startMinutes, g.endMinutes, hourPx),
                                left: '4%',
                                width: '92%',
                                borderColor: g.fill,
                                backgroundColor: `${g.fill}15`,
                              }}
                              title="Klikněte pro výběr této varianty"
                            />
                          );
                        })}

                        {/* Vybrané bloky */}
                        {positioned.map(({ item, leftPct, widthPct }) => {
                          const isSelected =
                            (item.activityId && item.activityId === selectedActivityId) ||
                            (item.ownerId && item.ownerId === selectedCustomEntryId);
                          const isDraggable = item.activityId === undefined;
                          const isBeingDragged = dragPreview?.sessionId === item.sessionId;
                          return (
                            <button
                              key={item.sessionId}
                              type="button"
                              onClick={() => {
                                if (suppressClickRef.current) {
                                  suppressClickRef.current = false;
                                  return;
                                }
                                item.activityId
                                  ? selectActivity(item.activityId)
                                  : selectCustomEntry(item.ownerId);
                              }}
                              onKeyDown={(e) => handleBlockKeyDown(e, item)}
                              title={
                                isDraggable
                                  ? 'Vlastní událost — upravte šipkami nebo přetáhněte za úchyt ⠿'
                                  : undefined
                              }
                              className={clsx(
                                'absolute overflow-hidden rounded-lg p-1.5 text-left text-[11px] leading-tight shadow-sm transition motion-safe:animate-[blockIn_180ms_ease-out]',
                                isSelected && 'ring-2 ring-blue-600 ring-offset-1 z-10 shadow-md',
                                isBeingDragged && 'opacity-40',
                              )}
                              style={{
                                top: topPx(item.startMinutes, hourPx) + 26,
                                height: heightPx(item.startMinutes, item.endMinutes, hourPx),
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                backgroundColor: item.fill,
                                color: item.text,
                              }}
                            >
                              <div className="font-bold truncate">{item.label}</div>
                              <div className="text-[10px] opacity-90 font-medium">
                                {formatTime(item.startMinutes)}–{formatTime(item.endMinutes)}
                              </div>
                              {isDraggable && (
                                /* M6 (design_review_87.md, BL-056): tažení jde jen z malého úchytu, ne
                                   z celé plochy bloku — `touch-action:none` na CELÉM bloku by prstem
                                   vypnulo scroll mřížky kdekoli na dlouhé události (např. „Škola" 6 h).
                                   Úchyt zůstává dost malý, aby většina plochy zůstala scrollovatelná. */
                                <span
                                  data-testid="drag-handle"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    handleBlockPointerDown(e, item);
                                  }}
                                  onPointerMove={handleBlockPointerMove}
                                  onPointerUp={handleBlockPointerUp}
                                  className="absolute bottom-0.5 left-0.5 flex h-4 w-4 cursor-grab touch-none items-center justify-center rounded text-[10px] leading-none opacity-70 active:cursor-grabbing"
                                  title="Přetáhnout na jiný den/čas"
                                  aria-hidden
                                >
                                  ⠿
                                </span>
                              )}
                              {item.hasHardConflict && (
                                <span
                                  className="conflict-stripes pointer-events-none absolute inset-0 rounded-lg"
                                  aria-hidden
                                />
                              )}
                              {item.hasHardConflict && (
                                <span data-testid="grid-hard-conflict-badge" className="absolute right-1 top-1 rounded bg-red-600/90 text-white px-1 text-[10px] font-bold" title={item.conflictMessage ?? 'Tvrdý konflikt'}>
                                  ⚠
                                </span>
                              )}
                              {item.hasSoftConflict && !item.hasHardConflict && (
                                <span
                                  data-testid="grid-soft-conflict-badge"
                                  className="absolute right-1 top-1 text-amber-300"
                                  title={item.conflictMessage ?? 'Upozornění'}
                                  aria-hidden
                                >
                                  ●
                                </span>
                              )}
                              {item.ownerKind === 'custom' && (
                                <span className="absolute bottom-1 right-1 opacity-75" title="Vlastní událost">
                                  ✎
                                </span>
                              )}
                              {showFamily && item.familyOverlapMessage && (
                                <span
                                  data-testid="family-overlap-badge"
                                  className="absolute left-1 top-1 text-[10px]"
                                  title={item.familyOverlapMessage}
                                  aria-hidden
                                >
                                  👪
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {/* FR-W3-1 (design_review_73.md): náhled cílové pozice během tažení. */}
                        {dragPreview && dragPreview.weekday === weekday && (
                          <div
                            data-testid="drag-preview"
                            className="pointer-events-none absolute rounded-lg border-2 border-dashed border-blue-500 bg-blue-500/15"
                            style={{
                              top: topPx(dragPreview.startMinutes, hourPx) + 26,
                              height: heightPx(dragPreview.startMinutes, dragPreview.startMinutes + dragPreview.duration, hourPx),
                              left: '2%',
                              width: '96%',
                            }}
                          />
                        )}

                        {/* FR-W3-3 (design_review_73.md): překryvová vrstva termínů ostatních dětí —
                            neinteraktivní, ať rodič vidí obě děti najednou bez rizika záměny kliku. */}
                        {dayFamilyBlocks.map((fb) => (
                          <div
                            key={fb.sessionId}
                            data-testid="family-block"
                            className="pointer-events-none absolute overflow-hidden rounded-lg border-2 border-dashed p-1 text-left text-[10px] leading-tight opacity-70"
                            title={`${fb.childName}: ${fb.label}`}
                            style={{
                              top: topPx(fb.startMinutes, hourPx) + 26,
                              height: heightPx(fb.startMinutes, fb.endMinutes, hourPx),
                              left: '2%',
                              width: '96%',
                              borderColor: fb.fill,
                              backgroundColor: `${fb.fill}22`,
                            }}
                          >
                            <div className="font-bold truncate" style={{ color: fb.fill }}>
                              {fb.childName}: {fb.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {view.blocks.length > 0 && (
        <div className="print-summary print-only mt-3 rounded border border-slate-300 bg-white p-2">
          <h3 className="mb-2 text-sm font-semibold">Přehled kroužků</h3>
          <table className="print-summary-table w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-slate-300 px-1 py-1 text-left">Název</th>
                <th className="border border-slate-300 px-1 py-1 text-left">Den</th>
                <th className="border border-slate-300 px-1 py-1 text-left">Čas</th>
              </tr>
            </thead>
            <tbody>
              {agendaItems.map((item) => (
                <tr key={`print-${item.sessionId}`}>
                  <td className="border border-slate-300 px-1 py-1">{item.label}</td>
                  <td className="border border-slate-300 px-1 py-1">{WEEKDAYS[item.weekday - 1]?.long}</td>
                  <td className="border border-slate-300 px-1 py-1">
                    {formatTime(item.startMinutes)}–{formatTime(item.endMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
