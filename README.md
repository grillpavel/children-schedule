# Rozvrhni

Webová aplikace, která rodiči pomůže sestavit rozvrh zájmových kroužků dítěte
a vyexportovat ho jako `.ics` do Google, Apple i Outlook kalendáře — se správným
vynecháním státních svátků a školních prázdnin, včetně adresy, místa konání,
kontaktů a odkazů v každé události. Rozvrh lze také **naimportovat zpět**
(`.json` obnoví celý stav, `.ics` přidá události jako editovatelné vlastní).

Rozvrh žije **jen v paměti prohlížeče** — žádný backend, žádná databáze, nic se
neukládá na server. To zásadně zjednodušuje hosting (viz [Nasazení](#nasazení--webhosting)).

**Jak aplikaci používat:** [Návod k použití](docs/navod-pouziti.md) (s obrázky,
i jako [PDF](docs/navod-pouziti.pdf)).

## Funkce

- **Reálný katalog** kroužků (Nové Strašecí a okolí — DDM Rakovník, SCNS, TJ Sokol),
  s místem konání, cenou, věkem, popisem, kontakty a odkazem na stránku kroužku.
- **Kalendář ve stylu iOS**: pohledy Den / 3 dny / Týden / Měsíc, navigace šipkami,
  „now" čára, rolovatelná celodenní osa, překrývající se události vedle sebe.
- **Varianty docházky** (výběr více termínů), **vlastní události** s plným detailem.
- **Úpravy v pravém sloupci**: přepis názvu, adresy (Ulice / Město / PSČ), telefonu,
  ceny a **výběr barvy** kroužku; náhled mapy (OpenStreetMap) + geokódování adresy.
- **Export**: `.ics` (RFC 5545 — `VTIMEZONE`, `RRULE`, `EXDATE` pro svátky/prázdniny,
  plná adresa, `URL`, bohatý `DESCRIPTION`, volitelná připomínka a barvy),
  `.json` (celý stav), `.png` a tisk.
- **Import**: `.json` (obnova stavu) i `.ics` (události → editovatelné vlastní).
- **Zpět/Vpřed** (undo/redo), více pojmenovaných variant rozvrhu.

## Technologie

| Vrstva | Stack |
|--------|-------|
| Monorepo | **pnpm workspaces** + **Turborepo** |
| Jádro `packages/domain` | Čistý deterministický TypeScript — model (**zod**), kalendář (**date-fns**, `@date-fns/tz`), konflikty, generování i parsování ICS. Bez Reactu/sítě/LLM, bez `Date.now()`/`Math.random()`. |
| Aplikace `apps/web` | **Next.js 14** (App Router) · **React 18** · **Zustand** (+ immer) · **Tailwind CSS** · `html-to-image` |
| Chat `packages/chat` | LLM adaptér (M1, zatím prázdný) |

Doména se konzumuje **jako zdroj** (ne jako sestavený balíček) — `apps/web`
ji transpiluje přes `transpilePackages: ['@krouzky/domain']` v
[`apps/web/next.config.mjs`](apps/web/next.config.mjs). Tamtéž je `resolve.extensionAlias`,
aby webpack rozřešil ESM importy s příponou `.js` na zdrojové `.ts`.

## Struktura

| Cesta | Obsah |
|-------|-------|
| `packages/domain` | Čisté deterministické jádro (model, kalendář, konflikty, ICS export/import). |
| `packages/domain/data` | Reálná data katalogu (`novestraseciData-2.ts`) mimo `src`, deep-import přes `@krouzky/domain/data/*`. |
| `apps/web` | Next.js aplikace (katalog, mřížka, export i import). |
| `packages/chat` | LLM adaptér (M1, zatím prázdný). |
| `.github/docs/` | Specifikace produktu 00–08. |
| `.github/specs/` | Design review na každou změnu (`CHANGE-<id>`). |

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
  TJ Sokol, web města). Neznámé hodnoty (cena, souřadnice) se **nedopočítávají** —
  drží se jako neznámé, viz [pravidla](.github/docs/copilot-instructions.md).
- Rozvrh existuje jen v okně prohlížeče; uložit ho lze pouze explicitně přes
  Export → soubor (`.json`/`.ics`).
- Náhled mapy a geokódování odesílají zadanou adresu **z prohlížeče uživatele**
  na OpenStreetMap/Nominatim (v UI je na to upozornění).

## Vývojový proces

Řídíme se procesní smlouvou v
[`.github/instructions/dev-process.instructions.md`](.github/instructions/dev-process.instructions.md):

- **Spec** → `.github/specs/design_review_<n>.md` (jeden `CHANGE-<id>` na změnu)
- **Changelog** → [`CHANGELOG.md`](CHANGELOG.md) (klíčováno `CHANGE-<id>`)
- **Backlog** → [`docs/backlog.md`](docs/backlog.md) (`BL-<NNN>`, viz [guideline](docs/backlog-guideline.md))
- **Verze** → `packages/domain/package.json` (bump jen při změně enginu)

Kvalitní brány před merge: `vitest` zelený, `tsc --noEmit` čistý v obou balíčcích,
`eslint` čistý (včetně pravidla o čistotě domény).
