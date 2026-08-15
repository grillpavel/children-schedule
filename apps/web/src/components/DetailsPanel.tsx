'use client';

import { useEffect, useState } from 'react';

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
import { ColorSwatches } from './ColorSwatches';
import { CustomEntryDialog } from './CustomEntryDialog';

/**
 * Poloha na mapě (Changes 11): odkaz na Mapy.cz (Seznam) a na nativní mapy podle
 * platformy — Apple Mapy na Apple zařízeních, jinde Google Mapy. Bez vloženého náhledu.
 */
function MapLink({ address }: { address: Address | undefined }) {
  const [isApple, setIsApple] = useState(false);
  useEffect(() => {
    setIsApple(/iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent));
  }, []);

  const hasAddressText = Boolean(address?.street || address?.city);
  if (!address || (!hasAddressText && address.lat === undefined)) {
    return <div className="text-sm text-slate-600">Poloha: neuvedeno</div>;
  }

  const lat = address.lat;
  const lon = address.lon;
  const hasCoords = lat !== undefined && lon !== undefined;
  const query = encodeURIComponent(
    [address.street, address.city].filter(Boolean).join(', '),
  );
  const mapyLink = hasCoords
    ? `https://mapy.cz/zakladni?x=${lon}&y=${lat}&z=17&source=coor&id=${lon},${lat}`
    : `https://mapy.cz/zakladni?q=${query}`;
  const appleLink = hasCoords
    ? `https://maps.apple.com/?ll=${lat},${lon}&q=${query || `${lat},${lon}`}`
    : `https://maps.apple.com/?q=${query}`;
  const googleLink = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
  const nativeLink = isApple ? appleLink : googleLink;
  const nativeLabel = isApple ? 'Apple Mapy' : 'Google Mapy';

  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <a href={mapyLink} target="_blank" rel="noreferrer" className="text-blue-600">
        📍 Mapy.cz
      </a>
      <a href={nativeLink} target="_blank" rel="noreferrer" className="text-blue-600">
        Otevřít v {nativeLabel}
      </a>
    </div>
  );
}

const PRICE_PERIOD_LABELS: Record<string, string> = {
  per_semester: 'pololetí',
  per_year: 'rok',
  per_month: 'měsíc',
  per_session: 'lekce',
};

