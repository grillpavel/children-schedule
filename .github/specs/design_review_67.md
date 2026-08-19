# Design Review 67 — Realizace backlogu z v6/v7 UX kol (BL-038, BL-039, BL-040, BL-042, BL-045)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-68 až CHANGE-72 (scope engine `@krouzky/domain` 0.4.0 → 0.5.0 + app `@krouzky/web` + testy)
**Date:** 2026-08-19
**Repo:** monorepo `Children_schedule`
**Trigger:** uživatel po validaci v6/v7 UX kol (`design_review_65.md`, `design_review_66.md`) požádal
„pusť se do toho a dodělej backlog" — realizace vybraných otevřených položek `docs/backlog.md`
(BL-038, BL-039, BL-040, BL-042, BL-045), zbytek (BL-041, BL-043, BL-044, BL-046) zůstává vědomě
odložen (viz §3), protože jde o velké/rizikové iniciativy vyžadující vlastní design review.

## 0. SOTA analýza

### 0.1 Výběr položek k realizaci

Z otevřených `BL-038` až `BL-046` byly vybrány ty, které mají jasně ohraničený scope a nízké až střední
riziko regrese:

| BL | Popis | Riziko | Rozhodnutí |
|---|---|---|---|
| BL-038 | per-dítě čas na přesun + dopravní mód | střední (schema bump) | **implementováno** |
| BL-039 | 3-stavový náhled kolize na kartě katalogu | střední (nová doménová funkce) | **implementováno** |
| BL-040 | „Co se hodí [dítě]?" prominentnější CTA | nízké (jen popisek) | **implementováno** |
| BL-042 | cenový rozsahový filtr | nízké (jen UI filtr) | **implementováno** |
| BL-045 | touch-target audit | nízké, ale rozsáhlé | **částečně** (CustomEntryDialog) |
| BL-041 | rodinná/multi-dítě kolize | vysoké (nový `ConflictKind`, nový engine) | odloženo |
| BL-043 | „command-center" vyhledávání | vysoké (NLP, výzkumné) | odloženo |
| BL-044 | CI gate pro E2E | infrastruktura, ne UI/UX | odloženo |
| BL-046 | design token systém (radius/spacing) | vysoké (rozbije vizuální baseline plošně) | odloženo |

### 0.2 Zjištění při implementaci (kritické, ovlivnily finální řešení)

1. **`capacity_unknown` musel být vyloučen z náhledu kolize (BL-039).** Doména už evidovala měkký
   konflikt „kapacita neuvedena" pro JAKÝKOLI zápis aktivity bez pole `capacity` — bez ohledu na
   existující rozvrh. Naivní implementace náhledu (BL-039) by tak označila „🟡 Napjato" prakticky
   KAŽDOU aktivitu v katalogu bez ohledu na skutečnou časovou/logistickou kolizi, protože většina
   aktivit v reálném katalogu kapacitu neuvádí. Objeveno až testem (viz T-211 regrese níže) — oprava:
   `previewGroupConflict()` tento druh konfliktu explicitně z náhledu vylučuje (zůstává řešen jinde,
   v `DetailsPanel`/`useScheduleView`, jen ne v katalogovém náhledu).
