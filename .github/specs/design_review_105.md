# Design Review 105 — Vlastní událost neměla obsahovou paritu s katalogovou aktivitou

**Status:** IMPLEMENTED (2026-09-02) — patch aplikován, ověřeno lokálně
včetně plné E2E sady (viz §4)
**Change ID:** CHANGE-112 (`packages/domain` + `apps/web`)
**Date:** 2026-09-02
**Repo:** `packages/domain/src/model/schema.ts`,
`apps/web/src/components/{CustomEntryDialog,DetailsPanel}.tsx`,
`apps/web/src/lib/categoryLabels.ts` (nový)
**Trigger:** uživatel po CHANGE-110/111 (sjednocení obálky popup oken) nahlásil,
že se otevírací okno u katalogového kroužku a vlastní události pořád „liší“.
Přímou reprodukcí (headless Chromium, mobilní profil 390×844) se potvrdilo,
že OBÁLKA je od CHANGE-110/111 identická (stejná pozice/velikost/backdrop),
ale OBSAH vlastní události byl nápadně řídký oproti katalogové položce — visuálně
to působilo jako „jiné okno“. Uživatel následně upřesnil, že to nechce řešit jen
kosmeticky (karty/styl), ale rozšířením datového modelu — vlastní událost má
opravdu mít k dispozici stejná pole jako katalogová aktivita, ne jen podobně
vypadat s prázdnými sekcemi.

## 0. Analýza — proč šlo o datový, ne jen zobrazovací problém

Přímým porovnáním `packages/domain/src/model/schema.ts` (`activitySchema` vs.
`customEntrySchema`) — ne odhadem — `CustomEntry` neměl pole, která
`Activity` má a která uživatel při procházení detailu očekával:

| Pole | `Activity` | `CustomEntry` (před CHANGE-112) |
|---|---|---|
| `category` | ✅ | ❌ |
| `ageMin`/`ageMax` | ✅ | ❌ |
| `description` | ✅ | jen `note` (jiný účel — soukromá poznámka, ne popis) |
| `applicationUrl` | ✅ | ❌ |

`providerId`, `capacity`, `applicationDeadline`, `targetGender` a varianty
docházky (víc `sessionGroups` na výběr) záměrně NEJSOU součástí tohoto CHANGE —
uživatel je explicitně nejmenoval a sémanticky pro jednorázovou vlastní událost
bez katalogového poskytovatele nedávají stejný smysl (viz §2).

## 1. Requirements

- **FR-1**: `customEntrySchema` (`packages/domain`) rozšířen o `category`
  (`activityCategorySchema.optional()`), `ageMin`/`ageMax`
  (`z.number().int().optional()`), `description` (`z.string().optional()`),
  `applicationUrl` (`z.string().url().optional()`). Všechna pole `.optional()`
  — starší uložené/importované rozvrhy bez nich zůstávají platné (zpětná
  kompatibilita, žádná migrace dat potřeba).
- **FR-2**: `CustomEntryDialog` (formulář přidání/úpravy) získává odpovídající
  pole: select „Kategorie“ (nepovinné, `Nevybráno` jako výchozí), „Věk od/do“,
  textarea „Popis“ (odlišné od stávající „Poznámka“ — popis charakterizuje
  událost, poznámka je soukromá připomínka), text input „Odkaz na přihlášku“
  s `type="url"` a inline validací (nesmí blokovat celý formulář za jinak
  validní vstup — viz AC-3).
- **FR-3**: `CATEGORY_LABELS` (dřív jen v `DetailsPanel.tsx`) přesunuto do
  sdíleného `apps/web/src/lib/categoryLabels.ts` — používá ho teď
  `CustomEntryDialog` i `DetailsPanel`, ne dvě nezávislé kopie (stejný vzor
  duplicity, jaký CHANGE-110 řešil u obálek dialogů).
- **FR-4**: `CustomEntryDetail` (`DetailsPanel.tsx`) zobrazuje nová pole ve
  stejném vizuálním jazyce jako `SelectedActivity`: kategorie jako badge vedle
  typu události, popis jako skládací akordeon (identický vzor jako „Popis
  kroužku“), věk sloučený do karty „Cena a věk“ (přesně jako u katalogové
  aktivity), odkaz na přihlášku jako „Oficiální přihláška →“ ve stejné pozici
  (hned pod hlavičkou).

