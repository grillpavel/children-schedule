# Design Review 23 — Dokonči datovou vrstvu uzávěrek/přihlášek

**Status:** DRAFT
**Change ID:** CHANGE-24 (dokončení BL-017: reálný `applicationUrl` z dat + šablona `applicationDeadline`; scope: data `@krouzky/domain/data` + app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `packages/domain/data`, `apps/web`)
**Trigger:** Po CHANGE-23 je schopnost uzávěrek/přihlášek hotová v kódu, ale datová vrstva ji neplní. Odkaz na přihlášku lze naplnit z ověřeného `sourceUrl`; termíny uzávěrek je třeba mít připravené jako šablonu k doplnění.

> Delta base: navazuje na `design_review_22.md` (CHANGE-23). Bez změny doménových schémat (pole už existují).

## 0. SOTA analysis

### 0.1 Problem

1. `applicationUrl` a `applicationDeadline` nebyly plněny z datové sady (BL-017).
2. Uzávěrky nemají ověřený zdroj — je třeba je připravit jako doplnitelnou šablonu, ne vymýšlet.

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Odkaz na přihlášku (C8-D5) | Adaptér naplní `applicationUrl` z `meta.applicationUrl ?? meta.sourceUrl` (reálná stránka kroužku). | Nechat `applicationUrl` prázdné. |
| Uzávěrky (BL-017) | Do `NsActivityMeta` přidána volitelná pole `applicationUrl?`/`applicationDeadline?` jako **šablona** k doplnění ověřenými hodnotami; dokud prázdné, zůstává `undefined`. | Doplnit odhadnuté termíny (porušení „nikdy neodhadovat“). |

## 1. Requirements

- **FR-1 [data/app]** Adaptér `novestraseci` MUST naplnit `applicationUrl` z `meta.applicationUrl ?? meta.sourceUrl` a MUST mapovat `applicationDeadline` z META (undefined, dokud nedoplněno). `NsActivityMeta` MUST mít volitelná pole `applicationUrl?`/`applicationDeadline?` jako šablonu.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright: `Přihlásit se` v detailu míří na reálnou stránku kroužku (`applicationUrl` = `sourceUrl`); typecheck domény i webu je čistý.

Globální gate: `packages/domain` i `apps/web` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Reálné termíny uzávěrek se nevymýšlejí; šablona `applicationDeadline` je připravena k doplnění (zbytek **BL-017**, nyní čistě datový úkol).
- Datová/adaptérová změna; doménová logika beze změny, bez bumpu verze.
