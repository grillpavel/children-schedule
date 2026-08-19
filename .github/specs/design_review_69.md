# Design Review 69 — Vlastní barva u vlastních událostí + editace času katalogové aktivity

**Status:** IMPLEMENTED
**Change ID:** CHANGE-74 (scope engine `@krouzky/domain` 0.6.0 → 0.7.0 + app `@krouzky/web`, schemaVersion 7 → 8)
**Date:** 2026-08-19
**Repo:** monorepo `Children_schedule`
**Trigger:** uživatel požádal o dvě samostatné úpravy: (1) možnost zvolit barvu u vlastních událostí
(`CustomEntry`), (2) možnost editovat i katalogové aktivity — konkrétně čas termínu, protože katalog
nemusí odrážet aktuální stav (např. změna tréninkového dne/hodiny u reálného kroužku). Cena a adresa už
editovatelné byly (`ActivityOverride`, CHANGE-4); čas ne.

## 0. SOTA analýza

### 0.1 Co už existuje

- `CustomEntry.colorOverride?: string` ([schema.ts](../../packages/domain/src/model/schema.ts)) v
  doméně existoval už od dřívějška a `useScheduleView.ts` ho i čte při vykreslení bloku — jen `
  CustomEntryDialog.tsx` nikdy nenabízel UI k jeho nastavení.
- `ActivityOverride` ([schema.ts](../../packages/domain/src/model/schema.ts)) umožňuje přepsat název,
  adresu, telefon, cenu a barvu katalogové aktivity — ale ne čas jednotlivých `Session` (weekday/
  start/end), ten je čistě katalogová (needitovatelná) data.
- `detectConflicts`/`resolvePlacedSessions`/`scheduleSummary`/`buildRecommendations`/`generateIcs`
  všechny přijímají `Catalog` jako vstupní parametr a nečtou ho ze store přímo — vhodné místo pro
  transparentní zásah je tedy samotný **store**, ne tyto domain funkce.

### 0.2 Rozhodnutí a zamítnuté alternativy

| Otázka | Zvoleno | Zamítnuto — proč |
|---|---|---|
| Kam patří přepis času Session? | nová entita `SessionOverride` (klíč `sessionId`), pole `PlannerState.sessionOverrides` | rozšířit `ActivityOverride` o mapu časů podle `sessionId` — méně čitelné, `SessionOverride` mirroruje existující `ActivityOverride` vzor 1:1 |
| Jak zajistit, že konflikty/ICS/doporučení/souhrn vidí opravený čas? | `plannerStore.ts`'s `catalog` pole se přepočítá (`applySessionOverrides(NOVE_STRASECI_CATALOG, sessionOverrides)`) při každé změně přepisu i při `loadState`/`hydrate` — všech 7+ čtecích míst (`CatalogPanel`, `ScheduleGrid`, `DetailsPanel`, `useScheduleView`, `Toolbar` export, `HomeScreen`, `page.tsx`) dostane efektivní katalog transparentně, beze změny | protáhnout `sessionOverrides` jako nový parametr přes `buildCatalogIndex`/`detectConflicts`/`generateIcs`/`resolveEvents` — funkční, ale vyžaduje upravit ~6 volání na 5 různých místech domény i app vrstvy zbytečně, když stačí upravit zdroj (katalog) jednou |
| Validace času v `SessionOverride` | `startMinutes < endMinutes`, jen když jsou OBĚ zadané (`refine`) | vynutit, že se musí zadat všechny tři najednou — zbytečně striktní pro budoucí částečné patch zápisy |

## 1. Requirements

- **FR-1**: `CustomEntryDialog.tsx` získá sekci „Barva“ (`ColorSwatches`, stejná komponenta jako u
  katalogové aktivity) zapisující do `CustomEntry.colorOverride` — funguje při vytváření i editaci.
- **FR-2**: nový typ/schéma `SessionOverride` (`sessionId`, volitelné `weekday`/`startMinutes`/
  `endMinutes`) — `PlannerState.sessionOverrides: SessionOverride[]`, `schemaVersion` `7 → 8` (migrace
  no-op s výchozím prázdným polem).
- **FR-3**: nové čisté doménové funkce `effectiveSession(session, override)` a
  `applySessionOverrides(catalog, sessionOverrides)` ([session-override.ts](../../packages/domain/src/model/session-override.ts)) — vrací katalog s
  přepsanými časy, beze změny vstupu.
- **FR-4**: `plannerStore.ts` získá akce `setSessionOverride(sessionId, patch)`/
  `clearSessionOverride(sessionId)` (stejný vzor jako `setActivityOverride`, včetně kanonického pořadí
  klíčů pro stabilní round-trip). Store's `catalog` pole se přepočítá po každé z těchto akcí i po
  `loadState`/`hydrate` — všichni čtenáři `s.catalog` dostanou efektivní katalog beze změny kódu.
- **FR-5**: `DetailsPanel.tsx` získá sekci „Upravit časy“ (kolabovatelná, stejný vzor jako „Upravit
  údaje“) — pro každou Session vybrané aktivity nabídne den v týdnu + čas začátku/konce, s označením
  „upraveno vámi“ a tlačítkem „Obnovit“ na katalogovou hodnotu.

