# Design Review 59 — Srozumitelný zápis dalších termínů na kartě katalogu (FR-1)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-60 (app `@krouzky/web`: implementace FR-1 z `design_review_58.md` — první
prioritizovaná položka z redesignu v5)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** uživatel zvolil FR-1 (`design_review_58.md`, DRAFT) jako první položku k implementaci z
konsolidovaného redesign backlogu ("začni od 1").

## 0. SOTA analysis

- **0.1 Problem.** Supersedes `design_review_58.md` §1 FR-1 (CHANGE-59, DRAFT). `sessionLabel()`
  v `CatalogPanel.tsx` vracela pro aktivity s víc než jedním unikátním dnem/časem strohé
  `"Po 16:30 · +1"` — číslo bez vysvětlení, co znamená. Karta je jediné velké `<button>` (klik = vybrat
  aktivitu a otevřít detail), takže „+N" nešlo udělat samostatně klikatelné bez vnořeného interaktivního
  prvku (neplatné HTML, `<button>` v `<button>`).
- **0.2 Approach.** Zamítnutá alternativa: rozbít kartu na víc vnořených interaktivních prvků (vlastní
  tlačítko jen pro „+N"), aby šlo rozkliknout `+N` odděleně od výběru karty — zamítnuto, protože by to
  vyžadovalo přestavět `renderActivityCard` z jednoho `<button>` na `<div role="button">` + vnořené
  `<button>`, což mění fokusovatelnost/klávesovou navigaci across celé katalogu bez jasného přínosu (klik
  na kartu už dnes otevře detail se **všemi** termíny, viz níže).
  Zvolené řešení: (a) text badge nahrazen srozumitelným zápisem `"Po 16:30 + 1 další termín"` /
  `"+ 2 další termíny"` / `"+ 5 dalších termínů"` (správné české skloňování, nová funkce
  `extraTerminText()`), (b) ponechán existující mechanismus „klik na kartu → vybere aktivitu → otevře
  detail, kde `DetailsPanel` sekce „Varianty docházky" vypisuje úplný seznam všech skupin s dnem a
  časem" — to už FR-1's požadavek „klik zobrazí úplný výpis" plní, protože celá karta je tímto klikem.
  Vedlejší úklid: odstraněna mrtvá/nikdy nevolaná funkce `pluralizeVariants()` (chybně kombinovala slova
  „termín"/„varianty"/„variant" pro jeden a tentýž počet — pozůstatek nedokončené dřívější úpravy).

## 1. Requirements

- **FR-1** Kompaktní karta kroužku v katalogu (a shodně i seznam „V rozvrhu", který stejnou funkci
  sdílí) nahrazuje strohé „Po 16:30 · +1" srozumitelným zápisem se slovem „termín"/„termíny"/„termínů" ve
  správném tvaru podle počtu. Klik na kartu (jediný interaktivní cíl karty) otevře detail se seznamem
  všech termínů (dnů a časů) v sekci „Varianty docházky".

## 2. Acceptance criteria

- **AC-1** Nový **T-129** (`catalog.spec.ts`): karta aktivity se 3 skupinami („Atletická školička") má
  text obsahující „další termín" (ne holé „+N"); regex pro staré „16:30 · +N" nenajde shodu; klik na
  kartu zobrazí text „Varianty docházky".
- **AC-2** `tsc --noEmit` (web) čisté; **T-120** (skloňování termínů jinde v UI) zůstává zelený beze
  změny; plná E2E `--workers=1` zelená na všech 6 profilech; vizuální baseline beze změny (textová úprava
  spadá pod `maxDiffPixelRatio`).

## 3. Non-goals / notes

- Zbylé FR z `design_review_58.md` (FR-2 „Dnes" blok, FR-3 věková shoda, FR-4 FAB typy, FR-5 toast,
  FR-6 drill-down kategorií, FR-7 tabletový master-detail, FR-8 3-stavové kolize) zůstávají DRAFT/
  neimplementované — čekají na další pokyn k prioritizaci (`design_review_58.md` §3).
- Nerozbíjíme kartu na vnořené interaktivní prvky (viz 0.2) — klik na celou kartu zůstává jediným
  interakčním modelem, konzistentní s CHANGE-12 (karta vybírá, „Přidat do rozvrhu" je CTA).
