# Design Review 43 — Changes 12: konflikty pryč z pravého sloupce, jeden panel v DOM, varianty pod „Přihlásit"

**Status:** IMPLEMENTED
**Change ID:** CHANGE-44 (skrýt konflikty v pravém sloupci; `DetailsPanel` mountovat jen jednou; přesun „Varianty docházky" pod odkaz „Přihlásit se" — app `@krouzky/web`)
**Date:** 2026-08-15
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** Uživatelské testování (changes.md „Changes 12"): (1) pravý sloupec nemá zobrazovat konflikty; (2) odkaz „Otevřít v nativních mapách" se objevuje víckrát (příčinou je `DetailsPanel` vykreslený v DOM 3×); (3) výběr varianty docházky má být hned pod „Přihlásit se".

## 0. SOTA analysis
- **0.1 Problem.**
  - (A) Sekce „Konflikty a upozornění" (včetně akce „Vyřešit") je v pravém sloupci (`ScheduleNotices`). Uživatel ji tam nechce; kolize mají zůstat viditelné jinde.
  - (B) `page.tsx` vykresluje `<DetailsPanel />` na **třech** místech (stálý `aside`, střední slide-over drawer, mobilní sheet). Neaktivní kopie jsou jen skryté CSS, ale zůstávají v DOM → duplicitní obsah (odkazy na mapu, nadpisy).
  - (C) Blok „Varianty docházky" (vícenásobný výběr termínů, Changes 2) je až na konci detailu, daleko od primární akce a „Přihlásit se".
- **0.2 Approach.**
  - (A) Odstranit sekci konfliktů z `ScheduleNotices` (zůstane jen „Vlastní události"). Detekce kolizí zůstává v prostřední mřížce: překrývající se události se kreslí vedle sebe (stávající `layoutDay`, test T-133). Akce „Vyřešit" (`suggestVariantSwitches`) se z UI odebírá, doména ji drží dál (tracked as BL-027). Alternativa (nechat konflikty, jen sbalit) zamítnuta — uživatel je nechce v pravém sloupci vůbec.
  - (B) V `aside` (stálý sloupec) vykreslit `<DetailsPanel />` jen když je to aktivní slot (`isWide` nebo mobil se záložkou „Info"), místo trvalého mountu skrytého CSS. Drawer i mobilní sheet už jsou podmíněné → v DOM je pak právě **jeden** `DetailsPanel`. Alternativa (deduplikovat odkazy uvnitř panelu) zamítnuta — neřeší duplicitu ostatního obsahu ani plýtvání renderem.
  - (C) Přesunout blok „Varianty docházky" na začátek těla detailu, tj. hned pod připnutou hlavičku s „Přihlásit se". Alternativa (vložit do akční krabice) zamítnuta — hlavička má zůstat kompaktní.

## 1. Requirements
- **FR-1** Pravý sloupec nezobrazuje sekci „Konflikty a upozornění" ani akci „Vyřešit". Překrývající se události zůstávají viditelné v mřížce (vedle sebe).
- **FR-2** `DetailsPanel` je v DOM právě jednou (v aktivním responzivním slotu) → každý odkaz na mapu se v detailu vykreslí právě jednou.
- **FR-3** Blok „Varianty docházky" se v detailu zobrazuje hned pod odkazem „Přihlásit se" (na začátku těla detailu), ne až na konci.

## 2. Acceptance criteria
- **AC-1** (FR-1) E2E: po přidání dvou kolidujících událostí pravý sloupec neobsahuje nadpis „Konflikty a upozornění" ani tlačítko „Vyřešit"; mřížka ukazuje oba bloky vedle sebe. `panel.spec.ts` T-143 (přepis) + `a11y.spec.ts` T-309 (přepis na mřížku).
- **AC-2** (FR-2) E2E: v detailu vybraného kroužku je právě jeden odkaz „Otevřít v … Mapy" a jeden „Mapy.cz" (napříč šířkami). `panel.spec.ts` T-156.
- **AC-3** (FR-3) E2E: v detailu je „Varianty docházky" nad blokem „Barva kroužku" / „Kontakt" (tj. hned pod hlavičkou). `panel.spec.ts` T-157.
- **AC-4** `apps/web` `tsc --noEmit` čisté; dotčené E2E vrstvy zelené na desktop + mobile-small; aplikace běží (HTTP 200).

## 3. Non-goals / notes
- Akce „Vyřešit" (návrh bezkolizní varianty, `suggestVariantSwitches`) se z UI odebírá; doménová funkce zůstává pro případné budoucí místo (tracked as BL-027).
- Vizuální podoba mřížkové detekce kolizí se nemění (jen se stává jediným místem, kde se kolize projeví).
- Supersedes design_review_42.md §3 (CHANGE-43) v části, kde konflikty zůstávaly v rolovacím těle pravého sloupce.
