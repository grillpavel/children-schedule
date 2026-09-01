import { test, expect, isCompact, openCalendarMenuIfCompact, closeCalendarMenuIfCompact } from '../helpers/profiles';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
  // Idempotentní vůči opakovanému volání ve stejném testu (T-236/T-239 zapisují
  // víc aktivit) — „Rozbalit vše" je přepínač, po prvním kliku se přejmenuje na
  // „Sbalit vše" a druhý klik by katalog znovu sbalil.
  const expandBtn = page.getByRole('button', { name: 'Rozbalit vše' });
  if (await expandBtn.isVisible().catch(() => false)) await expandBtn.click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
}

/** Zapíše N-tou kartu (0-based) — pro druhý zápis ve stejném testu, ať se
 * nekříží s (CHANGE-55) přepínacím chováním kliku na už vybranou kartu. */
async function enrollNth(page: import('@playwright/test').Page, width: number, index: number) {
  await openCatalog(page, width);
  const expandBtn = page.getByRole('button', { name: 'Rozbalit vše' });
  if (await expandBtn.isVisible().catch(() => false)) await expandBtn.click();
  await cards(page).nth(index).click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
}

async function saveAndRead(page: import('@playwright/test').Page, width: number): Promise<string> {
  // Na mobilu je Uložit v mobilním menu „Další ▾".
  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  // FR-3 (design_review_99.md): "Uložit" teď nabízí explicitní volbu rozsahu —
  // dialog defaultuje na aktivní dítě, testy chtějí celý rodinný export.
  const dialog = page.getByRole('dialog', { name: 'Uložit rozvrh' });
  await dialog.getByRole('radio', { name: 'Celá rodina' }).check();
  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  const raw = readFileSync((await download.path())!, 'utf8');
  // Export je od design_review_99.md obalený v `ExportEnvelope` — testy níže
  // porovnávají syrový `PlannerState`, ne obálku, proto se tu odbalí zpět.
  const envelope = JSON.parse(raw) as { data: unknown };
  return JSON.stringify(envelope.data, null, 2);
}

/** FR-2 (design_review_99.md): import celorodinného/staršího formátu už nikdy
 * tiše nepřepíše — potvrdí přes dialog "Přepsat". */
async function confirmFamilyImport(page: import('@playwright/test').Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Potvrdit import' });
  await dialog.getByRole('button', { name: 'Přepsat' }).click();
}

function tempFile(name: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'krouzky-e2e-'));
  const file = join(dir, name);
  writeFileSync(file, content, 'utf8');
  return file;
}

/** Přidá druhý kalendář (dítě) daného jména — nově přidaný se stane aktivním
 * (design_review_70.md). Sheet správy kalendářů se na mobilu otevře/zavře sama. */
async function addCalendar(page: import('@playwright/test').Page, width: number, name: string): Promise<void> {
  await openCalendarMenuIfCompact(page, width);
  const banner = page.getByRole('banner');
  await banner.getByRole('button', { name: 'Přidat kalendář' }).click();
  await banner.getByRole('textbox', { name: 'Název nového kalendáře' }).fill(name);
  await banner.getByRole('button', { name: 'Přidat', exact: true }).click();
  await closeCalendarMenuIfCompact(page, width);
}

/** Otevře dialog „Uložit rozvrh" a stáhne export pro AKTUÁLNĚ vybraný rozsah
 * (defaultně předvybraný — dialog se jen otevře a rovnou potvrdí). */
async function saveActiveSelection(page: import('@playwright/test').Page, width: number): Promise<unknown> {
  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Uložit rozvrh' });
  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  return JSON.parse(readFileSync((await download.path())!, 'utf8'));
}

