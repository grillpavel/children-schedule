# Design Review 78 — Vlna 3, FR-W3-7: decluttering toolbaru (design_review_73.md)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-85 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web`
**Trigger:** Pokračování BL-052 (`design_review_76.md` §0.3) po BL-051 (`design_review_77.md`).

## 0. SOTA analýza

### 0.1 Zjištění před implementací

- Barva kroužku (`ColorSwatches`) už existovala DUPLICITNĚ na dvou místech: v desktopovém
  Toolbaru (`selectedActivityId`-podmíněná) A v `DetailsPanel.tsx`'s `SelectedActivity` (sekce
  „Barva kroužku", řádek ~436). FR-W3-7 „barva → detail kroužku" byl tedy z poloviny už hotový —
  stačilo odstranit DUPLICITNÍ kopii z Toolbaru, ne stavět novou.
- Věk a Přesun existovaly JEN v desktopovém Toolbaru (`hidden ... desk:flex`) — mobil má vlastní
  editaci v `MobileChildrenPanel` (záložka „Děti"), ale desktop žádný ekvivalent mimo Toolbar neměl.

### 0.2 Kam se Věk/Přesun přesunuly — a jaký to má vedlejší efekt

Nový `ChildSettings` v `DetailsPanel.tsx`, vykreslen uvnitř `PinnedSummary` (souhrn týdne, vidět jen
když NIC není vybráno) — mirror stejných polí jako `MobileChildrenPanel`, gated `useIsMobile()`
(NE CSS `hidden`), ať se na mobilu (záložka „Děti" mountuje `DetailsPanel` VEDLE
`MobileChildrenPanel`) neduplikuje stejný `aria-label="Věk dítěte"` v DOM (způsobilo by strict-mode
kolizi v `getByLabel`).

**Vedlejší efekt:** `DetailsPanel` je perzistentní sloupec jen na širokém desktopu (`isWide`,
≥1440px, C9-L1). Na středních šířkách (900–1440, `desktop-narrow`/`tablet-landscape`) se objevuje
jen jako slide-over po kliknutí na „Souhrn" nebo výběru kroužku — Věk/Přesun tam už NEJSOU vždy
vidět bez jednoho extra kliknutí (dřív byly v Toolbaru vidět vždy na celém desktopu ≥900px).
Vědomý kompromis — “Souhrn” je jediné tlačítko navíc, decluttering toolbaru byl explicitním cílem.

## 1. Requirements

- **FR-W3-7**: Toolbar.tsx nese jen identitu (správa kalendářů) + historii (undo/redo) + export
  (Otevřít/Uložit/Další ▾) + stav uložení — Věk/Přesun/Barva odstraněny.
- Nový `ChildSettings` v `DetailsPanel.tsx` (uvnitř `PinnedSummary`, `useIsMobile()`-gated) nese
  Věk + Přesun (buffer/mode) se stejnými `aria-label`y jako `MobileChildrenPanel`, ať testy i
  uživatelé mají jeden konzistentní název ovládacího prvku napříč šířkami.
- Barva kroužku zůstává jen v `SelectedActivity` (žádná duplicitní kopie).

## 2. Acceptance criteria

- **AC-1**: `getByRole('banner').getByText('Věk:')`/`'Přesun:'`/`'Barva:'` neexistují na ŽÁDNÉ
  šířce (dřív jen na mobilu skryté přes CSS, teď odstraněné úplně).
- **AC-2**: `getByLabel('Věk dítěte')` resolvuje na PRÁVĚ JEDEN prvek na všech 6 profilech (mobil:
  `MobileChildrenPanel`; desktop/medium po otevření Souhrnu: `ChildSettings`) — žádná duplicita.
- **AC-3**: T-185 (validace věku 3–19), T-175 (přesun 0 min zruší logistické upozornění), T-157
  (pořadí sekcí v detailu), T-167 (mobilní lišta skrývá věk/přesun) zůstávají zelené.
- Vizuální baseline (`toolbar.png`, `empty-info.png`, `catalog-filtered.png`, `info-dark.png` na
  `desktop`/`desktop-narrow`/`tablet-landscape`) přegenerovány.

## 3. Non-goals / notes

- BL-052 nyní čítá 5 zbylých položek Vlny 3 (FR-W3-1/2/3/4/6) — FR-W3-7 hotovo.
