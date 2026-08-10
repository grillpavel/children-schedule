# Instrukce pro GitHub Copilot

Projekt: **Krouzky Planner** — webová aplikace pro sestavení rozvrhu zájmových
kroužků dítěte a export do kalendáře (`.ics`).

Kompletní specifikace je v `docs/`. Před generováním kódu k dané oblasti
si přečti odpovídající dokument.

---

## Tvrdá pravidla

### 1. Nevymýšlej data
Nikdy negeneruj konkrétní datumy státních svátků, školních prázdnin, jména
poskytovatelů, ceny, adresy ani kontakty. Tato data pocházejí z ověřených
zdrojů a žijí v `packages/domain/data/`. Pokud test nebo ukázka potřebuje
data, použij zjevně fiktivní fixture v `test/fixtures/` s prefixem `TEST_`.

### 2. Chybějící hodnota se nedoplňuje
`undefined` znamená „nevíme". Nikdy nedopočítávej, neodhaduj ani neinterpoluj.
Kontrola, která nemá vstupní data, se **přeskočí** a zapíše do `skippedChecks`,
nikdy se neaproximuje.

### 3. Doména je čistá
`packages/domain` nesmí importovat React, Next.js, `fetch`, DOM API ani nic
souvisejícího s LLM. Povoleny jsou pouze standardní knihovna, `zod` a `date-fns`.
Funkce musí být deterministické — žádné `Math.random()`, žádné `Date.now()`
uvnitř (aktuální datum je parametr).

### 4. LLM neplánuje
LLM nikdy neurčuje časy, dny ani termíny a nerozhoduje o splnitelnosti.
To dělá solver v `packages/domain/src/scheduler`. LLM smí volat pouze nástroje
definované v `packages/chat/src/tools`.

### 5. Žádná perzistence
Nepoužívej `localStorage`, `IndexedDB`, cookies ani žádné serverové úložiště.
Stav žije v paměti. Jediné povolené výjimky jsou popsané v `docs/07-architecture.md` §5
a vždy vyžadují explicitní akci uživatele.

### 6. Mutace stavu jen přes diff
Chat ani solver nesmí měnit `PlannerState` přímo. Vždy `proposeDiff()` →
uživatel potvrdí → `applyDiff()`.

### 7. Čas a časové zóny
Všechny výpočty v `Europe/Prague`. Časy v modelu jsou **minuty od půlnoci**
(`number`), ne `Date`. Dny v týdnu jsou ISO-8601 (`1` = pondělí).
Datumy jsou ISO řetězce `YYYY-MM-DD`.

### 8. ICS generuj ručně
Nepoužívej knihovnu jako jediný zdroj pravdy pro generování `.ics`.
Potřebujeme plnou kontrolu nad `EXDATE`, `VTIMEZONE` a `UID`.
Řádky se ukončují `\r\n` a zalamují na 75 oktetů (pozor na vícebajtové UTF-8).

### 9. Testy k doméně jsou povinné
Každá nová funkce v `packages/domain` má unit test. Každý nalezený bug
v solveru nebo ICS generátoru se stává novým golden case.

### 10. Uživatelské texty česky
Veškerý text viditelný uživateli je česky. Identifikátory, názvy funkcí,
komentáře v kódu a commit messages anglicky.

---

## Konvence

- TypeScript `strict: true`, žádné `any`, žádné `@ts-ignore`.
- Chybové stavy jako návratové hodnoty (`Result<T, E>` nebo discriminated
  union), ne výjimky — kromě skutečně neočekávaných stavů.
- Zod schéma je zdroj pravdy pro tvar dat; TS typy se z něj odvozují
  přes `z.infer`.
- React komponenty funkcionální, bez `useEffect` tam, kde stačí odvozený stav.
- Tailwind bez vlastního CSS, kromě mřížky rozvrhu (CSS Grid).
- Barvy kroužků z palety v `packages/domain/src/model/palette.ts`,
  nikdy natvrdo v komponentě.

## Mapa dokumentace

| Téma | Dokument |
|------|----------|
| Rozsah, cíle, non-goals, GDPR | `docs/00-product-spec.md` |
| Datový model, typy, invarianty | `docs/01-domain-model.md` |
| Solver, omezení, scoring | `docs/02-scheduler-spec.md` |
| ICS, EXDATE, výjimky, kompatibilita | `docs/03-ics-export-spec.md` |
| Layout, interakce, barvy, konflikty v UI | `docs/04-ui-spec.md` |
| Chat, tool calling, prompt | `docs/05-chat-llm-spec.md` |
| Katalog, scraper, validace | `docs/06-catalog-ingest-spec.md` |
| Stack, struktura, milníky, rizika | `docs/07-architecture.md` |
| Testy a evaluace | `docs/08-test-plan.md` |