test('T-150: Uložit i Otevřít jsou na první úrovni, export je pod menu', async ({ page }, testInfo) => {
  // Na desktopu jsou obě akce přímo v liště; na mobilu jsou (záměrně) v menu „Další ▾" (T-158).
  test.skip(isCompact(testInfo.project.use.viewport!.width), 'platí pro desktopovou lištu');
  // Obě akce jsou přímo dostupné bez otevírání menu (C6-B6).
  await expect(page.getByRole('button', { name: 'Uložit', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otevřít' })).toBeVisible();

  // Export je naopak zanořený pod „Další ▾".
  await page.getByRole('button', { name: /Další ▾/ }).click();
  const menu = page.locator('div.absolute').filter({ hasText: 'Kalendář (.ics)' });
  await expect(menu.getByText('Kalendář (.ics)')).toBeVisible();
  // Uložit ani Otevřít nesmí být uvnitř exportního menu.
  await expect(menu.getByText('Uložit', { exact: true })).toHaveCount(0);
  await expect(menu.getByText('Otevřít', { exact: true })).toHaveCount(0);
});

test('T-151: změna zapne indikátor „Neuloženo"', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await expect(page.getByText('Uloženo', { exact: true })).toBeVisible();

  await enrollFirst(page, width);
  await expect(page.getByText('Neuloženo', { exact: true })).toBeVisible();
});

test('T-152: export → import → export dá bajtově shodný JSON včetně overrides a termínu', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await openCatalog(page, width);
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();

  // Vybereme kartu, obarvíme (overrides) a teprve pak zapíšeme (vybraný termín).
  // Sheet se od design_review_96.md vždy otevírá rozbalený (CHANGE-103) — swatch
  // je hned dostupný, žádné ruční rozbalení už není potřeba.
  await cards(page).first().click();
  await page.getByRole('button', { name: /^Barva / }).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();

  const jsonA = await saveAndRead(page, width);
  expect(jsonA, 'export obsahuje přepisy').toMatch(/"overrides"\s*:\s*\[\s*{/);
  expect(jsonA, 'export obsahuje zápis s termínem').toMatch(/"enrollments"\s*:\s*\[\s*{/);

  // Vyprázdníme rozvrh přes Zpět, aby byl import pozorovatelný.
  const undoBtn = page.getByTitle(/Zpět \(/);
  while (await undoBtn.isEnabled()) await undoBtn.click();
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(0);

  // Import souboru A a čekání, až se zápis obnoví.
  const fileA = tempFile('rozvrh-a.json', jsonA);
  await page.locator('input[type="file"]').setInputFiles(fileA);
  await confirmFamilyImport(page);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);

  const jsonB = await saveAndRead(page, width);
  // Poctivě červený: overrides mají nestabilní pořadí klíčů (živě vs. po zod importu) → viz C8-E5.
  expect(jsonB, 'round-trip je bajtově shodný').toBe(jsonA);
});

test('T-153: import poškozeného JSON ukáže českou hlášku a nesmaže stav', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);

  let dialogMsg: string | null = null;
  page.on('dialog', (d) => {
    dialogMsg = d.message();
    void d.accept();
  });

  const badFile = tempFile('rozbite.json', '{ tohle není: platný JSON,,, }');
  await page.locator('input[type="file"]').setInputFiles(badFile);

  await expect.poll(() => dialogMsg).not.toBeNull();
  expect(dialogMsg).toContain('není platný JSON');

  // Stav zůstal beze změny — zapsaný kroužek je pořád v rozvrhu.
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);
});

test('T-154: soubor se starším schemaVersion se načte přes migraci', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);

  const jsonV3 = await saveAndRead(page, width);
  const parsed = JSON.parse(jsonV3) as { schemaVersion: number; overrides?: unknown };
  // Uměle vytvoříme předchozí verzi schématu bez pole přepisů.
  parsed.schemaVersion = 2;
  delete parsed.overrides;
  const fileV2 = tempFile('rozvrh-v2.json', JSON.stringify(parsed, null, 2));

  let dialogMsg: string | null = null;
  page.on('dialog', (d) => {
    dialogMsg = d.message();
    void d.accept();
  });

  await page.locator('input[type="file"]').setInputFiles(fileV2);
  await confirmFamilyImport(page);

  // Migrace proběhne bez chyby a zápis se načte.
  await expect(page.getByText('Uloženo', { exact: true })).toBeVisible();
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);
  expect(dialogMsg, 'migrace nesmí hlásit chybu').toBeNull();
});

