# Design Review 80 — Vlna 3, FR-W3-3: překryv rozvrhů více dětí (design_review_73.md)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-87 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Trigger:** Pokračování BL-052 po CHANGE-86 (FR-W3-2).

## 0. SOTA analýza

- **Klíčové zjištění před implementací (audit byl nepřesný):** design_review_73.md tvrdí, že
  „motor kolizí napříč dětmi už funguje (H9/`detectTightTransfers`)". Čtení
  `packages/domain/src/conflicts/detect.ts` ukázalo opak — `detectTightTransfers` i
  `detectTimeOverlaps` mají explicitní `if (p.childId !== q.childId) continue;` (řádek u H1 i H9):
  obě kontroly porovnávají VÝHRADNĚ termíny STEJNÉHO dítěte. Mezidětská kolize dnes neexistuje ani
  v doméně — to potvrzuje **BL-041** („formalizovat jako čtvrtý `ConflictKind` typ `FAMILY`"),
  který zůstává otevřený jako produktové rozhodnutí (jiný typ severity, jiná sada testů).
- **Co naopak usnadnilo implementaci:** `resolvePlacedSessions(schedule, index, childId?)` už má
  `childId` jako VOLITELNÝ parametr — bez něj vrátí termíny všech dětí ve stejném aktivním
  rozvrhu (`NamedSchedule` sdílí `enrollments`/`customEntries` napříč dětmi, filtrované jen podle
  `childId` pole). Žádná úprava domény nebyla potřeba.
- **Rozhodnutí o rozsahu:** aby implementace nečekala na produktové rozhodnutí BL-041, „kolize"
  mezi dětmi je řešena jako LEHKÁ heuristika na úrovni aplikace (`familyOverlapMessage` v
  `useScheduleView.ts`) — čistý časový překryv (bez ohledu na adresu/dojezd), NE formální
  `Conflict`/`ConflictKind` z domény. Je to vědomě odlišeno od H1–H9, ať se nesplete s
  případnou budoucí formální `FAMILY` kontrolou z BL-041.

## 1. Requirements

- **FR-W3-3**: Přepínač „👪 Zobrazit i sourozence" v `ScheduleGrid` (viditelný jen když
  `children.length > 1` a NE na mobilu — mobil má vlastní Agendu bez prostoru na překryv).
  Po zapnutí se do mřížky vykreslí termíny OSTATNÍCH dětí jako neinteraktivní přerušovaně
  orámované bloky (`data-testid="family-block"`, popisek „{dítě}: {termín}"), a aktivnímu dítěti
  se u časově překrývajícího se bloku zobrazí odznak 👪 (`data-testid="family-overlap-badge"`)
  s tooltipem jmenujícím konkrétní kolidující termín druhého dítěte.

## 2. Acceptance criteria

- **AC-1 (T-229)**: Dvě děti se shodným termínem (Po 16:00–17:00) → po zapnutí přepínače je
  vidět `family-block` s textem obsahujícím jméno druhého dítěte a `family-overlap-badge` u
  vlastního bloku aktivního dítěte; po vypnutí přepínače obojí zmizí.
- Přepínač se nezobrazuje na mobilu ani při jediném dítěti.
- `tsc --noEmit` (web) čisté; plná E2E sada 0 failed.

## 3. Non-goals

- Nezavádí formální `ConflictKind: 'family'` v doméně ani nemění `schemaVersion` — to zůstává
  BL-041 (čeká na produktové rozhodnutí o závažnosti/testovací matici).
- Nekontroluje adresu/dojezd mezi dětmi (na rozdíl od H9) — jen čistý časový překryv; adresové
  rozlišení by bylo součástí případné budoucí formální `FAMILY` kontroly.
- Nefunguje na mobilu (Agenda) — jen v grid pohledech (Den/3 dny/Týden) nad 900px.

BL-052 nyní čítá 3 zbylé položky (FR-W3-1 drag&drop, FR-W3-4 sdílený odkaz, FR-W3-6 tokenizace
dark modu) — FR-W3-3 hotovo.
