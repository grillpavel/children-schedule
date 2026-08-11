# Krouzky Planner: Changes 9

**Verze dokumentu:** 1.1 (finální)
**Datum:** 11. 8. 2026
**Rozsah:** design systém, responzivita (desktop, tablet, mobil), Liquid Glass, barevné tokeny, typografie, přístupnost, výkon
**Navazuje na:** Changes 6 (sekce H, I, J), Changes 7, Changes 8. Kde se překrývají, platí ID z tohoto dokumentu.
**Formát:** ID, priorita (P0 blokuje / P1 vysoká / P2 polish), akceptační kritérium (AK)

### Změny oproti verzi 1.0

| Co | Důvod |
|---|---|
| Kontrastní tabulka nahrazena **naměřenými hodnotami** | ve verzi 1.0 to byly odhady |
| **C9-P5 zrušeno** (`contain: paint`, `will-change`) | doporučení bylo chybné, nahrazuje C9-B5 |
| C9-B3 přepracováno | `prefers-reduced-transparency` není spolehlivá pojistka |
| C9-M6 přeformulováno | 44 × 44 je AAA a HIG, ne požadavek úrovně AA |
| Nové rozlišení **[OVĚŘENO]** vs. **[HEURISTIKA]** | oddělení podložených pravidel od odhadů |
| Doplněno `viewport-fit=cover`, kontrast dělících linek, pořadí fontů | mezery ve verzi 1.0 |

---

## 0. Východisko

Liquid Glass je materiál pro **ambientní povrchy**, ne pro nosiče informace. Pravidlo palce: **sklo drží prostor, solid drží informaci.**

### 0.1 Ověřená pravidla vs. heuristiky

Aby se v implementaci nezaměňovala fakta s odhady, je dokument rozdělen. Pravidla označená **[OVĚŘENO]** mají zdroj nebo měření. Pravidla označená **[HEURISTIKA]** jsou návrh k proměření a jejich čísla lze změnit bez porušení specifikace.

| Kategorie | Pravidla |
|---|---|
| **[OVĚŘENO]** | všechny kontrastní poměry (naměřeno), zákaz vnořování skla, výkonnostní problém skla nad scrollovaným obsahem, výpočet šířek layoutu, cílové velikosti dotykových ploch |
| **[HEURISTIKA]** | počet skleněných ploch na obrazovce, maximální blur, opacita skla, saturace, minimální výška bloku události, počet barev v paletě, konkrétní hodnota řádkování |

### 0.2 Rozsouzené rozpory původního návrhu

| ID | Rozpor | Rozsudek |
|---|---|---|
| C9-X1 | Návrh požaduje kontrast ≥ 4.5:1 a zároveň sklo s opacitou 0.72. Přes průsvitný povrch nelze kontrast garantovat. | Text nikdy neleží přímo na skle. Garantem je solidní vnitřní povrch (C9-B2), ne hodnota opacity. |
| C9-X2 | Návrh doporučuje sklo na kartách kroužků. Katalog má 40 karet, výhledově 200. | **Zákaz.** Viz C9-G6 a C9-P2. |
| C9-X3 | Token tabulka definuje heatmapu jako škálu zelená → žlutá → červená podle hodin. | Platí Changes 8 (C8-B1, C8-B4). Metrikou jsou obsazená odpoledne a počet cest, škála je neutrální. Viz C9-T4. |
| C9-X4 | Třísloupcový layout na 1280 px s panely 320 a 340 px. | Nevychází, viz výpočet C9-L1. Tři sloupce až od 1440 px. |
| C9-X5 | Nespecifikované chování bez podpory `backdrop-filter`. | Povinný `@supports` fallback, viz C9-B3. |

---

## 1. Kdy sklo ano a kdy ne