test('T-234: import staršího/celorodinného souboru s jiným počtem dětí vždy nabídne potvrzení, nikdy tiše nepřepíše (FR-2, design_review_99.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  const jsonOneChild = await saveAndRead(page, width);

  await addCalendar(page, width, 'Anežka');
  // Přepínač kalendářů je na mobilu jen uvnitř sheetu „Správa kalendářů" (BL-057).
  const switcher = page.getByRole('banner').getByRole('combobox', { name: 'Přepnout kalendář' });
  await openCalendarMenuIfCompact(page, width);
  await expect(switcher.locator('option')).toHaveCount(2);
  await closeCalendarMenuIfCompact(page, width);

  // Zrušit — stav zůstane nedotčen (pořád 2 kalendáře).
  const fileCancel = tempFile('rozvrh-cancel.json', jsonOneChild);
  await page.locator('input[type="file"]').setInputFiles(fileCancel);
  const dialog = page.getByRole('dialog', { name: 'Potvrdit import' });
  await expect(dialog.getByText(/2\s*dětí/)).toBeVisible();
  await expect(dialog.getByText(/1\s*dětí/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Zrušit' }).click();
  await expect(dialog).toBeHidden();
  await openCalendarMenuIfCompact(page, width);
  await expect(switcher.locator('option')).toHaveCount(2);
  await closeCalendarMenuIfCompact(page, width);

  // Přepsat — stav se vymění za soubor (zpět na 1 kalendář).
  const fileConfirm = tempFile('rozvrh-confirm.json', jsonOneChild);
  await page.locator('input[type="file"]').setInputFiles(fileConfirm);
  await confirmFamilyImport(page);
  await openCalendarMenuIfCompact(page, width);
  await expect(page.getByRole('banner').getByRole('combobox', { name: 'Přepnout kalendář' })).toHaveCount(0);
  await expect(page.getByRole('banner').getByRole('textbox', { name: 'Název kalendáře' })).toHaveValue('Moje dítě');
  await closeCalendarMenuIfCompact(page, width);
});

test('T-235: exportní dialog nabízí volbu rozsahu — všechny děti i „Celá rodina", aktivní dítě je předvybrané (FR-3, design_review_99.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await addCalendar(page, width, 'Anežka');

  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Uložit rozvrh' });
  await expect(dialog.getByRole('radio', { name: 'Celá rodina' })).toBeVisible();
  await expect(dialog.getByRole('radio', { name: 'Moje dítě' })).toBeVisible();
  // Nově přidané (a tedy aktivní) dítě je předvybrané, ne „Celá rodina".
  await expect(dialog.getByRole('radio', { name: 'Anežka' })).toBeChecked();

  const pending = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  const single = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(single.exportType).toBe('single-child');
  expect(single.exportVersion).toBe(1);
  expect(single.data.child.name).toBe('Anežka');

  // Znovu, tentokrát „Celá rodina" — stažený soubor nese exportType/exportVersion na kořeni.
  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  const dialog2 = page.getByRole('dialog', { name: 'Uložit rozvrh' });
  await dialog2.getByRole('radio', { name: 'Celá rodina' }).check();
  const pending2 = page.waitForEvent('download');
  await dialog2.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download2 = await pending2;
  const familyEnvelope = JSON.parse(readFileSync((await download2.path())!, 'utf8')) as {
    exportType: string;
    exportVersion: number;
    data: { children: unknown[] };
  };
  expect(familyEnvelope.exportType).toBe('family');
  expect(familyEnvelope.exportVersion).toBe(1);
  expect(familyEnvelope.data.children).toHaveLength(2);
});

test('T-236: import „toto dítě" mergne jen dané dítě — ostatní děti v rodině zůstanou nedotčené (FR-5, design_review_99.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);

  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Uložit rozvrh' });
  await expect(saveDialog.getByRole('radio', { name: 'Moje dítě' })).toBeChecked();
  const pending = page.waitForEvent('download');
  await saveDialog.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  const jsonMojeDite = readFileSync((await download.path())!, 'utf8');

  // Zápis zase odebereme (Zpět), ať je import níže pozorovatelný.
  const undoBtn = page.getByTitle(/Zpět \(/);
  while (await undoBtn.isEnabled()) await undoBtn.click();
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(0);

  // Přidáme druhé dítě, přepneme na něj a zapíšeme mu vlastní (jinou) aktivitu.
  await addCalendar(page, width, 'Anežka');
  await enrollNth(page, width, 1);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);

  // Import zápisu „Moje dítě" zpět — cílový stav je teď (po Zpět) prázdný, liší se
  // od importovaného obsahu → appka vyžádá potvrzení (FR-8), ne tichý zápis.
  const fileMojeDite = tempFile('rozvrh-moje-dite.json', jsonMojeDite);
  await page.locator('input[type="file"]').setInputFiles(fileMojeDite);
  await page.getByRole('dialog', { name: 'Potvrdit import' }).getByRole('button', { name: 'Přepsat' }).click();

  // Import automaticky přepne aktivní dítě na importované — jeho zápis se obnovil.
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno'), 'zápis Moje dítě se obnovil z importu').toHaveCount(1);
  await openCalendarMenuIfCompact(page, width);
  await expect(page.getByRole('banner').getByRole('textbox', { name: 'Název kalendáře' })).toHaveValue('Moje dítě');

  // Přepnout na Anežku — její vlastní zápis zůstal nedotčen.
  await page.getByRole('banner').getByRole('combobox', { name: 'Přepnout kalendář' }).selectOption({ label: 'Anežka' });
  await closeCalendarMenuIfCompact(page, width);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno'), 'Anežčin zápis zůstal nedotčen').toHaveCount(1);
});

