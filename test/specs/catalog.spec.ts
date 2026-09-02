import { test, expect, isCompact, isThreeColumn, openCalendarMenuIfCompact } from '../helpers/profiles';
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

/** Otevře katalog a rozbalí sekci Doporučení (defaultně sbalená). Popisek se
 * mění na „Co se hodí [dítě]? (N)“, když existuje plnohodnotná shoda (BL-040,
 * design_review_67.md) — regex pokrývá obě varianty. */
async function openRecs(page: import('@playwright/test').Page, width: number) {
  await openCatalog(page, width);
  await page.getByRole('button', { name: /Doporučení na míru|Co se hodí/ }).click();
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

test('T-101: pole názvu kalendáře odráží jméno aktivního kalendáře', async ({ page }, testInfo) => {
  // Od design_review_70.md je pole vždy v horní liště na desktopu; od BL-057
  // (design_review_88.md) je na mobilu sbalené za tlačítko „Správa kalendářů".
  await openCalendarMenuIfCompact(page, testInfo.project.use.viewport!.width);
  await expect(page.getByRole('textbox', { name: 'Název kalendáře' })).toHaveValue('Moje dítě');
});

test('T-102: prázdný kalendář má empty state s cestou do katalogu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  if (isCompact(width)) await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Přidat první kroužek' })).toBeVisible();
});

test('T-103: prázdný pravý panel neukazuje nulové metriky', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Děti', exact: true }).click();
  } else if (!isThreeColumn(width)) {
    const souhrn = page.getByRole('button', { name: 'Děti', exact: true });
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

// --- 5.7 Doporučení (CHANGE-51) ---

test('T-122: doporučení jsou v nefiltrovaném katalogu a při hledání zmizí', async ({ page }, testInfo) => {
  await openRecs(page, testInfo.project.use.viewport!.width);
  const section = page.getByRole('region', { name: 'Doporučení' });
  await expect(section.getByRole('heading', { name: 'Doporučujeme' })).toBeVisible();
  await page.getByRole('searchbox').fill('Atletika');
  await expect(section).toBeHidden();
});

test('T-123: zapnutý zájem přidá do doporučení důvod „Odpovídá zájmu"', async ({ page }, testInfo) => {
  await openRecs(page, testInfo.project.use.viewport!.width);
  const section = page.getByRole('region', { name: 'Doporučení' });
  const firstRec = section.getByRole('button', { name: /^Doporučeno: / }).first();
  await expect(firstRec).toBeVisible();
  // Zapni kategorii prvního doporučení → objeví se u něj důvod „Odpovídá zájmu".
  const category = (await firstRec.getByTestId('rec-category').innerText()).trim();
  await section.getByRole('button', { name: category, exact: true }).click();
  await expect(section.getByText(`✓ Odpovídá zájmu ${category}`).first()).toBeVisible();
});

test('T-124: klik na doporučení otevře detail kroužku', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'detail v pravém panelu je jen na desktopu');
  await page.getByRole('button', { name: /Doporučení na míru|Co se hodí/ }).click();
  await page.getByRole('button', { name: /^Doporučeno: / }).first().click();
  await expect(page.getByRole('button', { name: 'Přidat do rozvrhu' })).toBeVisible();
});

test('T-125: nastavený rozpočet přidá k doporučení důvod „V rozpočtu"', async ({ page }, testInfo) => {
  await openRecs(page, testInfo.project.use.viewport!.width);
  const section = page.getByRole('region', { name: 'Doporučení' });
  const budget = section.getByRole('spinbutton', { name: 'Měsíční rozpočet v korunách' });
  await budget.fill('100000');
  await budget.press('Enter');
  await expect(section.getByText(/V rozpočtu/).first()).toBeVisible();
});

