# Design Review 34 — ICS revize (WKST/SEQUENCE) a determinismus přepisů

**Status:** IMPLEMENTED
**Change ID:** CHANGE-35 (ICS export: `WKST=MO` + `SEQUENCE`; kanonické pořadí klíčů `overrides` pro bajtově shodný round-trip — engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (packages/domain + apps/web)
**Trigger:** E2E sada (L6/L1) odhalila tři reálné nálezy: `RRULE` bez `WKST=MO` (T-608/C6-A8), chybějící `SEQUENCE` (T-607/C6-A7) a nestabilní pořadí klíčů v `overrides`, kvůli němuž export→import→export nedával bajtově shodný JSON (T-152/C8-E5).

## 0. SOTA analysis
- **0.1 Problem.** (a) Bez `WKST=MO` je týdenní pravidlo v RFC 5545 nejednoznačné u `INTERVAL>1`. (b) Bez `SEQUENCE` klienti (Apple/Google) nepoznají revizi události po úpravě. (c) `overrides` objekt vznikal inkrementálně ve store, takže pořadí klíčů záviselo na sekvenci úprav; zod při importu klíče přeuspořádal do pořadí schématu → `JSON.stringify` dal jiné bajty.
- **0.2 Approach.** (a/b) doplnit `WKST=MO` do `RRULE` a `SEQUENCE:<n>` do každého VEVENTu; `n` předá app jako počet úprav (`history.length`), takže po změně roste. (c) Po zápisu přepisu ve store objekt **přestavíme v kanonickém pořadí klíčů schématu**; to je robustní pro libovolnou sekvenci úprav (na rozdíl od pouhé změny pořadí polí ve schématu, které řeší jen jednorázovou úpravu).

## 1. Requirements
- **FR-1** Každý VEVENT s `RRULE` obsahuje `WKST=MO`.
- **FR-2** Každý VEVENT obsahuje `SEQUENCE:<n>`; `n = IcsExportOptions.sequence ?? 0`, app předává počet úprav rozvrhu.
- **FR-3** `setActivityOverride` uloží přepis s klíči v pořadí schématu (`activityId, name, address, contactPhone, price, colorCss, note, editedAt, baseSignature`), takže serializace živého stavu je bajtově shodná se serializací po zod importu.

## 2. Acceptance criteria
- **AC-1 (FR-1)** E2E T-608 (`ics.spec.ts`) — `RRULE` obsahuje `WKST=MO` i `UNTIL`. Zelené.
- **AC-2 (FR-2)** E2E T-607 (`ics.spec.ts`) — `SEQUENCE` přítomné; UID stabilní mezi exporty. Zelené.
- **AC-3 (FR-3)** E2E T-152 (`persistence.spec.ts`) — export→import→export je bajtově shodný včetně `overrides`. Zelené.
- **AC-4** `packages/domain` `tsc --noEmit` čisté, `vitest` 81 zelených; `apps/web` `tsc --noEmit` čisté.

## 3. Non-goals / notes
- Zbývající mezery ICS exportu (`X-APPLE-STRUCTURED-LOCATION` T-603, `EXDATE` svátků T-606, kalendář na dítě T-609) **v tomto CHANGE neřešíme** (tracked as BL-020).
- Generátor českých svátků/prázdnin do `store.exceptions` (nutný pro T-606) je samostatný úkol (tracked as BL-020).
- `SEQUENCE` odvozujeme z počtu úprav v rámci relace; perzistentní revize mezi soubory není cílem (dostačuje pro C6-A7).