test('T-237: neznámé childId nabídne přidání nového dítěte; stejné childId s jiným jménem nabídne sloučení, ne tichý přepis (FR-5, design_review_99.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);

  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Uložit rozvrh' });
  await expect(saveDialog.getByRole('radio', { name: 'Moje dítě' })).toBeChecked();
  const pending = page.waitForEvent('download');
  await saveDialog.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  const raw = readFileSync((await download.path())!, 'utf8');

  // Neznámé childId — appka nabídne přidat jako nové dítě, ne tichý zápis/pád.
  const unknown = JSON.parse(raw);
  unknown.childId = 'fake-neznamy-id';
  unknown.data.child.id = 'fake-neznamy-id';
  unknown.data.child.name = 'Nové dítě';
  for (const e of unknown.data.enrollments as { childId: string }[]) e.childId = 'fake-neznamy-id';
  for (const e of unknown.data.customEntries as { childId: string }[]) e.childId = 'fake-neznamy-id';
  const fileUnknown = tempFile('rozvrh-nove-dite.json', JSON.stringify(unknown, null, 2));
  await page.locator('input[type="file"]').setInputFiles(fileUnknown);
  const dialog1 = page.getByRole('dialog', { name: 'Potvrdit import' });
  await expect(dialog1.getByText('Přidat „Nové dítě" jako nové dítě?')).toBeVisible();
  await dialog1.getByRole('button', { name: 'Zrušit' }).click();
  await expect(dialog1).toBeHidden();

  // Stejné childId, ale jiné jméno v cílovém stavu — simulace srážky dvou nezávisle
  // vzniklých „child-1" appek (design_review_99.md §0.2) — nabídne sloučení, ne tichý přepis.
  const mismatched = JSON.parse(raw);
  mismatched.data.child.name = 'Cizí Dítě';
  const fileMismatch = tempFile('rozvrh-jine-jmeno.json', JSON.stringify(mismatched, null, 2));
  await page.locator('input[type="file"]').setInputFiles(fileMismatch);
  const dialog2 = page.getByRole('dialog', { name: 'Potvrdit import' });
  await expect(dialog2.getByText('Importovaná data pro „Cizí Dítě" sloučit do „Moje dítě"?')).toBeVisible();
  await dialog2.getByRole('button', { name: 'Zrušit' }).click();
});

test('T-238: import „toto dítě" s osiřelým zápisem (smazaná katalogová položka) ho vynechá a appka ukáže varování (FR-7, design_review_99.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);

  if (isCompact(width)) await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Uložit', exact: true }).click();
  const saveDialog = page.getByRole('dialog', { name: 'Uložit rozvrh' });
  await expect(saveDialog.getByRole('radio', { name: 'Moje dítě' })).toBeChecked();
  const pending = page.waitForEvent('download');
  await saveDialog.getByRole('button', { name: 'Uložit', exact: true }).click();
  const download = await pending;
  const envelope = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(envelope.data.enrollments, 'export obsahuje jeden zápis').toHaveLength(1);
  // Simulace mezitím smazané katalogové položky — zápis odkazuje na neexistující aktivitu.
  envelope.data.enrollments[0].activityId = 'fake-smazana-aktivita';
  envelope.data.enrollments[0].sessionGroupId = 'fake-smazana-skupina';

  // Vyprázdníme rozvrh, ať je vynechání pozorovatelné (import se pak shoduje s prázdným
  // stavem = tichý, ale s varováním o vynechané položce).
  const undoBtn = page.getByTitle(/Zpět \(/);
  while (await undoBtn.isEnabled()) await undoBtn.click();
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(0);

  let dialogMsg: string | null = null;
  page.on('dialog', (d) => {
    dialogMsg = d.message();
    void d.accept();
  });
  const fileOrphan = tempFile('rozvrh-osiraly.json', JSON.stringify(envelope, null, 2));
  await page.locator('input[type="file"]').setInputFiles(fileOrphan);

  await expect.poll(() => dialogMsg).not.toBeNull();
  expect(dialogMsg, 'varování jmenuje vynechanou položku').toContain('vynechány');
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno'), 'osiřelý zápis se nezapsal').toHaveCount(0);
});

