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

export function ScheduleGrid({ gridRef }: { gridRef?: React.Ref<HTMLDivElement> }) {
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

  const [mode, setMode] = useState<ViewMode>('week');
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

  // Vycentruj aktuální čas do prostřed viewportu (FR-1).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const centered = topPx(nowMinutes) + 26 - el.clientHeight / 2;
    el.scrollTop = Math.max(0, centered);
    // závislé jen na režimu — nechceme přerolovat při každé minutě
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
        <span className="text-sm text-slate-500" data-testid="view-range">
          {dateRangeLabel(mode, anchorDate)}
        </span>
      </div>

      <div className="print-only mb-2 text-lg font-semibold">
        Rozvrh — {view.childName} · {view.scheduleName}
      </div>

      {mode === 'month' ? (
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
              className="relative w-12 shrink-0 border-r border-slate-100 text-[11px] text-slate-400"
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
              className="grid flex-1"
              style={{
                height: GRID_HEIGHT_PX + 26,
                gridTemplateColumns: `repeat(${dates.length}, minmax(0, 1fr))`,
              }}
              role="grid"
              aria-label="Rozvrh"
            >
              {dates.map((date) => {
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
                            ? 'bg-slate-100 text-slate-400'
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
                        className="absolute overflow-hidden rounded px-1 py-0.5 text-left text-[10px] leading-tight shadow-sm"
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
      )}
    </div>
  );
}
