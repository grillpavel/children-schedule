# 03 — Specifikace exportu kalendáře (.ics)

Balíček: `packages/domain/src/ics`
Norma: **RFC 5545** (iCalendar)
Generuje se **v prohlížeči**, výsledek se stahuje jako soubor. Nic se neodesílá.

---

## 1. Proč to není triviální

Naivní `RRULE:FREQ=WEEKLY;UNTIL=20270630` vygeneruje kroužek 24. prosince,
o jarních prázdninách a na Velký pátek. Rodič to uvidí jednou a aplikaci smaže.
**Kvalita `EXDATE` je hlavní hodnota exportu**, ne samotný ICS soubor.

## 2. Struktura výstupu

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//krouzky-planner//CS//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Julinka
X-WR-TIMEZONE:Europe/Prague
BEGIN:VTIMEZONE        ← povinné, viz §4
...
END:VTIMEZONE
BEGIN:VEVENT           ← jedna VEVENT na jeden Enrollment
...
END:VEVENT
END:VCALENDAR
```

`X-WR-CALNAME` = `child.name`. Při exportu více dětí najednou se generuje
**samostatný soubor na dítě** (`Julinka.ics`, `Toník.ics`), ne jeden sloučený —
uživatel je tak může v kalendáři barevně oddělit a jednotlivě smazat.

## 3. VEVENT

```
BEGIN:VEVENT
UID:krouzky-{childSlug}-{sessionId}@krouzky-planner.local
DTSTAMP:20260807T120000Z
DTSTART;TZID=Europe/Prague:20260908T160000
DTEND;TZID=Europe/Prague:20260908T170000
RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20270630T215959Z
EXDATE;TZID=Europe/Prague:20261027T160000,20261029T160000
SUMMARY:Keramika (DDM)
LOCATION:Ateliér A\, Komenského 12\, <město>
DESCRIPTION:Lektorka: Nováková\nKontakt: 777 123 456\nCena: 1200 Kč / pololetí
CATEGORIES:Kroužek
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Keramika za 30 minut
END:VALARM
END:VEVENT
```

### Kritická pravidla

- **`UID` musí být stabilní.** Odvozuje se deterministicky z `childName + sessionId`,
  ne z náhodného čísla ani času generování. Díky tomu opakovaný import **nahradí**
  původní událost místo vytvoření duplicity. Toto je jediná náhrada za chybějící
  odebíraný kalendář.
- **`DTSTART` musí být první skutečný výskyt** — první den v týdnu odpovídající
  `session.weekday`, který je `>= session.validFrom` a **není** ve výjimkách.
  Pokud by první výskyt padl na výjimku, posune se na další platný.
- **`EXDATE` musí mít přesně stejný čas a TZID jako `DTSTART`.** Toto je
  nejčastější chyba — `EXDATE` s jiným časem klienti tiše ignorují a událost
  se zobrazí. Test to musí explicitně ověřovat.
- **Řádky delší než 75 oktetů se musí zalamovat** (line folding: CRLF + mezera).
- **Escapování v textových polích:** `\` → `\\`, `;` → `\;`, `,` → `\,`,
  nový řádek → `\n`. Escapovat **nikdy** v `UID`, `DTSTART`, `RRULE`.
- **Ukončení řádků je CRLF (`\r\n`)**, ne LF.

### Biweekly (sudý/lichý týden)

`RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU;...` a `DTSTART` se nastaví na první
výskyt správné parity. Parita se počítá podle ISO týdne data.

## 4. VTIMEZONE Europe/Prague

Bez `VTIMEZONE` bloku se u některých klientů rozjede čas po přechodu na letní čas.
Blok je statický a vkládá se vždy:

```
BEGIN:VTIMEZONE
TZID:Europe/Prague
BEGIN:STANDARD
DTSTART:19701025T030000
TZOFFSETFROM:+0200
TZOFFSETTO:+0100
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
TZNAME:CET
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:19700329T020000
TZOFFSETFROM:+0100
TZOFFSETTO:+0200
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
TZNAME:CEST
END:DAYLIGHT
END:VTIMEZONE
```

## 5. Kalendář výjimek

Datový soubor: `packages/domain/data/exceptions-{schoolYear}.json`

### ⚠️ Pravidlo o původu dat

> **Konkrétní datumy prázdnin a svátků se NESMÍ generovat z paměti modelu
> ani odhadovat.** Každý záznam musí být pořízen z oficiálního zdroje
> a mít vyplněné pole `source`. Soubor se plní jednorázově před začátkem
> školního roku a reviduje člověk.

**Zdroje:**
- Státní svátky a významné dny: zákon č. 245/2000 Sb.
- Termíny školních prázdnin: sdělení MŠMT k organizaci školního roku
  (publikuje se na webu MŠMT, obsahuje i rozpis jarních prázdnin po okresech)
- Ředitelské volno: zadá uživatel ručně v UI

### Kategorie výjimek

| Typ | Scope | Poznámka |
|-----|-------|----------|
| Státní svátky a ostatní svátky | `national` | Velký pátek a Velikonoční pondělí jsou pohyblivé — počítají se algoritmicky (viz níže) nebo se zapíší explicitně |
| Podzimní prázdniny | `national` | |
| Vánoční prázdniny | `national` | souvislý rozsah |
| Pololetní prázdniny | `national` | jeden den |
| **Jarní prázdniny** | `district` | **liší se podle okresu** — MŠMT je rozděluje do skupin; aplikace vyžaduje `districtCode` od uživatele |
| Velikonoční prázdniny | `national` | |
| Hlavní prázdniny | `national` | konec školního roku, řeší se přes `UNTIL` |
| Ředitelské volno | `school` | zadává uživatel |

**Pohyblivé velikonoční svátky** se počítají anonymním Gaussovým algoritmem
(Computus, gregoriánská varianta) — to je deterministický výpočet, ne odhad,
a je přípustný. Musí mít vlastní unit test proti známým datům.

### Aplikace výjimek

```ts
function buildExdates(session: Session, ctx: ExportContext): Date[]
```

1. Vygeneruj všechny výskyty od `DTSTART` do konce školního roku.
2. Pro každý výskyt zjisti, zda jeho datum spadá do některé výjimky, která
   je relevantní: `scope = 'national'` vždy; `scope = 'district'` jen při
   shodě `districtCode`; `scope = 'school'` vždy (zadal uživatel).
3. Relevantní výskyty přidej do `EXDATE` se **shodným časem** jako `DTSTART`.

Volitelně: pokud výjimka pokrývá souvislý rozsah delší než 2 týdny (hlavní
prázdniny), místo `EXDATE` se zkrátí `UNTIL`.

## 6. Rodičovská vrstva (M4, ale rezervovat v návrhu)

Přepínač „Přidat i moje odvozy". Pro každou VEVENT dítěte vzniknou dvě další:

```
SUMMARY:🚗 Odvoz — Julinka na keramiku
DTSTART: session.start − travelMinutes − 5 min
DTEND:   session.start

