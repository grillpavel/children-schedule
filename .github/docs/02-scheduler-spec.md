# 02 — Specifikace plánovače (solver)

Balíček: `packages/domain/src/scheduler`
Charakter: **čistá funkce**, deterministická, bez I/O.

```ts
solve(input: SolverInput): SolverResult
```

Stejný vstup ⇒ vždy stejný výstup, včetně pořadí variant. Žádné `Math.random()`,
žádné `Date.now()` uvnitř solveru (aktuální datum je vstupní parametr).

---

## 1. Formulace problému

**Proměnné:** pro každou Activity, kterou rodič označil jako „chci"
(`status = considering | selected`), jedna proměnná.

**Doména proměnné:** množina **SessionGroups** dané Activity **plus** speciální
hodnota `UNASSIGNED` (kroužek se do rozvrhu nevejde).

Pozor: doménou je skupina, ne jednotlivý termín. Přiřazením skupiny se do
rozvrhu umístí **všechny** její Sessions najednou a kolize se vyhodnocují
pro každou z nich. Skupinu nelze rozpojit.

**Úkol:** přiřadit každé proměnné hodnotu tak, aby byla splněna všechna tvrdá
omezení, a maximalizovat skóre měkkých omezení.

Velikost problému je malá (typicky 3–8 aktivit × 1–4 skupiny), takže **stačí
backtracking s propagací**. Nezavádět OR-Tools, MiniZinc ani jiný externí solver.

## 2. Tvrdá omezení (hard)

| ID | Omezení | Podmínka porušení |
|----|---------|-------------------|
| H1 | Časová kolize | Dvě Sessions téhož dítěte z různých skupin se překrývají v čase ve stejném týdnu (pozor na `biweekly.parity` — různá parita nekoliduje) |
| H2 | Věk | `child.age < activity.ageMin \|\| child.age > activity.ageMax` |
| H3 | Konec vyučování | `session.startMinutes < child.schoolEndByWeekday[day] + travelBuffer` |
| H4 | Přesun | Mezi dvěma po sobě jdoucími Sessions téhož dne není dost času na přesun (viz §4) |
| H5 | Platnost termínu | Kterákoli Session skupiny je neplatná v rozsahu školního roku |
| H8 | Vnitřní kolize skupiny | Dvě Sessions **téže** skupiny kolidují — vada katalogu, odchytí validátor |
| H6 | Uživatelské hard omezení | Kterýkoli `ConstraintRecord` se `severity: 'hard'` |
| H7 | Pin | Enrollment s `pinned: true` musí zůstat na své `sessionGroupId`; vlastní události jsou implicitně pinned |

