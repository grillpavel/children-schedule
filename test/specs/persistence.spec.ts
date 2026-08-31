import { test, expect, isCompact, openCalendarMenuIfCompact, closeCalendarMenuIfCompact } from '../helpers/profiles';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

function cards(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: /Kč|Cena neuvedena/ });
}

async function openCatalog(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) await page.getByRole('button', { name: 'Katalog', exact: true }).click();
}

async function enrollFirst(page: import('@playwright/test').Page, width: number) {
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
}

async function saveAndRead(page: import('@playwright/test').Page, width: number): Promise<string> {
  // Na mobilu je Uložit v mobilním menu „Další ▾".
  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  return readFileSync((await download.path())!, 'utf8');
}

function tempFile(name: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'krouzky-e2e-'));
  const file = join(dir, name);
  writeFileSync(file, content, 'utf8');
  return file;
}

test('T-150: Uložit i Otevřít jsou na první úrovni, export je pod menu', async ({ page }, testInfo) => {
  // Na desktopu jsou obě akce přímo v liště; na mobilu jsou (záměrně) v menu „Další ▾" (T-158).
  test.skip(isCompact(testInfo.project.use.viewport!.width), 'platí pro desktopovou lištu');
  // Obě akce jsou přímo dostupné bez otevírání menu (C6-B6).
  await expect(page.getByRole('button', { name: 'Uložit', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otevřít' })).toBeVisible();

  // Export je naopak zanořený pod „Další ▾".
  await page.getByRole('button', { name: /Další ▾/ }).click();
  const menu = page.locator('div.absolute').filter({ hasText: 'Kalendář (.ics)' });
  await expect(menu.getByText('Kalendář (.ics)')).toBeVisible();
  // Uložit ani Otevřít nesmí být uvnitř exportního menu.
  await expect(menu.getByText('Uložit', { exact: true })).toHaveCount(0);
  await expect(menu.getByText('Otevřít', { exact: true })).toHaveCount(0);
});

test('T-151: změna zapne indikátor „Neuloženo"', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await expect(page.getByText('Uloženo', { exact: true })).toBeVisible();

  await enrollFirst(page, width);
  await expect(page.getByText('Neuloženo', { exact: true })).toBeVisible();
});

test('T-152: export → import → export dá bajtově shodný JSON včetně overrides a termínu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();

  // Vybereme kartu, obarvíme (overrides) a teprve pak zapíšeme (vybraný termín).
  // Sheet se od design_review_96.md vždy otevírá rozbalený (CHANGE-103) — swatch
  // je hned dostupný, žádné ruční rozbalení už není potřeba.
  await cards(page).first().click();
  await page.getByRole('button', { name: /^Barva / }).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();

  const jsonA = await saveAndRead(page, width);
  expect(jsonA, 'export obsahuje přepisy').toMatch(/"overrides"\s*:\s*\[\s*{/);
  expect(jsonA, 'export obsahuje zápis s termínem').toMatch(/"enrollments"\s*:\s*\[\s*{/);

  // Vyprázdníme rozvrh přes Zpět, aby byl import pozorovatelný.
  const undoBtn = page.getByTitle(/Zpět \(/);
  while (await undoBtn.isEnabled()) await undoBtn.click();
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(0);

  // Import souboru A a čekání, až se zápis obnoví.
  const fileA = tempFile('rozvrh-a.json', jsonA);
  await page.locator('input[type="file"]').setInputFiles(fileA);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);

  const jsonB = await saveAndRead(page, width);
  // Poctivě červený: overrides mají nestabilní pořadí klíčů (živě vs. po zod importu) → viz C8-E5.
  expect(jsonB, 'round-trip je bajtově shodný').toBe(jsonA);
});

test('T-153: import poškozeného JSON ukáže českou hlášku a nesmaže stav', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);

  let dialogMsg: string | null = null;
  page.on('dialog', (d) => {
    dialogMsg = d.message();
    void d.accept();
  });

  const badFile = tempFile('rozbite.json', '{ tohle není: platný JSON,,, }');
  await page.locator('input[type="file"]').setInputFiles(badFile);

  await expect.poll(() => dialogMsg).not.toBeNull();
  expect(dialogMsg).toContain('není platný JSON');

  // Stav zůstal beze změny — zapsaný kroužek je pořád v rozvrhu.
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);
});

test('T-154: soubor se starším schemaVersion se načte přes migraci', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);

  const jsonV3 = await saveAndRead(page, width);
  const parsed = JSON.parse(jsonV3) as { schemaVersion: number; overrides?: unknown };
  // Uměle vytvoříme předchozí verzi schématu bez pole přepisů.
  parsed.schemaVersion = 2;
  delete parsed.overrides;
  const fileV2 = tempFile('rozvrh-v2.json', JSON.stringify(parsed, null, 2));

  let dialogMsg: string | null = null;
  page.on('dialog', (d) => {
    dialogMsg = d.message();
    void d.accept();
  });

  await page.locator('input[type="file"]').setInputFiles(fileV2);

  // Migrace proběhne bez chyby a zápis se načte.
  await expect(page.getByText('Uloženo', { exact: true })).toBeVisible();
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);
  expect(dialogMsg, 'migrace nesmí hlásit chybu').toBeNull();
});

