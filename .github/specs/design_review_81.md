# Design Review 81 — Vlna 3, FR-W3-6: audit mezer dark módu (design_review_73.md)

**Status:** PARTIAL (bezpečnostní záplata + audit; plná tokenizace ZŮSTÁVÁ OTEVŘENÁ jako BL-054)
**Change ID:** CHANGE-88 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Trigger:** Pokračování BL-052 po CHANGE-87 (FR-W3-3).

## 0. SOTA analýza

- **Architektura dark módu (nezměněna tímto changem):** aplikace nepoužívá Tailwind `dark:`
  variantu na místě použití. Místo toho `globals.css` obsahuje jeden velký
  `@media (prefers-color-scheme: dark)` blok, který ENUMERUJE konkrétní Tailwind utility třídy
  (`.bg-white { background-color: ... }` atd.) a přepisuje jejich barvu. Nová utility třída
  použitá v komponentě, která v enumeraci chybí, v dark módu prostě zůstane svou SVĚTLOU barvou —
  to je přesně mechanismus, který FR-W3-6 auditu vadí („nová třída bez ruční dark-mapace nerozbije
  dark mode").
- **Reálně nalezená regrese:** CHANGE-86 (FR-W3-2) přidal `bg-red-50/60` do `DetailsPanel.tsx` —
  tato třída v enumeraci CHYBĚLA. Ověřeno empiricky (dočasným vrácením opravy a spuštěním T-230):
  axe nahlásil kontrast **1.32:1** (`text-red-700` #fca5a5 na nepřemapovaném `bg-red-50/60`),
  požadováno 4.5:1 — reálná, ne hypotetická regrese.
- **Audit zbytku codebase** (`grep` na `(bg|text|border)-(barva)-NN/NN` napříč `apps/web/src/components`)
  našel dalších 5 opacitních tříd bez dark mapování: `border-emerald-200/80` (CatalogPanel),
  `border-slate-200/60` (DetailsPanel), `border-slate-300/80` (ScheduleGrid), `bg-slate-900/50`
  (CustomEntryDialog — modální překryv), `bg-red-600/90` (ScheduleGrid — odznak konfliktu).
  Poslední dvě jsou VĚDOMĚ ponechány beze změny — jde o sytý akcent/dimming efekt, který má
  vypadat STEJNĚ v obou režimech (modální clona, plný barevný odznak), ne o barvu odvozenou od
  světlého povrchu, která by v dark módu měla vzniknout jinak.

## 1. Co bylo opraveno

- `globals.css`: přidány 3 chybějící pravidla — `.bg-red-50\/60`, `.border-emerald-200\/80`,
  `.border-slate-200\/60`, `.border-slate-300\/80` (4 pravidla celkem).
- Nový test **T-230** (`a11y.spec.ts`): reprodukuje T-228 scénář (kolize `scns-atletika-1`) v
  dark módu (`page.emulateMedia({ colorScheme: 'dark' })`) a ověří `axe` 0 violations. Ověřeno
  empiricky, že bez opravy test SELŽE s přesně tou regresí popsanou výše (dočasný `git stash` na
  `globals.css`), s opravou PROJDE na všech 6 profilech.

## 2. Co zůstává otevřené — BL-054 (nová položka)

Plná tokenizace (nahrazení celé enumerace skutečnými CSS proměnnými nebo přechod na Tailwind
`dark:` variantu psanou přímo u každé třídy) by vyžadovala projít VŠECH ~9 komponentových souborů
a u každé barevné utility třídy přidat/ověřit dark ekvivalent — to je srovnatelný rozsah jako
BL-046 (spacing/radius tokeny), včetně nutnosti přegenerovat všechny vizuální baseline
(`toolbar`/`empty-info`/`catalog-filtered`/`info-dark`/... na všech profilech) a rizika plošné
vizuální regrese bez funkčního přínosu. Vědomě NEIMPLEMENTOVÁNO v tomto rozsahu — založena
BL-054, čeká na vlastní prioritizaci stejně jako BL-046.

## 3. Acceptance criteria

- **AC-1 (T-230)**: kolizní sekce FR-W3-2 v dark módu nemá žádné axe violations na žádném ze
  6 profilů.
- `tsc --noEmit` (web) čisté; plná E2E sada 0 failed.

BL-052 nyní čítá 2 zbylé položky (FR-W3-1 drag&drop, FR-W3-4 sdílený odkaz) — FR-W3-6 je
částečně adresován (bezpečnostní záplata), plná tokenizace přesunuta do BL-054.
