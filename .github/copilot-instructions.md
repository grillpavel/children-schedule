# Instrukce pro agenta: testovací sada Krouzky Planner

Tento soubor řídí implementaci E2E testů. Zdrojem požadavků je `test/docs/test-spec.md`, který obsahuje kompletní seznam testů s ID (T-000 až T-609) a manuální matici (M-01 až M-08).

## Kontext

Testovaná aplikace je klientská SPA bez backendu. Stav existuje jen v okně prohlížeče a přenáší se souborem. Neexistuje přihlášení ani databáze, takže testy nepotřebují seedování serveru, ale **potřebují fixture soubory** pro import stavu.

## Co implementovat

Postupuj po vrstvách z `test/docs/test-spec.md`, v tomto pořadí. Každou vrstvu dokonči a nech projít, než začneš další.

1. **L0 Smoke** → `test/specs/smoke.spec.ts` (částečně hotovo, dopiš T-001 až T-003)
2. **L2 Responzivita** → `test/specs/responsive.spec.ts` (T-200 až T-212)
3. **L1 Funkčnost** → `test/specs/catalog.spec.ts`, `test/specs/schedule.spec.ts`, `test/specs/panel.spec.ts`, `test/specs/persistence.spec.ts`
4. **L3 Přístupnost** → `test/specs/a11y.spec.ts` (T-300 až T-310)
5. **L6 Export** → `test/specs/ics.spec.ts` (T-600 až T-609)
6. **L4 Vizuální regrese** → `test/specs/visual.spec.ts` (T-400 až T-403), až úplně nakonec

L2 je před L1 záměrně. Responzivní testy jsou levné, nezávisí na chování aplikace a odhalí layoutové vady dřív, než na nich postavíš funkční testy.

## Závazná pravidla

Odpovídají zásadám Z-01 až Z-08 v test-spec.

- **Nikdy `page.waitForTimeout`.** Používej `expect(locator).toBeVisible()` a další web-first assertions, které samy čekají.
- **Lokátory podle role a viditelného textu**: `getByRole`, `getByLabel`, `getByText`. Nikdy `page.locator('.card')` ani jiný CSS selektor.
- `getByTestId` jen tam, kde role nestačí: buňky mřížky, barevné tečky, pruh stavu karty. Pokud sáhneš po testid na tlačítko, znamená to, že tlačítko nemá přístupný název. **Nahlaš to jako nález, netestuj přes testid.**
- **Název testu začíná ID požadavku**: `test('T-114: filtr vejde se mi to skryje kolize', ...)`.
- Testy jsou nezávislé. Každý začíná `page.goto('/')` nebo importem fixture.
- Fixture data jsou v `test/fixtures/` a jsou commitnutá. Nikdy netahej katalog z produkce.

## Když test neprojde

Nepřizpůsobuj test aplikaci. Testy popisují cílový stav podle Changes 6 až 9, ne současný stav aplikace. Většina z nich **musí na začátku padat**, to je záměr.

Postup při selhání:

1. Ověř, že test je napsaný správně a padá ze správného důvodu.
2. Označ ho `test.fixme()` s komentářem obsahujícím ID požadavku: `test.fixme(true, 'C7-F1 zatím neimplementováno')`.
3. Založ issue s ID požadavku v názvu.
4. **Nikdy nepoužívej `test.skip()` bez důvodu ani neměkči assertion, aby prošla.**

`test.skip()` je vyhrazeno pro podmínky profilu (test platí jen pro mobil apod.), ne pro obcházení chyb.

## Konkrétní pasti v této sadě

Tyhle čtyři testy se snadno napíšou tak, že jsou falešně zelené. Pozor na ně.

**T-301, sklo a axe.** `AxeBuilder.analyze()` vrací `violations` i `incomplete`. U průsvitných povrchů axe nedokáže určit skutečné pozadí a vrátí `incomplete` typu `color-contrast`, ne `violation`. Musíš tedy kontrolovat obojí:

```ts
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze();

expect(results.violations).toEqual([]);

const contrastUnknown = results.incomplete.filter(
  (r) => r.id === 'color-contrast'
);
expect(contrastUnknown, 'kontrast nelze určit, pravděpodobně sklo').toEqual([]);
```

**T-600 a T-601, ICS.** Knihovny pro ICS při parsování normalizují `CRLF` i folding. Chyby, kvůli kterým se v macOS Kalendáři ztrácejí adresy, přes parser **nikdy neuvidíš**. Použij `test/helpers/ics-raw.ts`, který pracuje nad syrovým textem. Ostatní ICS testy mohou přes parser.

**T-204, oříznutý text.** Oříznutý prvek je stále `visible`. Musíš porovnat `scrollWidth` s `clientWidth`, ne kontrolovat viditelnost.

**T-502 a T-503, sklo v DOM.** Nejsou to výkonnostní testy, ale statické kontroly nad vyrenderovanou stránkou:

```ts
const nested = await page.evaluate(() =>
  [...document.querySelectorAll('*')]
    .filter((el) => getComputedStyle(el).backdropFilter !== 'none')
    .filter((el) => el.parentElement?.closest('*') &&
      [...document.querySelectorAll('*')].some(
        (a) => a !== el && a.contains(el) &&
               getComputedStyle(a).backdropFilter !== 'none'))
    .map((el) => el.className)
);
expect(nested, 'vnořené sklo, viz C9-B5').toEqual([]);
```

## Spouštění

Konfigurace je v `test/playwright.config.ts`, ne v kořeni. Sada testuje **tuto
aplikaci** (`@krouzky/web`) — Playwright si dev server na `http://localhost:3000`
nastartuje sám (`webServer`), běžící server využije. Používej pnpm skripty
z kořenového `package.json`, které už mají `--config` nastavený.

```bash
pnpm install
pnpm exec playwright install --with-deps chromium

pnpm run test:e2e            # vše, šest profilů (server se spustí sám)
pnpm run test:e2e:mobile     # 390 a 360
pnpm run test:e2e:desktop    # 1440 a 1280
pnpm run test:e2e:tablet     # 834 a 1112
pnpm run test:e2e:ui         # ladění
pnpm run test:e2e:report

# jeden soubor
pnpm exec playwright test --config test/playwright.config.ts test/specs/a11y.spec.ts
```

Proti nasazenému náhledu: `BASE_URL=https://<nahled> pnpm run test:e2e`

**Cesty v konfiguraci se rozlišují relativně k `test/`, ne ke kořeni repa.**
Import helperů ze `specs/` je vždy `../helpers/...`.

## Definition of Done

Sada je hotová, když platí všech osm bodů ze sekce 13 v `test/docs/test-spec.md`. Zejména:

- Každý požadavek P0 z Changes 6 až 9 má alespoň jeden test s odkazem na ID.
- V sadě není žádné `waitForTimeout` ani CSS selektor v lokátoru.
- Každý `incomplete` z axe je vyřešen nebo písemně zdůvodněn.
- Celá sada doběhne pod deset minut.
