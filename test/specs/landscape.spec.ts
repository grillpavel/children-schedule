import { test, expect } from '../helpers/profiles';

/**
 * FR-W2-1/FR-W2-2 (design_review_73.md, Vlna 2) platí jen pro mobil na šířku
 * s omezenou výškou (`(orientation: landscape) and (max-height: 500px)`) —
 * žádný z 6 profilů v `test/playwright.config.ts` tuto kombinaci nemá (všechny
 * mobilní profily jsou na výšku). Testy proto vynucují vlastní viewport a běží
 * jen na jednom projektu (`mobile`), ať se nezdvojuje 6× stejný test.
 */
test.use({ viewport: { width: 844, height: 390 } });

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'landscape-compact běží jen jednou, nezávisle na základní matici profilů');
  await page.goto('/');
});

test('T-226: mobil na šířku s malou výškou dostane boční rail místo spodní navigace (design_review_73.md FR-W2-1)', async ({
  page,
}) => {
  const nav = page.getByRole('navigation', { name: 'Hlavní navigace' });
  await expect(nav).toBeVisible();
  const box = await nav.boundingBox();
  expect(box, 'navigace nenalezena').not.toBeNull();
  // Rail je svislý (výška ≈ celý viewport) a úzký (56px), ne vodorovná lišta.
  expect(box!.width, `šířka railu ${Math.round(box!.width)}px`).toBeLessThanOrEqual(60);
  expect(box!.height, `výška railu ${Math.round(box!.height)}px`).toBeGreaterThanOrEqual(300);

  // Obsah (hlavička) se posune vpravo od railu, ne pod ním.
  const banner = page.getByRole('banner');
  const bannerBox = await banner.boundingBox();
  expect(bannerBox!.x, `hlavička začíná na x=${bannerBox!.x}`).toBeGreaterThanOrEqual(box!.width);

  // Žádné vodorovné přetečení stránky navzdory posunu obsahu.
  const overflow = await page.evaluate(() => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth);
  expect(overflow, `přetečení ${overflow}px`).toBeLessThanOrEqual(1);
});

test('T-227: hustota časové osy mřížky v landscape-compact je nižší, ať se den vejde do málo výšky (design_review_73.md FR-W2-2)', async ({
  page,
}) => {
  // Vlastní událost 16:00–17:30 (90 min): při výchozí hustotě 44px/hod by měla
  // 66px, v landscape-compact musí být viditelně nižší.
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByPlaceholder('Např. Logopedie').fill('Test hustoty');
  const times = dialog.locator('input[type="time"]');
  await times.nth(0).fill('16:00');
  await times.nth(1).fill('17:30');
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();

  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  const gridTab = page.getByRole('tab', { name: 'Mřížka' });
  if (await gridTab.isVisible().catch(() => false)) await gridTab.click();

  const block = page.getByRole('button', { name: /Test hustoty/ });
  await expect(block).toBeVisible();
  const box = await block.boundingBox();
  expect(box!.height, `výška bloku ${Math.round(box!.height)}px`).toBeLessThan(66);
  expect(box!.height, `výška bloku ${Math.round(box!.height)}px`).toBeGreaterThanOrEqual(16);
});
