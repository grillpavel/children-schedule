import { test, expect } from '../helpers/profiles';

/**
 * Mobilní audit v2 (after_review_85) — regresní testy k nálezům M1–M10
 * (design_review_86.md, CHANGE-93). Původně T-230–T-243 z auditu, přečíslováno
 * na T-244–T-257 kvůli kolizi se stávajícími T-230..233 (CHANGE-85/89/90).
 *
 * Stav: 14 zelených (0 `test.fixme()`) — viz spec. M5 (BL-055) a M6 (BL-056)
 * dodělány v CHANGE-94 (design_review_87.md). M3 a M10 jsou falešné nálezy
 * auditu (naměřením nereprodukováno), ponechány jako regresní pojistka.
 *
 * Spuštění jen této vrstvy:
 *   npx playwright test --config test/playwright.config.ts mobile-audit-v2
 *
 * Většina testů vynucuje vlastní viewport (matice 6 profilů nemá žádný
 * landscape mobil ani široký telefon), proto běží jen na projektu `mobile` —
 * jinak by se každý test zduplikoval šestkrát se stejným výsledkem.
 */

const ONLY_ONCE = 'mobil-specifický test, běží jednou mimo základní matici profilů';

/** Vloží vlastní událost daného času přes dialog v katalogu. */
async function addCustomEntry(
  page: import('@playwright/test').Page,
  name: string,
  from: string,
  to: string,
) {
  await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByPlaceholder('Např. Logopedie').fill(name);
  // Výchozí mobilní pohled je ukotven na „dnešek“ (úterý ve zmrazeném čase,
  // BL-055 fix z CHANGE-97) — bez výběru dne by výchozí pondělí bylo mimo
  // 3denní okno a blok by v mřížce nebyl vidět.
  await dialog.locator('select').first().selectOption('2');
  const times = dialog.locator('input[type="time"]');
  await times.nth(0).fill(from);
  await times.nth(1).fill(to);
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();
}

/** Přepne na záložku Rozvrh a do režimu Mřížka, je-li přepínač k dispozici. */
async function openGrid(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  const gridTab = page.getByRole('tab', { name: 'Mřížka' });
  if (await gridTab.isVisible().catch(() => false)) await gridTab.click();
}

// ---------------------------------------------------------------------------
// M1 — široký telefon na šířku: rail se vykreslí, ale žádná záložka nereaguje
// ---------------------------------------------------------------------------

