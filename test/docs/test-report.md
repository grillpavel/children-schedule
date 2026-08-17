# Report z testování — E2E sada Krouzky Planner

Datum: 2026-08-11 · Runner: Playwright 1.62 (Chromium) · Aplikace: `@krouzky/web` (Next.js 14, klientská SPA)
Konfigurace: [test/playwright.config.ts](../playwright.config.ts) · Zdroj požadavků: [test/docs/test-spec.md](test-spec.md)

## 1. Shrnutí

Kompletní E2E sada dle `.github/copilot-instructions.md` napsána ve všech vrstvách
(L0, L1, L2, L3, L4, L5, L6). Ověřeno na profilech **desktop (1440)** a **mobile-small (360)**
nesandboxovaně, jeden profil, `--workers=1`.

Sada je záměrně navržena tak, aby část testů **zpočátku padala** — červené testy popisují
cílový stav (Changes 6–9) a odhalují reálné mezery, ne chyby testů. Žádné selhání není
obcházeno (`test.skip` jen pro podmínky profilu, `test.fixme` jen pro infra mimo runner,
žádné změkčené assertion).

| Vrstva | Soubor | Zelené | Poctivé červené |
| --- | --- | --- | --- |
| L0 Smoke | [smoke.spec.ts](../specs/smoke.spec.ts) | T-000–003 | — |
| L2 Responzivita | [responsive.spec.ts](../specs/responsive.spec.ts) | většina T-200–212 | T-202, T-205, T-207 |
| L1 Katalog | [catalog.spec.ts](../specs/catalog.spec.ts) | 14/16 | T-104, T-116 |
| L1 Rozvrh | [schedule.spec.ts](../specs/schedule.spec.ts) | T-130–135 | — |
| L1 Panel | [panel.spec.ts](../specs/panel.spec.ts) | 7/8 | T-140 |
| L1 Perzistence | [persistence.spec.ts](../specs/persistence.spec.ts) | 4/5 | T-152 |
| L3 Přístupnost | [a11y.spec.ts](../specs/a11y.spec.ts) | 6–7/11 | T-300, T-301, T-304, T-310 |
| L6 Export ICS | [ics.spec.ts](../specs/ics.spec.ts) | 5/10 | T-603, T-606, T-607, T-608, T-609 |
| L4 Vizuální regrese | [visual.spec.ts](../specs/visual.spec.ts) | T-400–403 | — (baseline vytvořeny) |
| L5 Výkon | [perf.spec.ts](../specs/perf.spec.ts) | T-500–503 | T-504 `fixme` (Lighthouse) |

## 2. Reálné nálezy (poctivé červené) → mapování na požadavek a backlog

| Test | Požadavek | Root cause | Backlog |
| --- | --- | --- | --- |
| T-104 | C6-E2 | Osa mřížky je 00:00–24:00 (`grid.ts` `DAY_START/END`), ne denní okno | BL-022 |
| T-116 | C7-E1 | Prázdný výsledek filtru nemá tlačítko „Zrušit filtry" (jen `<p>`) | BL-022 |
| T-140 | C8-D5 | Žádná aktivita nemá vyplněné `applicationDeadline` (datová mezera) | BL-017 |
| **T-152** | **C8-E5** | **Pořadí klíčů v `overrides` se liší živě vs. po zod importu → round-trip není bajtově shodný** | **BL-021** |
| T-202 | C9-M1 | Na mobilu chybí záložka Agenda | BL-019 |
| T-205 | C9-M6 | Dotykové cíle < 24 px | BL-019 |
| T-207 | C9-Y5 | Vodorovný scroll při 200 % zoomu | BL-019 |
| T-300/301 | C9-T3 | axe hlásí porušení kontrastu — tokeny definované, ale neaplikované na plochy (slate-400/500) | BL-019 |
| T-304 | C9-A4 | Šipková navigace v mřížce neimplementovaná | BL-019 |
| T-310 | C9-A6 | Dark mode neimplementovaný | BL-019 |
| T-603 | C6-A4 | `X-APPLE-STRUCTURED-LOCATION` se negeneruje | BL-020 |
| T-606 | C6-A9 | `store.exceptions` je prázdné → export nemá `EXDATE` svátků | BL-020 |
| T-607 | C6-A7 | Negeneruje se `SEQUENCE` (UID je stabilní) | BL-020 |
| T-608 | C6-A8 | `RRULE` nemá `WKST=MO` (`UNTIL` má) | BL-020 |
| T-609 | C6-C2 | App je jednodětská, bez správy více dětí | BL-020 |

## 3. Prostředí a jak sadu spustit

- `pnpm` není na PATH tohoto stroje; Playwright je nainstalovaný izolovaně v `$TMPDIR/e2e`.
- Chromium je v sandboxu zabíjen (`kill EPERM`/`SIGTRAP`) při paralelních/multiprofilových
  bězích → validovat **nesandboxovaně**, jeden `--project`, `--workers=1`.
- `@krouzky/domain` **není** v izolované instalaci → ICS testy pracují nad **syrovým textem**
  přes [test/helpers/ics-raw.ts](../helpers/ics-raw.ts) (což zároveň obchází normalizaci parseru,
  před níž spec varuje u T-600/601).
- Vizuální baseline jsou `-darwin`; CI (Linux) si musí vygenerovat vlastní.

```bash
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm run test:e2e            # vše, šest profilů
pnpm exec playwright test --config test/playwright.config.ts test/specs/a11y.spec.ts
```

## 4. Doporučení pro budoucí optimalizace

Priorita podle dopadu:

1. **P0 — datová integrita exportu (BL-020).** ICS mezery (svátky/EXDATE, SEQUENCE, WKST,
   Apple lokace) mají přímý dopad na správnost kalendáře v Apple/Google. `EXDATE` je nejrychlejší
   win: stačí zadrátovat už počítané svátky (`MonthView` je má) do `store.exceptions` a předat exportu.
2. **P0 — bajtový round-trip (BL-021).** Ustálit pořadí klíčů `ActivityOverride` (serializace
   nebo `setActivityOverride`), aby uložení→načtení→uložení dalo shodný soubor (C8-E5).
3. **P1 — přístupnost (BL-019).** Aplikovat kontrastní tokeny na plochy (odstraní T-300/301),
   dark mode (T-310), šipková navigace mřížky (T-304), dotykové cíle ≥ 24 px (T-205).
4. **P1 — UX katalogu (BL-022).** Denní okno osy (T-104) a tlačítko „Zrušit filtry" (T-116).
5. **P2 — data (BL-017).** Doplnit reálné `applicationDeadline` (T-140).
6. **P2 — CI.** Doplnit Lighthouse CI (T-504), kontrastní bránu (C9-T3e) a Linux vizuální baseline.
7. **Škálování testů.** T-500/T-501 měří reálný katalog (37 položek); 200položkový stres by
   vyžadoval syntetická data (BL-016) — vhodné pro budoucí výkonovou bránu.

## 5. Definition of Done — stav

- V sadě **není** `waitForTimeout` ani CSS selektor v lokátoru (web-first assertions, role/text).
- Názvy testů začínají ID požadavku; testy jsou nezávislé; fixture commitnuté.
- Každý `incomplete` z axe je řešen (T-301 kontroluje `violations` i `incomplete` kontrastu).
- Celá sada doběhne v řádu minut (jednotlivé soubory < 25 s na profil).
- Nenapsáno (mimo závazný seznam): manuální matice M-01–M-08.
