# Design Review 95 — sjednocené modální chování všech vyskakovacích oken

**Status:** IMPLEMENTED
**Change ID:** CHANGE-102 (app-only, `@krouzky/web`)
**Date:** 2026-10-06
**Repo:** monorepo `Children_schedule` (dotýká se pouze `apps/web`)
**Trigger:** Uživatel nahlásil, že vyskakovací okna se v aplikaci nechovají jednotně: "Stále setrvává
problém s 'vyskakovacími okny'. Všechna vyskakovací okna musí fungovat stejně jako pro '+ Vlastní
událost' -> po kliknutí se otevře nové okno a zbytek ztmavne. Otestuj všechno." Referenční chování je
`CustomEntryDialog` (`fixed inset-0 z-50` + `bg-slate-900/50 backdrop-blur-xs` podklad, `role="dialog"
aria-modal="true"`, zavření klikem na podklad i klávesou Escape).

## 0. SOTA analýza

### 0.1 Problém

Čtenářský průzkum (Explore subagent, read-only inventář) našel, že z ~9 popup/menu prvků v aplikaci
odpovídaly referenčnímu vzoru jen 2 (`PrintRangeDialog`, `PrivacyDialog` — oba už měly podklad + klik
mimo zavírá, chyběl jen Escape). Pět prvků nemělo ŽÁDNÝ ztmavující podklad a/nebo Escape:

1. Toolbar desktopové menu "Další ▾" (`z-30`, bez podkladu)
2. Toolbar mobilní menu "Další ▾" (`z-50`, bez podkladu)
3. Toolbar sheet "Správa kalendářů" (`z-50`, bez podkladu — navíc měl latentní bug: `setCalendarMenuOpen
   (false)` se nikde nevolalo mimo deklaraci, sheet šlo zavřít jen opětovným kliknutím na spouštěcí
   tlačítko)
4. Mobilní spodní sheet detailu kroužku (`z-40`, bez podkladu — CHANGE-27/54 ho záměrně navrhly jako
   neblokující "peek", viz 0.2 níže)
5. (mimo rozsah) Střední-šířkový info-drawer (900–1439px) je záměrně inline sloupec, ne overlay
   (CHANGE-64) — není to transientní popup, nepatří do této opravy.

### 0.2 Přístup a zamítnutá alternativa

**Zvolený přístup:** dva nové sdílené moduly —
`useEscapeToClose(onClose)` (hook, sjednocené zavírání klávesou Escape) a `PopoverBackdrop` (komponenta,
sdílený ztmavující podklad se stejným vizuálem jako `CustomEntryDialog`) — aplikované na všech 5
nekonformních prvků + Escape doplněn i do zbylých 2 částečně konformních dialogů.

**Konflikt s dřívějším rozhodnutím (CHANGE-27/54) a jeho řešení:** mobilní spodní sheet byl PŮVODNĚ
navržen jako neblokující "peek" — zůstává viditelný i po přepnutí záložky Domů/Katalog/Rozvrh/Děti
(regresní testy T-211/T-218/T-219 na tom přímo stojí). Doslovná aplikace plnoobrazovkového podkladu
(`fixed inset-0`) by tuto vlastnost zrušila, protože podklad by zablokoval i klik na spodní navigaci.

Zamítnutá alternativa: udělat sheet plně modálním jako `CustomEntryDialog` (blokovat i navigaci, testy
upravit tak, aby sheet před přepnutím záložky nejdřív zavíraly). Zamítnuto, protože by to zrušilo
záměrnou, uživatelem dříve potvrzenou funkci "peek napříč záložkami" bez explicitního nového zadání.

**Zvolené řešení (potvrzeno uživatelem):** `PopoverBackdrop` dostal volitelný `inset` prop — u mobilního
sheetu podklad ztmaví obsah NAD navigační lištou (`inset-x-0 top-0 bottom-12` na výšku, `inset-y-0
left-14 right-0` v landscape-compact s bočním rail menu), ale samotný pruh Domů/Katalog/Rozvrh/Děti
zůstává neztmavený a klikatelný. Sheet tak dál plní CHANGE-55, jen navíc dostává vizuální ztmavení
obsahu za sebou (shodné s referenčním vzorem v rozsahu, kde to nekoliduje s existující funkcí).

U ostatních 4 prvků (obě "Další ▾" menu, "Správa kalendářů") žádný takový konflikt neexistuje — dostaly
plný `inset-0` podklad, přesně jako referenční dialog.

## 1. Requirements

- **FR-1**: Desktopové menu "Další ▾" (Toolbar) má při otevření plnoobrazovkový ztmavující podklad;
  klik na podklad menu zavře.
- **FR-2**: Mobilní menu "Další ▾" (Toolbar) má stejné chování jako FR-1.
- **FR-3**: Sheet "Správa kalendářů" má plnoobrazovkový ztmavující podklad; klik na podklad ho zavře
  (opravuje vedlejší bug: dřív šlo zavřít jen re-kliknutím na spouštěcí tlačítko).
- **FR-4**: Mobilní spodní sheet detailu kroužku dostává ztmavující podklad NAD navigační lištou, ale
  lišta Domů/Katalog/Rozvrh/Děti zůstává klikatelná a nezatmavená (CHANGE-55 beze změny).
- **FR-5**: Všech 5 prvků z FR-1..4 (plus sheet "Správa kalendářů") se zavírá klávesou Escape.
- **FR-6**: `PrivacyDialog` a `PrintRangeDialog` (měly už podklad, chyběl jen Escape) se nově zavírají
  i klávesou Escape.

## 2. Acceptance criteria

- **AC-1..4**: diagnostický skript (`checkBackdrop` přes `page.evaluate`, `position:fixed`+`inset`
  vlastnosti + `backdropFilter`/pozadí) potvrzuje přítomnost podkladu pro všechny prvky FR-1..4; klik na
  podklad prokazatelně zavírá popup (`toBeHidden`/obsah zmizí).
- **AC-5**: pro mobilní sheet navíc `document.elementFromPoint` nad tlačítkem spodní navigace vrací
  prvek navigace (ne podklad) — lišta zůstává klikatelná i s otevřeným sheetem.
- **AC-6**: plná 6profilová E2E sada (`test/specs/**`, ~990 testů) prochází beze změny v celkovém počtu
  úspěchů oproti CHANGE-101 (743 passed / 247 skipped / 0 failed).

## 3. Non-goals / notes

- Střední-šířkový info-drawer (900–1439px) záměrně zůstává mimo rozsah — je to inline sloupec podle
  CHANGE-64, ne transientní popup.
- Rozšíření modality mobilního sheetu i na navigační lištu (plná shoda s referenčním vzorem bez výjimky)
  bylo zvažováno a zamítnuto — viz §0.2. Pokud by uživatel v budoucnu chtěl sheet skutečně plně blokující
  (včetně navigace), jde o novou, samostatnou změnu chování (ne bugfix), protože by zrušila testovanou
  funkci CHANGE-55.

## 4. Ověření

- `tsc --noEmit` čisté (`apps/web`).
- Doménové testy beze změny (135/135, engine nedotčen).
- Plná 6profilová E2E sada: **743 passed / 247 skipped / 0 failed** (shodné s CHANGE-101 baseline).
- Ruční diagnostické skripty (`/tmp/verify_popups*.mjs`) potvrdily podklad + klik-mimo-zavře pro všech
  5 opravených prvků a zachování klikatelnosti spodní navigace u mobilního sheetu, bez console/page chyb.