| ID | Povrch | Sklo | Zdůvodnění | Prio |
|---|---|---|---|---|
| C9-G1 | Header | ano, lehké | Ambientní, málo textu | P1 |
| C9-G2 | Levý panel (kontejner) | ano | Kontejner ano, obsah ne | P1 |
| C9-G3 | Pravý panel (kontejner) | ano | Totéž | P1 |
| C9-G4 | Spodní tab bar (mobil) | ano | Krátké popisky a ikony | P1 |
| C9-G5 | Bottom sheet, modal, popover | ano | Dočasné vrstvy, sklo dává správný pocit hloubky | P1 |
| C9-G6 | Karty kroužků | **ne** | 40 až 200 scrollovaných prvků, viz C9-P2 | P0 |
| C9-G7 | Události v kalendáři | **ne** | Nosič kritické informace, solidní a barevné | P0 |
| C9-G8 | Kalendářová mřížka | **ne** | Čitelnost linek a časové osy | P0 |
| C9-G9 | Primární tlačítka | **ne** | Primární akce musí být jednoznačně solidní | P0 |
| C9-G10 | Heatmapa, konflikty, uzávěrky | **ne** | Rozhodovací data, solidní podklad uvnitř skleněného panelu | P0 |
| C9-G11 | Text jakéhokoli druhu | **ne** | Kontrast přes průsvitnou vrstvu není garantovatelný | P0 |

---

## 2. Technická specifikace skla

### C9-B1 Základní třída (P1) [HEURISTIKA]

```css
.glass {
  background: var(--bg-glass);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid var(--border-glass);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
}
```

Hodnoty `blur(20px)` a `saturate(160%)` jsou estetická volba bez měření. Vysoká saturace v dark mode nechává prosvítat barevné bloky událostí jako barevné šmouhy, ale konkrétní práh ověř vizuálně.

### C9-B2 Text nikdy přímo na skle (P0) [OVĚŘENO]

```css
.glass > .content {
  background: var(--bg-surface);
  border-radius: 12px;
}
```

Garantem kontrastu je tato vrstva, **ne hodnota opacity skla**. Opacita je kosmetika, ne přístupnostní opatření.

### C9-B3 Fallbacky a vypnutí skla (P0)

**Zásadní oprava oproti verzi 1.0.** Mediální dotaz `prefers-reduced-transparency` má podle MDN omezenou dostupnost, není Baseline a je označen jako experimentální. Nelze na něm stavět jedinou přístupnostní pojistku, a to právě proto, že systémy, kde uživatelé volbu „Omezit průhlednost“ reálně zapínají (macOS: Zpřístupnění → Displej; iOS: Zpřístupnění → Displej a velikost textu), nemusí tuto preferenci do CSS vůbec vystavit.

**Primární mechanismus je manuální přepínač „Vypnout sklo“ v nastavení aplikace.** Volba se ukládá do souboru rozvrhu (C9-A6).

```css
/* 1. Povinné: prohlížeč bez podpory */
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: var(--bg-surface); backdrop-filter: none; }
}

/* 2. Povinné: uživatelský přepínač */
[data-glass="off"] .glass {
  background: var(--bg-surface); backdrop-filter: none;
}

/* 3. Povinné: vysoký kontrast */
@media (prefers-contrast: more) {
  .glass {
    background: var(--bg-surface);
    backdrop-filter: none;
    border-color: var(--text-primary);
  }
}

/* 4. Bonus, kde je podpora */
@media (prefers-reduced-transparency: reduce) {
  .glass { background: var(--bg-surface); backdrop-filter: none; }
}
```

Bez prvního bloku se v nepodporujícím prohlížeči vyrenderuje panel jako průsvitná bílá vrstva přes obsah a aplikace je nepoužitelná.

### C9-B4 Neanimuj `backdrop-filter` (P1) [HEURISTIKA]

Standardní doporučení, mechanismus neměřen. Animuj `opacity` a `transform`.

### C9-B5 Zákaz vnořování skla (P0) [OVĚŘENO]

