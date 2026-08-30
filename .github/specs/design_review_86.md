# Design Review 86 — Audit v2: mobilní kvalita po opravách (M1–M10)

**Status:** PARTIAL (5 nálezů opraveno, 1 vyvrácen měřením, 4 vědomě odloženy jako `BL-055`/`BL-056`/`BL-057`)
**Change ID:** CHANGE-93 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-30
**Trigger:** Uživatel sdílel druhé kolo auditu (`.github/audit/after_review_85/`), tentokrát
zaměřené jen na mobilní kvalitu po CHANGE-91/92 (commit `83eee5a06896`). Audit sám testuje proti
zdroji, ne proti běžícímu zařízení — každý nález byl proto před implementací ověřen skutečným
Playwright během proti běžícímu dev serveru, ne jen přečten.

## 0. Metoda

Audit dodal vlastní testovací sadu (`tests/mobile-audit-v2.spec.ts`, původně T-230–T-243)
popisující cílový stav pro nálezy M1–M10. Před implementací byla sada zkopírována do
`test/specs/mobile-audit-v2.spec.ts` a **přečíslována na T-244–T-257** (audit nečekal existenci
sady — T-230–T-233 už byly obsazené staršími testy z CHANGE-85/89/90 v `a11y.spec.ts`/
`persistence.spec.ts`/`schedule.spec.ts`), a spuštěna PROTI SOUČASNÉMU KÓDU
(`--project=mobile`) — stejná disciplina jako u předchozích auditů (design_review_80/81.md):
žádný nález se neimplementuje jen na základě přečtení, měří se.

**Výsledek prvního běhu**: 9 z 14 testů selhalo pro reálný důvod, 2 selhaly kvůli chybě LOKÁTORU
v testu samotném (ne v aplikaci — strict-mode kolize na duplicitní tlačítko „Přidat kalendář“,
existuje jak v Toolbaru, tak v mobilním panelu „Děti“), 5 prošlo napoprvé bez zásahu.

Po opravě dvou testových lokátorů (scoped na `getByLabel('Děti')`) a jejich opětovném spuštění:
**M8 i druhá polovina M9 byly potvrzeny jako reálné.** Naopak **M3 a M7 doopravdy NEPROŠLY testem
tak, jak audit tvrdil** — M3 (rotace odhodí scroll) reálně NEBYL reprodukován (prohlížeč sám
ořízne `scrollTop` na nový, menší `scrollHeight` po změně hustoty, takže blok zůstal v pohledu) a
**M10 (věk bez validace) je FALEŠNÝ nález** — `setChildAge` v `plannerStore.ts` už validaci má
(`Number.isFinite(age) && age>=3 && age<=19`, doplněno CHANGE-80) a oba testy T-256/T-257 prošly
beze změny.

## 1. Nálezy a rozhodnutí

