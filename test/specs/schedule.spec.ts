import { test, expect, isCompact, isThreeColumn } from '../helpers/profiles';
import { readFileSync } from 'node:fs';

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
  // Toast z prvního přidání musí zmizet, ať nepřekrývá ducha druhého kroužku
  // (jeho vnitřní bublina má pointer-events-auto kvůli tlačítku „Zpět").
  await expect(page.getByRole('button', { name: 'Zpět', exact: true })).toBeHidden({ timeout: 6000 });
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

test('T-137: toast nese název kroužku a zmizí po chvíli (ne obecná zpráva)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  const card = cards(page).filter({ hasText: 'Basketbal — přípravka' }).first();
  await card.click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  const toast = page.getByText('Basketbal — přípravka přidán do rozvrhu');
  await expect(toast).toBeVisible();
  await expect(toast).toBeHidden({ timeout: 6000 });

  // Mobilní sheet se po přidání automaticky zavře (CHANGE-55) — pro odebrání
  // musíme kartu znovu otevřít (ukáže jen stav „V rozvrhu", enrollGroup se
  // znovu nevolá).
  if (isCompact(width)) await card.click();
  // Odebrání nese vlastní zprávu, ne stejný text jako přidání.
  await page.getByRole('button', { name: 'Odebrat z rozvrhu' }).click();
  await expect(page.getByText('Basketbal — přípravka odebrán z rozvrhu')).toBeVisible();
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

test('T-161: vlastní událost typu Škola nese typový štítek v detailu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByRole('button', { name: 'Škola', exact: true }).click();
  await dialog.getByPlaceholder('Např. Logopedie').fill('Škola doučování');
  await dialog.locator('input[type="time"]').nth(0).fill('08:00');
  await dialog.locator('input[type="time"]').nth(1).fill('12:00');
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();

  if (isCompact(width)) await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  await page.getByRole('main').getByRole('button', { name: /Škola doučování/ }).first().click();
  const detail = isCompact(width) ? page.locator('.fixed.inset-x-0.bottom-12') : page.getByRole('main');
  await expect(detail.getByText('🏫').first()).toBeVisible();
  await expect(detail.getByText('Škola', { exact: true }).first()).toBeVisible();
});

test('T-163: krátký přesun mezi různými místy nese logistické upozornění (FR-8)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  const addCustomWithAddress = async (name: string, start: string, end: string, address: string) => {
    await openCatalog(page, width);
    await page.getByRole('button', { name: /Vlastní událost/ }).click();
    const dialog = page.locator('.fixed.inset-0.z-50');
    await dialog.getByPlaceholder('Např. Logopedie').fill(name);
    await dialog.locator('input[type="time"]').nth(0).fill(start);
    await dialog.locator('input[type="time"]').nth(1).fill(end);
    await dialog.getByPlaceholder('Ulice a číslo, Město').fill(address);
    await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();
  };

  // Dva různé kroužky na stejný den, jen 5 minut mezi koncem a začátkem,
  // na dvou různých adresách — logisticky těsné (FR-8, design_review_58.md).
  // Fiktivní města mimo TOWN_CENTERS i mimo reálné geokódování (Z-01, žádná data
  // se nesmí tvářit jako skutečná) — zůstává jen fallback rezerva, bez závislosti
  // na síti/online geokódování.
  await addCustomWithAddress('Kroužek Sever', '16:00', '17:00', 'Ulice 1, Xilonovo');
  await addCustomWithAddress('Kroužek Jih', '17:05', '18:05', 'Ulice 2, Yzemnice');

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  await expect(page.getByTestId('grid-soft-conflict-badge').first()).toBeVisible();
});

// --- Per-dítě nastavení času na přesun (CHANGE-67, design_review_67.md BL-038) ---

