# Analýza: přepisování a mizení dat v Rozvrhni — root cause + návrh řešení

**Datum:** 2026-09-01
**Vstupy:** `ukladani-dat.md` (architektura), `rozvrh-julie.json`, `rozvrh-jonda.json`
**Symptom:** "stará a nová data se občas překrývaly, to co se v minulosti uložilo, se občas přepíše, zmizí, neuloží"
**Platí pro:** libovolný počet dětí v rodině (1 až N) — návrh níže je vůči N dětem invariantní.

---

## 0. Klíčový nález — důkaz z dodaných dat

Porovnal jsem `rozvrh-julie.json` a `rozvrh-jonda.json` pole po poli:

| Sekce | Julie soubor | Jonda soubor | Shoda |
|---|---|---|---|
| `children` | Julie + Jonda | Julie + Jonda | **identické** |
| `schedules[0].enrollments` | 15 záznamů, stejná ID | 15 záznamů, stejná ID | **identické** |
| `schedules[0].customEntries` | 7 záznamů, stejná ID | 7 záznamů, stejná ID | **identické** |
| `overrides` | 1 záznam | 1 záznam | **identické** |
| `sessionOverrides` | 9 záznamů | 9 záznamů | **identické** |
| `schoolYear`, `districtCode` | stejné | stejné | **identické** |

Oba soubory jsou **ten samý celorodinný export**, jen dvakrát pojmenovaný jinak. To přesně sedí s tím, co říká `ukladani-dat.md`: *"Uložení/JSON export je ale VŽDY celý stav najednou... Není možné exportovat/uložit „jen jedno dítě" do JSON."*

**Interpretace:** Pracoval jsi s těmito soubory jako s odděleným "kalendářem pro Julii" a "kalendářem pro Jondu" — ale datový model nic takového nezná. Pokud jsi v tomto workflow kdykoliv **importoval** starší z těch dvou souborů (v domnění, že tím obnovíš/upravíš jen odpovídající dítě), reálně jsi přepsal **celý stav** — včetně mezitím provedených změn u druhého dítěte, u variant rozvrhu, u overrides, u všeho. To je s vysokou pravděpodobností přímá příčina hlášeného "starší data přepsala novější".

Tohle není okrajový detail — je to nesoulad mezi mentálním modelem (per-dítě soubor) a datovým modelem (per-rodina blob), a ten nesoulad je systémový, ne jednorázová chyba obsluhy.

---

## 1. Root cause — kompletní rozbor mechanismů

### 1.1 Import/export = plný přepis, nikdy merge
`importJson` v `Toolbar.tsx` (dle popisu) nahrazuje celý `PlannerState` obsahem souboru. Žádný diff, žádné varování, žádná možnost "sluč jen tohle dítě". Scénář ztráty dat:

```
T1: export "julie.json" (obsahuje Julii i Jondu, protože jinak nejde)
T2: uživatel upraví Jondovi rozvrh
T3: uživatel z nějakého důvodu importuje "julie.json" (myslí si, že tím jen "obnoví Julii")
    → CELÝ stav se vrátí na T1, Jondova změna z T2 zmizela beze stopy
```

### 1.2 Autosave — jediný globální localStorage klíč, bez ochrany proti více tabům
`krouzky:autosave:v1` je jeden klíč, do kterého se při každé změně zapíše **celý** stav (subscribe na store). localStorage je sdílený napříč taby stejného originu, ale mezi taby není žádná koordinace (`storage` event se nikde nepoužívá, žádný `BroadcastChannel`). Pokud je appka otevřená ve dvou tabech (běžné: telefon + notebook, nebo dva rodiče, nebo omylem duplikovaný tab), poslední `setItem()` vyhrává — tiše a bez varování, i když ten "prohrávající" tab měl novější/jiná data pro jiné dítě.

### 1.3 `sessionOverrides` — nejednoznačná precedence global vs. per-dítě
V `rozvrh-julie.json` je `zs-vyuka-g-s3` v poli **dvakrát**:

```json
{ "sessionId": "zs-vyuka-g-s3", "weekday": 3, "startMinutes": 475, "endMinutes": 695 }
...
{ "sessionId": "zs-vyuka-g-s3", "childId": "child-1", "weekday": 3, "startMinutes": 475, "endMinutes": 750 }
```