SUMMARY:🚗 Vyzvednutí — Julinka z keramiky
DTSTART: session.end
DTEND:   session.end + travelMinutes + 5 min
```

Exportuje se do **samostatného souboru** `Rodic-Julinka.ics`, aby si ho rodič
mohl přidat do vlastního kalendáře nezávisle.

## 7. Kompatibilita klientů — akceptační kritéria

Vygenerovaný soubor musí projít:

| Klient | Postup ověření | Očekávání |
|--------|----------------|-----------|
| Google Calendar (web) | Nastavení → Import a export → Import | Bez chyby; opakující se událost; chybí ve dnech výjimek |
| Apple Calendar (macOS/iOS) | Otevřít soubor | Nabídne přidání do kalendáře; správný čas po přechodu na letní čas |
| Outlook (web i desktop) | Přidat kalendář → Nahrát ze souboru | Bez chyby; `VALARM` respektováno |

Ověřuje se **manuálně** před každým release, protože automatizovaně to
věrohodně otestovat nelze. Doplňkově automaticky: validace proti parseru
`ical.js` a kontrola, že reparsovaný objekt odpovídá vstupu (round-trip test).

## 8. Nabízené režimy exportu

| Režim | Kdy | Výstup |
|-------|-----|--------|
| Opakující se události (výchozí) | vždy | `RRULE` + `EXDATE`, kompaktní |
| Rozbalené jednotlivé události | fallback pro problematické klienty | jedna `VEVENT` na výskyt, bez `RRULE` |

Druhý režim je pojistka — některé starší importy si s `EXDATE` neporadí.
Uživateli se nabízí jako „Mám problém s importem" možnost.
