# Design Review 64 — Logistická kolize: krátký přesun mezi různými místy (FR-8)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-65 (**engine `@krouzky/domain`** — nová detekce, beze změny schématu/verze dat;
app `@krouzky/web` vizuální zapojení; implementace FR-8 z `design_review_58.md`)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (packages/domain + apps/web + test)
**Trigger:** dokončení celého seznamu z `design_review_58.md` (DRAFT CHANGE-59) po CHANGE-60..64 —
poslední a největší položka.

## 0. SOTA analysis

- **0.1 Problem.** Supersedes `design_review_58.md` §1 FR-8 (CHANGE-59, DRAFT) a upřesňuje `BL-034`.
  Konfliktní engine (`packages/domain/src/conflicts/detect.ts`) rozlišoval jen **dva** stavy: tvrdý
  časový překryv (`time_overlap`, 🔴) a měkké informace (`capacity_unknown`). Chyběl **třetí, střední**
  stav — 🟠 „stihnu přesun mezi dvěma různými místy?" — přesně formální podmínka z
  `analysis_redesign_specification_b.md` §2: `0 ≤ (S_B−E_A) < T_buffer ∧ L_A≠L_B`. Doménový modul
  `packages/domain/src/travel/index.ts` (haversine, `travelMinutes`) existoval už od dřívějška, ale
  `travelMinutes()` nebyla **nikde volaná** — jediné použití modulu byl plochý `DEFAULT_TRAVEL_BUFFER_MIN`
  konstantní odstup od konce vyučování (H3), ne odhad reálné vzdálenosti mezi dvěma kroužky.
- **0.2 Approach.**
  - Nová detekční funkce `detectTightTransfers` (H9) v `detect.ts`: pro každou dvojici sessions téhož
    dítěte od různých vlastníků, stejný den, bez časového překryvu (ten řeší H1), s mezerou `gap =
    later.start − earlier.end ≥ 0`: pokud jsou adresy **stejné** (souřadnice < 100 m, nebo shodná ulice/
    město) → 🟢 bez kolize. Pokud **obě** adresy mají souřadnice → `required = travelMinutes(.... 'car')`
    (skutečný haversine odhad, **konečně zapojuje dormant modul**), jinak plochý `transferBufferMinutes`
    (výchozí `DEFAULT_TRAVEL_BUFFER_MIN` = 10 min). Pokud `gap < required` → nový konflikt
    `kind: 'travel_infeasible'` (tento enum už existoval v `ConflictKind` jako nepoužitý placeholder),
    `severity: 'soft'`. Chybějící adresa u kterékoli strany → přeskočeno + zápis do `skippedChecks`
    (nikdy se neaproximuje, stejná filosofie jako H3).
  - App: `useScheduleView.ts` blok dostal `travelWarningMessage` (konkrétní text kolize); existující
    amber tečka „●" v `ScheduleGrid.tsx` (dřív jen obecný `title="Upozornění"` pro libovolný `soft`
    konflikt) teď nese **konkrétní odůvodnění** — přesně požadavek doc a) „vysvětlení proč", bez nutnosti
    vracet samostatnou sekci konfliktů do pravého sloupce (to bylo vědomě odstraněno CHANGE-44 na přání
    uživatele a zůstává tak).
  - Zamítnutá alternativa: perzistentní per-dítě nastavení „minimální čas na přesun" (nová schema/UI) —
    zamítnuto pro tento change kvůli rozsahu (další `schemaVersion` bump + settings UI týden po
    CHANGE-63). Použita jedna aplikační konstanta (`DEFAULT_TRAVEL_BUFFER_MIN`) — zapsáno jako `BL-038`
    pro budoucí per-dítě konfigurovatelnost.

## 1. Requirements

- **FR-8** Kolizní systém rozlišuje tři stavy — 🟢 bez kolize, 🟠 těsný přejezd (různá lokalita, mezera
  pod minimem), 🔴 přímá časová kolize — s viditelným odůvodněním (konkrétní zpráva u 🟠, beze změny
  🔴 zprávy).

## 2. Acceptance criteria

- **AC-1** Doménové testy (`conflicts.test.ts`, 5 nových): různá místa + mezera 5 min < rezerva 15 min →
  `travel_infeasible` (soft); stejné místo → bez kolize i s krátkou mezerou; dostatečná mezera i u
  různých míst → bez kolize; chybějící adresa → `skippedChecks` (`H9_tight_transfer`), ne aproximováno;
  přímý překryv zůstává `time_overlap` (hard), ne `travel_infeasible`.
- **AC-2** Nový **T-163** (`schedule.spec.ts`): dvě vlastní události na různých adresách s 5minutovou
  mezerou → amber tečka s tooltipem obsahujícím „přesun" viditelná v mřížce (grid i mobilní „Mřížka" tab).
- **AC-3** `vitest` (domain, 102 testů) zelené; `tsc --noEmit` (domain + web) čisté; plná E2E
  `--workers=1` zelená.

## 3. Non-goals / notes

- Per-dítě konfigurovatelný „minimální čas na přesun" a volba dopravního módu (pěšky/auto/MHD) — mimo
  scope, zapsáno jako nový **`BL-038`**.
- Vstupní bod „Najít volné místo"/„Smart Recommendations" (`BL-034`, `analysis_55_a.md`) zůstává
  neimplementovaný — tento change řeší jen samotnou detekci a vizuální odůvodnění, ne nový UI vstupní bod.
- Agenda (mobilní seznamový pohled) nezobrazuje amber tečku ani odůvodnění — jen mřížkový pohled má
  vizuální indikátor konfliktů; zůstává tak jako dřív (mimo scope tohoto change).