test('T-175: zkrácení času na přesun na 0 min odstraní logistické upozornění', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  const addCustomWithAddress = async (name: string, start: string, end: string, address: string) => {
    await openCatalog(page, width);
    await page.getByRole('button', { name: /Vlastní událost/ }).click();
    const dialog = page.locator('.fixed.inset-0.z-50');
    await dialog.getByPlaceholder('Např. Logopedie').fill(name);
    await dialog.locator('input[type="time"]').nth(0).fill(start);
    await dialog.locator('input[type="time"]').nth(1).fill(end);
    await dialog.getByPlaceholder('Ulice a číslo, Město').fill(address);
    await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();
  };

  await addCustomWithAddress('Přesun Sever', '16:00', '17:00', 'Ulice 1, Xilonovo');
  await addCustomWithAddress('Přesun Jih', '17:05', '18:05', 'Ulice 2, Yzemnice');

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  await expect(page.getByTestId('grid-soft-conflict-badge').first()).toBeVisible();

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Děti', exact: true }).click();
  } else {
    // Věk/Přesun žijí od FR-W3-7 (design_review_73.md) v Souhrnu (ChildSettings) —
    // na středních šířkách nutno nejdřív otevřít, na širokém desktopu je vidět rovnou.
    const souhrn = page.getByRole('button', { name: 'Souhrn', exact: true });
    if (await souhrn.isVisible().catch(() => false)) await souhrn.click();
  }
  await page.getByRole('combobox', { name: 'Minimální čas na přesun' }).selectOption('0');

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  await expect(page.getByTestId('grid-soft-conflict-badge')).toHaveCount(0);
});

// --- Konkrétní odůvodnění i pro tvrdé kolize (CHANGE-66, design_review_65.md FR-11) ---

test('T-165: tvrdý konflikt v mřížce jmenuje obě kolidující události, ne jen „Tvrdý konflikt"', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCustom(page, width, 'Konflikt Sever', '16:00', '17:00');
  await addCustom(page, width, 'Konflikt Jih', '16:00', '17:00');

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  const badge = page.getByTestId('grid-hard-conflict-badge').first();
  await expect(badge).toBeVisible();
  const title = await badge.getAttribute('title');
  expect(title, 'zpráva nejmenuje první kolidující událost').toContain('Konflikt Sever');
  expect(title, 'zpráva nejmenuje druhou kolidující událost').toContain('Konflikt Jih');
});

test('T-166: Agenda na mobilu ukazuje konfliktní odznak, ne jen mřížka', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'Agenda je výchozí pohled jen na mobilu <900px');
  await addCustom(page, width, 'Agenda Sever', '16:00', '17:00');
  await addCustom(page, width, 'Agenda Jih', '16:00', '17:00');
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  // Agenda je výchozí mobilní pohled (T-215) — odznak musí být vidět bez přepnutí do Mřížky.
  await expect(page.getByTestId('agenda-hard-conflict-badge').first()).toBeVisible();
});

// --- Školní prázdniny okresu Rakovník + override (CHANGE-73, design_review_68.md) ---

test('T-176: kroužek se v den školních prázdnin nevykreslí v mřížce, po povolení override se vrátí', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  await openCatalog(page, width);
  await page.getByRole('searchbox').fill('mini přípravka');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }

  // Zmrazené hodiny (Z-07) = 2026-10-06; 3× „Další" (týdenní posun) doveze na týden
  // 26. 10. – 1. 11., který obsahuje podzimní prázdniny okresu Rakovník (29.–30. 10. 2026,
  // design_review_68.md FR-1). Fotbal — mini přípravka má termín v úterý i ve čtvrtek.
  const next = page.getByRole('button', { name: 'Další', exact: true });
  await next.click();
  await next.click();
  await next.click();

  const tuesday = page.getByRole('gridcell', { name: 'Úterý 27.10.' });
  const thursday = page.getByRole('gridcell', { name: 'Čtvrtek 29.10.' });
  await expect(tuesday.getByRole('button', { name: /Fotbal/ })).toBeVisible();
  await expect(thursday.getByRole('button', { name: /Fotbal/ })).toHaveCount(0);

  // Mobilní peek sheet se po přidání zavírá (CHANGE-55) — je třeba kartu znovu otevřít;
  // na širších profilech zůstává výběr aktivity zachovaný (klik na už vybranou kartu by ji
  // naopak odznačil, viz `handleCardClick` v CatalogPanel.tsx).
  if (isCompact(width)) {
    await openCatalog(page, width);
    await cards(page).first().click();
  }
  const detail = isCompact(width) ? page.locator('.fixed.inset-x-0.bottom-12') : page.getByRole('main');
  if (isCompact(width)) await detail.getByRole('button', { name: 'Zvětšit detail' }).click();
  await detail.getByRole('checkbox', { name: 'Povolit i o prázdninách a státních svátcích' }).check();

  if (isCompact(width)) {
    // Peek sheet zůstává otevřený, dokud je aktivita vybraná (`hasSelection`) — zavřít ho,
    // ať nepřekrývá spodní navigaci/záložku Mřížka.
    await page.getByRole('button', { name: 'Zavřít detail' }).click();
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  await expect(thursday.getByRole('button', { name: /Fotbal/ })).toBeVisible();
});

