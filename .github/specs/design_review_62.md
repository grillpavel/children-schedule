# Design Review 62 — Typ vlastní události (Kroužek/Škola/Lékař/Jiné)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-63 (**engine `@krouzky/domain` 0.3.0 → 0.4.0** + app `@krouzky/web`: implementace
FR-4 z `design_review_58.md` — nové pole `CustomEntry.kind`, `schemaVersion` 4 → 5)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (packages/domain + apps/web + test)
**Trigger:** pokračování v implementaci `design_review_58.md` (DRAFT CHANGE-59) po CHANGE-60/61/62.

## 0. SOTA analysis

- **0.1 Problem.** Supersedes `design_review_58.md` §1 FR-4 (CHANGE-59, DRAFT). „Vlastní událost" byla
  jediné obecné tlačítko/dialog bez typu — žádné rozlišení Kroužek/Škola/Lékař/Jiné, žádná odpovídající
  výchozí barva. Doména navíc měla `CustomEntry.colorOverride` pole už definované, ale **nikde
  nepoužité** (`useScheduleView.ts` bralo barvu jen z `activityId`-vázaných override, custom entries
  vždy dostaly jednu pevnou barvu `CUSTOM_COLOR`).
- **0.2 Approach.**
  - Domain: nové pole `kind: z.enum(['circle','school','doctor','other']).default('other')` na
    `customEntrySchema` — `.default()` znamená, že staré uložené soubory bez pole projdou migrací beze
    ztráty dat. `schemaVersion` 4 → 5, nový migrační krok v `io.ts` (v4→v5, no-op bump — default doplní
    zod při parsování). Engine verze **0.3.0 → 0.4.0** (MINOR — nová zpětně kompatibilní funkce).
  - App: `CustomEntryDialog` dostal řadu přepínačů typu (chip s ikonou, `aria-pressed`) hned pod názvem
    dialogu; `kind` se ukládá do entry. `useScheduleView.ts` nově **skutečně používá** `colorOverride`
    (pokud je nastaven) nebo výchozí barvu podle `kind` (`KIND_DEFAULT_CSS`) — `'other'` záměrně zůstává
    na původní `CUSTOM_COLOR`, aby se nezměnil vzhled existujících/migrovaných událostí (žádná
    neočekávaná vizuální regrese). `DetailsPanel`'s `CustomEntryDetail` zobrazuje typový štítek (ikona +
    popisek).
  - Zamítnutá alternativa: perzistentní per-dítě nastavení „minimální čas na přesun" (zmíněné ve FR-8,
    ne FR-4) — mimo scope tohoto change, řešeno zvlášť v CHANGE-65 bez nové schema verze (viz tam).

## 1. Requirements

- **FR-4** „Vlastní událost" nabízí při otevření volbu typu (Kroužek/Škola/Lékař/Jiné) s odpovídající
  výchozí barvou; typ se ukládá a zobrazuje v detailu i v rozvrhu (barva bloku).

## 2. Acceptance criteria

- **AC-1** Doménové testy: `packages/domain/test/state.test.ts` — nový migrační test „v4 (bez
  CustomEntry.kind) → v5 (kind: 'other')"; `ics-import.test.ts`/`ics.test.ts` upraveny o `kind: 'other'`
  na fixture datech.
- **AC-2** Nový **T-161** (`schedule.spec.ts`): vlastní událost typu „Škola" má v detailu ikonu 🏫 a
  popisek „Škola".
- **AC-3** `vitest` (domain) zelené; `tsc --noEmit` (domain + web) čisté; **T-152** (bajtově shodný
  round-trip JSON) zůstává zelený i s novým polem; plná E2E `--workers=1` zelená.

## 3. Non-goals / notes

- Ruční výběr barvy pro vlastní událost (nezávisle na `kind`) — `colorOverride` je v datovém modelu
  připraven, ale dialog zatím nenabízí barevný picker (jen typ určuje výchozí barvu). Kandidát na
  budoucí BL, pokud si to uživatelé vyžádají.
- Per-dítě konfigurovatelný „minimální čas na přesun" — patří k FR-8 (CHANGE-65), ne k tomuto change.
