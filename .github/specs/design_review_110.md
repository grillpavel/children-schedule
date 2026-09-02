# Design Review 110 — Audit celého datového toku, ne jen zobrazení

**Status:** IMPLEMENTED (2026-09-02)
**Change ID:** CHANGE-117 (`packages/domain` + `apps/web`)
**Date:** 2026-09-02
**Repo:** `packages/domain/src/ics/generate.ts`,
`apps/web/src/components/{DetailsPanel,CustomEntryDialog}.tsx`
**Trigger:** uživatel po CHANGE-116 (jednotná šablona zobrazení) řekl: „Stále to
nefunguje přesně… Analyzuj celý projekt včetně dat, která se ukládají!" —
signál, že problém možná není (jen) v tom, JAK se detail vykresluje, ale
někde v tom, CO se vlastně ukládá/exportuje.

## 0. Metodika — audit celého životního cyklu dat

Místo dalšího zvětšování lupy na `DetailsPanel.tsx` jsem prošel celý tok dat
od schématu po export:

1. **Schéma** (`packages/domain/src/model/schema.ts`) — pole-po-poli
   `activitySchema`+`activityOverrideSchema` vs. `customEntrySchema`.
2. **Formuláře** (`CustomEntryDialog.tsx` vs. `ActivityEditor`) — které z
   těch polí se dají vůbec editovat.
3. **`.ics` export** (`packages/domain/src/ics/generate.ts`) — co se
   z uložených dat skutečně dostane do exportovaného kalendáře.
4. **Perzistence** (`state/io.ts`) — jestli se něco neztrácí při
   ukládání/migraci (výsledek: ne, všechna nová pole jsou `.optional()`,
   žádná migrace potřeba).

## 1. Nálezy

### 1.1 `.ics` export ignoroval `entry.description` (CHANGE-112 pole) — SKUTEČNÝ BUG

Potvrzeno čtením kódu, ne odhadem: `generate.ts` pro `CustomEntry` posílalo
`description: entry.note` do `buildDescription()` — **`entry.description`
(pole z CHANGE-112) se do exportovaného `.ics` souboru nikdy nedostalo**, ať
ho uživatel vyplnil nebo ne. Zároveň `category`/`ageMin`/`ageMax` (taky
CHANGE-112) se u vlastní události do exportu vůbec nepropisovaly, zatímco u
katalogové aktivity (`ageRange`/`category` parametry) ano.

Ověřeno přímým spuštěním `generateIcs()` mimo prohlížeč (viz §4) — před
opravou `DESCRIPTION` obsahovalo jen text z `note`; po opravě obsahuje popis,
lektora, telefon, e-mail, cenu, věk, kategorii A poznámku, každé na vlastním
řádku, ve stejném pořadí jako u katalogové aktivity.

**Fix**: `buildDescription()` dostal nový parametr `note` (odděleně od
`description` — sémanticky různé věci, viz CHANGE-112). `CustomEntry` volání
teď posílá `description: entry.description`, `note: entry.note`,
`category`, `ageRange`, `email` — stejná sada polí jako aktivita.

### 1.2 `ActivityOverride.note` — mrtvé pole ve schématu

`grep` přes celý `apps/web` a `packages/domain` nenašel JEDINÉ místo, které
by `override.note` četlo nebo zapisovalo, mimo definici schématu samotnou.
Komentář ve schématu říká „Soukromá poznámka rodiče ke kroužku" — ale žádné
UI ji nikdy neumožnilo napsat. Rodič tedy nemohl okomentovat katalogový
kroužek, i když to schéma podporovalo — asymetrie vůči vlastní události,
která `note` má a používá.

**Fix**: `ActivityEditor` dostal pole „Poznámka" (stejné umístění/styl jako
u vlastní události), zapisuje do `override.note`. `SelectedActivity` teď
posílá `note={override?.note}` do sdíleného `EventDetail` — objevuje se ve
stejné pozici/stylu jako u vlastní události (funguje bez úprav šablony,
protože `EventDetail` už `note` slot měl z CHANGE-116).

### 1.3 `CustomEntry.contact.email` — mrtvé pole ve schématu

