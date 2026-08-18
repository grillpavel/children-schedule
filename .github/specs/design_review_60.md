# Design Review 60 — Domů „Dnes", věková shoda v detailu, toast na konkrétní akci

**Status:** IMPLEMENTED
**Change ID:** CHANGE-61 (app `@krouzky/web`: implementace FR-2, FR-3 a FR-5 z `design_review_58.md`
— tři malé, izolované P0 položky z redesignu v5, vybrané uživatelem k pokračování)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** pokračování v implementaci `design_review_58.md` (DRAFT CHANGE-59) po CHANGE-60 (FR-1) —
uživatel požádal o dokončení celého seznamu.

## 0. SOTA analysis

- **0.1 Problem.** Supersedes `design_review_58.md` §1 FR-2/FR-3/FR-5 (CHANGE-59, DRAFT).
  - FR-2: Domů obrazovka ukazovala jen týdenní přehled („Tento týden"), bez odpovědi na „co mě čeká
    dnes" — první otázku z doc a)/c)'s cílového mentálního modelu.
  - FR-3: Detail kroužku ukazoval jen statický rozsah „Vhodné pro 8–11 let" bez porovnání s věkem
    aktivního dítěte — uživatel musí počítat sám.
  - FR-5: Toast po každé akci nesl obecnou zprávu „Změna uložena do varianty" a mizel po 2,4 s —
    neurčité pro rodiče, který právě něco přidal/odebral, a doc b)'s AC-1 žádá zprávu na konkrétní
    položku + 4 s.
- **0.2 Approach.**
  - FR-2: nový blok „Dnes" (`HomeScreen.tsx`) nad „Tento týden" — filtruje `view.blocks` podle dne v
    týdnu (JS `Date.getDay()` převedený na doménový `Weekday` 1–7) a platnosti (`validFrom`/`validTo`
    proti dnešnímu datu), řadí podle času. Záměrně **nepočítá** skutečné výskyty přes `everyWeeks`/
    výjimky (stejné zjednodušení jako existující „Tento týden" widget) — plný occurrence-výpočet by byl
    samostatný projekt.
  - FR-3: `SelectedActivity` (DetailsPanel) nově hledá aktivní dítě (`state.children.find(activeChildId)`)
    a porovná jeho věk s `activity.ageMin/ageMax`; zobrazí „✓ Věk odpovídá" nebo „⚠ Mimo doporučený věk"
    se jménem a věkem dítěte, pod stávajícím řádkem s rozsahem (ten zůstal, jen doplněn).
  - FR-5: nové efemérní pole store `lastActionLabel`/`lastActionNonce` (stejný vzor jako `focusNonce`).
    `commit()` helper ve `plannerStore.ts` dostal volitelný `after(store)` callback běžící ve stejné
    transakci — nastavuje konkrétní zprávu („Basketbal přidán do rozvrhu" / „Basketbal odebrán z
    rozvrhu") pro `enrollGroup`/`removeEnrollment`/`addCustomEntry`/`removeCustomEntry`. `commit()`
    resetuje `lastActionLabel` na `null` na začátku každé transakce, takže akce bez vlastního popisku
    (např. změna termínu, přepis ceny) spadnou zpět na obecnou zprávu — toast tedy funguje pro **všechny**
    akce jako dosud, jen s přesnějším textem tam, kde ho známe. Časovač 2400 ms → 4000 ms.

## 1. Requirements

- **FR-2** Domů obrazovka má samostatný blok „Dnes" (dnešní události dítěte, řazené časem) nad blokem
  „Tento týden", viditelný bez scrollování na mobilu.
- **FR-3** Detail kroužku ukazuje explicitní porovnání věku aktivního dítěte s rozsahem aktivity.
- **FR-5** Toast po přidání/odebrání kroužku nebo vlastní události nese jeho jméno; zobrazuje se 4 s.

## 2. Acceptance criteria

- **AC-1** (FR-2) **T-216** (`responsive.spec.ts`) rozšířen: sekce „Dnes" viditelná a nad „Tento týden"
  (`boundingBox().y` porovnání).
- **AC-2** (FR-3) Ověřeno manuálně (dítě 9 let vs aktivita 8–11 let → „Věk odpovídá"); samostatný
  automatizovaný test není přidán (nízké riziko, čistě zobrazovací logika bez side-efektu) — zaznamenáno
  jako vědomé rozhodnutí v §3.
- **AC-3** (FR-5) Nový **T-137** (`schedule.spec.ts`): přidání karty „Basketbal — přípravka" zobrazí
  toast „Basketbal — přípravka přidán do rozvrhu", zmizí do 6 s; odebrání zobrazí odlišnou zprávu
  „...odebrán z rozvrhu".
- **AC-4** `tsc --noEmit` (web) čisté; plná E2E `--workers=1` zelená.

## 3. Non-goals / notes

- FR-2 nepočítá skutečné výskyty (biweekly/výjimky) — stejné zjednodušení jako stávající „Tento týden".
  Pokud se ukáže matoucí (např. kroužek s `everyWeeks:2`, který dnes nemá výskyt, ale zobrazí se), lze
  doplnit později jako samostatnou položku.
- FR-3 nemá vlastní E2E test (viz AC-2) — čistě zobrazovací větev bez perzistentního stavu; pokud se v
  budoucnu přidá logika závislá na této hodnotě (např. filtr), doplnit test tehdy.
- Zbylé FR z `design_review_58.md` (FR-4, FR-6, FR-7, FR-8) implementovány navazujícími CHANGE-62..65.
