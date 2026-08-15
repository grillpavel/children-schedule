'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  colorForActivity,
  relevantExceptionDates,
  type Weekday,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { useScheduleView, type Block } from '@/hooks/useScheduleView';
import { MonthView } from './MonthView';
import {
  GRID_HEIGHT_PX,
  HOUR_MARKS,
  DAY_WINDOW_START_MIN,
  DAY_WINDOW_END_MIN,
  WEEKDAYS,
  dateRangeLabel,
  formatTime,
  heightPx,
  isSameDay,
  isoDateOf,
  isoWeekdayOf,
  shiftAnchor,
  topPx,
  visibleDates,
  type ViewMode,
} from '@/lib/grid';

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
  const hoveredGroupId = usePlannerStore((s) => s.hoveredGroupId);
  const enrollGroup = usePlannerStore((s) => s.enrollGroup);
  const setHoveredGroup = usePlannerStore((s) => s.setHoveredGroup);
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const selectCustomEntry = usePlannerStore((s) => s.selectCustomEntry);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const enrollments = usePlannerStore((s) => activeSchedule(s.state).enrollments);
  const exceptions = usePlannerStore((s) => s.exceptions);
  const districtCode = usePlannerStore((s) => s.state.districtCode);
  const focusWeekday = usePlannerStore((s) => s.focusWeekday);
  const focusNonce = usePlannerStore((s) => s.focusNonce);

  const [mode, setMode] = useState<ViewMode>('week');
  const [mobileAgendaMode, setMobileAgendaMode] = useState<'agenda' | 'calendar'>('agenda');
  const [isMobile, setIsMobile] = useState(false);
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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 899.98px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

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
    const centered = topPx(focus) + 26 - el.clientHeight / 2;
    el.scrollTop = Math.max(0, centered);
    // závislé jen na režimu a zobrazení mřížky — nepřerolovat každou minutu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hasBlocks]);

  const dates = visibleDates(mode, anchorDate);
  const holidayDates = useMemo(
    () => relevantExceptionDates(exceptions, districtCode),
    [exceptions, districtCode],
  );

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
      <div className="no-print mb-2 flex items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-sm">
          {(['day', '3day', 'week', 'month'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={clsx(
                'px-3 py-1',
                mode === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600',
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
            className="rounded px-2 py-1 text-sm hover:bg-slate-100"
            aria-label="Předchozí"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(new Date())}
            className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-100"
          >
            Dnes
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate((d) => shiftAnchor(mode, d, 1))}
            className="rounded px-2 py-1 text-sm hover:bg-slate-100"
            aria-label="Další"
          >
            ›
          </button>
        </div>
        <span className="text-sm text-slate-600" data-testid="view-range">
          {dateRangeLabel(mode, anchorDate)}
        </span>
      </div>

      <div className="print-only mb-2 text-lg font-semibold">
        Rozvrh — {view.childName} · {view.scheduleName}
      </div>

      {isMobile && (
        <div
          role="tablist"
          aria-label="Zobrazení rozvrhu"
          className="no-print mb-2 flex items-center gap-1 rounded-lg border border-slate-200 p-1 text-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileAgendaMode === 'agenda'}
            onClick={() => setMobileAgendaMode('agenda')}
            className={clsx(
              'flex-1 rounded px-2 py-1',
              mobileAgendaMode === 'agenda' ? 'bg-slate-800 text-white' : 'text-slate-600',
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
              'flex-1 rounded px-2 py-1',
              mobileAgendaMode === 'calendar' ? 'bg-slate-800 text-white' : 'text-slate-600',
            )}
          >
            Mřížka
          </button>
        </div>
      )}

      {view.blocks.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-slate-800">Rozvrh je zatím prázdný</h2>
            <p className="mt-2 text-sm text-slate-600">
              Přidejte první kroužek z katalogu vlevo a hned uvidíte kolize i volné dny.
            </p>
            <button
              type="button"
              onClick={onAddFirstActivity}
              className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Přidat první kroužek
            </button>
            <ul className="mt-4 text-left text-xs text-slate-500">
              <li>Tip: klik na kartu kroužku otevře detail vpravo.</li>
              <li>Tip: tlačítko + na kartě kroužek rovnou přidá do rozvrhu.</li>
              <li>Tip: po změnách rozvrh uložte přes tlačítko Uložit.</li>
            </ul>
          </div>
        </div>
      )}

      {view.blocks.length > 0 && (
        <>
          {isMobile && mobileAgendaMode === 'agenda' ? (
            <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {agendaItems.map((item) => (
                <button
                  key={item.sessionId}
                  type="button"
                  onClick={() =>
                    item.activityId
                      ? selectActivity(item.activityId)
                      : selectCustomEntry(item.ownerId)
                  }
                  className="mb-2 w-full rounded-md border border-slate-200 px-3 py-2 text-left"
                >
                  <div className="text-xs text-slate-500">
                    {WEEKDAYS[item.weekday - 1]?.long} · {formatTime(item.startMinutes)}–{formatTime(item.endMinutes)}
                  </div>
                  <div className="text-sm font-medium" style={{ color: item.fill }}>
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          ) : mode === 'month' ? (
            <div
              ref={gridRef}
              className="print-grid flex-1 overflow-auto rounded-lg border border-slate-200 bg-white"
            >
              <MonthView blocks={view.blocks} anchorDate={anchorDate} />
            </div>
          ) : (
            <div
              ref={gridRef}
              className="print-grid flex flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
                {/* Časová osa 00:00–24:00 */}
                <div
                  className="relative w-12 shrink-0 border-r border-slate-100 text-[11px] tabular-nums text-slate-600"
                  style={{ height: GRID_HEIGHT_PX + 26 }}
                >
                  {HOUR_MARKS.map((m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 -translate-y-1/2 pl-1"
                      style={{ top: topPx(m) + 26 }}
                    >
                      {formatTime(m)}
                    </div>
                  ))}
                </div>

                {/* Dny */}
                <div
                  className="flex-1"
                  style={{ height: GRID_HEIGHT_PX + 26 }}
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
                      gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`,
                    }}
                  >
                  {dates.map((date, idx) => {
                    const weekday = isoWeekdayOf(date);
                    const info = WEEKDAYS[weekday - 1]!;
                    const iso = isoDateOf(date);
                    const holiday = holidayDates.has(iso);
                    const isToday = isSameDay(date, today);
                    const dayBlocks = view.blocks.filter((b) => b.weekday === weekday);
                    const positioned = layoutDay<Block>(dayBlocks);
                    const dayGhosts = ghosts.filter(
                      (g) => g.weekday === weekday && !enrolledGroupIds.has(g.groupId),
                    );
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
                        className={clsx(
                          'relative border-r border-slate-100 last:border-r-0',
                          holiday && 'bg-slate-50',
                        )}
                      >
                        <div
                          className={clsx(
                            'sticky top-0 z-10 border-b border-slate-100 py-1 text-center text-xs font-medium',
                            isToday
                              ? 'bg-red-50 text-red-700'
                              : holiday
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-slate-50 text-slate-600',
                          )}
                          title={holiday ? 'Svátek nebo prázdniny' : undefined}
                        >
                          {info.short} {date.getDate()}.{date.getMonth() + 1}.
                        </div>
                        {HOUR_MARKS.map((m) => (
                          <div
                            key={m}
                            className="absolute left-0 right-0 border-t border-slate-50"
                            style={{ top: topPx(m) + 26 }}
                          />
                        ))}

                        {/* „Now“ čára jen na dnešním sloupci (FR-2) */}
                        {isToday && (
                          <div
                            data-testid="now-line"
                            className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                            style={{ top: topPx(nowMinutes) + 26 }}
                          >
                            <span className="absolute -left-0 -top-1 h-2 w-2 rounded-full bg-red-500" />
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
                                'absolute rounded border-2 border-dashed text-[10px] transition-opacity',
                                dim ? 'opacity-20' : 'opacity-60',
                              )}
                              style={{
                                top: topPx(g.startMinutes) + 26,
                                height: heightPx(g.startMinutes, g.endMinutes),
                                left: '4%',
                                width: '92%',
                                borderColor: g.fill,
                              }}
                              title="Klikněte pro výběr této varianty"
                            />
                          );
                        })}

                        {/* Vybrané bloky */}
                        {positioned.map(({ item, leftPct, widthPct }) => (
                          <button
                            key={item.sessionId}
                            type="button"
                            onClick={() =>
                              item.activityId
                                ? selectActivity(item.activityId)
                                : selectCustomEntry(item.ownerId)
                            }
                            className="absolute overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm motion-safe:animate-[blockIn_180ms_ease-out]"
                            style={{
                              top: topPx(item.startMinutes) + 26,
                              height: heightPx(item.startMinutes, item.endMinutes),
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              backgroundColor: item.fill,
                              color: item.text,
                            }}
                          >
                            <span className="font-medium">{item.label}</span>
                            <br />
                            {formatTime(item.startMinutes)}–{formatTime(item.endMinutes)}
                            {item.hasHardConflict && (
                              <span
                                className="conflict-stripes pointer-events-none absolute inset-0"
                                aria-hidden
                              />
                            )}
                            {item.hasHardConflict && (
                              <span className="absolute right-0.5 top-0.5" title="Tvrdý konflikt">
                                ⚠
                              </span>
                            )}
                            {item.hasSoftConflict && !item.hasHardConflict && (
                              <span
                                className="absolute right-0.5 top-0.5 text-amber-300"
                                title="Upozornění"
                                aria-hidden
                              >
                                ●
                              </span>
                            )}
                            {item.ownerKind === 'custom' && (
                              <span className="absolute bottom-0.5 right-0.5" title="Vlastní událost">
                                ✎
                              </span>
                            )}
                          </button>
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
