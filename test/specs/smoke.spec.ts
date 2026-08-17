import { test, expect, isCompact } from '../helpers/profiles';
import { EXPECTED_CATALOG_COUNT } from '../fixtures/catalog';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('T-000: načtení bez chyb v konzoli', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.reload();
  await expect(page.getByRole('main')).toBeVisible();
  expect(errors, errors.join('\n')).toHaveLength(0);
});

test('T-001: katalog obsahuje očekávaný počet položek', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  // Na kompaktních profilech je katalog na vlastní záložce.
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Katalog', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  // Karty kroužků nesou v přístupném názvu cenu; ostatní tlačítka katalogu ne.
  await expect(page.getByRole('button', { name: /Kč|Cena neuvedena/ })).toHaveCount(
    EXPECTED_CATALOG_COUNT,
  );
});

test('T-002: kalendář se vykreslí', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  if (isCompact(width)) {
    await page.getByRole('button', { name: 'Rozvrh', exact: true }).click();
  }
  await expect(
    page.getByRole('button', { name: 'Přidat první kroužek' }),
  ).toBeVisible();
});

test('T-003: aplikace není zaseknutá v načítání', async ({ page }) => {
  await expect(page.getByRole('button').first()).toBeVisible({ timeout: 5000 });
});
