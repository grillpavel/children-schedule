import { test, expect, isCompact, openCalendarMenuIfCompact } from '../helpers/profiles';
import { assertCRLF, assertFolding, unfold, getProperty } from '../helpers/ics-raw';
import { readFileSync } from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function openCatalog(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) await page.getByRole('button', { name: 'Katalog', exact: true }).click();
}

// Správa kalendářů (přidání/přepnutí/přejmenování/odebrání) je na desktopu od
// design_review_70.md Vždy v horní liště (banner); na mobilu je od BL-057
// (design_review_88.md) sbalená za tlačítko „Správa kalendářů" — musí se
// nejdřív otevřít.
async function addCalendar(page: import('@playwright/test').Page, width: number, name?: string) {
  await openCalendarMenuIfCompact(page, width);
  await page.getByRole('banner').getByRole('button', { name: 'Přidat kalendář' }).click();
  if (name) {
    await page.getByRole('banner').getByRole('textbox', { name: 'Název nového kalendáře' }).fill(name);
  }
  await page.getByRole('banner').getByRole('button', { name: 'Přidat', exact: true }).click();
}

async function addCustom(
  page: import('@playwright/test').Page,
  width: number,
  opts: { name: string; start?: string; end?: string; address?: string; weekdayValue?: string },
) {
  await openCatalog(page, width);
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const d = page.locator('.fixed.inset-0.z-50');
  await d.getByPlaceholder('Např. Logopedie').fill(opts.name);
  if (opts.weekdayValue) await d.locator('select').first().selectOption(opts.weekdayValue);
  await d.locator('input[type="time"]').nth(0).fill(opts.start ?? '16:00');
  await d.locator('input[type="time"]').nth(1).fill(opts.end ?? '17:00');
  if (opts.address) await d.getByPlaceholder('Ulice a číslo, Město').fill(opts.address);
  await d.getByRole('button', { name: 'Přidat', exact: true }).click();
}

async function exportIcsRaw(
  page: import('@playwright/test').Page,
  mode?: 'expanded',
): Promise<string> {
  await page.getByRole('button', { name: /Další ▾/ }).click();
  const pending = page.waitForEvent('download');
  const name = mode === 'expanded' ? /rozbalené/ : 'Kalendář (.ics)';
  await page.getByRole('button', { name }).click();
  const download = await pending;
  return readFileSync((await download.path())!, 'utf8');
}

function unescapeIcs(v: string): string {
  return v.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

test('T-600: každý řádek končí CRLF', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'CRLF test' });
  const raw = await exportIcsRaw(page);
  expect(raw).toContain('\r\n');
  expect(assertCRLF(raw), 'syrové bajty: řádky bez CRLF').toEqual([]);
});

test('T-601: žádný řádek nepřesahuje 75 oktetů a zalomení nedělí znak', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'Zalamování s dlouhým názvem přes limit řádku aby se určitě foldovalo' });
  const raw = await exportIcsRaw(page);
  expect(assertFolding(raw), 'folding nad 75 oktetů').toEqual([]);
});

test('T-602: LOCATION s čárkou escapuje na \\, a po parsu se rovná adrese', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'Adresa', address: 'Hlavní 1, Nové Strašecí' });
  const raw = await exportIcsRaw(page);

  const withComma = getProperty(raw, 'LOCATION').find((l) => l.includes('\\,'));
  expect(withComma, 'LOCATION obsahuje escapovanou čárku').toBeTruthy();
  expect(unescapeIcs(withComma!)).toBe('Hlavní 1, Nové Strašecí');
});

test('T-603: přítomné X-APPLE-STRUCTURED-LOCATION se souřadnicemi', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'Apple', address: 'Hlavní 1, Nové Strašecí' });
  const raw = await exportIcsRaw(page);
  // C6-A4: strukturovaná lokace se souřadnicemi pro Apple Kalendář.
  expect(raw).toContain('X-APPLE-STRUCTURED-LOCATION');
});

