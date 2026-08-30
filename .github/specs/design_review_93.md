# Design Review 93 — iOS export .ics selhává, mechanismus stažení místo obsahu

**Status:** IMPLEMENTED
**Change ID:** CHANGE-100 (app `@krouzky/web` only, engine beze změny)
**Date:** 2026-08-30
**Repo:** monorepo `Children_schedule` (`apps/web`, `test/`)
**Trigger:** uživatel nahlásil, že import kalendáře (`.ics`) na iPhonu nefunguje, zatímco na Macu
se stejný export dá naimportovat do Kalendáře bez problémů. Požádal o testy pro všechny varianty
stažení kalendáře.

## 0. SOTA analýza

### 0.1 Problém

`.ics` obsah samotný je RFC 5545 validní a dlouhodobě testovaný (T-600–T-610: CRLF, zalomení na
75 oktetů, escapování, `VTIMEZONE`, `UID`/`SEQUENCE` stabilita, `RRULE`/`WKST`, víc-dětský export)
— stejný soubor funguje na macOS Calendar, což vylučuje chybu v OBSAHU. Skutečná příčina je
MECHANISMUS stažení: `download()` v `apps/web/src/lib/exportClient.ts` vytváří `Blob` → `blob:`
URL → skrytý `<a download>` element → `.click()`. Toto je dlouhodobě známý, nespolehlivý vzorec
na iOS Safari — `<a download>` u `blob:` URL na iOS buď otevře syrový text jako webovou stránku,
nebo se nestane nic; nikdy nevyvolá nativní „Přidat do kalendáře" (EventKit). Na Macu (Safari i
Chrome) `<a download>` u `blob:` URL funguje spolehlivě a stažený soubor si systém asociuje s
Kalendář.app.

### 0.2 Přístup

**Fix**: pro `mime` začínající `text/calendar` NA iOS zařízení (`isIosDevice()`) se místo
blob+`<a download>` použije přímá navigace na `data:` URI se stejným MIME typem
(`window.location.href = 'data:text/calendar;charset=utf-8,<urlencoded obsah>'`). Toto je
zdokumentovaný, běžně používaný vzorec přesně pro tento účel — iOS Safari při navigaci na
`text/calendar` MIME (ať už `data:` nebo `http:`) vyvolá nativní EventKit sheet „Přidat do
kalendáře", aniž by opustil aktuální stránku. Ostatní exporty (JSON, PNG) i `.ics` na
ne-iOS zařízeních zůstávají beze změny (blob+`<a download>`).

**Detekce iOS** (`isIosDevice()`): `navigator.userAgent` obsahuje `iPad|iPhone|iPod`, NEBO
`navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1` (iPadOS 13+ se hlásí jako
Mac, ale má dotykový displej — skutečný Mac dotyk nemá).

**Zamítnutá alternativa**: detekovat "mobil" obecně přes `viewport`/`isMobile` — zamítnuto,
problém je specifický pro iOS Safari (WebKit), ne pro malou obrazovku; Android Chrome zvládá
blob+`<a download>` bez problémů i na mobilu.

### 0.3 Omezení testovatelnosti (důležité pro pochopení testů níže)

Skutečnou navigaci na `data:` URI NELZE ověřit v Chromiu, na kterém běží Playwright — Chrome
z bezpečnostních důvodů blokuje skriptem vyvolanou navigaci nejvyššího rámce na `data:` URI, bez
ohledu na to, jaký `User-Agent` prohlížeč hlásí (ověřeno empiricky: kliknutí na exportní tlačítko
se spoofnutým iOS User-Agentem v Chromiu jen visí na „waiting for scheduled navigations to
finish", URL se nezmění, žádný `download` event nepřijde). Testy proto neověřují SKUTEČNOU
navigaci (to vyžaduje reálné WebKit/iOS zařízení), ale VLASTNÍ ROZHODOVACÍ LOGIKU appky — zda se
při daném `User-Agent`u/`platform`/`maxTouchPoints` vůbec zavolá `URL.createObjectURL` (blob
cesta), nebo ne.

## 1. Requirements

- **FR-1**: Export `.ics` na zařízení s iOS User-Agentem (iPhone/iPod/iPad) NEVOLÁ
  `URL.createObjectURL` — jde cestou `data:` URI.
- **FR-2**: Export `.ics` na zařízení hlásícím se jako Mac (`MacIntel`), ale s
  `navigator.maxTouchPoints > 1` (iPadOS 13+), je detekován stejně jako iPhone (FR-1).
- **FR-3**: Export `.ics` na běžném desktopu/Androidu/Macu bez dotyku zůstává beze změny —
  `URL.createObjectURL` + `<a download>` + `download` event.
- **FR-4**: Export JSON (`downloadStateJson`) a PNG (`downloadPng`) zůstávají zcela beze změny
  (fix je scoped jen na `mime.startsWith('text/calendar')`).

## 2. Acceptance criteria

- **AC-1** (FR-1): T-611 (`ics.spec.ts`) — nový `browser.newContext({userAgent: <iPhone UA>})`,
  spy na `URL.createObjectURL`, export `.ics` → `__blobUrlCalls === 0`. Zelené.
- **AC-2** (FR-2): T-612 — `browser.newContext({userAgent: <Mac UA>})` + přepsané
  `navigator.maxTouchPoints` na 5, stejný spy → `__blobUrlCalls === 0`. Zelené.
- **AC-3** (FR-3): T-613 — výchozí (ne-iOS) kontext, export `.ics` → `__blobUrlCalls > 0` A
  `page.waitForEvent('download')` se skutečně vyřeší (regrese proti existujícímu chování). Zelené.
- **AC-4** (regrese): existující T-600–T-610 (obsah `.ics`, víc-dětský export) zůstávají zelené
  beze změny — fix se týká jen delivery mechanismu, ne generovaného obsahu.
- **AC-5**: `tsc --noEmit` čisté (web), domain vitest 135/135 (engine nedotčen), plná 6profilová
  E2E sada = 740+ passed / 0 failed (T-611–613 běží jen na profilu `desktop`, ostatní 5×3 nových
  testů korektně `skipped`).

## 3. Non-goals / notes

- Skutečné ověření na reálném iPhonu/iPadu (že se opravdu objeví nativní „Přidat do kalendáře")
  NENÍ součástí této změny — vyžaduje fyzické zařízení nebo BrowserStack/Sauce Labs účet, mimo
  rozsah tohoto repozitáře. Pokud se po nasazení ukáže, že i `data:` URI přístup na iOS nefunguje
  (např. kvůli velikosti obsahu přesahující limit `data:` URI, nebo verzní odlišnosti iOS Safari),
  je potřeba nový nález + spec.
- `data:` URI má v některých prohlížečích délkový limit (obvykle nízké jednotky MB) — u typického
  rozvrhu (desítky událostí) je výsledný `.ics` řádově kilobajty, daleko pod limitem; pokud by
  katalog v budoucnu narostl na stovky událostí na kalendář, může být potřeba ověřit.