Globální verze končí v 695 min, per-dítě verze pro Julii v 750 min — rozdíl 55 minut. `ukladani-dat.md` vysvětluje *proč* per-dítě override existuje (CHANGE-103, různé reálné rozvrhy stejné "aktivity" ZŠ Výuka), ale **nikde nespecifikuje precedenci**, když existují obě varianty současně pro stejné `sessionId`. Pokud je nalezení implementováno jako `sessionOverrides.find(o => o.sessionId === id)`, vyhraje ta, která je v poli **první** — tedy globální, ne specifičtější — bez ohledu na to, co je sémanticky správně. To je přesně profil bugu "data se občas překrývají": chování závisí na pořadí v poli, ne na úmyslu.

**Toto je nutné ověřit přímo v kódu** (resolver pro `sessionOverrides`, pravděpodobně v `packages/domain`) — nemám k němu přístup, jen ke schématu a datům.

### 1.4 Nekonzistentní generování ID
`child-1` je pevný literál, `child-55d12e79-a79c-4b6e-ba75-33cfd6be29ad` je UUID. To naznačuje, že první dítě dostává hardcodované/legacy ID (asi z onboardingu), zatímco další děti přes `addChild()` dostávají `crypto.randomUUID()`. Riziko: jakýkoliv budoucí merge dvou nezávislých stavů (dvou zařízení, dvou záloh) bude mít **kolizi na `child-1`**, pokud obě strany mají "první dítě" — a merge/import podle ID pak smíchá dvě různé děti dohromady jako jednu.

### 1.5 `activeChildId` jako efemérní stav vedle persistovaného
Není chyba sama o sobě, ale ukazuje nejasnou hranici "co je session state, co je data" — a taková nejasnost je živná půda pro budoucí bugy stejné rodiny (např. až přibude další efemérní pole, nemusí být zjevné, kam patří).

### 1.6 Migrace schémat nejsou destruktivní — ale interagují se full-replace importem
Samotné migrace (v1→v9) jsou podle popisu bezpečné (jen defaulty). Problém není v migraci, ale v tom, že **jakýkoliv** import staršího/jiného snapshotu — migrovaný nebo ne — nahradí aktuální stav celý. Migrace tedy není příčina, ale nezabrání důsledku.

---

## 2. Návrh změn datového modelu

### 2.1 Přidat revizi/timestamp na úroveň `PlannerState` i klíčových entit
```ts
PlannerState {
  ...
  revision: number          // monotónně rostoucí, inkrementovat při KAŽDÉ mutaci
  updatedAt: string         // ISO timestamp poslední změny
}
```
Bez tohohle nejde poznat, jestli je importovaný/konkurenční soubor starší nebo novější než aktuální stav — což je předpoklad pro cokoliv chytřejšího než "slepě přepsat".

### 2.2 Sjednotit generování ID — všude UUID
Zrušit speciální `child-1`. Všechny entity (children, schedules, enrollments, customEntries) vždy `crypto.randomUUID()`. Eliminuje kolize při budoucím mergi napříč zařízeními/zálohami — relevantní přesně proto, že počet dětí je 1..N a nejde predikovat, které "first child" ID se kdy potká s jiným.

### 2.3 Přepracovat `sessionOverrides` z pole na jednoznačně indexovanou strukturu
Místo plochého pole s implicitní (a nikde nevynucenou) precedencí:
```ts
sessionOverrides: {
  [sessionId: string]: {
    global?: SessionOverridePatch
    byChild?: { [childId: string]: SessionOverridePatch }
  }
}
```
Precedence je pak **strukturální, ne poziční** — kód nemůže "najít špatnou verzi první", protože žádné pořadí neexistuje. Zároveň schema-level zamezí duplicitám (dřív šlo mít v poli klidně 3× stejný `sessionId` bez chyby).

### 2.4 Zvážit přechod z `localStorage` na `IndexedDB` s normalizovaným úložištěm
`localStorage` vynucuje "jeden string, jeden zápis, celý blob" — to je přímo strukturální příčina bodu 1.2. IndexedDB umožňuje oddělené object stores (`children`, `enrollments`, `customEntries`, ...) a **částečné** zápisy/čtení. Roste to i s N — čím víc dětí a aktivit, tím dražší je při každé drobné změně sepisovat a parsovat celý JSON blob synchronně v `localStorage`.

---

## 3. Návrh změn v práci s daty (runtime/UX)

