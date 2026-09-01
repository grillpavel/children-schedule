# Spec: Dva typy exportu — per dítě / sdílený rodinný kalendář

**Návaznost:** `analyza-ztraty-dat.md` (root cause), `ukladani-dat.md`, `README.md`
**Rozsah:** platí pro libovolný počet dětí 1..N

## 1. Požadavek

1. **Export jednoho konkrétního dítěte** — funguje pro dítě 1, 2, ..., N.
2. **Export všech dětí najednou jako JEDEN sdílený kalendář** — ne N souborů vedle sebe (to dnes u `.ics` už existuje jako "všechny najednou", ale jako N samostatných souborů; tohle je nový mód, kde vznikne jeden společný artefakt).

Předpoklad, který dávám najevo hned na začátku: níž popisuju obě varianty pro **JSON i .ics**, protože nebylo řečeno, který formát máš na mysli u které varianty, a obě jsou relevantní pro obě.

## 2. Kritická závislost — tohle musí být vyřešeno první

Pokud "export jednoho dítěte" (bod 1) vyprodukuje JSON se **stejným tvarem** jako dnešní celorodinný `PlannerState` (jen s `children: [jedno dítě]`), bude **strukturálně nerozeznatelný** od plného exportu. Dnešní `importJson` neumí nic jiného než plný přepis — takže re-import takového "jednoho dítěte" by smazal zbytek rodiny. To je přesně mechanismus, který jsme diagnostikovali jako pravděpodobnou příčinu tvého současného bugu (`rozvrh-julie.json`/`rozvrh-jonda.json`, bod 0/1.1 analýzy).

**Jinými slovy: nejde bezpečně přidat "export jednoho dítěte", dokud import neumí merge podle `childId` místo slepého přepisu.** Tohle byl v předchozí analýze bod s vysokou prioritou i bez tohoto požadavku — tenhle požadavek ho mění z doporučení na tvrdou podmínku.

### Řešení: explicitní obálka s discriminatorem

```ts
type ExportEnvelope =
  | { exportType: 'single-child'; exportVersion: 1; childId: string; data: SingleChildPayload }
  | { exportType: 'family';       exportVersion: 1;                  data: PlannerState }
```

`importJson` nejdřív přečte `exportType` a podle něj větví:

- **`single-child`** → merge: najdi dítě se stejným `childId` v aktuálním stavu a nahraď jen jeho `enrollments`/`customEntries`/per-dítě `sessionOverrides`. Ostatní děti, globální overrides, ostatní varianty zůstanou nedotčené. Pokud `childId` v cílovém stavu neexistuje (import na jiném zařízení/prohlížeči), přidej jako **nové** dítě — s potvrzením v UI ("Přidat Julii jako nové dítě do rodiny?"), ne tiše.
- **`family`** → dnešní chování (plný přepis), ale s varováním/diffem před potvrzením (viz `analyza-ztraty-dat.md`, bod 3.2). Tohle zůstává destruktivní operace, ale **vědomě**, ne omylem — přesně proto potřebuje vlastní `exportType`, aby ho appka nikdy nespletla s `single-child`.

## 3. Rozsah dat — Typ 1 (per dítě)

Pro vybrané `childId`:

| Pole | Filtr |
|---|---|
| `children` | jen vybrané dítě (1 záznam) |
| `schedules[].enrollments` | `childId === vybrané` |
| `schedules[].customEntries` | `childId === vybrané` |
| `overrides` (ActivityOverride) | jen ty, jejichž `activityId` se objevuje v enrollments vybraného dítěte — ne všechny globální overrides bez rozdílu (jinak export "jednoho dítěte" prozradí i úpravy cen/adres aktivit sourozenců, kterých se netýká) |
| `sessionOverrides` | globální (bez `childId`) pro `sessionId` použité vybraným dítětem **+** per-dítě záznamy pro vybrané dítě; per-dítě záznamy jiných dětí vynechat |
| `schoolYear`, `districtCode` | beze změny |

Otevřená otázka: který `NamedSchedule`? Doporučuju defaultně jen aktivní variantu (`activeScheduleId`) — export všech variant pro jedno dítě je řešitelné později, pokud bude potřeba.

## 4. Rozsah dat — Typ 2 (sdílený rodinný kalendář)

### JSON
V zásadě dnešní plný `PlannerState` (obsahuje už všechny děti) — potřebuje jen obálku `exportType: 'family'` z bodu 2, aby ho import nikdy nespletl s `single-child`.

### .ics — nový mód
Dnes appka pro "všechny děti najednou" generuje N samostatných `.ics` souborů (jeden `generateIcs()` na dítě, viz `ukladani-dat.md` sekce 3). Tenhle požadavek je jiný: **jeden** `.ics` obsahující `VEVENT` ze všech dětí zároveň. Dvě věci, které musí sedět:

- **UID musí být odvozené od `enrollment.id`/`customEntry.id`** (nezávislé UUID per záznam), **nikdy od `activityId + sessionGroupId`**. Víc dětí běžně sdílí stejnou katalogovou aktivitu — v `rozvrh-julie.json` mají Julie i Jonda oba `ddm-programovani`/`ddm-programovani-g`. Odvození UID jen z aktivity by dvěma různým dětem přiřadilo **stejné** UID → kolize, jedna z událostí v cílové appce zmizí nebo přepíše druhou.
- **Rozlišení dítěte v textu události**, protože jde o jeden kalendář: prefix jména v `SUMMARY` (např. "Julie: Atletika — přípravka") + `CATEGORIES:<jméno dítěte>` jako doplněk pro appky, co podle kategorie umí filtrovat. Prefix v `SUMMARY` je nutný fallback, protože Apple/Google Calendar spolehlivé barvení podle `CATEGORIES` v rámci jednoho kalendáře nemají.

Tohle je zároveň přesně ten soubor, který sedí na `webcal://` subscription z naší dřívější diskuze o sdíleném kalendáři — jeden feed, jedna URL, celá rodina najednou, bez nutnosti účtu.

## 5. UI — výběr rozsahu musí být explicitní

Volba "Julie" / "Jonda" / ... / "Celá rodina" musí být **explicitní tlačítko/volba v exportním dialogu** — nesmí se odvozovat z `activeChildId`. Připomínka z minula: `activeChildId` se dnes vůbec neukládá a po refreshi se resetuje na první dítě — přesně tohle tichý odvození způsobilo, že oba tvoje soubory vyšly identické, i když jsi před uložením přepínal na jinou kartu.

## 6. Otevřené otázky

- Má sdílený rodinný `.ics` (Typ 2) obsahovat i `CustomEntry`, nebo jen katalogové `Enrollment`? Navrhuju obojí, stejná logika prefixu jména.
- Má JSON `family` export dostat i verzi/timestamp z `analyza-ztraty-dat.md` bodu 2.1 rovnou v rámci týhle změny, nebo to řešit odděleně? Doporučuju rovnou — jinak `single-child` merge (bod 2) nemá jak poznat, jestli je importovaný fragment novější než to, co už v cílovém dítěti je.
- Co když se `single-child` soubor importuje do appky, kde `activityId`/`sessionGroupId` z katalogu už neexistují (starý export, mezitím se katalog aktivit změnil)? Migrace v `state/io.ts` dnes řeší jen `schemaVersion`, ne zmizelé katalogové položky — stojí za zvážení, jestli merge takové záznamy zahodí s varováním, nebo je ponechá jako "osiřelé".
