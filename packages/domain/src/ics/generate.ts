import type {
  ActivityCategory,
  ActivityOverride,
  Address,
  CalendarException,
  Catalog,
  Child,
  NamedSchedule,
  PricePeriod,
  ProviderKind,
  Weekday,
} from '../model/types.js';
import { relevantExceptionDates, weeklyOccurrences } from '../calendar/index.js';
import { colorForActivity, colorForChild } from '../model/palette.js';
import { escapeText, joinIcsLines } from './escape.js';
import { VTIMEZONE_EUROPE_PRAGUE } from './vtimezone.js';
import { BYDAY, compactDate, formatPrice, localDateTime, slugify } from './format.js';

const TZID = 'Europe/Prague';
const DEFAULT_ALARM_MINUTES = 30;

export type IcsExportMode = 'recurring' | 'expanded';

/** Jak obarvit události v exportovaném kalendáři. */
export type IcsColorMode = 'single' | 'per_activity';

export interface IcsExportOptions {
  child: Child;
  schedule: NamedSchedule;
  catalog: Catalog;
  schoolYear: { start: string; end: string };
  exceptions: readonly CalendarException[];
  districtCode: string;
  /** DTSTAMP v UTC, formát `YYYYMMDDTHHMMSSZ`. Předává aplikace — doména nevolá `Date.now()`. */
  dtstamp: string;
  mode?: IcsExportMode;
  /** Připomínka X minut před akcí; `null` = bez VALARM. Výchozí 30. */
  alarmMinutesBefore?: number | null;
  /** Vlastní název kalendáře (X-WR-CALNAME + soubor). Výchozí jméno dítěte. */
  calendarTitle?: string;
  /** `single` = jedna barva pro dítě, `per_activity` = barva z palety. Výchozí `per_activity`. */
  colorMode?: IcsColorMode;
  /** Uživatelské přepisy katalogových aktivit (název, adresa, kontakt, cena, barva). */
  overrides?: readonly ActivityOverride[];
}

/** Vnitřní tvar jedné události připravené k zápisu do ICS. */
interface ResolvedEvent {
  sessionId: string;
  weekday: Weekday;
  startMinutes: number;
  endMinutes: number;
  everyWeeks: number | undefined;
  validFrom: string;
  validTo: string;
  summary: string;
  location: string | undefined;
  url: string | undefined;
  descriptionLines: string[];
  /** CSS3 klíčové slovo pro vlastnost `COLOR`. */
  colorCss: string;
}

const PROVIDER_SHORT: Record<ProviderKind, string> = {
  ddm: 'DDM',
  zus: 'ZUŠ',
  sport_club: 'Klub',
  school: 'Škola',
  private: 'Soukromé',
  other: '',
};