| # | Změna | Řeší konkrétně |
|---|---|---|
| 1 | Import = **merge podle `childId`**, ne plný replace. Importovaný soubor nahradí jen data dětí, které obsahuje; ostatní děti v aktuálním stavu zůstanou nedotčené. | přesně scénář z bodu 1.1 a z dodaných souborů |
| 2 | Před importem/přepsáním ukázat srovnání: "Tento soubor: N dětí, uloženo DD.MM. Aktuální stav: M dětí, uloženo DD.MM. Sloučit / Přepsat / Zrušit." (využívá `revision`/`updatedAt` z bodu 2.1) | uživatel dnes nemá šanci poznat, že import je destruktivní, dokud není pozdě |
| 3 | `storage` event listener (případně `BroadcastChannel`) mezi taby — při detekci změny v jiném tabu nabídnout reload/merge místo tichého přepsání | multi-tab race z bodu 1.2 |
| 4 | Automatické verzované zálohy (ring buffer posledních N autosave stavů, ne jen aktuální) | umožní zotavení i když se merge/varování něčím prokoukne |
| 5 | Pokud je per-dítě export/import skutečně žádaná funkce (ne jen omyl vzniklý z nepochopení modelu) — implementovat ho **doopravdy**: filtrovat `enrollments`/`customEntries`/`overrides` podle `childId` při exportu, a při importu takového "částečného" souboru mergovat jen dotčené dítě | tvůj aktuální workflow s `rozvrh-julie.json`/`rozvrh-jonda.json` naznačuje, že po tomhle sáháš přirozeně — dej tomu regulérní podobu místo manuálního přejmenovávání celorodinných exportů |

---

## 4. Prioritizace

| Priorita | Změna | Effort | Dopad |
|---|---|---|---|
| Vysoká | Ověřit a opravit precedenci `sessionOverrides` (1.3) | malý | zastaví "data se občas překrývají" u overrides |
| Vysoká | Import = merge podle `childId`, ne replace (3.1) | střední | zastaví "starší soubor smaže novější data" |
| Vysoká | `revision`/`updatedAt` + varování před přepsáním (2.1, 3.2) | malý–střední | dává uživateli šanci si všimnout konfliktu |
| Střední | `storage`/`BroadcastChannel` mezi taby (3.3) | malý | zastaví tichý multi-tab přepis |
| Střední | Sjednocení ID na UUID (2.2) | malý | prevence budoucích kolizí při N dětech |
| Nižší | Restrukturalizace `sessionOverrides` na indexovanou strukturu (2.3) | střední | odstraní třídu bugů natrvalo, ne jen jeden případ |
| Nižší, dlouhodobě | Migrace localStorage → IndexedDB (2.4) | velký | škáluje s N dětí, umožní částečné zápisy |
| Volitelné | Skutečný per-dítě export/import (3.5) | střední | pokud je to reálně chtěná funkce, ne jen omyl |

---

## 5. Otevřené otázky k ověření v kódu

- Jak přesně `sessionOverrides` resolver vybírá mezi global a per-child záznamem pro stejný `sessionId`? (klíčové pro 1.3)
- Existuje v `plannerStore.ts` u `importJson` nějaká validace/konfirmace před přepsáním stavu, nebo je to přímé `setState()`?
- Generuje `addChild()` opravdu `crypto.randomUUID()`, a je `child-1` skutečně hardcode z onboardingu, nebo vznikl jinak?
- Má autosave nějaký debounce, nebo zapisuje synchronně na každou mutaci? (ovlivňuje závažnost multi-tab race z 1.2)

---

## 6. Vztah k dřívější diskuzi o sdílení kalendáře

Tohle je stejný strukturální limit, na který jsme narazili u webcal/CalDAV diskuze: appka nemá backend, takže "sdílení mezi zařízeními" vždy povede přes manuální export/import, a manuální export/import bez merge logiky je z principu náchylný na přesně tenhle typ konfliktu. Návrhy v sekci 3 (merge podle `childId`, revize, varování) tenhle risk **zmírní** v rámci současné architektury bez backendu, ale úplně ho neodstraní — dvě zařízení editující nezávisle na sobě bez společného zdroje pravdy budou vždy potřebovat nějaké rozhodnutí "čí verze platí". Skutečné odstranění by vyžadovalo tenký cloud sync backend (i jen per-entity last-write-wins s timestampy by byl obrovský posun oproti dnešnímu per-blob přepisu).
