'use client';

import { useState } from 'react';
import { DialogShell } from './DialogShell';
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
 *
 * Obálka (backdrop/karta/Escape/close) sjednocena přes `DialogShell`
 * (design_review_102.md, CHANGE-110) — dřív měla vlastní ruční implementaci
 * s jinou barvou podkladu a menším close tlačítkem než zbytek appky.
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
    <DialogShell onClose={onClose} title={title} size="sm">
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
    </DialogShell>
  );
}
