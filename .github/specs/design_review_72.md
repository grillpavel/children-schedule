# Design Review 72 — Funkční audit chyb: 8 tichých selhání (after_review_71)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-80 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Repo:** monorepo `Children_schedule`, dotčen jen `apps/web`
**Trigger:** Uživatel sdílel nový audit `.github/audit/after_review_71/` — funkční audit chybových stavů
(`docs/functional-error-handling-audit.md`, 8 nálezů) + rozsáhlý UI/UX/responzivní audit (HTML report).
Tento spec pokrývá jen **funkční audit** (8 nálezů, validovány subagentem proti zdroji — všech 8
potvrzeno pravdivých s přesnými řádky). Velký UI/UX redesign audit je samostatně zpracován jako
`design_review_73.md` (DRAFT, čeká na prioritizaci).

## 0. SOTA analýza

### 0.1 Problém — 8 potvrzených nálezů (ověřeno subagentem proti zdroji, ne odhadem)

1. `exportAllChildrenIcs()` (`Toolbar.tsx`) spouští `downloadIcs()`/`.click()` v cyklu bez odstupu —
   prohlížeče blokují druhé a další programové stažení bez samostatného gesta uživatele.
2. `saveAutosave()` (`autosave.ts`) má prázdný `catch` — `setItem` selže tiše (soukromý režim, plné
   úložiště) a status pilulka „Uloženo" o tom nic neví.
3. `downloadPng`/`exportPng` nemá `try/catch` kolem `toPng()` — chyba (tainted canvas) = ticho.
4. `importJson()`'s ICS větev nemá `try/catch` (JSON větev ano) — poškozený `.ics` může spadnout beze
   zprávy.
5. `setChildAge()` ukládá `age` bez validace rozsahu/`NaN` — `<input min/max>` je jen HTML doporučení.
6. Chybí `apps/web/app/error.tsx` — neošetřená chyba renderu vybílí stránku bez cesty zpět.
7. `removeChild`/`removeSchedule` nemají `lastActionLabel` v `after` callbacku (na rozdíl od
   `removeEnrollment`/`removeCustomEntry`) — nejrizikovější akce bez toastu se Zpět.
8. Terminologie „Kalendář" (dítě) vs. „Rozvrh"/„Varianta" (`NamedSchedule`) nikde v UI vysvětlená
   viditelně (jen skrytý `title`).

### 0.2 Přístup

- **Fix 1**: `exportAllChildrenIcs` teď plánuje stahování přes `setTimeout(…, i * 400)` (sekvenčně,
  s odstupem), po posledním zavolá nový store action `announce(label)` → toast „Staženo N kalendářů".