**Nahrazuje zrušené C9-P5 z verze 1.0, které doporučovalo `contain: paint` a `will-change: backdrop-filter`. To doporučení bylo chybné.**

Podle MDN působí `backdrop-filter` jen po nejbližšího předka, který je „backdrop root“. Backdrop root vytvářejí mimo jiné prvky s `opacity` menší než 1 nebo s `will-change`. Důsledky:

1. **Nikdy nepřidávej `will-change` ani `contain` na skleněný panel ani na žádného jeho předka.** Vytvoří backdrop root a efekt přestane fungovat, aniž by byla chyba v zápisu.
2. **Sklo se nesmí vnořovat do skla.** Vnořený `backdrop-filter` rozmazává už rozmazaný obsah rodiče, ne skutečné pozadí. Vzniká dvojité rozostření, které vypadá jako chyba.
3. Bottom sheet nad skleněným panelem vykresluj do portálu na úrovni `body`, ne dovnitř panelu.

---

## 3. Barevné tokeny

### C9-T1 Základ

| Token | Light | Dark | Použití |
|---|---|---|---|
| `--bg-app` | `#F2F4F7` | `#0B0C0F` | Pozadí aplikace |
| `--bg-surface` | `#FFFFFF` | `#161618` | Solidní plochy, kalendář, obsah v panelech |
| `--border-subtle` | `#E5E7EB` | `#2C2C2E` | Dělící linky, viz C9-T6 |
| `--text-primary` | `#111827` | `#F5F5F7` | Hlavní text |

### C9-T2 Sklo [HEURISTIKA]

| Token | Light | Dark |
|---|---|---|
| `--bg-glass` | `rgba(255,255,255,0.82)` | `rgba(22,22,24,0.80)` |
| `--bg-glass-heavy` | `rgba(255,255,255,0.92)` | `rgba(28,28,30,0.92)` |
| `--border-glass` | `rgba(255,255,255,0.35)` | `rgba(255,255,255,0.09)` |

Hodnoty opacity jsou arbitrární a **negarantují kontrast**. Garantem je C9-B2.

### C9-T3 Naměřené kontrasty [OVĚŘENO]

Vypočteno podle WCAG relativní luminance. Hranice: **4.5:1** pro běžný text (SC 1.4.3), **3:1** pro velký text a prvky rozhraní (SC 1.4.11).

**Light mode**

| Barva | Na podkladu | Poměr | Verdikt |
|---|---|---|---|
| `--text-primary` `#111827` | bílá | **17.74** | OK |
| `--text-secondary` `#6B7280` | bílá `#FFFFFF` | **4.83** | OK |
| `--text-secondary` `#6B7280` | `--bg-app` `#F2F4F7` | **4.39** | **nevyhoví**, jen na `--bg-surface` |
| `--text-tertiary` `#9CA3AF` | bílá | **2.54** | **nevyhoví ani pro UI**, jen disabled a dekorace |
| `--accent` `#2563EB` | bílá | **5.17** | OK |
| bílý text | `--accent` `#2563EB` | **5.17** | OK |
| `--success` `#059669` | bílá | **3.77** | **jen ikony a výplně**, ne text |
| `--success-text` `#047857` | bílá | **5.48** | OK pro text |
| `--warning` `#D97706` | bílá | **3.19** | **jen ikony a výplně**, ne text |
| `--warning-text` `#B45309` | bílá | **5.02** | OK pro text |
| `--danger` `#DC2626` | bílá | **4.83** | OK, těsně |
| bílý text | `--danger` `#DC2626` | **4.83** | OK |
| `--now-line` `#EF4444` | bílá | **3.76** | OK, není text |

**Dark mode** (podklad `--bg-surface` `#161618`)

