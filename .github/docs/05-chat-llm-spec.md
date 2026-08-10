# 05 — Specifikace chatu a LLM vrstvy

**Milník:** M1 (M0 je bez LLM a musí být plně funkční bez něj)

---

## 1. Role LLM v systému

LLM má přesně tři úkoly a žádný jiný:

| # | Úkol | Vstup | Výstup |
|---|------|-------|--------|
| 1 | **Překlad** přirozeného jazyka na strukturovaná omezení a akce | text uživatele + katalog (zúžený) + aktuální stav | tool calls |
| 2 | **Vysvětlení** výsledku solveru | `ScheduleVariant` / `Infeasibility` objekt | česká věta |
| 3 | **Zodpovězení dotazu** nad katalogem | dotaz + relevantní výřez katalogu | odpověď s odkazem na kroužek |

### Co LLM nesmí

- ❌ Určovat časy, dny nebo termíny kroužků
- ❌ Vymýšlet kroužky, ceny, kontakty nebo adresy
- ❌ Přímo měnit `PlannerState` — může jen navrhnout diff
- ❌ Rozhodovat o splnitelnosti — to počítá solver
- ❌ Interpretovat data, která v katalogu chybí

Pokud uživatel žádá informaci, která v katalogu není, správná odpověď je
**„tuto informaci nemám, v katalogu není uvedena"** plus odkaz na kontakt
poskytovatele. Nikdy odhad.

## 2. Tool calling — definice nástrojů

Nástroje jsou **jediná** cesta, jak chat ovlivní aplikaci. Volný text z LLM
se nikdy neparsuje na akce.

```ts
// --- čtení ---
search_activities(q?: string, category?, ageFor?: childId,
                  weekday?, maxPrice?, providerId?) -> Activity[]
get_activity_detail(activityId) -> Activity & { sessions: Session[], provider: Provider }
get_current_schedule(childId?) -> { enrollments, conflicts, totalCost }
list_constraints(childId?) -> ConstraintRecord[]

// --- návrh změn (vrací DIFF, nikdy nemění stav) ---
propose_add_activity(childId, activityId, sessionId?) -> Diff
propose_remove_activity(childId, activityId) -> Diff
propose_change_session(childId, activityId, sessionId) -> Diff
propose_set_constraint(childId | 'all', constraint, severity, weight?) -> Diff
propose_remove_constraint(constraintId) -> Diff
propose_solve(childId?, includeActivityIds?) -> ScheduleVariant[]   // volá solver

// --- vysvětlení ---
explain_conflicts(childId?) -> Conflict[]
```

**`propose_*` nástroje vracejí diff, který se vykreslí v UI a čeká na potvrzení.**
Uživatel klikne `Použít` → teprve tehdy se změní stav. LLM se o potvrzení
dozví v dalším kole jako systémovou zprávu.

Pokud `sessionId` není zadáno u `propose_add_activity`, aplikace vybere termín
solverem (ne LLM) a v diffu vysvětlí proč.

## 3. Kontext předávaný modelu

**Nikdy se neposílá celý katalog.** Katalog může mít 150 aktivit × detaily.

Postup:
1. Systémový prompt (statický, viz §5).
2. Kompaktní stav: děti (anonymizované), seznam zapsaných kroužků s ID a časy,
   aktivní omezení, seznam konfliktů.
3. Katalog se předává **jen jako výsledek tool callu** `search_activities`,
   v zúžené podobě (id, název, kategorie, věk, cena, počet termínů).
4. Detaily až na vyžádání `get_activity_detail`.

## 4. Anonymizace (GDPR)

Před odesláním na API se z kontextu nahrazují jména dětí placeholdery:

```
"Julinka" → "CHILD_1"
```

Mapování žije **jen v prohlížeči**. Odpověď modelu se před zobrazením
zpětně přemapuje. Škola dítěte se posílá pouze jako čas konce vyučování,
ne jako název ani adresa.

