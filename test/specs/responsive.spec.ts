import { test, expect, isCompact, isThreeColumn } from '../helpers/profiles';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Pravý panel (Souhrn/Detail) = complementary bez vyhledávacího pole katalogu. */
function infoPanel(page: import('@playwright/test').Page) {
  return page
    .getByRole('complementary')
    .filter({ hasNot: page.getByRole('searchbox') });
}

/** Vybere první kroužek z katalogu a přidá ho do rozvrhu (nekompaktní profily). */
async function enrollFirst(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
}

test('T-200: sloupec dne má při ≥1440px alespoň 105px', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(width < 1440, 'jen široký desktop');
  // Mřížka se sloupci se vykreslí až s obsahem (prázdný stav ukazuje výzvu).
  await enrollFirst(page);
  const box = await page.getByRole('gridcell').first().boundingBox();
  expect(box, 'sloupec dne nenalezen').not.toBeNull();
  expect(box!.width, `sloupec ${Math.round(box!.width)}px`).toBeGreaterThanOrEqual(105);
});

test('T-201: při 1280px nejsou tři stálé sloupce', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isThreeColumn(width) || isCompact(width), 'jen úzký desktop');
  await expect(infoPanel(page)).toBeHidden();
});

test('T-202: pod 900px je výchozí Agenda', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'platí jen pro kompaktní profily');
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  await expect(page.getByRole('tab', { name: /agenda/i })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('T-203: žádné horizontální přetečení', async ({ page }, testInfo) => {
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement!;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow, `přetečení ${overflow}px na ${testInfo.project.name}`).toBeLessThanOrEqual(1);
});

test('T-204: žádný oříznutý text bez ellipsis', async ({ page }) => {
  // Oříznutý prvek zůstává „viditelný"; poznáme ho jen porovnáním scrollWidth a clientWidth.
  const clipped = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      const st = getComputedStyle(el);
      if (st.overflowX !== 'hidden') continue;
      if (st.textOverflow === 'ellipsis') continue;
      const hasDirectText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0,
      );
      if (!hasDirectText) continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        bad.push(`${el.className} :: ${(el.textContent || '').trim().slice(0, 40)}`);
      }
    }
    return bad;
  });
  expect(clipped, clipped.join('\n')).toHaveLength(0);
});

