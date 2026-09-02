import { test, expect, isCompact, isThreeColumn } from '../helpers/profiles';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

function cards(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: /Kč|Cena neuvedena/ });
}

function detailScope(page: import('@playwright/test').Page, width: number) {
  // Mobil (design_review_97.md, CHANGE-104): detail je plný modál, ne spodní sheet.
  if (isCompact(width)) return page.getByRole('dialog', { name: 'Detail kroužku' });
  // Střední šířky (900–1440): Info je slide-over drawer mimo <main> (C9-L1).
  if (!isThreeColumn(width)) return page.getByTestId('info-drawer');
  return page.getByRole('main');
}

/** Na středních šířkách otevře Souhrn slide-over (když není otevřený výběrem). */
async function openSummaryIfMedium(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width) || isThreeColumn(width)) return;
  const souhrn = page.getByRole('button', { name: 'Děti', exact: true });
  if (await souhrn.isVisible()) await souhrn.click();
}

async function openCatalog(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) await page.getByRole('button', { name: 'Katalog', exact: true }).click();
}

/** Sheet se od design_review_96.md vždy otevírá rozbalený (CHANGE-103) — no-op,
 * ponecháno kvůli stabilním voláním na všech stávajících místech. */
async function expandSheetIfCompact(_page: import('@playwright/test').Page, _width: number) {
  // no-op
}

async function selectFirstCard(page: import('@playwright/test').Page, width: number) {
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
}

async function enrollFirst(page: import('@playwright/test').Page, width: number) {
  await selectFirstCard(page, width);
  await detailScope(page, width).getByRole('button', { name: 'Přidat do rozvrhu' }).click();
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

test('T-140: detail ukazuje odkaz na přihlášku', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await expandSheetIfCompact(page, width);
  const detail = detailScope(page, width);
  await expect(detail.getByRole('link', { name: /Oficiální přihláška/ })).toBeVisible();
  // Uzávěrka přihlášek se v zeštíhleném detailu už nezobrazuje (Changes 11, BL-023).
  await expect(detail.getByText(/Uzávěrka přihlášek/)).toHaveCount(0);
});

test('T-141: součet ceny hlásí položky bez ceny, ne holý součet', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'souhrn je na kompaktu ve vlastní záložce');
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  const priceless = cards(page).filter({ hasText: 'Cena neuvedena' }).first();
  await expect(priceless).toBeVisible();
  await priceless.click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  await page.keyboard.press('Escape');
  await openSummaryIfMedium(page, width);
  await expect(detailScope(page, width).getByText(/bez ceny/)).toBeVisible();
});

test('T-142: metriky souhrnu mají tooltip s definicí', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'souhrn je na kompaktu ve vlastní záložce');
  await enrollFirst(page, width);
  await page.keyboard.press('Escape');
  await openSummaryIfMedium(page, width);
  for (const label of ['Obsazená odpoledne', 'Cest týdně', 'Hodin týdně']) {
    const title = await page.getByText(new RegExp(label)).first().getAttribute('title');
    expect(title, `${label} bez tooltipu`).toBeTruthy();
  }
});

test('T-143: konflikty se v pravém sloupci nezobrazují (kolize zůstává v mřížce)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'pravý sloupec ověřujeme nad 900px');
  await addCustom(page, width, 'Kolize A', '16:00', '17:00');
  await addCustom(page, width, 'Kolize B', '16:00', '17:00');
  await openSummaryIfMedium(page, width);
  // Changes 12: pravý sloupec konflikty ani akci „Vyřešit" nezobrazuje.
  await expect(page.getByRole('heading', { name: 'Konflikty a upozornění' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Vyřešit' })).toHaveCount(0);
  // Kolize je vidět v mřížce: událost existuje jako blok.
  await expect(page.getByRole('main').getByText('Kolize A').first()).toBeVisible();
});

test('T-228: kolidující kroužek nabídne konkrétní bezkolizní alternativu (design_review_73.md FR-W3-2)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, 'Blokátor', '16:00', '17:00');
  await openCatalog(page, width);
  await page.getByRole('searchbox').fill('Atletická školička');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await expandSheetIfCompact(page, width);
  const detail = detailScope(page, width);
  await detail.getByRole('button', { name: 'Pondělí 16:00', exact: true }).click();
  await expect(detail.getByText('Kolize s jiným kroužkem')).toBeVisible();
  const suggestion = detail.getByRole('button', { name: /Přepnout na Čtvrtek.*bez kolize/ }).first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(detail.getByText('Kolize s jiným kroužkem')).toHaveCount(0);
});

test('T-144: detail se otevře v režimu čtení, editační pole skrytá', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await expandSheetIfCompact(page, width);
  const detail = detailScope(page, width);
  await expect(detail.getByRole('button', { name: 'Upravit údaje' })).toBeVisible();
  await expect(detail.getByRole('textbox', { name: 'Ulice' })).toHaveCount(0);
});

