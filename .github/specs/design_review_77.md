# Design Review 77 — BL-051: tabletové breakpointy (FR-W2-4/5), pokus a zjištění

**Status:** IMPLEMENTOVÁNO ČÁSTEČNĚ — číselné breakpointy VRÁCENY na původní hodnoty (900px/1440px)
po naměření reálné regrese; 2 vedlejší opravy (dekorativní čáry blokující klik, rail v landscape-
compact bez ohledu na šířku) ZŮSTÁVAJÍ jako čisté zlepšení nezávislé na breakpointech.
**Change ID:** CHANGE-84 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web`
**Trigger:** Uživatel požádal o vyřešení BL-051 (tabletové breakpointy 768px/1180px z FR-W2-4,
`design_review_75.md` §0.3) i BL-052 zároveň.

## 0. Co se stalo — implementace, měření, revert s důkazem

### 0.1 Pokus

Breakpointy byly posunuty přesně podle auditu (design_review_73.md FR-W2-4):
- mobilní zlom `useIsMobile`/`desk:`/`isCompact`: 900px → **768px**
- třísloupcový zlom `useIsWide`/`isThreeColumn`: 1440px → **1180px**

Dopad na 6 profilů: `tablet-portrait` (834px) přešel z „compact" na „medium"; `desktop-narrow`
(1280px) přešel z „medium" na „three-column". Ostatní 4 profily beze změny klasifikace.

### 0.2 Naměřená zjištění — obě části mají reálnou negativní konsekvenci

1. **Tři sloupce od 1180px**: při 1280px šířce (`desktop-narrow`) klesl sloupec dne na **83px**
   (test T-200 měří skutečnou `boundingBox().width` po zápisu kroužku) — pod stanovené minimum
   105px čitelnosti. Třísloupcový layout při 1440px má na sloupec dne víc místa (katalog 320px +
   grid + info panel se vejdou pohodlně); při 1180px je stejný počet sloupců vtěsnán do o 260px užší
   plochy.
2. **Mobil/medium zlom na 768px**: při 834px šířce (`tablet-portrait`) s otevřeným detailem
   (katalog + mřížka + info-drawer současně, master-detail dle FR-7/T-162) klesl sloupec dne na
   **~24px** (změřeno přes `document.elementFromPoint` — `ghost.click()` v T-132 mířil na
   nepoužitelně úzký cíl a klik zachytávala sousední buňka mřížky, ne duch samotný).

Obě čísla jsou z reálného měření (`boundingBox()`/`elementFromPoint()` v Playwright), ne z odhadu —
stejná disciplína jako u předchozích vln (design_review_74/75/76.md).

### 0.3 Rozhodnutí — breakpointy vráceny, dvě genuinní opravy zůstávají

Přesun čísel „naslepo" podle auditu vyžaduje ZÁROVEŇ přepracovat šířky panelů (katalog/info-drawer),
ne jen posunout hranici — jinak vzniká přesně tento typ regrese. To je svým rozsahem srovnatelné
s novým redesignem panelů (změna šířek `w-80`/`w-96`/`max-w-[90vw]` napříč `page.tsx`), ne „posun
dvou čísel". Breakpointy byly proto vráceny na 900px/1440px — **BL-051 zůstává otevřené** jako
položka vyžadující redesign šířek panelů, ne jen breakpointů, pokud má být dotažena (BL-053).

Během pokusu se ale našly a opravily 2 nezávislé, genuinní chyby (platí bez ohledu na breakpointy):

- **Dekorativní hodinové linky v mřížce měly blokovat klik.** `HOUR_MARKS` čáry (`border-t`, jen
  vizuální vodítko) neměly `pointer-events-none` — na úzkých sloupcích mohly zachytit klik místo
  ducha/bloku pod nimi. Opraveno v `ScheduleGrid.tsx`.
- **Boční rail v landscape-compact byl schovaný na širších telefonech.** `<nav>` měla `desk:hidden`
  bezpodmínečně — telefon na šířku širší než `desk:` zlom (900px) by neměl ŽÁDNOU navigaci, ani
  rail. Opraveno: `desk:hidden` platí jen MIMO `isLandscapeCompact` (`page.tsx`).
- Vedlejší test fix: T-132 čekal na zmizení toastu z předchozí akce před klikem na druhého ducha
  (`schedule.spec.ts`) — odhalila to nová cesta přes tablet-portrait, i po revertu breakpointů
  zůstává jako legitimní odstranění flake.

## 1. Requirements

- **AC-1**: `HOUR_MARKS` čáry v `ScheduleGrid.tsx` mají `pointer-events-none`.
- **AC-2**: `<nav>` v `page.tsx` se nikdy nezhroutí do neviditelna v `isLandscapeCompact` bez ohledu
  na šířku (`desk:hidden` podmíněno `!isLandscapeCompact`).
- **AC-3**: Breakpointy `useIsMobile`/`useIsWide`/`isCompact`/`isThreeColumn`/`desk:` zůstávají
  900px/1440px — beze změny chování vůči stavu před CHANGE-84.

## 2. Non-goals / notes

- **BL-053** (nové): pokud se má BL-051 dotáhnout, vyžaduje redesign šířek panelů (užší info-drawer
  na středních šířkách, kolabovatelný katalog, nebo per-sloupec minimální šířka s horizontálním
  scrollem v mřížce i na desktopu — obdoba FR-W2-3, ale pro desktop/medium, ne jen mobil) —
  samostatná práce, ne jen posun dvou čísel.
- design_review_73.md/75.md aktualizovány — BL-051 zůstává `open`, s odkazem na tento spec a nové
  BL-053.
