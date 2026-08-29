import { test as base } from '@playwright/test';

/** Vrací true pro profily pod 900 px, kde platí Agenda a drawer (C9-L5).
 * FR-W2-4/BL-051 zvažovalo posun na 768px, ale změřeno: na tablet-portrait
 * (834px) s otevřeným detailem klesne sloupec dne na ~24px — viz
 * design_review_77.md §0.3. */
export function isCompact(width: number): boolean {
  return width < 900;
}

/** Vrací true pro profily, kde má být třísloupcový layout (1440px, C9-L1).
 * FR-W2-4/BL-051 zvažovalo posun na 1180px, ale změřeno: sloupec dne by klesl
 * pod 105px minimum čitelnosti (T-200) — viz design_review_77.md §0.3. */
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
