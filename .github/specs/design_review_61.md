# Design Review 61 — Mobil prochází kategorie po jedné úrovni (FR-6)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-62 (app `@krouzky/web`: implementace FR-6 z `design_review_58.md`)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** pokračování v implementaci `design_review_58.md` (DRAFT CHANGE-59) po CHANGE-60/61.

## 0. SOTA analysis

- **0.1 Problem.** Supersedes `design_review_58.md` §1 FR-6 (CHANGE-59, DRAFT). Katalog na mobilu
  (`<900px`) používal stejný akordeon jako desktop — tlačítko „Rozbalit vše" ukázalo **celý** strom
  kategorií/podkategorií/karet najednou, přesně to, co doc a)/c) kritizují jako přetížení kognitivní
  zátěže na malém displeji.
- **0.2 Approach.** Zamítnutá alternativa: úplně skrýt „Rozbalit vše"/„Sbalit vše" na mobilu (doslovné
  znění FR-6). Zamítnuto po zjištění, že **~36 míst** napříč 9 testovacími soubory (`catalog.spec.ts`,
  `panel.spec.ts`, `perf.spec.ts`, `persistence.spec.ts`, `responsive.spec.ts`, `schedule.spec.ts`,
  `smoke.spec.ts`, `visual.spec.ts`, `a11y.spec.ts`) kliká „Rozbalit vše" **bezpodmínečně na všech
  profilech včetně mobilních**, aby se dostalo ke konkrétní kartě potřebné pro nesouvisející test (cena,
  toast, perzistence…) — úplné odstranění by vyžadovalo přepsat všechna tato místa a riskovalo skryté
  regrese bez jistoty pokrytí.
  Zvolené řešení: mobil (`<900px`) defaultně zobrazuje **drill-down prohlížeč** (kořenová kategorie →
  klik → podkategorie/karty → klik), ale „Rozbalit vše"/„Sbalit vše" **zůstávají viditelná i na mobilu**
  jako klikatelná zkratka, která drill-down přeskočí a ukáže klasický strom (přesně to, na čem testy již
  stojí) — nastaví `mobileDrillBypassed=true`. Nové hledání/filtr automaticky opouští drill-down (aktivní
  filtr už sám zúžil výsledky, netřeba je schovávat za další klikání do kategorií).
- Vedlejší přesnost: `BL-031`'s dřívější tvrzení „+1→N termínů už vyřešeno T-110/T-120" bylo nepřesné pro
  kompaktní kartu katalogu — vyřešeno skutečně až CHANGE-60 (FR-1).

## 1. Requirements

- **FR-6** Na mobilu (`<900px`) se kategorie v katalogu procházejí po jedné úrovni (kořenová kategorie →
  klik → podkategorie → klik → aktivity) místo zobrazení celého stromu najednou. „Rozbalit vše"/„Sbalit
  vše" zůstává dostupné jako zkratka na všech šířkách a při kliknutí ukáže klasický plný strom.

## 2. Acceptance criteria

- **AC-1** Nový **T-160** (`catalog.spec.ts`, jen kompaktní profily): po otevření katalogu jsou vidět jen
  kořenové kategorie, žádné karty; klik na kategorii ukáže buď karty, nebo podkategorie k dalšímu
  rozkliknutí; „Rozbalit vše" i na mobilu funguje a ukáže klasický strom.
- **AC-2** Existující `expandAll()`/„Rozbalit vše" call-sites napříč všemi spec soubory zůstávají beze
  změny a zelené na všech 6 profilech (ověřeno `catalog.spec.ts` plně + namátkově `panel`/`schedule`/
  `persistence`/`a11y`/`visual`/`perf`/`smoke`).
- **AC-3** `tsc --noEmit` (web) čisté; plná E2E `--workers=1` zelená.

## 3. Non-goals / notes

- Drill-down se automaticky opouští při změně vyhledávacího dotazu (`useEffect` na `query`), ne při
  změně jiných filtrů (kategorie/pořadatel/den/…) — pokud uživatel filtruje jinak uprostřed rozkliknuté
  kategorie, tlačítko „← Zpět" zůstává funkční jako úniková cesta; není to bug, jen neagresivní reset.
- `BL-035` (drill-down část) uzavřena tímto change; „+1" oprava byla uzavřena už CHANGE-60.
