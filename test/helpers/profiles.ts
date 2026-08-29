import { test as base } from '@playwright/test';

/** Vrací true pro profily pod 768 px, kde platí Agenda a drawer (C9-L5).
 * FR-W2-4/BL-051 posun z 900px na 768px — bezpečné od BL-053 (min. šířka
 * sloupce mřížky + horizontální scroll), viz design_review_84.md. */
export function isCompact(width: number): boolean {
  return width < 768;
}

/** Vrací true pro profily, kde má být třísloupcový layout (1180px, C9-L1).
 * FR-W2-4/BL-051 posun z 1440px na 1180px — bezpečné od BL-053, viz
 * design_review_84.md. */
export function isThreeColumn(width: number): boolean {
  return width >= 1180;
}

/** Zmrazí čas, aby now-line nerozbíjela vizuální snímky (Z-07). */
export const test = base.extend<{ frozenClock: void }>({
  frozenClock: [
    async ({ page }, use) => {
      await page.clock.install({ time: new Date('2026-10-06T15:30:00+02:00') });
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