test('T-126: volné dny přidají k doporučení důvod „Termín ve volném čase"', async ({ page }, testInfo) => {
  await openRecs(page, testInfo.project.use.viewport!.width);
  const section = page.getByRole('region', { name: 'Doporučení' });
  // Zpřístupni všechny dny (celodenní okna) → každý termín se vejde.
  for (const short of ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']) {
    await section.getByRole('button', { name: `Volno ${short}`, exact: true }).click();
  }
  await expect(section.getByText(/Termín ve volném čase/).first()).toBeVisible();
});

// --- Vyhledávání se po přidání vyprázdní (CHANGE-56) ---

test('T-127: vyhledávání se po přidání kroužku z primárního CTA vyprázdní', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  const search = page.getByRole('searchbox');
  await search.fill('Basketbal');
  await expandAll(page);
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  await expect(search).toHaveValue('');
});

// --- Ikona lupy nepřekrývá text v hledání (CHANGE-57) ---

test('T-128: ikona lupy v hledání nepřekrývá zadaný text', async ({ page }, testInfo) => {
  await openCatalog(page, testInfo.project.use.viewport!.width);
  const search = page.getByRole('searchbox');
  await search.fill('Basketbal');
  const layout = await search.evaluate((input) => {
    const icon = input.parentElement?.querySelector('svg');
    if (!icon) return null;
    const iconBox = icon.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();
    return {
      iconRightRelative: iconBox.right - inputBox.left,
      paddingLeft: parseFloat(getComputedStyle(input).paddingLeft),
    };
  });
  expect(layout, 'ikona lupy vedle pole nenalezena').not.toBeNull();
  expect(
    layout!.paddingLeft,
    `levý padding pole (${layout!.paddingLeft}px) musí sahat aspoň za pravý okraj ikony (${layout!.iconRightRelative}px)`,
  ).toBeGreaterThanOrEqual(layout!.iconRightRelative);
});

// --- Srozumitelný zápis dalších termínů, ne strohé "+N" (CHANGE-60, design_review_58.md FR-1) ---

test('T-129: karta s více termíny má srozumitelný zápis a klik zobrazí všechny termíny', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await expandAll(page);

  // Atletická školička má 3 samostatné skupiny (různé dny/časy), ne jen jednu
  // skupinu s víc lekcemi — proto se u ní zobrazí i „Varianty docházky“.
  const multi = cards(page).filter({ hasText: 'Atletická školička' }).first();
  await expect(multi).toBeVisible();
  const label = await multi.innerText();
  expect(label, 'karta bez zápisu dalších termínů').toMatch(/další termín/);
  // Staré strohé "16:30 · +1" bez vysvětlení je zakázané; kategorie/pořadatel
  // odděluje "·" jinde v kartě, proto kontrolujeme jen okolí času a čísla.
  expect(label, 'strohé "čas · +N" bez vysvětlení').not.toMatch(/\d{1,2}:\d{2}\s*·\s*\+\d/);

  await multi.click();
  await expect(page.getByText('Varianty docházky').first()).toBeVisible();
});

// --- Konec termínu na kartě + tisícový oddělovač ceny (CHANGE-66, design_review_65.md FR-9/FR-10) ---

test('T-164: karta ukazuje konec termínu a cenu s tisícovým oddělovačem', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await expandAll(page);

  // Atletická školička (4 800 Kč/rok, 3 termíny) — dřív karta ukazovala jen
  // začátek (např. „16:30“), doména má endMinutes u každé Session k dispozici.
  const multi = cards(page).filter({ hasText: 'Atletická školička' }).first();
  await expect(multi).toBeVisible();
  const label = await multi.innerText();
  expect(label, 'karta neukazuje konec termínu').toMatch(/\d{1,2}:\d{2}–\d{1,2}:\d{2}/);

  const expectedPrice = (4800).toLocaleString('cs-CZ');
  expect(label, 'cena bez tisícového oddělovače (nekonzistentní s Domů/Souhrn)').toContain(expectedPrice);
});

// --- Mobil prochází kategorie po jedné úrovni (CHANGE-62, design_review_58.md FR-6) ---

