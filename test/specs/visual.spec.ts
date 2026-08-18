import { test, expect, isCompact } from '../helpers/profiles';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

function catalogPanel(page: import('@playwright/test').Page) {
  return page.getByRole('complementary').filter({ has: page.getByRole('searchbox') });
}

function infoPanel(page: import('@playwright/test').Page) {
  return page.getByRole('complementary').filter({ hasNot: page.getByRole('searchbox') });
}

async function showCatalog(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) await page.getByRole('button', { name: 'Katalog', exact: true }).click();
}

async function showInfo(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Děti', exact: true }).click();
  } else {
    // Střední šířky (900–1440): Info je slide-over, otevři přes „Souhrn".
    const souhrn = page.getByRole('button', { name: 'Souhrn', exact: true });
    if (await souhrn.isVisible()) await souhrn.click();
  }
}

test('T-400: nástrojová lišta má stabilní snímek', async ({ page }) => {
  await expect(page.getByRole('banner')).toHaveScreenshot('toolbar.png', {
    maxDiffPixelRatio: 0.02,
  });
});

test('T-401: prázdné stavy mají baseline', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  // Prázdný pravý panel / souhrn.
  await showInfo(page, width);
  await expect(infoPanel(page).first()).toHaveScreenshot('empty-info.png', {
    maxDiffPixelRatio: 0.02,
  });

  // Katalog po filtru (deterministický dotaz).
  await showCatalog(page, width);
  await page.getByRole('searchbox').fill('Atletika');
  await expect(catalogPanel(page).first()).toHaveScreenshot('catalog-filtered.png', {
    maxDiffPixelRatio: 0.02,
  });
});

test('T-402: dark mode má samostatnou baseline', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await page.emulateMedia({ colorScheme: 'dark' });
  await showInfo(page, width);
  await expect(infoPanel(page).first()).toHaveScreenshot('info-dark.png', {
    maxDiffPixelRatio: 0.02,
  });
});

test('T-403: sklo zapnuté i vypnuté má baseline', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'skleněný sheet je jen na mobilu (C9-G5)');

  // Výběr karty vyvolá spodní skleněný sheet.
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first().click();

  const sheet = page.locator('.glass').first();
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveScreenshot('sheet-glass-on.png', { maxDiffPixelRatio: 0.02 });

  // Vypnuté sklo je automatická cesta přes vysoký kontrast (ruční přepínač
  // odstraněn CHANGE-58) — viz T-307.
  await page.emulateMedia({ contrast: 'more' });
  await expect(sheet).toHaveScreenshot('sheet-glass-off.png', { maxDiffPixelRatio: 0.02 });
});
