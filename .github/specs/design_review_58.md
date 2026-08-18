# Design Review 58 — Redesign v5: konsolidace tří UX auditů (mobil + tablet)

**Status:** IMPLEMENTED (všech 8 FR hotovo přes CHANGE-60..65, viz §3 aktualizace)
**Change ID:** CHANGE-59 (původní DRAFT — konsolidační spec-dev dokumentace, scope app `@krouzky/web`;
skutečná implementace proběhla v navazujících CHANGE-60 až CHANGE-65)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web)
**Trigger:** tři nahrané dokumenty v5 (páté kolo UX auditu po `analysis_53_a/b.md` a `analysis_55_a/b.md`):
`analysis_redesign_specification_a.md`, `_b.md`, `_c.md`. Všechny tři nezávisle popisují stejnou vizi
(katalog → osobní plánovač) s různým důrazem: **a)** produktově/IA orientovaný audit s prioritizovaným
seznamem, **b)** formální specifikace kolizního enginu (matematické podmínky) + tři konkrétní React
komponenty, **c)** nejobsáhlejší — kompletní IA/komponentová specifikace vč. QA matic a metrik.

## 0. SOTA analysis

### 0.1 Sdílená teze

Všechny tři dokumenty se shodují na jednom přechodu mentálního modelu:

```
SOUČASNÝ STAV                       CÍLOVÝ STAV
Hledat → Filtrovat → Prohlížet      Dítě → Dostupnost → Doporučení
→ Vybrat → Přidat                   → Kolize → Rozvrh
```

Mobil/tablet dnes působí jako zmenšený desktop, ne nativní produkt. Klíčové sdílené požadavky: dítě jako
trvalý kontext, silnější „Doporučujeme“ s vysvětlením proč, 3-stavový kolizní systém (ne binární),
zjednodušené karty s postupným odkrýváním detailu, tablet s vlastním rozložením (ne zmenšený desktop ani
natažený mobil), okamžitá nedestruktivní zpětná vazba (toast + zpět), žádná kritická funkce jen na gesto.

### 0.2 Křížová kontrola proti již odvedené práci

Než cokoliv nově specifikovat, ověřeno proti historii CHANGE-1..58 — hodně z toho, co dokumenty žádají,
**už existuje** (dokumenty pravděpodobně analyzovaly starší nasazenou verzi):

| Požadavek z a/b/c | Stav | Poznámka |
| --- | --- | --- |
| Spodní navigace 4 záložky (Domů/Katalog/Rozvrh/Děti) | **HOTOVO** | CHANGE-53 |
| Dítě jako trvalý kontext (přepínač, věk na dítěti) | **HOTOVO** | CHANGE-40 (více dětí), store `activeChildId` |
| Doporučení s vysvětlením („✓ Odpovídá zájmu“, „V rozpočtu“, „Termín ve volném čase“) | **HOTOVO** | CHANGE-51/52 |
| „Bez konfliktu“ filtr | **HOTOVO** | CHANGE-48 |
| 100dvh + safe-area na mobilu | **HOTOVO** | CHANGE-55 |
| Mobilní sheet se zavře po přidání + má „Zavřít“ | **HOTOVO** | CHANGE-55 |
| Undo/redo (Ctrl+Z) + toast po změně | **ČÁSTEČNĚ** | toast existuje, ale obecná zpráva „Změna uložena do varianty“ + 2,4 s (ne zpráva na akci + 4 s z doc b) §3.2 AC-1) — `BL-034` |
| „Cena neuvedena“ jako platný stav, ne chyba | **HOTOVO** | adaptér `novestraseci.ts`, CHANGE-5 |
| Skutečná cena bez přepočtu na měsíc (doc c §30 zmiňuje odhad `≈ Kč/rok` „jen když je platný“) | **HOTOVO** | CHANGE-57/58 (opačným směrem — odstranili jsme i ten odhad, protože zavádí falešnou přesnost) |
| Tap-to-add bez drag&drop na mobilu | **HOTOVO** | CHANGE-12: karta jen vybere, „Přidat do rozvrhu“ je CTA; grid má ghost sloty na klik |
| 3-sloupcová tabletová master-detail (Filtry/Kroužky/Rozvrh) | **MEZERA** | dnes 900–1440 px = slide-over přes obsah, ne trvalý 3. sloupec — `BL-033` už sleduje |
| 3-stavový kolizní systém 🟢/🟠/🔴 s logistikou přejezdu | **MEZERA** | dnes jen binární `severity: 'hard'\|'soft'`; doménový `packages/domain/src/travel/index.ts` (haversine, rychlosti, buffer) existuje, ale **nikde není zapojený** — `BL-034` |
| Kategorie „jedna úroveň najednou“ na mobilu (ne „Rozbalit vše“) | **MEZERA** | `CatalogPanel` má „Rozbalit vše“/„Sbalit vše“ shodně na všech šířkách |
| Explicitní „+N dalších termínů“ místo strohého „+1“ | **MEZERA** | `sessionLabel()` v `CatalogPanel.tsx` stále vrací `"Po 16:30 · +1"` (BL-031 tvrdí, že šlo o vyřešeno přes T-110/T-120 — ověřeno kódem, že se to netýkalo kompaktní karty, jen jinde použitá `pluralizeVariants` je dnes mrtvý/nevolaný kód; oprava zápisu do backlogu níže) |
| FAB s přednastavenými typy vlastní události (Kroužek/Škola/Lékař/Jiné) | **MEZERA** | dnes jediné tlačítko „Vlastní událost“ → obecný dialog |
| Explicitní „✓ Věk odpovídá“ porovnání s věkem dítěte (ne jen rozsah) | **MEZERA** | detail ukazuje jen „Vhodné pro 8–11 let“, bez porovnání s věkem aktivního dítěte |
| „Dnes“ blok nad týdenním přehledem na Domů | **MEZERA** | `HomeScreen` má jen „Tento týden“ dashboard, žádný samostatný „Dnes“ blok |
| Sticky mini-rozvrh při procházení katalogu (persistentní kontext) | **MEZERA** | katalog a rozvrh jsou oddělené panely/záložky; na mobilu nejde vidět obojí najednou |
| Swipe-down zavření sheetu, long-press kontextová akce | **NEIMPLEMENTOVÁNO** (vědomě) | `BL-033` bod 1 — gesta zůstávají mimo scope, tlačítka jsou primární cesta (P0 zásada „žádná kritická funkce jen na gesto“ je tím i splněna) |