## 5. Systémový prompt — kostra

```
Jsi asistent pro plánování zájmových kroužků dětí. Mluvíš česky, stručně,
věcně.

TVRDÁ PRAVIDLA:
1. Nikdy neuváděj čas, den, cenu, adresu ani kontakt kroužku, který jsi
   nezískal z nástroje. Pokud informaci nemáš, řekni to.
2. Nikdy neměň rozvrh přímo. Používej výhradně nástroje propose_*.
3. O tom, zda se rozvrh vejde, rozhoduje nástroj propose_solve, ne ty.
   Nikdy netvrď, že něco jde nebo nejde, bez jeho zavolání.
4. Když uživatel vysloví preferenci ("nechci nic v pátek"), převeď ji na
   omezení nástrojem propose_set_constraint a zeptej se, zda je to tvrdý
   požadavek, nebo jen přání — pokud to z formulace nevyplývá jednoznačně.
5. Neodhaduj, nedopočítávej, neinterpoluj chybějící údaje.

FORMÁT ODPOVĚDI:
- Nejvýše 3 věty, pokud uživatel nechce víc.
- Po zavolání propose_* stručně shrň, co diff obsahuje, a nech uživatele
  potvrdit. Nepředstírej, že už je to provedeno.
```

## 6. Příklady interakcí (slouží i jako testovací případy)

| Vstup | Očekávané tool cally | Očekávaná odpověď |
|-------|---------------------|-------------------|
| „Nechci nic v pátek" | `propose_set_constraint(all, no_activities_on[5], hard)` | Potvrdí a zeptá se, zda tvrdě, nebo jen preferenčně |
| „Chci plavání" | `search_activities(q='plavání', ageFor=child1)` → `propose_add_activity` | Nabídne nalezené varianty, pokud je jich víc |
| „Kolik mě to bude stát?" | `get_current_schedule()` | Uvede částky rozepsané podle období, nesčítá pololetní s měsíčními |
| „Sestav mi rozvrh" | `propose_solve()` | Zobrazí varianty jako diff |
| „Je keramika vhodná pro sedmileté?" | `get_activity_detail(...)` | Odpoví podle `ageMin/ageMax`; pokud údaj chybí, řekne to |
| „Kdo vede florbal?" (údaj chybí) | `get_activity_detail(...)` | „V katalogu není uvedeno. Kontakt na DDM: …" |
| „Vymysli mi nějaký kroužek robotiky" (v katalogu není) | `search_activities` → prázdno | „V katalogu žádný kroužek robotiky není." **Nesmí si vymyslet.** |

## 7. Architektura volání

```
Prohlížeč ──POST /api/chat──▶ Edge function (stateless)
                                    │
                                    └──▶ LLM API
```

Edge function:
- **nesmí logovat obsah** zpráv,
- **nesmí nic ukládat**,
- drží pouze API klíč,
- provádí rate limiting podle IP (ochrana klíče),
- validuje velikost payloadu.

Tool cally se **vykonávají v prohlížeči**, ne na serveru — katalog i stav
jsou na klientovi. Server jen přeposílá zprávy tam a zpět.

## 8. Ošetření chyb

| Chyba | Chování |
|-------|---------|
| LLM API nedostupné | Chat zobrazí „Asistent je nedostupný, rozvrh můžete dál sestavovat ručně." Aplikace zůstává plně funkční. |
| LLM vrátí nevalidní tool call | Jedno automatické zopakování s chybovou zprávou; poté fallback na text |
| LLM tvrdí fakt bez tool callu | Nelze automaticky detekovat úplně; mitigace = pravidlo v promptu + eval sada (viz `08-test-plan.md`) |
| Rate limit | Zobrazí zbývající čas |

## 9. Rezervované rozšíření (M2)

Import katalogu z PDF/URL přes LLM je samostatný tok popsaný
v `06-catalog-ingest-spec.md`. Nesdílí prompt ani nástroje s plánovacím chatem.