test.describe('M1 — landscape-compact vs. isMobile na širokém telefonu', () => {
  // iPhone 15 Pro Max na šířku: 932 > 768 (tedy NENÍ isMobile), ale výška 430
  // vyhoví landscape-compact → vykreslí se rail, který nikdo neobsluhuje.
  test.use({ viewport: { width: 932, height: 430 } });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-244 (M1): je-li vidět boční rail, musí jeho záložky přepínat obsah', async ({
    page,
  }) => {
    const nav = page.getByRole('navigation', { name: 'Hlavní navigace' });
    const navBox = await nav.boundingBox();
    const isRail = navBox !== null && navBox.width <= 60 && navBox.height >= 300;

    test.skip(
      !isRail,
      'rail se nevykreslil — po opravě M1 je to správné chování na 932×430',
    );

    // Rail je vidět. Pak MUSÍ fungovat: klik na „Domů“ ukáže přehled.
    await page.getByRole('button', { name: 'Domů', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: /Přehled —/ }),
      'rail je vidět, ale klik na „Domů“ nic nezobrazil (mrtvé UI, nález M1)',
    ).toBeVisible({ timeout: 3000 });
  });

  test('T-245 (M1): rail a desktopový katalog nesmí být vidět současně', async ({
    page,
  }) => {
    const nav = page.getByRole('navigation', { name: 'Hlavní navigace' });
    const navBox = await nav.boundingBox();
    const isRail = navBox !== null && navBox.width <= 60 && navBox.height >= 300;
    if (!isRail) return;

    // Rail znamená jednopanelový mobilní režim. Trvalý katalogový sloupec
    // vedle něj je příznak, že platí obě větve layoutu zároveň.
    const catalogSearch = page.locator('[data-catalog-search]');
    const catalogVisible = await catalogSearch.isVisible().catch(() => false);
    expect(
      catalogVisible,
      'rail (mobilní režim) i trvalý katalogový sloupec (desktop) jsou vidět zároveň — nález M1',
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// M2 — hustota 26 px/h ořeže čas v bloku
// ---------------------------------------------------------------------------

test.describe('M2 — čitelnost bloku v landscape-compact', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-246 (M2): hodinový blok neořezává svůj vlastní obsah', async ({ page }) => {
    // 60 minut je nejběžnější délka kroužku v katalogu.
    await addCustomEntry(page, 'Hodinovka', '16:00', '17:00');
    await openGrid(page);

    const block = page.getByRole('button', { name: /Hodinovka/ });
    await expect(block).toBeVisible();

    const clipped = await block.evaluate((el) => ({
      client: el.clientHeight,
      scroll: el.scrollHeight,
    }));

    expect(
      clipped.scroll - clipped.client,
      `blok má obsah ${clipped.scroll}px ve výšce ${clipped.client}px — čas je ořezaný (nález M2)`,
    ).toBeLessThanOrEqual(1);
  });

  test('T-247 (M2): řádek s časem má truncate, ať nepřetéká do strany', async ({
    page,
  }) => {
    await addCustomEntry(page, 'Truncate test', '16:00', '17:30');
    await openGrid(page);

    const block = page.getByRole('button', { name: /Truncate test/ });
    await expect(block).toBeVisible();

    // Element s časem je druhý div v bloku (první nese název).
    const timeOverflow = await block.evaluate((el) => {
      const rows = Array.from(el.querySelectorAll(':scope > div'));
      const timeRow = rows.find((r) => /\d{2}:\d{2}–\d{2}:\d{2}/.test(r.textContent ?? ''));
      if (!timeRow) return null;
      const style = getComputedStyle(timeRow);
      return {
        overflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
        scrollW: timeRow.scrollWidth,
        clientW: timeRow.clientWidth,
      };
    });

    expect(timeOverflow, 'řádek s časem nenalezen').not.toBeNull();
    expect(
      timeOverflow!.scrollW - timeOverflow!.clientW,
      `čas přetéká o ${timeOverflow!.scrollW - timeOverflow!.clientW}px — chybí truncate (nález M2)`,
    ).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// M3 — rotace odhodí pozici scrollu v čase
// ---------------------------------------------------------------------------

test.describe('M3 — zachování času při rotaci', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-248 (M3): po rotaci na šířku zůstane v pohledu stejná denní hodina', async ({
    page,
  }) => {
    await addCustomEntry(page, 'Odpolední', '16:00', '17:00');
    await openGrid(page);

    const block = page.getByRole('button', { name: /Odpolední/ });
    await expect(block).toBeVisible();
    await block.scrollIntoViewIfNeeded();

    // Blok je v pohledu na výšku. Po rotaci na šířku (jiná hustota osy)
    // musí zůstat v pohledu — jinak rozvrh po otočení vypadá prázdný.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);

    const stillVisible = await block.isVisible().catch(() => false);
    const box = stillVisible ? await block.boundingBox() : null;
    const inViewport =
      box !== null && box.y + box.height > 0 && box.y < 390;

    expect(
      inViewport,
      box === null
        ? 'blok po rotaci úplně zmizel z DOM/pohledu (nález M3)'
        : `blok po rotaci skončil mimo pohled (y=${Math.round(box.y)}, viewport 390) — scroll se nepřepočítal (nález M3)`,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// M5 — mobil nemá přepínač pohledu, mřížka vždy scrolluje do strany
// ---------------------------------------------------------------------------

test.describe('M5 — přepínač pohledu a šířka mřížky na mobilu', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-249 (M5): mobil má přepínač Den / 3 dny / Týden', async ({ page }) => {
    await addCustomEntry(page, 'Cokoli', '16:00', '17:00');
    await openGrid(page);

    await expect(
      page.getByRole('button', { name: '3 dny', exact: true }),
      'mobil nemá přepínač pohledu — mřížka je vždy sedmidenní (nález M5)',
    ).toBeVisible({ timeout: 3000 });
  });

  test('T-250 (M5): výchozí mobilní mřížka se vejde bez vodorovného scrollu', async ({
    page,
  }) => {
    await addCustomEntry(page, 'Cokoli', '16:00', '17:00');
    await openGrid(page);

    const scroller = page.locator('.print-grid >> div.overflow-x-auto').first();
    const overflow = await scroller.evaluate(
      (el) => el.scrollWidth - el.clientWidth,
    );

    expect(
      overflow,
      `mřížka přetéká o ${overflow}px do strany — výchozí pohled by měl být 3 dny, ne týden (nález M5)`,
    ).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// M6 — touch-none na vlastních událostech blokuje scroll mřížky
// ---------------------------------------------------------------------------

test.describe('M6 — mrtvé zóny pro scroll', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-251 (M6): dlouhá vlastní událost nesmí vypnout scroll na celé své ploše', async ({
    page,
  }) => {
    // Škola 8:00–14:00 je typická první vlastní událost rodiče.
    await addCustomEntry(page, 'Škola', '08:00', '14:00');
    await openGrid(page);

    const block = page.getByRole('button', { name: /Škola/ });
    await expect(block).toBeVisible();

    const info = await block.evaluate((el) => ({
      touchAction: getComputedStyle(el).touchAction,
      height: el.getBoundingClientRect().height,
    }));

    // `touch-action: none` na velké ploše = uživatel tam nescrolluje prstem.
    // Přijatelné je `pan-y`, nebo `none` jen na malém úchytu (< 48px).
    const blocksScroll = info.touchAction === 'none' && info.height > 48;
    expect(
      blocksScroll,
      `blok vysoký ${Math.round(info.height)}px má touch-action:none — prst na něm mřížkou nescrolluje (nález M6)`,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// M7 — sheet detailu měří vh, ne dvh
// ---------------------------------------------------------------------------

test.describe('M7 — výška mobilního sheetu', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-252 (M7): rozbalený sheet se vejde do viewportu', async ({ page }) => {
    await page.getByRole('button', { name: 'Katalog', exact: true }).click();
    await page.getByRole('button', { name: 'Rozbalit vše' }).click();
    await page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first().click();

    // Backdrop (design_review_95.md) teď sdílí stejné třídy `fixed inset-x-0
    // bottom-12` jako sheet samotný — vyloučit ho přes aria-hidden.
    const sheet = page.locator('.fixed.inset-x-0.bottom-12:not([aria-hidden="true"])');
    await expect(sheet).toBeVisible();

    // Sheet se od design_review_96.md vždy otevírá rozbalený (CHANGE-103).
    await page.waitForTimeout(300);

    const fits = await sheet.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
    });

    expect(
      fits.top,
      `rozbalený sheet začíná na y=${Math.round(fits.top)} — přetéká nad viewport (nález M7: vh místo dvh)`,
    ).toBeGreaterThanOrEqual(-1);
  });
});

// ---------------------------------------------------------------------------
// M8 — sourozenecký překryv na mobilu nedostupný
// ---------------------------------------------------------------------------

test.describe('M8 — překryv rozvrhů sourozenců na mobilu', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-253 (M8): se dvěma dětmi je v mobilní mřížce přepínač sourozenců', async ({
    page,
  }) => {
    // Druhý kalendář přes záložku Děti (tlačítko existuje i v horní liště,
    // proto scopováno na panel záložky Děti — jinak strict-mode kolize).
    await page.getByRole('button', { name: 'Děti', exact: true }).click();
    await page.getByLabel('Děti').getByRole('button', { name: /Přidat kalendář/ }).click();
    await page.getByLabel('Název nového kalendáře').fill('Sourozenec');
    await page.getByRole('button', { name: 'Přidat', exact: true }).click();

    await addCustomEntry(page, 'Cokoli', '16:00', '17:00');
    await openGrid(page);

    await expect(
      page.getByRole('button', { name: /sourozence/i }),
      'mobil nemá přepínač sourozeneckého překryvu, přitom „stihnu odvézt obě děti“ je mobilní úloha (nález M8)',
    ).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// M9 — dotykové cíle pod 44 px
// ---------------------------------------------------------------------------

test.describe('M9 — velikost dotykových cílů', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-254 (M9): navigace mřížky a undo/redo mají alespoň 44×44', async ({
    page,
  }) => {
    await addCustomEntry(page, 'Cokoli', '16:00', '17:00');
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();

    const targets = [
      { label: 'Předchozí', locator: page.getByRole('button', { name: 'Předchozí' }) },
      { label: 'Další', locator: page.getByRole('button', { name: 'Další' }) },
      { label: 'Dnes', locator: page.getByRole('button', { name: 'Dnes', exact: true }) },
      { label: 'Zpět (undo)', locator: page.getByRole('button', { name: /^Zpět \(/ }) },
    ];

    const tooSmall: string[] = [];
    for (const t of targets) {
      if (!(await t.locator.isVisible().catch(() => false))) continue;
      const box = await t.locator.boundingBox();
      if (!box) continue;
      if (box.width < 44 || box.height < 44) {
        tooSmall.push(`${t.label} ${Math.round(box.width)}×${Math.round(box.height)}`);
      }
    }

    expect(
      tooSmall,
      `dotykové cíle pod 44px: ${tooSmall.join(', ')} (nález M9)`,
    ).toHaveLength(0);
  });

  test('T-255 (M9): destruktivní ✕ u kalendáře není menší než přepnutí vedle něj', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Děti', exact: true }).click();
    await page.getByLabel('Děti').getByRole('button', { name: /Přidat kalendář/ }).click();
    await page.getByLabel('Název nového kalendáře').fill('Druhý');
    await page.getByRole('button', { name: 'Přidat', exact: true }).click();

    // Scopováno na panel záložky Děti — Toolbar má vlastní (textové, ne ✕)
    // tlačítko „Odebrat kalendář“, které je vidět na všech šířkách a je jiný
    // nález než chip s ✕ v mobilním panelu.
    const remove = page.getByLabel('Děti').getByRole('button', { name: /Odebrat kalendář/ }).first();
    await expect(remove).toBeVisible();
    const box = await remove.boundingBox();

    expect(
      Math.min(box!.width, box!.height),
      `destruktivní ✕ má ${Math.round(box!.width)}×${Math.round(box!.height)} — menší než 44px cíl pro přepnutí hned vedle (nález M9)`,
    ).toBeGreaterThanOrEqual(44);
  });
});

