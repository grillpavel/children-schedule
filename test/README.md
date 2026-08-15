# test/

Kompletní E2E sada. Konfigurace je zde, ne v kořeni repa.

## Struktura

```
test/
├─ playwright.config.ts   konfigurace, šest profilů z matice
├─ specs/                 samotné testy, jeden soubor na vrstvu
├─ helpers/
│  ├─ profiles.ts         pomocníci pro breakpointy, zmrazený čas
│  └─ ics-raw.ts          kontroly nad syrovým textem .ics (T-600, T-601)
├─ fixtures/              zamrazený katalog a připravené rozvrhy
├─ snapshots/             baseline pro vizuální regresi
├─ docs/test-spec.md      zadání: seznam testů T-000 až T-609
├─ docs/test-report.md    souhrn běhů, nálezy a doporučení
├─ .results/              běhové artefakty, gitignored
└─ .report/               HTML report, gitignored
```

## Vrstvy a spec soubory

| Vrstva | Soubor | Rozsah |
|---|---|---|
| L0 Smoke | `specs/smoke.spec.ts` | T-000–003 |
| L1 Funkčnost | `specs/catalog.spec.ts`, `schedule.spec.ts`, `panel.spec.ts`, `persistence.spec.ts` | T-100–154 |
| L2 Responzivita | `specs/responsive.spec.ts` | T-200–212 |
| L3 Přístupnost | `specs/a11y.spec.ts` | T-300–310 |
| L4 Vizuální regrese | `specs/visual.spec.ts` | T-400–403 |
| L5 Výkon | `specs/perf.spec.ts` | T-500–504 |
| L6 Export ICS | `specs/ics.spec.ts` | T-600–609 |

Část testů je záměrně červená — popisují cílový stav (Changes 6–9) a odhalují reálné
mezery. Přehled a mapování na backlog je v [docs/test-report.md](docs/test-report.md).

## Spuštění

Sada testuje **tuto aplikaci** (`@krouzky/web`). Playwright si dev server
nastartuje sám (`webServer` v `playwright.config.ts`) na `http://localhost:3000`;
běžící server využije, jinak spustí nový. Skripty jsou v kořenovém `package.json`.

```bash
pnpm install
pnpm exec playwright install --with-deps chromium

pnpm run test:e2e            # vše, šest profilů (server se spustí sám)
pnpm run test:e2e:desktop    # 1440 a 1280
pnpm run test:e2e:tablet     # 834 a 1112
pnpm run test:e2e:mobile     # 390 a 360
pnpm run test:e2e:ui         # ladicí režim
pnpm run test:e2e:report     # otevře poslední report
```

Proti jinému prostředí (nasazený náhled) přepiš cíl:

```bash
BASE_URL=https://<nasazeny-nahled> pnpm run test:e2e
```

## Poznámky

- Cesty v `playwright.config.ts` (`testDir`, `outputDir`, `snapshotDir`, `outputFolder`)
  se rozlišují **relativně k tomuto adresáři**, ne ke kořeni repa.
- Import helperů ze `specs/` je `../helpers/...`.
- Čas je ve všech testech zmrazen na 6. 10. 2026 15:30, aby now-line nerozbíjela
  vizuální snímky a metriky obsazenosti nezávisely na dni běhu CI.
- Všech šest profilů běží na Chromiu. `isMobile` Firefox nepodporuje, smíšená
  matice by házela chyby.

## Co v tomto adresáři být nemůže

| Soubor | Kde musí být | Proč |
|---|---|---|
| `e2e.yml` | `.github/workflows/` | GitHub jinde workflow nespustí |
| `copilot-instructions.md` | `.github/` | Copilot načítá jen z této cesty |
| `package.json` | kořen repa | jedno `node_modules`, jeden `pnpm install` |
