'use client';

import { useState } from 'react';
import type { CustomEntry, CustomEntryKind, PricePeriod, Weekday } from '@krouzky/domain';
import { usePlannerStore } from '@/store/plannerStore';
import { newId } from '@/lib/ids';
import { WEEKDAYS } from '@/lib/grid';
import { geocodeAddress, offlineGeocode } from '@/lib/geocode';
import { ColorSwatches } from './ColorSwatches';
import { IconClose, IconPlus } from './Icons';

/** Předvolený typ vlastní události (FR-4, design_review_58.md) — určuje výchozí barvu. */
const KIND_OPTIONS: { value: CustomEntryKind; label: string; icon: string }[] = [
  { value: 'circle', label: 'Kroužek', icon: '🏀' },
  { value: 'school', label: 'Škola', icon: '🏫' },
  { value: 'doctor', label: 'Lékař', icon: '🩺' },
  { value: 'other', label: 'Jiné', icon: '📌' },
];

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
  const [kind, setKind] = useState<CustomEntryKind>(editEntry?.kind ?? 'other');
  const [colorOverride, setColorOverride] = useState<string | undefined>(
    editEntry?.colorOverride,
  );
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
    const [streetPart, cityPart] = address.split(',');
    const street = (streetPart ?? '').trim();
    const city = (cityPart ?? '').trim();
    const amount = Number(priceAmount);
    const baseLocation = street || city ? { street, city } : undefined;
    const location = baseLocation
      ? { ...baseLocation, ...(offlineGeocode(baseLocation) ?? {}) }
      : undefined;
    const entry: CustomEntry = {
      id: editEntry?.id ?? newId('cust'),
      childId: editEntry?.childId ?? activeChildId,
      name: name.trim(),
      kind,
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
      ...(colorOverride ? { colorOverride } : {}),
    };
    if (isEdit) updateCustomEntry(entry);
    else addCustomEntry(entry);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <h2 className="text-base font-bold text-slate-900">
            {isEdit ? 'Upravit vlastní událost' : 'Přidat vlastní událost'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition desk:h-8 desk:w-8"
            aria-label="Zavřít"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <span className="font-semibold text-slate-700">Typ události</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={kind === opt.value}
                  onClick={() => setKind(opt.value)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    kind === opt.value
                      ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span aria-hidden>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-semibold text-slate-700">Barva</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ColorSwatches value={colorOverride} onPick={setColorOverride} />
              {colorOverride && (
                <button
                  type="button"
                  onClick={() => setColorOverride(undefined)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Výchozí barva
                </button>
              )}
            </div>
          </div>

          <label className="block">
            <span className="font-semibold text-slate-700">Název události / aktivity</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Např. Logopedie, Doučování matematiky…"
            />
          </label>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2">
            <div className="font-semibold text-slate-700">Termíny a časy</div>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <select
                  value={r.weekday}
                  onChange={(e) =>
                    updateRow(i, { weekday: Number(e.target.value) as Weekday })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-2xs"
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
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-2xs"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="time"
                  value={r.end}
                  onChange={(e) => updateRow(i, { end: e.target.value })}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 shadow-2xs"
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-red-500 hover:text-red-700 transition desk:h-7 desk:w-7"
                    aria-label="Odebrat termín"
                  >
                    <IconClose className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline pt-0.5"
            >
              <IconPlus className="h-3 w-3" />
              <span>Přidat další čas</span>
            </button>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Frekvence opakování</label>
            <select
              value={everyWeeks}
              onChange={(e) => setEveryWeeks(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs"
            >
              <option value={1}>Každý týden</option>
              <option value={2}>Každé 2 týdny</option>
              <option value={3}>Každé 3 týdny</option>
              <option value={4}>Každé 4 týdny</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="font-semibold text-slate-700">
              Opakovat od
              <input
                type="date"
                value={repeatFrom}
                min={schoolYear.start}
                max={schoolYear.end}
                onChange={(e) => setRepeatFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
              />
            </label>
            <label className="font-semibold text-slate-700">
              Opakovat do
              <input
                type="date"
                value={repeatTo}
                min={schoolYear.start}
                max={schoolYear.end}
                onChange={(e) => setRepeatTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
              />
            </label>
          </div>

          <label className="block">
            <span className="font-semibold text-slate-700">Místo / Adresa</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ulice a číslo, Město"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-2xs"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">Lektor / Vyučující</span>
            <input
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Jméno lektora"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-2xs"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="font-semibold text-slate-700">Cena (Kč)</span>
              <input
                type="number"
                min={0}
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-2xs"
              />
            </label>
            <label className="block">
              <span className="font-semibold text-slate-700">Období</span>
              <select
                value={pricePeriod}
                onChange={(e) => setPricePeriod(e.target.value as PricePeriod)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-2xs"
              >
                <option value="per_month">měsíc</option>
                <option value="per_semester">pololetí</option>
                <option value="per_year">rok</option>
                <option value="per_session">lekce</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="font-semibold text-slate-700">Telefonický kontakt</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+420 123 456 789"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-2xs"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-slate-700">Poznámka</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Jakékoliv doplňující instrukce…"
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-2xs"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!valid}
            className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-40 transition"
          >
            {isEdit ? 'Uložit' : 'Přidat'}
          </button>
        </div>
      </div>
    </div>
  );
}
