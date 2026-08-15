# Design Review 42 — Changes 11: filtr pořadatele, oprava CTA, zjednodušený pravý sloupec, celodenní osa

**Status:** IMPLEMENTED
**Change ID:** CHANGE-43 (filtr podle pořadatele; funkční „Přidat první kroužek"; přepnutí pravého sloupce na připnutý souhrn + zeštíhlený detail; celodenní osa kalendáře s výchozím oknem 07–21 a rolováním — app `@krouzky/web`)
**Date:** 2026-08-15
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** Uživatelské testování (changes.md „Changes 11") odhalilo čtyři vady: chybí filtr podle pořadatele; tlačítko „Přidat první kroužek" na desktopu nic nedělá; pravý sloupec je přehlcený a nemá pevně viditelný souhrn; kalendář ukazuje jen 07–21 bez možnosti přidat/zobrazit záznamy mimo toto okno.

## 0. SOTA analysis
- **0.1 Problem.**
  - (A) Katalog nelze filtrovat podle pořadatele (DDM, SCNS, SOKOL…); data `catalog.providers` + `activity.providerId` existují, jen chybí UI a predikát.
  - (B) `onAddFirstActivity` volá jen `setMobileTab('catalog')` — na desktopu (kde je katalog stálý) to nemá efekt, tlačítko je mrtvé.
  - (C) Pravý sloupec míchá souhrn i detail v jednom rolovacím sloupci; souhrn (obsazenost/náklady/kolize) zmizí při odrolování. Detail obsahuje mnoho polí nad rámec toho, co uživatel chce vidět.
  - (D) Osa kalendáře je oříznuta na 07–21 (CHANGE-36); záznam mimo toto okno nelze zobrazit ani přidat.
- **0.2 Approach.**
  - (A) Přidat `<select>` pořadatele do levých filtrů; predikát `a.providerId === providerFilter`. Alternativa (jen fulltext přes jméno pořadatele — už existuje v hledání) zamítnuta: nedává tvrdý filtr ani přehled seznamu pořadatelů.
  - (B) `onAddFirstActivity` → zaměří pole hledání v katalogu a vybere první kroužek (otevře jeho detail); na mobilu navíc přepne na záložku Katalog. Alternativa (jen fokus pole) zamítnuta — uživatel chce rovnou vidět detail.
  - (C) Rozdělit pravý sloupec na **připnutou** hlavičku (vždy viditelnou: a) Obsazenost týdne, b) Souhrn týdne, c) Náklady celkem: částka/rok) a **rolovací** tělo (detail vybraného kroužku s přesně 6 poli + Konflikty a upozornění). Detail zeštíhlit na 6 položek dle zadání; ostatní pole a sekce souhrnu odebrat a zaznamenat do backlogu. Konflikty ponechat (klíčová hodnota „uvidíte kolize" + přístupnostní test T-309) jako rolovací sekci „ostatní pod tím". Alternativa (vše smazat včetně konfliktů) zamítnuta — ztratila by bezpečnostní funkci a shodila test.
  - (D) Vrátit osu na celý den (`DAY_START_MIN=0`, `DAY_END_MIN=24*60`), ale výchozí odrolování ukázat denní okno (kolem 07:00). Rolování (kolečko/prst/posuvník) i přidání záznamu mimo 07–21 tím funguje nativně. Supersedes design_review_35.md §FR-1 (CHANGE-36) — okno 07–21 se z „tvrdého ořezu osy" mění na „výchozí viditelné okno".

## 1. Requirements
- **FR-1** Levý sloupec má filtr podle pořadatele; výběr pořadatele zobrazí jen jeho kroužky. Filtr se počítá do „aktivních filtrů" a resetuje tlačítkem „Zrušit filtry".
- **FR-2** Tlačítko „Přidat první kroužek" v prázdném rozvrhu zaměří hledání v katalogu a vybere první kroužek (otevře jeho detail) i na desktopu.
- **FR-3** Pravý sloupec má **připnutou** hlavičku vždy viditelnou v pořadí: a) Obsazenost týdne, b) Souhrn týdne, c) Náklady celkem: částka/rok; obsah pod ní se roluje.
- **FR-4** Detail vybraného kroužku obsahuje právě těchto 6 skupin: (1) název + info + výběr dne/termínu + přidat/odebrat/upravit, (2) barva, (3) popis, (4) kontakt, (5) cena, (6) adresa + odkaz na Mapy.cz a nativní mapy podle platformy. Kapacita, uzávěrka, „ověřeno", rozpad Kč/lekce, drift a poznámka rodiče se v detailu nezobrazují.
- **FR-5** Odkaz na mapu: vždy Mapy.cz (Seznam) + nativní mapy podle platformy (Apple Maps na Apple zařízeních, Google Maps jinde). Vložený náhled OpenStreetMap a odkaz OpenStreetMap se odstraní. Supersedes design_review_32.md (CHANGE-33) náhled mapy.
- **FR-6** Osa kalendáře pokrývá celý den (00:00–24:00); výchozí odrolování ukazuje denní okno (07:00 nad polovinou viewportu), noční hodiny jsou dosažitelné rolováním a záznam lze přidat i mimo 07–21. Supersedes design_review_35.md §FR-1 (CHANGE-36).

