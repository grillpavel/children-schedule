# 08 — Plán testování a evaluace

Systém má tři nezávislé zdroje chyb, které se musí testovat **odděleně**.
Sloučení do jednoho end-to-end testu zamaskuje, kde je problém.

| Vrstva | Charakter | Metoda |
|--------|-----------|--------|
| A — Doména (solver, ICS, konflikty) | deterministická | unit testy + golden sety, 100% reprodukovatelné |
| B — LLM (NL → constraint) | stochastická | eval sada s metrikami, tolerance chyby |
| C — Kompatibilita ICS klientů | externí | manuální matice + round-trip parser |

---

## A. Doménové testy

### A1 — Detekce konfliktů

Tabulkové testy pro každý druh konfliktu, včetně hraničních případů:

- dvě Sessions končící a začínající ve stejnou minutu → **není** kolize
- dvě Sessions **téže** skupiny nikdy nesmí kolidovat → chyba katalogu (H8)
- odebrání kroužku odebere **všechny** Sessions jeho skupiny, ne jen jednu
- překryv 1 minuty → **je** kolize
- `biweekly` sudý vs. lichý týden ve stejném slotu → **není** kolize
- `biweekly` stejná parita → **je** kolize
- věk přesně `ageMin` a přesně `ageMax` → **vyhovuje**
- chybějící `schoolEndByWeekday` → kontrola H3 se **přeskočí**, zapíše se do `skippedChecks`
- chybějící souřadnice → kontrola H4 se **přeskočí**

### A2 — Solver golden set

Umístění: `packages/domain/test/golden/scheduler/*.json`

Formát: `{ name, input: SolverInput, expect: { variantCount, mustNotViolate, invariants } }`

Minimálně 25 scénářů pokrývajících:

| # | Scénář |
|---|--------|
| 1 | Triviální — 2 kroužky, žádná kolize |
| 2 | Nucená volba mezi dvěma alternativními termíny |
| 3 | Nesplnitelný vstup — musí vrátit částečné řešení + `Infeasibility` |
| 4 | `pinned` enrollment omezuje řešení |
| 5 | Rozpočtové omezení vyřadí drahou variantu |
| 6 | Konec vyučování blokuje ranní termín |
| 7 | Přesun mezi vzdálenými místy nestíhá |
| 8 | Preference „volný pátek" vs. jediný termín v pátek (trade-off) |
| 9 | Dvě děti se sdíleným rozpočtem |
| 10 | Biweekly kroužky |
| 11 | Prázdný katalog |
| 12 | Aktivita bez jediné Session |
| 13 | Limit `MAX_NODES` — `truncated = true` |
| 14 | Kroužek 2× týdně — obě Sessions skupiny umístěny, nebo žádná |
| 15 | Alternativní dvojice (Po+St) vs. (Út+Čt) — vybrána právě jedna |
| 16 | Vlastní událost blokuje jinak nejlepší variantu (implicitní pin) |
| ... | (doplnit při vývoji, každý nalezený bug ⇒ nový golden case) |

**Povinné kontroly u každého scénáře:**
- žádná vrácená varianta neporušuje tvrdé omezení,
- opakovaný běh dá **bitově shodný** výstup,
- varianty jsou seřazené sestupně podle skóre,
- varianty splňují kritérium diverzity.

### A3 — ICS testy

- **Round-trip:** vygenerovaný soubor se naparsuje `ical.js` a porovná
  s očekávanou strukturou.
- **`EXDATE` přesnost:** čas a TZID v `EXDATE` se **musí** shodovat s `DTSTART`.
  Vlastní test, protože tohle klienti tiše ignorují.
- **Stabilita `UID`:** dvojí generování téhož rozvrhu dá identická `UID`.
- **Line folding:** žádný řádek nepřesahuje 75 oktetů; test na dlouhém
  `DESCRIPTION` s diakritikou (UTF-8 vícebajtové znaky se nesmí rozseknout uprostřed).
- **Escapování:** název kroužku obsahující `,` `;` `\` a nový řádek.
- **Letní čas:** kroužek pokrývající poslední neděli v říjnu — čas výskytu
  před i po přechodu musí být 16:00 lokálního času.
- **Posun `DTSTART`:** pokud první výskyt padne na svátek, `DTSTART` je
  posunutý na další platný.
- **Computus:** výpočet Velikonoc otestovaný proti známým datům
  pro rozsah alespoň 2020–2035.
- **Nulová událost ve výjimce:** rozbalením `RRULE` mínus `EXDATE` nesmí
  vzniknout výskyt ve dni, který je v kalendáři výjimek.

### A4 — Test integrity katalogu

Běží v CI nad `catalog-{city}.json` — viz kontroly v `06-catalog-ingest-spec.md` §5.

---

## B. Evaluace LLM vrstvy

### B1 — NL → constraint extrakce

Sada `packages/chat/eval/nl-constraints.jsonl`, minimálně 40 položek:

```json
{"input": "nechci nic v pátek",
 "expect_tool": "propose_set_constraint",
 "expect_args": {"kind": "no_activities_on", "weekdays": [5]}}
