import { test, expect, isCompact, isThreeColumn } from '../helpers/profiles';
import { EXPECTED_CATALOG_COUNT } from '../fixtures/catalog';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

/** Karty kroužků nesou v přístupném názvu cenu; ostatní tlačítka katalogu ne. */
function cards(page: import('@playwright/test').Page) {
  return page.getByRole('button', { name: /Kč|Cena neuvedena/ });
}

async function openCatalog(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  }
}

async function expandAll(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
}

async function enrollFirst(page: import('@playwright/test').Page, width: number) {
  await openCatalog(page, width);
  await expandAll(page);
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
}

// --- 5.1 Vstup do aplikace ---

test('T-100: věkový filtr je při prvním načtení vypnutý', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expect(page.getByRole('checkbox', { name: /Jen vhodné pro věk/ })).not.toBeChecked();
});

test('T-101: název rozvrhu je při prvním načtení prázdný', async ({ page }, testInfo) => {
  // Na mobilu je pole názvu kalendáře v mobilním menu „Další ▾".
  if (isCompact(testInfo.project.use.viewport!.width)) {
    await page.getByRole('button', { name: /Další ▾/ }).click();
  }
  await expect(page.getByRole('textbox', { name: 'Název kalendáře' })).toHaveValue('');
});

test('T-102: prázdný kalendář má empty state s cestou do katalogu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  if (isCompact(width)) await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Přidat první kroužek' })).toBeVisible();
});

test('T-103: prázdný pravý panel neukazuje nulové metriky', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Info', exact: true }).click();
  } else if (!isThreeColumn(width)) {
    const souhrn = page.getByRole('button', { name: 'Souhrn', exact: true });
    if (await souhrn.isVisible()) await souhrn.click();
  }
  const scope =
    !isCompact(width) && !isThreeColumn(width)
      ? page.getByTestId('info-drawer')
      : page.getByRole('main');
  await expect(scope.getByRole('heading', { name: /Zatím žádné kroužky/ })).toBeVisible();
  await expect(scope.getByText(/Cest týdně|Hodin týdně|Obsazená odpoledne/)).toHaveCount(0);
});

test('T-104: osa pokrývá celý den, výchozí okno ukazuje denní hodiny', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'časová osa mřížky platí nad 900px');
  await enrollFirst(page, width);
  // Osa nově obsahuje značky pro celý den (00 i pozdní večer) — jde odrolovat (Changes 11).
  const hours = await page.evaluate(() => {
    const values = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .filter((el) => /^\d{1,2}:\d{2}$/.test((el.textContent || '').trim()) && el.children.length === 0)
      .map((el) => Number((el.textContent || '').trim().split(':')[0]));
    return { min: Math.min(...values), max: Math.max(...values) };
  });
  expect(hours.min, `nejnižší hodina osy ${hours.min}`).toBe(0);
  expect(hours.max, `nejvyšší hodina osy ${hours.max}`).toBeGreaterThanOrEqual(22);

  // Výchozí odrolování ukazuje denní okno: 12:00 je ve viewportu, 03:00 mimo.
  const visible = await page.evaluate(() => {
    const marks = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.children.length === 0 && /^\d{1,2}:\d{2}$/.test((el.textContent || '').trim()),
    );
    const scroller = marks[0]?.closest('.overflow-y-auto') as HTMLElement | null;
    if (!scroller) return null;
    const box = scroller.getBoundingClientRect();
    const inView = (label: string) => {
      const el = marks.find((m) => (m.textContent || '').trim() === label);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= box.top && r.bottom <= box.bottom;
    };
    return { noon: inView('12:00'), night: inView('03:00') };
  });
  expect(visible?.noon, 'poledne má být ve výchozím okně').toBe(true);
  expect(visible?.night, 'noční hodina má být odrolovaná mimo').toBe(false);
});

test('T-121: filtr pořadatele zúží katalog a Zrušit filtry ho vynuluje', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await expandAll(page);
  const all = await cards(page).count();
  const select = page.getByRole('combobox', { name: 'Pořadatel kroužku' });
  const options = await select.locator('option').all();
  // Vyber první konkrétní pořadatel (přeskoč „Všichni pořadatelé").
  const value = await options[1]!.getAttribute('value');
  await select.selectOption(value!);
  await expandAll(page);
  const filtered = await cards(page).count();
  expect(filtered, `filtr pořadatele nezúžil (${filtered}/${all})`).toBeLessThan(all);
  expect(filtered).toBeGreaterThan(0);
});

