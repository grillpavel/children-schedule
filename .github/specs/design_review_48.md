# Design Review 48 — Mobilní lišta: akce (Kalendář/Otevřít/Uložit/export) do jednoho menu

**Status:** IMPLEMENTED
**Change ID:** CHANGE-49 (na mobilu (<900 px) sloučit Otevřít/Uložit/Kalendář a export do jednoho menu „Další ▾"; desktop beze změny — app `@krouzky/web` + úpravy testů T-101/T-150/T-152/T-154 + nový T-158)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** BL-031 poslední kus. Po CHANGE-46/47 zůstávala mobilní lišta stále přeplněná: pole Kalendář, Otevřít, Uložit a „Další ▾" se lámaly do víc řádků. Uživatel odsouhlasil přesun do jednoho mobilního menu.

## 0. SOTA analysis
- **0.1 Problem.** Na 360 px lišta stále obsahuje pole „Kalendář" (název), tlačítka Otevřít a Uložit a menu „Další ▾" — to je několik řádků nad obsahem. Na desktopu je toto rozložení správné (T-150: Uložit/Otevřít primárně, export pod menu).
- **0.2 Approach.** Na desktopu zachovat současné rozložení (`hidden desk:flex` wrapper kolem Otevřít/Uložit/„Další ▾"; pole Kalendář `hidden desk:flex`). Na mobilu (`desk:hidden`) nahradit tyto prvky jediným menu „Další ▾", které obsahuje: pole „Název kalendáře", Otevřít, Uložit a všechny exporty (sdílené `exportItems` s desktopovým menu). Undo/redo a stav „Uloženo/Neuloženo" zůstávají na mobilu viditelné. Mobilní dropdown má `z-50` (nad detail sheetem `z-40`), jinak by sheet zachytával kliknutí. Mobilní menu má stejný přístupný název „Další ▾" jako desktopové → ICS testy fungují na obou profilech beze změny.

## 1. Requirements
- **FR-1** Na mobilu (<900 px) se v liště nezobrazují přímo Otevřít, Uložit ani pole Kalendář; jsou v menu „Další ▾". Na desktopu beze změny (přímo v liště).
- **FR-2** Mobilní menu „Další ▾" obsahuje: Název kalendáře, Otevřít, Uložit, Barvy událostí a exporty (Kalendář .ics, všechny děti, PNG, Tisk, rozbalené).
- **FR-3** Undo/redo a stav uložení zůstávají na mobilu viditelné.
- **FR-4** Export přes „Další ▾" funguje shodně na desktopu i mobilu (stejný přístupný název i položky).

## 2. Acceptance criteria
- **AC-1** (FR-1/2) Nový **T-158** (kompaktní profily): v zavřené liště nejsou Uložit ani pole názvu; po kliknutí na „Další ▾" jsou v menu Uložit, Otevřít, Název kalendáře i „Kalendář (.ics)".
- **AC-2** (FR-1) **T-150** zúžen na desktop (`test.skip` na compact) — struktura „primárně Uložit/Otevřít, export v menu" platí pro desktopovou lištu.
- **AC-3** (FR-2/4) **T-101** (Název kalendáře), **T-152/T-154** (Uložit přes `saveAndRead`) a **ics** T-600+ (přes „Další ▾") zelené na desktopu i mobilu; `saveAndRead` a T-101 na compactu otevřou menu.
- **AC-4** Plná sada `--workers=1` zelená na desktop + mobile-small + tablet-portrait (231 passed); `apps/web` `tsc` čisté; mobilní `toolbar-*` baseline přegenerovány; app HTTP 200.

## 3. Non-goals / notes
- Desktop rozložení lišty beze změny.
- Nemění se logika ukládání/exportu ani doména — jen umístění ovládání a `z-index` mobilního menu.
- Tímto je BL-031 (touch cíle 44 px + 320 px + microcopy + mobilní menu) uzavřen. Další mobilní práce = planner-first IA (BL-029) a autosave (BL-030).
