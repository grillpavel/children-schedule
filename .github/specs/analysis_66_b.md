# Specifikace vývoje – Design System, Ergonomie a Intuitivnost
**Children Schedule Planner**  
**Verze:** 1.0  
**Datum:** 19. 8. 2026  
**Priorita:** P0–P1 (kritické pro dosažení „the best“ použitelnosti)

---

## 1. Cíl specifikace

Dosáhnout maximální intuitivnosti ovládání a profesionální konzistence tím, že:

- Designový systém (barvy, typografie, tvary, spacing) bude **jednotný** napříč celou aplikací.
- Rozložení prvků se bude **striktně přizpůsobovat ergonomii** daného zařízení (mobile / tablet / desktop).
- Primární uživatelské toky budou maximálně zkrácené a srozumitelné.

**Designový systém zůstává stejný. Layout a priorita prvků se mění podle zařízení.**

---

## 2. Design System (jednotný pro všechna zařízení)

### 2.1 Barvy

| Token                    | Hodnota          | Použití                              |
|--------------------------|------------------|--------------------------------------|
| `--color-primary`        | `#2563EB`        | Primární tlačítka, aktivní stavy     |
| `--color-primary-hover`  | `#1D4ED8`        | Hover / pressed                      |
| `--color-success`        | `#16A34A`        | „Bez kolize“, úspěch                 |
| `--color-danger`         | `#DC2626`        | Konflikty, chyby                     |
| `--color-warning`        | `#D97706`        | Těsné přesuny, upozornění            |
| `--color-neutral-50`     | `#F8FAFC`        | Pozadí                               |
| `--color-neutral-100`    | `#F1F5F9`        | Karty, sekundární plochy             |
| `--color-neutral-700`    | `#334155`        | Primární text                        |
| `--color-neutral-500`    | `#64748B`        | Sekundární text                      |

### 2.2 Typografie

- Font family: `Inter` (nebo systémový sans-serif stack)
- Hierarchie:

| Styl              | Velikost | Weight | Line-height | Použití                     |
|-------------------|----------|--------|-------------|-----------------------------|
| Heading 1         | 24–28 px | 700    | 1.25        | Hlavní nadpisy obrazovek    |
| Heading 2         | 18–20 px | 600    | 1.3         | Sekce                       |
| Body              | 15–16 px | 400    | 1.5         | Běžný text                  |
| Caption           | 13 px    | 500    | 1.4         | Badge, sekundární info      |
| Button            | 15–16 px | 600    | 1           | Všechna tlačítka            |

### 2.3 Tlačítka a tvary

**Pravidla (povinná):**
- Všechna primární tlačítka mají **stejný border-radius** (`12px` nebo `16px` – zvolit jeden a držet).
- Minimální výška tlačítka: **44 px** (doporučeno 48 px).
- Minimální touch target: **44 × 44 px**.
- Primární tlačítko = plná výplň `--color-primary`.
- Sekundární tlačítko = outline nebo ghost se stejným radiusem.
- Icon-only tlačítka musí mít accessibility label.

**Zakázáno:**
- Míchat různé radiusy (např. 8 px + 9999 px).
- Používat holé „+“ bez textu nebo aria-labelu na desktopu.

### 2.4 Karty a badge

- Karty: jednotný `border-radius: 12px`, jemný stín, konzistentní padding (`16px`).
- Badge:
  - Pozitivní (`Bez kolize`, `Vhodné pro věk`) → zelené pozadí + zelený text.
  - Negativní (konflikt) → červené pozadí + bílý/červený text.
  - Stejný radius a typografie napříč aplikací.

### 2.5 Spacing

Používat 4px scale: `4, 8, 12, 16, 20, 24, 32, 40, 48...`

---

## 3. Ergonomie podle zařízení

### 3.1 Mobile (< 768 px)

**Layout principy:**
- Bottom Navigation (Domů / Katalog / Rozvrh / Děti) s `padding-bottom: env(safe-area-inset-bottom)`.
- Výchozí pohled **Rozvrhu = Agenda** (ne time-grid).
- Detail kroužku = Bottom Sheet.
- Header maximálně minimalizovaný (jméno dítěte + stav uložení + menu).
- Primární akce v dosahu palce (spodní část obrazovky).

**Povinné chování Bottom Sheetu:**
- Po úspěšném přidání kroužku se sheet **okamžitě uzavře**.
- Musí jít uzavřít swipe-down, kliknutím na backdrop i klávesou Escape.
- Po uzavření nesmí zůstat žádný focus-trap ani scroll-lock.

### 3.2 Tablet (768–1023 px)

- Hybridní layout: preferovat zmenšený 2-panel nebo jasně oddělené sekce.
- Nesmí vypadat jako pouhý „zvětšený mobil“.
- Touch targety zůstávají ≥ 44 px.

### 3.3 Desktop (≥ 1024 px)