2. **Testovací kolize mezi novou (BL-039) kartovou a existující (FR-11) mřížkovou/agendovou
   signalizací.** Obě funkce nezávisle používají podobný slovník („Kolize"/`title` se zprávou), takže
   testy cílící na `getByTitle(/…/)`/`getByText('Kolize')` bez dalšího rozlišení mohly omylem zachytit
   ŠPATNÝ prvek (kartu místo bloku v rozvrhu, nebo naopak) — objeveno na testech T-165/T-211. Oprava:
   všechny čtyři druhy odznaků dostaly vlastní `data-testid`
   (`conflict-preview-badge` na kartě, `grid-hard-conflict-badge`/`grid-soft-conflict-badge` v mřížce,
   `agenda-hard-conflict-badge`/`agenda-soft-conflict-badge` v Agendě), testy podle nich přepsány.
3. **Reálné geokódování jako zdroj nedeterminismu v testech (BL-038).** Existující T-163 používala
   fiktivní ulice ve SKUTEČNÝCH městech („Praha", „Brno") — nový test T-175 (o pár kroků delší) dal
   asynchronnímu online geokódování (Nominatim) čas doběhnout a přiřadit REÁLNÉ, ~200 km vzdálené
   souřadnice, což zcela přebilo nastavovaný `travelBufferMinutes` (výpočet z reálné vzdálenosti nezávisí
   na rezervě, jen na ní jako fallbacku bez souřadnic). Oprava: nové testy používají vymyšlená města
   mimo `TOWN_CENTERS` i mimo reálný svět („Xilonovo", „Yzemnice"), ať zůstávají deterministické bez
   závislosti na síti.

## 1. Requirements

- **FR-15 (BL-038)**: `Child` MUSÍ mít volitelná pole `travelBufferMinutes` (0–120 min) a
  `travelMode` (`walk`/`car`/`transit`); H9 detekce (`detectTightTransfers`) MUSÍ použít tyto hodnoty
  místo globálního výchozího nastavení, pokud jsou zadány. UI pro úpravu MUSÍ být dostupné jak na
  desktopu (Toolbar), tak na mobilu (záložka „Děti").
- **FR-16 (BL-039)**: Každá karta aktivity v katalogu (ještě NEzapsaná do rozvrhu) MUSÍ zobrazit náhled
  nejzávažnějšího konfliktu, který by vznikl jejím přidáním — 🔴 (tvrdý), 🟡 (měkký/logistický), nebo nic
  (bez konfliktu). Náhled se počítá přes všechny varianty (skupiny) aktivity, bere se NEJLEPŠÍ výsledek.
  `capacity_unknown` se do náhledu nesmí započítávat.
- **FR-17 (BL-040)**: Tlačítko sekce doporučení MUSÍ nést popisek „Co se hodí [jméno dítěte]? (N)" s
  počtem plnohodnotných shod, pokud nějaké existují; jinak zůstává obecný název „Doporučení na míru".
- **FR-18 (BL-042)**: Katalog MUSÍ nabízet volitelný cenový strop („Cena do (Kč)") s přepínačem
  „Zahrnout i aktivity bez uvedené ceny" (výchozí VYPNUTO — aktivity bez ceny se strop skryjí, dokud
  uživatel explicitně nezapne zahrnutí).
- **FR-19 (BL-045, částečně)**: Zavírací (X) tlačítko a tlačítko „Odebrat termín" v dialogu „Vlastní
  událost" MUSÍ mít touch target ≥44×44 px na kompaktních šířkách (`<900px`); zavírací tlačítko navíc
  MUSÍ mít přístupný název (dřív žádný nemělo — vedlejší a11y oprava).

## 2. Acceptance criteria

- **AC-15**: Nové doménové testy (`conflicts.test.ts`) ověří, že `travelMode: 'walk'` zpřísní požadovaný
  čas oproti výchozímu `'car'`, a že `travelBufferMinutes` přepíše globální výchozí rezervu, když chybí
  souřadnice. Nový E2E test T-175 ověří UI cestu (nastavení 0 min odstraní upozornění v mřížce).
  Migrace v5→v6 (`state.test.ts`) ověří, že chybějící pole zůstanou `undefined` (žádná transformace dat).
- **AC-16**: Nové doménové testy (`conflicts.test.ts`, `previewGroupConflict`) ověří: prázdný rozvrh →
  `severity: null`; hypotetický přímý překryv → `severity: 'hard'` se jmény obou položek ve zprávě;
  aktivita bez uvedené kapacity → `severity: null` (ne `'soft'`); rozvrh se voláním nezmění. Nový E2E test
  T-173 ověří viditelnost odznaku (`data-testid="conflict-preview-badge"`) po vytvoření garantované kolize.
- **AC-17**: Nový E2E test T-174 ověří, že tlačítko sekce doporučení nese vzor `Co se hodí .+\? \(\d+\)`
  ihned po načtení (výchozí dítě má díky věku a prázdnému rozvrhu vždy aspoň jednu plnou shodu).
- **AC-18**: Nový E2E test T-172 ověří, že limit „100 Kč" vyfiltruje celý reálný katalog (všechny
  aktivity stojí ≥ 800 Kč/rok) a že zapnutí „Zahrnout i bez uvedené ceny" vrátí zpět aktivity bez ceny.
- **AC-19**: Rozšířený T-213 (`responsive.spec.ts`) ověří bounding box ≥44×44 px zavíracího tlačítka a
  tlačítka „Odebrat termín" v dialogu „Vlastní událost" na kompaktních profilech.

## 3. Non-goals / notes

Vědomě odloženo (viz tabulka v §0.1) — `BL-041` (rodinná kolize), `BL-043` (silnější vyhledávání),
`BL-044` (CI gate), `BL-046` (design token systém). Žádná z těchto položek nebyla tímto CHANGE dotčena;
zůstávají otevřené v `docs/backlog.md` se stejným zdůvodněním jako v `design_review_65/66.md`.

`BL-045` zůstává OTEVŘENÁ (jen částečně vyřešena) — zbývá projít další ikonová tlačítka napříč
`DetailsPanel.tsx` (mapové odkazy, sbalovací šipky) jedno po druhém; toto CHANGE řešilo jen
`CustomEntryDialog.tsx`, protože tam byl nález nejjasnější (žádný accessible name na zavíracím tlačítku).
