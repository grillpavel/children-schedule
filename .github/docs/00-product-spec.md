# 00 — Produktová specifikace

**Pracovní název:** Krouzky Planner
**Verze specu:** 0.1 (draft)
**Stav:** k připomínkování

---

## 1. Problém

Rodič na začátku školního roku (a znovu v pololetí) skládá rozvrh kroužků dítěte
z heterogenních zdrojů: weby DDM, ZUŠ, sportovních klubů, PDF letáky ze školy,
Facebook skupiny. Skládá to ručně v hlavě nebo na papíře a naráží na:

- **kolize** — dva kroužky ve stejný čas, které přehlédne
- **nedosažitelnost** — kroužek začíná 15:00, vyučování končí 14:45, přesun trvá 20 min
- **rozpočet** — celková cena vyjde najevo až po přihlášení
- **přenos do kalendáře** — buď nic, nebo ruční zadávání ~30 opakovaných událostí
- **výjimky** — pokud už to do kalendáře dostane, svítí mu kroužek o Vánocích a o jarních prázdninách

Skutečný uživatelský problém přitom není „rozvrh dítěte", ale **„kdy koho kam vezu
a stíhám to"**. Rozvrh dítěte je vstup, rozvrh rodiče je výstup.

## 2. Cílový uživatel

**Primární persona:** rodič dítěte 6–15 let, 1–3 děti, netechnický,
používá Google nebo Apple kalendář, rozhoduje se večer na mobilu.

**Sekundární persona (mimo MVP):** koordinátor DDM / školy, který by chtěl
katalog udržovat.

## 3. Rozsah pilotu

- **Jedno město** (parametr `CITY_ID` v konfiguraci; pilot určí kurátor katalogu).
- Katalog: **kurátorovaný statický JSON** v repozitáři.
- Naplnění katalogu: **scraper konkrétních webů jako dev-time nástroj**
  (viz `06-catalog-ingest-spec.md`), výstup je vždy revidován člověkem.
- Očekávaná velikost pilotního katalogu: 40–150 aktivit, 5–20 poskytovatelů.

## 4. Cíle (co musí aplikace umět)

| ID | Cíl | Ověřitelné kritérium |
|----|-----|----------------------|
| G1 | Zobrazit katalog kroužků filtrovatelný podle věku, kategorie, dne, ceny | Filtry se kombinují, výsledek do 100 ms |
| G2 | Kliknutím na kroužek zvýraznit v týdenní mřížce **všechny** jeho možné termíny | Viz `04-ui-spec.md`, interakce dvoufázová |
| G3 | Detekovat a vizuálně označit tvrdé konflikty v reálném čase | Kolize času, věk mimo rozsah, nedosažitelný přesun |
| G4 | Navrhnout 2–3 varianty rozvrhu podle preferencí | Deterministický solver, `02-scheduler-spec.md` |
| G5 | Vyexportovat `.ics` importovatelný do Google / Apple / Outlook | Bez chyby importu, bez událostí ve dnech volna |
| G6 | Ovládat vše i přirozeným jazykem přes chat | Vždy jako preview + potvrzení, nikdy přímá mutace |
| G7 | Fungovat bez účtu a bez ukládání dat na server | Žádný backend persistence layer |
| G8 | Přidat do rozvrhu i událost, která v katalogu není | Formulář s více časy týdně, chová se jako kroužek |
| G9 | Vytisknout rozvrh a uložit ho jako obrázek | A4 na šířku na jednu stránku; PNG ve 2× DPI |
| G10 | Držet víc pojmenovaných variant rozvrhu vedle sebe | Záložky, duplikace, porovnání |

## 5. Non-goals (explicitně mimo rozsah)

- ❌ Přihlašování dítěte do kroužku, platby, komunikace s poskytovatelem
- ❌ Uživatelské účty, přihlášení, cloudová synchronizace
- ❌ Obousměrná synchronizace s Google/Apple kalendářem (OAuth)
- ❌ Odebíraný kalendář (`webcal://`) — vyžadoval by hosting stavu, viz omezení §7
- ❌ Mobilní nativní aplikace (responzivní web ano, nativní ne)
- ❌ Celorepublikové pokrytí katalogu

## 6. Klíčová produktová rozhodnutí

### R1 — Plánovač je deterministický solver, ne LLM
LLM **nikdy** negeneruje časy, termíny ani rozvrh. LLM pouze:
1. překládá přirozený jazyk na strukturovaná omezení,
2. vysvětluje výsledek solveru.

Odůvodnění: halucinovaný čas kroužku je chyba, kterou rodič neodhalí a která
se propíše až do kalendáře. Riziko je asymetrické.

### R2 — Každá akce chatu je preview + apply
Chat nikdy nemění stav rozvrhu přímo. Vždy vygeneruje **diff** (co přibude,
co zmizí, co koliduje), který uživatel potvrdí nebo zahodí.

### R3 — Mobil je primární layout
Tři sloupce vedle sebe jsou desktopová varianta. Návrh začíná mobilem.

### R4 — Doménová logika je čistá knihovna
Solver, ICS generátor, validace kolizí a kalendář výjimek nesmí mít závislost
na React, na síti ani na LLM. Musí být testovatelné deterministicky.

## 7. Známá omezení plynoucí z „bez ukládání dat"

| Omezení | Dopad | Mitigace v MVP |
|---------|-------|----------------|
| Reload stránky = ztráta rozvrhu | Vysoký | Export/import JSON tlačítkem + varování před opuštěním stránky (`beforeunload`) |
| Nelze sdílet rozvrh odkazem | Střední | Volitelně: stav komprimovaný do URL hashe (`#s=<lz-string>`) |
| Nelze nabídnout odebíraný kalendář | Střední | Pouze jednorázový download `.ics`; při změně rozvrhu nutný re-import (řešeno stabilními UID, viz `03-ics-export-spec.md`) |
| LLM chat potřebuje API klíč | Vysoký | Stateless proxy endpoint bez logování obsahu; M0 je bez LLM |

## 8. GDPR / ochrana údajů

Aplikace zpracovává údaje o nezletilých (jméno, věk, škola, denní pohyb).
Návrhový princip: **data nikdy neopustí prohlížeč.**

- Žádný backend nesmí přijmout ani zalogovat jméno dítěte.
- Chat proxy (M1+) předává na LLM API pouze anonymizovaný kontext:
  jméno dítěte se nahrazuje placeholderem `CHILD_1` a mapuje zpět v klientu.
- Vygenerovaný `.ics` se sestavuje **v prohlížeči**, ne na serveru.
- Název kalendáře (`X-WR-CALNAME`) zadává uživatel, typicky křestní jméno
  dítěte (např. `Julinka`) — nikdy se neodesílá nikam.

## 9. Metriky úspěchu pilotu

- Rodič sestaví rozvrh a vyexportuje `.ics` do **8 minut** od prvního otevření.
- Vyexportovaný soubor se importuje **bez chyby** do Google Calendar, Apple
  Calendar a Outlooku (manuální ověření, viz `08-test-plan.md`).
- V exportovaném kalendáři **nulový počet** událostí ve dnech státních svátků
  a školních prázdnin.
