'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { relevantExceptionReasons, type Weekday } from '@krouzky/domain';
import { usePlannerStore } from '@/store/plannerStore';
import type { Block } from '@/hooks/useScheduleView';
import { WEEKDAYS, formatTime } from '@/lib/grid';

function isoWeekdayOf(date: Date): Weekday {
  const d = date.getDay();
  return (d === 0 ? 7 : d) as Weekday;
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Měsíční přehled zvoleného měsíce (`anchorDate`). Rozvrh je týdenní šablona,
 * takže se promítne do měsíce: každý den ukáže kroužky svého dne v týdnu
 * a svátky/prázdniny jsou ztlumené. Navigace je v liště nad mřížkou.
 */
export function MonthView({
  blocks,
  anchorDate,
}: {
  blocks: Block[];
  anchorDate: Date;
}) {
  const exceptions = usePlannerStore((s) => s.exceptions);
  const districtCode = usePlannerStore((s) => s.state.districtCode);
  const schoolYear = usePlannerStore((s) => s.state.schoolYear);

  const holidays = useMemo(
    () => relevantExceptionReasons(exceptions, districtCode),
    [exceptions, districtCode],
  );

  const blocksByDay = useMemo(() => {
    const map = new Map<Weekday, Block[]>();
    for (const b of blocks) {
      const list = map.get(b.weekday) ?? [];
      list.push(b);
      map.set(b.weekday, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startMinutes - b.startMinutes);
    }
    return map;
  }, [blocks]);

  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = isoWeekdayOf(firstOfMonth) - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="p-3">
      <div className="grid grid-cols-7 gap-1 border border-slate-200 rounded-xl overflow-hidden bg-slate-200/50 p-1">
        {WEEKDAYS.map((d) => (
          <div key={d.value} className="bg-slate-100/90 py-1.5 text-center text-xs font-bold text-slate-700 rounded-md">
            {d.short}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`b-${i}`} className="min-h-[84px] bg-slate-50/40 rounded-md" />;
          const dow = isoWeekdayOf(date);
          const iso = isoDate(date);
          const holiday = holidays.get(iso);
          const inSchoolYear = iso >= schoolYear.start && iso <= schoolYear.end;
          const dayBlocks = holiday ? [] : blocksByDay.get(dow) ?? [];
          return (
            <div
              key={iso}
              className={clsx(
                'min-h-[84px] p-1.5 align-top text-[10px] rounded-lg transition',
                holiday || !inSchoolYear ? 'bg-slate-100/80 text-slate-500' : 'bg-white shadow-2xs',
              )}
              title={holiday}
            >
              <div className="mb-1 text-right text-[11px] font-semibold text-slate-500">
                {date.getDate()}
              </div>
              {holiday ? (
                <div className="truncate italic text-slate-400 font-medium">{holiday}</div>
              ) : (
                <div className="space-y-0.5">
                  {dayBlocks.map((b) => (
                    <div
                      key={b.sessionId}
                      className="truncate rounded-md px-1.5 py-0.5 font-medium shadow-2xs"
                      style={{ backgroundColor: b.fill, color: b.text }}
                      title={`${b.label} ${formatTime(b.startMinutes)}`}
                    >
                      <span className="opacity-90">{formatTime(b.startMinutes)}</span> {b.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
