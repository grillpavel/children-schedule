'use client';

import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { Address, Price } from '@krouzky/domain';
import { ColorSwatches } from './ColorSwatches';
import { IconMapPin, IconUser, IconChevronDown, IconCheck } from './Icons';

/**
 * Sdílená knihovna sekcí pro detail položky — použita jak katalogovou
 * aktivitou (`SelectedActivity`), tak vlastní událostí (`CustomEntryDetail`)
 * (CHANGE-114, design_review_107.md). Dřív měl každý typ položky VLASTNÍ
 * kopii téhle logiky (Místo konání/Cena a věk/Barva/Prázdniny…), která se
 * po každé úpravě jednoho z nich nezávisle rozjížděla — přesně to samé, co
 * CHANGE-110 řešilo u obálek popup oken. Nová sekce nebo oprava se teď píše
 * jednou tady a platí pro oba typy položek automaticky.
 *
 * Co záměrně NENÍ sdíleno: výběr z více variant docházky u katalogové
 * aktivity (`Varianty docházky` + enroll/un-enroll tok) a pevný jednoduchý
 * rozpis termínů u vlastní události (`Termín`) — to jsou opravdu odlišné
 * doménové koncepty (výběr z nabídky vs. autorský pevný čas), ne jen jiný
 * vzhled téhož. Oba se ale renderují na STEJNÉM místě v pořadí sekcí.
 */

export const PRICE_PERIOD_LABELS: Record<string, string> = {
  per_semester: 'pololetí',
  per_year: 'rok',
  per_month: 'měsíc',
  per_session: 'lekce',
};

/** Značka uživatelské úpravy oproti katalogové/výchozí hodnotě. */
export function EditedMark() {
  return (
    <span
      className="ml-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
      title="Tuto hodnotu jste upravili; není to ověřený údaj z katalogu."
    >
      upraveno vámi
    </span>
  );
}

export function MapLink({ address }: { address: Address | undefined }) {
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

/** Generický karetní obal pro sekci detailu (title + obsah). `tone="card"`
 * = bílá karta s okrajem/stínem (Kontakt a odkazy); výchozí `tone="plain"`
 * = jemně šedá karta bez stínu (Místo konání, Cena a věk, Termín…). */
export function DetailSectionCard({
  title,
  tone = 'plain',
  children,
}: {
  title: string;
  tone?: 'plain' | 'card';
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        'space-y-1 rounded-xl p-2.5',
        tone === 'card'
          ? 'border border-slate-200/80 bg-white shadow-2xs'
          : 'border border-slate-100 bg-slate-50/50',
      )}
    >
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div>
      {children}
    </div>
  );
}

export function DetailDescriptionAccordion({
  description,
  label = 'Popis',
}: {
  description: string | undefined;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!description) return null;
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold text-slate-700"
      >
        <span>{label}</span>
        <IconChevronDown className={clsx('h-3.5 w-3.5 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-1.5">
          {description}
        </p>
      )}
    </div>
  );
}

export function DetailLocationCard({
  venueName,
  address,
  edited,
}: {
  venueName?: string;
  address: Address | undefined;
  edited?: boolean;
}) {
  return (
    <DetailSectionCard title="Místo konání">
      {venueName && <div className="text-xs text-slate-800 font-semibold">{venueName}</div>}
      {address && (address.street || address.city) && (
        <div className="text-xs text-slate-600">
          {address.street}, {address.city}
          {address.zip ? `, ${address.zip}` : ''}
          {edited && <EditedMark />}
        </div>
      )}
      <MapLink address={address} />
    </DetailSectionCard>
  );
}

export function DetailPriceAgeCard({
  price,
  ageMin,
  ageMax,
  edited,
  childName,
  childAge,
}: {
  price: Price | undefined;
  ageMin?: number;
  ageMax?: number;
  edited?: boolean;
  /** Jméno aktivního dítěte — když je zadané (i bez věku), zobrazí se řádek
   * vhodnosti. Vynech úplně, pokud kontext dítě nezná. */
  childName?: string;
  childAge?: number;
}) {
  const hasAge = ageMin !== undefined || ageMax !== undefined;
  if (!price && !hasAge) return null;
  const ageMatches =
    childAge !== undefined && ageMin !== undefined && ageMax !== undefined
      ? childAge >= ageMin && childAge <= ageMax
      : undefined;

  return (
    <DetailSectionCard title={hasAge ? 'Cena a věk' : 'Cena'}>
      <div className="text-xs text-slate-700">
        {price && (
          <span className="font-semibold text-slate-900">
            {Number.isFinite(price.amount)
              ? `${price.amount.toLocaleString('cs-CZ')} Kč / ${PRICE_PERIOD_LABELS[price.period]}`
              : 'Cena neuvedena'}
          </span>
        )}
        {hasAge && (
          <span>
            {price ? ' · ' : ''}Vhodné pro {ageMin ?? '?'}–{ageMax ?? '?'} let
          </span>
        )}
        {edited && <EditedMark />}
      </div>
      {childName !== undefined && hasAge && (
        <div
          className={clsx(
            'flex items-center gap-1 text-[11px] font-semibold',
            childAge === undefined ? 'text-slate-500' : ageMatches ? 'text-emerald-700' : 'text-amber-700',
          )}
        >
          {childAge === undefined ? (
            <span>Věk {childName} není vyplněný — vhodnost neověřena</span>
          ) : ageMatches ? (
            <>
              <IconCheck className="h-3 w-3" />
              <span>
                Věk odpovídá ({childName}, {childAge} let)
              </span>
            </>
          ) : (
            <span>
              ⚠ Mimo doporučený věk ({childName}, {childAge} let)
            </span>
          )}
        </div>
      )}
    </DetailSectionCard>
  );
}