test('T-145: úprava ceny přidá značku „upraveno vámi"', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'editace probíhá v pravém sloupci nad 900px');
  await selectFirstCard(page, width);
  const detail = detailScope(page, width);
  await detail.getByRole('button', { name: 'Upravit údaje' }).click();
  // ActivityEditor je od CHANGE-111 sdílený DialogShell portalovaný do document.body
  // (oprava oříznutého vnořeného dialogu) — jeho obsah už NENí potomkem `detail`.
  const editor = page.getByRole('dialog', { name: 'Upravit údaje kroužku' });
  const price = editor.getByRole('spinbutton', { name: 'Cena (Kč)' });
  await price.fill('4321');
  await price.press('Tab');
  await expect(detail.getByText('upraveno vámi').first()).toBeVisible();
});

test('T-146: záložka Chat není v DOM', async ({ page }) => {
  await expect(page.getByRole('tab', { name: /chat/i })).toHaveCount(0);
  await expect(page.getByText(/^Chat$/)).toHaveCount(0);
});

test('T-147: „Smazat vše" není v panelu rychlých akcí', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  await expect(page.getByRole('button', { name: /Smazat vše/i })).toHaveCount(0);
});

test('T-148: výběr kroužku nahradí týdenní souhrn (obsazenost/souhrn/náklady) jen jeho detailem', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isThreeColumn(width), 'souhrn ve třetím sloupci testujeme na širokém desktopu');
  const detail = detailScope(page, width);
  await enrollFirst(page, width);
  await page.keyboard.press('Escape');
  // Po odznačení (a s aspoň jedním kroužkem v rozvrhu) je vidět týdenní souhrn.
  for (const h of ['Obsazenost týdne', 'Souhrn týdne', 'Náklady']) {
    await expect(detail.getByRole('heading', { name: h })).toBeVisible();
  }
  // Znovu vyber stejný kroužek — souhrn se skryje, zobrazí se jen jeho detail bez fixního záhlaví s celkovými čísly.
  await cards(page).first().click();
  for (const h of ['Obsazenost týdne', 'Souhrn týdne', 'Náklady']) {
    await expect(detail.getByRole('heading', { name: h })).toHaveCount(0);
  }
  await page.keyboard.press('Escape');
  // Po odznačení se souhrn vrátí.
  for (const h of ['Obsazenost týdne', 'Souhrn týdne', 'Náklady']) {
    await expect(detail.getByRole('heading', { name: h })).toBeVisible();
  }
});

test('T-149: detail obsahuje 6 skupin, ne odebraná pole', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await expandSheetIfCompact(page, width);
  const detail = detailScope(page, width);
  // Přítomné klíčové položky: úprava (název+info+akce), barva, cena.
  await expect(detail.getByRole('button', { name: 'Upravit údaje' })).toBeVisible();
  await expect(detail.getByText('Barva kroužku')).toBeVisible();
  await expect(detail.getByText(/Kč|Cena neuvedena/).first()).toBeVisible();
  // Odebraná pole se nezobrazují (Changes 11).
  await expect(detail.getByText(/^Kapacita:/)).toHaveCount(0);
  await expect(detail.getByText(/Uzávěrka přihlášek/)).toHaveCount(0);
  await expect(detail.getByText(/^Ověřeno:/)).toHaveCount(0);
  await expect(detail.getByText('Poznámka rodiče')).toHaveCount(0);
});

test('T-155: mapa nabízí Mapy.cz a nativní mapy, bez OSM náhledu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await expandSheetIfCompact(page, width);
  const detail = detailScope(page, width);
  await expect(detail.getByRole('link', { name: /Mapy\.cz/ })).toBeVisible();
  await expect(detail.getByRole('link', { name: /(Apple|Google) Mapy/ })).toBeVisible();
  await expect(detail.locator('iframe')).toHaveCount(0);
  await expect(detail.getByRole('link', { name: /OpenStreetMap/ })).toHaveCount(0);
});

test('T-156: DetailsPanel je v DOM jen jednou → jeden odkaz na nativní mapy', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await expandSheetIfCompact(page, width);
  await expect(page.getByRole('link', { name: /(Apple|Google) Mapy/ })).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Mapy\.cz/ })).toHaveCount(1);
});

test('T-157: Varianty docházky jsou hned pod hlavičkou, nad Barvou kroužku', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await selectFirstCard(page, width);
  await expandSheetIfCompact(page, width);
  const detail = detailScope(page, width);
  const variants = detail.getByText('Varianty docházky');
  const color = detail.getByText('Barva kroužku');
  await expect(variants).toBeVisible();
  await expect(color).toBeVisible();
  const vy = (await variants.boundingBox())!.y;
  const cy = (await color.boundingBox())!.y;
  expect(vy, 'Varianty mají být nad Barvou kroužku').toBeLessThan(cy);
});
