# Design Review 10 — Zaveď taxonomii katalogu, mikrointerakce a tisk

**Status:** DRAFT
**Change ID:** CHANGE-11 (vlna 3 z Changes 6/7: dvouúrovňové seskupení katalogu, sbalitelné skupiny, feedback toast + reduced motion, tiskový přehled; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** Po CHANGE-10 byl průchod rozhodováním funkční, ale katalog stále nebyl informačně škálovatelný pro větší data a chyběl konzistentní feedback i použitelný tiskový výstup.

> Delta base: supersedes `design_review_9.md` §0–§2 (CHANGE-10) v organizaci levého sloupce a UX polish vrstvě.

## 0. SOTA analysis

### 0.1 Problem

1. Dlouhý seznam bez struktury je při vyšším počtu položek pomalý na orientaci.
2. Uživatel postrádal rychlé sbalení/rozbalení skupin a kontext podkategorií.
3. Interakční feedback po změně stavu nebyl dostatečně čitelný.
4. Tisk měl jen mřížku bez doprovodného tabulkového přehledu kroužků.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Taxonomie katalogu (C7-T8–T12, C7-S3) | Dvouúrovňové seskupení v UI (`kořen → podkategorie`) s počty a sbalováním; kořenové i podskupiny se pamatují v sessionStorage; `Sport a pohyb` se vždy rozpadá do podkategorií. | Ponechat jednotný lineární seznam bez seskupení. |
| Ovládání hustoty seznamu | Přidány akce `Rozbalit vše` / `Sbalit vše` pro rychlou manipulaci skupin. | Ruční rozbalování každé skupiny zvlášť. |
| Mikrointerakce (C6-I1, C6-I3, C6-I6) | Výraznější hover stav karet, globální toast po změně s akcí `Zpět`, motion-safe animace a úplné vypnutí animací pod `prefers-reduced-motion`. | Bez toastu, bez centralizovaného reduced-motion režimu. |
| Tisk (C6-K1–K3) | Rozšířen print layout: čistší tiskový styl + tabulkový přehled kroužků pod mřížkou. | Tisk jen vizuální mřížky bez textového seznamu. |

## 1. Requirements

- **FR-1 [app]** Levý sloupec MUST zobrazovat dostupné kroužky ve dvou úrovních (kořen + podkategorie) s počty položek.
- **FR-2 [app]** Skupiny MUST být sbalitelné; stav sbalení kořenů i podskupin MUST přežít v rámci relace.
- **FR-3 [app]** Katalog MUST nabídnout `Rozbalit vše` a `Sbalit vše`.
- **FR-4 [app]** Po změně stavu MUST být zobrazen toast s akcí `Zpět`.
- **FR-5 [app]** Aplikace MUST respektovat `prefers-reduced-motion` a vypnout animace/transition efekty.
- **FR-6 [app]** Tiskový výstup MUST obsahovat kromě mřížky i tabulkový přehled kroužků (název, den, čas).

## 2. Acceptance criteria

- **AC-1 → FR-1/FR-2** Ruční test: katalog zobrazuje kořenové skupiny s počty; klik rozbalí/sbalí kořen i podkategorii.
- **AC-2 → FR-2/FR-3** Ruční test: `Rozbalit vše`/`Sbalit vše` funguje; po přepnutí panelu/filtrů stav skupin v relaci zůstává.
- **AC-3 → FR-4** Ruční test: po změně stavu se ukáže toast a tlačítko `Zpět` provede undo.
- **AC-4 → FR-5** Ruční test: při `prefers-reduced-motion: reduce` nejsou viditelné animace.
- **AC-5 → FR-6** Ruční test: tisk obsahuje mřížku i textovou tabulku kroužků.

Globální gate: TS diagnostika upravených souborů bez chyb.

## 3. Non-goals / notes

- Tato vlna neřeší ještě virtualizaci seznamu nad 100 položek ani fuzzy „nejbližší shodu“ pro prázdné hledání.
- Dvouúrovňová taxonomie je nyní aplikační klasifikace v UI; datový model `category/subcategory` zůstává kandidát na další engine/data změnu (tracked as BL-016).
- Vlny s drag-and-drop, pokročilou konfliktní logikou a plnou tiskovou shodou napříč prohlížeči zůstávají mimo tento inkrement.
