# Design Review 98 — spolehlivý export .ics na iOS bez ohledu na délku obsahu a počet kalendářů

**Status:** IMPLEMENTED
**Change ID:** CHANGE-105 (app-only, `@krouzky/web`; engine `@krouzky/domain` nedotčen)
**Date:** 2026-08-31
**Repo:** monorepo `Children_schedule` (`apps/web/src/lib/exportClient.ts`, `apps/web/src/components/Toolbar.tsx`, `test/specs/ics.spec.ts`, `test/docs/test-spec.md`)
**Trigger:** uživatel nahlásil, že export kalendáře (.ics) na jednom iPhonu funguje a na
druhém ne — identický kalendář, žádná reakce systému, žádná chybová hláška. Upřesnění:
šlo o export JEDNOHO aktivního kalendáře (tlačítko „Kalendář (.ics)“), pro dítě s hodně
kroužky (dlouhý obsah .ics).

## 0. SOTA analýza

### 0.1 Problém

CHANGE-100 (design_review_93.md) už jednou řešil export .ics na iOS — root cause tehdy
byl, že `<a download>` na `blob:` URL je na iOS Safari nespolehlivé, fix byl přímá
navigace (`window.location.href`) na `data:` URI se stejným MIME typem
(`text/calendar`), na kterou iOS Safari spolehlivě reaguje nabídkou „Přidat do
kalendáře“.

Tento fix ale má vlastní limit: `data:` URI nese CELÝ obsah zakódovaný přímo v samotné
adrese (`data:text/calendar,<percent-encoded obsah>`). Takto sestavená URL roste lineárně
s délkou .ics souboru — a u dítěte s hodně kroužky (víc aktivit × týdenní `RRULE` × plný
popis s adresou/telefonem/cenou u každé) může snadno dosáhnout desítek tisíc znaků. iOS
Safari má na délku URI při navigaci limit, který se **mezi verzemi kolísá** (nikde oficiálně
nedokumentovaný) — když je obsah nad tímto limitem, navigace tiše selže: žádná chyba,
žádná reakce, přesně jak uživatel popsal. Kratší kalendář (méně kroužků) zůstane pod
limitem a funguje; to vysvětluje „na jednom telefonu ano, na druhém ne“ i beze změny
telefonu — stačí novější/starší verze Safari s jiným prahem, nebo prostě jiné dítě s méně
aktivitami.

Vedlejší, nezávislé zjištění při analýze: `exportAllChildrenIcs` (export všech kalendářů
najednou) spouští export pro každé dítě přes `setTimeout(…, i*400)` (CHANGE-80, kvůli
prohlížečům blokujícím druhé a další stažení bez pauzy). Na iOS to ale znamená, že KAŽDÁ
navigace na `data:`/`blob:` URI běží mimo přímé „user gesture“ prvního kliknutí — iOS
Safari může (nezávisle na délce obsahu) druhou a další odloženou navigaci tiše zahodit.
Toto je oddělené riziko od právě zmíněného; fixujeme oboje v tomto CHANGE, protože obě
cesty vedou skrz stejný `download()`/`downloadIcs` mechanismus.

### 0.2 Přístup

**Zvoleno:** nahradit `data:` URI za `blob:` URL jako cíl navigace u jediného exportu.
`blob:` URL je vždy krátká, opaque reference na objekt (`blob:https://origin/uuid`) bez
ohledu na velikost obsahu — samotný obsah žije v paměti prohlížeče, ne v URL řetězci.
Navigace (`window.location.href = blobUrl`) na iOS Safari s MIME `text/calendar` funguje
stejně jako u `data:` URI (sniffing podle Content-Type téhož zdroje), ale bez rizika
limitu délky. Ověřeno diagnostickým skriptem v Chromiu: navigace na `blob:` URL s
`text/calendar` typem vyvolá `download` event bez opuštění stránky — stejné chování jako
Safari popisuje CHANGE-100 pro `data:` URI, jen bez délkového omezení.

**Zamítnuto:** zůstat u `data:` URI, jen zkrátit percent-encoding na base64 (kratší
o ~40–50 % pro text s diakritikou, ale pořád roste s obsahem — u opravdu velkého
kalendáře limit jen odsune, nezruší). Blob URL limit odstraňuje úplně, ne jen posouvá.

**Export více kalendářů najednou (`exportAllChildrenIcs`) — zvoleno:** na iOS místo
automatického `setTimeout`-staggered stažení zobrazit dialog se seznamem `<a href>`
odkazů (jeden na dítě, `blob:` URL bez `download` atributu) — uživatel klepne na každý
sám, takže KAŽDÝ klik je vlastní, čerstvé „user gesture“, spolehlivé bez ohledu na pořadí
nebo verzi iOS. Na ne-iOS beze změny (dál automatické sekvenční stažení).
**Zamítnuto:** zkusit doladit `setTimeout` odstup (kratší/delší) — bez ověřitelné iOS
gesto-perzistence by šlo jen o hádání; ruční odkazy fungují deterministicky vždy.

## 1. Requirements

- **FR-1**: Export jednoho aktivního kalendáře (`Kalendář (.ics)`) na iOS musí navigovat
  na `blob:` URL (ne `data:` URI), takže délka výsledné URL nezávisí na velikosti
  obsahu .ics.
- **FR-2**: Export více kalendářů najednou (`Kalendář — všechny děti (.ics)`) na iOS musí
  místo automatického stažení zobrazit dialog s jedním ručním odkazem na dítě; na ne-iOS
  zůstává beze změny (automatické sekvenční stažení).
- **FR-3**: Chování na ne-iOS zařízeních (blob + `<a download>`) se nesmí změnit.

## 2. Acceptance criteria

- **AC-1**: `test/specs/ics.spec.ts` T-611/T-612 (iOS/iPadOS User-Agent) — export nesmí
  vytvořit a kliknout na `<a download>` element (`HTMLAnchorElement.prototype.click`
  spy = 0 volání).
- **AC-2**: T-613 (skutečný Mac/desktop) — export dál používá `<a download>` (spy > 0).
- **AC-3**: T-614 (nové) — export více kalendářů na iOS otevře dialog
  (`role="dialog"`, název „Otevřít kalendáře“) se stejným počtem odkazů jako dětí,
  každý `href` začíná `blob:`; samotné otevření dialogu nic nestáhne; klik na odkaz
  vyvolá `download` event.
- **AC-4**: `tsc --noEmit` čisté (web), plná 6profilová E2E sada beze změny v počtu
  passed/skipped/failed oproti CHANGE-104 baseline (kromě nových T-614 testů).

## 3. Non-goals / notes

- Skutečné chování reálného iOS Safari (zda `blob:` URL navigace opravdu vyvolá nativní
  „Přidat do kalendáře“ na KAŽDÉ verzi iOS) nelze ověřit v Chromiu, na kterém běží
  Playwright — stejné omezení jako u CHANGE-100. Testy ověřují jen naši rozhodovací
  logiku (která cesta se spustí), ne skutečnou reakci systému.
- Neřešíme velikost/obsah generovaného .ics (ten je nezávisle validní, testováno
  T-600–T-610) — jde čistě o mechanismus doručení.
- Případný budoucí limit i na `blob:` URL (žádný takový není znám) by byl novým, ještě
  neobjeveným problémem — netrackujeme jako BL, protože není důvod ho očekávat.
