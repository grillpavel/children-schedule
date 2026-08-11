# Design Review 16 — Uživatelské stropy v souhrnu

**Status:** DRAFT
**Change ID:** CHANGE-17 (vlna 6 z Changes 8: volitelné stropy „max obsazených odpolední“ a „max Kč/měsíc“ s upozorněním; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-B5: kolik kroužků/peněz je „moc“, rozhoduje rodič. Aplikace má varovat až po překročení uživatelem zvoleného stropu, ne diktovat škálou.

> Delta base: supersedes `design_review_11.md` §0–§2 (CHANGE-12) v souhrnu; navazuje na metriky z CHANGE-12/CHANGE-15. Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Souhrn ukazuje obsazenost a náklady, ale nezná uživatelův práh „co je moc“ (C8-B4/C8-B5).
2. Bez volitelného stropu nelze varovat cíleně a bez normativní barevné škály.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Uživatelské stropy (C8-B5) | Dvě volitelná číselná pole (`max obsazených odpolední`, `max Kč/měsíc`) v souhrnu; upozornění jen po překročení; hodnoty se pamatují v relaci (`sessionStorage`). | Pevná barevná škála zelená–červená, která rozhoduje za rodiče. |
| Perzistence | `sessionStorage` (efemérní preference), konzistentní se sbalováním katalogu. | Ukládat prahy do `PlannerState` (znečišťuje sdílený/serializovaný stav). |

## 1. Requirements

- **FR-1 [app]** Souhrn MUST nabídnout dvě volitelná pole `max obsazených odpolední` a `max Kč/měsíc`; jejich hodnoty MUST přežít v rámci relace.
- **FR-2 [app]** Při překročení nastaveného stropu MUST souhrn zobrazit upozornění; při prázdném stropu se upozornění MUST NOT zobrazit.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: zadané hodnoty jsou v `sessionStorage` a zůstanou po přepnutí.
- **AC-2 → FR-2** Playwright: strop odpolední 0 při 1 obsazeném → upozornění; strop 5 → bez upozornění; rozpočet 50 při 125 Kč/měs → upozornění.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Přepnutí kalendáře klikem na den obsazenosti (C8-B7) a per-den rozpad obsazenosti nejsou součástí této vlny.
- Prahy jsou efemérní (relace); trvalé uložení do souboru není cílem.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