test('T-158: na mobilu jsou Otevřít/Uložit v menu „Další ▾", název kalendáře je za tlačítkem „Správa kalendářů" (BL-057, design_review_88.md)', async ({ page }, testInfo) => {
  test.skip(!isCompact(testInfo.project.use.viewport!.width), 'platí jen pro mobilní lištu');
  // Než se otevře, textové pole v DOM není (BL-057 sbalilo správu kalendářů za tlačítko).
  await expect(page.getByRole('textbox', { name: 'Název kalendáře' })).toHaveCount(0);
  await openCalendarMenuIfCompact(page, testInfo.project.use.viewport!.width);
  await expect(page.getByRole('textbox', { name: 'Název kalendáře' })).toBeVisible();
  // V zavřené liště nejsou ostatní akce přímo dostupné.
  await expect(page.getByRole('button', { name: 'Uložit', exact: true })).toBeHidden();

  // Sheet je od design_review_95.md modální — zavřít, než klikneme na „Další ▾"
  // (jinak backdrop klik zablokuje).
  await closeCalendarMenuIfCompact(page, testInfo.project.use.viewport!.width);
  await page.getByRole('button', { name: /Další ▾/ }).click();
  // Mobilní menu je od design_review_71.md `fixed` (dopočtená pozice, aby nepřetékalo
  // mimo viewport), ne `absolute` jako desktopové — proto jiný lokátor než T-150.
  const menu = page.locator('div.fixed').filter({ hasText: 'Kalendář (.ics)' });
  await expect(menu.getByRole('button', { name: 'Uložit', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Otevřít', exact: true })).toBeVisible();
  await expect(menu.getByText('Kalendář (.ics)')).toBeVisible();
});

test('T-181: menu „Další ▾" nabízí „Soukromí a data" s vysvětlením cookies i geokódování (design_review_71.md)', async ({ page }) => {
  await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Soukromí a data' }).click();

  const dialog = page.getByRole('dialog', { name: 'Soukromí a data' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/nepoužívá žádné cookies/)).toBeVisible();
  await expect(dialog.getByText(/Nominatim/)).toBeVisible();
  await expect(dialog.getByText(/localStorage/)).toBeVisible();
  await expect(dialog.getByText(/volně dostupných serverech/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Zavřít' }).click();
  await expect(dialog).toBeHidden();
});

test('T-159: autosave — zápis přežije reload stránky', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);

  // Reload nesmí ztratit rozvrh — autosave ho obnoví z localStorage.
  await page.reload();

  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);
});

test('T-231: „Sdílet odkaz na rozvrh" přenese rozvrh do nové relace prohlížeče (design_review_73.md FR-W3-4)', async ({ page, browser }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  await openCatalog(page, width);
  await page.getByRole('searchbox').fill('Výtvarné');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  await openCatalog(page, width);

  await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Sdílet odkaz na rozvrh' }).click();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl, 'odkaz nese fragment #share= (nikdy neopustí prohlížeč přes server)').toContain('#share=');

  // Nová relace = jiný „prohlížeč"/osoba, žádný sdílený localStorage s prvním page.
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  page2.once('dialog', (d) => d.accept());
  await page2.goto(shareUrl);
  await openCatalog(page2, width);
  await expect(page2.getByText('Přidáno')).toHaveCount(1);
  // Fragment se po zpracování odstraní z URL, ať se znovu nenačte při refreshi/zpět.
  await expect.poll(() => page2.evaluate(() => window.location.hash)).toBe('');
  await context2.close();
});

