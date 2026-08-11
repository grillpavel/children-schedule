# Design Review 26 — Mobilní spodní sheet detailu

**Status:** DRAFT
**Change ID:** CHANGE-27 (BL-018/C8-F7: detail jako spodní sheet na mobilu; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** Changes 8 C8-F7: na mobilu je detail schovaný pod záložkou Info, takže rodič nevidí rozvrh a detail zároveň. Detail má být spodní sheet nad mřížkou.

> Delta base: navazuje na mobilní layout ze `design_review_9.md` (CHANGE-10). Bez změny doménového modelu.

## 0. SOTA analysis

### 0.1 Problem

1. Na mobilu se detail zobrazí jen na záložce Info přes celou plochu; nelze vidět rozvrh a detail najednou (C8-F7).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Sheet (C8-F7) | Při výběru na mobilu (mimo záložku Info) se detail zobrazí jako spodní sheet nad mřížkou se dvěma stavy (peek / rozbaleno) přepínanými úchytem. | Nechat detail jen na plnoobrazovkové záložce Info. |

## 1. Requirements

- **FR-1 [app]** Na mobilní šířce MUST být při aktivním výběru (kroužek/vlastní událost) a mimo záložku Info zobrazen detail jako spodní sheet nad mřížkou; úchyt MUST přepínat mezi peek a rozbaleným stavem.

## 2. Acceptance criteria

- **AC-1 → FR-1** Playwright (375 px): po výběru kroužku na záložce Rozvrh je vidět spodní sheet s detailem; klik na úchyt zvětší jeho výšku (peek → rozbaleno).

Globální gate: `apps/web` `tsc --noEmit` čisté; `packages/domain` beze změny, `vitest` zelené; `pnpm` v prostředí není na PATH.

## 3. Non-goals / notes

- Plynulé táhnutí (drag) mezi třemi snap pointy není součástí; jsou dva stavy přepínané úchytem.
- Na desktopu se chování nemění (detail zůstává třetím sloupcem).
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze.
