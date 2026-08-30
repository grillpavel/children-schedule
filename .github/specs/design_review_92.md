# Design Review 92 — Oprava kategorizace ZŠ/ZUŠ a přesné názvy poskytovatelů

**Status:** IMPLEMENTED
**Change ID:** CHANGE-99 (app `@krouzky/web` only, engine beze změny)
**Date:** 2026-08-30
**Repo:** monorepo `Children_schedule` (`apps/web`, `packages/domain/data`)
**Trigger:** uživatel po CHANGE-98 nahlásil 3 konkrétní nepřesnosti: (1) ZŠ „Výuka" se v mobilním
drill-down katalogu zařadila pod kořenovou skupinu „Hry a myšlení", (2) ZUŠ obory se nezobrazovaly
jako 5 samostatných podskupin (Přípravný/Hudební/Literárně dramatický/Taneční/Výtvarný obor), (3)
názvy poskytovatelů v katalogu neodpovídaly požadovanému přesnému tvaru (DDM/SCNS/TJ Sokol/ZŠ/ZUŠ +
zkratka v závorce).

## 0. SOTA analýza

### 0.1 Problém

`classifyActivity(name, category)` v `CatalogPanel.tsx` řadí aktivity do 7 pevných kořenových
skupin (`sport_pohyb`…`jazyky`) čistě podle `ActivityCategory`. ZŠ „Výuka" má `category: 'other'`
(nic jiného nesedí — nejde o sport/umění/hudbu/vědu), což padalo do generického fallbacku
`{root: 'hry_mysleni', sub: 'Ostatní'}` — sémanticky špatné umístění pro školní docházku. ZUŠ obory
mají `category: 'music'/'dance'/'art'/'drama'`, což je routovalo do STEJNÝCH sdílených kořenových
skupin jako DDM's vlastní hudební/taneční/výtvarné kroužky (`hudba_tanec`/`umeni_tvoreni`) — ZUŠ
obory se tak mísily s DDM položkami místo vlastních 5 podskupin. Provider `name` pole nesla plné
právní názvy (ověřená reálná data), ne uživatelem požadovaný krátký tvar.

### 0.2 Přístup

1. **`classifyActivity` dostal `activityId` + `providerId`** (dřív jen `name`+`category`) — když
   `providerId === 'zs-ms-komenskeho'`, vrací vždy `{root: 'skola', sub: 'Výuka'}` (nová kořenová
   skupina „Škola", mimo Hry a myšlení). Když `providerId === 'zus-nove-straseci'`, deleguje na
   novou `classifyZus()`, která vrací vždy `{root: 'zus', sub: <obor>}` — nová kořenová skupina
   „ZUŠ" s přesně 5 podskupinami: `activityId.startsWith('zus-pripravna-')` → „Přípravný obor",
   `startsWith('zus-vytvarny-')` → „Výtvarný obor", `category === 'drama'` → „Literárně dramatický
   obor", `category === 'dance'` → „Taneční obor", jinak → „Hudební obor". Zamítnutá alternativa:
   přidat kategorii per obor do `ActivityCategory` (`zus_hudebni`/`zus_tanecni`/…) — zamítnuto,
   zbytečně nafukuje doménový enum jen kvůli UI seskupení jednoho poskytovatele; řešení zůstává
   čistě v `apps/web`, engine beze změny.
2. **Přesné názvy poskytovatelů** — `name` pole u všech 5 přepsáno na doslovné znění ze zadání
   („DDM (Dům dětí a mládeže)", „SCNS (Sportovní centrum Nové Strašecí)", „TJ Sokol", „ZŠ (Základní
   škola)", „ZUŠ (Základní umělecká škola)"); plný ověřený právní název zachován jako `note` (pole
   v `providerSchema` již existovalo, jen se nezobrazovalo tak prominentně jako `name`).

## 1. Requirements

- **FR-1**: ZŠ „Výuka" se v katalogu zobrazuje pod vlastní kořenovou skupinou „Škola", ne „Hry a
  myšlení".
- **FR-2**: ZUŠ obory se zobrazují pod vlastní kořenovou skupinou „ZUŠ" s přesně 5 podskupinami:
  Přípravný obor, Hudební obor, Literárně dramatický obor, Taneční obor, Výtvarný obor.
- **FR-3**: Filtr „Pořadatel kroužku" nabízí přesně těchto 5 řetězců (+ „Všichni pořadatelé"): „DDM
  (Dům dětí a mládeže)", „SCNS (Sportovní centrum Nové Strašecí)", „TJ Sokol", „ZŠ (Základní
  škola)", „ZUŠ (Základní umělecká škola)".

## 2. Acceptance criteria

- **AC-1** (FR-1): headless skript čte `getByRole('button', {name: /^▾ ŠKOLA/})` → existuje,
  počet položek 1; `getByRole('button', {name: /^▾ HRY A MYŠLENÍ/})` → počet klesl na 1 (jen
  DDM „Deskové hry", Výuka už tam není). Ověřeno.
- **AC-2** (FR-2): `getByRole('button', {name: /^▾ ZUŠ/})` → počet 38; podskupiny přesně
  „Hudební obor (26)", „Taneční obor (5)", „Výtvarný obor (4)", „Přípravný obor (2)", „Literárně
  dramatický obor (1)". Ověřeno.
- **AC-3** (FR-3): `select[aria-label="Pořadatel kroužku"] option` vrací přesně 6 položek („Všichni
  pořadatelé" + 5 požadovaných řetězců, doslovná shoda). Ověřeno.
- **AC-4** (regrese): `tsc --noEmit` čisté (web); domain vitest 135/135 (engine nedotčen); plná
  6profilová E2E sada (972 testů) = 740 passed / 232 skipped / 0 failed po regeneraci vizuální
  baseline `sheet-glass-on/off` (mobil, mobil-small — kratší jméno poskytovatele DDM na první
  kartě sheetu, legitimní vizuální změna).

## 3. Non-goals / notes

- Krátké názvy poskytovatelů (`name`) nyní neobsahují právní formu (z. s., příspěvková organizace
  apod.) — plný ověřený název zůstává v novém `note` poli u každého poskytovatele pro budoucí
  potřebu (ICS export, kontaktní údaje).
- `sokol-fotbal`'s krátký název „TJ Sokol" nadále pokrývá JEN fotbalový oddíl (florbal/Kelti
  basketbal zůstávají samostatné `NS_PENDING` organizace) — zaznamenáno v `note`, aby budoucí
  přidání florbalu/Kelti do katalogu nekolidovalo se stejným zkráceným názvem.
