# Design Review 94 — Popisek termínu zůstává „Termín upřesní rodič" i po úpravě

**Status:** IMPLEMENTED
**Change ID:** CHANGE-101 (app `@krouzky/web` only, engine beze změny)
**Date:** 2026-08-30
**Repo:** monorepo `Children_schedule` (`apps/web`)
**Trigger:** kompletní manuální průzkumné testování všech funkcí po CHANGE-98/99/100 (na žádost
uživatele „udělej kompletní testy všech funkcí, zkus najít chyby"). Nalezeno při ověřování
předpřipraveného termínu ZUŠ/ZŠ (design_review_91.md) — konkrétně workflow „rodič si po zápisu
upraví den/čas přes Upravit časy".

## 0. SOTA analýza

### 0.1 Problém

`SessionGroup.label` (v `DetailsPanel.tsx`, sekce „Varianty docházky" i `<select>Vyberte termín</select>`)
se zobrazoval jako `g.label ?? <vypočtený čas ze sessions>` — `??` nikdy nespadne na vypočtený čas,
pokud `g.label` existuje. CHANGE-98 dal VŠEM 39 nově přidaným ZŠ/ZUŠ skupinám pevný
`label: 'Termín upřesní rodič'`, aby se placeholder čas (Po 08:00–08:45) netvářil jako ověřený
rozvrh. Jenže tenhle label je STATICKÝ — i po úspěšné úpravě přes „Upravit časy" (existující
`SessionTimeEditor`, CHANGE-74/`SessionOverride`), kdy se podkladová data SPRÁVNĚ změní (ověřeno:
mřížka i `localStorage.sessionOverrides` reflektují novou hodnotu), popisek ve „Varianty docházky"
napořád ukazuje stejný text „Termín upřesní rodič" — rodič nemá žádný způsob, jak si ve
„Varianty docházky" ověřit, JAKÝ čas si vlastně nastavil, aniž by musel otevírat samotný editor
nebo se dívat do mřížky.

### 0.2 Přístup

Nová sdílená funkce `groupDisplayLabel(group, sessionOverrides)`: pokud ŽÁDNÁ ze sessions skupiny
nemá aktivní `SessionOverride`, chová se přesně jako dřív (`g.label ?? vypočtený čas`) — placeholder
zůstává viditelný, dokud ho rodič neupraví. Jakmile MÁ alespoň jedna session aktivní přepis, popisek
vždy ukáže AKTUÁLNÍ efektivní čas (vypočtený ze `sessions`, které už samy o sobě odrážejí přepis —
`store.catalog` je přepisy přepočítaný, CHANGE-74), bez ohledu na to, jestli skupina měla statický
`label`. Použito na obou místech, kde se dřív duplikoval stejný inline výpočet (`<select>` i seznam
„Varianty docházky").

Vedlejší, žádoucí efekt: stejná oprava platí i pro STÁVAJÍCÍ katalogové skupiny s vlastním
`label`em (např. SCNS „Pondělí 16:15" u alternativních termínů atletiky) — pokud by si je rodič
přes „Upravit časy" také přesunul, popisek teď správně ukáže nový čas místo starého katalogového
labelu. To je konzistentní s očekáváním (po úpravě vidím SVŮJ čas, ne originální katalogový popisek)
a nebylo to nikdy dřív testováno, protože do CHANGE-98 žádná labelovaná skupina neměla důvod se
editovat.

## 1. Requirements

- **FR-1**: Dokud SessionGroup nemá žádný aktivní `SessionOverride`, „Varianty docházky" i
  `<select>Vyberte termín</select>` ukazují `g.label` (pokud existuje), jinak vypočtený čas.
- **FR-2**: Jakmile má SessionGroup aktivní `SessionOverride` (na kterékoli ze svých sessions),
  popisek vždy ukáže AKTUÁLNÍ vypočtený čas, i když skupina má statický `label`.

## 2. Acceptance criteria

- **AC-1** (FR-1): nová aktivita ZUŠ/ZŠ bez úpravy → „Varianty docházky" ukazuje „Termín upřesní
  rodič". Ověřeno diagnostickým skriptem (headless Chromium): `isVisible()` textu true PŘED úpravou.
- **AC-2** (FR-2): stejná aktivita PO úpravě dne/času přes „Upravit časy" (Středa 17:30–18:15) →
  „Varianty docházky" ukazuje „St 17:30–18:15", NE „Termín upřesní rodič". Ověřeno stejným
  skriptem (`isVisible()` staré fráze false PO úpravě, `sessionOverrides` v `localStorage`
  potvrzuje `{sessionId, weekday:3, startMinutes:1050, endMinutes:1095}`, mřížka ukazuje blok
  na správném místě).
- **AC-3** (regrese): T-178 (`schedule.spec.ts`, katalogová aktivita bez vlastního labelu) zůstává
  zelený — netýká se ho změna (fallback tam byl vždy počítaný, nikdy `g.label`).
- **AC-4** (regrese): plná 6profilová E2E sada beze změn = 743 passed / 247 skipped / 0 failed;
  `tsc --noEmit` čisté (web); domain vitest 135/135 (engine nedotčen).

## 3. Non-goals / notes

- Ostatní prozkoumané oblasti při tomto kompletním testovacím kole BEZ nálezu (viz shrnutí v
  CHANGELOG): 3 sourozenci (rozdělení na třetiny), konflikt dvou ZUŠ položek ve stejný
  placeholder čas, JSON export/import bajtová shoda, ICS export ZŠ „Výuka" (5 VEVENT, správné
  `BYDAY`), věkový filtr s rozsahem 3–19, validace neplatného věku, mobilní drill-down pro nové
  kořenové skupiny „Škola"/"ZUŠ", odebrání kalendáře sourozence se zapnutým „Zobrazit i
  sourozence". Tablet portrait/landscape „chybějící sheety" (položka z CHANGE-97) zůstává
  nereprodukovatelná i s větším katalogem (76 položek) — ponecháno jako otevřené, needs-repro.
