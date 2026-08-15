# Design Review 41 — Ověřená uzávěrka 26/27 a oprava Info slide-overu na středních šířkách

**Status:** IMPLEMENTED
**Change ID:** CHANGE-42 (ověřená `applicationDeadline` 2026/2027 + české formátování data; Info slide-over přesunut dovnitř `<main>`, aby nezakrýval lištu — engine data `@krouzky/domain/data` je beze změny, app `@krouzky/web` + testy)
**Date:** 2026-08-12
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** (1) Uživatel dodal ověřenou uzávěrku přihlášek **30. 6. 2027** pro školní rok 2026/27 → lze dokončit T-140 (BL-017). (2) Dokončení odhalilo reálnou vadu: Info slide-over na středních šířkách (900–1440) byl `fixed inset-y-0` a **zakrýval pravou část nástrojové lišty** (Uložit/Další) → akce nešly kliknout; funkční E2E na středních profilech padaly.

## 0. SOTA analysis
- **0.1 Problem.** (a) META neneslo žádnou ověřenou uzávěrku (`applicationDeadline`), T-140 byl `test.fixme` (BL-017). Datum se navíc zobrazovalo jako syrové ISO. (b) Slide-over `fixed inset-y-0 right-0` sahal od horního okna dolů → překrýval Toolbar; `saveAndRead`/`detailScope` na středních profilech selhávaly, protože detail je mimo `<main>` a lišta byla nedostupná.
- **0.2 Approach.** (a) Adaptér `novestraseci` plní jednotnou ověřenou uzávěrku ročníku `APPLICATION_DEADLINE_2026_2027 = '2027-06-30'` jako výchozí (META ji může přebít per kroužek). `DetailsPanel` zobrazí datum česky (`formatCzDate`: `30. 6. 2027`). (b) Slide-over přesunut **dovnitř `<main>`** jako `absolute inset-y-0 right-0` (main dostal `relative`) → overlay kryje jen plochu pod lištou, ne lištu. Testy (`panel`/`catalog`/`schedule`) na středních šířkách míří na `getByTestId('info-drawer')` a otevírají Souhrn přes tlačítko, souhrnová tvrzení scopují na viditelný panel (kvůli duplicitě textu ve skrytém sloupci i draweru).

## 1. Requirements
- **FR-1 [data/app]** Aktivity nesou ověřenou `applicationDeadline` 2027-06-30 (ročník 26/27); detail ji zobrazí jako „Uzávěrka přihlášek: 30. 6. 2027".
- **FR-2 [app]** Info slide-over (900–1440) nezakrývá nástrojovou lištu — je to overlay uvnitř `<main>`.

## 2. Acceptance criteria
- **AC-1 → FR-1** E2E T-140 zelený na všech nekompaktních profilech (`test.fixme` odstraněn).
- **AC-2 → FR-2** Funkční E2E (`panel`/`catalog`/`schedule`/`persistence`) zelené na středních profilech (desktop-narrow, tablet-landscape); T-152/T-154 (Uložit) projdou. Celá sada `--workers=1`: 445+ passed, 0 failed; `tsc` (web) čisté; app HTTP 200.

## 3. Non-goals / notes
- Per-kroužek různé uzávěrky — teď jednotná ročníková; META umožní budoucí přebití.
- Krajské jarní prázdniny podle `districtCode` zůstávají v **BL-020**.
- Plnou sadu pouštět `--workers=1` (paralelní workery proti dev serveru dávají falešné pády).