| Barva | Poměr | Verdikt |
|---|---|---|
| `--text-primary` `#F5F5F7` | **16.60** | OK |
| `--text-secondary` `#A1A1A6` | **7.03** | OK |
| `--text-tertiary` `#6E6E73` | **3.56** | **jen UI a disabled**, ne text |
| `--accent` `#3B82F6` | **4.91** | OK |
| `--success` `#34D399` | **9.40** | OK |
| `--warning` `#FBBF24` | **10.83** | OK |
| `--danger` `#F87171` | **6.53** | OK |

**Důsledky pro tokeny:**

| ID | Změna | Prio |
|---|---|---|
| C9-T3a | Zaveď oddělené tokeny `--success-text` `#047857` a `--warning-text` `#B45309`. Původní hodnoty ponech pouze pro ikony, pruhy a výplně. | P0 |
| C9-T3b | `--text-tertiary` nikdy nepoužívej pro čitelný text. Placeholder v hledání musí být `--text-secondary`. | P0 |
| C9-T3c | `--text-secondary` používej **výhradně na `--bg-surface`**, nikdy na `--bg-app`. Rozdíl 4.83 vs. 4.39 rozhoduje o splnění. | P0 |
| C9-T3d | Doplň chybějící `--focus-ring`: light `#2563EB`, dark `#60A5FA`. | P0 |
| C9-T3e | Zapoj měření kontrastu do CI. Build padá při poměru pod 4.5 pro text a pod 3 pro prvky rozhraní. Tabulka výše je výchozí stav, ne trvalá pravda. | P0 |
| C9-T3f | Semantická barva nikdy nesmí být jediným nosičem významu. Konflikt = barva **plus** ikona **plus** text. | P0 |

### C9-T4 Heatmapa

Metrikou jsou obsazená odpoledne a počet cest (C8-B1), ne hodiny.

| Stav | Token |
|---|---|
| Volno | `--border-subtle` |
| Obsazeno | `--accent` |
| Nad uživatelský strop | `--warning` |

Neutrální, dokud uživatel nenastaví vlastní strop. Aplikace nerozhoduje, kolik je moc.

### C9-T5 Paleta barev kroužků (P0)

| ID | Pravidlo | Typ |
|---|---|---|
| C9-T5a | Uzavřená paleta, ne volný color picker | návrhové pravidlo |
| C9-T5b | Každá barva ≥ 4.5:1 s bílým textem, protože události jsou solidní bloky s textem uvnitř | [OVĚŘENO, SC 1.4.3] |
| C9-T5c | Rozlišitelné při deuteranopii a protanopii, ověř simulátorem | [OVĚŘENO jako požadavek] |
| C9-T5d | Ke každé barvě ikona kategorie jako druhý kanál | [OVĚŘENO, SC 1.4.1] |
| C9-T5e | Doporučený počet osm | **[HEURISTIKA]**, číslo je odhad |

### C9-T6 Kontrast dělících linek (P1)

Naměřeno: `#E5E7EB` na bílé = **1.24**, `#2C2C2E` na `#161618` = **1.30**. Obojí hluboko pod 3:1.

Rozhodnutí, které udělej vědomě: čistě dekorativní oddělovače jsou z SC 1.4.11 vyňaty, ale **hodinové linky kalendářové mřížky nesou informaci o čase**. Buď je považuj za informační a ztmav na poměr ≥ 3:1, nebo doplň časové popisky tak, aby linky nebyly jediným nositelem, a ponech je slabé. Nenechávej to nerozhodnuté.

---

## 4. Layout a breakpointy

### C9-L1 Výpočet [OVĚŘENO]

Původní návrh při 1280 px:

```
1280 − 320 (katalog) − 340 (info) = 620 px
620 − 56 (časová osa)             = 564 px na 7 dnů
564 / 7                           = 80,6 px na den
```

Do 80 px se nevejde „Florbal II. — mladší žákyně“. Opravená sada:

| Breakpoint | Katalog | Kalendář | Info |
|---|---|---|---|
| ≥ 1440 px | 300 px, stálý | flex-1, ≥ 760 px | 320 px, stálý |
| 1200–1439 px | 280 px, stálý | flex-1 | slide-over zprava |
| 900–1199 px | drawer | plná šířka | bottom sheet |
| < 900 px | tab | tab (Agenda výchozí) | tab / sheet |

