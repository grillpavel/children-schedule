# Design Review 28 — Sjednocený zlom rozvržení na 900 px

**Status:** DRAFT
**Change ID:** CHANGE-29 (vlna 2 z Changes 9: jednotný breakpoint mobil/desktop na 900 px; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-9.md` C9-L5/C9-X4: layout přepínal na `md` (768 px), ale mezi 768 a 900 px je sedmisloupcová mřížka nepoužitelná. Zlom má být 900 px.

> Delta base: navazuje na mobilní layout ze `design_review_9.md` (CHANGE-10) a sheet z CHANGE-27. Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Sloupcové rozvržení a spodní navigace se přepínaly na 768 px (`md`), zatímco Agenda/sheet na 767 px v JS — mezi 768–900 px vznikala nepoužitelná mřížka (C9-L5).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Jednotný zlom (C9-L5) | Vlastní Tailwind screen `desk: 900px`; layout, spodní navigace i JS media query (`max-width: 899.98px`) používají 900 px konzistentně. | Ponechat `md` (768) pro layout a 900 pro Agendu — nekonzistentní mezipásmo. |

## 1. Requirements

- **FR-1 [app]** Přepínání mobil ↔ desktop (viditelnost spodní navigace, sloupcové rozvržení, výchozí Agenda, mobilní sheet) MUST nastat na 900 px konzistentně.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: při šířce 880 px je viditelná spodní navigace a jeden panel; při 920 px je navigace skrytá a jsou vidět tři sloupce.

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Plný žebřík tierů (1200–1439 px info jako slide-over, tři sloupce až od 1440 px, uživatelsky nastavitelné šířky C9-L2) není součástí (tracked as **BL-019**).
- Sbalitelný levý panel na širokém displeji (C9-L4) není součástí této vlny (BL-019).
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
