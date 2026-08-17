import type { Address, Weekday } from '../model/types.js';
import { isoWeekday } from '../calendar/dates.js';

/**
 * Minimalistický parser `.ics` pro import zpět do plánovače.
 * Každý `VEVENT` se mapuje na jednu docházkovou session vlastní události
 * (název, místo, poznámka, den/čas, opakování). Časy se čtou jako lokální
 * (Europe/Prague), stejně jako je aplikace exportuje — bez převodu TZ.
 */

export interface ParsedIcsSession {
  weekday: Weekday;
  startMinutes: number;
  endMinutes: number;
  validFrom: string;
  validTo: string;
  everyWeeks?: number;
}

export interface ParsedIcsEvent {
  name: string;
  location?: Address;
  note?: string;
  sessions: ParsedIcsSession[];
}

/** Reverzní escapování k `escapeText` (RFC 5545). */
function unescapeText(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]!;
    if (ch === '\\' && i + 1 < value.length) {
      const next = value[i + 1]!;
      if (next === 'n' || next === 'N') {
        out += '\n';
        i += 1;
        continue;
      }
      if (next === ',' || next === ';' || next === '\\') {
        out += next;
        i += 1;
        continue;
      }
    }
    out += ch;
  }
  return out;
}

function toIsoDate(compact: string): string | undefined {
  if (!/^\d{8}/.test(compact)) return undefined;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

/** `…THHMMSS` → minuty od půlnoci; bez `T` (jen datum) → undefined. */
function timeToMinutes(value: string): number | undefined {
  const t = value.indexOf('T');
  if (t < 0) return undefined;
  const hh = Number(value.slice(t + 1, t + 3));
  const mm = Number(value.slice(t + 3, t + 5));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return undefined;
  return hh * 60 + mm;
}

function parseLocation(value: string): Address | undefined {
  const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const [street, city, zip] = parts;
  return {
    street: street ?? '',
    city: city ?? '',
    ...(zip ? { zip } : {}),
  };
}

function parseRrule(value: string): { everyWeeks?: number; until?: string } {
  const map = new Map<string, string>();
  for (const part of value.split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0) map.set(part.slice(0, eq).toUpperCase(), part.slice(eq + 1));
  }
  const interval = Number(map.get('INTERVAL'));
  const untilRaw = map.get('UNTIL');
  return {
    ...(Number.isFinite(interval) && interval > 1 ? { everyWeeks: interval } : {}),
    ...(untilRaw ? { until: toIsoDate(untilRaw) } : {}),
  };
}

function buildEvent(props: Map<string, string>): ParsedIcsEvent | undefined {
  const dtstart = props.get('DTSTART');
  if (!dtstart) return undefined;
  const from = toIsoDate(dtstart);
  if (!from) return undefined;

  const start = timeToMinutes(dtstart) ?? 0;
  const dtend = props.get('DTEND');
  let end = dtend ? timeToMinutes(dtend) ?? start + 60 : start + 60;
  if (end <= start) end = start + 60;

  const rrule = props.has('RRULE') ? parseRrule(props.get('RRULE')!) : {};
  const summary = props.get('SUMMARY');
  const location = props.get('LOCATION');
  const description = props.get('DESCRIPTION');

  const session: ParsedIcsSession = {
    weekday: isoWeekday(from) as Weekday,
    startMinutes: start,
    endMinutes: end,
    validFrom: from,
    validTo: rrule.until ?? from,
    ...(rrule.everyWeeks ? { everyWeeks: rrule.everyWeeks } : {}),
  };

  return {
    name: summary ? unescapeText(summary) : 'Importovaná událost',
    ...(location ? { location: parseLocation(unescapeText(location)) } : {}),
    ...(description ? { note: unescapeText(description) } : {}),
    sessions: [session],
  };
}

/** Naparsuje `.ics` řetězec na seznam událostí k importu jako vlastní události. */
export function parseIcs(text: string): ParsedIcsEvent[] {
  // Rozbalí zalomené řádky (CRLF + mezera/tab) do jednoho logického řádku.
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
  const events: ParsedIcsEvent[] = [];
  let current: Map<string, string> | null = null;

  for (const raw of unfolded.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line === 'BEGIN:VEVENT') {
      current = new Map();
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) {
        const event = buildEvent(current);
        if (event) events.push(event);
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const name = line.slice(0, idx).split(';')[0]!.toUpperCase();
    // U opakovaných vlastností (EXDATE apod.) stačí první výskyt.
    if (!current.has(name)) current.set(name, line.slice(idx + 1));
  }

  return events;
}