## 2. Co NENÍ součástí tohoto CHANGE (vědomě odloženo)

- **Poskytovatel/`providerId`**: vlastní událost nemá katalogový subjekt k
  odkázání; kdyby uživatel chtěl volné textové pole „Pořadatel“, je to
  samostatný požadavek, ne totéž co `providerId` (cizí klíč do `Provider`).
- **Varianty docházky (víc `sessionGroups`)**: koncept „vyber si jeden z
  více nabízených termínů“ dává smysl u katalogové nabídky, ne u položky,
  kterou si uživatel sám navrhl na konkrétní čas — `sessions` u `CustomEntry`
  zůstává jeden pevný rozvrh, ne výběr z více.
- **`capacity`, `applicationDeadline`, `targetGender`**: nejmenoval je
  uživatel a nemají zjevný okamžitý přínos pro jednorázovou/rodinnou událost;
  přidat lze v samostatném CHANGE, pokud se ukáže potřeba.

## 3. Acceptance criteria

- **AC-1**: `tsc --noEmit` čisté v `apps/web` i `packages/domain` (ověřeno).
- **AC-2**: `pnpm -C packages/domain test` (vitest, 155 testů) beze změny/
  regrese (ověřeno — schema změna je čistě aditivní, žádný existující test
  nekonstruuje `CustomEntry` s těmito poli, takže nic nezávisí na jejich
  neexistenci).
- **AC-3**: Neplatná URL v „Odkaz na přihlášku“ zobrazí inline chybu a
  zablokuje jen uložení (`disabled` na Přidat/Uložit), NE zbytek formuláře —
  prázdná hodnota je vždy validní (pole je nepovinné).
- **AC-4**: Manuálně ověřeno v reálném headless Chromium (390×844, mobilní
  profil): katalogová položka a plně vyplněná vlastní událost mají po otevření
  detailu srovnatelnou hustotu obsahu (karty „Termín“/„Místo konání“/„Cena a
  věk“, badge kategorie, rozbalitelný popis, odkaz na přihlášku) — screenshoty
  v `docs/assets/design_review_105/` (přiloženy zvlášť, ne v patchi).
- **AC-5**: Zpětná kompatibilita — existující uložený/importovaný rozvrh BEZ
  nových polí (starší export) se načte a zobrazí identicky jako před CHANGE-112
  (žádná z nových sekcí se nezobrazí, protože podmíněné renderování testuje
  přítomnost dat, ne přítomnost pole ve schématu).
- **AC-6**: Plná E2E sada (`pnpm run test:e2e`) — spuštěno lokálně, viz §4.

## 4. Implementace — stav

Patch aplikován (`git apply --exclude='.github/specs/design_review_105.md'
CHANGE-112.patch` — spec soubor byl přiložen zvlášť, již existoval identický
v pracovním adresáři). Ověřeno lokálně:

- `pnpm -C packages/domain test` — **155/155 zelených**.
- `pnpm -C apps/web typecheck` a `pnpm -C apps/web build` — čisté.
- Plná 6profilová E2E sada (`pnpm run test:e2e` ekvivalent) — PRVNÍ běh našel
  **30 skutečných selhání** (ne flaky, potvrzeno opakovaným během stejných
  testů před opravou): FR-2 vložilo nový select „Kategorie“ PŘED existující
  select dne v týdnu v `CustomEntryDialog` — sedm míst napříč
  `schedule.spec.ts`/`catalog.spec.ts`/`ics.spec.ts`/`mobile-audit-v2.spec.ts`
  cílilo na den v týdnu pozičně (`dialog.locator('select').first()`), což teď
  mířilo na Kategorii místo něj. **Fix** (tento CHANGE, ne samostatný): select
  dne v týdnu dostal `aria-label="Den v týdnu"`, všech sedm míst přepsáno na
  `getByRole('combobox', {name: 'Den v týdnu'})`. Po opravě: **780 passed / 252
  skipped / 0 failed** (shodné s CHANGE-111 baseline).

**Poučení pro příští podobné změny**: při vložení nového pole PŘED existující
prvek ve sdíleném dialogu vždy zgrepovat testy na poziční lokátory
(`.first()`/`.nth(N)`) cílící na stejný typ prvku v tomtéž dialogu.
