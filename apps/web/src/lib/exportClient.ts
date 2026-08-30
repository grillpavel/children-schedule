'use client';

import { toPng } from 'html-to-image';
import {
  generateIcs,
  icsFileName,
  serializePlannerState,
  slugify,
  type ActivityOverride,
  type CalendarException,
  type Catalog,
  type Child,
  type IcsColorMode,
  type IcsExportMode,
  type NamedSchedule,
  type PlannerState,
} from '@krouzky/domain';

/** Aktuální čas v UTC jako DTSTAMP `YYYYMMDDTHHMMSSZ`. */
export function formatDtStamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** iPhone/iPad — vč. iPadOS 13+, které se hlásí jako `MacIntel`, ale má dotyk. */
export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** Přímý `data:` URI je jediná spolehlivá cesta pro `.ics` na iOS Safari — viz `download()`. */
export function icsDataUri(content: string, mime: string): string {
  return `data:${mime},${encodeURIComponent(content)}`;
}

function download(filename: string, content: string, mime: string): void {
  // iOS Safari `<a download>` u blob: URL pro .ics nespolehlivě funguje (běžně
  // se buď otevře syrový text, nebo se nestane nic) — přímá navigace na
  // `data:` URI se stejným MIME typem naopak spolehlivě vyvolá nativní
  // "Přidat do kalendáře" (design_review_93.md). Mac Safari/Chrome i Android
  // zvládají obojí stejně, proto se přepínáme jen na iOS a jen pro .ics.
  if (mime.startsWith('text/calendar') && isIosDevice()) {
    window.location.href = icsDataUri(content, mime);
    return;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export interface IcsDownloadInput {
  child: Child;
  schedule: NamedSchedule;
  catalog: Catalog;
  schoolYear: { start: string; end: string };
  exceptions: readonly CalendarException[];
  districtCode: string;
  mode?: IcsExportMode;
  calendarTitle?: string;
  colorMode?: IcsColorMode;
  overrides?: readonly ActivityOverride[];
  sequence?: number;
}

export function downloadIcs(input: IcsDownloadInput): void {
  const ics = generateIcs({
    child: input.child,
    schedule: input.schedule,
    catalog: input.catalog,
    schoolYear: input.schoolYear,
    exceptions: input.exceptions,
    districtCode: input.districtCode,
    dtstamp: formatDtStamp(),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(input.calendarTitle ? { calendarTitle: input.calendarTitle } : {}),
    ...(input.colorMode ? { colorMode: input.colorMode } : {}),
    ...(input.overrides ? { overrides: input.overrides } : {}),
    ...(input.sequence !== undefined ? { sequence: input.sequence } : {}),
  });
  download(
    icsFileName(input.child, input.calendarTitle),
    ics,
    'text/calendar;charset=utf-8',
  );
}

export function downloadStateJson(state: PlannerState, child: Child): void {
  download(
    `rozvrh-${slugify(child.name)}.json`,
    serializePlannerState(state),
    'application/json',
  );
}

export async function downloadPng(
  element: HTMLElement,
  child: Child,
  range?: ExportHourRange,
): Promise<void> {
  const restore = range ? applyExportRange(element, range) : null;
  try {
    const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `rozvrh-${slugify(child.name)}.png`;
    link.click();
  } finally {
    restore?.();
  }
}

/** Vybraný rozsah hodin pro export (design_review_88.md) — nejprve rozsah,
 * teprve pak se vygeneruje výstup (tisk nebo obrázek). Nativní výchozí
 * rozsah je 13:00–21:00 (viz `DEFAULT_EXPORT_RANGE`), uživatel ho může
 * upravit v `PrintRangeDialog` (Toolbar.tsx). */
export interface ExportHourRange {
  startMinutes: number;
  endMinutes: number;
}

export const DEFAULT_EXPORT_RANGE: ExportHourRange = { startMinutes: 13 * 60, endMinutes: 21 * 60 };

/** Osa mřížky je vždy celodenní (00:00–24:00); výška sticky hlavičky dne (26px)
 * je zakódovaná v `topPx(m, hourPx) + 26` v ScheduleGrid.tsx — používáme stejnou
 * konstantu, ať dopočet z reálné `scrollHeight` sedí přesně bez ohledu na
 * aktuální `hourPx` (mobil/desktop mají jiný). */
const AXIS_HEADER_PX = 26;

/** Dočasně ořízne scrollovatelný obsah mřížky na zvolený rozsah hodin — použito
 * jak před `window.print()`, tak před `toPng()`. `!important` inline styl,
 * protože tiskové CSS (`@media print .print-grid > div { overflow:visible!important }`)
 * by jinak vyhrálo nad obyčejným inline stylem. Vrací funkci pro obnovu původního stavu. */
function applyExportRange(gridEl: HTMLElement, range: ExportHourRange): () => void {
  const scrollEl = gridEl.querySelector<HTMLElement>('[data-testid="grid-scroll"]');
  if (!scrollEl) return () => {};
  const totalContentPx = scrollEl.scrollHeight - AXIS_HEADER_PX;
  const pxPerMinute = totalContentPx / (24 * 60);
  const topPx = AXIS_HEADER_PX + range.startMinutes * pxPerMinute;
  const heightPx = (range.endMinutes - range.startMinutes) * pxPerMinute + AXIS_HEADER_PX;

  const prevOverflow = scrollEl.style.getPropertyValue('overflow');
  const prevHeight = scrollEl.style.getPropertyValue('height');
  const prevScrollTop = scrollEl.scrollTop;

  scrollEl.style.setProperty('overflow', 'hidden', 'important');
  scrollEl.style.setProperty('height', `${heightPx}px`, 'important');
  scrollEl.scrollTop = topPx;

  return () => {
    scrollEl.style.setProperty('overflow', prevOverflow || '');
    scrollEl.style.setProperty('height', prevHeight || '');
    scrollEl.scrollTop = prevScrollTop;
  };
}

export function printSchedule(gridEl: HTMLElement | null, range?: ExportHourRange): void {
  const restore = gridEl && range ? applyExportRange(gridEl, range) : null;
  const cleanup = () => {
    restore?.();
    window.removeEventListener('afterprint', cleanup);
  };
  if (restore) window.addEventListener('afterprint', cleanup);
  window.print();
}


/** Tisk/uložení jen agendy (souhrn kroužků, `.print-summary`), bez mřížky —
 * kratší, textový výstup pro babičku/žákovskou, ne vizuální rozvrh. Přepínač
 * `data-print-mode` čte pravidlo `[data-print-mode='agenda'] .print-grid` v
 * globals.css; `afterprint` ho po dialogu vždy uklidí, i když uživatel tisk zruší. */
export function printAgenda(): void {
  document.body.dataset.printMode = 'agenda';
  const reset = () => {
    delete document.body.dataset.printMode;
    window.removeEventListener('afterprint', reset);
  };
  window.addEventListener('afterprint', reset);
  window.print();
}