Kontrola při 1440 px: `1440 − 300 − 320 − 56 = 764 / 7 = 109,1 px` na den. Použitelné minimum.

| ID | Změna | Prio |
|---|---|---|
| C9-L2 | Šířky panelů uživatelsky nastavitelné, uloženo v souboru rozvrhu | P2 |
| C9-L3 | Pravý panel se při nula kroužcích sbalí (C8-F6) | P0 |
| C9-L4 | Levý panel lze sbalit i na širokém displeji | P1 |
| C9-L5 | Breakpoint pro Agendu je 900 px, ne 768. Mezi 768 a 900 px je sedmisloupcová mřížka stále nepoužitelná. | P0 |

---

## 5. Typografie

| ID | Pravidlo | Prio | Typ |
|---|---|---|---|
| C9-Y1 | Pouze celočíselné velikosti. Mobil: tělo 15, meta 13, nadpis 17 px. Desktop: tělo 14, meta 13, nadpis 16 px. Půlpixelové hodnoty z původního návrhu (13.5, 14.5) renderují nekonzistentně. | P0 | [OVĚŘENO] pro celá čísla, [HEURISTIKA] pro stupnici |
| C9-Y2 | Řádkování musí pojmout české diakritické znaky. Testuj řetězcem `ĎŤÁŮŘĚ` na nadpisu s nejtěsnějším řádkováním a ověř, že se neořezává. Hodnota 1.4 je výchozí odhad, ne požadavek. | P0 | [HEURISTIKA] |
| C9-Y3 | `font-variant-numeric: tabular-nums` u časové osy, cen a číselných sloupců | P1 | [OVĚŘENO] |
| C9-Y4 | Pořadí fontů `Inter, system-ui, sans-serif`, pokud chceš Inter. Zápis „system-ui s fallbackem na Inter“ z verze 1.0 byl chybný, v tom pořadí se Inter nikdy nepoužije. | P1 | [OVĚŘENO] |
| C9-Y5 | Zvětšení písma na 200 % nesmí rozbít layout (SC 1.4.4) | P1 | [OVĚŘENO] |

---

## 6. Kalendář a události

| ID | Změna | Prio | Typ |
|---|---|---|---|
| C9-K1 | Události solidní, nikdy skleněné | P0 | [OVĚŘENO] |
| C9-K2 | Blok události je klikací cíl. Minimum **24 px** (SC 2.5.8, úroveň AA), cíl **44 px** (SC 2.5.5, úroveň AAA). Kde nelze dosáhnout 24 px, uplatni výjimku na odstupy: středy sousedních cílů alespoň 24 px od sebe. | P0 | [OVĚŘENO] |
| C9-K3 | Odstupňovaný obsah bloku: pod 40 px jen název, 40–60 px název a čas, nad 60 px název, čas a místo | P1 | [HEURISTIKA] |
| C9-K4 | Now-line výrazná, s kroužkem na levém okraji, přes celou šířku dne | P1 | [HEURISTIKA] |
| C9-K5 | Hodinové linky viz C9-T6. Půlhodinové slabší nebo žádné. | P1 | [HEURISTIKA] |
| C9-K6 | Překryv řeš column packingem (C6-E5), nikdy průhledností. Průsvitné překrývající se bloky míchají barvy do třetí barvy, která v paletě není. | P0 | [OVĚŘENO] |

---

## 7. Mobil

