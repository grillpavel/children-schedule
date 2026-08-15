import { defineConfig } from '@playwright/test';

/**
 * Konfigurace žije v test/, ne v kořeni.
 * testDir, outputDir i reportér se rozlišují RELATIVNĚ K TOMUTO SOUBORU.
 * Spouští se přes: npx playwright test --config test/playwright.config.ts
 *
 * Výchozí cíl je LOKÁLNÍ aplikace `@krouzky/web` na http://localhost:3000.
 * Playwright si dev server sám nastartuje (webServer níže). Proti jinému
 * prostředí (např. náhled) stačí přepsat BASE_URL.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(BASE_URL);

/** Profil = jeden řádek matice zařízení, test-spec sekce 2. */
type Profile = {
  name: string;
  width: number;
  height: number;
  dpr: number;
  touch: boolean;
};

export const PROFILES: Profile[] = [
  { name: 'desktop',          width: 1440, height: 900,  dpr: 1, touch: false },
  { name: 'desktop-narrow',   width: 1280, height: 800,  dpr: 1, touch: false },
  { name: 'tablet-portrait',  width: 834,  height: 1112, dpr: 2, touch: true  },
  { name: 'tablet-landscape', width: 1112, height: 834,  dpr: 2, touch: true  },
  { name: 'mobile',           width: 390,  height: 844,  dpr: 3, touch: true  },
  { name: 'mobile-small',     width: 360,  height: 740,  dpr: 3, touch: true  },
];

export default defineConfig({
  testDir: './specs',
  outputDir: './.results',
  snapshotDir: './snapshots',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: './.report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: './.report', open: 'never' }]],

  timeout: 30_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    testIdAttribute: 'data-testid',
    locale: 'cs-CZ',
    timezoneId: 'Europe/Prague',
    actionTimeout: 10_000,
  },

  projects: PROFILES.map((p) => ({
    name: p.name,
    use: {
      browserName: 'chromium' as const,
      viewport: { width: p.width, height: p.height },
      deviceScaleFactor: p.dpr,
      hasTouch: p.touch,
      isMobile: p.touch,
    },
  })),

  // Testujeme tuto aplikaci: Playwright si nastartuje dev server `@krouzky/web`.
  // Lokálně využije už běžící server; v CI ho spustí čerstvě. Proti externímu
  // BASE_URL (nasazený náhled) se server nespouští.
  webServer: IS_LOCAL
    ? {
        command: 'pnpm --filter @krouzky/web dev',
        url: BASE_URL,
        cwd: '..',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
