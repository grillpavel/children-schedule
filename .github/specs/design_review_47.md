# Design Review 47 — Microcopy filtru: „Bez konfliktu" místo „Vejde se mi to"

**Status:** IMPLEMENTED
**Change ID:** CHANGE-48 (přejmenování filtru `fitOnly` z „Vejde se mi to" na výstižnější „Bez konfliktu" — app `@krouzky/web` + úprava testů T-114/T-115)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** BL-031 (microcopy z analýz 44a/b). Kolokviální „Vejde se mi to" nevystihuje, co filtr dělá (skrývá kroužky, které kolidují s aktuálním rozvrhem). Druhá část BL-031 microcopy („+1" → „N termínů") už je vyřešená (T-110/T-120, v kódu žádné „+1").

## 0. SOTA analysis
- **0.1 Problem.** Filtr `fitOnly` skrývá kroužky kolidující s aktuálním rozvrhem, ale popisek „Vejde se mi to" je vágní a nevysvětluje kritérium.
- **0.2 Approach.** Přejmenovat popisek na „Bez konfliktu". Chování filtru (`fitOnly`, `disabled` u prázdného rozvrhu) beze změny. Testy T-114/T-115 lokalizují checkbox podle přístupného názvu → aktualizovat jejich název i lokátor.

## 1. Requirements
- **FR-1** Filtr dříve „Vejde se mi to" se v katalogu zobrazuje jako „Bez konfliktu"; funkce (skrytí kolidujících, zašedlý u prázdného rozvrhu) beze změny.

## 2. Acceptance criteria
- **AC-1** (FR-1) T-114 („Bez konfliktu" skryje kolidující) a T-115 („Bez konfliktu" zašedlé u prázdného rozvrhu) zelené na desktopu; celý `catalog.spec` zelený.
- **AC-2** Beze změny vizuálu: `visual.spec` T-400..403 zelené na desktopu i mobilu bez regenerace baselines; `apps/web` `tsc` čisté.

## 3. Non-goals / notes
- Netýká se logiky detekce kolizí ani doménového enginu — čistě popisek + testy.
- Zbytek BL-031 (přesun Otevřít/Uložit/Další/Kalendář do mobilního menu) zůstává otevřený.
