# 07 — Architektura, stack a roadmapa

---

## 1. Architektonický princip

```
┌──────────────────────────────────────────────────┐
│  apps/web  (Next.js + React)                     │  ← tenká vrstva
│   UI komponenty, stav (Zustand), diff overlay     │
└───────────────┬──────────────────────────────────┘
                │ volá čisté funkce
┌───────────────▼──────────────────────────────────┐
│  packages/domain  (čistý TypeScript)             │  ← jádro
│   model · solver · konflikty · ICS · výjimky      │
│   ŽÁDNÝ import z React, next, fetch, LLM          │
└──────────────────────────────────────────────────┘
                ▲
┌───────────────┴──────────────────────────────────┐
│  packages/chat  (LLM adaptér)                    │  ← volitelná vrstva
│   tool definitions, mapování na domain funkce     │
└──────────────────────────────────────────────────┘
```

**Pravidlo, které se vynucuje lintem:** `packages/domain` nesmí importovat
nic kromě standardní knihovny a `zod`. Aplikace musí být kompletně
funkční i kdyby `packages/chat` neexistoval.

## 2. Stack

| Vrstva | Volba | Důvod |
|--------|-------|-------|
| Jazyk | TypeScript, `strict: true` | typová bezpečnost domény |
| Framework | Next.js (App Router) | jednoduchý deploy, edge funkce pro chat proxy |
| UI | React + Tailwind + shadcn/ui | rychlost, Copilot je zná dobře |
| Stav | Zustand + immer | potřebujeme undo/redo a diff, Context by nestačil |
| Validace | Zod | jedno schéma pro katalog, import JSON i tool cally |
| ICS | **vlastní generátor** | potřebujeme plnou kontrolu nad `EXDATE`/`VTIMEZONE`; knihovny to abstrahují nedostatečně |
| ICS validace v testech | `ical.js` | round-trip test |
| Datum/čas | `date-fns` + `@date-fns/tz` | bez Moment.js |
| Testy | Vitest + Playwright | unit pro doménu, e2e pro toky |
| Monorepo | pnpm workspaces + Turborepo | |

**Vědomě NEpoužíváme:**
- backend databázi (žádné ukládání dat)
- OR-Tools / externí solver (problém je malý)
- knihovnu na ICS jako jediný zdroj pravdy
- `localStorage` bez výslovného souhlasu uživatele (viz §5)

## 3. Struktura repozitáře

```
krouzky-planner/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── page.tsx
│       │   └── api/chat/route.ts        # stateless proxy (M1)
│       └── src/
│           ├── components/
│           │   ├── catalog/             # levý panel
│           │   ├── schedule/            # mřížka, bloky, duchové, diff overlay
│           │   ├── details/             # pravý panel
│           │   └── chat/                # spodní lišta
│           ├── store/                   # Zustand, undo/redo
│           └── hooks/
├── packages/
│   ├── domain/
│   │   ├── src/
│   │   │   ├── model/                   # typy + Zod schémata
│   │   │   ├── conflicts/               # detekce kolizí
│   │   │   ├── scheduler/               # solver
│   │   │   ├── ics/                     # generátor + EXDATE
│   │   │   ├── calendar/                # výjimky, computus, školní rok
│   │   │   └── travel/                  # odhad přesunu
│   │   ├── data/
│   │   │   ├── catalog-{city}.json
│   │   │   └── exceptions-{year}.json
│   │   └── test/
│   │       └── golden/                  # golden sety
│   └── chat/
│       └── src/tools/                   # definice nástrojů
├── tools/
│   └── catalog-ingest/                  # scraper, extraktor, validátor
├── docs/                                # tato specifikace
└── .github/
    └── copilot-instructions.md
```

## 4. Správa stavu

```ts
interface Store {
  state: PlannerState;            // aktuální
  pendingDiff: Diff | null;       // čeká na potvrzení
  history: PlannerState[];        // undo
  future: PlannerState[];         // redo

  // mutace jdou VŽDY přes tyto akce, nikdy přímo
  applyDiff(): void;
  discardDiff(): void;
  proposeDiff(d: Diff): void;
  undo(): void;
  redo(): void;
}
```