test('T-239: import „toto dítě" s obsahově odlišnými daty ukáže potvrzení s updatedAt obou stran jako kontextem (FR-8, design_review_99.md)', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  const jsonOneActivity = await saveActiveSelection(page, width);

  // Přidáme druhou aktivitu — živý stav teď obsahově neodpovídá dřívějšímu exportu.
  await enrollNth(page, width, 1);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(2);

  const fileOld = tempFile('rozvrh-jedna-aktivita.json', JSON.stringify(jsonOneActivity));
  await page.locator('input[type="file"]').setInputFiles(fileOld);

  const dialog = page.getByRole('dialog', { name: 'Potvrdit import' });
  await expect(dialog.getByText(/liší od dat v souboru/)).toBeVisible();
  await expect(dialog.getByText(/Soubor exportován/)).toBeVisible();
  await expect(dialog.getByText(/aktuální data upravena/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Přepsat' }).click();
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno'), 'import obnovil dřívější export (jen 1 aktivita)').toHaveCount(1);
});

test('T-158: na mobilu jsou Otevřít/Uložit v menu „Další ▾", název kalendáře je za tlačítkem „Správa kalendářů" (BL-057, design_review_88.md)', async ({ page }, testInfo) => {
  test.skip(!isCompact(testInfo.project.use.viewport!.width), 'platí jen pro mobilní lištu');
  // Než se otevře, textové pole v DOM není (BL-057 sbalilo správu kalendářů za tlačítko).
  await expect(page.getByRole('textbox', { name: 'Název kalendáře' })).toHaveCount(0);
  await openCalendarMenuIfCompact(page, testInfo.project.use.viewport!.width);
  await expect(page.getByRole('textbox', { name: 'Název kalendáře' })).toBeVisible();
  // V zavřené liště nejsou ostatní akce přímo dostupné.
  await expect(page.getByRole('button', { name: 'Uložit', exact: true })).toBeHidden();

  // Sheet je od design_review_95.md modální — zavřít, než klikneme na „Další ▾"
  // (jinak backdrop klik zablokuje).
  await closeCalendarMenuIfCompact(page, testInfo.project.use.viewport!.width);
  await page.getByRole('button', { name: /Další ▾/ }).click();
  // Mobilní menu je od design_review_71.md `fixed` (dopočtená pozice, aby nepřetékalo
  // mimo viewport), ne `absolute` jako desktopové — proto jiný lokátor než T-150.
  const menu = page.locator('div.fixed').filter({ hasText: 'Kalendář (.ics)' });
  await expect(menu.getByRole('button', { name: 'Uložit', exact: true })).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Otevřít', exact: true })).toBeVisible();
  await expect(menu.getByText('Kalendář (.ics)')).toBeVisible();
});

test('T-181: menu „Další ▾" nabízí „Soukromí a data" s vysvětlením cookies i geokódování (design_review_71.md)', async ({ page }) => {
  await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Soukromí a data' }).click();

  const dialog = page.getByRole('dialog', { name: 'Soukromí a data' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/nepoužívá žádné cookies/)).toBeVisible();
  await expect(dialog.getByText(/Nominatim/)).toBeVisible();
  await expect(dialog.getByText(/localStorage/)).toBeVisible();
  await expect(dialog.getByText(/volně dostupných serverech/)).toBeVisible();

  await dialog.getByRole('button', { name: 'Zavřít' }).click();
  await expect(dialog).toBeHidden();
});

test('T-159: autosave — zápis přežije reload stránky', async ({ page }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await enrollFirst(page, width);
  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);

  // Reload nesmí ztratit rozvrh — autosave ho obnoví z localStorage.
  await page.reload();

  await openCatalog(page, width);
  await expect(page.getByText('Přidáno')).toHaveCount(1);
});

test('T-231: „Sdílet odkaz na rozvrh" přenese rozvrh do nové relace prohlížeče (design_review_73.md FR-W3-4)', async ({ page, browser }, testInfo) => {
  const width = testInfo.project.use.viewport!.width;
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  await openCatalog(page, width);
  await page.getByRole('searchbox').fill('Výtvarné');
  await page.getByRole('button', { name: 'Rozbalit vše' }).click();
  await cards(page).first().click();
  await page.getByRole('button', { name: 'Přidat do rozvrhu' }).click();
  await openCatalog(page, width);

  await page.getByRole('button', { name: /Další ▾/ }).click();
  await page.getByRole('button', { name: 'Sdílet odkaz na rozvrh' }).click();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl, 'odkaz nese fragment #share= (nikdy neopustí prohlížeč přes server)').toContain('#share=');

  // Nová relace = jiný „prohlížeč"/osoba, žádný sdílený localStorage s prvním page.
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  page2.once('dialog', (d) => d.accept());
  await page2.goto(shareUrl);
  await openCatalog(page2, width);
  await expect(page2.getByText('Přidáno')).toHaveCount(1);
  // Fragment se po zpracování odstraní z URL, ať se znovu nenačte při refreshi/zpět.
  await expect.poll(() => page2.evaluate(() => window.location.hash)).toBe('');
  await context2.close();
});