Stejný nález opačným směrem: `contact.email` existuje ve schématu vlastní
události, ale `CustomEntryDialog` nemělo pole k jeho vyplnění a
`DetailContactCard` volání ho nikdy nečetlo. Katalogová aktivita přitom
e-mail (z `provider.contact.email`) zobrazuje běžně.

**Fix**: nové pole „E-mail" v `CustomEntryDialog` (s validací formátu, stejný
vzor jako u „Odkaz na přihlášku"), zapisuje do `contact.email`. Zobrazení i
`.ics` export teď toto pole čtou.

## 2. Co bylo prověřeno a JE v pořádku

- **Perzistence/migrace** (`state/io.ts`): všechna nová pole (CHANGE-112/113
  i tato) jsou `.optional()` — žádná migrace `schemaVersion` potřeba, starší
  uložené soubory zůstávají platné beze změny.
- **JSON export** (celorodinný i „toto dítě"): serializuje `customEntries`/
  `overrides` beze změny, takže `description`/`note`/`category`/`email` se
  do zálohy VŽDY ukládaly správně — bug byl izolovaný na `.ics` cestu, JSON
  export/import jím nebyl dotčen.
- **`applicationUrl`**: ověřeno, že se nepoužívá v `.ics` popisu ANI u
  katalogové aktivity (`web` pole tam jde z `sourceUrl`/`provider.website`,
  ne z `applicationUrl`) — symetrické chování na obou stranách, není to nová
  asymetrie, není co opravovat.

## 3. Uzavřený bod — `contact.personName` NENÍ mrtvé pole

Audit původně označil `CustomEntry.contact.personName` za další mrtvé pole a
nabídl volbu „přidat pole do formuláře, nebo odstranit ze schématu". Uživatel
zvolil odstranění, pokud je pole skutečně nikde nepoužité. **Ověření ukázalo,
že tato premisa je nesprávná — pole se používá a odstranit ho nelze:**

- `personName` nepatří `CustomEntry`, ale sdílenému `contactSchema`
  (`schema.ts:49`), který používá i `providerSchema.contact` (`schema.ts:60`,
  povinné pole).
- Je vyplněné u 5 reálných pořadatelů (`novestraseciData-2.ts:297/308/319/336/352`).
- Čte se a zobrazuje v `DetailsPanel.tsx:155`
  (`provider?.contact.personName` → `contactPerson`) a exportuje se do `.ics`
  jako řádek „Kontakt:" (`generate.ts:219`).

Nepoužitá je pouze jedna volitelná položka sdíleného tvaru na straně
`CustomEntry` — ne samotné pole. Odstranit ji jen tam by znamenalo rozštěpit
`contactSchema` na dva tvary kvůli jednomu nepovinnému klíči, který nic nestojí
a nic nerozbíjí. **Rozhodnutí: neměnit nic** (varianta ani A, ani B).

**Status tohoto bodu:** uzavřeno bez změny kódu.

## 4. Ověření

- `tsc --noEmit` čisté (`apps/web` i `packages/domain`, po `pnpm -C
  packages/domain build` pro reexport typů).
- Doménový vitest 155/155 (žádná regrese; `ics.test.ts` — 24 testů — nemělo
  fixture s `description`/`category`/`email` u `CustomEntry`, proto bug
  prošel nepovšimnutý; doporučeno přidat regresní test).
- **Přímé ověření `.ics` výstupu** mimo prohlížeč (`generateIcs()` s
  testovacím `CustomEntry` obsahujícím všechna pole) — `DESCRIPTION` po
  opravě obsahuje všech 8 očekávaných řádků ve správném pořadí a obsahu.
- Vizuálně ověřeno v headless Chromiu: pole „E-mail" v `CustomEntryDialog`,
  pole „Poznámka" v `ActivityEditor`, a že se poznámka aktivity zobrazí ve
  stejném stylu/pozici jako u vlastní události (díky sdílené `EventDetail`
  šabloně z CHANGE-116 — žádná úprava šablony nebyla potřeba).

```bash
git apply CHANGE-117.patch
pnpm -C packages/domain build && pnpm -C packages/domain test
pnpm -C apps/web typecheck
pnpm -C apps/web build
pnpm run test:e2e
```
