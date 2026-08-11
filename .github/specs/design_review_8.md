# Design Review 8 — Zpřehledni první průchod katalogem a ukládáním

**Status:** DRAFT
**Change ID:** CHANGE-9 (první vlna Changes 6/7: fulltext katalogu, den/čas na kartě, empty state kalendáře, symetrické Uložit/Otevřít, indikace neuloženo, skrytí nedokončeného chatu; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** Dokument `.github/specs/krouzky-planner-changes-6-7.md` popisuje, že uživatel při prvním průchodu nevidí hodnotu aplikace: prázdná mřížka bez vedení, slabé vyhledávání, nejasné ukládání a nedokončený Chat tab snižují důvěru i konverzi.

> Delta base: supersedes `design_review_7.md` §3 (CHANGE-8) pouze v UI vrstvě. Žádná změna doménového modelu ani `schemaVersion`.

## 0. SOTA analysis

### 0.1 Problem

1. Katalog na levém panelu neuměl robustní fulltext v češtině (diakritika + velikost písmen), takže dotazy typu `ucitel`/`hokejbal` byly nespolehlivé.
2. Karta kroužku neukazovala nejdůležitější signál pro rozhodnutí (`den + čas`) a používala chybný plurál (`variant`).
3. Prázdný rozvrh se zobrazoval jako prázdná mřížka bez explicitního dalšího kroku.
4. Ukládání bylo asymetrické (otevření tlačítkem, uložení schované v menu) a varování před ztrátou dat neodlišovalo skutečně neuložené změny.
5. Nedokončený Chat tab působil jako nehotová funkce.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Fulltext (C7-F1) | Normalizace přes `NFD` + odstranění diakritiky na obou stranách (dotaz i index), vyhledání přes název + poskytovatele + kategorii, zvýraznění shody v názvu. | Prosté `toLowerCase().includes()` jen na názvu — selhává pro češtinu a neprohledává metadata. |
| Informační hustota karty (C7-C4, C6-J1) | Druhý řádek karty nese `den/čas` a až za tím cenu; pluralizace `termín / varianty / variant`. | Zachovat `N termínů` bez času — neřeší hlavní rozhodovací potřebu rodiče. |
| Empty state kalendáře (C6-E1) | Při nulovém obsahu zobrazit jasný empty state s CTA „Přidat první kroužek“ a krátkými tipy. | Prázdná mřížka s implicitním onboardingem — uživatel neví, co dělat dál. |
| Uložení a varování (C6-B6, C6-B7, C6-J6) | V hlavičce mít trvale `Otevřít` + `Uložit`, stav `Neuloženo/Uloženo` podle podpisu serializovaného stavu a `beforeunload` jen při dirty stavu. Trvalý text o dočasnosti přesunut do hlavičky. | Používat jen heuristiku „obsah existuje“ a schovávat uložení pod exportní menu. |
| Chat tab (C6-F6) | Chat skrýt, dokud není funkční. | Nechat zástupný tab viditelný — snižuje důvěru a odvádí pozornost. |

## 1. Requirements

- **FR-1 [app]** Katalog MUST filtrovat fulltext přes název, poskytovatele a kategorii necitlivě na diakritiku i velikost písmen, a při shodě zvýraznit část názvu.
- **FR-2 [app]** Karta kroužku MUST zobrazit den/čas termínu v hlavním metadatovém řádku a používat správné české skloňování počtu variant (`termín`, `varianty`, `variant`).
- **FR-3 [app]** Při prázdném rozvrhu MUST kalendář zobrazit explicitní empty state s primárním CTA vedoucím do katalogu.
- **FR-4 [app]** Hlavička MUST mít symetrické akce `Otevřít` a `Uložit`; stav MUST indikovat `Neuloženo/Uloženo` podle posledního uloženého podpisu, a varování při zavření okna MUST proběhnout pouze při neuložených změnách.
- **FR-5 [app]** Pravý panel MUST skrýt nedokončený Chat tab a zobrazovat jen funkční informační obsah.

## 2. Acceptance criteria

- **AC-1 → FR-1** Ruční ověření: dotaz `hokejbal` najde `Hokejbal`; dotaz bez diakritiky najde položky s diakritikou; karta zvýrazní shodu v názvu.
- **AC-2 → FR-2** Ruční ověření: karta zobrazuje např. `Út 16:00` místo obecného počtu; pluralizace je `1 termín`, `2 varianty`, `5 variant`.
- **AC-3 → FR-3** Ruční ověření: při nulových zápisech je místo mřížky zobrazen onboarding panel s CTA.
- **AC-4 → FR-4** Ruční ověření: `Uložit` je na první úrovni; po změně se stav přepne na `Neuloženo`; po uložení nebo načtení JSON na `Uloženo`; `beforeunload` se nevolá bez změn.
- **AC-5 → FR-5** Ruční ověření: pravý panel neobsahuje záložku Chat.

Globální gate: `apps/web` TypeScript diagnostika bez chyb (v tomto prostředí nebyl dostupný `pnpm`).

## 3. Non-goals / notes

- Pokročilé filtry (`vícevýběr dnů`, `časové okno`, `vejde se mi to`) nejsou součástí této vlny; tracked as **BL-016**.
- Mobilní výchozí Agenda view a pokročilé rozhodovací metriky (C6-G*) nejsou součástí této vlny; tracked as **BL-016**.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze balíčku.
