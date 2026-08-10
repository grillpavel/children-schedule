# Krouzky Planner — specifikační dokumentace

Webová aplikace, která rodiči pomůže sestavit rozvrh zájmových kroužků dítěte
a vyexportovat ho jako `.ics` do Google, Apple i Outlook kalendáře — včetně
správného vynechání státních svátků a školních prázdnin.

**Stav:** specifikace v0.1, před zahájením implementace.

## Rychlá orientace

| # | Dokument | O čem je |
|---|----------|----------|
| 00 | [Produktová specifikace](docs/00-product-spec.md) | Problém, persona, rozsah pilotu, non-goals, GDPR, omezení plynoucí z „bez ukládání dat" |
| 01 | [Doménový model](docs/01-domain-model.md) | TypeScript typy, rozlišení Activity vs. Session, invarianty |
| 02 | [Plánovač](docs/02-scheduler-spec.md) | Tvrdá a měkká omezení, backtracking, scoring, diverzita variant |
| 03 | [Export ICS](docs/03-ics-export-spec.md) | RFC 5545, `EXDATE`, `VTIMEZONE`, kalendář výjimek, kompatibilita klientů |
| 04 | [UI](docs/04-ui-spec.md) | Layout desktop i mobil, dvoufázový výběr termínu, barvy, konflikty |
| 05 | [Chat a LLM](docs/05-chat-llm-spec.md) | Tool calling, preview/apply, systémový prompt, anonymizace |
| 06 | [Katalog](docs/06-catalog-ingest-spec.md) | Scraper, LLM extrakce, ruční revize, validace |
| 07 | [Architektura](docs/07-architecture.md) | Stack, struktura repa, milníky M0–M4, rizika |
| 08 | [Testování](docs/08-test-plan.md) | Golden sety, eval LLM, matice kompatibility |

Instrukce pro Copilota: [`.github/copilot-instructions.md`](.github/copilot-instructions.md)

## Tři rozhodnutí, ze kterých vše plyne

1. **Plánovač je deterministický solver, ne LLM.** LLM překládá jazyk na
   omezení a vysvětluje výsledek. Nikdy negeneruje časy.
2. **Nic se neukládá.** Žádný účet, žádná databáze, žádné cookies.
   Rozvrh žije v paměti prohlížeče a odchází jen jako soubor, který si
   uživatel sám stáhne.
3. **Kvalita `EXDATE` je hlavní hodnota exportu.** Kalendář, který svítí
   kroužkem o Vánocích, je horší než žádný kalendář.

## Doporučený postup implementace

Začít **M0 bez LLM**. Je to samostatně odevzdatelný produkt a zároveň
deterministický základ, proti kterému se dá později testovat chat i solver.