const CATEGORY_CS: Record<ActivityCategory, string> = {
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

/** Celá adresa `Ulice, Město, PSČ` (prázdné části vynechá). */
function formatAddress(a: Address): string {
  return [a.street, a.city, a.zip].filter(Boolean).join(', ');
}

/** Bohatý popis události — aby po importu (např. Apple Kalendář) bylo vše vidět. */
function buildDescription(f: {
  description?: string;
  venueName?: string;
  address?: string;
  web?: string;
  instructor?: string;
  person?: string;
  phone?: string;
  email?: string;
  price?: { amount: number; period: PricePeriod };
  ageRange?: string;
  category?: string;
}): string[] {
  const lines: string[] = [];
  if (f.description) lines.push(f.description);
  if (f.venueName) lines.push(`Místo: ${f.venueName}`);
  if (f.address) lines.push(`Adresa: ${f.address}`);
  if (f.web) lines.push(`Web: ${f.web}`);
  if (f.instructor) lines.push(`Lektor: ${f.instructor}`);
  if (f.person) lines.push(`Kontakt: ${f.person}`);
  if (f.phone) lines.push(`Telefon: ${f.phone}`);
  if (f.email) lines.push(`E-mail: ${f.email}`);
  if (f.price && Number.isFinite(f.price.amount)) {
    lines.push(`Cena: ${formatPrice(f.price.amount, f.price.period)}`);
  }
  if (f.ageRange) lines.push(`Věk: ${f.ageRange}`);
  if (f.category) lines.push(`Kategorie: ${f.category}`);
  return lines;
}

function resolveEvents(options: IcsExportOptions): ResolvedEvent[] {
  const { child, schedule, catalog } = options;
  const colorMode: IcsColorMode = options.colorMode ?? 'per_activity';
  const childCss = colorForChild(child.id).css;
  const providers = new Map(catalog.providers.map((p) => [p.id, p]));
  const activities = new Map(catalog.activities.map((a) => [a.id, a]));
  const groups = new Map(catalog.sessionGroups.map((g) => [g.id, g]));
  const venues = new Map((catalog.venues ?? []).map((v) => [v.id, v]));
  const overrides = new Map(
    (options.overrides ?? []).map((o) => [o.activityId, o]),
  );
  const events: ResolvedEvent[] = [];

  const eventCss = (
    activityId: string | undefined,
    overrideCss: string | undefined,
  ): string => {
    if (colorMode === 'single' || !activityId) return childCss;
    return overrideCss ?? colorForActivity(activityId).css;
  };

  for (const enrollment of schedule.enrollments) {
    if (enrollment.childId !== child.id) continue;
    const group = groups.get(enrollment.sessionGroupId);
    const activity = activities.get(enrollment.activityId);
    if (!group || !activity) continue;
    const override = overrides.get(activity.id);
    const provider = providers.get(activity.providerId);
    const venue = group.venueId ? venues.get(group.venueId) : undefined;
    const short = provider ? PROVIDER_SHORT[provider.kind] : '';
    const name = override?.name ?? activity.name;
    const summary = short ? `${name} (${short})` : name;
    const baseAddress = override?.address ?? venue?.address ?? provider?.address;
    const phone = override?.contactPhone ?? provider?.contact.phone;
    const price = override?.price ?? activity.price;
    const web = activity.sourceUrl ?? provider?.website;

    for (const session of group.sessions) {
      const address = session.locationOverride ?? baseAddress;
      const addressText = address ? formatAddress(address) : undefined;
      events.push({
        sessionId: session.id,
        weekday: session.weekday,
        startMinutes: session.startMinutes,
        endMinutes: session.endMinutes,
        everyWeeks: session.everyWeeks,
        validFrom: session.validFrom,
        validTo: session.validTo,
        summary,
        location: addressText,
        url: web,
        descriptionLines: buildDescription({
          description: activity.description,
          venueName: venue?.name,
          address: addressText,
          web,
          instructor: session.instructor,
          person: provider?.contact.personName,
          phone,
          email: provider?.contact.email,
          price,
          ageRange: `${activity.ageMin}–${activity.ageMax} let`,
          category: CATEGORY_CS[activity.category],
        }),
        colorCss: eventCss(activity.id, override?.colorCss),
      });
    }
  }

  for (const entry of schedule.customEntries) {
    if (entry.childId !== child.id) continue;
    for (const session of entry.sessions) {
      const address = session.locationOverride ?? entry.location;
      const addressText = address ? formatAddress(address) : undefined;
      events.push({
        sessionId: session.id,
        weekday: session.weekday,
        startMinutes: session.startMinutes,
        endMinutes: session.endMinutes,
        everyWeeks: session.everyWeeks,
        validFrom: session.validFrom,
        validTo: session.validTo,
        summary: entry.name,
        location: addressText,
        url: undefined,
        descriptionLines: buildDescription({
          description: entry.note,
          address: addressText,
          instructor: session.instructor,
          phone: entry.contact?.phone,
          price: entry.price,
        }),
        colorCss: eventCss(undefined, undefined),
      });
    }
  }

  // Stabilní pořadí kvůli determinismu výstupu.
  events.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
  return events;
}

function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}
function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

