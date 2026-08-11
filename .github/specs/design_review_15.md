# Design Review 15 — Poznámka rodiče ke kroužku (uživatelská vrstva)

**Status:** DRAFT
**Change ID:** CHANGE-16 (vlna 5 z Changes 8: volitelná `note` v `ActivityOverride` + editor poznámky v detailu; scope: engine `@krouzky/domain` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `packages/domain`, `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` C8-D8: rodič si potřebuje ke kroužku poznamenat vlastní kontext (např. „zeptat se na kroužkovné“), aniž by to kolidovalo s katalogem nebo se tvářilo jako ověřený údaj.

> Delta base: rozšiřuje `ActivityOverride` z CHANGE-4 (spec `design_review_3.md`) o čistě uživatelské pole. Bez migrace (pole je volitelné).

## 0. SOTA analysis

### 0.1 Problem

1. Overrides nesou jen přepisy katalogových údajů (název, adresa, cena, barva); chybí čistě uživatelská poznámka (C8-D8, C8-E4).
2. Bez perzistence v uloženém JSON by poznámka zmizela se zavřením okna.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Uložení poznámky (C8-D8/C8-E4) | Volitelné `note` ve stávajícím `ActivityOverride` — uživatelská vrstva vedle katalogu, součást uloženého stavu; přežije round-trip. | Nové samostatné úložiště poznámek mimo stav (další serializace, migrace). |
| Zadávání | Textarea v detailu, zápis přes stávající `setActivityOverride({ note })`; prázdná hodnota poznámku zruší. | Modální dialog pro jedno pole. |

## 1. Requirements

- **FR-1 [engine]** `activityOverrideSchema` MUST mít volitelné `note: string`; stav s poznámkou MUST přežít `serialize → parse` beze změny. Pole je volitelné → bez migrace/`schemaVersion` bumpu.
- **FR-2 [app]** Detail kroužku MUST nabídnout editovatelnou `Poznámku rodiče`, která se ukládá do `override.note`; prázdná hodnota poznámku MUST zrušit.

## 2. Acceptance criteria

- **AC-1 → FR-1** `packages/domain` `vitest` `test/state.test.ts`: override s `note` přežije round-trip.
- **AC-2 → FR-2** Playwright: zapsaná poznámka v detailu přežije zavření a opětovné otevření detailu.

Globální gate: `packages/domain` i `apps/web` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Engine feature → započítává se do **pending MINOR 0.3.0**; verze se bumpne až při vydání (dev-process §6).
- Poznámka je per-kroužek (`activityId`); poznámka na úrovni celého rozvrhu/varianty není součástí.
- Detekce změny zdroje u override (C8-E3) a mobilní sheet detailu (C8-F7) zůstávají ve **BL-018**.
