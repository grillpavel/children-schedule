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
import { useIsMobile } from '@/hooks/useBreakpoint';
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
  const enrollments = usePlannerStore((s) => activeSchedule(s.state).enrollments);
  const exceptions = usePlannerStore((s) => s.exceptions);
  const districtCode = usePlannerStore((s) => s.state.districtCode);
  const focusWeekday = usePlannerStore((s) => s.focusWeekday);
  const focusNonce = usePlannerStore((s) => s.focusNonce);

  const [mode, setMode] = useState<ViewMode>('week');
  const [mobileAgendaMode, setMobileAgendaMode] = useState<'agenda' | 'calendar'>('agenda');
  // Zdroj 900px zlomu je sdílený hook (FR-W1-1, design_review_73.md).
  const isMobile = useIsMobile();
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
      <div className="no-print mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Přepínač Den/3 dny/Týden/Měsíc jen na desktopu */}
          {!isMobile && (
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
          )}

          {/* Navigace pro všechny pohledy */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchorDate((d) => shiftAnchor(mode, d, -1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition"
              aria-label="Předchozí"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(new Date())}
              className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              Dnes
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate((d) => shiftAnchor(mode, d, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition"
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
              <div ref={scrollRef} className="flex flex-1 overflow-y-auto">
                {/* Časová osa 00:00–24:00 */}
                <div
                  className="relative w-10 shrink-0 border-r border-slate-100 text-[11px] tabular-nums text-slate-500 font-medium"
                  style={{ height: GRID_HEIGHT_PX + 26 }}
                >
                  {HOUR_MARKS.map((m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 -translate-y-1/2 pl-1.5 text-slate-400"
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
                            className="absolute left-0 right-0 border-t border-slate-100"
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
                                top: topPx(g.startMinutes) + 26,
                                height: heightPx(g.startMinutes, g.endMinutes),
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
                                'absolute overflow-hidden rounded-lg p-1.5 text-left text-[11px] leading-tight shadow-sm transition motion-safe:animate-[blockIn_180ms_ease-out]',
                                isSelected && 'ring-2 ring-blue-600 ring-offset-1 z-10 shadow-md',
                              )}
                              style={{
                                top: topPx(item.startMinutes) + 26,
                                height: heightPx(item.startMinutes, item.endMinutes),
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
                            </button>
                          );
                        })}
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
