'use client';

import { useState } from 'react';
import { IconClose } from './Icons';
import { DEFAULT_EXPORT_RANGE, type ExportHourRange } from '@/lib/exportClient';

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function fromHHMM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Nejprve vyber rozsah hodin, pak teprve vygeneruj tisk/obrázek rozvrhu
 * (design_review_88.md) — nativně předvyplněno 13:00–21:00. Použito pro
 * „Tisk rozvrhu“ i „Obrázek rozvrhu (.png)“ (agenda je textový souhrn bez
 * mřížky, rozsah hodin se jí netýká).
 */
export function PrintRangeDialog({
  title,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  confirmLabel: string;
  onConfirm: (range: ExportHourRange) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(toHHMM(DEFAULT_EXPORT_RANGE.startMinutes));
  const [end, setEnd] = useState(toHHMM(DEFAULT_EXPORT_RANGE.endMinutes));

  const startMinutes = fromHHMM(start);
  const endMinutes = fromHHMM(end);
  const valid = startMinutes !== null && endMinutes !== null && startMinutes < endMinutes;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-range-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="print-range-dialog-title" className="text-base font-bold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zavřít"
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Vyberte rozsah hodin, který se má zobrazit — jen grafická mřížka, bez doplňkového textu.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-slate-600">
            Od
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label="Rozsah tisku od"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-2xs"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Do
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="Rozsah tisku do"
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-2xs"
            />
          </label>
        </div>
        {!valid && (
          <p className="mb-3 text-xs font-medium text-red-600">Konec musí být později než začátek.</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Zrušit
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => {
              if (startMinutes === null || endMinutes === null) return;
              onConfirm({ startMinutes, endMinutes });
            }}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
