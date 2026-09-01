# Design Review 100 — Editace kroužku měla jiné okno než editace vlastní události

**Status:** IMPLEMENTED (2026-09-01)
**Change ID:** CHANGE-107 (app-only, `apps/web`)
**Date:** 2026-09-01
**Repo:** `apps/web/src/components/DetailsPanel.tsx`
**Trigger:** uživatel nahlásil, že kroužek vybraný z katalogu má jiné okno pro
úpravu než přidaná vlastní událost.

## 0. Analýza

Potvrzeno přímým čtením kódu — jde o reálnou, dlouhodobě existující
nekonzistenci, ne subjektivní dojem:

- **Vlastní událost** (`CustomEntryDetail`, tlačítko „Upravit“): otevírá
  `CustomEntryDialog` — samostatné modální okno (`fixed inset-0 z-50` s
  ztmaveným pozadím), stejný vzor jako „+ Vlastní událost“.
- **Katalogový kroužek** (`SelectedActivity`): editace názvu/adresy/telefonu/
  ceny (`ActivityEditor`, tlačítko „Upravit údaje“) i editace termínů
  (`SessionTimeEditor`, tlačítko „Upravit časy“) se donedávna jen INLINE
  rozbalovaly uvnitř téhož panelu (`animate-in fade-in-50`, žádný backdrop,
  žádné modální okno) — žádný z obou editorů nikdy neprocházel
  refaktorem CHANGE-102/104, které explicitně sjednotily VŠECHNA ostatní
  vyskakovací okna appky na vzor `CustomEntryDialog`.

**Zvolený směr (v souladu se zavedenou konvencí CHANGE-102/104 „všechna
vyskakovací okna fungují jako `+ Vlastní událost`"):** obě editace kroužku
(`ActivityEditor`, `SessionTimeEditor`) převedeny na STEJNÝ modální vzor
(`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50
backdrop-blur-xs p-4` + centrovaný `rounded-2xl` box s hlavičkou a `IconClose`
tlačítkem „Zavřít“), místo obráceného směru (dělat editaci vlastní události
inline) — modální vzor je už zavedený, opakovaně posílený standard v celé
appce.

## 1. Requirements

- **FR-1**: `ActivityEditor` (název/adresa/telefon/cena kroužku) se po
  kliknutí na „Upravit údaje“ otevře jako modální okno vizuálně shodné s
  `CustomEntryDialog` (ztmavené pozadí, centrovaný box, hlavička s nadpisem +
  `IconClose` tlačítkem „Zavřít“). Interní pole/logika (commit onBlur,
  geokódování adresy, „Obnovit z katalogu“) beze změny.
- **FR-2**: `SessionTimeEditor` (editace termínů katalogové Session) se po
  kliknutí na „Upravit časy“ otevře stejným modálním vzorem. Interní logika
  (`SessionTimeRow`, validace start<konec, „Obnovit“ per termín) beze změny.
- **FR-3**: Obě modální okna se zavírají tlačítkem „Zavřít“ (aria-label,
  `IconClose` ikona) — nahrazuje dřívější textové „Hotovo“ jako JEDINÝ způsob
  zavření (konzistentní s `CustomEntryDialog`, který také nemá textové
  „Hotovo“).

## 2. Acceptance criteria

- **AC-1**: E2E — po kliknutí na „Upravit údaje“ je viditelný modální box s
  ztmaveným pozadím (stejná struktura jako u vlastní události).
- **AC-2**: E2E — po kliknutí na „Upravit časy“ je viditelný modální box;
  úprava termínu (start/konec) funguje beze změny chování; zavírací tlačítko
  má aria-label „Zavřít“, ne text „Hotovo“.
- **AC-3**: Regresní — existující testy T-144/T-145 (`panel.spec.ts`),
  T-178/T-179 (`schedule.spec.ts`) zůstávají funkčně beze změny záměru,
  upraveny jen lokátory zavíracího tlačítka.

## 3. Non-goals

- Neřeší se sjednocení editace jiných polí (`Child.age`/`interests`/…) —
  ty nemají žádný "jiný okno" problém, editují se přímo v panelu bez
  ekvivalentu v `CustomEntryDialog`.
- Neřeší se přidání `role="dialog"`/`aria-modal` na `CustomEntryDialog` ani
  na nové modální okno (`CustomEntryDialog` tuto ARIA sémantiku nemá od
  svého vzniku — mimo rozsah tohoto přímého bug-fixu, viz `BL-045`
  systematická a11y-audit nad ikonovými/modálními prvky).

Ověřeno: `tsc --noEmit` čisté (web), plná 6profilová E2E sada =
**780 passed / 252 skipped / 0 failed** (shodné s CHANGE-106 baseline —
nulová regrese).
