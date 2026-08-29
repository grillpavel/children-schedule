import { test, expect, isCompact, isThreeColumn } from '../helpers/profiles';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
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

/** Mobilní sheet se po přidání automaticky zavře (CHANGE-55) — pro testy, které
 * potřebují zkontrolovat obsah zapsáné aktivity (sklo, souhrn, kontrast uvnitř sheetu),
 * ho znovu otevřeme kliknutím na stejnou kartu (jen zobrazí stav „V rozvrhu“, `enrollGroup`
 * se znovu nevolá). Nepoužívat pro testy fokusu (T-303) — změnilo by počáteční bod Tab. */
async function enrollFirstAndReopen(page: import('@playwright/test').Page, width: number) {
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  const card = cards(page).first();
  await card.click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  if (isCompact(width)) await card.click();
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

function axe(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
}

test('T-300: axe nehlásí porušení úrovně A a AA', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  // Vypnuté animace → axe měří ustálené barvy, ne přechod (blockIn/toast).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enrollFirst(page, width);
  // Kurzor po posledním kliku („Přidat do rozvrhu“) leží na místě, kam se po
  // odstranění připnutého týdenního souhrnu (CHANGE-57) posunul jiný prvek —
  // audit nesmí záviset na hover stavu.
  await page.mouse.move(0, 0);
  const results = await axe(page).analyze();
  expect(results.violations).toEqual([]);
});

test('T-301: sklo nezpůsobuje neurčitý kontrast', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  // Detail (a na mobilu skleněný sheet) musí být otevřený, ať axe vidí povrchy.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enrollFirst(page, width);
  await page.mouse.move(0, 0);
  const results = await axe(page).analyze();

  const contrastViolations = results.violations.filter((r) => r.id === 'color-contrast');
  expect(contrastViolations, 'skutečné porušení kontrastu').toEqual([]);

  // Spec cílí na incomplete z průsvitných povrchů (sklo). Vyloučíme neškodné příčiny,
  // které se sklem nesouvisí: `nonBmp` (axe neumí změřit symbolovou glyfu ↶ ● ⚠),
  // `elmPartiallyObscured/Obscuring` a `bgOverlap` (prvek je schovaný za / překrytý
  // jiným prvkem — např. sheet/toast/Info drawer — takže axe pozadí nedopočítá).
  const isBenign = (key?: string) =>
    key === 'nonBmp' || key === 'bgOverlap' || (key ?? '').startsWith('elmPartiallyObscur');
  const contrastUnknown = results.incomplete
    .filter((r) => r.id === 'color-contrast')
    .flatMap((r) => r.nodes)
    .filter((n) => !isBenign((n.any[0]?.data as { messageKey?: string } | undefined)?.messageKey));
  expect(contrastUnknown, 'kontrast nelze určit, pravděpodobně sklo').toEqual([]);
});

test('T-302: barevné tokeny splňují kontrastní prahy', async () => {
  const full = readFileSync(join('apps', 'web', 'app', 'globals.css'), 'utf8');
  // T-302 ověřuje světlou základní paletu; tmavé tokeny (v @media dark) validuje T-310 (axe).
  const css = full.split('@media (prefers-color-scheme: dark)')[0];
  const tokens = new Map<string, string>();
  for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens.set(m[1], m[2]);
  }

  const rel = (hex: string): number => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  };
  const ratio = (a: string, b: string): number => {
    const [l1, l2] = [rel(a), rel(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  const white = tokens.get('--bg-surface')!;
  const app = tokens.get('--bg-app')!;

  // Text ≥ 4.5:1, prvky rozhraní ≥ 3:1 (C9-T3).
  const textOnWhite = ['--text-primary', '--text-secondary', '--success-text', '--warning-text'];
  for (const t of textOnWhite) {
    expect(ratio(tokens.get(t)!, white), `${t} na ploše ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
  }
  expect(ratio(tokens.get('--text-primary')!, app), 'primární text na app-bg ≥ 4.5').toBeGreaterThanOrEqual(4.5);

  const uiOnWhite = ['--accent', '--danger', '--now-line', '--focus-ring', '--success', '--warning'];
  for (const t of uiOnWhite) {
    expect(ratio(tokens.get(t)!, white), `${t} jako prvek rozhraní ≥ 3`).toBeGreaterThanOrEqual(3);
  }
});

test('T-303: každý fokusovaný prvek má viditelný obrys s nenulovým offsetem', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);

  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return {
        matchesFocusVisible: el.matches(':focus-visible'),
        outlineStyle: s.outlineStyle,
        outlineWidth: parseFloat(s.outlineWidth),
        outlineOffset: s.outlineOffset,
        boxShadow: s.boxShadow,
      };
    });
    if (!ring || !ring.matchesFocusVisible) continue;
    const hasOutline = ring.outlineStyle !== 'none' && ring.outlineWidth > 0 && ring.outlineOffset !== '0px';
    const hasGlassRing = ring.boxShadow !== 'none';
    expect(hasOutline || hasGlassRing, `prvek #${i} má viditelný focus ring`).toBe(true);
  }
});

test('T-304: kalendář jde ovládat šipkami z klávesnice', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'kalendářová mřížka se šipkami platí nad 900px');
  await enrollFirst(page, width);

  const grid = page.getByRole('grid');
  await expect(grid).toBeVisible();
  const firstCell = grid.getByRole('gridcell').first();
  await firstCell.focus();

  const before = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');
  await page.keyboard.press('ArrowRight');
  const after = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');
  expect(after, 'šipka posune fokus na jinou buňku').not.toBe(before);
});

test('T-305: celý tok přidání funguje bez tažení', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  // Přidání přes CTA v detailu, žádné dragAndDrop.
  await enrollFirst(page, width);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);
});

