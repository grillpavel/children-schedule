# Design Review 32 — Changes 10: mapa u každé adresy + editace vlastní události

**Status:** DRAFT
**Change ID:** CHANGE-33 (Changes 10: náhled mapy funguje i bez uložených souřadnic; vlastní událost je zpětně editovatelná; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/changes.md` → „Changes 10“. (1) Na macOS se po zadání adresy nezobrazí žádná mapa — pro plánování zcela prioritní. (2) Vlastní událost lze po vytvoření jen odstranit, ne upravit — to je špatně.

> Delta base: navazuje na náhled mapy z CHANGE-2 (`design_review_2.md` FR-8) a na vlastní události / editor detailu z Changes 8. Bez změny doménového modelu `@krouzky/domain`.

## 0. SOTA analysis

### 0.1 Problem

1. `MapLink` vykresloval tlačítko „Zobrazit mapu“ i náhled **jen když adresa měla `lat`/`lon`**. Vlastní události ukládaly `location` bez geokódování a ručně zadané adresy zůstaly bez souřadnic při výpadku sítě → uživatel po zadání adresy neviděl žádnou mapu (jen textové odkazy).
2. Detail vlastní události (`CustomEntryDetail`) nabízel pouze „Odebrat“. Store neměl `updateCustomEntry` a dialog `CustomEntryDialog` uměl jen zakládat → událost nešla opravit.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Mapa u adresy bez souřadnic (C10-1) | Tlačítko „Zobrazit mapu“ nabídnout u JAKÉKOLI adresy; chybí-li souřadnice, dohledat je geokódováním **na vyžádání** při kliknutí, pak vykreslit náhled; při neúspěchu ponechat externí odkazy + krátkou poznámku. Navíc geokódovat i při uložení vlastní události, aby souřadnice přežily do exportu. | Ponechat mapu vázanou na předem uložené souřadnice (status quo — vlastní události mapu nikdy nedostanou). |
| Editace vlastní události (C10-2) | Přidat `updateCustomEntry` do store a rozšířit `CustomEntryDialog` o režim úprav (`editEntry`) s předvyplněním; „Upravit“ v detailu otevře týž dialog, „Uložit“ zachová `id`/`childId`. | Samostatný editační formulář (duplikace celého dialogu). |

## 1. Requirements

- **FR-1 [app]** `MapLink` MUST nabídnout „Zobrazit mapu“ u každé adresy, která má ulici nebo město, i bez `lat`/`lon`. Po kliknutí, pokud souřadnice chybí, MUST je dohledat geokódováním a při úspěchu vykreslit náhled; při neúspěchu MUST ponechat externí odkazy a zobrazit poznámku.
- **FR-2 [app]** Vytvoření vlastní události s adresou MUST spustit geokódování a uložené souřadnice doplnit, aby náhled fungoval okamžitě i po exportu.
- **FR-3 [app]** Store MUST mít akci `updateCustomEntry(entry)`, která nahradí vlastní událost podle `id` (undo/redo přes stávající `commit`).
- **FR-4 [app]** Detail vlastní události MUST nabídnout „Upravit“, které otevře `CustomEntryDialog` předvyplněný stávajícími hodnotami; „Uložit“ MUST zachovat `id`/`childId` a promítnout změny do detailu.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: po vytvoření vlastní události s adresou bez souřadnic je v detailu přítomné tlačítko „Zobrazit mapu“. (Ověřeno: `hasMapButton = true`.)
- **AC-2 → FR-2/FR-3** `apps/web` `tsc --noEmit` čisté; store obsahuje `updateCustomEntry`; geokódování je zapojeno v `CustomEntryDialog.save`.
- **AC-3 → FR-4** Playwright: „Upravit“ otevře dialog s titulkem „Upravit událost“ a předvyplněným názvem; po změně a „Uložit“ ukazuje detail nový název. (Ověřeno: `dialogTitle = "Upravit událost"`, `prefilledName = "Logopedie"`, heading → `✎ Logopedie U Martina`.)

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` (81) zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Skutečné vykreslení dlaždic mapy vyžaduje síť (Nominatim + OSM); v sandboxu je síť blokovaná, proto se v E2E ověřuje jen přítomnost tlačítka a fallback, ne obsah `<iframe>`.
- Napovídání adresy (Mapy.cz suggest) a nativní značkové dlaždice zůstávají mimo — tracked as **BL-004**/**BL-005**.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
