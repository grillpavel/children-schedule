'use client';

import { useEffect, useState } from 'react';

import {
  colorForActivity,
  detectConflicts,
  overrideSourceChanged,
  pricePerLesson,
  relevantExceptionDates,
  scheduleSummary,
  suggestVariantSwitches,
  upcomingDeadlines,
  weeklyOccurrences,
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
 * Poloha na mapě (Changes 10 C10-1): náhled OpenStreetMap + odkaz do Mapy.cz.
 * Tlačítko „Zobrazit mapu“ nabídne u JAKÉKOLI adresy; chybí-li souřadnice
 * (vlastní události, ručně zadané adresy), dohledá je na vyžádání geokódováním.
 */
function MapLink({ address }: { address: Address | undefined }) {
  const [showMap, setShowMap] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!address) {
    return <div className="text-sm text-slate-400">Poloha: neuvedeno</div>;
  }

  const lat = coords?.lat ?? address.lat;
  const lon = coords?.lon ?? address.lon;
  const hasCoords = lat !== undefined && lon !== undefined;
  const hasAddressText = Boolean(address.street || address.city);
  const query = encodeURIComponent(
    [address.street, address.city].filter(Boolean).join(', '),
  );
  const osmLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
    : `https://www.openstreetmap.org/search?query=${query}`;
  const mapyLink = hasCoords
    ? `https://mapy.cz/zakladni?x=${lon}&y=${lat}&z=17&source=coor&id=${lon},${lat}`
    : `https://mapy.cz/zakladni?q=${query}`;

  const openMap = () => {
    setFailed(false);
    if (hasCoords) {
      setShowMap(true);
      return;
    }
    setLoading(true);
    void geocodeAddress(address).then((c) => {
      setLoading(false);
      if (c) {
        setCoords(c);
        setShowMap(true);
      } else {
        setFailed(true);
      }
    });
  };

  return (
    <div className="space-y-1">
      {showMap && hasCoords ? (
        <>
          <iframe
            title="Náhled mapy"
            className="h-32 w-full rounded border border-slate-200"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${
              (lon as number) - 0.006
            }%2C${(lat as number) - 0.004}%2C${
              (lon as number) + 0.006
            }%2C${(lat as number) + 0.004}&layer=mapnik&marker=${lat}%2C${lon}`}
          />
          <p className="text-[10px] text-slate-400">
            Náhled načítá OpenStreetMap; poloha se odesílá třetí straně.
          </p>
        </>
      ) : (
        hasAddressText && (
          <button
            type="button"
            onClick={openMap}
            disabled={loading}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Náhled mapy se načte z OpenStreetMap až po kliknutí."
          >
            {loading ? 'Načítám mapu…' : 'Zobrazit mapu'}
          </button>
        )
      )}
      {failed && (
        <p className="text-[11px] text-slate-500">
          Polohu se nepodařilo dohledat. Otevřete adresu v mapě přes odkaz níže.
        </p>
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
  const exceptions = usePlannerStore((s) => s.exceptions);
  const districtCode = usePlannerStore((s) => s.state.districtCode);
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
  const phoneEdited = override?.contactPhone !== undefined;
  const anyEdited = nameEdited || addressEdited || priceEdited || phoneEdited;

  // Rozsah lekcí odvozený z platnosti termínů a školních výjimek (Changes 8 C8-D2).
  const rangeGroup = groups.find((g) => g.id === chosenVariant) ?? groups[0];
  const holidayDates = relevantExceptionDates(exceptions, districtCode);
  const lessonCount = rangeGroup
    ? rangeGroup.sessions.reduce((sum, s) => {
        const occ = weeklyOccurrences(s.weekday, s.validFrom, s.validTo, s.everyWeeks);
        return sum + occ.filter((d) => !holidayDates.has(d)).length;
      }, 0)
    : 0;
  const firstSession = rangeGroup?.sessions[0];
  const lessonMinutes = firstSession
    ? firstSession.endMinutes - firstSession.startMinutes
    : 0;

  // Délka sezony aktivity z platnosti termínu → podíl Kč/lekce (BL-018).
  const activitySeasonMonths = (() => {
    if (!rangeGroup || rangeGroup.sessions.length === 0) return 0;
    let earliest = rangeGroup.sessions[0]!.validFrom;
    let latest = rangeGroup.sessions[0]!.validTo;
    for (const s of rangeGroup.sessions) {
      if (s.validFrom < earliest) earliest = s.validFrom;
      if (s.validTo > latest) latest = s.validTo;
    }
    const [fy, fm] = earliest.split('-').map(Number);
    const [ty, tm] = latest.split('-').map(Number);
    if (!fy || !fm || !ty || !tm) return 0;
    return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
  })();
  const perLesson = pricePerLesson(effPrice, lessonCount, activitySeasonMonths);

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
              className="w-full rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
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
      <div className="text-sm text-slate-600">
        Kapacita: {activity.capacity ?? 'neuvedeno'}
      </div>
      {activity.applicationDeadline && (
        <div className="text-sm font-medium text-slate-800">
          Uzávěrka přihlášek: {activity.applicationDeadline}
        </div>
      )}
      {(lessonMinutes > 0 || lessonCount > 0) && (
        <div className="text-sm text-slate-600">
          {lessonMinutes > 0 && <>Délka lekce: {lessonMinutes} min</>}
          {lessonMinutes > 0 && lessonCount > 0 && ' · '}
          {lessonCount > 0 && (
            <span title="Počet výskytů termínu v sezoně po odečtení svátků a prázdnin.">
              Lekcí za sezonu: {lessonCount}
            </span>
          )}
          {perLesson !== undefined && (
            <span title="Odvozená cena za jednu lekci z ceny a počtu lekcí.">
              {' · '}
              {Math.round(perLesson)} Kč/lekce
            </span>
          )}
        </div>
      )}
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
        {anyEdited && ' · upravené údaje nejsou ověřené'}
      </div>
      {override && overrideSourceChanged(activity, override) && (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Zdroj kroužku se od vaší úpravy
          {override.editedAt ? ` (${override.editedAt})` : ''} změnil.
          <button
            type="button"
            onClick={() => clearActivityOverride(activity.id)}
            className="ml-1 underline hover:no-underline"
          >
            Přijmout nový údaj z katalogu
          </button>
        </div>
      )}

      <div className="pt-1">
        <div className="mb-1 text-xs font-medium text-slate-500">Poznámka rodiče</div>
        <textarea
          key={`note-${activity.id}`}
          defaultValue={override?.note ?? ''}
          onBlur={(e) =>
            setActivityOverride(activity.id, {
              note: e.target.value.trim() || undefined,
            })
          }
          rows={2}
          placeholder="Vaše soukromá poznámka (nezveřejňuje se)"
          className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
        />
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

function Summary() {
  const view = useScheduleView();
  const catalog = usePlannerStore((s) => s.catalog);
  const schedule = usePlannerStore((s) => activeSchedule(s.state));
  const activeChildId = usePlannerStore((s) => s.activeChildId);
  const changeVariant = usePlannerStore((s) => s.changeVariant);
  const removeCustomEntry = usePlannerStore((s) => s.removeCustomEntry);
  const focusDay = usePlannerStore((s) => s.focusDay);
  const schedules = usePlannerStore((s) => s.state.schedules);
  const activeScheduleId = usePlannerStore((s) => s.state.activeScheduleId);
  const children = usePlannerStore((s) => s.state.children);
  const schoolYear = usePlannerStore((s) => s.state.schoolYear);
  const [openConflict, setOpenConflict] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [maxAfternoons, setMaxAfternoons] = useState<string>(() =>
    typeof window === 'undefined'
      ? ''
      : (window.sessionStorage.getItem('summaryMaxAfternoons') ?? ''),
  );
  const [maxMonthly, setMaxMonthly] = useState<string>(() =>
    typeof window === 'undefined'
      ? ''
      : (window.sessionStorage.getItem('summaryMaxMonthly') ?? ''),
  );
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('summaryMaxAfternoons', maxAfternoons);
    }
  }, [maxAfternoons]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('summaryMaxMonthly', maxMonthly);
    }
  }, [maxMonthly]);
  const enrollments = usePlannerStore((s) =>
    activeSchedule(s.state).enrollments.filter((e) => e.childId === s.activeChildId),
  );
  const customEntries = usePlannerStore((s) =>
    activeSchedule(s.state).customEntries.filter(
      (e) => e.childId === s.activeChildId,
    ),
  );

  // Délka sezony odvozená z platnosti termínů; záložka 9 měsíců (říjen–květen).
  const seasonMonths = view.summary.seasonMonths || 9;

  const focusCatalog = () => {
    const input = document.querySelector<HTMLInputElement>('[data-catalog-search]');
    input?.focus();
    input?.scrollIntoView({ block: 'center' });
  };

  // Prázdný stav (C8-A1/A2): žádné nuly, žádné grafy — vedení dál.
  if (view.summary.activityCount === 0) {
    return (
      <section className="space-y-3 p-3">
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
        <ul className="list-disc pl-4 text-xs text-slate-500">
          <li>Začněte filtrem podle dne, kdy máte volno.</li>
          <li>Kroužky běží zpravidla od října do května.</li>
        </ul>
        <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Rozvrh existuje jen v tomto okně. Uložte si ho přes tlačítko Uložit.
        </p>
      </section>
    );
  }

  // Metriky (C8-B1/B2): obsazená odpoledne z 5 a počet cest týdně.
  const weekdayBlocks = view.blocks.filter((b) => b.weekday >= 1 && b.weekday <= 5);
  const occupiedAfternoons = new Set(
    weekdayBlocks
      .filter((b) => b.endMinutes > 13 * 60 && b.startMinutes < 19 * 60)
      .map((b) => b.weekday),
  ).size;
  const tripsPerWeek = weekdayBlocks.length;
  const weeklyHours =
    weekdayBlocks.reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0) / 60;

  // Neutrální rozpad obsazenosti po dnech (Changes 8 C8-B1), bez barevné škály.
  const occupancyByDay = ([1, 2, 3, 4, 5] as const).map((wd) => ({
    wd,
    count: weekdayBlocks.filter((b) => b.weekday === wd).length,
  }));

  // Uzávěrky přihlášek (Changes 8 C8-B6); dnešek dodává app, ne doména.
  const deadlines = upcomingDeadlines(
    catalog,
    schedule,
    activeChildId,
    new Date().toISOString().slice(0, 10),
  );

  // Poctivá cena (C8-B3): nikdy holý součet — započti položky bez ceny.
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

  // Volitelné uživatelské stropy (Changes 8 C8-B5).
  const afternoonLimit = Number(maxAfternoons);
  const monthlyLimit = Number(maxMonthly);
  const afternoonExceeded =
    maxAfternoons !== '' &&
    Number.isFinite(afternoonLimit) &&
    occupiedAfternoons > afternoonLimit;
  const monthlyExceeded =
    maxMonthly !== '' &&
    Number.isFinite(monthlyLimit) &&
    Math.round(monthlyTotal) > monthlyLimit;

  // Porovnání variant (Changes 8 C8-G1): klíčové metriky napříč rozvrhy.
  const variantRows = schedules.map((sch) => {
    const sum = scheduleSummary(sch, catalog, activeChildId);
    const rep = detectConflicts({ schedule: sch, catalog, children, schoolYear });
    const occupiedDays = 5 - sum.freeWeekdays.filter((d) => d >= 1 && d <= 5).length;
    const monthly = sum.costByPeriod.reduce(
      (acc, c) => acc + toMonthlyCzk(c.amountCzk, c.period),
      0,
    );
    return {
      id: sch.id,
      name: sch.name,
      count: sum.activityCount,
      occupiedDays,
      monthly: Math.round(monthly),
      conflicts: rep.conflicts.length,
    };
  });

  return (
    <section className="space-y-3 p-3">
      <div>
        <h3 className="mb-1 text-sm font-semibold">Souhrn rozvrhu</h3>
        <div
          className="text-sm text-slate-600"
          title="Odpoledne je obsazené, když mezi 13:00 a 19:00 je aspoň jedna událost (Po–Pá)."
        >
          Obsazená odpoledne: {occupiedAfternoons} z 5
        </div>
        <div
          className="text-sm text-slate-600"
          title="Cesta = jedna docházka v týdnu (jeden blok v rozvrhu, Po–Pá)."
        >
          Cest týdně: {tripsPerWeek}
        </div>
        <div className="text-xs text-slate-500" title="Součet délek lekcí za týden (Po–Pá).">
          Hodin týdně: {Math.round(weeklyHours * 10) / 10}
        </div>
      </div>

      {deadlines.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Uzávěrky</h3>
          <ul className="space-y-0.5 text-sm">
            {deadlines.map((d) => (
              <li
                key={d.activityId}
                className={
                  d.daysLeft < 0
                    ? 'text-slate-400'
                    : d.daysLeft <= 7
                      ? 'text-red-700'
                      : 'text-amber-700'
                }
              >
                {d.name}: do {d.deadline}{' '}
                {d.daysLeft < 0
                  ? '(po termínu)'
                  : d.daysLeft === 0
                    ? '(dnes)'
                    : `(za ${d.daysLeft} dní)`}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  <span className="text-slate-400">volno</span>
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
        <h3 className="mb-1 text-sm font-semibold">Náklady</h3>
        {view.summary.costByPeriod.length === 0 ? (
          <div className="text-sm text-slate-600">
            Žádná uvedená cena
            {pricelessCount > 0 ? ` · ${pricelessCount} kroužků bez ceny` : ''}
          </div>
        ) : (
          <>
            {view.summary.costByPeriod.map((c) => (
              <div key={c.period} className="text-sm text-slate-600">
                {c.amountCzk} Kč / {PRICE_PERIOD_LABELS[c.period]}
                {pricelessCount > 0 ? ` · ${pricelessCount} kroužků bez ceny` : ''}
              </div>
            ))}
            <div className="text-xs text-slate-500">
              ≈ {Math.round(monthlyTotal)} Kč/měs (za {seasonMonths} měsíců sezony)
            </div>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">Moje limity</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-500">
            Max. obsazených odpolední
            <input
              type="number"
              min={0}
              value={maxAfternoons}
              onChange={(e) => setMaxAfternoons(e.target.value)}
              placeholder="—"
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            Max. Kč/měsíc
            <input
              type="number"
              min={0}
              value={maxMonthly}
              onChange={(e) => setMaxMonthly(e.target.value)}
              placeholder="—"
              className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-sm"
            />
          </label>
        </div>
        {afternoonExceeded && (
          <p className="mt-1 text-sm text-amber-700">
            ● Překročen strop obsazených odpolední ({occupiedAfternoons} &gt; {afternoonLimit}).
          </p>
        )}
        {monthlyExceeded && (
          <p className="mt-1 text-sm text-amber-700">
            ● Překročen měsíční rozpočet ({Math.round(monthlyTotal)} &gt; {monthlyLimit} Kč/měs).
          </p>
        )}
      </div>

      {schedules.length > 1 && (
        <div>
          <button
            type="button"
            onClick={() => setCompareOpen((v) => !v)}
            className="mb-1 text-sm font-semibold text-slate-700"
          >
            {compareOpen ? '▾' : '▸'} Porovnání variant ({schedules.length})
          </button>
          {compareOpen && (
            <table className="w-full border-collapse text-xs tabular-nums">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1 pr-2 font-medium">Varianta</th>
                  <th className="py-1 pr-2 font-medium" title="Počet kroužků">Kr.</th>
                  <th className="py-1 pr-2 font-medium" title="Obsazené všední dny z 5">Dny</th>
                  <th className="py-1 pr-2 font-medium" title="Odhad Kč/měsíc">Kč/měs</th>
                  <th className="py-1 font-medium" title="Počet konfliktů">Konf.</th>
                </tr>
              </thead>
              <tbody>
                {variantRows.map((r) => (
                  <tr
                    key={r.id}
                    className={r.id === activeScheduleId ? 'font-medium text-slate-900' : 'text-slate-600'}
                  >
                    <td className="py-1 pr-2">{r.name}</td>
                    <td className="py-1 pr-2">{r.count}</td>
                    <td className="py-1 pr-2">{r.occupiedDays}</td>
                    <td className="py-1 pr-2">{r.monthly}</td>
                    <td className={r.conflicts > 0 ? 'py-1 text-red-700' : 'py-1'}>{r.conflicts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div aria-live="polite">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          Konflikty a upozornění
          {view.conflicts.length > 0 && (
            <span className="rounded-full bg-slate-200 px-1.5 text-[11px] text-slate-600">
              {view.conflicts.length}
            </span>
          )}
        </h3>
        {view.conflicts.length === 0 ? (
          <p className="text-sm text-slate-500">Zatím žádné konflikty.</p>
        ) : (
          <ul className="space-y-1">
            {view.conflicts.map((c, i) => {
              const canResolve = c.kind === 'time_overlap' && c.severity === 'hard';
              const suggestions =
                canResolve && openConflict === i
                  ? suggestVariantSwitches(catalog, schedule, activeChildId, c)
                  : [];
              return (
                <li
                  key={i}
                  className={
                    c.severity === 'hard'
                      ? 'text-sm text-red-700'
                      : 'text-sm text-amber-700'
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <span>
                      {c.severity === 'hard' ? '⚠ ' : '● '}
                      {c.message}
                    </span>
                    {canResolve && (
                      <button
                        type="button"
                        onClick={() => setOpenConflict(openConflict === i ? null : i)}
                        className="shrink-0 rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-600 hover:bg-red-50"
                      >
                        Vyřešit
                      </button>
                    )}
                  </div>
                  {canResolve && openConflict === i && (
                    <div className="mt-1 space-y-1 rounded border border-slate-200 bg-slate-50 p-2">
                      {suggestions.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          Žádná bezkolizní varianta těchto kroužků neexistuje. Zvolte jiný
                          kroužek nebo jeden odeberte.
                        </p>
                      ) : (
                        suggestions.map((sug) => (
                          <button
                            key={`${sug.enrollmentId}-${sug.toGroupId}`}
                            type="button"
                            onClick={() => {
                              changeVariant(sug.enrollmentId, sug.toGroupId);
                              setOpenConflict(null);
                            }}
                            className="block w-full rounded border border-slate-200 bg-white px-2 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                          >
                            Přepnout na {sug.toLabel}
                            {sug.remainingOverlaps === 0
                              ? ' (bez kolize)'
                              : ` (zbyde ${sug.remainingOverlaps} kolizí)`}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </li>
              );
            })}
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
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <>
          <SelectedActivity />
          <CustomEntryDetail />
          <Summary />
        </>
      </div>
    </div>
  );
}