**H3 se nevyhodnocuje**, pokud `child.schoolEndByWeekday[day]` je `undefined`.
**H4 se nevyhodnocuje**, pokud kterákoli z adres nemá `lat`/`lon`.
Nevyhodnocené omezení se zapíše do `SolverResult.skippedChecks` a UI to zobrazí
jako informaci („dosažitelnost neověřena — chybí adresa").

## 3. Měkká omezení (soft) a scoring

Skóre varianty:

```
score = Σ (weight_i × satisfied_i) − Σ (weight_j × violated_j) − penalty_unassigned
```

kde `penalty_unassigned = 100 × počet_UNASSIGNED` (dominuje nad vším ostatním —
solver má vždy přednostně umístit co nejvíc kroužků).

Doporučené výchozí měkké preference (uživatel je může vypnout):

| ID | Preference | Výchozí váha |
|----|-----------|--------------|
| S1 | Nejvýše 2 aktivity v jednom dni (únava) | 5 |
| S2 | Alespoň 1 zcela volný všední den | 6 |
| S3 | Preferovat dřívější časy (dřívější návrat domů) | 3 |
| S4 | Minimalizovat počet dní, kdy je nutná doprava | 7 |
| S5 | Minimalizovat celkovou cenu | 4 |
| S6 | Kompaktnost dne — minimalizovat prostoje mezi aktivitami | 5 |
| S7 | Rozložení kategorií (nemít jen sport) | 2 |

Váhy jsou v konfiguraci `DEFAULT_SOFT_WEIGHTS`, ne zadrátované v algoritmu.

## 4. Model přesunu

Bez backendu není k dispozici routovací API. Použije se aproximace:

```ts
travelMinutes(a: Address, b: Address, mode: TravelMode): number | undefined
```

1. Pokud chybí souřadnice u kterékoli adresy → `undefined` (kontrola se přeskočí).
2. Vzdušná vzdálenost (haversine) × `DETOUR_FACTOR` (výchozí `1.35`).
3. Děleno rychlostí podle `mode`: `walk = 4.5 km/h`, `car = 30 km/h` (městský provoz),
   `transit = 15 km/h`.
4. Plus fixní `MODE_OVERHEAD`: `walk = 0`, `car = 5` min (parkování), `transit = 8` min (čekání).
5. Plus uživatelský `min_travel_buffer` (výchozí 10 min).

**Toto je záměrně hrubý odhad.** UI musí u varovaní o přesunu uvádět
„odhad, ~X min" a nikdy to neprezentovat jako přesný výpočet.
Pokud jsou obě Sessions na stejné adrese (`provider.id` shodné a bez override),
`travelMinutes = 0`.

## 5. Algoritmus

```
solve(input):
  1. preprocess:
     - odfiltruj Sessions porušující H2, H3, H5 (unární omezení) z domén
     - pinned enrollments → doména fixována na jednu hodnotu
     - pokud je doména prázdná → proměnná dostane jen UNASSIGNED
  2. backtrack(assignment, remainingVars):
     - pokud remainingVars prázdné → ohodnoť a vlož do beam (top-K)
     - vyber proměnnou heuristikou MRV (nejmenší doména první),
       tie-break stabilně podle activityId (kvůli determinismu)
     - pro každou hodnotu v doméně (řazeno stabilně):
         - pokud porušuje H1/H4/H6/H7 vůči již přiřazeným → přeskoč
         - přiřaď, rekurze, odeber
  3. vrať top-K variant, K = 3, filtrovaných na diverzitu (viz §6)
```

**Ochrana proti explozi:** tvrdý limit `MAX_NODES = 200_000`. Při překročení
solver vrátí nejlepší dosud nalezené varianty a nastaví
`SolverResult.truncated = true`. UI to musí uživateli sdělit.

## 6. Diverzita variant

Vrátit tři skoro identické rozvrhy je k ničemu. Dvě varianty jsou považovány
za odlišné, pokud se liší v přiřazení alespoň **jedné třetiny** proměnných
(minimálně však v jedné). Při výběru top-K se varianty procházejí sestupně podle
skóre a přijme se jen ta, která je dostatečně odlišná od všech již přijatých.

## 7. Vysvětlení výsledku

`tradeoffSummary` se generuje **deterministickou šablonou**, ne LLM:

```
"Varianta B: o 400 Kč levnější, ale středa je plná (2 kroužky po sobě).
 Nesplněno: volný pátek."
```

LLM smí tuto větu později přeformulovat do plynulejšího textu, ale
**nesmí měnit ani doplňovat fakta**. Vstupem pro LLM je strukturovaný objekt
`ScheduleVariant`, ne volný text.

## 8. Nesplnitelný vstup

Pokud po preprocessingu nelze umístit žádnou variantu bez `UNASSIGNED`, solver
**nesmí selhat**. Vrátí nejlepší částečné řešení plus diagnostiku:

```ts
interface Infeasibility {
  activityId: string;
  reason: ConflictKind;
  blockingConstraints: string[];   // ConstraintRecord.id
  relaxationHint: string;          // "Uvolněním 'žádné aktivity v pátek' by se vešlo"
}
```

`relaxationHint` se počítá **skutečným přepočtem** — solver zkusí postupně
vypnout jednotlivá uživatelská hard omezení a ověří, zda to pomůže.
Nikdy se nehádá.

## 9. Výkonový požadavek

Pro 8 aktivit × 4 termíny × 2 děti musí solver doběhnout **do 300 ms**
v prohlížeči na běžném notebooku. Pokud ne, běží ve Web Workeru
a UI zobrazuje průběh.

## 10. Testovatelnost

Solver má vlastní golden set (viz `08-test-plan.md`). Každý testovací případ je
JSON soubor `{ input, expectedVariants }`. Test kontroluje:
- žádná varianta neporušuje tvrdé omezení,
- pořadí variant je stabilní mezi běhy,
- při zopakování stejného vstupu je výstup bitově shodný.
