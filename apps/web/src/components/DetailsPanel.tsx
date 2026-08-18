'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
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
import {
  IconMapPin,
  IconCheck,
  IconClock,
  IconUser,
  IconChevronDown,
} from './Icons';

/**
 * Poloha na mapě (Changes 11): odkaz na Mapy.cz (Seznam) a na nativní mapy podle
 * platformy — Apple Mapy na Apple zařízeních, jinde Google Mapy.
 */
function MapLink({ address }: { address: Address | undefined }) {
  const [isApple, setIsApple] = useState(false);
  useEffect(() => {
    setIsApple(/iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent));
  }, []);

  const hasAddressText = Boolean(address?.street || address?.city);
  if (!address || (!hasAddressText && address.lat === undefined)) {
    return <div className="text-xs text-slate-500">Poloha: neuvedeno</div>;
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
    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
      <a
        href={mapyLink}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition"
      >
        <IconMapPin className="h-3 w-3 text-red-500" />
        <span>Mapy.cz</span>
      </a>
      <a
        href={nativeLink}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition"
      >
        <span>{nativeLabel}</span>
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

/** `onEnrolled` zavírá mobilní sheet po úspěšném přidání (CHANGE-55); jen primární CTA, ne varianty/odebrání. */
function SelectedActivity({ onEnrolled }: { onEnrolled?: () => void }) {
  const catalog = usePlannerStore((s) => s.catalog);
  const selectedActivityId = usePlannerStore((s) => s.selectedActivityId);
  const state = usePlannerStore((s) => s.state);
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const enrollGroup = usePlannerStore((s) => s.enrollGroup);
  const removeEnrollment = usePlannerStore((s) => s.removeEnrollment);
  const clearCatalogSearch = usePlannerStore((s) => s.clearCatalogSearch);
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
    <section className="border-b border-slate-200/80 bg-white">
      <div className="sticky top-0 z-10 space-y-2 border-b border-slate-200/80 bg-white p-3">
        <button
          type="button"
          onClick={() => selectActivity(null)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          ← Zpět na souhrn
        </button>
        <h2 className="text-base font-bold text-slate-900 leading-snug">
          {effName}
          {nameEdited && <EditedMark />}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{provider?.name}</span>
          <span>·</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
            {CATEGORY_LABELS[activity.category]}
          </span>
        </div>

        {/* Primární akce */}
        <div className="space-y-2 rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5">
          {isEnrolled ? (
            <>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                  <IconCheck className="h-3 w-3" />
                  <span>V rozvrhu</span>
                </span>
                <span className="text-slate-500 text-[11px]">Termín změníte níže</span>
              </div>
              <button
                type="button"
                onClick={() => enrolled.forEach((e) => removeEnrollment(e.id))}
                className="w-full rounded-lg border border-red-200 bg-white py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
              >
                Odebrat z rozvrhu
              </button>
            </>
          ) : (
            <>
              {groups.length > 1 && (
                <label className="block text-xs font-medium text-slate-600">
                  Vyberte termín
                  <select
                    value={chosenVariant}
                    onChange={(e) => setVariantChoice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                onClick={() => {
                  if (!chosenVariant) return;
                  enrollGroup(activity.id, chosenVariant);
                  clearCatalogSearch();
                  onEnrolled?.();
                }}
                className="w-full rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 transition"
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
              className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition pt-0.5"
            >
              Oficiální přihláška →
            </a>
          )}
        </div>
      </div>

      <div className="space-y-3 p-3 text-xs">
        {/* Varianty docházky */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Varianty docházky
          </div>
          <p className="text-[11px] text-slate-500">
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
                  className={clsx(
                    'w-full rounded-lg border p-2 text-left text-xs font-medium transition',
                    selected
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-2xs font-semibold'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('h-3.5 w-3.5 rounded border flex items-center justify-center text-[10px]', selected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white')}>
                      {selected && '✓'}
                    </span>
                    <span>{label}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {enrolled.length > 0 && (
            <button
              type="button"
              onClick={() => enrolled.forEach((e) => removeEnrollment(e.id))}
              className="mt-1 text-xs font-medium text-red-600 hover:underline"
            >
              Odebrat vše z rozvrhu
            </button>
          )}
        </div>

        {/* Popis */}
        {activity.description && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
            <button
              type="button"
              onClick={() => setDescOpen((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-slate-700"
            >
              <span>Popis kroužku</span>
              <IconChevronDown className={clsx('h-3.5 w-3.5 text-slate-400 transition', descOpen && 'rotate-180')} />
            </button>
            {descOpen && (
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-1.5">{activity.description}</p>
            )}
          </div>
        )}

        {/* Místo a adresa */}
        <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Místo konání</div>
          {venue && (
            <div className="text-xs text-slate-800 font-semibold">{venue.name}</div>
          )}
          {effAddress && (
            <div className="text-xs text-slate-600">
              {effAddress.street}, {effAddress.city}
              {effAddress.zip ? `, ${effAddress.zip}` : ''}
              {addressEdited && <EditedMark />}
            </div>
          )}
          <MapLink key={activity.id} address={effAddress} />
        </div>

        {/* Cena a věk */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Cena a věk</div>
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-slate-900">
              {Number.isFinite(monthly)
                ? `${Math.round(monthly)} Kč/měs (${effPrice.amount} Kč/${PRICE_PERIOD_LABELS[effPrice.period]})`
                : 'Cena neuvedena'}
            </span>
            <span> · Vhodné pro {activity.ageMin}–{activity.ageMax} let</span>
            {priceEdited && <EditedMark />}
          </div>
        </div>

        {/* Kontakt */}
        {(contactPerson || effPhone || email || web) && (
          <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-2xs space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kontakt a odkazy
            </div>
            <div className="space-y-1 text-xs pt-0.5">
              {contactPerson && (
                <div className="text-slate-700 flex items-center gap-1.5 font-medium">
                  <IconUser className="h-3.5 w-3.5 text-slate-400" />
                  <span>{contactPerson}</span>
                </div>
              )}
              {effPhone && (
                <a href={`tel:${effPhone}`} className="block font-medium text-blue-600 hover:underline">
                  📞 {effPhone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="block font-medium text-blue-600 hover:underline">
                  ✉️ {email}
                </a>
              )}
              {web && (
                <a
                  href={web}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-medium text-blue-600 hover:underline"
                >
                  🌐 Web pořadatele
                </a>
              )}
            </div>
          </div>
        )}

        {/* Barva */}
        <div className="pt-1">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Barva kroužku</div>
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
        className="text-xs font-semibold text-blue-600 hover:underline"
      >
        Upravit údaje
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 animate-in fade-in-50">
      <label className="block text-xs text-slate-600 font-medium">
        Název
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
        />
      </label>
      <label className="block text-xs text-slate-600 font-medium">
        Ulice
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          onBlur={commitAddress}
          placeholder="Ulice a číslo"
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-slate-600 font-medium">
          Město
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onBlur={commitAddress}
            placeholder="Město"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
          />
        </label>
        <label className="block text-xs text-slate-600 font-medium">
          PSČ
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            onBlur={commitAddress}
            placeholder="PSČ"
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
          />
        </label>
      </div>
      <label className="block text-xs text-slate-600 font-medium">
        Telefon
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={commitPhone}
          className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
        />
      </label>
      <div className="flex gap-2">
        <label className="block flex-1 text-xs text-slate-600 font-medium">
          Cena (Kč)
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={commitPrice}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
          />
        </label>
        <label className="block flex-1 text-xs text-slate-600 font-medium">
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
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-2xs"
          >
            <option value="per_semester">pololetí</option>
            <option value="per_year">rok</option>
            <option value="per_month">měsíc</option>
            <option value="per_session">lekce</option>
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between pt-1">
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
            className="text-xs font-semibold text-red-600"
          >
            Obnovit z katalogu
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
        >
          Hotovo
        </button>
      </div>
    </div>
  );
}

/** Značka uživatelské úpravy */
function EditedMark() {
  return (
    <span
      className="ml-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
      title="Tuto hodnotu jste upravili; není to ověřený údaj z katalogu."
    >
      upraveno vámi
    </span>
  );
}

/** Detail vlastní události */
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
    <section className="space-y-2 border-b border-slate-200/80 bg-white p-3">
      <h2 className="text-base font-bold text-slate-900">✎ {entry.name}</h2>
      <div className="space-y-1 text-xs text-slate-600 font-medium">
        {entry.sessions.map((s) => (
          <div key={s.id} className="flex items-center gap-1">
            <IconClock className="h-3 w-3 text-slate-400" />
            <span>
              {WEEKDAYS[s.weekday - 1]?.long} {formatTime(s.startMinutes)}–{formatTime(s.endMinutes)}
              {s.everyWeeks && s.everyWeeks > 1 ? ` · každé ${s.everyWeeks} týdny` : ''}
            </span>
          </div>
        ))}
      </div>
      {entry.location && (
        <div className="text-xs text-slate-600">
          {entry.location.street}, {entry.location.city}
        </div>
      )}
      <MapLink key={entry.id} address={entry.location} />
      {entry.sessions[0]?.instructor && (
        <div className="text-xs text-slate-600">
          Lektor: <span className="font-semibold text-slate-800">{entry.sessions[0].instructor}</span>
        </div>
      )}
      {entry.price && (
        <div className="text-xs text-slate-700 font-medium">
          {Number.isFinite(toMonthlyCzk(entry.price.amount, entry.price.period))
            ? `${Math.round(toMonthlyCzk(entry.price.amount, entry.price.period))} Kč/měs (${entry.price.amount} Kč/${PRICE_PERIOD_LABELS[entry.price.period]})`
            : 'Cena neuvedena'}
        </div>
      )}
      {entry.contact?.phone && (
        <a href={`tel:${entry.contact.phone}`} className="block text-xs font-semibold text-blue-600 hover:underline">
          📞 {entry.contact.phone}
        </a>
      )}
      {entry.note && <div className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg">{entry.note}</div>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 shadow-2xs hover:bg-slate-50"
        >
          Upravit
        </button>
        <button
          type="button"
          onClick={() => {
            removeCustomEntry(entry.id);
            selectCustomEntry(null);
          }}
          className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50"
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

/** Připnutá hlavička pravého sloupce */
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
        <h3 className="text-sm font-bold text-slate-900">Zatím žádné kroužky</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Vyberte kroužek z katalogu a hned uvidíte obsazenost týdne, náklady i kolize.
        </p>
        <button
          type="button"
          onClick={focusCatalog}
          className="w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
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
    <section className="space-y-3.5 p-3">
      <div>
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Obsazenost týdne</h3>
        <ul className="space-y-1 text-xs text-slate-700">
          {occupancyByDay.map(({ wd, count }) => (
            <li key={wd}>
              <button
                type="button"
                onClick={() => focusDay(wd)}
                title="Zobrazit tento den v kalendáři"
                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left hover:bg-slate-50 transition font-medium"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 font-semibold text-slate-500">{WEEKDAYS[wd - 1]?.short}</span>
                  {count === 0 ? (
                    <span className="text-slate-400 font-normal">volno</span>
                  ) : (
                    <span className="text-slate-900 font-medium">
                      {count} {count === 1 ? 'kroužek' : count <= 4 ? 'kroužky' : 'kroužků'}
                    </span>
                  )}
                </div>
                {count > 0 && (
                  <span className="flex gap-0.5">
                    {Array.from({ length: count }).map((_, i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 space-y-1 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Souhrn týdne</h3>
        <div className="flex justify-between text-slate-700">
          <span title="Počet všedních dnů (Po–Pá), kdy má dítě aspoň jeden kroužek mezi 13:00 a 19:00.">Obsazená odpoledne:</span>
          <span className="font-semibold text-slate-900">{occupiedAfternoons} z 5</span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span title="Počet cest za kroužky v pracovním týdnu — každý blok Po–Pá je jedna cesta.">Cest týdně:</span>
          <span className="font-semibold text-slate-900">{tripsPerWeek}</span>
        </div>
        <div className="flex justify-between text-slate-700">
          <span title="Součet délek všech kroužků ve všedních dnech, v hodinách za týden.">Hodin týdně:</span>
          <span className="font-semibold text-slate-900">{Math.round(weeklyHours * 10) / 10} h</span>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-2.5 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">Náklady na kroužky</h3>
        {view.summary.costByPeriod.length === 0 ? (
          <div className="text-slate-600">
            Žádná uvedená cena
            {pricelessCount > 0 ? ` · ${pricelessCount} bez ceny` : ''}
          </div>
        ) : (
          <div className="font-bold text-slate-900 text-sm">
            {yearlyTotal.toLocaleString('cs-CZ')} Kč/rok
            <span className="block font-normal text-xs text-slate-500 mt-0.5">
              (~{Math.round(monthlyTotal).toLocaleString('cs-CZ')} Kč/měs)
              {pricelessCount > 0 ? ` · ${pricelessCount} kroužků bez ceny` : ''}
            </span>
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

  if (customEntries.length === 0) return null;

  return (
    <section className="space-y-2 p-3 border-t border-slate-200/80">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Vlastní události</h3>
      <ul className="space-y-1.5">
        {customEntries.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
            <span className="font-semibold text-slate-800">✎ {e.name}</span>
            <button
              type="button"
              onClick={() => removeCustomEntry(e.id)}
              className="text-red-600 font-semibold hover:underline"
            >
              Odebrat
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DetailsPanel({ onEnrolled }: { onEnrolled?: () => void } = {}) {
  return (
    <div className="flex h-full flex-col bg-slate-50/40">
      <div className="shrink-0 border-b border-slate-200/80 bg-white shadow-2xs">
        <PinnedSummary />
      </div>
      <div className="flex-1 overflow-y-auto">
        <SelectedActivity onEnrolled={onEnrolled} />
        <CustomEntryDetail />
        <ScheduleNotices />
      </div>
    </div>
  );
}
