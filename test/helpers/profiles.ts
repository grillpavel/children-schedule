import { test as base } from '@playwright/test';

/** Vrací true pro profily pod 900 px, kde platí Agenda a drawer (C9-L5). */
export function isCompact(width: number): boolean {
  return width < 900;
}

/** Vrací true pro profily, kde má být třísloupcový layout (C9-L1). */
export function isThreeColumn(width: number): boolean {
  return width >= 1440;
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