## 2. Acceptance criteria

- **AC-1** (FR-1): E2E `T-177` (`schedule.spec.ts`) — vlastní událost s vybranou barvou „cihlová“ má v
  mřížce `background-color: rgb(196, 78, 82)` namísto výchozí barvy podle typu.
- **AC-2** (FR-3): `packages/domain/test/session-override.test.ts` — `effectiveSession`/
  `applySessionOverrides` (6 testů): beze změny při chybějícím override, částečný patch, přepis dne,
  needitovaný vstupní katalog, referenční rovnost při prázdném poli přepisů.
- **AC-3** (FR-2): `packages/domain/test/state.test.ts` — migrace v7 (bez `sessionOverrides`) → v8
  (`[]`).
- **AC-4** (FR-4, FR-5): E2E `T-178` (`schedule.spec.ts`) — úprava času katalogové aktivity
  („Fotbal — mini přípravka“, úterý 16:00 → 18:30) se ihned projeví v mřížce (`grid`).
- **AC-5** (zachování čistoty domény a determinismu): žádná nová závislost/síť v `packages/domain`;
  `applySessionOverrides` je čistá funkce bez vedlejších efektů — ověřeno existujícím `tsc --noEmit` a
  doménovým `vitest`.

## 3. Non-goals / notes

- **Konflikty/ICS export/doporučení/souhrn se netestují explicitně na `sessionOverrides`** v této dávce
  — jsou pokryty transitivně (čtou `s.catalog`, který je vždy efektivní), ale žádný NOVÝ test to
  neověřuje přímo. Pokud se ukáže potřeba, přidat cílený test (kandidát pro budoucí `BL-<NNN>`, zatím
  bez rizika — mechanismus je stejný jako u již otestovaného `ActivityOverride`).
- **Editace místa konání per-session se nezavádí** — `Session.locationOverride` zůstává čistě katalogová
  (needitovatelná uživatelem) data; celoaktivitní adresa je editovatelná už přes `ActivityOverride`
  (CHANGE-4). Per-session adresa je možné budoucí rozšíření, pokud se ukáže potřeba.
- **`SessionOverride` je jen na úrovni celé Session** (den + čas), ne na úrovni jednoho konkrétního
  kalendářního výskytu (`validFrom`/`validTo` zůstávají katalogové) — konzistentní s tím, jak
  `ActivityOverride` funguje na úrovni celé aktivity, ne jednoho zápisu.

## 4. Dodatečná zjištění ze SOTA vizuální kontroly (po prvním IMPLEMENTED)

Manuální průchod aplikací (všechny šířky, skutečný prohlížeč) odhalil tři reálné vady v FR-5
(`SessionTimeEditor`), které Playwright DOM assertions samy o sobě nezachytily:

1. **Chybějící validace `start < end` při editaci jen jednoho pole.** Původní implementace posílala
   `onChange` s `session.startMinutes`/`endMinutes` z PROPS (může být zastaralé, pokud uživatel právě
   edituje jen jedno pole) — bylo možné zapsat neplatný rozsah (např. start 18:30, end zůstalo 17:00) do
   `sessionOverrides` bez jakékoliv kontroly, protože store's `setSessionOverride` mutuje `draft` přímo
   (mimo zod `.parse()`), takže schémový `refine` se při interaktivní editaci vůbec neuplatní. **Oprava:**
   `SessionTimeRow` nyní drží řízený místní stav (`weekday`/`start`/`end`) a validuje AKTUÁLNÍ dvojici
   před voláním `onChange` — neplatná kombinace se tiše nezapíše. Nový test **T-179** tohle uzamyká.
2. **Vizuální přetečení/oříznutí „upraveno vámi" + „Obnovit".** Jeden řádek `flex items-center gap-1.5`
   se 4 prvky (den, začátek, konec) + značkou + tlačítkem přetékal z pravého panelu na desktopu — značka
   se vizuálně ořezávala o okraj panelu. **Oprava:** značka + tlačítko se přesunuly na vlastní řádek pod
   časy (`flex flex-wrap`), místo aby se tísnily do jednoho řádku.
3. **Duplicitní React `key`.** `SessionTimeEditor` dostal `key={activity.id}` — stejnou hodnotu už jako
   přímý sourozenec (ve stejném rodičovském `<div>`) používal `ActivityEditor`. React hlásil konzoli
   varování „Encountered two children with the same key" (neškodné funkčně, ale reálná chyba). **Oprava:**
   `key={`times-${activity.id}`}`.

Žádná z těchto vad nebyla zachycena existující E2E sadou před touto kontrolou (T-178 předtím testoval jen
jednopolní úpravu, která se nyní chová jinak — správně odmítnuta — proto byl T-178 upraven na
dvoupolní platnou úpravu a přidán T-179 pro záporný případ). Plná E2E `--workers=1`: 627 passed / 123
skipped / 0 failed (6 profilů).