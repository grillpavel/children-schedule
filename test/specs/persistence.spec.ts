import { test, expect, isCompact } from '../helpers/profiles';
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

test('T-151: změna zapne indikátor „Neuloženo" a spustí varování při zavření', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await expect(page.getByText('Uloženo', { exact: true })).toBeVisible();

  await enrollFirst(page, width);
  await expect(page.getByText('Neuloženo', { exact: true })).toBeVisible();

  // beforeunload musí být zrušitelné (prohlížeč pak zobrazí varování).
  const warned = await page.evaluate(() => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(warned, 'beforeunload zabráněno → varování o ztrátě dat').toBe(true);
});

test('T-152: export → import → export dá bajtově shodný JSON včetně overrides a termínu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();

  // Vybereme kartu, obarvíme (overrides) a teprve pak zapíšeme (vybraný termín).
  await cards(page).first().click();
  // Na mobilu je barva jen v detailu (sheet) — rozbalit, ať je swatch dostupný.
  if (isCompact(width)) {
    await page.locator('.fixed.inset-x-0.bottom-12').getByRole('button', { name: 'Zvětšit detail' }).click();
  }
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

test('T-158: na mobilu jsou Kalendář/Otevřít/Uložit v menu „Další ▾"', async ({ page }, testInfo) => {
  test.skip(!isCompact(testInfo.project.use.viewport!.width), 'platí jen pro mobilní lištu');
  // V zavřené liště nejsou akce přímo dostupné.
  await expect(page.getByRole('button', { name: 'Uložit', exact: true })).toBeHidden();
  await expect(page.getByRole('textbox', { name: 'Název kalendáře' })).toBeHidden();

  await page.getByRole('button', { name: /Další ▾/ }).click();
  const menu = page.locator('div.absolute').filter({ hasText: 'Kalendář (.ics)' });
  await expect(menu.getByRole('button', { name: 'Uložit', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Otevřít', exact: true })).toBeVisible();
  await expect(menu.getByRole('textbox', { name: 'Název kalendáře' })).toBeVisible();
  await expect(menu.getByText('Kalendář (.ics)')).toBeVisible();
});

