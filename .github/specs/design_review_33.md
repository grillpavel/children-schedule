# Design Review 33 — Kalendářová mřížka jen na klientu (hydratace)

**Status:** DRAFT
**Change ID:** CHANGE-34 (oprava hydratačního nesouladu v `ScheduleGrid`; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** E2E test **T-000** (`test/specs/smoke.spec.ts`, „načtení bez chyb v konzoli") padal na všech profilech s React chybou `Text content did not match` v `ScheduleGrid`: server vyrenderoval týden podle serverového data, klient podle svého (v testu zmrazeného) — hydratace narazila a zapsala chybu do konzole.

> Delta base: navazuje na kalendář z Changes 1/6. Bez změny doménového modelu `@krouzky/domain`.

## 0. SOTA analysis

### 0.1 Problem

`ScheduleGrid` odvozuje zobrazený týden z aktuálního data (`useState(() => new Date())`, `const today = new Date()`, `nowMinutes`). Next.js komponentu vyrenderuje i na serveru (SSR pass klientské komponenty), takže server použije svůj čas a klient svůj. Text štítku týdne i hlavičky dnů se liší → hydratační nesoulad → chyba v konzoli. V reálu se čas serveru a klienta obvykle shoduje, ale u hranice týdne (nebo se zmrazeným časem v testu) je rozdíl jistý; jde o latentní nedeterminovanost.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Odstranění hydratačního nesouladu | `ScheduleGrid` importovat přes `next/dynamic` s `ssr: false` — komponenta se vykreslí jen na klientu, žádný serverový render dat, žádný nesoulad. | `suppressHydrationWarning` na štítku (skryje jen varování, hlavičky dnů i `isToday` se pořád liší); ruční seed pevným datem + korekce v `useEffect` (bliká špatné datum). |

Aplikace je klientský nástroj bez SEO přínosu ze SSR mřížky; klientský render mřížky je bez nevýhod. Ostatní `new Date()` v `DetailsPanel` (uzávěrky) a ve store jsou buď v akcích (běhové), nebo u prázdného rozvrhu produkují shodný výstup, takže hydrataci netříští.

## 1. Requirements

- **FR-1 [app]** `ScheduleGrid` MUST být renderován jen na klientu (`next/dynamic`, `ssr: false`), aby SSR nevytvářel čas-závislý HTML, který se na klientu neshoduje.

## 2. Acceptance criteria

- **AC-1 → FR-1** E2E **T-000** (`smoke.spec.ts`) projde bez chyb v konzoli na profilu desktop (a dále). Ověřeno: `1 passed`.
- **AC-2** `apps/web` `tsc --noEmit` čisté.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` (81) zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Nepřepínáme celou stránku do klientského režimu — SSR ostatních částí (toolbar, katalog) zůstává.
- `DetailsPanel` uzávěrkové `new Date()` a store časová razítka nejsou součástí (u prázdného rozvrhu netříští hydrataci; v reálu se časy shodují).
- E2E běh v tomto prostředí je citlivý na sandbox (Chromium občas dostane `kill EPERM`/`SIGTRAP`); T-000 ověřen jednoprofilově mimo sandbox.
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