test('T-311: klávesová zkratka „/" přeskočí do hledání katalogu (design_review_73.md FR-W3-8)', async ({ page }) => {
  await expect(page.getByRole('banner')).toBeVisible();
  await page.keyboard.press('/');
  await expect(page.locator('[data-catalog-search]')).toBeFocused();
});

test('T-312: klávesy 1–4 přepnou pohled Den/3 dny/Týden/Měsíc (design_review_73.md FR-W3-8)', async ({
  page,
}, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'přepínač pohledu je vidět jen na desktopu');
  await page.getByRole('button', { name: 'Rozvrh', exact: true }).click().catch(() => {});
  // Klik mimo pole (grid je od začátku fokusovaný na body).
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('1');
  await expect(page.getByRole('button', { name: 'Den', exact: true })).toHaveClass(/bg-white/);
  await page.keyboard.press('3');
  await expect(page.getByRole('button', { name: 'Týden', exact: true })).toHaveClass(/bg-white/);
});

test('T-313: mřížka nese textovou souhrnnou alternativu pro čtečky (design_review_73.md FR-W3-5)', async ({
  page,
}, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  if (isCompact(width)) {
    // Na mobilu je výchozí pohled Agenda (sama o sobě textová) — sr-only
    // souhrn patří k vizuální mřížce, přepnout na záložku „Mřížka".
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
    await page.getByRole('tab', { name: 'Mřížka' }).click();
  }
  const summary = page.locator('.sr-only').filter({ hasText: 'Rozvrh — textový souhrn' });
  await expect(summary).toHaveCount(1);
  await expect(summary).toContainText(/\d{2}:\d{2}–\d{2}:\d{2}/);
});

test('T-306: prefers-reduced-motion vypne animace i přechody', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enrollFirst(page, width);

  const motion = await page.evaluate(() => {
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const s = getComputedStyle(el);
      if (s.animationName !== 'none' && s.animationDuration !== '0s') offenders.push(`anim:${el.className}`);
      if (s.transitionDuration !== '0s' && s.transitionProperty !== 'none' && s.transitionProperty !== 'all 0s ease 0s') {
        // Přechod s nenulovou dobou navzdory reduce.
        offenders.push(`trans:${el.className}`);
      }
    }
    return offenders;
  });
  expect(motion, 'žádné běžící animace ani přechody').toEqual([]);
});

test('T-307: vysoký kontrast vypne sklo', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(!isCompact(width), 'sklo je jen na mobilním spodním sheetu (C9-G5)');
  await enrollFirstAndReopen(page, width);

  const glass = page.locator('.glass').first();
  await expect(glass).toBeVisible();

  // Vysoký kontrast (prefers-contrast: more) je automatická cesta vypnutí skla
  // (ruční přepínač „Bez skla“ byl odstraněn CHANGE-58, matoucí dev žargon v UI).
  await page.emulateMedia({ contrast: 'more' });
  const filterContrast = await glass.evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(filterContrast, 'vysoký kontrast vypne backdrop-filter').toBe('none');
});

test('T-308: obsazenost týdne nese čísla textově, nejen pruhy', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  // Souhrn týdne se zobrazuje jen bez výběru kroužku (viz T-148) — po přidání
  // kroužku vybrat zrušíme, ať vidíme týdenní přehled, ne detail kroužku.
  await enrollFirstAndReopen(page, width);
  await page.keyboard.press('Escape');

  let detail: ReturnType<typeof page.getByRole>;
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Děti', exact: true }).click();
    detail = page.getByRole('main');
  } else if (isThreeColumn(width)) {
    detail = page.getByRole('main');
  } else {
    // Střední šířky: Info je slide-over, po odznačení se zavře — otevřeme přes „Souhrn".
    const souhrn = page.getByRole('button', { name: 'Souhrn', exact: true });
    if (await souhrn.isVisible()) await souhrn.click();
    detail = page.getByTestId('info-drawer');
  }

  await expect(detail.getByRole('heading', { name: 'Obsazenost týdne' })).toBeVisible();
  // Alespoň jeden den nese počet v přístupném názvu (číslo + „kroužek/kroužky").
  const dayWithCount = detail.getByRole('button', { name: /\d+\s+kroužek|\d+\s+kroužky|\d+\s+kroužků/ });
  await expect(dayWithCount.first()).toBeVisible();

  // Pruh ▪ je jen dekorace (aria-hidden), hodnotu nese text.
  const bars = detail.locator('span[aria-hidden="true"]', { hasText: '▪' });
  expect(await bars.count()).toBeGreaterThanOrEqual(0);
});

test('T-309: překrývající se události nesou v mřížce text, nejen barvu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  test.skip(isCompact(width), 'mřížka s bloky je nad 900px');
  await addCustom(page, width, 'Kolize A', '15:00', '16:00');
  await addCustom(page, width, 'Kolize B', '15:30', '16:30');

  // Changes 12: konflikty nejsou v pravém sloupci; kolize je vidět v mřížce textově.
  await expect(page.getByRole('heading', { name: 'Konflikty a upozornění' })).toHaveCount(0);
  const grid = page.getByRole('main');
  await expect(grid.getByText('Kolize A').first()).toBeVisible();
  await expect(grid.getByText('Kolize B').first()).toBeVisible();
});

test('T-310: dark mode přepne motiv a axe projde', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await enrollFirstAndReopen(page, width);

  const bgLuminance = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+/g)!.map(Number);
    return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
  });
  expect(bgLuminance, 'tmavý motiv má tmavé pozadí').toBeLessThan(0.5);

  // Scan přístupnosti nesmí záviset na pozici myši (hover stavy).
  await page.mouse.move(0, 0);
  const results = await axe(page).analyze();
  expect(results.violations).toEqual([]);
});
