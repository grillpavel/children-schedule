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
  type SessionOverride,
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

/** `blob:` URL má vždy krátkou adresu (opaque odkaz na objekt) bez ohledu na
 * velikost obsahu — na rozdíl od dřívějšího `data:` URI proto nenaráží na
 * (mezi verzemi iOS Safari kolísající, nedokumentovaný) limit délky URI při
 * navigaci. Kalendář s hodně kroužky = dlouhý obsah, který přes `data:` URI na
 * některých telefonech tiše selhal (žádná chyba, žádná reakce) — design_review_98.md. */
function icsBlobUrl(content: string, mime: string): string {
  return URL.createObjectURL(new Blob([content], { type: mime }));
}

function download(filename: string, content: string, mime: string): void {
  // iOS Safari `<a download>` u blob: URL pro .ics nespolehlivě funguje (běžně
  // se buď otevře syrový text, nebo se nestane nic) — přímá navigace na URL se
  // stejným MIME typem naopak spolehlivě vyvolá nativní "Přidat do kalendáře"
  // (design_review_93.md). Mac Safari/Chrome i Android zvládají obojí stejně,
  // proto se přepínáme jen na iOS a jen pro .ics.
  if (mime.startsWith('text/calendar') && isIosDevice()) {
    const blobUrl = icsBlobUrl(content, mime);
    window.location.href = blobUrl;
    // Zachycení kalendáře na iOS je asynchronní — neuvolňovat hned po nastavení
    // navigace, jinak riziko, že se objekt zruší dřív, než se stihne načíst.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
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
  /** Per-dítě přepisy termínů (design_review_96.md, CHANGE-103). */
  sessionOverrides?: readonly SessionOverride[];
}

function buildIcsExport(input: IcsDownloadInput): { content: string; filename: string } {
  const content = generateIcs({
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
    ...(input.sessionOverrides ? { sessionOverrides: input.sessionOverrides } : {}),
  });
  return { content, filename: icsFileName(input.child, input.calendarTitle) };
}

export function downloadIcs(input: IcsDownloadInput): void {
  const { content, filename } = buildIcsExport(input);
  download(filename, content, 'text/calendar;charset=utf-8');
}

/** Čistá-ish verze pro skutečný `<a href>`, na který uživatel klepne sám
 * (design_review_98.md) — opakované automatické navigace ve smyčce/`setTimeout`
 * na iOS Safari ztrácejí "user gesture" a bez varování se zahodí, proto u
 * exportu VÍCE kalendářů najednou nabízíme odkazy místo automatického stažení.
 * Vrácená `blob:` URL zůstává platná, dokud volající nezavolá
 * `URL.revokeObjectURL(href)` (typicky při zavření dialogu s odkazy). */
export function icsExportHref(input: IcsDownloadInput): { href: string; filename: string } {
  const { content, filename } = buildIcsExport(input);
  return { href: icsBlobUrl(content, 'text/calendar;charset=utf-8'), filename };
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
