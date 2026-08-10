# 06 — Pořízení a údržba katalogu

Balíček: `tools/catalog-ingest` — **dev-time nástroj, nikdy neběží v produkci.**

---

## 1. Princip

```
weby poskytovatelů ──scraper──▶ raw/*.html ──extraktor──▶ draft.json
                                                             │
                                                    ruční revize člověkem
                                                             │
                                                             ▼
                                    packages/domain/data/catalog-{city}.json
                                             (statický, verzovaný v Gitu)
```

Aplikace za běhu **nikdy nescrapuje**. Katalog je zabalený build-time artefakt.
To řeší výkon, spolehlivost i právní expozici najednou.

## 2. Fáze 1 — Scraper

`tools/catalog-ingest/scrape.ts`

Konfigurace zdrojů: `tools/catalog-ingest/sources.yaml`

```yaml
city: <město>
districtCode: <kód okresu>
sources:
  - id: ddm
    name: "DDM <město>"
    kind: ddm
    entryUrl: "https://..."
    strategy: html          # html | pdf | manual
    listSelector: ".krouzek-item"
    followDetail: true
    detailSelector: ".detail-content"
    robotsRespect: true
    rateLimitMs: 2000
  - id: zus
    ...
```

### Pravidla scrapingu

- Respektovat `robots.txt`. Pokud zdroj zakazuje, `strategy: manual`.
- Rate limit minimálně 2 s mezi požadavky, `User-Agent` identifikující nástroj
  a kontakt.
- Ukládat **surové HTML/PDF** do `raw/{sourceId}/{timestamp}/` — to umožňuje
  re-extrakci bez opakovaného zatížení cizího serveru a je to auditní stopa.
- Scraper běží **ručně spuštěný**, ne v CI na cron. Typicky 2× ročně
  (před školním rokem a před 2. pololetím).

### Právní poznámka

Jde o dev-time pořízení veřejně dostupných informací pro pilotní projekt.
Před jakýmkoli veřejným nasazením: (a) oslovit poskytovatele s nabídkou
uvedení a odkazu, (b) uvádět u každé aktivity `sourceUrl` a datum ověření,
(c) přidat kontakt pro žádost o odstranění. Toto není právní rozbor —
před ostrým provozem konzultovat.

## 3. Fáze 2 — Extrakce do struktury

`tools/catalog-ingest/extract.ts`

Dvě strategie, obě produkují stejný výstupní tvar:

**A) Deterministická (preferovaná)** — CSS selektory + regexy pro weby
se stabilní strukturou. Rychlé, levné, reprodukovatelné.

**B) LLM extrakce** — pro PDF letáky a nestrukturované stránky.
Vstup: text stránky. Výstup: **striktní JSON** proti schématu.

Prompt pro extrakci musí obsahovat:

```
Extrahuj informace o kroužcích do JSON podle schématu.

ABSOLUTNÍ PRAVIDLA:
- Vyplň POUZE údaje, které jsou v textu doslova uvedeny.
- Chybějící údaj = null. NIKDY nedoplňuj, neodhaduj ani nedopočítávej.
- Nepřevádej ceny mezi obdobími (měsíčně ↔ pololetně).
- Pokud je čas uveden nejednoznačně ("odpoledne"), vrať null a zapiš
  původní text do pole `rawTimeText`.
- U každého pole vyplň `confidence`: "explicit" | "inferred" | "missing".
  "inferred" použij jen pro triviální normalizace (např. "út" → weekday 2).
```

Každé extrahované pole nese `confidence`. Cokoli jiného než `explicit`
jde povinně na ruční revizi.

## 4. Fáze 3 — Ruční revize

Výstup extrakce je `draft-{sourceId}.json` plus **revizní report**:

```
tools/catalog-ingest/out/review-report.md
```

Report obsahuje:
- počet aktivit podle zdroje,
- **seznam všech polí s `confidence != "explicit"`** s citací původního textu,
- seznam aktivit s chybějícím časem, cenou nebo věkovým rozsahem,
- **diff proti předchozí verzi katalogu** (co přibylo, zmizelo, změnilo cenu) —
  toto je hlavní nástroj pro pololetní aktualizaci.

Kurátor projde report, opraví `draft-*.json`, spustí validaci a mergne.

## 5. Fáze 4 — Validace

`tools/catalog-ingest/validate.ts` — musí projít, jinak build selže.

| Kontrola | Závažnost |
|----------|-----------|
| JSON odpovídá Zod schématu | error |
| Všechna `Session.activityId` odkazují na existující Activity | error |
| Všechna `Activity.providerId` odkazují na existujícího Providera | error |
| `ageMin <= ageMax` | error |
| `startMinutes < endMinutes` | error |
| Chybí `sourceUrl` | error |
| Chybí `lastVerifiedAt` nebo je starší 12 měsíců | warning |
| Aktivita bez jediné Session | warning |
| Adresa bez `lat`/`lon` | warning (omezí kontrolu přesunů) |
| Cena bez `period` | error |
| Duplicitní `id` | error |

## 6. Geokódování

Souřadnice se doplňují **jednorázově při kurátorské práci**, ne za běhu.
Nástroj `tools/catalog-ingest/geocode.ts` používá veřejné geokódovací API
(např. Nominatim, s respektováním jeho podmínek použití a rate limitu 1 req/s).
Výsledek se zapíše natvrdo do katalogu. Aplikace pak nepotřebuje síť.

## 7. Ruční doplnění

Ne všechno půjde získat automaticky. Soubor `overrides-{city}.json`
s ručními opravami se aplikuje **po** extrakci a **před** validací.
Slouží k opravám, které by se jinak při každé re-extrakci ztratily.

## 8. Formát distribuovaného katalogu

```
packages/domain/data/
  catalog-{city}.json          // Provider[] + Activity[] + Session[]
  exceptions-{schoolYear}.json // CalendarException[]
  meta.json                    // { city, schoolYear, generatedAt, sourceCount }
```

Aplikace tyto soubory importuje staticky (bundler je zapeče do buildu).
Velikost odhadem 50–200 kB — bez problému.

## 9. Zobrazení stáří dat uživateli

V patičce a v detailu aktivity musí být vidět:

> Data ověřena 15. 8. 2026 · zdroj: ddm-...cz · [nahlásit chybu]

Rodič musí vědět, že katalog je snímek, ne živý zdroj, a že si má termín
ověřit u poskytovatele před přihlášením. Toto je i ochrana před tím, aby
aplikace nesla zodpovědnost za zastaralý údaj.
