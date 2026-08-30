# Design Review 91 — Katalog: ZŠ a ZUŠ Nové Strašecí s předpřipravenými termíny

**Status:** IMPLEMENTED
**Change ID:** CHANGE-98 (engine `@krouzky/domain` 0.9.0→0.10.0 + app `@krouzky/web`, data-only navíc)
**Date:** 2026-08-30
**Repo:** monorepo `Children_schedule` (`packages/domain`, `apps/web`)
**Trigger:** uživatel doplnil `.github/specs/zs_zus.md` (obory a školné ZŠ/ZUŠ Nové Strašecí) a
požádal o rozšíření katalogu o 2 nové poskytovatele (ZŠ, ZUŠ) tak, aby v katalogu bylo celkem 5
poskytovatelů (DDM, SCNS, TJ Sokol, ZŠ, ZUŠ). Následně upřesnil: den/čas u všech nových položek je
zatím neznámý a má se doplnit jako PŘEDPŘIPRAVENÝ zástupný termín, který si rodič později (po
domluvě s pedagogem/školou) sám upraví; ceny mají být jen informativní text, ne strukturovaná
částka.

## 0. SOTA analýza

### 0.1 Problém

ZUŠ byla v katalogu dosud jen jako `NS_PENDING` položka (`zus-nove-straseci`,
`missing: ['schedule']`) s poznámkou „NEMODELOVAT jako běžný kroužek — rozvrh se skládá
individuálně podle nástroje a pedagoga." ZŠ byla v `NS_PENDING` jen jako MÍSTO (`zs-ms-komenskeho`,
poznámka „ŠKOLA NEMÁ VLASTNÍ KATALOG KROUŽKŮ… do plánovače patří jako místo, ne jako organizátor.").
Doménové schéma navíc vyžaduje, aby každá `SessionGroup` měla aspoň jednu `Session` s konkrétním
dnem a časem (`sessions: z.array(sessionSchema).min(1)`) — bez toho položka nejde vůbec přidat do
rozvrhu.

Zdrojový dokument `zs_zus.md` obsahuje obory/položky a školné, ale žádné dny/časy — pro ZŠ „Výuka"
ani pro žádný z 38 oborů ZUŠ. Pravidlo #1 (nic se nedopočítává) by za normálních okolností
znamenalo ponechat obojí v `NS_PENDING`. Uživatel ale explicitně požádal o jinou cestu: reálně
existující funkci "Upravit čas" (`SessionTimeEditor`, CHANGE-74/`SessionOverride`) použít k tomu,
aby si rodič PO přidání do rozvrhu sám doplnil skutečný den/čas — katalog jen potřebuje technicky
platný zástupný termín, který se nikdy netváří jako ověřený.

### 0.2 Přístup

1. **PŘEDPŘIPRAVENÝ termín místo `NS_PENDING`**: pro těchto 39 položek (1 ZŠ + 38 ZUŠ) se přidá
   jedna `SessionGroup` s technickým placeholder termínem (pondělí 08:00–08:45 — u ZŠ „Výuka" 5×
   Po–Pá), vždy s `label: 'Termín upřesní rodič'` (u ZŠ „Po–Pá, termín upřesní rodič"), aby "Varianty
   docházky" v UI NIKDY neukázaly zástupný čas jako by byl reálný. `zus-nove-straseci` a
   `zs-ms-komenskeho` se přesouvají z `NS_PENDING` do `NS_CATALOG.providers` (nejsou už "pending",
   mají teď platný, byť zástupný, rozvrh). Zamítnutá alternativa: nechat v `NS_PENDING` jak
   uživatel `zs_zus.md` navrhoval — zamítnuto, uživatel výslovně chce „v Katalogu".
2. **Cena jen v popisu**: `price: PRICE_UNKNOWN` (`{amount: NaN, period: 'per_year'}`, existující
   sentinel — stejný jako u fotbalového oddílu s nezveřejněnými příspěvky) + celý known ceník
   (skupinové/individuální/přípravné + SRPŠ) jako text v `description`. Zamítnutá alternativa:
   dopočítat/přiřadit konkrétní částku ke každé z 26 hudebních položek (skupinové vs. individuální)
   — zamítnuto, zdroj to nerozlišuje a uživatel řekl „ceny dej pouze do info".
3. **Nová kategorie `drama`**: pro "Literárně dramatický" obor v `ActivityCategory` enumu žádná
   hodnota neseděla (nejbližší `'other'` by ztratila užitečné třídění). Přidána `'drama'` (engine
   change, `packages/domain` 0.9.0→0.10.0, zpětně kompatibilní — enum rozšíření, žádná migrace
   `schemaVersion` není potřeba) + label "Divadlo" ve všech 5 vyčerpávajících `Record<ActivityCategory,
   string>` mapách (`CatalogPanel`/`DetailsPanel`/`HomeScreen` CATEGORY_LABELS, `ics/generate.ts`
   + `matching/index.ts` CATEGORY_CS) + zařazení do mobilního drill-down stromu (`umeni_tvoreni` →
   "Divadlo", vedle Výtvarky/Rukodělek).
4. **Kategorie „Přípravný" obor**: namapováno podle cílového uměleckého oboru (`taneční výchova` →
   `dance`, `hudební výchova` → `music`), ne jako vlastní kategorie — `ActivityCategory` nemá
   koncept věkového stupně, jen obor.
