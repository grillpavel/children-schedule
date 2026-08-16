# Design Review 52 — Planner-first shell: Domů (týden-first) + bottom nav + onboarding (fáze 2c)

**Status:** IMPLEMENTED
**Change ID:** CHANGE-53 (mobilní shell: nová záložka „Domů" s týden-first souhrnem a doporučeními, spodní navigace Domů/Katalog/Rozvrh/Děti, neblokující onboarding — app `@krouzky/web` + testy T-215/T-216/T-217)
**Date:** 2026-08-16
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** BL-029, poslední bloky planner-first IA. Po personalizaci (CHANGE-51/52) chyběla domovská obrazovka, bottom nav dle vize a onboarding.

## 0. SOTA analysis
- **0.1 Problem.** Aplikace startovala rovnou v mřížce/katalogu; chyběl týden-first přehled, planner-first navigace a rychlý start pro nového uživatele.
- **0.2 Approach.** Spodní navigace (mobil) na 4 záložky **Domů / Katalog / Rozvrh / Děti** (výchozí Domů). Nová `HomeScreen` (jen mobil, `desk:hidden`; desktop ponechává tři sloupce): týden-first souhrn (`useScheduleView` → počty, volné dny, náklady, kolize), top-3 doporučení (`buildRecommendations`) a onboarding kartu. **Onboarding je neblokující karta** na Home (věk + zájmy + „Hotovo"), ne modal — modal by přebil všechny E2E i reálné použití; zavření se pamatuje v `localStorage`. Záložka „Info" přejmenována na „Děti"; „Katalog"/„Rozvrh" beze změny (zachovává E2E navigaci). Desktop je beze změny (bottom nav je `desk:hidden`).
- **Alternativy zamítnuty.** Modal onboarding (rozbil by testy i UX). Home na desktopu (tři sloupce už roli Home plní; zbytečné riziko).

## 1. Requirements
- **FR-1** Mobilní spodní navigace má 4 záložky Domů/Katalog/Rozvrh/Děti; výchozí je Domů.
- **FR-2** „Domů" (mobil) ukazuje týden-first souhrn (kroužky, volné dny, náklady Kč/měs, kolize) a top-3 doporučení s důvody; CTA přepínají na Katalog/Rozvrh.
- **FR-3** Onboarding: při prázdném rozvrhu a prvním spuštění se na Home zobrazí neblokující karta „Rychlé nastavení" (věk + zájmy) s „Hotovo" (uloží do `localStorage`, přepne na Katalog).
- **FR-4** Desktop beze změny (tři sloupce); „Katalog"/„Rozvrh" navigace zachována; „Info" → „Děti".

## 2. Acceptance criteria
- **AC-1** (FR-1) **T-215**: mobil ukazuje Domů/Katalog/Rozvrh/Děti a nadpis „Přehled" (výchozí Domů).
- **AC-2** (FR-2) **T-216**: Home má regiony „Tento týden" i „Doporučení"; „Procházet katalog" zobrazí katalog.
- **AC-3** (FR-3) **T-217**: karta „Rychlé nastavení" je vidět; „Hotovo, vybrat kroužky" ji odbyde a přepne na katalog.
- **AC-4** (FR-4) Plná E2E `--workers=1` zelená na desktop (90) i mobile-small (79 + Home testy); a11y T-300..310 zelené (Home má nadpisy/labely/kontrast); vizuál beze změny (žádný snímek nezabírá Home); `apps/web` `tsc` čisté; app HTTP 200.

## 3. Non-goals / notes
- „Děti" záložka zatím ukazuje `DetailsPanel` (souhrn + detail vybraného); správa více dětí je v liště (přepínač + „Přidat dítě"). Plná obrazovka správy dětí = pozdější refinement.
- Onboarding je záměrně minimální (věk + zájmy); dostupnost/rozpočet se ladí v Katalogu (CHANGE-52).
- Tímto jsou hotové všechny bloky BL-029 (doporučení, personalizace, Home/nav/onboarding).