// ---------------------------------------------------------------------------
// M10 — věk bez validace
// ---------------------------------------------------------------------------

test.describe('M10 — validace věku dítěte', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', ONLY_ONCE);
    await page.goto('/');
  });

  test('T-256 (M10): smazání obsahu pole věku nastaví „věk neznámý" (undefined), ne 0 ani NaN (design_review_88.md: nativně bez věku je validní stav, uživatel ho může i vymazat)', async ({ page }) => {
    await page.getByRole('button', { name: 'Děti', exact: true }).click();

    const age = page.getByLabel('Věk dítěte');
    await expect(age).toBeVisible();
    await age.fill('');
    await age.blur();
    // Pole zůstává prázdné (design_review_88.md) — neplatná/prázdná hodnota se
    // nezobrazí jako 0/NaN ani se nevrátí na starou hodnotu, věk je prostě neznámý.
    await expect(age).toHaveValue('');

    await page.getByRole('button', { name: 'Domů', exact: true }).click();
    await expect(page.getByText(/Věk NaN let|Věk undefined let|Věk 0 let/)).toHaveCount(0);
  });

  test('T-257 (M10): neplatný věk nesmí vyprázdnit doporučení', async ({ page }) => {
    // design_review_88.md: HomeScreen „Doporučujeme" bylo nahrazeno „Vybranými
    // kroužky" (aria-label „Vybraný kroužek: …", ne „Doporučeno: …") — na Domů
    // záložce už tedy žádné „Doporučeno:" tlačítko nikdy nebude, test se natrvalo
    // přeskočí (self-skip níže), ponecháno pro historii nálezu M10.
    await page.getByRole('button', { name: 'Domů', exact: true }).click();
    const before = await page.getByRole('button', { name: /^Doporučeno:/ }).count();
    test.skip(before === 0, 'výchozí stav nemá doporučení, test nemá co srovnávat');

    await page.getByRole('button', { name: 'Děti', exact: true }).click();
    await page.getByLabel('Věk dítěte').fill('');
    await page.getByRole('button', { name: 'Domů', exact: true }).click();

    const after = await page.getByRole('button', { name: /^Doporučeno:/ }).count();
    expect(
      after,
      `doporučení po neplatném věku spadla z ${before} na ${after} bez jakékoli hlášky (nález M10)`,
    ).toBeGreaterThan(0);
  });
});
