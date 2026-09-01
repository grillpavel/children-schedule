# Rozvrhni

Webová aplikace, která rodiči pomůže sestavit rozvrh zájmových kroužků pro
**jedno i více dětí** a vyexportovat ho jako `.ics` do Google, Apple i Outlook
kalendáře — se správným vynecháním státních svátků a školních prázdnin,
včetně adresy, místa konání, kontaktů a odkazů v každé události. Rozvrh lze
také **naimportovat zpět** (`.json` obnoví celý stav, `.ics` přidá události
jako editovatelné vlastní), **sdílet odkazem** bez jakéhokoliv serveru nebo
**vytisknout**/uložit jako obrázek.

Rozvrh žije **jen v paměti prohlížeče** — žádný backend, žádná databáze, nic se
neukládá na server. To zásadně zjednodušuje hosting (viz [Nasazení](#nasazení--webhosting)).

**Vyzkoušet aplikaci:** [children-schedule-web.vercel.app](https://children-schedule-web.vercel.app)
**Jak aplikaci používat:** [Návod k použití](docs/navod-pouziti.md) (s obrázky,
i jako [PDF](docs/navod-pouziti.pdf)).
**Jak se ukládají data:** [docs/ukladani-dat.md](docs/ukladani-dat.md) (přesná
struktura stavu, chování pro 1/2/N dětí, migrace schémat).
**Technický přehled dat:** [docs/architektura-dat.md](docs/architektura-dat.md)
(kompletní tvar dat + jak přesně propagují appkou od kliknutí po uložení).

## Funkce

### Katalog a doporučení
- **Reálný katalog** ~76 kroužků (Nové Strašecí a okolí — DDM Rakovník, SCNS,
  TJ Sokol, ZŠ M. Komenského, ZUŠ), s místem konání, cenou, věkovým rozsahem,
  popisem, kontakty a odkazem na stránku kroužku. Neznámé hodnoty se nikdy
  nedopočítávají — zůstávají jako neznámé/„Termín upřesní rodič" u
  předpřipravených položek (ZŠ/ZUŠ) bez veřejně dostupného rozvrhu.
- **Filtrování**: kategorie, den v týdnu (víc dní najednou), čas, pořadatel,
  cenové rozpětí (vč. „i bez uvedené ceny"), pohlaví cílové skupiny, přepínač
  **„Bez konfliktu"** (schová vše kolidující s tím, co dítě už má).
- **Mobilní drill-down** kategoriemi po jedné úrovni (místo „Rozbalit vše").
- **Doporučení „Co se hodí [dítě]?"**: personalizace podle zájmů, dostupných
  časů, rozpočtu a věku dítěte — s vysvětlením důvodu („Odpovídá zájmu",
  „V rozpočtu", „Termín ve volném čase").
- **Náhled kolize přímo na kartě katalogu** ještě před přidáním (🔴 kolize /
  🟡 těsná návaznost).

### Rozvrh a kalendář
- **Kalendář ve stylu iOS**: pohledy Den / 3 dny / Týden / Měsíc (desktop),
  Agenda (mobil), navigace šipkami, „now" čára, rolovatelná celodenní osa
  (výchozí okno 07–21 h), překrývající se události vedle sebe.
- **Varianty docházky** (výběr více termínů jedné aktivity), **vlastní
  události** (Kroužek/Škola/Lékař/Jiné) s vlastní barvou, adresou, cenou,
  lektorem a poznámkou; drag & drop pro přesun vlastní události v mřížce.
- **Detekce kolizí**: tvrdá (časový překryv), měkká „těsná návaznost" (odhad
  doby přesunu podle vzdálenosti míst nebo per-dítě nastaveného bufferu/módu
  dopravy), rodinná (dvě děti ve stejný čas na různých místech).
- **Potlačení výskytů** o státních svátcích a školních prázdninách (podle
  okresu — Rakovník 2026/2027 ověřeno) — vypnutelné per aktivitu.
- **Editace termínu přímo v appce** (den/čas), i jen pro jedno dítě u sdílené
  katalogové položky (např. výuka ve škole má každé dítě jindy).
- **Více pojmenovaných variant rozvrhu** (např. „co kdyby") + **Zpět/Vpřed**
  (undo/redo) napříč celou historií úprav.

### Více dětí
- Libovolný počet **kalendářů** (dětí) v jednom stavu — přidání/přejmenování/
  přepnutí/odebrání (s cascade úklidem zápisů ve všech variantách).
- Nezávislé nastavení na dítě: věk (nikdy nedohadovaný), zájmy, dostupnost,
  měsíční rozpočet, buffer/mód dopravy mezi kroužky.
- **„Zobrazit i sourozence"** — barevný přehled rozvrhu sourozenců v mřížce
  aktivního dítěte, vlastní barva na dítě jako oddělené kalendáře v iOS/Android.
- Export `.ics` je vždy **per dítě** — jedním klikem lze stáhnout i všechny
  kalendáře najednou (samostatný soubor na dítě).

### Úpravy a personalizace
- **Úpravy v pravém panelu**: přepis názvu, adresy (Ulice / Město / PSČ),
  telefonu, ceny a **výběr barvy** kroužku; upozornění při změně zdrojových
  dat katalogu oproti uloženému přepisu. Náhled mapy (OpenStreetMap +
  geokódování adresy) a odkaz do Apple Maps/Google Maps/Mapy.cz.

### Export, import, sdílení
- **Export**: `.ics` (RFC 5545 — `VTIMEZONE`, `RRULE` s `WKST=MO`, `EXDATE`
  pro svátky/prázdniny, `SEQUENCE`, `X-APPLE-STRUCTURED-LOCATION`, plná
  adresa, `URL`, bohatý `DESCRIPTION`, volitelná připomínka a barvy) — na iOS
  Safari přes spolehlivou `blob:` URL navigaci (viz `design_review_98.md`),
  `.json` (celý stav), `.png` a tisk (s volbou hodinového rozsahu, i jen
  „agenda" bez mřížky). `.json`/`.png`/`.ics` obalují try/catch se
  srozumitelnou hláškou při selhání.
- **Import**: `.json` (obnova stavu, s migrací starších verzí) i `.ics`
  (události → editovatelné vlastní).
- **Sdílený odkaz** (`#share=...`, gzip + base64url ve fragmentu URL) — appka
  nemá backend, odkaz se nikdy neposílá na server.
- **Autosave** do `localStorage` po každé změně, s viditelným stavem
  „Uloženo"/„Ukládání selhalo" (soukromý režim, plné úložiště…).

### Přístupnost a vzhled
- Kontrolováno **axe-core** (WCAG 2.0/2.1 A/AA): kontrast tokenů, `role="grid"`
  s roving `tabIndex`/šipkami, viditelný focus ring, `prefers-reduced-motion`.
- **Dark mode** (`prefers-color-scheme`), **Liquid Glass** vzhled mobilního
  detailu se 4 cestami vypnutí (`@supports`, vysoký kontrast, redukovaná
  průhlednost, ruční přepínač), bez vnořeného skla.
- **Responzivní layout**: mobil (plný modál detailu, spodní navigace),
  tablet (trvalý master-detail), desktop (3sloupcový), dotykové cíle ≥44 px.
- **„Soukromí a data"** dialog — žádné cookies, žádný server, jen `localStorage`
  a explicitní export; jasně popsaná výjimka (geokódování adresy přes Nominatim).

## Technologie

| Vrstva | Stack |
|--------|-------|
| Monorepo | **pnpm workspaces** + **Turborepo** |
| Jádro `packages/domain` | Čistý deterministický TypeScript — model (**zod**), kalendář (**date-fns**, `@date-fns/tz`), konflikty, doporučování, ICS generování i parsování. Bez Reactu/sítě/LLM, bez `Date.now()`/`Math.random()`. |
| Aplikace `apps/web` | **Next.js 14** (App Router) · **React 18** · **Zustand** (+ immer, undo/redo historie) · **Tailwind CSS 3** · `html-to-image` |
| Chat `packages/chat` | LLM adaptér (milník M1, zatím záměrně prázdný — app musí fungovat i bez něj) |
| Testy | **Vitest** (doména), **Playwright** + **@axe-core/playwright** (E2E, 6 profilů zařízení, vizuální regrese) |

Doména se konzumuje **jako zdroj** (ne jako sestavený balíček) — `apps/web`
ji transpiluje přes `transpilePackages: ['@krouzky/domain']` v
[`apps/web/next.config.mjs`](apps/web/next.config.mjs). Tamtéž je `resolve.extensionAlias`,
aby webpack rozřešil ESM importy s příponou `.js` na zdrojové `.ts`.

## Struktura

| Cesta | Obsah |
|-------|-------|
| `packages/domain/src` | Čisté deterministické jádro: `model/` (schéma, typy, override logika), `calendar/` (svátky, prázdniny, opakování), `conflicts/` (detekce H1–H10, návrhy řešení), `matching/` (doporučovací engine), `summary/` (souhrn týdne/nákladů), `ics/` (generování i parsování), `state/` (parse/serialize/migrace), `travel/` (odhad doby přesunu). |
| `packages/domain/data` | Reálná data katalogu (`novestraseciData-2.ts`) mimo `src`, deep-import přes `@krouzky/domain/data/*`. |
| `packages/domain/test` | Vitest — jednotkové testy jádra, jeden soubor na modul. |
| `apps/web/src/store` | `plannerStore.ts` — Zustand store: `PlannerState` (persistovaný) + ephemerální UI stav (výběr, historie, toasty). |
| `apps/web/src/components` | UI komponenty (katalog, mřížka, toolbar, dialogy, panely). |
| `apps/web/src/lib` | Klientské adaptéry: export/import, autosave, sdílený odkaz, geokódování, reálná katalogová data pro appku. |
| `apps/web/src/hooks` | Odvozený pohled na rozvrh (`useScheduleView`), breakpointy, Escape-to-close. |
| `packages/chat` | LLM adaptér (M1, zatím prázdný). |
| `test/` | Kompletní E2E sada (Playwright) — viz [test/README.md](test/README.md). |
| `docs/` | Návod k použití, analýza ukládání dat, technický přehled dat (architektura-dat.md), backlog a jeho konvence. |
| `.github/docs/` | Specifikace produktu 00–08. |
| `.github/specs/` | Design review na každou změnu (`CHANGE-<id>`). |
| `.github/instructions/` | Procesní smlouva (spec → build → test → changelog → ship). |
| `CHANGELOG.md` | Shipnutá historie, klíčovaná `CHANGE-<id>`. |

## Data a jejich správa

Aplikace nemá backend — celý rozvrh (všechny děti, všechny varianty) je
**jeden JSON dokument** (`PlannerState`, viz `packages/domain/src/model/schema.ts`),
který žije jen v paměti prohlížeče. Ukládá se/přenáší se třemi nezávislými
cestami, vždy stejná struktura:

| Cesta | Mechanismus | Kdy |
|---|---|---|
| Autosave | `localStorage` klíč `krouzky:autosave:v1` | automaticky po každé změně |
| Soubor | `.json` stažení/nahrání | tlačítka „Uložit"/„Otevřít" |
| Odkaz | URL fragment `#share=...` (gzip+base64url) | „Sdílet odkaz na rozvrh" |

Klíčové body (podrobně v [docs/ukladani-dat.md](docs/ukladani-dat.md) a
[docs/architektura-dat.md](docs/architektura-dat.md)):

- **Více dětí ≠ více souborů.** `children: Child[]` je pole nezávislých
  kalendářů v jednom stavu; **varianta rozvrhu** (`NamedSchedule`) je sdílený
  kontejner pro všechny děti současně — každý zápis (`Enrollment`/`CustomEntry`)
  nese vlastní `childId`. Export `.ics` je jediné místo, kde se data reálně
  dělí na samostatné soubory podle dítěte.
- Uživatelské přepisy (`ActivityOverride`) jsou vždy **globální** (klíč jen
  `activityId`); přepisy termínu (`SessionOverride`) mohou být globální nebo
  **per dítě** (`childId?`) — nutné pro sdílené katalogové položky, kde má
  každé dítě ve skutečnosti jiný reálný rozvrh.
- `schemaVersion` (aktuálně **9**) se řetězově migruje ve `state/io.ts` —
  starší uložený soubor/localStorage záznam se před validací automaticky
  převede na aktuální tvar, žádná ruční akce uživatele není potřeba.
- Výběr „aktivního dítěte" v UI **není** součástí uloženého stavu — po
  obnovení/otevření souboru se vždy vybere první dítě v poli.

## Požadavky

- **Node.js ≥ 20** (viz `engines` v [`package.json`](package.json)).
- **pnpm 9.12** — přišpendleno přes `packageManager`; s `corepack enable` se
  aktivuje sama.

## Lokální vývoj

```bash
corepack enable                  # zajistí pnpm 9.12 dle packageManager
pnpm install                     # instalace celého monorepa
pnpm -C apps/web dev             # dev server na http://localhost:3000

# Kontroly kvality (běží i přes Turborepo z rootu: pnpm test / typecheck / lint)
pnpm -C packages/domain test     # unit testy jádra (vitest)
pnpm -C packages/domain typecheck
pnpm -C apps/web typecheck
pnpm -C packages/domain lint     # eslint (vč. pravidla o čistotě domény)
```

## Build

```bash
pnpm install --frozen-lockfile
pnpm -C apps/web build           # next build → apps/web/.next
pnpm -C apps/web start           # produkční server (Next), naslouchá na $PORT (výchozí 3000)
```

Turborepo zvládne i build z rootu: `pnpm build` (spustí `turbo run build`).

## Testování

Dvě nezávislé sady, obě musí být zelené před shipnutím (viz
[Vývojový proces](#vývojový-proces)):

- **`packages/domain` — Vitest.** Čisté jednotkové testy jádra (kalendář,
  konflikty, ICS, ceny, doporučování…), žádné UI, žádná síť.
- **`test/` — Playwright E2E.** Testuje reálně vyrenderovanou appku na
  **6 profilech zařízení** (desktop, desktop-narrow, tablet-portrait/landscape,
  mobile, mobile-small) napříč vrstvami L0 (smoke) → L1 (funkčnost) → L2
  (responzivita) → L3 (přístupnost, `@axe-core/playwright`) → L4 (vizuální
  regrese) → L5 (výkon) → L6 (export ICS). Podrobně [test/README.md](test/README.md)
  a [test/docs/test-spec.md](test/docs/test-spec.md).

```bash
pnpm exec playwright install --with-deps chromium

pnpm run test:e2e            # vše, šest profilů (dev server se spustí sám)
pnpm run test:e2e:desktop    # jen desktop + desktop-narrow
pnpm run test:e2e:tablet     # jen tablet-portrait + tablet-landscape
pnpm run test:e2e:mobile     # jen mobile + mobile-small
pnpm run test:e2e:ui         # ladicí režim
pnpm run test:e2e:report     # otevře poslední HTML report
```

## Nasazení / Webhosting

### Co je pro hosting důležité

- **Čistě klientská SPA** — žádný vlastní backend, žádná databáze, **žádné
  proměnné prostředí ani tajemství** (žádné API klíče).
- Aplikace za běhu volá **třetí strany z prohlížeče uživatele**: OpenStreetMap
  (náhled mapy), Nominatim (geokódování adresy) a odkazy na Mapy.cz. Server nic
  neproxuje.
- Aktuální milník **M0 nemá žádné serverové routy** — lze proto hostovat i jako
  čistě statické soubory. (Plánovaný M1 chat proxy `app/api/chat` by pak
  vyžadoval Node runtime — viz varianta A/B.)

### Varianta A — Node runtime (výchozí chování Next.js)

Sestaví se přes `next build`, poběží přes `next start` (potřebuje **Node 20+**).
Vhodné pro Azure App Service (Linux, Node), Render, Railway, Fly.io nebo vlastní VPS.

| Krok | Příkaz |
|------|--------|
| Instalace | `pnpm install --frozen-lockfile` |
| Build | `pnpm -C apps/web build` |
| Start | `pnpm -C apps/web start` (respektuje `PORT`) |
| Port | `PORT` z prostředí, jinak `3000` |

Pozn. pro **Azure App Service (Linux/Node 20)**: build přes GitHub Actions nebo Oryx
s `corepack`, jako startup command použijte `pnpm -C apps/web start`.

### Varianta B — Vercel / Netlify (nativní Next.js)

Zero-config pro Next; jen nastavte monorepo:

- **Root Directory**: kořen repozitáře (kvůli pnpm workspace).
- **Install Command**: `pnpm install`
- **Build Command**: `pnpm -C apps/web build` (nebo `turbo run build --filter=@krouzky/web`)
- **Output Directory**: `apps/web/.next` (Vercel detekuje automaticky)
- Node verze: 20 (přišpendlí se dle `engines`/`packageManager`).
- Netlify: přidejte `@netlify/plugin-nextjs`.

### Varianta C — Statický export (CDN / GitHub Pages / Azure Static Web Apps / S3+CloudFront)

Protože M0 nemá serverové funkce, lze aplikaci vyexportovat jako statické HTML/JS/CSS.
Doplňte do [`apps/web/next.config.mjs`](apps/web/next.config.mjs):

```js
const nextConfig = {
  output: 'export',
  // trailingSlash: true,               // doporučeno pro statické hosty
  // images: { unoptimized: true },     // jen pokud přidáte next/image
  transpilePackages: ['@krouzky/domain'],
  // ...zbytek konfigurace
};
```

Pak:

```bash
pnpm -C apps/web build     # vytvoří statický výstup do apps/web/out
```

Obsah `apps/web/out/` nahrajte na libovolný statický hosting (Nginx, GitHub Pages,
Azure Static Web Apps, Cloudflare Pages, S3 + CloudFront). Žádný Node runtime není
potřeba. **Upozornění:** jakmile přibude M1 chat proxy (serverová routa), statický
export přestane stačit — přejděte na variantu A/B.

### Monorepo — souhrn nastavení

| Nastavení | Hodnota |
|-----------|---------|
| Package manager | pnpm 9.12 (`corepack enable`) |
| Node | ≥ 20 |
| Install | `pnpm install --frozen-lockfile` |
| Build (app) | `pnpm -C apps/web build` |
| Runtime (var. A/B) | `pnpm -C apps/web start` |
| Statický výstup (var. C) | `apps/web/out` (po `output: 'export'`) |
| Env proměnné | žádné |

## Konfigurace a proměnné prostředí

Aplikace **nevyžaduje žádné proměnné prostředí ani tajemství**. Jediná „konfigurace"
je v [`apps/web/next.config.mjs`](apps/web/next.config.mjs) (`transpilePackages`,
`resolve.extensionAlias`, volitelně `output: 'export'`).

## Data a soukromí

- Katalog kroužků je reálný a **ověřený z oficiálních zdrojů** (DDM Rakovník, SCNS,
  TJ Sokol, ZŠ M. Komenského, ZUŠ, web města). Neznámé hodnoty (cena, souřadnice,
  termín) se **nedopočítávají** — drží se jako neznámé, viz [pravidla](.github/docs/copilot-instructions.md).
- Rozvrh existuje jen v okně prohlížeče (autosave do `localStorage`); explicitně
  ho lze uložit/přenést přes Export → soubor (`.json`/`.ics`) nebo sdílený odkaz
  — přesnou strukturu a chování pro víc dětí popisuje
  [Data a jejich správa](#data-a-jejich-správa) výše.
- Žádné cookies, žádná analytika, žádný účet. Náhled mapy a geokódování adresy
  odesílají zadanou adresu **z prohlížeče uživatele** na OpenStreetMap/Nominatim
  (jediná výjimka z „nic neopouští prohlížeč", v UI je na to upozornění i
  samostatný dialog „Soukromí a data").

## Vývojový proces

Řídíme se procesní smlouvou v
[`.github/instructions/dev-process.instructions.md`](.github/instructions/dev-process.instructions.md):

- **Spec** → `.github/specs/design_review_<n>.md` (jeden `CHANGE-<id>` na změnu)
- **Changelog** → [`CHANGELOG.md`](CHANGELOG.md) (klíčováno `CHANGE-<id>`)
- **Backlog** → [`docs/backlog.md`](docs/backlog.md) (`BL-<NNN>`, viz [guideline](docs/backlog-guideline.md))
- **Verze** → `packages/domain/package.json` (bump jen při změně enginu)

Kvalitní brány před merge: `vitest` zelený, `tsc --noEmit` čistý v obou balíčcích,
`eslint` čistý (včetně pravidla o čistotě domény).
