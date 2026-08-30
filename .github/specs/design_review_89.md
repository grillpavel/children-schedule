# Design Review 89 — mobilní sheet detailu: kroužek vs vlastní událost otevírají na jiném místě

**Status:** IMPLEMENTED
**Change ID:** CHANGE-96 (`@krouzky/web` only — bugfix, žádná doménová/schema změna)
**Date:** 2026-08-31
**Trigger:** Uživatel nahlásil: na mobilu ve sheetu „Kalendář" se po výběru kroužku otevře info okno
na jiném místě než po kliknutí na vlastní událost; okno nezobrazí vše, některé položky jsou „pod
displejem".

## 0. SOTA analýza

### 0.1 Problem
`DetailsPanel.tsx`'s exportovaná komponenta má vlastní root `<div className="flex h-full flex-col
overflow-y-auto bg-slate-50/40">` — TOTO je jediný SKUTEČNĚ scrollující kontejner detailu (ověřeno
měřením `scrollHeight`/`clientHeight` přes headless Chromium: 1052px obsahu v 545px viditelné
oblasti). Ve `page.tsx` je tento div navíc vnořen ještě uvnitř DALŠÍHO `overflow-y-auto` wrapperu
(mobilní bottom sheet `<div className="flex-1 overflow-y-auto bg-white">`, resp. tabletový „Děti"
drawer) — ten vnější ale díky `h-full` na svém jediném dítěti nikdy sám neskutečně nescrolluje
(jeho `scrollHeight === clientHeight` vždy).

Protože `DetailsPanel` se při přepnutí výběru NEREMOUNTUJE (je to pořád tentýž komponent/DOM uzel,
jen se v něm vykreslí buď `<SelectedActivity>`, nebo `<CustomEntryDetail>`), jeho `scrollTop`
PŘETRVÁVÁ mezi výběry. Reálný scénář: uživatel si prohlíží delší detail kroužku (varianty
docházky, kolize, oficiální přihláška…), scrolluje dolů → klikne na JINÝ blok v mřížce (např. na
vlastní událost, se kterou kroužek koliduje) → nový (kratší) obsah se vykreslí do STEJNÉHO
scrollovaného divu, ale `scrollTop` zůstává na staré (velké) hodnotě → prohlížeč ho ořízne na
`max(0, novéScrollHeight − clientHeight)` → uživatel vidí prostředek/konec nového obsahu (typicky
jen tlačítka „Upravit"/„Odebrat"), ne jeho název/hlavičku nahoře. Přesně to uživatel popsal jako
„otevře na jiném místě" a „nezobrazí vše, položky pod displejem".

### 0.2 Approach
Zvažováno: (a) resetovat scroll na VNĚJŠÍM wrapperu v `page.tsx` — ZAMÍTNUTO, protože to není
skutečný scrollující element (ověřeno měřením, viz výše) — reset by byl no-op. (b) předat
`DetailsPanel` `key={selectedActivityId ?? selectedCustomEntryId}`, aby se při každé změně výběru
remountoval celý — zamítnuto, zbytečně drahé (celý strom se znovu postaví) a `SelectedActivity`/
`CustomEntryDetail` mají vlastní interní stav (`variantChoice`, `descOpen`, `editing`), který by se
zbytečně ztrácel i v případech, kdy je remount nežádoucí. **Zvoleno:** `useEffect` uvnitř
`DetailsPanel` samotného (na `[selectedActivityId, selectedCustomEntryId]`), který nastaví
`scrollRef.current.scrollTop = 0` — cílí přímo na SKUTEČNÝ scrollující element, funguje shodně ve
VŠECH čtyřech místech, kde se `DetailsPanel` mountuje (mobilní bottom sheet, tabletový „Děti"
drawer, mobilní záložka „Děti", široký desktopový sloupec), bez nutnosti cokoli měnit v `page.tsx`.

## 1. Requirements

- **FR-1**: Při přepnutí vybrané položky (kroužek → jiný kroužek, kroužek → vlastní událost, nebo
  naopak) v mobilním sheetu (i tabletovém „Děti" draweru) se scroll uvnitř detailu VŽDY resetuje na
  vrch, bez ohledu na to, jak dlouhý byl předchozí obsah.
- **FR-2**: Detail se otevírá se STEJNÝM chováním (scroll na vrchu, plně čitelná hlavička) bez
  ohledu na to, zda jde o katalogový kroužek, nebo o vlastní událost.

## 2. Acceptance criteria

- **AC-1**: `tsc --noEmit` (web) čisté.
- **AC-2**: Empiricky ověřeno (headless Chromium, 390×844): kroužek s dostatečně dlouhým obsahem
  (varianty + kolize) má reálné přetečení (`scrollHeight` 1052px vs `clientHeight` 545px);
  po manuálním scrollu na dno (`scrollTop=507`) a přepnutí na kolidující vlastní událost je nový
  `scrollTop` = 0.
- **AC-3**: Plná E2E sada (6 profilů) beze změny — oprava je čistě behaviorální (scroll reset), bez
  strukturální/testid změny, žádný existující test nezávisí na starém (chybném) chování.

## 3. Non-goals / notes

- Nebyla řešena samotná existence dvou vnořených `overflow-y-auto` kontejnerů — funkčně neškodí
  (jen jeden z nich má reálný obsah k scrollování), oprava cílí přímo na ten skutečný. Sjednocení
  na jeden kontejner by byl větší, rizikovější refaktor bez dalšího uživatelského přínosu.
- `SelectedActivity`'s interní `sticky top-0` sub-header (jméno/zpět/CTA) zůstává beze změny — byl
  to už dřívější vědomé rozhodnutí (CHANGE-57), ne příčina tohoto konkrétního nálezu.