| # | Nález | Stav po měření | Rozhodnutí |
|---|---|---|---|
| M1 | Rail (`isLandscapeCompact`) nezávislý na šířce vs. jednopanelový obsah (`isMobile`) nezávislý na výšce — na širokém telefonu na šířku (932×430, **empiricky ověřeno i na 844×390**, tedy i běžný iPhone 14) se vykreslí rail, o který se nestará žádný panel. | REÁLNÝ (T-244/T-245 padaly) | **Opraveno** — viz §2.1 |
| M2 | `hourPx=26` v landscape-compact je pod hranicí čitelnosti vlastního obsahu bloku (změřeno 38px potřeba, 26px k dispozici). | REÁLNÝ (T-246) | **Opraveno** — viz §2.2 |
| M3 | Rotace odhodí `scrollTop` v pixelech, efekt na přepočet nemá `hourPx` v závislostech. | **NEREPRODUKOVÁNO** (T-248 prošel i před jakoukoli změnou) | Bez zásahu — prohlížeč klamuje `scrollTop` na nový `scrollHeight` sám. Ponecháno, dokud se neobjeví reálné selhání. |
| M4 | Hlavička na mobilu vždy dvouřádková (88px), Fix A z v1 neaplikován. | Potvrzeno čtením zdroje, NEMĚŘENO testem (audit ho ani nedodal) | **Odloženo jako `BL-057`** — „až bude čas", největší přestavba ze všech nálezů. |
| M5 | Mobil nemá přepínač Den/3 dny/Týden/Měsíc (`!isMobile` gate), mřížka je vždy 7denní a přetéká. | REÁLNÝ (T-249/T-250) | **Částečně opraveno** — viz §2.3. Změna VÝCHOZÍHO pohledu odložena jako `BL-055`. |
| M6 | `touch-none` na celé ploše bloku vlastní události vypíná scroll mřížky prstem. | REÁLNÝ (T-251) | **Odloženo jako `BL-056`** — viz §3. |
| M7 | Sheet detailu měří `h-[70vh]`, ne `h-[70dvh]`. | Prošlo testem i beze změny (headless Chromium nesimuluje adresní řádek), ale kódový nesoulad je reálný a levný na opravu. | **Opraveno** — viz §2.4 |
| M8 | Sourozenecký přepínač je za `!isMobile`, i když mobilní Mřížka (`mobileAgendaMode==='calendar'`) na něj má prostor. | REÁLNÝ (T-253, po opravě testového lokátoru) | **Opraveno** — viz §2.5 |
| M9 | Dotykové cíle `‹›`/„Dnes"/undo-redo/destruktivní ✕ u kalendáře zůstaly na 28px. | REÁLNÝ (T-254, T-255 po opravě testového lokátoru) | **Opraveno** — viz §2.6 |
| M10 | Věk dítěte stále bez validace. | **FALEŠNÝ NÁLEZ** — `setChildAge` validuje od CHANGE-80, T-256/T-257 prošly beze změny. | Bez zásahu. |

## 2. Implementace

### 2.1 M1 — jeden společný přepínač pro rail i obsah

Kořenová příčina NENÍ v `LANDSCAPE_COMPACT_QUERY` samotném (audit navrhoval přidat `max-width`
do dotazu, ale to by rozbilo existující `T-226`/`T-227`, které přesně 844×390 očekávají jako
platný rail — **ověřeno naměřením, že audit se v tomto detailu mýlil**: 844×390 má STEJNÝ bug
jako 932×430, ne funkční rail, jak audit tvrdil ve své tabulce). Skutečná příčina: `page.tsx`
gatuje panely (`HomeScreen`, mobilní sheet, katalog/mřížka/info sloupce, `VariantTabs`) na
`isMobile` (jen šířka), zatímco samotný rail (`isLandscapeCompact`, jen výška+orientace) je
nezávislý — tyto dvě podmínky se mohou rozejít.

**Oprava**: nový `isMobileLayout = isMobile || isLandscapeCompact` v `page.tsx`, jediný zdroj
pravdy pro VŠECHNY jednopanelové/tabové větve layoutu (nahrazuje `isMobile` v: render `HomeScreen`,
katalog/mřížka aside+section, info aside, medium info-drawer podmínka, `VariantTabs`, mobilní
sheet, klávesová zkratka „/"). Tailwind statické `desk:` třídy na katalogu/mřížce nahrazeny JS
`clsx` výrazem (Tailwind breakpoint nezná výšku, JS ano).

### 2.2 M2 — hustota 40px/h v landscape-compact

Audit navrhoval 34px/h, ale naměřením (`T-246`) vyšlo, že to STÁLE ořezává o 4px (38px potřeba,
34px k dispozici). `hourPx` v `ScheduleGrid.tsx` proto **40px/h** (ne 34px), ostatní beze změny.
`truncate` na řádku s časem UŽ existuje (audit tvrdil opak — `T-247` prošel i beze změny).

### 2.3 M5 — přepínač zpřístupněn, výchozí pohled beze změny

Odstraněn `!isMobile &&` gate kolem tlačítek Den/3 dny/Týden/Měsíc v `ScheduleGrid.tsx` — nyní
vidět na všech šířkách. Doplněno `snap-x snap-mandatory` na scroll kontejner + `snap-start` na
každý sloupec dne (pro plynulejší vodorovný scroll v pohledu Týden).

**Vědomě NEIMPLEMENTOVÁNO**: změna výchozího pohledu `'week'` → `'3day'` na mobilu. Audit sám
tuto část řadí do „Potom", ne „Hned", s výslovnou poznámkou „M5 se dotkne testů vázaných na
výchozí týdenní pohled“. Potvrzeno empiricky — první pokus o tuto změnu rozbil `T-248` (M3) a
`T-251` (M6): oba přidají vlastní událost do pondělí (výchozí den v dialogu), ale `'3day'` od
„dneška" (úterý, mrazené hodiny) pondělí nezobrazí. Rozsah dopadu na celou sadu (persistence/
schedule/panel specs, které si zakládají vlastní data do konkrétního dne) nebyl zjišťován celý —
proto `BL-055`, ne přímá implementace.

