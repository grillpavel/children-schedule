import type { Weekday } from '@krouzky/domain';

/** Výška jedné hodiny v mřížce (px) — pixelový layout kvůli rolování. */
export const HOUR_PX = 44;

/** Osa pokrývá celý den; výchozí viewport ukazuje denní okno (~07–21),
    noční hodiny jsou dosažitelné rolováním a záznam lze přidat i mimo (C11). */
export const DAY_START_MIN = 0;
export const DAY_END_MIN = 24 * 60;

/** Nativně zobrazené denní okno (na které se po načtení odroluje). */
export const DAY_WINDOW_START_MIN = 7 * 60;
export const DAY_WINDOW_END_MIN = 21 * 60;

/** Výchozí svislé odrolování — odpoledne, kdy bývá většina kroužků. */
export const DEFAULT_SCROLL_MIN = 13 * 60;

/** Celková výška plochy dne v px. */
export const GRID_HEIGHT_PX = ((DAY_END_MIN - DAY_START_MIN) / 60) * HOUR_PX;

export type ViewMode = 'day' | '3day' | 'week' | 'month';

export interface WeekdayInfo {
  value: Weekday;
  short: string;
  long: string;
}

export const WEEKDAYS: readonly WeekdayInfo[] = [
  { value: 1, short: 'Po', long: 'Pondělí' },
  { value: 2, short: 'Út', long: 'Úterý' },
  { value: 3, short: 'St', long: 'Středa' },
  { value: 4, short: 'Čt', long: 'Čtvrtek' },
  { value: 5, short: 'Pá', long: 'Pátek' },
  { value: 6, short: 'So', long: 'Sobota' },
  { value: 7, short: 'Ne', long: 'Neděle' },
];

/** Hodinové značky pro levý sloupec (00:00 … 23:00). */
export const HOUR_MARKS: number[] = Array.from(
  { length: (DAY_END_MIN - DAY_START_MIN) / 60 },
  (_, i) => DAY_START_MIN + i * 60,
);

/** Minuty → `HH:MM`. */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Svislá pozice bloku v px. `hourPx` je volitelný — mobilní landscape používá
 * nižší hustotu, ať se celý den vejde bez extrémního rolování (FR-W2-2,
 * design_review_73.md). Výchozí `HOUR_PX` zachovává chování všude jinde. */
export function topPx(startMinutes: number, hourPx: number = HOUR_PX): number {
  return ((startMinutes - DAY_START_MIN) / 60) * hourPx;
}

/** Výška bloku v px (minimálně čitelná). */
export function heightPx(startMinutes: number, endMinutes: number, hourPx: number = HOUR_PX): number {
  return Math.max(16, ((endMinutes - startMinutes) / 60) * hourPx);
}

/** Celková výška plochy dne v px pro danou hustotu (FR-W2-2). */
export function gridHeightPx(hourPx: number = HOUR_PX): number {
  return ((DAY_END_MIN - DAY_START_MIN) / 60) * hourPx;
}

/** Počet sloupců dne pro daný pohled. */
export function columnsForView(view: ViewMode): number {
  switch (view) {
    case 'day':
      return 1;
    case '3day':
      return 3;
    default:
      return 7;
  }
}

/**
 * Viditelné dny v týdnu pro pohled. `anchor` je počáteční den (1–7)
 * pro Den / 3 dny; Týden a Měsíc ukazují Po–Ne.
 */
export function visibleWeekdays(view: ViewMode, anchor: Weekday): Weekday[] {
  if (view === 'week' || view === 'month') {
    return WEEKDAYS.map((d) => d.value);
  }
  const count = columnsForView(view);
  const result: Weekday[] = [];
  for (let i = 0; i < count; i++) {
    const v = anchor + i;
    if (v <= 7) result.push(v as Weekday);
  }
  return result;
}

/** Popisek aktuálního rozsahu pohledu. */
export function viewRangeLabel(view: ViewMode, anchor: Weekday): string {
  if (view === 'week') return 'Po–Ne';
  if (view === 'month') return 'Měsíční přehled';
  const days = visibleWeekdays(view, anchor);
  const first = WEEKDAYS[(days[0] ?? 1) - 1];
  const last = WEEKDAYS[(days[days.length - 1] ?? 1) - 1];
  return first === last ? first!.long : `${first!.short}–${last!.short}`;
}

export const MONTHS = [
  'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
  'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec',
];

/** ISO den v týdnu (1 = pondělí .. 7 = neděle) daného data. */
export function isoWeekdayOf(d: Date): Weekday {
  const x = d.getDay();
  return (x === 0 ? 7 : x) as Weekday;
}

/** Datum jako ISO `YYYY-MM-DD` (lokální složky). */
export function isoDateOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Pondělí ISO týdne obsahujícího dané datum. */
export function startOfIsoWeek(d: Date): Date {
  return addDays(d, -(isoWeekdayOf(d) - 1));
}

export function isSameDay(a: Date, b: Date): boolean {
  return isoDateOf(a) === isoDateOf(b);
}

/** Konkrétní data zobrazená v pohledu (mimo Měsíc). */
export function visibleDates(view: ViewMode, anchor: Date): Date[] {
  if (view === 'day') return [anchor];
  if (view === '3day') return [anchor, addDays(anchor, 1), addDays(anchor, 2)];
  // týden: pondělí–neděle
  const monday = startOfIsoWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function shortDate(d: Date): string {
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

/** Popisek aktuálního rozsahu podle kotevního data. */
export function dateRangeLabel(view: ViewMode, anchor: Date): string {
  if (view === 'month') return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  if (view === 'day') {
    return `${WEEKDAYS[isoWeekdayOf(anchor) - 1]!.long} ${anchor.getDate()}. ${anchor.getMonth() + 1}. ${anchor.getFullYear()}`;
  }
  const dates = visibleDates(view, anchor);
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  return `${shortDate(first)} – ${shortDate(last)} ${last.getFullYear()}`;
}

/** Posun kotevního data o jednu jednotku pohledu. */
export function shiftAnchor(view: ViewMode, anchor: Date, dir: 1 | -1): Date {
  switch (view) {
    case 'day':
      return addDays(anchor, dir);
    case '3day':
      return addDays(anchor, 3 * dir);
    case 'week':
      return addDays(anchor, 7 * dir);
    case 'month':
      return addMonths(anchor, dir);
  }
}