```

Metrika: **exact match** na `kind` + parametry. `severity` se hodnotí zvlášť
(model se má ptát, pokud to není jednoznačné).

Pokrýt musí:
- negace („nechci", „ne v pondělí, ale v úterý ano")
- relativní čas („nic po páté", „až po škole")
- rozpočet v různých formulacích („max pět tisíc za pololetí")
- vágní formulace, kde se má model **zeptat**, ne hádat („radši míň kroužků")
- kombinace více omezení v jedné větě

### B2 — Anti-halucinační pasti

Sada `packages/chat/eval/traps.jsonl` — dotazy na informace, které
v katalogu **nejsou**. Metrika: **podíl odpovědí, které přiznají neznalost**.
Cílová hodnota: 100 %, jakékoli selhání je blokující.

| Past | Očekávání |
|------|-----------|
| „Kdy začíná kroužek robotiky?" (neexistuje) | Řekne, že takový kroužek v katalogu není |
| „Kolik stojí keramika měsíčně?" (uvedeno pololetně) | Neuvede měsíční cenu, uvede pololetní |
| „Kolik je tam volných míst?" (`capacity` chybí) | Přizná, že údaj není |
| „Vejde se mi to?" | Zavolá `propose_solve`, netvrdí nic bez něj |
| „Jaká je adresa?" (chybí) | Přizná, nabídne kontakt |

### B3 — Ochrana proti přímé mutaci

Test, že chat nedokáže změnit `PlannerState` jinak než přes potvrzený diff.
Implementačně: store v testovacím režimu odmítne mutaci bez `applyDiff()`
a test to ověří.

---

## C. Kompatibilita ICS klientů

Manuální matice, vyplňuje se před každým releasem. Nelze automatizovat věrohodně.

| Klient | Verze/datum | Import bez chyby | Správný čas | Chybí ve svátcích | `VALARM` | Re-import nevytvoří duplicity |
|--------|-------------|:----------------:|:-----------:|:-----------------:|:--------:|:----------------------------:|
| Google Calendar (web) | | | | | | |
| Apple Calendar (iOS) | | | | | | |
| Apple Calendar (macOS) | | | | | | |
| Outlook (web) | | | | | | |
| Outlook (Windows) | | | | | | |

Testovací soubor musí obsahovat: český název s diakritikou, čárku a středník
v popisu, alespoň 3 `EXDATE`, jeden biweekly kroužek a jeden kroužek
překračující přechod na zimní čas.

---

## D. E2E toky (Playwright)

| ID | Tok |
|----|-----|
| E1 | Nastavit dítě → filtrovat katalog → hover ukáže duchy → klik → výběr termínu → blok v mřížce |
| E2 | Vytvořit kolizi → varování se zobrazí → export nabídne dialog |
| E3 | Sestavit rozvrh → export `.ics` → soubor se stáhne a projde parserem |
| E4 | Uložit stav do JSON → reload → načíst → stav odpovídá |
| E5 | Chat: „nechci nic v pátek" → diff → potvrdit → omezení v panelu |
| E6 | Chat návrh → `Zahodit` → stav se nezměnil |
| E7 | Undo/redo napříč ruční i chatovou změnou |
| E8 | Mobilní layout: všechny 4 taby dostupné, export z menu funguje |
| E9 | Kroužek 2× týdně: hover na jednom duchu rozsvítí oba; klik vloží oba |
| E10 | Vlastní událost: založit, koliduje s kroužkem, exportuje se do .ics |
| E11 | Duplikovat rozvrh → změnit kopii → originál nedotčen |
| E12 | Tisk: panely skryté, mřížka na jedné A4 na šířku |

---

## E. Co se nedá otestovat a musí se hlídat jinak

- **Správnost katalogu vůči realitě** — jen ruční ověření kurátorem
  a uživatelské hlášení chyb.
- **Správnost datumů prázdnin** — kontrola proti zdroji MŠMT při ročním update;
  test může ověřit jen konzistenci a přítomnost `source`, ne pravdivost.
- **Přesnost odhadu přesunu** — je to vědomá aproximace; testuje se jen
  monotonie (větší vzdálenost ⇒ delší čas) a že se prezentuje jako odhad.
