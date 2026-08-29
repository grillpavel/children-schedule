# Design Review 82 — Vlna 3, FR-W3-4: sdílený odkaz na rozvrh (design_review_73.md)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-89 (app-only, `@krouzky/web`; žádná změna domény/schématu)
**Date:** 2026-08-29
**Trigger:** Pokračování BL-052 po CHANGE-88 (FR-W3-6 částečně).

## 0. SOTA analýza

- Appka nemá backend (žádná databáze/API) — audit sám navrhuje URL fragment jako
  „nejmenší variantu". Fragment (za `#`) se nikdy neposílá na server při navigaci ani
  v HTTP requestech — na rozdíl od query stringu (`?...`) tedy neunikne přes access log
  žádného serveru, což je důležité, protože rozvrh nese jména dětí a adresy míst konání.
- Existující `serializePlannerState`/`parsePlannerState` (`packages/domain/src/state/io.ts`)
  už řeší validaci a migraci `schemaVersion` — znovupoužito beze změny, žádný nový doménový
  kód nebyl potřeba.
- Komprese: `CompressionStream('gzip')`/`DecompressionStream('gzip')` jsou nativní Web Streams
  API (Chrome 80+/Firefox 113+/Safari 16.4+, bez závislosti) — zvoleny před knihovnou (např.
  `pako`/`lz-string`), ať se nepřidává nová runtime závislost pro jednu funkci. Fallback beze
  komprese (`raw.` prefix) pro starší prohlížeče — odkaz funguje všude, jen delší.

## 1. Requirements

- **FR-W3-4**: Nová položka menu „Sdílet odkaz na rozvrh" (`Toolbar.tsx`, vedle Kalendář
  .ics/Obrázek .png) zkopíruje do schránky URL s fragmentem `#share=<gz|raw>.<base64url>`
  nesoucím CELÝ `PlannerState` (stejný rozsah jako Uložit/.json, ne jen aktivní dítě).
- Otevření odkazu (`page.tsx`, mount): rozparsuje fragment, zeptá se `confirm()`, zda nahradit
  aktuální neuložený stav, při potvrzení `hydrate()`, jinak zůstane beze změny — v obou
  případech fragment odstraní z URL (`history.replaceState`), ať se stejný stav nenačte znovu
  při refreshi/tlačítku zpět.
- Sdílený odkaz má PŘEDNOST před autosave obnovou — otevření odkazu je explicitní akce (poslal
  ho někdo jiný), autosave běží jen když fragment chybí nebo uživatel odmítne nahrazení.

## 2. Acceptance criteria

- **AC-1 (T-231)**: Zápis kroužku → „Sdílet odkaz" → schránka nese `#share=`; otevření odkazu
  v ÚPLNĚ NOVÉ relaci prohlížeče (jiný `browser.newContext()`, žádný sdílený localStorage)
  ukáže stejný zápis po potvrzení dialogu; fragment po zpracování zmizí z URL.
- Funguje na všech 6 profilech (Chromium — clipboard API vyžaduje grantPermissions v testu).
- `tsc --noEmit` (web) čisté; plná E2E sada 0 failed.

## 3. Non-goals

- Nekomprimuje/nezkracuje odkaz přes externí zkracovač (žádný backend) — délka odkazu roste
  s velikostí rozvrhu; u typického rodinného rozvrhu (jednotky kroužků na dítě) po gzipu řádu
  jednotek KB, v praxi bezpečně pod limity moderních prohlížečů i messengerů.
- Nenabízí per-dítě dílčí sdílení (jen celý `PlannerState`, konzistentně s Uložit/.json) —
  mimo rozsah tohoto changu.

BL-052 nyní čítá 1 zbylou položku (FR-W3-1 drag&drop) — FR-W3-4 hotovo.