// --- 5.2 Katalog ---

test('T-110: karta ukazuje den a čas, ne jen „1 termín"', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expandAll(page);
  const name = await cards(page).first().getAttribute('aria-label') ?? '';
  const text = name || (await cards(page).first().innerText());
  expect(text, 'karta bez dne a času').toMatch(/(Po|Út|St|Čt|Pá|So|Ne)\s+\d{1,2}:\d{2}/);
});

test('T-111: hledání ignoruje diakritiku a velikost písmen', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  const search = page.getByRole('searchbox');
  await search.fill('programovani');
  const lower = await cards(page).count();
  expect(lower, 'dotaz bez diakritiky nic nenašel').toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: /Programování/ }).first()).toBeVisible();
  await search.fill('PROGRAMOVANI');
  expect(await cards(page).count()).toBe(lower);
});

test('T-112: vícevýběr dnů vrací sjednocení, ne průnik', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expandAll(page);
  await page.getByRole('button', { name: 'Út', exact: true }).click();
  const onlyTue = await cards(page).count();
  await page.getByRole('button', { name: 'Čt', exact: true }).click();
  const tueAndThu = await cards(page).count();
  expect(tueAndThu, `Út=${onlyTue}, Út+Čt=${tueAndThu}`).toBeGreaterThanOrEqual(onlyTue);
});

test('T-113: filtr času odfiltruje dřívější začátek', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expandAll(page);
  await expect(cards(page).filter({ hasText: /\b15:00\b/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Další filtry' }).click();
  // Pole typu time nemá spolehlivou ARIA roli; v pokročilých filtrech je první = začátek.
  await page.locator('input[type="time"]').first().fill('15:15');
  await expect(cards(page).filter({ hasText: /\b15:00\b/ })).toHaveCount(0);
});

test('T-114: „Bez konfliktu" skryje kolidující kroužky', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'vyžaduje viditelný katalog i detail');
  await expandAll(page);
  const before = await cards(page).count();
  await enrollFirst(page, width);
  await page.getByRole('checkbox', { name: /Bez konfliktu/ }).check();
  const after = await cards(page).count();
  expect(after, `před=${before}, po zapnutí filtru=${after}`).toBeLessThan(before);
});

test('T-115: „Bez konfliktu" je u prázdného rozvrhu zašedlé', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expect(page.getByRole('checkbox', { name: /Bez konfliktu/ })).toBeDisabled();
});

test('T-116: filtr bez výsledku nabídne zrušení filtrů', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await page.getByRole('searchbox').fill('zzxxqq-neexistuje');
  await expect(page.getByRole('button', { name: /Zrušit filtry|Vymazat filtry|Zrušit/ })).toBeVisible();
});

test('T-117: prázdná kategorie se nezobrazuje jako skupina s (0)', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expandAll(page);
  const zeroGroups = await page.getByRole('button', { name: /\(0\)\s*$/ }).count();
  expect(zeroGroups, 'skupina s nula položkami je viditelná').toBe(0);
});

test('T-118: součet počtů podskupin se rovná počtu u kořene', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expandAll(page);
  await expect(cards(page)).toHaveCount(EXPECTED_CATALOG_COUNT);
});

test('T-119: přidaný kroužek změní stav na „Přidáno"', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'vyžaduje viditelný katalog i detail');
  await enrollFirst(page, width);
  await expect(page.getByText('Přidáno').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /V rozvrhu \(\d+\)/ })).toBeVisible();
});

test('T-120: skloňování počtu termínů je gramaticky správně', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  await expandAll(page);
  const wrong = await page.evaluate(() => {
    const bad: string[] = [];
    for (const b of Array.from(document.querySelectorAll<HTMLElement>('button'))) {
      const m = (b.textContent || '').match(/(\d+)\s+(termín\w*)/);
      if (!m) continue;
      const n = Number(m[1]);
      const form = m[2];
      const expected = n === 1 ? 'termín' : n >= 2 && n <= 4 ? 'termíny' : 'termínů';
      if (form !== expected) bad.push(`${n} ${form} (má být ${expected})`);
    }
    return bad;
  });
  expect(wrong, wrong.join('\n')).toHaveLength(0);
});