- 2-panel layout:
  - Levý panel: Katalog + filtry + doporučení
  - Pravý/střední panel: Rozvrh (výchozí = Time-grid)
- Header zjednodušený (jméno dítěte + varianty + Uloženo + Export).
- Time-grid jako výchozí pohled rozvrhu.

---

## 4. Intuitivnost primárních toků

### 4.1 Onboarding → Hodnota

**Požadovaný tok:**
1. Rychlé nastavení (jméno / věk / zájmy / dostupnost)
2. Okamžitě obrazovka:  
   „Pro [jméno] jsme našli X vhodných aktivit“
3. Top 3–5 doporučení s jasným tlačítkem „Přidat do rozvrhu“
4. Teprve potom možnost „Zobrazit všechny“

**Zakázáno:** Po onboardingu rovnou otevřít plný katalog.

### 4.2 Přidání kroužku

- Tlačítko musí být textové: **„Přidat do rozvrhu“** (ne pouze „+“).
- Po přidání:
  - Okamžitý success feedback (toast nebo checkmark)
  - Sheet se uzavře
  - Rozvrh se aktualizuje

### 4.3 Vizualizace kolizí

- Konflikt musí být **vizuálně dominantní** (silný červený rám + ikona + krátký text).
- Tooltip nebo inline text: „Koliduje s: [název] [den] [čas]“.
- Badge „Bez kolize“ zůstává, ale při konfliktu má prioritu varování.

### 4.4 Rozvrh

| Zařízení | Výchozí pohled | Sekundární pohled |
|----------|----------------|-------------------|
| Mobile   | Agenda         | Mřížka (volitelně)|
| Desktop  | Time-grid      | Agenda            |

Volné dny zobrazovat čistě (text „Volno“ nebo prázdný prostor). Žádné tečkované pozadí.

---

## 5. Konkrétní UI komponenty – pravidla

### 5.1 Primární tlačítko
Výška: 48 px
Border-radius: 12 px (nebo 16 px – jednotně)
Background: var(--color-primary)
Text: 16 px / 600

### 5.2 Karta kroužku (katalog)
Padding: 16 px
Border-radius: 12 px
Struktura:

Kategorie / ikona
Název (Heading 2)
Den + čas (výrazně)
Badge řada (Vhodné pro věk, Bez kolize...)
Cena
Tlačítko „Přidat do rozvrhu“

### 5.3 Bottom Navigation (mobile)
Výška obsahu: 56 px

padding-bottom: env(safe-area-inset-bottom)
Aktivní stav: výrazná barva + ikona

## 6. Acceptance Criteria

### Design System
- [ ] Všechna primární tlačítka mají stejný border-radius a výšku.
- [ ] Badge používají jednotný styl (barva + typografie).
- [ ] Typografická škála je konzistentní napříč obrazovkami.
- [ ] Karty mají stejný radius, stín a padding.

### Ergonomie
- [ ] Bottom navigation na iOS respektuje safe-area a je plně trefitelná.
- [ ] Na mobilu je výchozí pohled Rozvrhu = Agenda.
- [ ] Detail sheet se po přidání kroužku vždy uzavře.
- [ ] Touch targety ≥ 44 × 44 px.

### Intuitivnost
- [ ] Po onboardingu se zobrazí doporučení, ne plný katalog.
- [ ] Konflikt je vizuálně dominantní a srozumitelný.
- [ ] Po přidání kroužku uživatel dostane jasný success feedback.
- [ ] Primární akce jsou označené textem („Přidat do rozvrhu“).

---

## 7. Prioritizace implementace

| Priorita | Úkol                                      | Odhad     |
|----------|-------------------------------------------|-----------|
| P0       | Sjednocení stylu tlačítek a radiusů       | 0.5–1 den |
| P0       | Spolehlivé uzavírání bottom sheetu        | 0.5 dne   |
| P0       | Safe-area bottom navigation               | 0.5 dne   |
| P1       | Doporučení jako první obrazovka po onboardingu | 1 den |
| P1       | Posílení vizualizace konfliktů            | 0.5–1 den |
| P1       | Default Agenda na mobilu                  | 0.5 dne   |
| P2       | Kompletní tokenizace design systému       | 1–2 dny   |
| P2       | Tablet hybrid layout                      | 1 den     |

---

## 8. Definition of Done

- Designový systém je jednotný (barvy, typografie, tvary tlačítek, karty, badge).
- Layout se striktně přizpůsobuje ergonomii mobile / tablet / desktop.
- Primární toky (onboarding → doporučení → přidání → konflikt) jsou maximálně intuitivní.
- Bottom sheet se po přidání vždy uzavře.
- Aplikace působí vizuálně klidně a profesionálně na všech zařízeních.
- Splněny všechny Acceptance Criteria výše.

---

**Poznámka pro vývojáře**  
Tato specifikace má přednost před estetickými experimenty.  
Jednotný designový systém + správná ergonomie zařízení = základ pro „the best“ použitelnost.