test('T-205: dotykové cíle mají alespoň 24x24', async ({ page }) => {
  const targets = page.getByRole('button');
  const small: string[] = [];
  for (const t of await targets.all()) {
    if (!(await t.isVisible())) continue;
    const box = await t.boundingBox();
    if (box && (box.width < 24 || box.height < 24)) {
      small.push(`${(await t.innerText()).slice(0, 20)} = ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
  }
  expect(small, small.join('\n')).toHaveLength(0);
});

test('T-206: viewport má viewport-fit=cover', async ({ page }) => {
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content ?? '').toContain('viewport-fit=cover');
});

test('T-207: zvětšení na 200 % nevyvolá vodorovný scroll', async ({ page }) => {
  await page.evaluate(() => {
    (document.documentElement.style as unknown as { zoom: string }).zoom = '2';
  });
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement!;
    return el.scrollWidth - el.clientWidth;
  });
  await page.evaluate(() => {
    (document.documentElement.style as unknown as { zoom: string }).zoom = '';
  });
  expect(overflow, `přetečení při 200 % = ${overflow}px`).toBeLessThanOrEqual(1);
});

test('T-208: nadpisy neořezávají českou diakritiku', async ({ page }) => {
  const clipped = await page.evaluate(() => {
    const bad: string[] = [];
    for (const h of Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3'))) {
      if (h.scrollHeight > h.clientHeight + 1) bad.push((h.textContent || '').slice(0, 40));
    }
    return bad;
  });
  expect(clipped, clipped.join('\n')).toHaveLength(0);
});

test('T-209: 45minutový blok má výšku ≥24px a viditelný název', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'blok kalendářové mřížky platí nad 900px');
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByPlaceholder('Např. Logopedie').fill('Test 45');
  const times = dialog.locator('input[type="time"]');
  await times.nth(0).fill('16:00');
  await times.nth(1).fill('16:45');
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();

  const block = page.getByRole('button', { name: /Test 45/ });
  await expect(block).toBeVisible();
  const box = await block.boundingBox();
  expect(box!.height, `výška bloku ${Math.round(box!.height)}px`).toBeGreaterThanOrEqual(24);
});

test('T-210: prázdný pravý panel je užší než naplněný', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isThreeColumn(width), 'pravý panel je stálý sloupec jen od 1440px (C9-L1)');
  const emptyBox = await infoPanel(page).boundingBox();
  expect(emptyBox).not.toBeNull();
  await enrollFirst(page);
  await expect(page.getByRole('button', { name: 'Přidat do rozvrhu' })).toBeHidden();
  const fullBox = await infoPanel(page).boundingBox();
  expect(fullBox!.width, `prázdný ${Math.round(emptyBox!.width)} vs plný ${Math.round(fullBox!.width)}`)
    .toBeGreaterThan(emptyBox!.width);
});

test('T-162: na středních šířkách (900–1439) zůstává katalog vedle detailu, ne pod ním (FR-7)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width) || isThreeColumn(width), 'master-detail platí jen na středních šířkách 900–1439');
  await enrollFirst(page);
  const catalogBox = (await page.getByRole('searchbox').boundingBox())!;
  const detailBox = (await infoPanel(page).boundingBox())!;
  expect(catalogBox.width, 'katalog musí mít rozumnou šířku, ne skrytý pod detailem').toBeGreaterThan(150);
  expect(
    catalogBox.x + catalogBox.width,
    'katalog a detail se nesmí překrývat (master-detail, ne overlay)',
  ).toBeLessThanOrEqual(detailBox.x + 1);
});

test('T-167: mobilní horní lišta skrývá věk/přesun, ale správa kalendářů zůstává v liště (design_review_70.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'odlehčená lišta platí jen na mobilu <900px');

  // Věk/Přesun zůstávají skryté (editují se v záložce „Děti"), ale správa kalendářů
  // (název/přidat/přepnout) je od design_review_70.md vždy v liště, i na mobilu.
  await expect(page.getByRole('banner').getByText('Věk:', { exact: true })).toBeHidden();
  await expect(page.getByRole('banner').getByRole('button', { name: /Přidat kalendář/ })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('textbox', { name: 'Název kalendáře' })).toBeVisible();

  // Záložka „Děti" nadále nese editovatelný věk a přesun.
  await page.getByRole('button', { name: 'Děti', exact: true }).click();
  const childrenSection = page.getByRole('main').locator('section[aria-label="Děti"]');
  await expect(childrenSection.getByRole('button', { name: /Přidat kalendář/ })).toBeVisible();
  await expect(childrenSection.getByLabel('Věk dítěte')).toBeVisible();
});

test('T-211: bottom sheet v peek ukáže název i primární akci', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'bottom sheet je jen na mobilu/tabletu');
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  const card = page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first();
  const cardName = (await card.locator('*').first().innerText()).trim();
  await card.click();
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  await expect(page.getByRole('heading', { name: cardName })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Přidat do rozvrhu' })).toBeVisible();
});

test('T-212: karta se na 360px vejde bez oříznutí názvu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(width !== 360, 'jen nejmenší reálný mobil');
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  const card = page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first();
  const clipped = await card.evaluate((root: HTMLElement) => {
    const bad: string[] = [];
    for (const c of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
      const st = getComputedStyle(c);
      if (st.overflowX === 'hidden' && st.textOverflow !== 'ellipsis' && c.scrollWidth > c.clientWidth + 1) {
        bad.push((c.textContent || '').slice(0, 30));
      }
    }
    return bad;
  });
  expect(clipped, clipped.join('\n')).toHaveLength(0);
});

test('T-213: primární dotykové cíle na mobilu mají ≥44px', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'platí pro kompaktní profily');
  // Spodní navigace.
  const nav = page.locator('nav').last();
  for (const b of await nav.getByRole('button').all()) {
    const box = await b.boundingBox();
    expect(box!.height, `nav "${(await b.innerText()).trim()}" = ${Math.round(box!.height)}px`).toBeGreaterThanOrEqual(44);
  }
  // Přepínač Agenda/Mřížka na záložce Rozvrh.
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  for (const name of ['Agenda', 'Mřížka']) {
    const box = await page.getByRole('tab', { name }).boundingBox();
    expect(box!.height, `${name} = ${Math.round(box!.height)}px`).toBeGreaterThanOrEqual(44);
  }
  // Filtr dnů na záložce Katalog.
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  const po = await page.getByRole('button', { name: 'Po', exact: true }).boundingBox();
  expect(po!.height, `Po = ${Math.round(po!.height)}px`).toBeGreaterThanOrEqual(44);

  // Dialog „Vlastní událost" — zavírací a odebírací ikonová tlačítka (BL-045, design_review_67.md).
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByRole('button', { name: /Přidat další čas/ }).click();
  const removeBox = await dialog.getByRole('button', { name: 'Odebrat termín' }).first().boundingBox();
  expect(removeBox!.height, `Odebrat termín = ${Math.round(removeBox!.height)}px`).toBeGreaterThanOrEqual(44);
  const closeBox = await dialog.getByRole('button', { name: 'Zavřít' }).boundingBox();
  expect(closeBox!.height, `Zavřít dialog = ${Math.round(closeBox!.height)}px`).toBeGreaterThanOrEqual(44);
});

test('T-214: na 320px není vodorovný scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  const overflow = () =>
    page.evaluate(() => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth);
  expect(await overflow(), 'úvod 320px').toBeLessThanOrEqual(1);
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  expect(await overflow(), 'katalog 320px').toBeLessThanOrEqual(1);
});

// --- Domovská obrazovka a planner-first navigace (CHANGE-53) ---

test('T-215: mobil má nav Domů/Katalog/Rozvrh/Děti a výchozí je Domů', async ({ page }, testInfo) => {
  test.skip(!isCompact(testInfo.project.use.viewport!.width), 'jen mobilní navigace');
  for (const name of ['Domů', 'Katalog', 'Rozvrh', 'Děti']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: /Přehled/ })).toBeVisible();
});

test('T-216: Home ukazuje souhrn i doporučení a CTA otevře katalog', async ({ page }, testInfo) => {
  test.skip(!isCompact(testInfo.project.use.viewport!.width), 'Home je mobilní záložka');
  const today = page.getByRole('region', { name: 'Dnes' });
  const week = page.getByRole('region', { name: 'Tento týden' });
  await expect(today).toBeVisible();
  await expect(week).toBeVisible();
  await expect(page.getByRole('region', { name: 'Doporučení' })).toBeVisible();
  // FR-2 (design_review_58.md): „Dnes" má prioritu nad týdenním přehledem.
  const todayY = (await today.boundingBox())!.y;
  const weekY = (await week.boundingBox())!.y;
  expect(todayY, '„Dnes" má být nad „Tento týden"').toBeLessThan(weekY);
  await page.getByRole('button', { name: 'Procházet katalog' }).click();
  await expect(page.getByRole('searchbox')).toBeVisible();
});

test('T-217: onboarding se dá odbýt a přepne na katalog', async ({ page }, testInfo) => {
  test.skip(!isCompact(testInfo.project.use.viewport!.width), 'onboarding je na mobilní Home');
  await expect(page.getByRole('region', { name: 'Rychlé nastavení' })).toBeVisible();
  await page.getByRole('button', { name: 'Hotovo, vybrat kroužky' }).click();
  await expect(page.getByRole('searchbox')).toBeVisible();
});

// --- Mobilní safe-area a sheet lifecycle (CHANGE-55) ---

test('T-218: mobilní sheet se po přidání do rozvrhu automaticky zavře', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'sheet je jen na mobilu/tabletu');
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first().click();
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  const addBtn = page.getByRole('button', { name: 'Přidat do rozvrhu' });
  await expect(addBtn).toBeVisible();
  await addBtn.click();
  await expect(addBtn).toBeHidden();
  await expect(page.getByRole('button', { name: 'Zavřít detail' })).toHaveCount(0);
  // Spodní navigace je hned po zavření klikatelná (žádný residual overlay).
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await expect(page.getByRole('searchbox')).toBeVisible();
});

test('T-219: mobilní sheet lze zavřít tlačítkem „Zavřít“ (≥44 px)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'sheet je jen na mobilu/tabletu');
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first().click();
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  const closeBtn = page.getByRole('button', { name: 'Zavřít detail' });
  await expect(closeBtn).toBeVisible();
  const box = await closeBtn.boundingBox();
  expect(box!.width, `šířka ${Math.round(box!.width)}px`).toBeGreaterThanOrEqual(44);
  expect(box!.height, `výška ${Math.round(box!.height)}px`).toBeGreaterThanOrEqual(44);
  await closeBtn.click();
  await expect(page.getByRole('button', { name: 'Přidat do rozvrhu' })).toBeHidden();
});

test('T-220: shell používá 100dvh a rezervuje safe-area pro spodní navigaci/sheet', async () => {
  const src = readFileSync(join('apps', 'web', 'app', 'page.tsx'), 'utf8');
  expect(src, 'koření shell musí použít h-dvh (100vh na iOS Safari nezohledňuje dynamickou lištu)').toMatch(
    /className="flex h-dvh flex-col/,
  );
  expect(src.includes('h-screen'), 'h-screen nesmí zůstat na kořenovém shellu').toBe(false);
  const safeAreaCount = (src.match(/env\(safe-area-inset-bottom/g) ?? []).length;
  expect(safeAreaCount, 'nav i sheet musí rezervovat safe-area-inset-bottom').toBeGreaterThanOrEqual(2);
});
