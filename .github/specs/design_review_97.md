# Design Review 97 — detail existující položky na mobilu je plný modál, ne peek sheet

**Status:** IMPLEMENTED
**Change ID:** CHANGE-104 (app-only, `@krouzky/web`, jen mobilní layout)
**Date:** 2026-08-31
**Repo:** monorepo `Children_schedule` (`apps/web`)
**Trigger:** uživatel po CHANGE-103 upřesnil, že Bug 2 stále není vyřešen: kliknutí na existující
položku v rozvrhu na mobilu neotevírá stejný typ okna jako referenční „+ Vlastní událost" — zůstává
aktivní horní lišta (výběr dítěte) i spodní navigace (Domů/Katalog/Rozvrh/Děti), okno se otevírá
o ~2–2,5 cm níže. „Jinak to funguje na tabletu, jinak na desktopu a jinak na mobilu. Toto zatím
udělej pouze pro mobil."

## 0. SOTA analýza

### 0.1 Naměřená fakta (mobil 390×844, `getBoundingClientRect`)

| | Reference („+ Vlastní událost") | Existující položka (před opravou) |
|---|---|---|
| Vnější obal | `fixed inset-0` — celá obrazovka (390×844) | `fixed inset-x-0 bottom-12` — jen spodních ~70 % (390×591, začíná v y≈205px) |
| Pozice nadpisu | y ≈ 64px | y ≈ 296px (rozdíl 232px ≈ 3,5–4 cm na reálném displeji) |
| Horní lišta | zablokovaná | viditelná, jen vizuálně ztlumená |
| Spodní navigace | zablokovaná | plně klikatelná |
| Vzor | centrovaný modál | spodní vysouvací sheet (`rounded-t-2xl`, `bottom-12`) |

### 0.2 Kořen problému

Detail existující položky (kroužek i vlastní událost v rozvrhu) na mobilu byl architektonicky JINÁ
komponenta než `CustomEntryDialog` — spodní „peek" sheet navržený v CHANGE-27/54/55 tak, aby
zůstal katalog/mřížka pod ním dosažitelný (přepínání záložek se zapnutým výběrem). CHANGE-102
tento rozdíl vědomě zachoval ("Zachovat peek — dimovat obsah, ne navigaci"). Uživatel nyní tento
dřívější kompromis explicitně zrušil — chce STEJNÝ TYP okna jako reference.

### 0.3 Zvolený přístup

Mobilní detail (`isMobileLayout && hasSelection && mobileTab !== 'details'` v `page.tsx`) nahrazen
strukturou 1:1 podle `CustomEntryDialog`: jeden `<div className="fixed inset-0 z-50 flex
items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" onClick={closeMobileSheet}>`
(backdrop + centrování zároveň), uvnitř `max-h-[92dvh] w-full max-w-md rounded-2xl` box se
`stopPropagation` (klik uvnitř nezavírá). Odstraněn `sheetExpanded` stav a tlačítko
Zvětšit/Zmenšit (nemá už smysl — modál není bottom sheet, nemá "peek"/"expanded" stav).
Zavírání zůstává: tlačítko „Zavřít", klik na podklad, Escape (existující obecný handler v
`page.tsx`).

**Rozsah: JEN mobil** (`isMobileLayout`). Střední šířky (900–1439px, slide-over drawer) a wide
desktop (≥1440px, stálý sloupec) zůstávají beze změny — mají odlišné, funkční zobrazení, které
uživatel explicitně nechal mimo rozsah této opravy.

## 1. Requirements

- **FR-1**: Na mobilu kliknutí na existující položku v rozvrhu (kroužek i vlastní událost) otevře
  detail jako plnou obrazovku — stejná struktura jako `CustomEntryDialog` (`fixed inset-0`,
  centrovaný box, backdrop blokuje VŠE včetně horní lišty a spodní navigace).
- **FR-2**: Odstraněn "peek"/"expanded" mezikrok — žádné tlačítko Zvětšit/Zmenšit, žádná výška
  `h-60`/`h-[70dvh]`.
- **FR-3**: Zavírání funguje třemi cestami: tlačítko „Zavřít", klik na podklad, klávesa Escape.
- **FR-4**: Tablet (900–1439px) a desktop (≥1440px) beze změny.

## 2. Acceptance criteria

- **AC-1**: na mobilu po kliknutí na existující položku je horní lišta i spodní navigace
  needitovatelná (`document.elementFromPoint` na jejich tlačítka vrací backdrop, ne tlačítko).
- **AC-2**: pozice/rozměr modálu (vnější `fixed inset-0`, vnitřní box) odpovídá `CustomEntryDialog`
  strukturálně (ověřeno živě přes `getBoundingClientRect`).
- **AC-3**: zavření funguje klikem na podklad i klávesou Escape (ověřeno živě).
- **AC-4**: plná 6profilová E2E sada beze regresí na `desktop`/`desktop-narrow`/`tablet-*` profilech
  (nedotčeny); mobilní testy odrážející starou funkci "peek napříč záložkami" (T-211/T-218/T-219)
  přepsané na novou, správnou modální sémantiku.

## 3. Non-goals / notes

- Tablet (900–1439px slide-over drawer) a desktop (stálý sloupec) NEJSOU touto změnou dotčeny —
  uživatel to explicitně nechal mimo rozsah ("Toto zatím udělej pouze pro mobil"). Pokud by měly
  být sjednoceny podobně, jde o samostatnou budoucí změnu.
- Tato změna DEFINITIVNĚ ruší funkci CHANGE-55 "peek napříč záložkami" na mobilu (možnost přepnout
  Domů/Katalog/Rozvrh/Děti se stále otevřeným detailem) — nahrazeno plně modálním chováním shodným
  s referencí. T-211/T-218/T-219 přepsány, ne jen upraveny.

## 4. Ověření

- `tsc --noEmit` čisté (web).
- Živé ověření (headless Chromium, mobil 390×844): modál kryje celou obrazovku, horní lišta i
  spodní navigace blokované, zavření klikem na podklad i Escape funguje, 0 console chyb.
- Plná 6profilová E2E sada: viz CHANGELOG.