// --- Vlastní barva u vlastní události + editace času katalogové aktivity (CHANGE-74, design_review_69.md) ---

test('T-177: vlastní událost může mít vlastní barvu, ne jen výchozí podle typu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  await openCatalog(page, width);
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByPlaceholder('Např. Logopedie').fill('Barevná událost');
  await dialog.locator('input[type="time"]').nth(0).fill('16:00');
  await dialog.locator('input[type="time"]').nth(1).fill('17:00');
  // „Jiné" (výchozí typ) nemá vlastní barvu v KIND_DEFAULT_CSS — bez přepisu by byla šedomodrá.
  await dialog.getByRole('button', { name: 'Barva cihlová' }).click();
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  const block = page.getByRole('grid').getByRole('button', { name: /Barevná událost/ });
  await expect(block).toHaveCSS('background-color', 'rgb(196, 78, 82)');
});

test('T-178: čas katalogové aktivity lze upravit — katalog nemusí odrážet aktuální stav', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  await openCatalog(page, width);
  await page.getByRole('searchbox').fill('mini přípravka');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();

  if (isCompact(width)) {
    await openCatalog(page, width);
    await cards(page).first().click();
  }
  const detail = isCompact(width) ? page.locator('.fixed.inset-x-0.bottom-12') : page.getByRole('main');
  if (isCompact(width)) await detail.getByRole('button', { name: 'Zvětšit detail' }).click();

  await detail.getByRole('button', { name: 'Upravit časy' }).click();
  // Fotbal — mini přípravka má termín v úterý (16:00–17:00) — posuneme na 18:30–19:30.
  // Obě pole se mění spolu, ať zůstane začátek < konec (validace, design_review_69.md).
  await detail.locator('input[type="time"]').nth(0).fill('18:30');
  await detail.locator('input[type="time"]').nth(0).blur();
  await detail.locator('input[type="time"]').nth(1).fill('19:30');
  await detail.locator('input[type="time"]').nth(1).blur();
  await expect(detail.getByText('upraveno vámi').first()).toBeVisible();
  await detail.getByRole('button', { name: 'Hotovo' }).click();

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Zavřít detail' }).click();
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  await expect(
    page.getByRole('grid').getByRole('button', { name: /Fotbal/ }).filter({ hasText: '18:30' }),
  ).toBeVisible();
});

test('T-179: editace času odmítne neplatný rozsah (začátek po konci) beze změny rozvrhu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  await openCatalog(page, width);
  await page.getByRole('searchbox').fill('mini přípravka');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();

  if (isCompact(width)) {
    await openCatalog(page, width);
    await cards(page).first().click();
  }
  const detail = isCompact(width) ? page.locator('.fixed.inset-x-0.bottom-12') : page.getByRole('main');
  if (isCompact(width)) await detail.getByRole('button', { name: 'Zvětšit detail' }).click();

  await detail.getByRole('button', { name: 'Upravit časy' }).click();
  // Začátek (18:30) po dosavadním konci (17:00, nezměněn) — neplatné, nesmí se zapsat.
  await detail.locator('input[type="time"]').nth(0).fill('18:30');
  await detail.locator('input[type="time"]').nth(0).blur();
  await expect(detail.getByText('upraveno vámi')).toHaveCount(0);

  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Zavřít detail' }).click();
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  await expect(
    page.getByRole('grid').getByRole('button', { name: /Fotbal/ }).filter({ hasText: '16:00' }).first(),
  ).toBeVisible();
});