function toMonthlyCzk(amount: number, period: string): number {
  if (!Number.isFinite(amount)) return Number.NaN;
  switch (period) {
    case 'per_month':
      return amount;
    case 'per_year':
      return amount / 12;
    case 'per_semester':
      return amount / 5;
    case 'per_session':
      return amount * 4;
    default:
      return amount;
  }
}

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
  const selectActivity = usePlannerStore((s) => s.selectActivity);
  const [variantChoice, setVariantChoice] = useState('');
  const [descOpen, setDescOpen] = useState(false);

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
  const signupUrl = activity.applicationUrl ?? web;
  const email = provider?.contact.email;
  const contactPerson = provider?.contact.personName;
  const monthly = toMonthlyCzk(effPrice.amount, effPrice.period);

  const isEnrolled = enrolled.length > 0;
  const chosenVariant = groups.some((g) => g.id === variantChoice)
    ? variantChoice
    : (groups[0]?.id ?? '');
  const nameEdited = override?.name !== undefined;
  const addressEdited = override?.address !== undefined;
  const priceEdited = override?.price !== undefined;

  return (
    <section className="border-b border-slate-100">
      <div className="sticky top-0 z-10 space-y-2 border-b border-slate-100 bg-white p-3">
        <button
          type="button"
          onClick={() => selectActivity(null)}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Zpět na souhrn
        </button>
        <h2 className="text-base font-semibold">
          {effName}
          {nameEdited && <EditedMark />}
        </h2>
        <div className="text-sm text-slate-600">
          {provider?.name} · {CATEGORY_LABELS[activity.category]}
        </div>

      {/* Primární akce (Changes 8 C8-F3): přidat / odebrat + přihlásit se. */}
      <div className="space-y-1 rounded border border-slate-200 bg-slate-50 p-2">
        {isEnrolled ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                V rozvrhu
              </span>
              <span className="text-slate-500">Termín změníte níže.</span>
            </div>
            <button
              type="button"
              onClick={() => enrolled.forEach((e) => removeEnrollment(e.id))}
              className="w-full rounded border border-red-200 px-2 py-1 text-sm text-red-700 hover:bg-red-50"
            >
              Odebrat z rozvrhu
            </button>
          </>
        ) : (
          <>
            {groups.length > 1 && (
              <label className="block text-xs text-slate-500">
                Termín
                <select
                  value={chosenVariant}
                  onChange={(e) => setVariantChoice(e.target.value)}
                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label ??
                        g.sessions
                          .map(
                            (s) =>
                              `${WEEKDAYS[s.weekday - 1]?.short} ${formatTime(s.startMinutes)}–${formatTime(s.endMinutes)}`,
                          )
                          .join(', ')}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              disabled={!chosenVariant}
              onClick={() => chosenVariant && enrollGroup(activity.id, chosenVariant)}
              className="w-full rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Přidat do rozvrhu
            </button>
          </>
        )}
        {signupUrl && (
          <a
            href={signupUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-sm text-blue-600"
          >
            Přihlásit se →
          </a>
        )}
        </div>
      </div>

      <div className="space-y-2 p-3">
      <div className="pt-1">
        <div className="mb-1 text-xs font-medium text-slate-500">
          Varianty docházky
        </div>
        <p className="mb-1 text-[11px] text-slate-600">
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
      {activity.description && (
        <div>
          <button
            type="button"
            onClick={() => setDescOpen((v) => !v)}
            className="text-xs font-medium text-slate-500"
          >
            {descOpen ? '▾' : '▸'} Popis
          </button>
          {descOpen && (
            <p className="mt-1 text-sm text-slate-600">{activity.description}</p>
          )}
        </div>
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
          {addressEdited && <EditedMark />}
        </div>
      )}
      <MapLink key={activity.id} address={effAddress} />
      <div className="text-sm text-slate-600">
        {Number.isFinite(monthly)
          ? `${Math.round(monthly)} Kč/měs (${effPrice.amount} Kč/${PRICE_PERIOD_LABELS[effPrice.period]})`
          : 'Cena neuvedena'}{' '}
        · {activity.ageMin}–{activity.ageMax} let
        {priceEdited && <EditedMark />}
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

/** Značka uživatelské úpravy (Changes 8 C8-E2): hodnota není ověřená. */
function EditedMark() {
  return (
    <span
      className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-700"
      title="Tuto hodnotu jste upravili; není to ověřený údaj z katalogu."
    >
      upraveno vámi
    </span>
  );
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
  const [editing, setEditing] = useState(false);

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
      <MapLink key={entry.id} address={entry.location} />
      {entry.sessions[0]?.instructor && (
        <div className="text-sm text-slate-600">
          Lektor: {entry.sessions[0].instructor}
        </div>
      )}
      {entry.price && (
        <div className="text-sm text-slate-600">
          {Number.isFinite(toMonthlyCzk(entry.price.amount, entry.price.period))
            ? `${Math.round(toMonthlyCzk(entry.price.amount, entry.price.period))} Kč/měs (${entry.price.amount} Kč/${PRICE_PERIOD_LABELS[entry.price.period]})`
            : 'Cena neuvedena'}
        </div>
      )}
      {entry.contact?.phone && (
        <a href={`tel:${entry.contact.phone}`} className="block text-sm text-blue-600">
          {entry.contact.phone}
        </a>
      )}
      {entry.note && <div className="text-sm text-slate-600">{entry.note}</div>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-sm text-blue-600"
        >
          Upravit
        </button>
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
      </div>
      {editing && (
        <CustomEntryDialog editEntry={entry} onClose={() => setEditing(false)} />
      )}
    </section>
  );
}

/** Připnutá hlavička pravého sloupce (Changes 11): a) Obsazenost týdne,
    b) Souhrn týdne, c) Náklady celkem: částka/rok — vždy viditelné. */
function PinnedSummary() {
  const view = useScheduleView();
  const catalog = usePlannerStore((s) => s.catalog);
  const focusDay = usePlannerStore((s) => s.focusDay);
  const enrollments = usePlannerStore((s) =>
    activeSchedule(s.state).enrollments.filter((e) => e.childId === s.activeChildId),
  );
  const customEntries = usePlannerStore((s) =>
    activeSchedule(s.state).customEntries.filter((e) => e.childId === s.activeChildId),
  );

  const focusCatalog = () => {
    const input = document.querySelector<HTMLInputElement>('[data-catalog-search]');
    input?.focus();
    input?.scrollIntoView({ block: 'center' });
  };

  if (view.summary.activityCount === 0) {
    return (
      <section className="space-y-2 p-3">
        <h3 className="text-sm font-semibold">Zatím žádné kroužky</h3>
        <p className="text-sm text-slate-600">
          Vyberte kroužek z katalogu a hned uvidíte obsazenost týdne, náklady i kolize.
        </p>
        <button
          type="button"
          onClick={focusCatalog}
          className="w-full rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          Vybrat z katalogu
        </button>
      </section>
    );
  }

  const weekdayBlocks = view.blocks.filter((b) => b.weekday >= 1 && b.weekday <= 5);
  const occupiedAfternoons = new Set(
    weekdayBlocks
      .filter((b) => b.endMinutes > 13 * 60 && b.startMinutes < 19 * 60)
      .map((b) => b.weekday),
  ).size;
  const tripsPerWeek = weekdayBlocks.length;
  const weeklyHours =
    weekdayBlocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0) / 60;
  const occupancyByDay = ([1, 2, 3, 4, 5] as const).map((wd) => ({
    wd,
    count: weekdayBlocks.filter((b) => b.weekday === wd).length,
  }));

  const pricedCount =
    enrollments.filter((e) => {
      const a = catalog.activities.find((x) => x.id === e.activityId);
      return a ? Number.isFinite(a.price.amount) : false;
    }).length +
    customEntries.filter((e) => e.price && Number.isFinite(e.price.amount)).length;
  const pricelessCount = view.summary.activityCount - pricedCount;
  const monthlyTotal = view.summary.costByPeriod.reduce(
    (sum, c) => sum + toMonthlyCzk(c.amountCzk, c.period),
    0,
  );
  const yearlyTotal = Math.round(monthlyTotal * 12);

  return (
    <section className="space-y-3 p-3">
      <div>
        <h3 className="mb-1 text-sm font-semibold">Obsazenost týdne</h3>
        <ul className="space-y-0.5 text-sm text-slate-600">
          {occupancyByDay.map(({ wd, count }) => (
            <li key={wd}>
              <button
                type="button"
                onClick={() => focusDay(wd)}
                title="Zobrazit tento den v kalendáři"
                className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-slate-50"
              >
                <span className="w-6 shrink-0 text-slate-500">{WEEKDAYS[wd - 1]?.short}</span>
                {count === 0 ? (
                  <span className="text-slate-600">volno</span>
                ) : (
                  <>
                    <span className="tracking-tight text-slate-700" aria-hidden>
                      {'▪'.repeat(count)}
                    </span>
                    <span>
                      {count} {count === 1 ? 'kroužek' : count <= 4 ? 'kroužky' : 'kroužků'}
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Souhrn týdne</h3>
        <div
          className="text-sm text-slate-600"
          title="Odpoledne je obsazené, když mezi 13:00 a 19:00 je aspoň jedna událost (Po–Pá)."
        >
          Obsazená odpoledne: {occupiedAfternoons} z 5
        </div>
        <div
          className="text-sm text-slate-600"
          title="Cesta = jedna docházka v týdnu (Po–Pá)."
        >
          Cest týdně: {tripsPerWeek}
        </div>
        <div className="text-xs text-slate-500" title="Součet délek lekcí za týden (Po–Pá).">
          Hodin týdně: {Math.round(weeklyHours * 10) / 10}
        </div>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Náklady</h3>
        {view.summary.costByPeriod.length === 0 ? (
          <div className="text-sm text-slate-600">
            Žádná uvedená cena
            {pricelessCount > 0 ? ` · ${pricelessCount} kroužků bez ceny` : ''}
          </div>
        ) : (
          <div className="text-sm text-slate-600">
            Celkem {yearlyTotal.toLocaleString('cs-CZ')} Kč/rok
            {pricelessCount > 0 ? ` · ${pricelessCount} kroužků bez ceny` : ''}
          </div>
        )}
      </div>
    </section>
  );
}

function ScheduleNotices() {
  const removeCustomEntry = usePlannerStore((s) => s.removeCustomEntry);
  const customEntries = usePlannerStore((s) =>
    activeSchedule(s.state).customEntries.filter(
      (e) => e.childId === s.activeChildId,
    ),
  );

  // Konflikty se v pravém sloupci nezobrazují (C12); kolize je vidět v mřížce.
  if (customEntries.length === 0) return null;

  return (
    <section className="space-y-3 p-3">
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
    </section>
  );
}

export function DetailsPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white">
        <PinnedSummary />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SelectedActivity />
        <CustomEntryDetail />
        <ScheduleNotices />
      </div>
    </div>
  );
}
