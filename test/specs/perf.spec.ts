import { test, expect, isCompact } from '../helpers/profiles';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function openCatalog(page: import('@playwright/test').Page, width: number) {
  if (isCompact(width)) await page.getByRole('button', { name: 'Katalog', exact: true }).click();
}

const nextFrame = (page: import('@playwright/test').Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

test('T-500: scroll katalogu nespouští nadměrné dlouhé úlohy', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();

  // CPU throttling přes CDP (Playwright sám FPS měří nespolehlivě, viz spec T-500).
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.evaluate(() => {
    (window as unknown as { __lt: number[] }).__lt = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) (window as unknown as { __lt: number[] }).__lt.push(e.duration);
    }).observe({ entryTypes: ['longtask'] });
  });

  await page.getByRole('searchbox').hover();
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 600);
    await nextFrame(page);
  }

  const longTasks = await page.evaluate(() => (window as unknown as { __lt: number[] }).__lt);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const total = longTasks.reduce((a, b) => a + b, 0);
  // Katalog má reálně 37 položek; 200položkový stres by vyžadoval syntetická data (BL-016).
  expect(total, 'souhrn dlouhých úloh při scrollu (C9-P6)').toBeLessThan(200);
});

test('T-501: odezva hledání je pod 100 ms', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();

  const dt = await page.evaluate(async () => {
    const input = document.querySelector('[data-catalog-search]') as HTMLInputElement | null;
    if (!input) return -1;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    const start = performance.now();
    setter.call(input, 'a');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    return performance.now() - start;
  });

  expect(dt, 'search input musí mít data-catalog-search').toBeGreaterThanOrEqual(0);
  // Reálný katalog (37 položek); 200položkový stres = BL-016.
  expect(dt, 'od stisku po překreslení (C7-S6)').toBeLessThan(100);
});

test('T-502: žádné sklo uvnitř scrollovaného seznamu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  // Na mobilu vyvoláme skleněný sheet výběrem karty, ať je co kontrolovat.
  if (isCompact(width)) await page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first().click();

  const offenders = await page.evaluate(() => {
    const glass = (el: Element) => getComputedStyle(el).backdropFilter !== 'none';
    const scrollers = [...document.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 4;
    });
    const bad: string[] = [];
    for (const sc of scrollers) {
      for (const el of sc.querySelectorAll('*')) if (glass(el)) bad.push(String((el as HTMLElement).className));
    }
    return bad;
  });
  expect(offenders, 'sklo nad scrollem (C9-P2)').toEqual([]);
});

test('T-503: žádné vnořené sklo ani will-change/contain na skle', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  if (isCompact(width)) await page.getByRole('button', { name: /Kč|Cena neuvedena/ }).first().click();

  const problems = await page.evaluate(() => {
    const hasGlass = (el: Element) => getComputedStyle(el).backdropFilter !== 'none';
    const glassEls = [...document.querySelectorAll('*')].filter(hasGlass);
    const bad: string[] = [];
    for (const el of glassEls) {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (hasGlass(p)) {
          bad.push('vnořené:' + String((el as HTMLElement).className));
          break;
        }
      }
      for (let c: Element | null = el; c; c = c.parentElement) {
        const s = getComputedStyle(c);
        if (s.willChange !== 'auto' || s.contain !== 'none') {
          bad.push('perf:' + String((c as HTMLElement).className));
          break;
        }
      }
    }
    return bad;
  });
  expect(problems, 'vnořené sklo / will-change / contain (C9-B5)').toEqual([]);
});

test('T-504: Lighthouse perf a a11y nad prahem (mobil)', async () => {
  // Lighthouse CI běží mimo Playwright runner (samostatný nástroj + rozpočty).
  test.fixme(true, 'T-504 vyžaduje Lighthouse CI mimo tento harness — sledováno v BL-019/BL-020');
});
