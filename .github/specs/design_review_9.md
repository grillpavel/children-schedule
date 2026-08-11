# Design Review 9 — Zaveď rozhodovací filtry a mobilní agendu

**Status:** DRAFT
**Change ID:** CHANGE-10 (vlna 2 z Changes 6/7: vícevýběr dnů, časové filtry, „vejde se mi to“, sekce „V rozvrhu“, mobilní Agenda default, zúžení pravého panelu, cena v Kč/měsíc; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** Po CHANGE-9 je první průchod použitelný, ale rozhodovací krok stále chyběl: rodič potřebuje filtrovat podle více dnů/času, rychle vidět co už je v rozvrhu a na mobilu mít čitelný výchozí pohled.

> Delta base: supersedes `design_review_8.md` §0–§2 (CHANGE-9) v katalogové filtraci a mobilním zobrazení.

## 0. SOTA analysis

### 0.1 Problem

1. Jednovýběrový den neodpovídá realitě rozhodování (`Út nebo Čt`).
2. Chybělo časové omezení (`začátek nejdřív`, `konec nejpozději`) a „vejde se mi to“ filtr.
3. V seznamu nebylo zřejmé, co už je v rozvrhu, takže uživatel ztrácel kontext.
4. Na mobilu byla výchozí mřížka týdne, která je při šířce telefonu špatně čitelná.
5. Cena byla bez měsíčního ekvivalentu, což ztěžovalo porovnání.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Dny + čas (C7-F2, C7-F6) | Multi-čipy `Po–Ne` + pokročilé filtry s časovým oknem (`type=time`) a průnikem přes sessiony variant. | Zachovat dropdown jednoho dne a bez časového filtru. |
| „Vejde se mi to“ (C7-F3) | Filtruje aktivity, kde aspoň jedna varianta nekoliduje s existujícími zápisy/vlastními událostmi aktivního dítěte. | Jen informační badge bez filtrování. |
| Kontext výběru (C7-S1, C7-C9) | Sekce `V rozvrhu (N)` + stavový štítek `Přidáno` na kartách. | Nechat jednotný seznam bez seskupení. |
| Mobil (C6-H1) | Výchozí pohled v mobilu je Agenda s možností přepnout na mřížku. | Držet mřížku jako jediný výchozí režim. |
| Cena (C6-G4) | Zobrazovat měsíční ekvivalent + původní periodu v závorce. | Ukazovat pouze původní periodu (`rok/pololetí`). |

## 1. Requirements

- **FR-1 [app]** Katalog MUST podporovat vícevýběr dnů a časové okno (od/do) jako kombinovatelné filtry.
- **FR-2 [app]** Přepínač `Vejde se mi to` MUST skrýt aktivity, které ve všech variantách kolidují s aktuálním rozvrhem aktivního dítěte.
- **FR-3 [app]** Seznam MUST zobrazit samostatnou sekci `V rozvrhu` a stav `Přidáno` u již zapsaných položek.
- **FR-4 [app]** Mobilní výchozí pohled MUST být Agenda; uživatel MUST mít možnost přepnout na mřížku.
- **FR-5 [app]** Cena aktivity v katalogu a detailu MUST zobrazit odvozenou hodnotu v Kč/měsíc spolu s původní periodou.
- **FR-6 [app]** Pravý panel se při prázdném rozvrhu MUST zúžit, aby neubíral hlavní plochu.

## 2. Acceptance criteria

- **AC-1 → FR-1** Ruční test: lze aktivovat více dní najednou; časové filtry zúží výstup jen na položky splňující okno.
- **AC-2 → FR-2** Ruční test: při aktivním `Vejde se mi to` zmizí položky s kolizními variantami.
- **AC-3 → FR-3** Ruční test: přidané aktivity se přesunou do sekce `V rozvrhu` a zobrazí štítek `Přidáno`.
- **AC-4 → FR-4** Ruční test na mobilní šířce: default je Agenda; přepínač zobrazí mřížku.
- **AC-5 → FR-5** Ruční test: cena je ve formátu `X Kč/měs (Y Kč/perioda)`.
- **AC-6 → FR-6** Ruční test: při nulových položkách je pravý panel na desktopu užší.

Globální gate: TS diagnostika upravených souborů bez chyb.

## 3. Non-goals / notes

- Neřeší se ještě stromová taxonomie, sticky skupiny a virtualizace seznamu (zůstává v BL-016).
- Neřeší se drag-and-drop ani rozšířená konfliktní logika dojezdu/sourozenců (zůstává v BL-016).
- Geokódování katalogu při buildu (`C6-D3`) je zachované jako datová příprava mimo runtime webu; tato změna neprovádí nový build pipeline krok.
