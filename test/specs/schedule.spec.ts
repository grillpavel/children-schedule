import { test, expect, isCompact, isThreeColumn } from '../helpers/profiles';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

function cards(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: /Kč|Cena neuvedena/ });
}

async function openCatalog(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) await page.getByRole('button', { name: 'Katalog', exact: true }).click();
}

async function selectFirstCard(page: import('@playwright/test').Page, width: number) {
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
}

async function addCustom(
  page: import('@playwright/test').Page,
  width: number,
  name: string,
  start: string,
  end: string,
) {
  await openCatalog(page, width);
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByPlaceholder('Např. Logopedie').fill(name);
  await dialog.locator('input[type="time"]').nth(0).fill(start);
  await dialog.locator('input[type="time"]').nth(1).fill(end);
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();
}

test('T-130: klik na kartu otevře detail a kroužek nepřidá', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await expect(page.getByRole('button', { name: 'Přidat do rozvrhu' })).toBeVisible();
  // Nic se nepřidalo → žádná karta nemá stav „Přidáno".
  await expect(page.getByText('Přidáno')).toHaveCount(0);
});

test('T-131: v detailu lze zvolit variantu před potvrzením', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  // Na mobilu je detail v peek sheetu, na středních šířkách ve slide-over draweru.
  const detail = isCompact(width)
    ? page.locator('.fixed.inset-x-0.bottom-12')
    : !isThreeColumn(width)
      ? page.getByTestId('info-drawer')
      : page.getByRole('main');
  if (isCompact(width)) await detail.getByRole('button', { name: 'Zvětšit detail' }).click();
  await expect(detail.getByText('Varianty docházky')).toBeVisible();
  await expect(
    detail.getByRole('button', { name: /(Po|Út|St|Čt|Pá|So|Ne)\s+\d{1,2}:\d{2}/ }).first(),
  ).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Přidat do rozvrhu' })).toBeVisible();
});

test('T-132: přidání kliknutím do slotu (bez tažení)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'duchové sloty jsou v kalendářové mřížce nad 900px');
  // Prázdný rozvrh mřížku neukazuje; odhalíme ji zápisem na čtvrtek, ať pondělí zůstane prázdné.
  await openCatalog(page, width);
  await page.getByRole('searchbox').fill('Výtvarné');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  // Druhý kroužek (pondělí) přidáme kliknutím do jeho slotu (ducha) v mřížce.
  await page.getByRole('searchbox').fill('Programování');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  const ghost = page.getByTitle('Klikněte pro výběr této varianty').first();
  await expect(ghost).toBeVisible();
  await ghost.click();
  await expect(
    page.getByRole('gridcell').getByRole('button', { name: /Programování/ }),
  ).toBeVisible();
});

test('T-133: dvě překrývající se události jsou vedle sebe', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'překryv se řeší v mřížce nad 900px');
  await addCustom(page, width, 'Překryv A', '16:00', '17:00');
  await addCustom(page, width, 'Překryv B', '16:00', '17:00');
  const a = page.getByRole('button', { name: /Překryv A/ });
  const b = page.getByRole('button', { name: /Překryv B/ });
  await expect(a).toBeVisible();
  await expect(b).toBeVisible();
  const ba = await a.boundingBox();
  const bb = await b.boundingBox();
  expect(ba!.width).toBeGreaterThan(0);
  expect(bb!.width).toBeGreaterThan(0);
  // Vedle sebe (column packing), ne přes sebe.
  expect(Math.abs(ba!.x - bb!.x), 'bloky se překrývají místo vedle sebe').toBeGreaterThan(5);
});

test('T-134: Ctrl+Z vrátí poslední přidání', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  await expect(page.getByText('Přidáno').first()).toBeVisible();
  await page.keyboard.press('Control+z');
  await expect(page.getByText('Přidáno')).toHaveCount(0);
});

test('T-135: po přidání se zobrazí toast s akcí Zpět', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  await expect(page.getByRole('button', { name: 'Zpět', exact: true })).toBeVisible();
});

test('T-136: „Přidat první kroužek" otevře detail a zaměří hledání', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width) || !isThreeColumn(width), 'CTA cílí na stálý katalog desktopu');
  await page.getByRole('button', { name: 'Přidat první kroužek' }).click();
  // Otevře se detail vybraného kroužku v pravém sloupci.
  await expect(page.getByRole('main').getByRole('button', { name: 'Přidat do rozvrhu' })).toBeVisible();
  // Hledání v katalogu je zaměřené.
  const focused = await page.evaluate(
    () => document.activeElement?.getAttribute('data-catalog-search') !== null &&
      document.activeElement?.hasAttribute('data-catalog-search'),
  );
  expect(focused, 'hledání katalogu není zaměřené').toBe(true);
});