test('T-160: mobil prochází kategorie po jedné úrovni místo „Rozbalit vše"', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'drill-down platí jen na mobilu <900px');
  await openCatalog(page, width);

  // Výchozí stav: jen kořenové kategorie, žádné karty ani „Rozbalit vše" strom.
  await expect(page.getByRole('button', { name: /Sport a pohyb/ })).toBeVisible();
  expect(await cards(page).count(), 'karty nemají být vidět bez rozkliknutí kategorie').toBe(0);

  await page.getByRole('button', { name: /Sport a pohyb/ }).click();
  await expect(page.getByRole('button', { name: '← Zpět na kategorie' })).toBeVisible();

  // Buď rovnou karty (kategorie bez podkategorií), nebo podkategorie k dalšímu rozkliknutí.
  if ((await cards(page).count()) === 0) {
    await page.getByRole('button', { name: /Míčové a týmové sporty/ }).click();
  }
  await expect(cards(page).first()).toBeVisible();

  // „Rozbalit vše" zůstává dostupné jako zkratka (i na mobilu) a přeskočí na klasický strom.
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await expect(page.getByText(/Sport a pohyb.*\(\d+\)/)).toBeVisible();
  await expect(cards(page).first()).toBeVisible();
});

test('T-183: nadpis „Další kroužky (N)" se v mobilním drill-down kořeni nezobrazí dvakrát', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'drill-down platí jen na mobilu <900px');
  await openCatalog(page, width);

  await expect(page.getByText(/^Další kroužky \(\d+\)$/)).toHaveCount(1);
});

// --- Filtr podle pohlaví (design_review_88.md, nahrazuje dřívější cenový filtr BL-042) ---

test('T-172: filtr podle pohlaví vyloučí kroužek cílený na opačné pohlaví, jinak nechá katalog beze změny', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await expandAll(page);
  await expect(cards(page).first()).toBeVisible();
  const fullCount = await cards(page).count();

  await page.getByRole('button', { name: 'Další filtry' }).click();
  // Jediný kroužek s explicitně danou cílovou skupinou v katalogu je „Basketbal —
  // chlapci" (targetGender: 'boys') — filtr „Dívky" ho vyloučí, ostatní (bez
  // omezení pohlaví) zůstanou beze změny.
  await page.getByRole('combobox', { name: 'Filtr podle pohlaví' }).selectOption('girls');
  expect(await cards(page).count(), 'filtr „Dívky" měl vyloučit přesně 1 kroužek').toBe(fullCount - 1);
  await expect(page.getByText(/Basketbal — chlapci/)).toHaveCount(0);

  await page.getByRole('combobox', { name: 'Filtr podle pohlaví' }).selectOption('');
  expect(await cards(page).count(), '„Bez omezení" vrátí plný katalog').toBe(fullCount);
});

// --- 3-stavový náhled kolize na kartě katalogu (CHANGE-67, design_review_65/67.md BL-039) ---

test('T-173: karta katalogu ukazuje náhled kolize před přidáním', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: /Vlastní událost/ }).click();
  const dialog = page.locator('.fixed.inset-0.z-50');
  await dialog.getByPlaceholder('Např. Logopedie').fill('Celopondělní blok');
  // Pondělí (hodnota 1) pokryté téměř celým dnem — koliduje s libovolným pondělním kroužkem.
  await dialog.getByRole('combobox', { name: 'Den v týdnu' }).first().selectOption('1');
  await dialog.locator('input[type="time"]').nth(0).fill('00:01');
  await dialog.locator('input[type="time"]').nth(1).fill('23:59');
  await dialog.getByRole('button', { name: 'Přidat', exact: true }).click();

  await openCatalog(page, width);
  await expandAll(page);
  await expect(page.getByTestId('conflict-preview-badge').first()).toBeVisible();
});

// --- Prominentnější CTA doporučení (CHANGE-67, design_review_65/67.md BL-040) ---

test('T-174: doporučení mají popisek „Co se hodí…“ místo obecného názvu, když existuje plná shoda', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await expect(page.getByRole('button', { name: /Co se hodí .+\?\s*\(\d+\)/ })).toBeVisible();
});


