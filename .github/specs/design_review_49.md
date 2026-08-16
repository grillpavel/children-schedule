# Design Review 49 — Autosave stavu do prohlížeče (localStorage)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-50 (autosave `PlannerState` do `localStorage` s obnovou po připojení a verzovanou migrací; odstranění nyní zbytečného `beforeunload` varování — app `@krouzky/web` + úpravy testů T-151 + nový T-159)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** BL-030 / analýzy 44a/b: „Rozvrh existuje jen v tomto okně" + manuální Uložit byl označen za největší UX hřích. Uživatelé očekávají autosave. Reload/zavření okna dosud ztratily celý rozvrh.

## 0. SOTA analysis
- **0.1 Problem.** Stav žil jen v paměti okna (Zustand). Refresh nebo zavření = ztráta dat; jedinou pojistkou bylo `beforeunload` varování a manuální export do souboru.
- **0.2 Approach.** App-vrstvá perzistence do `localStorage` (klíč `krouzky:autosave:v1`); doména zůstává čistá. Serializace/parse přes existující `serializePlannerState`/`parsePlannerState` (parse řeší migraci schématu — stejná cesta jako import souboru, viz T-154). Obnova po připojení novou store akcí `hydrate` (nastaví stav bez zápisu do historie, aby undo nesmazal obnovená data). Ukládání přes `usePlannerStore.subscribe` (ne efekt nad `state`) — subscribe se registruje až po obnově, takže výchozí mount-render obnovu nepřepíše. `beforeunload` varování odstraněno (data se už neztrácejí); pruh v liště přeznačen na „Ukládá se do prohlížeče; Uložit vytvoří záložní soubor.". Indikátor „Uloženo/Neuloženo" zůstává jako stav exportu do souboru.

## 1. Requirements
- **FR-1** Změny rozvrhu se automaticky ukládají do `localStorage`; po reloadu se stav obnoví.
- **FR-2** Obnova nezaloží položku do historie (první undo nesmaže obnovená data).
- **FR-3** Autosave používá verzovanou migraci (`parsePlannerState`); poškozený/nedostupný `localStorage` je best-effort (neshodí aplikaci).
- **FR-4** `beforeunload` varování odstraněno; pomocný text lišty odráží autosave.

## 2. Acceptance criteria
- **AC-1** (FR-1) Nový **T-159**: přidání kroužku → `page.reload()` → „Přidáno" je stále 1 (desktop i mobil).
- **AC-2** (FR-4) **T-151** zúžen na indikátor „Neuloženo" (bez `beforeunload`).
- **AC-3** (FR-3) Round-trip a migrace beze změny: T-152/T-153/T-154 zelené; T-000 (bez chyb v konzoli) zelený.
- **AC-4** Plná sada `--workers=1` zelená na desktop + mobile-small + tablet-portrait (234 passed); `apps/web` `tsc` čisté; vizuál beze změny; app HTTP 200.

## 3. Non-goals / notes
- Nemění se doména ani formát souboru; export do `.json`/`.ics` zůstává pro zálohu/sdílení.
- „Uloženo/Neuloženo" indikátor nadále znamená stav **exportu do souboru**, ne autosave. Případné sladění terminologie (např. „Zálohováno") je drobný follow-up.
- Cloud účty/sdílení a explicitní „reset/smazat autosave" nejsou součástí (BL-032 / budoucí).
