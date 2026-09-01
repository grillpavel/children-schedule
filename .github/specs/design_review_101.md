# Design Review 101 — Mobilní detail měl proměnlivou výšku podle množství obsahu

**Status:** IMPLEMENTED (2026-09-01)
**Change ID:** CHANGE-108 (app-only, `apps/web`, druhá samostatná příčina ke
stejnému hlášení jako CHANGE-107/design_review_100.md)
**Date:** 2026-09-01
**Repo:** `apps/web/app/page.tsx`
**Trigger:** uživatel upřesnil, že CHANGE-107 problém nevyřešilo — na mobilu
kroužek z katalogu (např. „Atletika — přípravka") otevře „velké" okno,
zatímco vlastní událost (např. „Volejbal") otevře jen „poloviční" okno.

## 0. Analýza — druhá, nezávislá příčina

CHANGE-107 opravil vnořené editory (`ActivityEditor`/`SessionTimeEditor`),
ale nešlo o to, co uživatel popsal — jeho repro je o VNĚJŠÍM modálním okně
detailu samotného (`page.tsx`, `role="dialog" aria-label="Detail kroužku"`),
ne o vnitřním „Upravit“ tlačítku.

**Potvrzeno empiricky** (throwaway diagnostický skript, reálný headless
Chromium 390×844): outer wrapper měl `max-h-[92dvh]` (jen HORNÍ limit výšky,
žádný spodní) + `flex items-center justify-center` (vertikální centrování
proměnlivě vysokého boxu). Box se tedy vždy zmenšil přesně na výšku SVÉHO
obsahu:

| Položka | Obsah | Naměřená výška boxu |
|---|---|---|
| „Atletika — přípravka“ (katalogový kroužek) | varianty docházky, popis, mapa, cena, … | 776 px (skoro celý viewport) |
| „Volejbal“ (vlastní událost) | jen typ, čas, poloha, 2 tlačítka | 271 px (necelá třetina) |

Rozdíl 776 px vs. 271 px = přesně to, co uživatel popsal jako „velké“ vs.
„poloviční“ okno — stejná struktura (`role="dialog"`), stejná komponenta
(`DetailsPanel`), stejný wrapper JSX, jen jiné množství obsahu uvnitř.

## 1. Requirements

- **FR-1**: Mobilní detail (`role="dialog" aria-label="Detail kroužku"`)
  má PEVNOU výšku nezávislou na množství obsahu uvnitř — `h-[85dvh]` místo
  `max-h-[92dvh]`. Kroužek i vlastní událost tak vždy otevřou stejně velké
  okno, bez ohledu na to, kolik textu/sekcí má vybraná položka.
- **FR-2**: Vnitřní obsah (`DetailsPanel`) zůstává ve `flex-1 overflow-y-auto`
  — u obsahově bohatého kroužku scroluje, u sparšní vlastní události nechá
  jen prázdné místo dole (přijatelné, konzistentní VELIKOST okna je
  prioritnější než těsné obalení obsahu).

## 2. Acceptance criteria

- **AC-1**: Diagnostický skript (empiricky ověřeno) — `boundingBox()` detailu
  kroužku i vlastní události je IDENTICKÝ (`x/y/width/height`) na stejné
  mobilní šířce.
- **AC-2**: Regresní — T-252 (M7, `mobile-audit-v2.spec.ts`) — detail se
  stále vejde do viewportu (nepřetéká nahoru ani dolů) i s pevnou výškou.
- **AC-3**: Vizuální baseline `sheet-glass-on/off` (T-403, mobile +
  mobile-small) regenerována — rozměr modálu se změnil.

Ověřeno: `tsc --noEmit` čisté (web), plná 6profilová E2E sada =
**780 passed / 252 skipped / 0 failed** (shodné s CHANGE-107 baseline po
regeneraci T-403 baseline).