### 2.4 M7 — sheet `h-[70dvh]`

`page.tsx`: `sheetExpanded ? 'h-[70vh]' : 'h-60'` → `'h-[70dvh]'`. Stejný důvod jako `h-dvh` na
kořeni aplikace (CHANGE-55) — `vh` na mobilním Safari počítá s NEJVĚTŠÍM viewportem (bez
adresního řádku), `dvh` sleduje skutečně dostupnou výšku.

### 2.5 M8 — sourozenecký přepínač i v mobilní Mřížce

`ScheduleGrid.tsx`: podmínka `!isMobile && children.length > 1` → `children.length > 1 &&
(!isMobile || mobileAgendaMode === 'calendar')`. Mobilní Agenda (seznam) přepínač stále nemá
(nemá pro překryv prostor, jak audit sám poznamenává) — jen mobilní Mřížka ho teď dostává.
Ověřeno T-253.

### 2.6 M9 — dotykové cíle na 44px (mobil), desktop beze změny

Zavedený vzor `h-11 desk:h-7` (CHANGE-47/79) aplikován na: `‹`/`›`/„Dnes" nad mřížkou
(`ScheduleGrid.tsx`), undo/redo v Toolbaru (`Toolbar.tsx`). Destruktivní ✕ u kalendáře v mobilním
panelu „Děti" (`MobileChildrenPanel`, `page.tsx`) `h-7 w-7` → `h-11 w-11` (tento panel je
mobil-only, žádné `desk:` škálování není potřeba). Toolbarovo VLASTNÍ, textové tlačítko „Odebrat"
(viditelné na všech šířkách od CHANGE-75, jiný nález než ✕ chip) ponecháno beze změny — test
`T-255` byl scopován na `getByLabel('Děti')`, ať cílí přesně na nález popsaný auditem.

## 3. Non-goals (odloženo)

- **`BL-055`** — výchozí pohled mobilní mřížky `'week'` → `'3day'` (M5, druhá polovina). Vyžaduje
  průchod celou sadou kvůli testům, které si zakládají vlastní data do konkrétního dne.
- **`BL-056`** — `touch-action: none` na celé ploše bloku vlastní události blokuje scroll prstem
  (M6). Oprava (long-press prodleva nebo malý úchyt) riskuje rozbití existujícího pointer
  drag&drop (FR-W3-1, CHANGE-90), potřebuje vlastní opatrnou implementaci a testování gesta.
- **`BL-057`** — hlavička na mobilu vždy dvouřádková, 88px (M4). Audit sám: „největší mobilní
  zlepšení ze seznamu, ale i největší přestavba" — přesun správy kalendářů do sheetu je zásah do
  UI, který si zaslouží vlastní review, ne vedlejší produkt tohoto auditu.

## 4. Acceptance criteria

- **AC-1**: `test/specs/mobile-audit-v2.spec.ts` (M1–M10, T-244–T-257) — 14 testů, 12 zelených,
  2 `test.fixme()` s odkazem na `BL-055`/`BL-056`.
- **AC-2**: `test/specs/landscape.spec.ts` (T-226/T-227, existující FR-W2-1/2 testy) beze změny —
  potvrzuje, že oprava M1/M2 nerozbila platný rail na 844×390.
- `tsc --noEmit` (web) čisté; plná E2E sada 0 failed (mimo dvě vědomé `fixme`).