function alarmLines(minutesBefore: number, summary: string): string[] {
  return [
    'BEGIN:VALARM',
    `TRIGGER:-PT${minutesBefore}M`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`${summary} za ${minutesBefore} minut`)}`,
    'END:VALARM',
  ];
}

function eventBodyLines(event: ResolvedEvent, alarm: number | null): string[] {
  const lines: string[] = [`SUMMARY:${escapeText(event.summary)}`];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  if (event.descriptionLines.length > 0) {
    lines.push(`DESCRIPTION:${escapeText(event.descriptionLines.join('\n'))}`);
  }
  lines.push('CATEGORIES:Kroužek');
  lines.push(`COLOR:${event.colorCss}`);
  if (alarm !== null) lines.push(...alarmLines(alarm, event.summary));
  return lines;
}

/** VEVENT s RRULE + EXDATE (výchozí, kompaktní režim). */
function buildRecurringEvent(
  event: ResolvedEvent,
  options: IcsExportOptions,
  exceptionDates: Set<string>,
  childSlug: string,
  alarm: number | null,
): string[] | undefined {
  const from = maxIso(event.validFrom, options.schoolYear.start);
  const until = minIso(event.validTo, options.schoolYear.end);
  if (from > until) return undefined;

  const occurrences = weeklyOccurrences(event.weekday, from, until, event.everyWeeks);
  const dtstartDate = occurrences.find((o) => !exceptionDates.has(o));
  if (dtstartDate === undefined) return undefined; // vše padne na výjimku

  const exdates = occurrences.filter(
    (o) => o > dtstartDate && exceptionDates.has(o),
  );

  const interval =
    event.everyWeeks && event.everyWeeks > 1 ? `INTERVAL=${event.everyWeeks};` : '';
  const untilUtc = `${compactDate(until)}T235959Z`;

  const lines: string[] = [
    'BEGIN:VEVENT',
    `UID:krouzky-${childSlug}-${event.sessionId}@krouzky-planner.local`,
    `DTSTAMP:${options.dtstamp}`,
    `DTSTART;TZID=${TZID}:${localDateTime(dtstartDate, event.startMinutes)}`,
    `DTEND;TZID=${TZID}:${localDateTime(dtstartDate, event.endMinutes)}`,
    `RRULE:FREQ=WEEKLY;${interval}BYDAY=${BYDAY[event.weekday]};UNTIL=${untilUtc}`,
  ];

  if (exdates.length > 0) {
    const values = exdates
      .map((d) => localDateTime(d, event.startMinutes))
      .join(',');
    lines.push(`EXDATE;TZID=${TZID}:${values}`);
  }

  lines.push(...eventBodyLines(event, alarm), 'END:VEVENT');
  return lines;
}

/** Jedna VEVENT na každý výskyt (fallback pro klienty, kterým vadí EXDATE). */
function buildExpandedEvents(
  event: ResolvedEvent,
  options: IcsExportOptions,
  exceptionDates: Set<string>,
  childSlug: string,
  alarm: number | null,
): string[] {
  const from = maxIso(event.validFrom, options.schoolYear.start);
  const until = minIso(event.validTo, options.schoolYear.end);
  if (from > until) return [];

  const occurrences = weeklyOccurrences(event.weekday, from, until, event.everyWeeks);
  const lines: string[] = [];
  for (const occ of occurrences) {
    if (exceptionDates.has(occ)) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:krouzky-${childSlug}-${event.sessionId}-${compactDate(occ)}@krouzky-planner.local`,
      `DTSTAMP:${options.dtstamp}`,
      `DTSTART;TZID=${TZID}:${localDateTime(occ, event.startMinutes)}`,
      `DTEND;TZID=${TZID}:${localDateTime(occ, event.endMinutes)}`,
      ...eventBodyLines(event, alarm),
      'END:VEVENT',
    );
  }
  return lines;
}

/**
 * Vygeneruje kompletní `.ics` řetězec pro jedno dítě.
 * Vše se generuje v prohlížeči, nic se neodesílá.
 */
export function generateIcs(options: IcsExportOptions): string {
  const childSlug = slugify(options.child.name);
  const calendarTitle = options.calendarTitle ?? options.child.name;
  const calendarColor = colorForChild(options.child.id).fill;
  const exceptionDates = relevantExceptionDates(
    options.exceptions,
    options.districtCode,
  );
  const alarm =
    options.alarmMinutesBefore === null
      ? null
      : options.alarmMinutesBefore ?? DEFAULT_ALARM_MINUTES;
  const mode = options.mode ?? 'recurring';
  const events = resolveEvents(options);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//krouzky-planner//CS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarTitle)}`,
    `X-WR-TIMEZONE:${TZID}`,
    `X-APPLE-CALENDAR-COLOR:${calendarColor}`,
    ...VTIMEZONE_EUROPE_PRAGUE,
  ];

  for (const event of events) {
    const veventLines =
      mode === 'expanded'
        ? buildExpandedEvents(event, options, exceptionDates, childSlug, alarm)
        : buildRecurringEvent(event, options, exceptionDates, childSlug, alarm);
    if (veventLines) lines.push(...veventLines);
  }

  lines.push('END:VCALENDAR');
  return joinIcsLines(lines);
}

/** Název souboru pro export jednoho dítěte, např. `Julinka.ics`. */
export function icsFileName(child: Child, calendarTitle?: string): string {
  return `${calendarTitle ?? child.name}.ics`;
}
