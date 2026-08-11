# Design Review 25 — Detekce změny zdroje u uživatelských úprav

**Status:** DRAFT
**Change ID:** CHANGE-26 (BL-018/C8-E3: podpis katalogu v override + varování, když se zdroj změnil; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** Changes 8 C8-E3: po aktualizaci katalogu si uživatelská úprava tiše ponechá starou hodnotu a tváří se dál platně. Chybí porovnání se zdrojem v době úpravy.

> Delta base: rozšiřuje `ActivityOverride` (CHANGE-4/16). Volitelná pole → bez migrace.

## 0. SOTA analysis

### 0.1 Problem

1. Override neuchovává, jaká byla katalogová hodnota v době úpravy → nelze poznat drift (C8-E3, C8-X2).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Detekce driftu (C8-E3) | Override nese `editedAt` + `baseSignature` (podpis názvu+ceny v době úpravy); čistá `overrideSourceChanged(activity, override)` porovná se současným katalogem. Store razítko doplní při každém zápisu. | Ukládat plný snímek všech polí (těžké, náchylné na slučování). |
| Náprava | Detail nabídne `Přijmout nový údaj z katalogu` (zruší override). | Automaticky přepsat úpravu bez souhlasu. |

## 1. Requirements

- **FR-1 [engine]** `ActivityOverride` MUST mít volitelné `editedAt` a `baseSignature`; `activitySignature(activity)` MUST být stabilní podpis názvu a ceny; `overrideSourceChanged(activity, override)` MUST vrátit `true` jen když `baseSignature` existuje a liší se od aktuálního podpisu. Čisté.
- **FR-2 [app]** Store MUST při zápisu override orazítkovat `editedAt` + `baseSignature` z katalogu a odstranit override bez reálného obsahu; detail MUST při driftu zobrazit varování s akcí `Přijmout nový údaj z katalogu`.

## 2. Acceptance criteria

- **AC-1 → FR-1** `packages/domain` `vitest` `test/override-drift.test.ts`: podpis stabilní; bez `baseSignature` → false; shodný → false; změněný katalog → true.
- **AC-2 → FR-2** Kód store razítkuje metadata a detail vykresluje varování při driftu (ověřeno doménovým testem logiky; za běhu je katalog statický, drift nastane po načtení staršího JSON proti novému katalogu).

Globální gate: `packages/domain` i `apps/web` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Engine feature → pending MINOR 0.3.0.
- Podpis pokrývá název a cenu (nejčastější drift); adresa/telefon z poskytovatele se mění zřídka a nejsou součástí podpisu.
- Automatické slučování změn zdroje s uživatelskou úpravou není cílem — nabízí se jen přijmout katalog.
