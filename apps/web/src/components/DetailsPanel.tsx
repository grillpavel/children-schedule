'use client';

import { useState } from 'react';
import {
  colorForActivity,
  type Activity,
  type ActivityCategory,
  type Address,
  type PricePeriod,
  type Provider,
} from '@krouzky/domain';
import { usePlannerStore, activeSchedule } from '@/store/plannerStore';
import { useScheduleView } from '@/hooks/useScheduleView';
import { WEEKDAYS, formatTime } from '@/lib/grid';
import { geocodeAddress } from '@/lib/geocode';
import { ChatPanel } from './ChatPanel';
import { ColorSwatches } from './ColorSwatches';

/** Poloha na mapě (FR-8): malý keyless náhled OpenStreetMap + odkaz do Mapy.cz. */
function MapLink({ address }: { address: Address | undefined }) {
  if (!address) {
    return <div className="text-sm text-slate-400">Poloha: neuvedeno</div>;
  }
  const hasCoords = address.lat !== undefined && address.lon !== undefined;
  const query = encodeURIComponent(`${address.street}, ${address.city}`);
  const osmLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${address.lat}&mlon=${address.lon}#map=17/${address.lat}/${address.lon}`
    : `https://www.openstreetmap.org/search?query=${query}`;
  const mapyLink = hasCoords
    ? `https://mapy.cz/zakladni?x=${address.lon}&y=${address.lat}&z=17&source=coor&id=${address.lon},${address.lat}`
    : `https://mapy.cz/zakladni?q=${query}`;

  return (
    <div className="space-y-1">
      {hasCoords && (
        <>
          <iframe
            title="Náhled mapy"
            className="h-32 w-full rounded border border-slate-200"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              (address.lon as number) - 0.006
            }%2C${(address.lat as number) - 0.004}%2C${
              (address.lon as number) + 0.006
            }%2C${(address.lat as number) + 0.004}&layer=mapnik&marker=${address.lat}%2C${address.lon}`}
          />
          <p className="text-[10px] text-slate-400">
            Náhled načítá OpenStreetMap; poloha se odesílá třetí straně.
          </p>
        </>
      )}
      <div className="flex gap-3 text-sm">
        <a href={osmLink} target="_blank" rel="noreferrer" className="text-blue-600">
          📍 OpenStreetMap
        </a>
        <a href={mapyLink} target="_blank" rel="noreferrer" className="text-blue-600">
          Otevřít v Mapy.cz
        </a>
      </div>
    </div>
  );
}

const PRICE_PERIOD_LABELS: Record<string, string> = {
  per_semester: 'pololetí',
  per_year: 'rok',
  per_month: 'měsíc',
  per_session: 'lekce',
};

const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  sport: 'Sport',
  athletics: 'Atletika',
  art: 'Výtvarka',
  music: 'Hudba',
  dance: 'Tanec',
  language: 'Jazyky',
  science_tech: 'Věda a technika',
  science: 'Věda',
  tech: 'Technika',
  crafts: 'Rukodělky',
  games: 'Hry',
  outdoor: 'Příroda a turistika',
  martial_arts: 'Bojové sporty',
  scouting: 'Skauting',
  other: 'Ostatní',
};

function SelectedActivity() {
  const catalog = usePlannerStore((s) => s.catalog);
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const state = usePlannerStore((s) => s.state);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const enrollGroup = usePlannerStore((s) => s.enrollGroup);
  const removeEnrollment = usePlannerStore((s) => s.removeEnrollment);
  const setActivityOverride = usePlannerStore((s) => s.setActivityOverride);
  const clearActivityOverride = usePlannerStore((s) => s.clearActivityOverride);

  if (!selectedActivityId) return null;
  const activity = catalog.activities.find((a) => a.id === selectedActivityId);
  if (!activity) return null;
  const provider = catalog.providers.find((p) => p.id === activity.providerId);
  const groups = catalog.sessionGroups.filter(
    (g) => g.activityId === activity.id,
  );
  const schedule = activeSchedule(state);
  const enrolled = schedule.enrollments.filter(
    (e) => e.childId === activeChildId && e.activityId === activity.id,
  );
  const enrolledGroupIds = new Set(enrolled.map((e) => e.sessionGroupId));

  // Efektivní hodnoty: uživatelský přepis, jinak katalog (CHANGE-4).
  const override = state.overrides.find((o) => o.activityId === activity.id);
  const venueId = groups.find((g) => g.venueId)?.venueId;
  const venue = venueId
    ? catalog.venues?.find((v) => v.id === venueId)
    : undefined;
  const effName = override?.name ?? activity.name;
  const effAddress: Address | undefined =
    override?.address ?? venue?.address ?? provider?.address;
  const effPhone = override?.contactPhone ?? provider?.contact.phone;
  const effPrice = override?.price ?? activity.price;
  const effColorCss = override?.colorCss ?? colorForActivity(activity.id).css;
  const hasOverride = override !== undefined;
  const web = activity.sourceUrl ?? provider?.website;
  const email = provider?.contact.email;
  const contactPerson = provider?.contact.personName;

  return (
    <section className="space-y-2 border-b border-slate-100 p-3">
      <h2 className="text-base font-semibold">{effName}</h2>
      <div className="text-sm text-slate-600">
        {provider?.name} · {CATEGORY_LABELS[activity.category]}
      </div>
      {activity.description && (
        <p className="text-sm text-slate-600">{activity.description}</p>
      )}
      {venue && (
        <div className="text-sm text-slate-600">
          Místo konání: <span className="font-medium">{venue.name}</span>
        </div>
      )}
      {effAddress && (
        <div className="text-sm text-slate-600">
          {effAddress.street}, {effAddress.city}
          {effAddress.zip ? `, ${effAddress.zip}` : ''}
        </div>
      )}
      <MapLink address={effAddress} />
      <div className="text-sm text-slate-600">
        {Number.isFinite(effPrice.amount)
          ? `${effPrice.amount} Kč / ${PRICE_PERIOD_LABELS[effPrice.period]}`
          : 'Cena neuvedena'}{' '}
        · {activity.ageMin}–{activity.ageMax} let
      </div>
      <div className="text-sm text-slate-600">
        Kapacita: {activity.capacity ?? 'neuvedeno'}
      </div>
      {(contactPerson || effPhone || email || web) && (
        <div className="rounded border border-slate-200 bg-slate-50 p-2">
          <div className="mb-1 text-xs font-medium text-slate-500">
            Kontakt a odkazy
          </div>
          <div className="space-y-0.5 text-sm">
            {contactPerson && (
              <div className="text-slate-600">👤 {contactPerson}</div>
            )}
            {effPhone && (
              <a href={`tel:${effPhone}`} className="block text-blue-600">
                📞 {effPhone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="block text-blue-600">
                ✉️ {email}
              </a>
            )}
            {web && (
              <a
                href={web}
                target="_blank"
                rel="noreferrer"
                className="block text-blue-600"
              >
                🌐 Více informací (web)
              </a>
            )}
          </div>
        </div>
      )}
      <div className="text-xs text-slate-400">
        Ověřeno: {activity.lastVerifiedAt}
      </div>

      <div className="pt-1">
        <div className="mb-1 text-xs font-medium text-slate-500">Barva kroužku</div>
        <ColorSwatches
          value={effColorCss}
          onPick={(css) => setActivityOverride(activity.id, { colorCss: css })}
        />
      </div>

      <ActivityEditor
        key={activity.id}
        activity={activity}
        provider={provider}
        effName={effName}
        effAddress={effAddress}
        effPhone={effPhone}
        effPrice={effPrice}
        hasOverride={hasOverride}
        onChange={(patch) => setActivityOverride(activity.id, patch)}
        onReset={() => clearActivityOverride(activity.id)}
      />

      <div className="pt-1">
        <div className="mb-1 text-xs font-medium text-slate-500">
          Varianty docházky
        </div>
        <p className="mb-1 text-[11px] text-slate-400">
          Můžete vybrat i víc termínů najednou.
        </p>
        <div className="space-y-1">
          {groups.map((g) => {
            const selected = enrolledGroupIds.has(g.id);
            const label =
              g.label ??
              g.sessions
                .map(
                  (s) =>
                    `${WEEKDAYS[s.weekday - 1]?.short} ${formatTime(s.startMinutes)}–${formatTime(s.endMinutes)}`,
                )
                .join(', ');
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => enrollGroup(activity.id, g.id)}
                className={clsxSel(selected)}
              >
                {selected ? '✓ ' : ''}
                {label}
              </button>
            );
          })}
        </div>
        {enrolled.length > 0 && (
          <button
            type="button"
            onClick={() => enrolled.forEach((e) => removeEnrollment(e.id))}
            className="mt-2 text-sm text-red-600"
          >
            Odebrat vše z rozvrhu
          </button>
        )}
      </div>
    </section>
  );
}

/** Editace zobrazovaných údajů kroužku (CHANGE-4 FR-3): zapisuje do přepisů. */
function ActivityEditor({
  activity,
  provider,
  effName,
  effAddress,
  effPhone,
  effPrice,
  hasOverride,
  onChange,
  onReset,
}: {
  activity: Activity;
  provider: Provider | undefined;
  effName: string;
  effAddress: Address | undefined;
  effPhone: string | undefined;
  effPrice: { amount: number; period: PricePeriod };
  hasOverride: boolean;
  onChange: (patch: {
    name?: string;
    address?: Address;
    contactPhone?: string;
    price?: { amount: number; period: PricePeriod };
  }) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(effName);
  const [street, setStreet] = useState(effAddress?.street ?? '');
  const [city, setCity] = useState(effAddress?.city ?? '');
  const [zip, setZip] = useState(effAddress?.zip ?? '');
  const [phone, setPhone] = useState(effPhone ?? '');
  const [amount, setAmount] = useState(String(effPrice.amount));
  const [period, setPeriod] = useState<PricePeriod>(effPrice.period);

  const commitName = () => {
    const trimmed = name.trim();
    onChange({ name: trimmed && trimmed !== activity.name ? trimmed : undefined });
  };
  const commitAddress = () => {
    const s = street.trim();
    if (!s) {
      onChange({ address: undefined });
      return;
    }
    const base: Address = {
      street: s,
      city: city.trim(),
      ...(zip.trim() ? { zip: zip.trim() } : {}),
    };
    onChange({ address: base });
    // Dohledá souřadnice, aby se mapa aktualizovala na novou adresu.
    void geocodeAddress(base).then((coords) => {
      if (coords) onChange({ address: { ...base, ...coords } });
    });
  };
  const commitPhone = () => {
    const trimmed = phone.trim();
    onChange({
      contactPhone:
        trimmed && trimmed !== provider?.contact.phone ? trimmed : undefined,
    });
  };
  const commitPrice = () => {
    const value = Number(amount);
    if (Number.isFinite(value)) onChange({ price: { amount: value, period } });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600"
      >
        Upravit údaje
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded border border-slate-200 p-2">
      <label className="block text-xs text-slate-500">
        Název
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </label>
      <label className="block text-xs text-slate-500">
        Ulice
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          onBlur={commitAddress}
          placeholder="Ulice a číslo"
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </label>
      <label className="block text-xs text-slate-500">
        Město
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onBlur={commitAddress}
          placeholder="Město"
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </label>
      <label className="block text-xs text-slate-500">
        PSČ
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onBlur={commitAddress}
          placeholder="PSČ"
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </label>
      <label className="block text-xs text-slate-500">
        Telefon
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={commitPhone}
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
      </label>
      <div className="flex gap-2">
        <label className="block flex-1 text-xs text-slate-500">
          Cena (Kč)
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={commitPrice}
            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
          />
        </label>
        <label className="block flex-1 text-xs text-slate-500">
          Období
          <select
            value={period}
            onChange={(e) => {
              const next = e.target.value as PricePeriod;
              setPeriod(next);
              const value = Number(amount);
              if (Number.isFinite(value)) {
                onChange({ price: { amount: value, period: next } });
              }
            }}
            className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
          >
            <option value="per_semester">pololetí</option>
            <option value="per_year">rok</option>
            <option value="per_month">měsíc</option>
            <option value="per_session">lekce</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between">
        {hasOverride ? (
          <button
            type="button"
            onClick={() => {
              onReset();
              setName(activity.name);
              setStreet(provider?.address.street ?? '');
              setCity(provider?.address.city ?? '');
              setZip(provider?.address.zip ?? '');
              setPhone(provider?.contact.phone ?? '');
              setAmount(String(activity.price.amount));
              setPeriod(activity.price.period);
            }}
            className="text-sm text-red-600"
          >
            Obnovit z katalogu
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500"
        >
          Hotovo
        </button>
      </div>
    </div>
  );
}

function clsxSel(selected: boolean): string {
  return [
    'w-full rounded border px-2 py-1 text-left text-sm',
    selected
      ? 'border-slate-400 bg-slate-100 font-medium'
      : 'border-slate-200 hover:bg-slate-50',
  ].join(' ');
}

/** Detail vlastní události v pravém sloupci (FR-7). */
function CustomEntryDetail() {
  const selectedCustomEntryId = usePlannerStore((s) => s.selectedCustomEntryId);
  const entry = usePlannerStore((s) =>
    activeSchedule(s.state).customEntries.find(
      (e) => e.id === s.selectedCustomEntryId,
    ),
  );
  const removeCustomEntry = usePlannerStore((s) => s.removeCustomEntry);
  const selectCustomEntry = usePlannerStore((s) => s.selectCustomEntry);

  if (!selectedCustomEntryId || !entry) return null;

  return (
    <section className="space-y-2 border-b border-slate-100 p-3">
      <h2 className="text-base font-semibold">✎ {entry.name}</h2>
      <div className="space-y-0.5 text-sm text-slate-600">
        {entry.sessions.map((s) => (
          <div key={s.id}>
            {WEEKDAYS[s.weekday - 1]?.long} {formatTime(s.startMinutes)}–
            {formatTime(s.endMinutes)}
            {s.everyWeeks && s.everyWeeks > 1 ? ` · každé ${s.everyWeeks} týdny` : ''}
          </div>
        ))}
      </div>
      {entry.location && (
        <div className="text-sm text-slate-600">
          {entry.location.street}, {entry.location.city}
        </div>
      )}
      <MapLink address={entry.location} />
      {entry.sessions[0]?.instructor && (
        <div className="text-sm text-slate-600">
          Lektor: {entry.sessions[0].instructor}
        </div>
      )}
      {entry.price && (
        <div className="text-sm text-slate-600">
          {entry.price.amount} Kč / {PRICE_PERIOD_LABELS[entry.price.period]}
        </div>
      )}
      {entry.contact?.phone && (
        <a href={`tel:${entry.contact.phone}`} className="block text-sm text-blue-600">
          {entry.contact.phone}
        </a>
      )}
      {entry.note && <div className="text-sm text-slate-600">{entry.note}</div>}
      <button
        type="button"
        onClick={() => {
          removeCustomEntry(entry.id);
          selectCustomEntry(null);
        }}
        className="mt-1 text-sm text-red-600"
      >
        Odebrat
      </button>
    </section>
  );
}

function Summary() {
  const view = useScheduleView();
  const removeCustomEntry = usePlannerStore((s) => s.removeCustomEntry);
  const customEntries = usePlannerStore((s) =>
    activeSchedule(s.state).customEntries.filter(
      (e) => e.childId === s.activeChildId,
    ),
  );

  return (
    <section className="space-y-3 p-3">
      <div>
        <h3 className="mb-1 text-sm font-semibold">Souhrn rozvrhu</h3>
        <div className="text-sm text-slate-600">
          {view.summary.activityCount} kroužků
        </div>
        {view.summary.costByPeriod.map((c) => (
          <div key={c.period} className="text-sm text-slate-600">
            {c.amountCzk} Kč / {PRICE_PERIOD_LABELS[c.period]}
          </div>
        ))}
        <div className="text-sm text-slate-600">
          Volných všedních dnů: {view.summary.freeWeekdays.length}
        </div>
        {view.summary.longestDay && (
          <div className="text-sm text-slate-600">
            Nejdelší den: {WEEKDAYS[view.summary.longestDay.weekday - 1]?.long} (
            {Math.round(view.summary.longestDay.spanMinutes / 60)} h)
          </div>
        )}
      </div>

      <div aria-live="polite">
        <h3 className="mb-1 text-sm font-semibold">Konflikty a upozornění</h3>
        {view.conflicts.length === 0 ? (
          <p className="text-sm text-emerald-700">Žádné konflikty. 🎉</p>
        ) : (
          <ul className="space-y-1">
            {view.conflicts.map((c, i) => (
              <li
                key={i}
                className={
                  c.severity === 'hard'
                    ? 'text-sm text-red-700'
                    : 'text-sm text-amber-700'
                }
              >
                {c.severity === 'hard' ? '⚠ ' : '● '}
                {c.message}
              </li>
            ))}
          </ul>
        )}
        {view.skippedChecks.map((s, i) => (
          <p key={i} className="mt-1 text-xs text-slate-400">
            ⓘ {s.reason}
          </p>
        ))}
      </div>

      {customEntries.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Vlastní události</h3>
          <ul className="space-y-1">
            {customEntries.map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span>✎ {e.name}</span>
                <button
                  type="button"
                  onClick={() => removeCustomEntry(e.id)}
                  className="text-red-600"
                >
                  Odebrat
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function DetailsPanel() {
  const [tab, setTab] = useState<'info' | 'chat'>('info');
  return (
    <div className="flex h-full flex-col">
      <div className="no-print flex border-b border-slate-100">
        {(['info', 'chat'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'flex-1 border-b-2 border-slate-700 py-2 text-sm font-medium'
                : 'flex-1 py-2 text-sm text-slate-500'
            }
          >
            {t === 'info' ? 'Info' : 'Chat'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'info' ? (
          <>
            <SelectedActivity />
            <CustomEntryDetail />
            <Summary />
          </>
        ) : (
          <ChatPanel />
        )}
      </div>
    </div>
  );
}
