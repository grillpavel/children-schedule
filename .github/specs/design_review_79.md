# Design Review 79 — Vlna 3, FR-W3-2: bezkolizní alternativa místo hlášení (design_review_73.md)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-86 (app-only, `@krouzky/web`; žádná změna domény)
**Date:** 2026-08-29
**Trigger:** Pokračování BL-052 po CHANGE-85 (FR-W3-7).

## 0. SOTA analýza

- Doménová `suggestVariantSwitches()` (`packages/domain/src/conflicts/suggest.ts`) existovala
  BEZE ZMĚNY od CHANGE-44 — jen nebyla nikde v UI zapojena (BL-027: „zůstává pro případné budoucí
  místo"). Funkce bere tvrdý `time_overlap` konflikt, najde ZÁPIS dítěte v jednom z kolidujících
  `enrollmentIds`, zkusí přepnout na JINOU skupinu (`sessionGroupId`) TÉŽE aktivity a spočítá, kolik
  kolizí by po přepnutí zbylo — deterministicky seřadí (méně kolizí → abecedně podle popisku).
- **Klíčové zjištění před implementací:** reálná data (`novestraseciData-2.ts`) mají u VĚTŠINY
  aktivit jen JEDNU `sessionGroup` — návrh tedy fyzicky nemá z čeho vybírat. Jen menšina aktivit
  (`scns-atletika-1/2`, `scns-atletika-pripravka`, `-mladsi/starsi-zactvo`, `scns-gymnastika`,
  `scns-box-deti`) má 2–3 skupin jako alternativní termíny — návrh se tedy u většiny kolizí
  nezobrazí (očekávané, ne chyba).
- **T-143** (`panel.spec.ts`) explicitně ověřuje, že staré CHANGE-44 chování (žádný globální panel
  „Konflikty a upozornění" ani tlačítko „Vyřešit" nikde na stránce) zůstává platné pro kolize mezi
  DVĚMA vlastními událostmi (`CustomEntry` nemá `activityId`/skupiny, návrh se pro ně nikdy
  nezobrazí) — nová funkce je proto scoped jen na `SelectedActivity` (detail vybraného katalogového
  kroužku), ne na obecný panel, a T-143 zůstal beze změny/zelený.

## 1. Requirements

- **FR-W3-2**: Když má vybraný (aktuálně otevřený v detailu) katalogový kroužek tvrdou časovou
  kolizi (`severity: 'hard'`, `kind: 'time_overlap'`), zobrazit v `SelectedActivity` sekci „Kolize
  s jiným kroužkem" s konkrétním popisem kolize a — pokud existuje — tlačítka „Přepnout na
  {termín} (bez kolize / zbyde N kolizí)" využívající `suggestVariantSwitches`. Klik rovnou
  provede `changeVariant(enrollmentId, toGroupId)`.
- Pokud žádná alternativní skupina kolizi neřeší (typický případ — jen 1 skupina u aktivity),
  zobrazit vysvětlující text „Žádný jiný termín tohoto kroužku kolizi neřeší. Zvolte jiný kroužek
  nebo jeden odeberte." — ne mlčení jako dosud.

## 2. Acceptance criteria

- **AC-1 (T-228)**: Kolidující zápis reálné aktivity se 2+ skupinami (`Atletická školička`)
  nabídne konkrétní „Přepnout na Čtvrtek … (bez kolize)"; po kliknutí kolize zmizí.
- **AC-2 (T-143, beze změny)**: Kolize dvou vlastních událostí nadále nezobrazuje žádný globální
  panel ani tlačítko „Vyřešit" — nová sekce je viditelná jen v `SelectedActivity`, ne mimo něj.
- `tsc --noEmit` (web) čisté; plná E2E sada 0 failed.

## 3. Non-goals

- Nepřidává zpět odebraný globální panel „Konflikty a upozornění" (CHANGE-44/BL-027 zůstává v
  platnosti) — návrh je vázán na kontext vybraného kroužku, ne na souhrnný pravý sloupec.
- Nerozšiřuje `suggestVariantSwitches` o nové heuristiky (např. návrh JINÉ aktivity) — jen
  zapojuje existující doménovou funkci do UI.

BL-052 nyní čítá 4 zbylé položky (FR-W3-1/3/4/6) — FR-W3-2 hotovo.