test('T-180: kalendář lze přejmenovat, přidat další s vlastním názvem a odebrat i s jeho zápisy (design_review_70.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  const banner = page.getByRole('banner');
  const nameInput = banner.getByRole('textbox', { name: 'Název kalendáře' });

  await expect(nameInput).toHaveValue('Moje dítě');
  await nameInput.fill('Anežka');
  await nameInput.blur();

  // Přidání druhého kalendáře s vlastním názvem (místo 'Přidat dítě' → 'Přidat kalendář').
  await banner.getByRole('button', { name: 'Přidat kalendář' }).click();
  await banner.getByRole('textbox', { name: 'Název nového kalendáře' }).fill('Bedřich');
  await banner.getByRole('button', { name: 'Přidat', exact: true }).click();

  const switcher = banner.getByRole('combobox', { name: 'Přepnout kalendář' });
  await expect(switcher.locator('option')).toHaveCount(2);
  await expect(nameInput, 'přidání aktivuje nově přidaný kalendář').toHaveValue('Bedřich');

  // Vlastní událost na novém kalendáři — po odebrání musí zmizet i ona (kaskádové smazání).
  await openCatalog(page, width);
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByPlaceholder('Např. Logopedie').fill('Bedřichova aktivita');
  await dialog.locator('input[type="time"]').nth(0).fill('09:00');
  await dialog.locator('input[type="time"]').nth(1).fill('10:00');
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();

  page.once('dialog', (d) => d.accept());
  await banner.getByRole('button', { name: 'Odebrat kalendář Bedřich' }).click();

  await expect(switcher).toHaveCount(0);
  await expect(nameInput, 'po odebrání aktivního kalendáře se aktivuje zbývající').toHaveValue('Anežka');

  if (isCompact(width)) await banner.getByRole('button', { name: /Další ▾/ }).click();
  const pending = page.waitForEvent('download');
  await banner.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  const saved = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(saved.children, 'odebraný kalendář zmizel ze seznamu').toHaveLength(1);
  expect(saved.children[0].name).toBe('Anežka');
  const allCustomEntries = saved.schedules.flatMap((s: { customEntries: { name: string }[] }) => s.customEntries);
  expect(
    allCustomEntries.some((e: { name: string }) => e.name === 'Bedřichova aktivita'),
    'zápis odebraného kalendáře nesmí zůstat osiřelý v uloženém stavu',
  ).toBe(false);
});

test('T-182: pole adresy vlastní události upozorňuje na odeslání na Nominatim (design_review_71.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;

  await openCatalog(page, width);
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await expect(dialog.getByText(/OpenStreetMap \(Nominatim\)/)).toBeVisible();
});

test('T-185: věk mimo rozsah 3–19 se do kalendáře nezapíše (audit after_review_71 §5)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  // Věk je od FR-W3-7 (design_review_73.md) vždy v panelu Dítěte — na mobilu
  // v záložce „Děti" (MobileChildrenPanel), na desktopu v Souhrnu (ChildSettings,
  // na středních šířkách nutno nejdřív otevřít přes „Souhrn").
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Děti', exact: true }).click();
  } else {
    const souhrn = page.getByRole('button', { name: 'Souhrn', exact: true });
    if (await souhrn.isVisible().catch(() => false)) await souhrn.click();
  }
  const ageInput = page.getByLabel('Věk dítěte');
  const before = await ageInput.inputValue();
  await ageInput.fill('999');
  await ageInput.blur();
  // Neplatná hodnota (mimo 3–19) je no-op — řízený vstup se vrátí na předchozí věk.
  await expect(ageInput).toHaveValue(before);
});

test('T-186: odebrání kalendáře/rozvrhu zobrazí toast s akcí Zpět (audit after_review_71 §7)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  const banner = page.getByRole('banner');

  // Kalendář — na všech šířkách.
  await banner.getByRole('button', { name: 'Přidat kalendář' }).click();
  await banner.getByRole('button', { name: 'Přidat', exact: true }).click();
  page.once('dialog', (d) => d.accept());
  await banner.getByRole('button', { name: /^Odebrat kalendář / }).click();
  await expect(page.getByRole('button', { name: 'Zpět', exact: true })).toBeVisible();

  if (!isCompact(width)) {
    // Varianta rozvrhu — jen desktop (VariantTabs skryté na mobilu).
    await page.getByRole('button', { name: 'Nový', exact: true }).click();
    page.once('dialog', (d) => d.accept());
    // Nová varianta se přidá jako poslední karta — jen ta má tlačítko smazání.
    await page.getByRole('button', { name: 'Smazat rozvrh' }).last().click();
    await expect(page.getByRole('button', { name: 'Zpět', exact: true })).toBeVisible();
  }
});
