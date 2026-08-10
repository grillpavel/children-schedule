# 04 — Specifikace UI

---

## 1. Desktop layout (≥ 1280 px)

Vizuální referencí je **Coursicle College Schedule Maker** — mřížka jako
těžiště, tenký nástrojový pruh nad ní, panely po stranách sbalitelné.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Julinka ▾ │ Věk 9 │ Okres ▾        [Nový] [Kopie] [Tisk] [Export ▾] [⋯] │
├──────────────────────────────────────────────────────────────────────────┤
│  ▸ Varianta A │ Varianta B │ Bez plavání │ +                ← záložky     │
├────────────┬──────────────────────────────────┬──────────────────────────┤
│ KATALOG ◂  │      TÝDENNÍ ROZVRH              │  ▸ PANEL DETAILŮ         │
│ (280 px)   │      (flex, min 620 px)          │  (340 px)                │
│            │                                  │                          │
│ 🔍 hledání │   Po  Út  St  Čt  Pá  So  Ne     │  [Info] [Chat]           │
│ filtry:    │ 13 ▢  ▢   ▢   ▢   ▢              │                          │
│  věk       │ 14 ▢  ▢  ███  ▢   ▢              │  Keramika                │
│  kategorie │ 15 ███ ▢  ███  ▓   ▢              │  DDM, Komenského 12      │
│  den       │ 16 ███ ▓  ███  ▓  ███            │  Po 15:00–16:00          │
│  cena      │ 17 ▢  ▓   ▢   ▢  ███             │  1200 Kč / pololetí      │
│            │ 18 ▢  ▢   ▢   ▢   ▢              │  777 123 456             │
│ karty      │                                  │                          │
│ kroužků    │   ███ vybraný                    │  ── souhrn ──            │
│            │   ▓   možná varianta (duch)      │  4 kroužky, 4 800 Kč     │
│ ────────── │                                  │  ⚠ 1 kolize              │
│ + Vlastní  │                                  │                          │
│   událost  │                                  │                          │
├────────────┴──────────────────────────────────┴──────────────────────────┤
│  💬 Chat — napište, co potřebujete…                              [▲]     │
└──────────────────────────────────────────────────────────────────────────┘
```

Oba boční panely jsou **sbalitelné** (`◂` / `▸`). Ve sbaleném stavu zůstává
jen ikonový proužek 48 px. Sbalený stav je zároveň to, co se tiskne
a exportuje jako obrázek.

**Odchylka od původního zadání a její důvod:** chat není trvale rozbalený pod
rozvrhem, protože mřížka potřebuje vertikální prostor ze všech komponent
nejvíc (7 dní × ~8 hodin). Je to spodní lišta přes celou šířku, která se
rozbalí na ~35 % výšky při kliknutí nebo psaní, a má zástupný tab v pravém
panelu pro úzké obrazovky.

## 1b. Pojmenované varianty rozvrhu

Záložky nad mřížkou. Rodič si drží víc rozvrhů vedle sebe a přepíná mezi nimi.

| Akce | Chování |
|------|---------|
| `Nový` | prázdný rozvrh |
| `Kopie` | duplikát aktivního — základ pro „co kdyby" |
| dvojklik na záložku | přejmenování |
| `×` na záložce | smazání s potvrzením (poslední rozvrh nelze smazat) |
| výstup solveru | vytvoří **až 3 nové záložky** `Návrh 1..3`, aktivní rozvrh zůstane nedotčen |

Solverové varianty se tedy **neukazují jako překryvný diff**, ale jako
plnohodnotné rozvrhy k porovnání. Diff overlay (§7) zůstává jen pro
jednotlivé chatové akce typu „přidej plavání".

Porovnávací pohled (M2): tlačítko `Porovnat` zobrazí 2–3 varianty vedle sebe
zmenšené, s tabulkou rozdílů (cena, počet volných dnů, nejdelší den).

## 1c. Vlastní událost (mimo katalog)

Tlačítko `+ Vlastní událost` pod katalogem. Katalog nikdy nebude úplný a rodič
musí do rozvrhu dostat i logopedii, ortodontistu nebo kroužek v sousední obci.
Bez toho rozvrh neodpovídá realitě a detekce kolizí je bezcenná.

Formulář: název, dny + časy (**„Přidat další čas"** pro opakování v týdnu),
místo, kontakt, cena, poznámka, barva. Vlastní události se v mřížce chovají
stejně jako kroužky z katalogu — kolidují, exportují se, počítají do souhrnu —
jen mají v rohu ikonu ✎ a solver s nimi nehýbá (jsou implicitně `pinned`).

## 2. Mobilní layout (< 768 px) — primární

Spodní navigace se čtyřmi taby:

```
┌─────────────────────┐
│ Julinka        [⋯]  │
├─────────────────────┤
│                     │
│   aktivní pohled    │
│                     │
├─────────────────────┤
│ 📋    📅    💬   ℹ️  │
│Katalog Rozvrh Chat Info│
└─────────────────────┘
```

- **Rozvrh na mobilu**: nikoli 7 sloupců. Výchozí je **seznam po dnech**
  (vertikální, sbalovací sekce Po–Ne). Týdenní mřížka je dostupná otočením
  na šířku nebo přepínačem, ale není výchozí.
- Export je vždy dostupný z hlavičkového menu `[⋯]`.

## 3. Klíčová interakce: výběr kroužku → obarvení mřížky

Protože jeden kroužek má **N alternativních SessionGroups** (a každá může
obsahovat víc termínů týdně), klik nemůže rovnou vložit blok.
Interakce je dvoufázová:

| Fáze | Akce uživatele | Chování |
|------|----------------|---------|
| 0 | Hover nad kartou v katalogu | Sessions **všech** skupin kroužku se v mřížce zobrazí jako **obrysové duchy** (barva kroužku, 30 % opacity, přerušovaná čára). Kolidující duchové mají červený obrys. |
| 1 | Klik na kartu | Duchové se zafixují (nezmizí při odjetí myší). Karta je „aktivní", pravý panel zobrazí detail se seznamem skupin. |
| 1b | Hover nad jedním duchem | **Rozsvítí se všichni duchové téže skupiny** — rodič okamžitě vidí, že „úterky" znamenají Út i Čt. Duchové ostatních skupin ztlumí. |
| 2a | Klik na ducha | Celá jeho skupina se stane plnými bloky (jeden `Enrollment`). Zbylí duchové zmizí. |
| 2b | Kroužek má jen 1 skupinu | Fáze 2 se přeskočí — klik na kartu rovnou vloží bloky. |
| 3 | Klik na plný blok | Zvýrazní kroužek v katalogu, otevře detail, nabídne „změnit variantu" (zpět do fáze 1) a „odebrat" (odebere **celou** skupinu). |

Bloky téže skupiny jsou vizuálně provázané — tenká spojnice v postranním
pruhu bloku a společný štítek při hoveru. Rodič nesmí nabýt dojmu, že jde
o dva nezávislé kroužky, které lze rozpojit.

Přetažení bloku myší (drag & drop) je povoleno **jen na jinou existující
skupinu téhož kroužku** — přetažení posune celou skupinu, ne jeden termín.
Nelze vytvořit termín, který poskytovatel nenabízí. Při tažení se platné
cílové sloty zvýrazní. U vlastních událostí (§1c) je drag & drop volný.

## 4. Barvy

Barva se přiřazuje **deterministicky** z `activity.id`:

```ts
colorIndex = hashFnv1a(activity.id) % PALETTE.length
```

Stejný kroužek má tedy vždy stejnou barvu napříč sezeními i mezi uživateli.
Paleta má 12 barev volených tak, aby byly rozlišitelné i při protanopii
(vyhnout se současnému použití červené a zelené s podobným jasem).

**Barva nikdy nenese sémantiku stavu.** Stav se kóduje jinak:

| Stav | Vizuální kódování |
|------|-------------------|
| Vybraný | plná výplň barvou kroužku |
| Možný termín (duch) | obrys, 30 % opacity, přerušovaně |
| Tvrdý konflikt | červený **pruhovaný overlay** + ikona ⚠ (ne jen červená barva) |
| Měkké porušení | oranžová tečka v rohu |
| Připnutý (`pinned`) | ikona 📌 |
| Nedosažitelný přesunem | ikona 🚗 s odhadem „~18 min" |

Vždy platí, že informace nesená barvou je dostupná i jinak (ikona, text) —
kvůli přístupnosti.

## 5. Zobrazení konfliktů

Konflikty se **nikdy neblokují** — uživatel smí vytvořit rozvrh s kolizí.
Aplikace ho o tom informuje, ale nebrání mu.

- V mřížce: překrývající se bloky se zobrazí vedle sebe (poloviční šířka)
  s pruhovaným overlay.
- V pravém panelu: seznam konfliktů s konkrétní formulací a číslem, např.:
  > ⚠ **Keramika a Florbal** se ve středu překrývají o 30 minut.
  > ⚠ **Plavání (Út 15:00)** — vyučování končí 14:45, na přesun 3,2 km zbývá ~15 min (odhad ~14 min). Těsné.
- Před exportem: pokud existuje tvrdý konflikt, dialog s výčtem a možností
  „Přesto exportovat".

## 6. Pravý panel — obsah

Tab **Info** obsahuje v tomto pořadí:

1. **Detail vybraného kroužku** (pokud je vybrán): název, poskytovatel, adresa
   s odkazem na mapu, termín, cena, věkový rozsah, lektor, kontakt (telefon
   jako `tel:` odkaz, e-mail jako `mailto:`), popis, odkaz na zdroj,
   datum posledního ověření.
2. **Souhrn rozvrhu**: počet kroužků, celková cena rozepsaná podle období
   (pololetní / měsíční se sčítají odděleně, **nikdy se nepřepočítávají
   automaticky mezi obdobími bez upozornění**), počet volných dnů,
   nejdelší den.
3. **Konflikty a upozornění.**
4. **Aktivní omezení** — seznam `ConstraintRecord.label` s možností smazat.
   Toto je jediné místo, kde uživatel vidí, co po něm chat pochopil.
5. **Kontakty na všechny zvolené poskytovatele** — pro export/tisk.

## 7. Preview + apply (chat i solver)

Jakákoli hromadná změna (návrh solveru, akce chatu) se zobrazí jako **diff
overlay** nad mřížkou:

- zelený obrys = přibude
- červený přeškrtnutý = zmizí
- žlutý s šipkou = přesune se

Tlačítka: `Použít` / `Zahodit` / `Zobrazit další variantu`.
Dokud uživatel nepotvrdí, stav aplikace se nemění.

## 8. Undo / redo

Povinné. Stav se drží v zásobníku (limit 50 kroků). Klávesové zkratky
`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`. Undo pokrývá i „Použít" z diffu.

## 8b. Výstupy kromě .ics — tisk a obrázek

Export do kalendáře není jediný způsob, jak rozvrh opustí aplikaci.
Dva další jsou pravděpodobně stejně časté a v M0 povinné:

| Výstup | Použití | Implementace |
|--------|---------|--------------|
| **Tisk** | rozvrh na lednici, do žákovské, pro babičku | `@media print` — skryje panely, chat a nástrojový pruh; mřížka na jednu stránku A4 na šířku; pod mřížkou tabulka kontaktů na poskytovatele |
| **Obrázek (PNG)** | poslání do rodinné konverzace | render mřížky do canvasu (`html-to-image`), 2× DPI, název dítěte v hlavičce |

Obojí vychází ze **sbaleného stavu panelů** — tiskne se rozvrh, ne aplikace.
Tisková verze musí obsahovat i seznam vlastních událostí a upozornění na
datum ověření katalogu.

Nabídka `Export ▾` tedy obsahuje: `Kalendář (.ics)`, `Obrázek (.png)`,
`Tisk`, `Rozvrh jako soubor (.json)`.

## 9. Ochrana proti ztrátě dat

Protože se nic neukládá:

- `beforeunload` handler s varováním, pokud je rozvrh neprázdný.
- Trvalý nenápadný pruh: „Rozvrh existuje jen v tomto okně. [Uložit do souboru]"
- `Uložit do souboru` → stáhne `rozvrh-julinka.json` (celý `PlannerState`).
- `Načíst ze souboru` → obnoví stav, s validací `schemaVersion`.

## 10. Prázdné stavy

| Situace | Text |
|---------|------|
| Katalog bez filtru | „Vyberte věk dítěte a uvidíte, co je pro něj vhodné." |
| Filtr bez výsledku | „Pro věk 9 a kategorii Tanec nic v katalogu není. [Zrušit filtr kategorie]" |
| Prázdný rozvrh | „Zatím prázdno. Klikněte na kroužek vlevo — ukážeme vám, kdy se koná." |
| Solver nic nenašel | Výčet `Infeasibility` s konkrétním důvodem a nabídkou uvolnit omezení. |

## 11. Přístupnost

- Cílem je WCAG 2.1 AA.
- Celý výběr kroužku i mřížka ovladatelné klávesnicí (mřížka jako
  `role="grid"` s pohybem šipkami).
- Kontrast textu na barevných blocích ≥ 4.5:1 — paleta musí být navržena
  s ohledem na barvu textu, ne naopak.
- `aria-live` region pro oznámení konfliktů.