- **Fix 2**: `saveAutosave` vrací `boolean`; `page.tsx`'s store-subscribe callback ukládá výsledek do
  nového stavu `autosaveOk`, předaného `Toolbar`u jako nová povinná prop. Status pilulka má nyní TŘI
  stavy (Uloženo/Neuloženo/**Ukládání selhalo** — červená, s `title` vysvětlením a odkazem na export).
- **Fix 3**: `exportPng` obalen `try/catch`, při chybě `alert('Obrázek se nepodařilo vytvořit…')`.
- **Fix 4**: ICS větev `importJson` obalena `try/catch`, při chybě `alert('Soubor .ics se nepodařilo
  přečíst.')` — stejný vzor jako existující JSON větev.
- **Fix 5**: `setChildAge` guard `Number.isFinite(age) && age>=3 && age<=19`, jinak no-op (zachová
  poslední platnou hodnotu — řízený `<input value={child.age}>` se vizuálně vrátí na starou hodnotu).
- **Fix 6**: nový `apps/web/app/error.tsx` (Next.js App Router konvence) — tlačítko „Obnovit"
  (`reset()`) + „Načíst stránku znovu" + poznámka, že rozvrh zůstává v autosave.
- **Fix 7**: `removeChild`/`removeSchedule` teď mají `label` proměnnou nastavenou uvnitř `mutate`, v
  `after` callbacku zapisují `lastActionLabel`/`lastActionNonce` — stejný vzor jako `removeEnrollment`.
- **Fix 8**: `VariantTabs.tsx` získal viditelný popisek „Varianty rozvrhu:" s `title` vysvětlením
  (varianta = alternativní rozvrh TÉHOŽ kalendáře, ne nový kalendář); tlačítko „Nový" má upřesněný
  `title`. Bez zásahu do datového modelu (jen textová nápověda — hlubší přejmenování bylo záměrně
  odmítnuto už v `design_review_70.md §3`/`BL-049`).
- Nová store akce `announce(label)` — lehký `set()` (ne `commit()`, nejde do historie undo/redo) pro
  zobrazení toastu z komponent mimo store akce (dřív šlo jen z `commit()`'s `after` callbacku).

## 1. Requirements

- **FR-1**: Export všech kalendářů stahuje soubory s odstupem (~400 ms) a po dokončení zobrazí toast
  s počtem stažených souborů.
- **FR-2**: Selhání zápisu do `localStorage` je viditelné v UI (odlišná barva/text status pilulky), ne
  tiché.
- **FR-3**: Chyba při generování PNG zobrazí uživateli srozumitelnou zprávu.
- **FR-4**: Chyba při parsování `.ics` při importu zobrazí srozumitelnou zprávu (stejně jako u JSON).
- **FR-5**: Věk dítěte mimo rozsah 3–19 (včetně `NaN`) se do stavu nezapíše.
- **FR-6**: Neošetřená chyba renderu zobrazí obnovitelnou stránku s tlačítkem „Obnovit", ne bílou
  obrazovku.
- **FR-7**: Odebrání kalendáře i odebrání varianty rozvrhu zobrazí toast s akcí „Zpět".
- **FR-8**: Rozdíl mezi „kalendář" a „varianta rozvrhu" je viditelně vysvětlen v UI (ne jen skrytý
  `title`).

## 2. Acceptance criteria

- **AC-1** (FR-1, FR-7): T-186 (schedule.spec.ts) — export více kalendářů zůstává funkční (T-610
  nezregredoval); odebrání kalendáře i varianty rozvrhu zobrazí tlačítko „Zpět".
- **AC-2** (FR-5): T-185 (schedule.spec.ts) — zadání „999" do pole věku se nezapíše, pole se vrátí na
  předchozí hodnotu.
- **AC-3** (FR-2): manuální/kódová kontrola — `saveAutosave` vrací `boolean`, `Toolbar` dostává
  `autosaveOk` a zobrazuje třetí (červený) stav; pokryto existující sadou beze změny (T-151/T-159 dál
  zelené s `autosaveOk` defaultně `true`).
- **AC-4** (FR-3, FR-4, FR-6, FR-8): kódová kontrola (try/catch obaly, existence `error.tsx`, viditelný
  popisek ve `VariantTabs.tsx`) — bez dedikovaného E2E testu (viz §3, nízké riziko/obtížně
  reprodukovatelné selhání v E2E bez umělého zásahu do parseru/rendereru).

## 3. Non-goals / notes

- Nepřidáváme dedikovaný E2E test na vynucení pádu `parseIcs`/render chyby — `parseIcs` je psaný
  defenzivně (`??`/guardy všude), spolehlivé vyvolání výjimky by vyžadovalo umělý zásah do parseru jen
  pro test, což by test-only kód dostalo do produkční cesty. Oprava (try/catch) je defenzivní pojistka
  bez ohledu na to, jak snadno je dnes reprodukovatelná.
- Nepřejmenováváme `Child`/`NamedSchedule` koncepty (viz `design_review_70.md §3`, `BL-049`) — fix 8 je
  jen viditelná textová nápověda.
- Velký UI/UX/responzivní redesign audit (breakpointy, dark mode, drag&drop, ARIA mřížka, sdílení) je
  mimo scope tohoto spec — zpracován samostatně, `design_review_73.md` (DRAFT).
