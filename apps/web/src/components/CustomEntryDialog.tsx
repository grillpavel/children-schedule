'use client';

import { useState } from 'react';
import type { CustomEntry, PricePeriod, Weekday } from '@krouzky/domain';
import { usePlannerStore } from '@/store/plannerStore';
import { newId } from '@/lib/ids';
import { WEEKDAYS } from '@/lib/grid';
import { geocodeAddress, offlineGeocode } from '@/lib/geocode';

interface TimeRow {
  weekday: Weekday;
  start: string; // HH:MM
  end: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function CustomEntryDialog({
  onClose,
  editEntry,
}: {
  onClose: () => void;
  editEntry?: CustomEntry;
}) {
  const addCustomEntry = usePlannerStore((s) => s.addCustomEntry);
  const updateCustomEntry = usePlannerStore((s) => s.updateCustomEntry);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const schoolYear = usePlannerStore((s) => s.state.schoolYear);
  const isEdit = editEntry !== undefined;
  const first = editEntry?.sessions[0];

  const [name, setName] = useState(editEntry?.name ?? '');
  const [rows, setRows] = useState<TimeRow[]>(
    editEntry
      ? editEntry.sessions.map((s) => ({
          weekday: s.weekday,
          start: toHhmm(s.startMinutes),
          end: toHhmm(s.endMinutes),
        }))
      : [{ weekday: 1, start: '16:00', end: '17:00' }],
  );
  const [address, setAddress] = useState(
    editEntry?.location
      ? [editEntry.location.street, editEntry.location.city]
          .filter(Boolean)
          .join(', ')
      : '',
  );
  const [phone, setPhone] = useState(editEntry?.contact?.phone ?? '');
  const [note, setNote] = useState(editEntry?.note ?? '');
  const [instructor, setInstructor] = useState(first?.instructor ?? '');
  const [priceAmount, setPriceAmount] = useState(
    editEntry?.price ? String(editEntry.price.amount) : '',
  );
  const [pricePeriod, setPricePeriod] = useState<PricePeriod>(
    editEntry?.price?.period ?? 'per_month',
  );
  const [everyWeeks, setEveryWeeks] = useState(first?.everyWeeks ?? 1);
  const [repeatFrom, setRepeatFrom] = useState(first?.validFrom ?? schoolYear.start);
  const [repeatTo, setRepeatTo] = useState(first?.validTo ?? schoolYear.end);

  const updateRow = (i: number, patch: Partial<TimeRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, { weekday: 1, start: '16:00', end: '17:00' }]);

  const removeRow = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const valid =
    name.trim().length > 0 &&
    rows.length > 0 &&
    rows.every((r) => toMinutes(r.start) < toMinutes(r.end));

  const save = () => {
    if (!valid) return;
    // FR-5: „Ulice, město“ se rozdělí na první čárce.
    const [streetPart, cityPart] = address.split(',');
    const street = (streetPart ?? '').trim();
    const city = (cityPart ?? '').trim();
    const amount = Number(priceAmount);
    const baseLocation = street || city ? { street, city } : undefined;
    // Offline střed města hned, aby X-APPLE-STRUCTURED-LOCATION fungovalo i bez sítě (C6-A4).
    const location = baseLocation
      ? { ...baseLocation, ...(offlineGeocode(baseLocation) ?? {}) }
      : undefined;
    const entry: CustomEntry = {
      id: editEntry?.id ?? newId('cust'),
      childId: editEntry?.childId ?? activeChildId,
      name: name.trim(),
      sessions: rows.map((r, i) => ({
        id: editEntry?.sessions[i]?.id ?? newId('cs'),
        weekday: r.weekday,
        startMinutes: toMinutes(r.start),
        endMinutes: toMinutes(r.end),
        validFrom: repeatFrom,
        validTo: repeatTo,
        ...(everyWeeks > 1 ? { everyWeeks } : {}),
        ...(instructor.trim() ? { instructor: instructor.trim() } : {}),
      })),
      ...(location ? { location } : {}),
      ...(phone ? { contact: { phone: phone.trim() } } : {}),
      ...(priceAmount && Number.isFinite(amount)
        ? { price: { amount, period: pricePeriod } }
        : {}),
      ...(note ? { note: note.trim() } : {}),
    };
    if (isEdit) updateCustomEntry(entry);
    else addCustomEntry(entry);
    // Dohledá souřadnice, aby náhled mapy fungoval hned i po exportu (C10-1).
    if (location) {
      void geocodeAddress(location).then((coords) => {
        if (coords) {
          updateCustomEntry({ ...entry, location: { ...location, ...coords } });
        }
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <h2 className="mb-3 text-lg font-semibold">
          {isEdit ? 'Upravit událost' : 'Vlastní událost'}
        </h2>

        <label className="mb-2 block text-sm">
          Název
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
            placeholder="Např. Logopedie"
          />
        </label>

        <div className="mb-2">
          <div className="mb-1 text-sm">Termíny</div>
          {rows.map((r, i) => (
            <div key={i} className="mb-1 flex items-center gap-1">
              <select
                value={r.weekday}
                onChange={(e) =>
                  updateRow(i, { weekday: Number(e.target.value) as Weekday })
                }
                className="rounded border border-slate-200 px-1 py-1 text-sm"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.short}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={r.start}
                onChange={(e) => updateRow(i, { start: e.target.value })}
                className="rounded border border-slate-200 px-1 py-1 text-sm"
              />
              <span>–</span>
              <input
                type="time"
                value={r.end}
                onChange={(e) => updateRow(i, { end: e.target.value })}
                className="rounded border border-slate-200 px-1 py-1 text-sm"
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-red-600"
                  aria-label="Odebrat termín"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="text-sm text-blue-600"
          >
            + Přidat další čas
          </button>
        </div>

        <div className="mb-2">
          <label className="mb-1 block text-sm">Opakování</label>
          <select
            value={everyWeeks}
            onChange={(e) => setEveryWeeks(Number(e.target.value))}
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
          >
            <option value={1}>Každý týden</option>
            <option value={2}>Každé 2 týdny</option>
            <option value={3}>Každé 3 týdny</option>
            <option value={4}>Každé 4 týdny</option>
          </select>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-500">
            Opakovat od
            <input
              type="date"
              value={repeatFrom}
              min={schoolYear.start}
              max={schoolYear.end}
              onChange={(e) => setRepeatFrom(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Opakovat do
            <input
              type="date"
              value={repeatTo}
              min={schoolYear.start}
              max={schoolYear.end}
              onChange={(e) => setRepeatTo(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
        </div>

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Ulice, město"
          className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
        <input
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          placeholder="Lektor"
          className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
            placeholder="Cena (Kč)"
            className="rounded border border-slate-200 px-2 py-1 text-sm"
          />
          <select
            value={pricePeriod}
            onChange={(e) => setPricePeriod(e.target.value as PricePeriod)}
            className="rounded border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="per_month">měsíc</option>
            <option value="per_semester">pololetí</option>
            <option value="per_year">rok</option>
            <option value="per_session">lekce</option>
          </select>
        </div>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefon"
          className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Poznámka"
          className="mb-3 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1 text-sm text-slate-600"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!valid}
            className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-40"
          >
            {isEdit ? 'Uložit' : 'Přidat'}
          </button>
        </div>
      </div>
    </div>
  );
}