| ID | Změna | Prio | Typ |
|---|---|---|---|
| C9-M1 | Výchozí pohled v tabu Rozvrh je **Agenda** | P0 | návrhové rozhodnutí |
| C9-M2 | Agenda zobrazuje i prázdné dny s popiskem „Žádné kroužky“ | P1 | [HEURISTIKA] |
| C9-M3 | Tap na kartu otevře detail sheet, **nepřidá** kroužek (C8-S3) | P0 | |
| C9-M4 | Snap pointy sheetu: detail 90 %, filtry a export 55 %, rychlé akce 35 % | P1 | [HEURISTIKA] |
| C9-M5 | Swipe doleva odebere událost, vždy s toastem a možností Zpět | P1 | |
| C9-M6 | **Dotykové cíle: 24 × 24 px je závazné minimum (WCAG 2.2 SC 2.5.8, úroveň AA), 44 × 44 px je cíl pro primární prvky (SC 2.5.5, úroveň AAA; shodně Apple HIG, Material doporučuje 48 dp).** Tlačítko `[+]` na kartě je primární prvek, proto 44 × 44 včetně neviditelné zásahové plochy. Karta vysoká 64 až 72 px to umožňuje. | P0 | [OVĚŘENO] |
| C9-M7 | Header na mobilu jednořádkový, zbytek do menu (C6-H2) | P1 | |
| C9-M8 | `safe-area-inset-bottom` pro tab bar. **Vyžaduje `viewport-fit=cover` v meta viewportu.** Aktuální produkce má `width=device-width, initial-scale=1`, tedy bez něj by insety vracely nulu. Doplň: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. | P0 | [OVĚŘENO] |

---

## 8. Přístupnost

| ID | Změna | Prio |
|---|---|---|
| C9-A1 | Focus ring vždy viditelný: `outline: 2px solid var(--focus-ring); outline-offset: 2px`. Na skle přidej vnější bílý stín 1 px, aby byl viditelný na světlém i tmavém podkladu. | P0 |
| C9-A2 | `prefers-reduced-motion`: vypni všechny animace, ponech okamžité změny stavu | P0 |
| C9-A3 | Vypnutí skla všemi čtyřmi cestami z C9-B3, s manuálním přepínačem jako primárním | P0 |
| C9-A4 | Kalendářová mřížka s ARIA rolí a klávesovou obsluhou: šipky pohyb, Enter detail, Escape zavření panelu | P1 |
| C9-A5 | Heatmapa a obsazenost obsahují čísla, ne jen pruhy. Pruh je pro odečítač obrazovky prázdný. | P0 |
| C9-A6 | Dark mode a stav přepínače skla ukládej do souboru rozvrhu, ne do úložiště prohlížeče | P1 |

---

## 9. Výkon

| ID | Pravidlo | Prio | Typ |
|---|---|---|---|
| C9-P1 | Počet současně vykreslených skleněných ploch drž nízký. **Číslo urči měřením**, ne odhadem. Verze 1.0 uváděla „maximálně dvě“, což byl odhad bez podkladu. Závazný je zákaz vnořování z C9-B5. | P0 | [HEURISTIKA] pro počet, [OVĚŘENO] pro zákaz vnořování |
| C9-P2 | Žádný `backdrop-filter` na prvcích uvnitř scrollovaného seznamu. Podle chybového záznamu Mozilly (bug 1628046) se při použití `backdrop-filter` na prvku přes celou stránku nevytvoří pro scrollovaný obsah samostatná vrstva a při scrollování se invaliduje vše. Týká se karet katalogu i položek Agendy. | P0 | [OVĚŘENO] |
| C9-P3 | Blur drž nízko. Hodnota 20 px je výchozí odhad, práh „nad 24 px neúměrné“ z verze 1.0 nemá podklad. Změř. | P1 | [HEURISTIKA] |
| C9-P4 | Degradaci na slabých zařízeních řeš **uživatelským přepínačem z C9-B3**, ne detekcí hardwaru. `navigator.deviceMemory` není dostupné napříč prohlížeči, chybí zejména tam, kde má sklo největší dopad. Před případným použitím ověř aktuální podporu. | P1 | [OVĚŘENO jako výhrada] |
| C9-P5 | *Zrušeno ve verzi 1.1.* Původní doporučení `contain: paint` a `will-change: backdrop-filter` bylo chybné, nahrazuje C9-B5. | | |
| C9-P6 | Změř scroll katalogu se 200 položkami na skutečném středním telefonu, ne v desktopovém emulátoru | P0 | [OVĚŘENO jako metoda] |