5. **Adresní rozpor** (nový nález): `zs_zus.md` uvádí ZŠ = Komenského nám. 189, ZUŠ = 209 — ale
   existující, dřív ověřená data (`zs-ms-komenskeho`, `zus-nove-straseci` v `NS_PENDING`, i starší
   `ZS_COORD` komentář) mají čísla obráceně (ZŠ = 209, ZUŠ = 189). Použita existující ověřená data
   (organization_verified, s reálným telefonem/webem), rozpor zaznamenán v kódu jako komentář pro
   budoucí ověření — NEODHADOVÁNO, který zdroj je správně.

## 1. Requirements

- **FR-1**: Katalog obsahuje 5 poskytovatelů: DDM, SCNS, TJ Sokol, ZŠ (`zs-ms-komenskeho`), ZUŠ
  (`zus-nove-straseci`).
- **FR-2**: ZŠ nabízí 1 aktivitu „Výuka" s jednou skupinou o 5 termínech (Po–Pá), placeholder čas.
- **FR-3**: ZUŠ nabízí 38 aktivit v 5 oborech (Přípravný 2, Hudební 26, Literárně dramatický 1,
  Taneční 5, Výtvarný 4), každá s jednou skupinou o 1 placeholder termínu.
- **FR-4**: Všech 39 nových aktivit má `price: PRICE_UNKNOWN` (zobrazí se „Cena neuvedena") a
  známý ceník jako text v `description`.
- **FR-5**: Každá nová `SessionGroup` má `label` explicitně říkající, že termín je zástupný — UI
  („Varianty docházky") nikdy nezobrazí placeholder čas jako by byl potvrzený.
- **FR-6**: Nová kategorie `drama` (Literárně dramatický) je zavedena v `ActivityCategory` a
  zobrazena všude, kde se `ActivityCategory` vyčerpávajícím způsobem mapuje na text.

## 2. Acceptance criteria

- **AC-1** (FR-1): headless diagnostický skript čte `<select aria-label="Pořadatel kroužku">
  option` — vrací přesně 6 položek (5 poskytovatelů + „Všichni pořadatelé"). Ověřeno.
- **AC-2/3** (FR-2/3): `EXPECTED_CATALOG_COUNT` (`test/fixtures/catalog.ts`) 37→76 (37 + 39);
  T-001 (`smoke.spec.ts`) a T-129 (`catalog.spec.ts`) zelené na všech 6 profilech.
- **AC-4** (FR-4): karta „Výuka"/„Klavír" v katalogu i detailu ukazuje „Cena neuvedena" (ne 0 Kč,
  ne NaN). Ověřeno screenshotem.
- **AC-5** (FR-5): detail „Klavír" → „Varianty docházky" ukazuje text „Termín upřesní rodič", NE
  žádný konkrétní čas. Ověřeno screenshotem (viz `/tmp/zs-zus-detail.png` v této relaci).
- **AC-6** (FR-6): `tsc --noEmit` čisté (domain+web) — vynucuje exhaustivnost všech 5
  `Record<ActivityCategory, string>` map při přidání nové hodnoty enumu.
- **AC-7** (regrese): domain vitest 135/135; plná 6profilová E2E sada (972 testů) = 740 passed /
  232 skipped / 0 failed, beze změny visuálních baselines.

## 3. Non-goals / notes

- **Skutečné dny/časy ZŠ a ZUŠ zůstávají neznámé** — rodič je doplní ručně přes „Upravit čas" u
  každé přidané aktivity/dne zvlášť, jakmile je zná. Tracked jako **BL-060** (doplnit po ověření u
  školy/ZUŠ, nahradit `label`/placeholder `Session` reálnými hodnotami).
- **Cenové zařazení jednotlivých hudebních položek** (které nástroje/soubory jsou „skupinové" vs.
  „individuální") zůstává nerozlišené — jen text v popisu, žádná konkrétní částka na položku.
  Případné doplnění = budoucí `BL` položka, pokud ZUŠ zveřejní podrobnější ceník.
- **Adresní rozpor 189/209** mezi `zs_zus.md` a existujícími ověřenými daty ponechán jako
  komentář v `novestraseciData-2.ts` u obou poskytovatelů — nutno ověřit se školou/ZUŠ přímo,
  neodhadováno v tomto changi.
- `zs-ms-komenskeho` a `zus-nove-straseci` byly odstraněny z `NS_PENDING` (přesunuty do reálného
  katalogu) — ostatní `NS_PENDING` organizace (Kelti, ST Nové Strašecí, skaut atd.) beze změny.