export function DetailContactCard({
  contactPerson,
  phone,
  email,
  web,
}: {
  contactPerson?: string;
  phone?: string;
  email?: string;
  web?: string;
}) {
  if (!contactPerson && !phone && !email && !web) return null;
  return (
    <DetailSectionCard title="Kontakt a odkazy" tone="card">
      <div className="space-y-1 text-xs pt-0.5">
        {contactPerson && (
          <div className="text-slate-700 flex items-center gap-1.5 font-medium">
            <IconUser className="h-3.5 w-3.5 text-slate-400" />
            <span>{contactPerson}</span>
          </div>
        )}
        {phone && (
          <a href={`tel:${phone}`} className="block font-medium text-blue-600 hover:underline">
            📞 {phone}
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
    </DetailSectionCard>
  );
}

export function DetailColorSection({
  value,
  onPick,
}: {
  value: string | undefined;
  onPick: (css: string) => void;
}) {
  return (
    <div className="pt-1">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Barva kroužku</div>
      <ColorSwatches value={value} onPick={onPick} />
    </div>
  );
}

export function DetailHolidaySection({
  checked,
  onChange,
  entityLabel = 'Aktivita',
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Podmět věty v nápovědě pod checkboxem — „Aktivita“/„Událost“ se bude…" */
  entityLabel?: string;
}) {
  return (
    <div className="pt-1">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span>Povolit i o prázdninách a státních svátcích</span>
      </label>
      {checked && (
        <p className="mt-1 text-[11px] text-slate-500">
          {entityLabel} se bude zobrazovat i během školních prázdnin a státních svátků.
        </p>
      )}
    </div>
  );
}

export function DetailApplicationLink({
  url,
  className,
}: {
  url: string | undefined;
  className?: string;
}) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={clsx('block text-xs font-semibold text-blue-600 hover:text-blue-800 transition', className)}
    >
      Oficiální přihláška →
    </a>
  );
}

/** Karta primární akce hned pod hlavičkou. U katalogové aktivity nese stav
 * zápisu/tlačítko, u vlastní události (jen když má odkaz na přihlášku) jen
 * ten odkaz — ale OBAL je stejný, takže první věc pod hlavičkou má vždy
 * stejnou vizuální váhu bez ohledu na typ položky. */
export function DetailPrimaryCard({ children }: { children: ReactNode }) {
  return <div className="space-y-2 rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5">{children}</div>;
}

type PriceAgeProps = Omit<Parameters<typeof DetailPriceAgeCard>[0], never>;
type ContactProps = Parameters<typeof DetailContactCard>[0];
type LocationProps = Parameters<typeof DetailLocationCard>[0];
type ColorProps = Parameters<typeof DetailColorSection>[0];
type HolidaysProps = Parameters<typeof DetailHolidaySection>[0];

/**
 * JEDINÝ render pro detail položky (CHANGE-116, design_review_109.md) —
 * nahrazuje dřívější stav, kdy `SelectedActivity` a `CustomEntryDetail` byly
 * dvě samostatné funkce, které jen VOLALY sdílené sekce (CHANGE-114), ale
 * samy si psaly obal/pořadí ručně — a i tak se to znovu rozjelo (CHANGE-115).
 * Teď existuje jedna cesta, která vykresluje hlavičku, primární kartu i
 * pořadí sekcí — volající komponenty dodávají jen DATA a obsah pro
 * pojmenované sloty, ne vlastní JSX strom. Strukturálně už není možné, aby
 * se pořadí nebo mezery mezi oběma typy položek znovu rozešly, protože
 * existuje jen jedno místo, které o tom rozhoduje.
 *
 * Sloty, které jsou u obou typů OPRAVDU jiný doménový koncept (ne jen jiný
 * vzhled téhož) — `scheduleSection` (výběr z variant vs. pevný termín),
 * `primaryCard` (stav zápisu vs. nanejvýš odkaz na přihlášku) a `actions`
 * (dva editory vs. upravit/odebrat) — zůstávají jako `ReactNode` sloty, které
 * si obsah řídí samy, ale template určuje JEJICH POZICI v layoutu pevně.
 */
export function EventDetail({
  onBack,
  title,
  subtitle,
  primaryCard,
  scheduleSection,
  description,
  descriptionLabel,
  location,
  priceAge,
  contact,
  note,
  color,
  holidays,
  actions,
}: {
  onBack: () => void;
  title: ReactNode;
  subtitle: ReactNode;
  /** Vynech úplně, když není co zobrazit (u vlastní události bez odkazu na
   * přihlášku) — šablona pak kartu nevykreslí vůbec, místo prázdného rámu. */
  primaryCard?: ReactNode;
  scheduleSection: ReactNode;
  description: string | undefined;
  descriptionLabel?: string;
  location: LocationProps;
  priceAge: PriceAgeProps;
  contact: ContactProps;
  note?: string;
  color: ColorProps;
  holidays: HolidaysProps;
  actions: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200/80 bg-white">
      <div className="sticky top-0 z-10 space-y-2 border-b border-slate-200/80 bg-white p-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          ← Zpět na souhrn
        </button>
        <h2 className="text-base font-bold text-slate-900 leading-snug">{title}</h2>
        {subtitle}
        {primaryCard && <DetailPrimaryCard>{primaryCard}</DetailPrimaryCard>}
      </div>

      <div className="space-y-3 p-3 text-xs">
        {scheduleSection}
        <DetailDescriptionAccordion description={description} label={descriptionLabel} />
        <DetailLocationCard {...location} />
        <DetailPriceAgeCard {...priceAge} />
        <DetailContactCard {...contact} />
        {note && <div className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg">{note}</div>}
        <DetailColorSection {...color} />
        <DetailHolidaySection {...holidays} />
        {actions}
      </div>
    </section>
  );
}