---

## 10. Co záměrně nepoužívat

- Skleněná primární tlačítka
- Sklo vnořené do skla
- `will-change` nebo `contain` na skleněných panelech a jejich předcích
- Barevné gradienty přes celé pozadí
- Animace `backdrop-filter`
- Animace delší než 300 ms
- Plovoucí akční tlačítko přes kalendář
- Průhlednost jako řešení překryvu událostí
- Barva jako jediný nosič významu
- Emoji místo ikon (C6-J2)

---

## 11. Pořadí implementace

**Fáze 1, základ**
1. C9-T3a až C9-T3f: opravené tokeny a měření kontrastu v CI
2. C9-T6: rozhodnutí o kontrastu dělících linek
3. C9-B3: čtyři cesty k vypnutí skla včetně manuálního přepínače
4. C9-A6: dark mode
5. C9-Y1, C9-Y2, C9-Y4: typografie

**Fáze 2, layout**
6. C9-L1, C9-L5: opravené breakpointy
7. C9-M1: Agenda jako výchozí na mobilu
8. C9-M8: `viewport-fit=cover` a safe area
9. C9-L3: sbalitelný pravý panel

**Fáze 3, kritické povrchy**
10. C9-K1, C9-K2, C9-K6: události a jejich cílové velikosti
11. C9-T5: paleta barev kroužků
12. C9-G10: solidní podklad pro heatmapu, konflikty a uzávěrky

**Fáze 4, sklo**
13. C9-B5: zákaz vnořování, portály pro sheety
14. C9-G1 až C9-G5: skleněné povrchy
15. C9-B1, C9-B2: třída a solidní vnitřní povrchy

**Fáze 5, polish a měření**
16. C9-A1 až C9-A5: přístupnost
17. C9-P1, C9-P3, C9-P6: proměření heuristik a nastavení skutečných prahů
18. Tisk (C6-K), který v původním návrhu designu chyběl úplně

Sklo je až ve čtvrté fázi záměrně. Implementované dřív by znamenalo ladit vzhled něčeho, co ještě nemá správný layout ani kontrast.

---

## 12. Definition of Done

1. Měření kontrastu běží v CI a build padá pod 4.5:1 pro text a pod 3:1 pro prvky rozhraní.
2. Aplikace je plně čitelná a použitelná se sklem vypnutým všemi čtyřmi cestami z C9-B3, včetně prohlížeče bez podpory `backdrop-filter`.
3. Nikde v DOM není `backdrop-filter` vnořený uvnitř jiného, a žádný skleněný panel ani jeho předek nemá `will-change` nebo `contain`.
4. Scroll katalogu s 200 položkami je plynulý na středním Android telefonu, měřeno na zařízení.
5. Při 1440 px má kalendář alespoň 760 px, tedy nejméně 105 px na den.
6. Pod 900 px je výchozím pohledem Agenda.
7. Zvětšení písma na 200 % nerozbije žádnou obrazovku.
8. Všechny barvy kroužků splňují 4.5:1 s bílým textem a jsou rozlišitelné při deuteranopii.
9. Každý klikací prvek splňuje 24 × 24 px nebo výjimku na odstupy; primární prvky mají 44 × 44 px.
10. Spodní tab bar na iPhonu nekoliduje s indikátorem domů, ověřeno na zařízení s `viewport-fit=cover`.
11. Nadpisy s řetězcem `ĎŤÁŮŘĚ` se neořezávají v žádné velikosti.
12. Každé pravidlo označené [HEURISTIKA] bylo buď proměřeno a potvrzeno, nebo nahrazeno naměřenou hodnotou.
