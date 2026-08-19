# Specifikace vývoje – Školní a státní svátky / prázdniny
**Children Schedule Planner**  
**Verze:** 1.0  
**Datum:** 19. 8. 2026  
**Související:** BL-020 (krajské jarní prázdniny), chybějící/nejasná data v katalogu

---

## 1. Cíl

Zajistit, aby se aktivity (kroužky) v rozvrhu **automaticky nekonaly** v době státních svátků a školních prázdnin, přičemž rodič musí mít možnost **explicitně aktivitu do prázdnin/svátků vložit**.

Hlavní principy:
- Ve výchozím stavu se kalendář sestavuje **mimo** svátky a prázdniny.
- Uživatel může vědomě rozhodnout „chci tuto aktivitu i o prázdninách / svátku“.
- Data o státních svátcích se stahují z veřejného zdroje.
- Školní prázdniny pro školní rok 2026/2027 jsou definovány pro okres Rakovník (s možností pozdějšího rozšíření).

---

## 2. Rozsah školního roku

**Školní rok:** 1. 9. 2026 – 30. 6. 2027

### 2.1 Definované školní prázdniny (okres Rakovník)

| Typ                  | Období                          |
|----------------------|---------------------------------|
| Podzimní prázdniny   | 29. 10. 2026 – 30. 10. 2026    |
| Vánoční prázdniny    | 23. 12. 2026 – 3. 1. 2027      |
| Jarní prázdniny      | 8. 3. 2027 – 14. 3. 2027       |

> Poznámka (BL-020): Krajské termíny jarních prázdnin se mohou lišit.  
> Aktuálně je hardcodován termín pro okres Rakovník.  
> V budoucnu je potřeba napojit oficiální rozpis MŠMT / kraje.

### 2.2 Státní svátky

- Státní svátky se **stahují automaticky** z veřejného zdroje (např. API nebo parsování oficiálního seznamu).
- Aplikace musí umět získat seznam státních svátků pro roky 2026 a 2027.
- Doporučené zdroje (priorita):
  1. Veřejné API (pokud existuje spolehlivé)
  2. Oficiální seznam vlády ČR / MV ČR
  3. Fallback: statický seznam pro 2026–2027

---

## 3. Business pravidla

### 3.1 Výchozí chování (Default)

Při generování výskytů aktivity v kalendáři:
IF datum spadá do státního svátku NEBO školních prázdnin
THEN výskyt se NEVYGENERUJE
text- Aktivita se v daný den **nezobrazí** v rozvrhu.
- Nezapočítává se do kolizí.
- Nezapočítává se do součtu nákladů (pokud je cena vázaná na termín).

### 3.2 Explicitní výjimka (Override)

Uživatel musí mít možnost u konkrétní aktivity (nebo konkrétního termínu) nastavit:

> „Povolit i o prázdninách / svátcích“

Pokud je tato volba zapnutá:
- Výskyty se generují i v období prázdnin a státních svátků.
- V UI musí být jasně viditelné, že se jedná o výjimku (např. badge „I o prázdninách“).

### 3.3 Rozsah override

Override může být na úrovni:
1. **Celé aktivity** (platí pro všechny její termíny) – doporučeno pro V1
2. **Konkrétního termínu / varianty** (pozdější rozšíření)

---

## 4. Datový model

```ts
type Holiday = {
  id: string
  name: string
  type: "public" | "school"
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD (inclusive)
  region?: string     // např. "Rakovník" pro školní prázdniny
  source?: string     // "api" | "static" | "manual"
}

type Activity = {
  // ... existující pole
  allowOnHolidays?: boolean   // výchozí = false
}
Pravidlo pro generování výskytů:
TypeScriptfunction shouldGenerateOccurrence(date: Date, activity: Activity, holidays: Holiday[]): boolean {
  const isHoliday = holidays.some(h => isDateInRange(date, h.startDate, h.endDate))
  
  if (!isHoliday) return true
  return activity.allowOnHolidays === true
}

5. UI / UX požadavky
5.1 Nastavení u aktivity
V detailu aktivity (nebo při přidávání do rozvrhu) musí být přepínač:
text[ ] Povolit i o prázdninách a státních svátcích

Výchozí stav: vypnuto
Při zapnutí zobrazit krátké vysvětlení:
„Aktivita se bude zobrazovat i během školních prázdnin a státních svátků.“

5.2 Vizualizace v rozvrhu

Pokud je výskyt v prázdninách/svátcích povolen, zobrazit jemný badge nebo ikonu (např. „Prázdniny“).
V přehledu týdne / měsíce nesmí být matoucí, proč se aktivita objevuje i o prázdninách.

5.3 Informace o prázdninách
V nastavení dítěte / kalendáře doporučeno zobrazit:

Aktuální školní rok
Seznam školních prázdnin (s možností pozdějšího výběru okresu/kraje)


6. Zdroj dat a aktualizace





























Typ datZdrojAktualizacePoznámkaStátní svátkyVeřejný web / APIPři startu aplikace nebo 1× denněMusí fungovat offline po staženíŠkolní prázdninyStatická definice (V1)ManuálníPro okres RakovníkKrajské jarní prázdninyMŠMT / krajský rozpis (BL-020)BudoucíZatím hardcode
Fallback: Pokud se nepodaří stáhnout státní svátky, použije se vestavěný seznam pro 2026–2027.

7. Edge cases

Aktivita má termín přesně na státní svátek → ve výchozím stavu se neukáže.
Prázdniny přes půlnoc / víkend → bere se celý interval včetně krajních dnů.
Uživatel zapne override → všechny budoucí výskyty v prázdninách se začnou generovat.
Změna allowOnHolidays zpětně → existující výskyty se přepočítají.
Více dětí / více variant rozvrhu → každé dítě/varianta respektuje vlastní nastavení aktivit.


8. Acceptance Criteria

 Ve výchozím stavu se aktivity negenerují v období státních svátků a definovaných školních prázdnin.
 Uživatel může u aktivity zapnout „Povolit i o prázdninách a státních svátcích“.
 Po zapnutí override se výskyty v prázdninách/svátcích zobrazí.
 Státní svátky se načítají z externího zdroje (s fallbackem).
 Školní prázdniny pro 2026/2027 (Rakovník) jsou správně zohledněny.
 V UI je jasně poznat, kdy je aktivita výjimečně povolena o prázdninách.
 Změna nastavení override okamžitě přepočítá rozvrh.


9. Priorita a fáze

FázeObsahPrioritaV1Hardcoded školní prázdniny + státní svátky + override na úrovni aktivityP0V1.5Lepší vizualizace + informace o prázdninách v UIP1V2Výběr okresu/kraje + napojení na oficiální rozpis MŠMT (BL-020)P2

10. Poznámky

BL-020 (krajské jarní prázdniny) zůstává otevřený – aktuálně je použit termín pro okres Rakovník.
Chybějící/nejasná data v katalogu nesmí blokovat logiku prázdnin (prázdniny se aplikují na generované výskyty, ne na katalog samotný).
Logika prázdnin musí být deterministická a testovatelná (unit testy na shouldGenerateOccurrence).