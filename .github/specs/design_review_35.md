# Design Review 35 — Denní osa, „Zrušit filtry" a svátky v exportu

**Status:** IMPLEMENTED
**Change ID:** CHANGE-36 (denní okno osy mřížky; tlačítko „Zrušit filtry"; generátor českých státních svátků → výchozí `exceptions` → `EXDATE` — engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (packages/domain + apps/web)
**Trigger:** E2E odhalilo tři nálezy: osa mřížky 00:00–24:00 místo denního okna (T-104/C6-E2); prázdný výsledek filtru bez akce zrušení (T-116/C7-E1); export bez `EXDATE` svátků, protože `store.exceptions` bylo prázdné (T-606/C6-A9).

## 0. SOTA analysis
- **0.1 Problem.** (a) Celodenní osa plýtvá výškou a neodpovídá době kroužků. (b) Uživatel po filtru bez výsledku neměl jak filtry rychle zrušit. (c) `store.exceptions` bylo natvrdo `[]`, takže ani `MonthView`, ani ICS export neznaly svátky.
- **0.2 Approach.** (a) Denní okno `07:00–21:00` (konstanty v `grid.ts`); dynamické okno podle obsazenosti je zbytečně invazivní. (b) Do prázdného stavu katalogu přidat tlačítko „Zrušit filtry", které vynuluje všechny filtry; zobrazí se jen když je nějaký filtr aktivní. (c) Nová doménová funkce `schoolYearHolidays()` staví státní svátky ČR (pevné + velikonoční přes `computus`) pro školní rok; store jimi inicializuje `exceptions`. Krajské jarní prázdniny (závislé na `districtCode`) ponecháváme na později.

## 1. Requirements
- **FR-1** Osa mřížky pokrývá `07:00–21:00` (`DAY_START_MIN`/`DAY_END_MIN`, `HOUR_MARKS`).
- **FR-2** Prázdný výsledek katalogu s aktivním filtrem nabídne tlačítko „Zrušit filtry", které vynuluje hledání, kategorii, dny, věk, „Vejde se mi to" i časové meze.
- **FR-3** `schoolYearHolidays(schoolYear)` vrátí seřazené státní svátky ČR uvnitř školního roku; store jimi naplní `exceptions`, takže ICS export vylučuje svátky přes `EXDATE`.

## 2. Acceptance criteria
- **AC-1 (FR-1)** E2E T-104 — nejnižší hodina osy ≥ 6, nejvyšší ≤ 22. Zelené.
- **AC-2 (FR-2)** E2E T-116 — po hledání bez výsledku je tlačítko „Zrušit filtry" viditelné. Zelené.
- **AC-3 (FR-3)** E2E T-606 — export obsahuje `EXDATE`. Zelené. + unit test `holidays.test.ts` (2 testy).
- **AC-4** `tsc --noEmit` (domain+web) čisté; `vitest` 83 zelených.

## 3. Non-goals / notes
- Dynamická osa podle skutečně obsazeného intervalu (místo pevného 07–21) — neřešíme teď (tracked as BL-022, přeznačeno na optimalizaci).
- Krajské jarní prázdniny a školní volno mimo státní svátky — vyžadují data podle `districtCode` (tracked as BL-020).
- Zbývající ICS mezery `X-APPLE-STRUCTURED-LOCATION` (T-603) a kalendář na dítě (T-609) — tracked as BL-020.