## 2. Acceptance criteria
- **AC-1** (FR-1) E2E: výběr pořadatele v katalogu sníží počet karet na kroužky daného pořadatele; „Zrušit filtry" ho vynuluje. `catalog.spec.ts` (nový test T-121).
- **AC-2** (FR-2) E2E: na desktopu klik na „Přidat první kroužek" otevře detail kroužku v pravém sloupci a zaměří hledání. `schedule.spec.ts` (nový test T-136).
- **AC-3** (FR-3) E2E: po odrolování rolovacího těla zůstávají nadpisy „Obsazenost týdne", „Souhrn týdne", „Náklady" viditelné (připnuté). `panel.spec.ts` (nový test T-148).
- **AC-4** (FR-4) E2E: detail neobsahuje „Kapacita", „Uzávěrka přihlášek", „Ověřeno", „Poznámka rodiče"; obsahuje název, barvu, popis, kontakt, cenu, adresu. `panel.spec.ts` (nový test T-149).
- **AC-5** (FR-5) E2E: detail nabízí odkaz „Mapy.cz" a nativní mapu; neobsahuje vložený `<iframe>` náhledu ani odkaz „OpenStreetMap". `panel.spec.ts` (nový test T-155).
- **AC-6** (FR-6) E2E: časová osa obsahuje značky pro celý den (00 i 23) a výchozí viewport ukazuje denní hodinu (12:00 viditelná, 03:00 odrolovaná mimo). `catalog.spec.ts` (přepis T-104).
- **AC-7** `apps/web` `tsc --noEmit` čisté; dotčené E2E vrstvy zelené na desktop; aplikace běží (HTTP 200).

## 3. Non-goals / notes
- Odebrané funkce z pravého sloupce zůstávají v kódu domény, jen se nezobrazují; sledováno pro případné vrácení:
  - Uzávěrky přihlášek v souhrnu i detailu (tracked as BL-023).
  - „Moje limity" (stropy odpolední/rozpočtu) a „Porovnání variant" tabulka (tracked as BL-024).
  - Detail: kapacita, „ověřeno", rozpad Kč/lekce, upozornění na změnu zdroje (drift), poznámka rodiče (tracked as BL-025).
- Uživatelský přepínač „přepnout na plný den / jen 07–21" se nezavádí — výchozí je vždy denní okno s možností rolování (tracked as BL-026).
- Nativní mapy: detekce platformy z `navigator`; použije se webová URL (`maps.apple.com`, Google Maps web) místo `geo:`/`maps:` kvůli spolehlivosti v prohlížeči.
- T-104 se přepisuje (osa je nově celodenní); T-309 (konflikty) zůstává v platnosti — sekce Konflikty se zachovává.