Katalog **není součástí store** — je to modul importovaný staticky
a immutable (`Object.freeze` v dev buildu).

## 5. Perzistence — přesná pravidla

Zadání zní „nic se neukládá". Interpretace pro implementaci:

| Co | Kde | Souhlas |
|----|-----|---------|
| Rozvrh, děti, omezení | pouze paměť JS | — |
| Export do souboru | `rozvrh-{dite}.json` na disku uživatele | uživatel klikl |
| `.ics` | soubor na disku uživatele | uživatel klikl |
| Stav v URL hashi | volitelná funkce „sdílet odkazem" | uživatel klikl, s upozorněním že odkaz obsahuje jméno |
| `sessionStorage` obnova po refreshi | **volitelně**, za explicitním přepínačem „nechat si rozvrh v tomto okně" | vypnuto výchozím nastavením |
| Cokoli na serveru | ❌ nikdy | — |

## 6. Milníky

### M0 — Použitelné jádro (bez LLM)
Cíl: rodič sestaví rozvrh ručně a vyexportuje korektní `.ics`.
- doménový model + Zod schémata
- katalog jednoho města (ručně nebo přes scraper) + validátor
- kalendář výjimek pro daný školní rok
- levý panel s filtry, týdenní mřížka, dvoufázový výběr skupiny, barvy
- **vlastní událost mimo katalog** (bez ní rozvrh neodpovídá realitě)
- **pojmenované varianty rozvrhu** (záložky, duplikace)
- detekce konfliktů (H1–H3, H5) napříč skupinami
- ICS export s `RRULE` + `EXDATE` + `VTIMEZONE`
- **tisk (A4 na šířku) a export do PNG**
- export/import stavu do JSON
- responzivní mobilní layout

**M0 je samo o sobě odevzdatelný produkt.** To je záměr.

### M1 — Chat
- tool calling, `propose_*` nástroje
- diff overlay + preview/apply
- edge proxy bez logování, anonymizace jmen
- eval sada pro NL → constraint

### M2 — Solver
- backtracking, měkká omezení, 3 varianty s diverzitou
- odhad přesunu (H4), `Infeasibility` s `relaxationHint`
- Web Worker

### M3 — Import katalogu
- LLM extrakce z PDF/URL s `confidence`
- revizní report a diff proti předchozí verzi

### M4 — Rodič a sourozenci
- rodičovská vrstva v exportu (odvoz/vyzvednutí)
- více dětí: sdílený rozpočet, sdílená doprava, souběh jako bonus

## 7. Rizika

| Riziko | Dopad | Mitigace |
|--------|-------|----------|
| Katalog zastará během pololetí | Vysoký — rodič dorazí na neexistující kroužek | Viditelné datum ověření, odkaz na zdroj, disclaimer, tlačítko „nahlásit chybu" |
| Ztráta rozvrhu při refreshi | Vysoký | `beforeunload`, trvalá výzva k uložení, volitelný sessionStorage |
| LLM si vymyslí kroužek | Vysoký, poškozuje důvěru | Tvrdé pravidlo v promptu + tool-only přístup ke katalogu + eval sada s pastmi |
| ICS se neimportuje do některého klienta | Vysoký | Manuální matice kompatibility před releasem + fallback režim rozbalených událostí |
| Špatné datumy jarních prázdnin | Střední | Data jen z MŠMT, povinné `source`, uživatel vidí a může editovat |
| Odhad přesunu je nepřesný | Střední | Vždy prezentovat jako odhad, nikdy jako fakt |
| Scraping naruší vztah s poskytovatelem | Střední | Rate limit, robots.txt, oslovit je předem |

## 8. Definition of Done pro každý milník

1. `pnpm typecheck` bez chyb (`strict`)
2. `pnpm test` — unit testy domény zelené
3. `pnpm test:golden` — golden sety projdou
4. Lint pravidlo „doména nemá zakázané importy" prochází
5. Manuální import `.ics` do Google + Apple + Outlook ověřen (pro M0 a dále)
6. Lighthouse na mobilu: Performance ≥ 85, Accessibility ≥ 95