### 0.3 Přístup — fázování

Rozsah všech tří dokumentů dohromady je **samostatný projekt** (nový kolizní engine s geodata, tabletový
layout, FAB, drill-down navigace kategorií…), ne jednorázová oprava. Tento review proto:

1. Zapisuje **nekryté mezery** jako nové `FR` s testovatelnými `AC` (níže) — to je „spec-dev
   dokumentace pro provedení změn“, o kterou uživatel požádal — ale **neimplementuje** je v tomto kroku.
2. Řadí je podle poměru přínos/riziko do `P0`/`P1`/`P2` (viz §3), aby další session mohla vzít jeden FR a
   udělat z něj samostatný `CHANGE-<id>` + `design_review_<n>.md` (delta na tento dokument), přesně podle
   `dev-process.instructions.md` §2.
3. Explicitně **NEROZHODUJE** prioritizaci mezi FR — to je produktové rozhodnutí uživatele (stejný vzor
   jako `BL-028 NEEDS INPUT`). Doporučené pořadí je v §3, ale je to doporučení, ne rozhodnutí.

## 1. Requirements (cílový stav — pro budoucí fázovanou implementaci)

- **FR-1** Kompaktní karta kroužku v katalogu nahrazuje strohé „Po 16:30 · +1“ srozumitelným zápisem
  (např. „Po 16:30 + 1 další termín“) a klik na dodatečné termíny otevře jejich úplný výpis s vlastním
  časem u každého.
- **FR-2** Domů obrazovka má samostatný blok „Dnes“ (dnešní události dítěte, řazené časem) nad blokem
  „Tento týden“, viditelný bez scrollování na běžném mobilním displeji.
- **FR-3** Detail kroužku ukazuje explicitní porovnání věku aktivního dítěte s rozsahem aktivity
  („✓ Věk odpovídá“ / „⚠ Mimo doporučený věk“), ne jen holý rozsah.
- **FR-4** „Vlastní událost“ nabízí při otevření volbu typu (Kroužek/Škola/Lékař/Jiné) s odpovídající
  výchozí barvou/ikonou; typ se ukládá a zobrazuje v detailu i rozvrhu.
- **FR-5** Toast po odebrání/přidání nese zprávu na konkrétní akci („Basketbal odebrán z rozvrhu“, ne
  obecné „Změna uložena do varianty“) a zůstává viditelný 4 s (bylo 2,4 s).