test('T-604: přítomný VTIMEZONE a DTSTART nese TZID', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'Zóna' });
  const raw = await exportIcsRaw(page);
  expect(raw).toContain('BEGIN:VTIMEZONE');
  expect(raw).toContain('TZID:Europe/Prague');
  expect(unfold(raw).some((l) => l.startsWith('DTSTART;TZID=Europe/Prague'))).toBe(true);
});

test('T-605: událost v 16:00 zůstává v 16:00 i po přechodu na zimní čas', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'Zimní čas', start: '16:00', end: '17:00' });
  const raw = await exportIcsRaw(page, 'expanded');

  const starts = unfold(raw)
    .filter((l) => l.startsWith('DTSTART;TZID=Europe/Prague:'))
    .map((l) => l.slice(l.indexOf(':') + 1));
  const before = starts.find((v) => v.slice(0, 8) < '20261025');
  const after = starts.find((v) => v.slice(0, 8) > '20261025');
  expect(before, 'výskyt před přechodem').toBeTruthy();
  expect(after, 'výskyt po přechodu').toBeTruthy();
  expect(before!.slice(9), 'čas před přechodem').toBe('160000');
  expect(after!.slice(9), 'čas po přechodu zůstává 16:00').toBe('160000');
});

test('T-606: státní svátek je v EXDATE a chybí v rozvinuté řadě', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  // Středa zasáhne 28. 10. 2026 (Den vzniku ČSR).
  await addCustom(page, width, { name: 'Svátek', weekdayValue: '3' });
  const raw = await exportIcsRaw(page);
  // C6-A9: export vylučuje svátky a školní prázdniny přes EXDATE.
  expect(getProperty(raw, 'EXDATE').length, 'EXDATE se svátky').toBeGreaterThan(0);
});

test('T-607: shodné UID mezi exporty; po změně stoupne SEQUENCE', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'UID' });

  const uidsA = getProperty(await exportIcsRaw(page), 'UID');
  const uidsB = getProperty(await exportIcsRaw(page), 'UID');
  expect(uidsB, 'UID je stabilní mezi exporty').toEqual(uidsA);

  await addCustom(page, width, { name: 'UID změna' });
  const seq = getProperty(await exportIcsRaw(page), 'SEQUENCE');
  // C6-A7: po změně rozvrhu musí SEQUENCE stoupnout.
  expect(seq.length, 'SEQUENCE po změně').toBeGreaterThan(0);
});

test('T-608: RRULE obsahuje WKST=MO a UNTIL na konci sezony', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'Opakování' });
  const raw = await exportIcsRaw(page);

  const weekly = getProperty(raw, 'RRULE').find((v) => v.includes('FREQ=WEEKLY'));
  expect(weekly, 'týdenní RRULE existuje').toBeTruthy();
  expect(weekly!).toContain('UNTIL=');
  expect(weekly!, 'RRULE nese WKST=MO').toContain('WKST=MO');
});

test('T-609: export s více kalendáři dá samostatný soubor na kalendář', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, { name: 'Kalendář dítěte' });
  const raw = await exportIcsRaw(page);
  expect(getProperty(raw, 'X-WR-CALNAME')[0], 'kalendář nese svůj název').toBeTruthy();

  // C6-C2: víc kalendářů = samostatný export na kalendář (design_review_70.md); na mobilu
  // je tlačítko za sheetem „Správa kalendářů" (BL-057, design_review_88.md).
  await openCalendarMenuIfCompact(page, width);
  await expect(page.getByRole('banner').getByRole('button', { name: 'Přidat kalendář' })).toBeVisible();
});

test('T-610: export všech kalendářů stáhne samostatný soubor na každý kalendář', async ({ page }, testInfo) => {
  // C6-C2: druhý kalendář → jedním exportem dva samostatné .ics.
  await addCalendar(page, testInfo.project.use.viewport!.width, 'Druhé dítě');

  const downloads: import('@playwright/test').Download[] = [];
  page.on('download', (d) => downloads.push(d));

  await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: /všechny děti/ }).click();

  await expect.poll(() => downloads.length, { timeout: 5000 }).toBe(2);
  const names = downloads.map((d) => d.suggestedFilename());
  expect(new Set(names).size, 'každý kalendář má vlastní soubor').toBe(2);
});
