# Design Review 96 — per-dítě přepis termínu sdílené katalogové položky + sheet detailu se vždy otevírá rozbalený

**Status:** IMPLEMENTED
**Change ID:** CHANGE-103 (engine `@krouzky/domain` 0.10.0 → 0.11.0 + app `@krouzky/web`)
**Date:** 2026-08-31
**Repo:** monorepo `Children_schedule` (`packages/domain` + `apps/web`)
**Trigger:** dvě přímo nahlášené chyby: (1) „Kroužek 'Škola' se při vložení do kalendáře jednoho
dítěte automaticky propíše i pro druhé dítě.", (2) `.github/audit/after_review_95/
spec_modal_otevirani_detailu.md` — detail existující položky v rozvrhu se na mobilu vždy otevírá
minimalizovaný ("peek"), zatímco referenční „+ Vlastní událost" je vždy rovnou plně rozbalená.

## 0. SOTA analýza

### 0.1 Problém 1 — sdílený `SessionOverride`

Reprodukováno živě (dvě děti, obě zapsané do ZŠ „Výuka", úprava termínu jen u jednoho): po úpravě
Moje-dítě na 07:30–12:00 ukazovalo i Bedřichovo dítě stejný čas, ačkoli jeho zápis nikdo needitoval.

Root cause: `SessionOverride` (design_review_69.md, CHANGE-74) je klíčovaný jen `sessionId` —
nemá `childId`. Store si přepočítává CELÝ sdílený `catalog` field jednorázově
(`applySessionOverrides`), takže úprava termínu se promítne úplně všem, kdo mají zápis do stejné
katalogové položky/skupiny. To je v pořádku pro kroužek vedený jedním poskytovatelem (všichni
přihlášení chodí opravdu na stejný čas) — ale rozbíjí se přesně u „Škola" (ZŠ „Výuka", CHANGE-98
placeholder), kde je to JEDNA sdílená katalogová položka, ale KAŽDÉ dítě má ve skutečnosti svůj
vlastní rozvrh/třídu.

### 0.2 Problém 2 — sheet detailu se vždy otevírá minimalizovaný

`apps/app/page.tsx`'s `sheetExpanded` (mobilní spodní sheet) má výchozí `useState(false)` a
`closeMobileSheet()` ho po každém zavření znovu nastaví na `false` — sheet se tak VŽDY otevře jako
„peek" (jen `h-60`), teprve klik na ikonu ⤢ ho rozbalí na `h-[70dvh]`. `CustomEntryDialog` žádný
takový mezikrok nemá (jiná komponenta, rovnou plný modal, `fixed inset-0`).

### 0.3 Zvolený přístup a zamítnuté alternativy

**Problém 1 — varianta A (zvolena, potvrzeno uživatelem):** `SessionOverride` dostal volitelný
`childId`. Chybí-li, přepis platí GLOBÁLNĚ (zpětně kompatibilní se stávajícími daty). Je-li
vyplněný, platí jen pro TOTO dítě — aplikuje se až při skládání konkrétního zápisu
(`resolvePlacedSessions`/`placeEnrollment`), ne na sdílený katalog. Nové úpravy přes „Upravit časy"
od teď VŽDY zapisují `childId = aktivní dítě`.

Zamítnuté alternativy:
- **B — "vidlicování" skupiny při první úpravě** (vytvořit tichou privátní kopii `SessionGroup` pro
  dítě, které edituje sdílenou skupinu) — funkčně podobný výsledek, ale je to obezlička mimo
  existující `ActivityOverride`/`SessionOverride` vzor, hůř se do budoucna ladí a testuje.
- **C — zakázat druhé dítě zapsat do stejné katalogové položky** — nejmenší zásah, ale neřeší to
  obecně (další „PŘEDPŘIPRAVENÉ" ZUŠ položky mají stejné riziko), jen schová symptom.

**Problém 2 (zvoleno, potvrzeno uživatelem):** 2řádková oprava — `sheetExpanded` výchozí `true`,
`closeMobileSheet()` resetuje na `true` (ne `false`). Tlačítko ⤢/⤡ (zmenšit/zvětšit) zůstává funkční
— rodič si sheet může ručně zmenšit, jen se to už neděje samo. Nedotýká se desktopu/tabletu (medium
drawer 900–1439px žádný peek stav nemá, je vždy plný).

## 1. Requirements

- **FR-1**: `SessionOverride` má volitelný `childId`; bez něj platí globálně (zpětná kompatibilita),
  s ním jen pro dané dítě.
- **FR-2**: `setSessionOverride` (Toolbar/DetailsPanel „Upravit časy") vždy zapisuje pod aktivní
  dítě; `clearSessionOverride` ruší přepis aktivního dítěte, případně starší globální (fallback).
- **FR-3**: Zobrazení/editace termínu v `DetailsPanel` (výběr varianty, „Varianty docházky",
  editor časů) ukazuje SKUTEČNÝ efektivní čas AKTIVNÍHO dítěte, ne sdílený katalogový/jiného dítěte.
- **FR-4**: Detekce konfliktů (`detectConflicts`), souhrn týdne (`scheduleSummary`) a export .ics
  (`generateIcs`) reflektují per-dítě přepsaný čas.
- **FR-5**: Mobilní spodní sheet detailu se vždy otevírá plně rozbalený; ruční zmenšení zůstává
  dostupné, jen už není výchozí stav.

## 2. Acceptance criteria

- **AC-1**: dvě děti zapsané do stejné katalogové položky (ZŠ „Výuka") — úprava termínu jednoho
  dítěte přes „Upravit časy" NEZMĚNÍ zobrazený/uložený čas druhého dítěte (ověřeno živě: Bedřichův
  blok zůstal 08:00–08:45 po úpravě Moje-dítě na 07:30–12:00).
- **AC-2**: `sessionOverrides` v uloženém stavu nese `childId` u nově vytvořených přepisů.
- **AC-3**: export .ics pro KAŽDÉ dítě nese jeho VLASTNÍ efektivní čas u sdílené položky.
- **AC-4**: klik na existující položku v rozvrhu (katalogová i vlastní událost) na mobilu ukáže
  rovnou plný obsah (Varianty docházky, Upravit časy, Popis kroužku…), bez nutnosti kliknout na ⤢.
- **AC-5**: plná 6profilová E2E sada beze změny v celkovém počtu úspěchů oproti CHANGE-102 baseline
  (743 passed / 247 skipped / 0 failed).

## 3. Non-goals / notes

- `suggestVariantSwitches` (návrh bezkolizní varianty) a `buildRecommendations` (doporučovací
  engine) NEBYLY protaženy o per-dítě `sessionOverrides` — obě fungují nad JEDNÍM dítětem už dnes
  (nehrozí cross-child leak), jen by jejich vnitřní heuristika mohla použít mírně zastaralý
  (globálně opravený, ne osobně upravený) čas ve svém vlastním výpočtu. Nízké riziko, mimo rozsah
  nahlášeného bugu — kandidát na budoucí BL, pokud se ukáže potřebný.
- Katalogový náhled (nezapsaná položka v seznamu, `sessionLabel()` v `CatalogPanel.tsx`) dál ukazuje
  obecný/globální čas — jakmile se dítě zapíše, `DetailsPanel` už ukazuje jeho osobní efektivní čas.
  Personalizace náhledu PŘED zápisem nebyla součástí hlášené chyby.
- Žádný `schemaVersion` bump — `childId` je aditivní volitelné pole (stejný precedent jako
  `Child.age` v CHANGE-95).

## 4. Ověření

- `tsc --noEmit` čisté (domain + web).
- Domain vitest 135/135 (beze změny — zpětná kompatibilita potvrzena).
- Živé ověření obou oprav (headless Chromium, popsáno v AC-1/AC-4).
- Plná 6profilová E2E sada: viz CHANGELOG.