- **FR-6** Na mobilu (`<900px`) se kategorie v katalogu procházejí po jedné úrovni (kořenová kategorie →
  klik → podkategorie → klik → aktivity) místo současného „Rozbalit vše“, které ukáže celý strom najednou;
  „Rozbalit vše“/„Sbalit vše“ zůstává dostupné na tabletu/desktopu jako zkratka pro pokročilé uživatele.
- **FR-7** Tablet (900–1439 px šířky) dostává trvalý master-detail layout (katalog vlevo, detail/rozvrh
  vpravo) místo dnešního slide-over přes obsah, který zakrývá zbytek plochy.
- **FR-8** Kolizní systém rozlišuje tři stavy — 🟢 bez kolize, 🟠 těsný přejezd (různá lokalita, mezera
  mezi konci/začátky pod nastavitelným minimem), 🔴 přímá časová kolize — s viditelným odůvodněním
  (název kolidující aktivity u 🔴, čas přejezdu u 🟠). Vyžaduje zapojení dormant `packages/domain/src/
  travel/index.ts` a nové nastavení „minimální čas na přesun“ per dítě.

## 2. Acceptance criteria

- **AC-1** (FR-1) — **hotovo**, viz `design_review_59.md` AC-1/AC-2 (T-129).
- **AC-2** (FR-2) — **hotovo**, viz `design_review_60.md` AC-1 (T-216).
- **AC-3** (FR-3) — **hotovo**, viz `design_review_60.md` AC-2 (ověřeno manuálně, viz tam §3).
- **AC-4** (FR-4) — **hotovo**, viz `design_review_62.md` AC-2 (T-161).
- **AC-5** (FR-5) — **hotovo**, viz `design_review_60.md` AC-3 (T-137).
- **AC-6** (FR-6) — **hotovo (upraveno)**, viz `design_review_61.md` AC-1 (T-160) — „Rozbalit vše“
  zůstává v DOM i na mobilu jako zkratka, viz tam §0.2 pro zdůvodnění odchylky.
- **AC-7** (FR-7) — **hotovo**, viz `design_review_63.md` AC-1 (T-162).
- **AC-8** (FR-8) — **hotovo**, viz `design_review_64.md` AC-1 (doménové testy) + AC-2 (T-163).

## 3. Non-goals / notes — všechny FR implementovány

**AKTUALIZACE:** všech 8 FR z této DRAFT specifikace bylo implementováno v CHANGE-60 až 65 (viz
`design_review_59.md`, `design_review_60.md`, `design_review_61.md`, `design_review_62.md`,
`design_review_63.md`, `design_review_64.md`). Tento dokument zůstává jako záznam původní analýzy a
křížové kontroly (§0.2) proti už odvedené práci.

Nové položky backlogu vzniklé během implementace (viz `docs/backlog.md`):

- **BL-035** — FR-6 (drill-down kategorií na mobilu) + oprava zápisu k „+1“ (BL-031 poznámka byla nepřesná
  — netýkala se kompaktní karty katalogu, jen jinam použité, dnes nevolané `pluralizeVariants`).
- **BL-036** — FR-7 (tabletový trvalý master-detail, 900–1439 px) — rozšiřuje/nahrazuje `BL-033` bod 2.
- **BL-037** — FR-4 (FAB s typy vlastní události) + FR-2 (Domů „Dnes“ blok).
- Sloučeno do **BL-034** (beze změny ID, jen upřesnění): FR-8 (3-stavový kolizní systém + travel-time
  engine) — `analysis_redesign_specification_b.md`/`_c.md` dodaly formální matematickou specifikaci
  (§2 v doc b), která se má použít při skutečné implementaci místo domýšlení podmínek od nuly.

Co se **vědomě nedělá** (mimo scope i budoucích fází, pokud uživatel neřekne jinak):

- Swipe-gesta (swipe-down zavřít sheet, swipe mezi dny rozvrhu) — zůstávají tlačítka jako primární a
  jediná cesta (`BL-033` bod 1); P0 zásada „žádná kritická funkce jen na gesto“ tím není porušena.
- Natural-language vyhledávání, AI doporučení, automatická optimalizace rozvrhu, PDF export, PWA/offline,
  cloud účty (doc a) §49/§48 P2, kryje se s existujícím `BL-032`).
- Analytics funnel (doc c §45) — lokální nástroj bez backendu, sběr událostí by vyžadoval nové GDPR
  rozhodnutí mimo scope tohoto review.
