# Design Review 11 — Otoč pravý panel na rozhodovací: detail před přidáním a poctivý souhrn

**Status:** DRAFT
**Change ID:** CHANGE-12 (vlna 1 z Changes 8: detail kroužku před přidáním s výběrem termínu a primárním CTA, prázdný stav souhrnu bez nul, poctivá cena se započtením položek bez ceny, revidované metriky souhrnu s definicemi, značka „upraveno vámi“; scope: app `@krouzky/web`)
**Date:** 2026-08-11
**Repo:** monorepo `Children_schedule` (touches `apps/web`)
**Trigger:** `.github/specs/krouzky-planner-changes-8.md` popisuje, že pravý panel je dnes spíš formulář a čtenářsky slabý souhrn: detail nejde přečíst před přidáním, cena se sčítá i s neznámými položkami, metriky jsou neurčité a prázdný stav ukazuje samé nuly.

> Delta base: supersedes `design_review_10.md` §0–§2 (CHANGE-11) v chování levého sloupce a pravého panelu. Bez změny doménového modelu ani `schemaVersion`.

## 0. SOTA analysis

### 0.1 Problem

1. Klik na kartu v katalogu kroužek rovnou přidá (CHANGE-11), takže rodič nemá čtecí detail k rozhodnutí a nemůže vybrat termín před přidáním (Changes 8 C8-S3, C8-X1).
2. Souhrn ukazuje cenu jako holý součet i tam, kde část položek cenu nemá — číslo je pak zavádějící (C8-B3, C8-X3).
3. Primární metriky souhrnu (`Volných všedních dnů`) jsou neurčité a nemají definici; chybí „obsazená odpoledne“ a „počet cest“ (C8-B1, C8-B2).
4. Prázdný stav souhrnu ukazuje `0 kroužků` a nulové údaje místo vedení dál (C8-A1, C8-X6).
5. Uživatelské úpravy se sice ukládají (CHANGE-4), ale nejsou v panelu vizuálně odlišené jako neověřené (C8-E2).

### 0.2 Approach

| Item | Chosen | Rejected alternative |
| --- | --- | --- |
| Detail před přidáním (C8-S3, C8-D2, C8-F3) | Klik na kartu v katalogu jen **vybere** kroužek a otevře čtecí detail; přidání je explicitní primární CTA `Přidat do rozvrhu` (u více variant s předvolenou první variantou), sekundární `Přihlásit se` když existuje odkaz. | Ponechat okamžité přidání klikem (CHANGE-11) — brání rozhodování a je nespolehlivé při prázdné mřížce. |
| Poctivá cena (C8-B3) | Souhrn nikdy neukáže holý součet: `X Kč/rok · N kroužků bez ceny` a odvozené `≈ Y Kč/měs` s uvedeným počtem měsíců sezony. | Holý součet podle období bez kontextu chybějících cen. |
| Revidované metriky (C8-B1, C8-B2) | Primární metriky `obsazená odpoledne z 5` a `počet cest týdně`, každá s definicí v tooltipu; hodiny týdně jako sekundární. | Nechat `Volných všedních dnů` bez definice jako hlavní metriku. |
| Prázdný stav souhrnu (C8-A1, C8-A2) | Bez grafů a nul: nadpis, věta, primární CTA a dva tipy; trvalá věta o dočasnosti dat. | Zobrazovat `0 kroužků` a nulové metriky. |
| Značka úprav (C8-E2) | Upravená pole nesou marker `upraveno vámi` a pro upravenou hodnotu se neukáže odznak `Ověřeno`. | Zobrazovat upravenou hodnotu jako ověřený fakt. |

## 1. Requirements

- **FR-1 [app]** Klik na kartu kroužku v katalogu MUST pouze vybrat kroužek a otevřít čtecí detail; MUST NOT ho sám přidat do rozvrhu.
- **FR-2 [app]** Detail kroužku MUST nabídnout výběr termínu (u více variant předvolenou první) a primární akci `Přidat do rozvrhu`; když je kroužek v rozvrhu, MUST místo toho nabídnout odebrání a změnu termínu. Když existuje odkaz (web/sourceUrl), MUST zobrazit sekundární `Přihlásit se`.
- **FR-3 [app]** Souhrn ceny MUST NOT být holý součet: MUST uvést počet kroužků bez ceny a odvozený měsíční ekvivalent s počtem měsíců.
- **FR-4 [app]** Souhrn MUST zobrazit jako primární metriky `obsazená odpoledne z 5` a `počet cest týdně`, každou s definiční nápovědou (`title`); hodiny týdně MUST být sekundární.
- **FR-5 [app]** Prázdný souhrn (0 kroužků) MUST zobrazit nadpis, větu, primární CTA a dva tipy, plus trvalou větu o dočasnosti dat, a MUST NOT ukazovat nulové metriky.
- **FR-6 [app]** Upravená pole v detailu MUST nést značku `upraveno vámi` a pro upravenou hodnotu MUST skrýt odznak `Ověřeno`.

## 2. Acceptance criteria

- **AC-1 → FR-1** Ruční/Playwright test: po kliknutí na kartu se otevře detail, ale nevznikne blok v mřížce ani sekce `V rozvrhu`.
- **AC-2 → FR-2** Ruční/Playwright test: detail má `Přidat do rozvrhu`, po kliknutí vznikne blok; u kroužku v rozvrhu je místo toho odebrání; při existenci odkazu je vidět `Přihlásit se`.
- **AC-3 → FR-3** Ruční test: se zapsaným kroužkem bez ceny souhrn ukazuje `… · N kroužků bez ceny` a `≈ Y Kč/měs`, nikdy jen holý součet.
- **AC-4 → FR-4** Ruční test: souhrn ukazuje `obsazená odpoledne z 5` a `počet cest týdně`; najetím na metriku se zobrazí definice.
- **AC-5 → FR-5** Ruční/Playwright test: při prázdném rozvrhu souhrn neobsahuje `0 kroužků` ani nulové metriky, ale CTA a tipy.
- **AC-6 → FR-6** Ruční test: po úpravě ceny/adresy se u pole zobrazí `upraveno vámi` a zmizí odznak `Ověřeno` pro danou hodnotu.

Globální gate: `apps/web` a `packages/domain` `tsc --noEmit` čisté; `packages/domain` `vitest` zelené; `pnpm` v tomto prostředí není na PATH, brány se spouští lokálními binárkami.

## 3. Non-goals / notes

- Uzávěrka přihlášek a odkaz na přihlášku jako pole katalogu (C8-D5, C8-B6) a blok `Uzávěrky` v souhrnu vyžadují nové pole modelu a ověřená data — mimo tuto app-only vlnu (tracked as **BL-017**).
- Pole sezony `sezona od/do` na úrovni aktivity (C8-D2) a poctivý přepočet `Kč/měsíc` podle skutečné délky sezony vyžadují engine + data; nyní se používá pevný předpoklad počtu měsíců (tracked as **BL-018**).
- Akce `Vyřešit` u konfliktu s návrhem alternativ (C8-B10), detekce změny zdroje u override (C8-E3) a mobilní spodní sheet detailu (C8-F7) zůstávají mimo tuto vlnu (tracked as **BL-018**).
- Změna nezasahuje engine `@krouzky/domain`; bez bumpu verze balíčku.
