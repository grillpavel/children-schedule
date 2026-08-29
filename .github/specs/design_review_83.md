# Design Review 83 — Vlna 3, FR-W3-1: drag & drop pro vlastní události (design_review_73.md)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-90 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Trigger:** Pokračování a DOKONČENÍ BL-052 po CHANGE-89 (FR-W3-4) — poslední položka Vlny 3.

## 0. SOTA analýza

- Katalogové kroužky (`item.activityId !== undefined`) zůstávají needitovatelné — termín určuje
  poskytovatel, ne rodič. Drag & drop se týká VÝHRADNĚ vlastních událostí (`CustomEntry`,
  `item.activityId === undefined`) — guard `if (item.activityId !== undefined) return;` na
  začátku všech nových handlerů.
- Existující `role="grid"` kontejner už má `onKeyDown` pro ←/→ navigaci MEZI SLOUPCI (T-304,
  roving tabindex `focusedCol`). Nové ←/→/↑/↓ handlery na jednotlivém bloku volají
  `e.stopPropagation()`, ať se při fokusu na konkrétní vlastní událost šipky použijí na POSUN
  události, ne na přeskočení sloupce — T-304 zůstal beze změny zelený (testuje fokus na
  `gridcell`, ne na block `button`).
- Víceřádková vlastní událost (víc dnů v týdnu) má jednu `session` na den — přesun jednoho
  vizuálního bloku mění JEN dotčenou `sessionId`, ne celý `entry.sessions` pole.
- Cílový den při tažení myší se čte z `data-weekday` atributu nejbližší `[role="gridcell"]` pod
  ukazatelem (`document.elementFromPoint`) — odolnější vůči zaokrouhlování šířek sloupců než
  ruční přepočet z `clientX`/šířky mřížky (stejný přístup jako dřívější BL-051 vyšetřování,
  design_review_77.md).
- Beze změny domény ani `schemaVersion` — přesun session je jen `updateCustomEntry` (existující
  store akce používaná i editačním dialogem), žádná nová validace/migrace nebyla potřeba.

## 1. Requirements

- **FR-W3-1**: Pointer events (ne HTML5 `dragAndDrop` — T-305 vyžaduje, aby CELÝ tok fungoval
  BEZ tažení, tj. i bez podpory nativního drag & drop) přesunou vlastní událost v mřížce; snap
  na 5 minut; POVINNÁ klávesová obdoba (šipky). Katalogové kroužky needitovatelné.
- Práh 6px (`Math.hypot(dx, dy) < 6`) odliší začátek tažení od kliknutí — klik dál otevírá
  detail (`selectCustomEntry`), tažení klik potlačí (`suppressClickRef`).
- Vizuální náhled cílové pozice (`data-testid="drag-preview"`) během tažení.

## 2. Acceptance criteria

- **AC-1 (T-232)**: Fokus na vlastní událost + ↓×3 posune čas o 15 min (5min snap); → přesune
  do sousedního dne (zmizí z pondělního `gridcell`, objeví se v úterním).
- **AC-2 (T-233)**: Skutečné tažení myší (`page.mouse.down/move/up`, vícekrokové) změní čas
  bloku a klik neotevře detail (na rozdíl od prostého kliknutí).
- **T-304, T-305 beze změny zelené** — grid-column navigace šipkami (jiný focus target) a
  „celý tok přidání funguje bez tažení" zůstávají platné.
- `tsc --noEmit` (web) čisté; plná E2E sada 0 failed.

## 3. Non-goals

- Nemění šířku/výšku události tažením za okraj (jen posun, ne resize) — mimo scope tohoto changu.
- Nekontroluje kolize při puštění (drop na kolidující slot je povolený, stejně jako ruční editace
  v `SessionTimeEditor` — kolize se zobrazí až následně přes existující odznaky).

BL-052 je tímto **DOKONČENO** (0 zbylých položek Vlny 3).
