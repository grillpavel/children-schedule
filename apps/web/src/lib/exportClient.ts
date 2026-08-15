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

function download(filename: string, content: string, mime: string): void {
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
): Promise<void> {
  const dataUrl = await toPng(element, { pixelRatio: 2, backgroundColor: '#ffffff' });
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `rozvrh-${slugify(child.name)}.png`;
  link.click();
}

export function printSchedule(): void {
  window.print();
}
