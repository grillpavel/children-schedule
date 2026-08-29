# Design Review 85 — BL-041: formální doménová rodinná kolize (`ConflictKind: 'family'`)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-92 (`packages/domain` + `@krouzky/web`; **beze změny schématu/`schemaVersion`**
— `Conflict` je odvozený výstupní typ, nikdy se neserializuje jako vstup)
**Date:** 2026-08-30
**Trigger:** Dokončení Vlny 2/3 (design_review_73.md) — poslední otevřená položka odvozená z
FR-W3-3 (CHANGE-87).

## 0. SOTA analýza

- CHANGE-87 (design_review_80.md) zavedlo jen APLIKAČNÍ heuristiku (`familyOverlapMessage` v
  `useScheduleView.ts`) — čistý časový překryv bez ohledu na adresu, vědomě NE formální
  `Conflict`. Tento change ji nahrazuje skutečnou doménovou kontrolou H10.
- `Conflict`/`ConflictKind` je odvozený typ (`packages/domain/src/model/types.ts`, komentář
  „Odvozené typy — neserializují se jako vstup") — přidání nové hodnoty union typu proto
  NEVYŽADUJE bump `schemaVersion` ani migraci, na rozdíl od změn `PlannerState`.
- H10 mirroruje existující H9 (`detectTightTransfers`) strukturou, ale INVERTUJE klíčovou
  podmínku: H9 porovnává jen SESSIONS STEJNÉHO dítěte (`p.childId !== q.childId → continue`),
  H10 porovnává jen RŮZNÉ děti (`p.childId === q.childId → continue`, to řeší H1). Stejná
  disciplína u neznámé adresy: `skippedChecks`, nikdy aproximace.

## 1. Requirements

- **H10 (nová)**: dvě RŮZNÉ děti, překrývající se termín ve stejný den, RŮZNÁ místa → `Conflict`
  `kind: 'family'`, `severity: 'hard'`, zpráva jmenuje obě děti i oba termíny. Stejné místo
  kolizi nezakládá (jeden rodič zvládne oboje na místě). Neznámá adresa u jedné ze session →
  `skippedChecks` (`H10_family_overlap`), ne aproximace.
- `apps/web`: `useScheduleView.ts` nahrazuje starou aplikační heuristiku filtrací
  `report.conflicts` na `kind === 'family'` — odznak 👪 (`ScheduleGrid.tsx`, beze změny od
  CHANGE-87) zůstává ODDĚLENÝ od obecného ⚠ (H1–H3/H5 nadále negenerují 👪 a naopak).

## 2. Acceptance criteria

- **Doménové testy** (`packages/domain/test/conflicts.test.ts`, nová sekce H10, 5 testů): dvě
  děti + překryv + různá místa → `family` (hard); stejné dítě → `time_overlap`, ne `family`;
  stejné místo → bez kolize; bez časového překryvu → bez kolize; chybějící adresa →
  `skippedChecks`. Celkem 130 domain testů (23 v `conflicts.test.ts`) — 0 failed.
- **T-229** (`schedule.spec.ts`) aktualizován — `addCustom` helper nově bere volitelnou adresu;
  test nastavuje RŮZNÉ adresy oběma dětem (dřív žádné), ať formální H10 kolizi skutečně
  vytvoří (dřív fungovalo jen díky staré aplikační heuristice bez ohledu na adresu).
- `tsc --noEmit` (oba balíčky) čisté; plná E2E sada 0 failed.

## 3. Non-goals

- Nepřidává samostatný vizuální styl pro `family` odlišný od 👪 odznaku zavedeného CHANGE-87 —
  to zůstává beze změny.
- Neřeší BL-047/048 (Agenda/MonthView bez vazby na datum, `CustomEntry` bez override na
  prázdniny) — mimo rozsah tohoto changu.

BL-041 je tímto DOKONČENO.
