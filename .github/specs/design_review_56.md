# Design Review 56 — Skutečná cena bez přepočtu, detail kroužku bez fixního souhrnu, oprava ikony hledání

**Status:** IMPLEMENTED
**Change ID:** CHANGE-57 (app `@krouzky/web`: cena kroužku se všude zobrazuje v reálně zadané částce a
období bez přepočtu na měsíc; detail vybraného kroužku/vlastní události už neukazuje připnutý týdenní
souhrn nad sebou; ikona lupy v poli hledání katalogu se opravila, aby nepřekrývala text)
**Date:** 2026-08-18
**Repo:** monorepo `Children_schedule` (apps/web + test)
**Trigger:** čtyři konkrétní chyby nahlášené uživatelem přímo z používání aplikace.

## 0. SOTA analysis

- **0.1 Problem.**
  1. **Přepočet ceny.** `DetailsPanel` (`SelectedActivity`, `CustomEntryDetail`, `PinnedSummary`) i
     `CatalogPanel` (karta kroužku) používaly lokální `toMonthlyCzk(amount, period)` a zobrazovaly
     **odhadnutý** přepočet na měsíc (`amount/12` pro rok, `amount/5` pro pololetí, `amount*4` pro lekci)
     jako primární číslo, se skutečnou zadanou částkou jen v závorce (nebo vůbec, u karet katalogu).
     To je přímo v rozporu s vlastním principem domény (`packages/domain`): ceny za různá období se nikdy
     neslévají do jednoho odhadu, součty se hlásí odděleně po období (`costByPeriod`). Uživatel to vnímal
     jako „přepočítávání cen u kroužků za měsíc" — správně, protože pole ukazovalo přepočet, ne realitu.
  2. **Vícenásobné termíny „mizí".** Živě odzkoušeno (Atletická školička, 3 skupiny): zapsání dítěte do
     dvou různých skupin téže aktivity přes „Varianty docházky" **funguje** a cena se nezdvojuje (opraveno
     už v CHANGE-56). Skutečná příčina vjemu „ztráty" je UX: `PinnedSummary` (týdenní souhrn) byl **vždy**
     připnutý nad detailem vybraného kroužku, takže po zapsání první skupiny primární CTA nahoře zkolabuje
     na „V rozvrhu"/„Odebrat" a uživatel nemusí sjet dolů k pořád funkčnímu seznamu „Varianty docházky" —
     řeší se stejnou opravou jako bod 4.
  3. **Ikona lupy přes text.** Vstupní pole hledání v katalogu mělo `pl-8.5` — Tailwind v3 nemá `8.5` v
     výchozí škále mezer (kroky jsou …,7,8,9,…, ne 8.5), takže třída **negenerovala žádné CSS**. Pole tak
     nemělo žádný levý padding a zadaný text i placeholder se vykresloval přímo pod ikonou lupy
     (`absolute left-2.5`, šířka `h-4`=16px → ikona sahá do ~26px zleva).
  4. **Fixní záhlaví nad detailem kroužku.** `DetailsPanel` vždy renderoval `PinnedSummary` (Obsazenost
     týdne / Souhrn týdne / Náklady na kroužky) ve `shrink-0` obalu **nad** `SelectedActivity`/
     `CustomEntryDetail`, bez ohledu na to, jestli je něco vybráno. Po kliknutí na kroužek se tak nad jeho
     vlastním detailem objevily celkové agregátní údaje za celý týden — matoucí a nesouvisející s tím, co
     uživatel právě otevřel.
- **0.2 Approach.**
  1. Odstraněna funkce `toMonthlyCzk` ze všech čtyř míst (`DetailsPanel` × 3, `CatalogPanel` × 1). Všude
     se nyní zobrazuje **přesně zadaná částka a období** (`{amount} Kč / {období}`, karta katalogu krátce
     `{amount} Kč/{zkratka období}`). `PinnedSummary`'s „Náklady na kroužky" nově vypisuje
     `view.summary.costByPeriod` jako seznam částek **po jednotlivých obdobích** (žádný blendovaný
     roční/měsíční odhad) — respektuje doménový princip „nikdy neslévat období".
  2. `DetailsPanel` nově podmíněně renderuje obsah: **je-li něco vybráno** (aktivita nebo vlastní
     událost), zobrazí se **jen** `SelectedActivity`/`CustomEntryDetail` — bez `PinnedSummary` a bez
     `ScheduleNotices`. **Není-li nic vybráno**, zobrazí se týdenní přehled (`PinnedSummary` +
     `ScheduleNotices`) jako dosud. Vlastní sticky hlavička uvnitř `SelectedActivity` (název, „← Zpět na
     souhrn", primární CTA) zůstala zachována — týká se výhradně vybraného kroužku, ne agregátních čísel,
     a proto neodporuje požadavku „toto okno nemá mít fixní záhlaví" (to mířilo na týdenní souhrn).
  3. Neplatná třída `pl-8.5` nahrazena `pl-9` (36px), což bezpečně uvolní místo za pravým okrajem ikony.
- **0.3 Bod 2 („vícenásobné termíny mizí") nevyžadoval žádnou samostatnou opravu kódu** — jde o důsledek
  bodu 4; po jeho opravě je „Varianty docházky" hned pod primárním CTA, bez nutnosti scrollovat pod
  týdenní souhrn.

## 1. Requirements

- **FR-1** Všude, kde aplikace zobrazuje cenu kroužku nebo vlastní události (detail kroužku, detail
  vlastní události, souhrn nákladů, karta katalogu), se zobrazuje skutečně zadaná částka a období — žádný
  přepočet mezi obdobími.
- **FR-2** `DetailsPanel` zobrazuje týdenní souhrn (Obsazenost týdne/Souhrn týdne/Náklady na kroužky)
  **pouze** když není vybraný žádný kroužek ani vlastní událost. Při výběru se zobrazí jen detail
  vybrané položky.
- **FR-3** Ikona lupy ve vyhledávacím poli katalogu nepřekrývá zadaný ani placeholder text.

## 2. Acceptance criteria

- **AC-1** (FR-1) `SelectedActivity`, `CustomEntryDetail`: cena ve tvaru `{částka} Kč / {období}`.
  `PinnedSummary`: „Náklady na kroužky" vypisuje `costByPeriod` po řádcích, jedno období = jeden řádek.
  `CatalogPanel` karta: `{částka} Kč/{zkratka období}`. Žádné z těchto míst už neobsahuje `toMonthlyCzk`.
- **AC-2** (FR-2) **T-148** (přepsán, `panel.spec.ts`): se zapsaným kroužkem a bez výběru jsou nadpisy
  „Obsazenost týdne"/„Souhrn týdne"/„Náklady" vidět; po výběru téhož kroužku zmizí; po `Escape` se vrátí.
  **T-308** (přepsán, `a11y.spec.ts`): stejné nadpisy se čtou v odzvoleném stavu, ne v detailu kroužku.
- **AC-3** (FR-3) Nový **T-128** (`catalog.spec.ts`): počítaný `padding-left` vstupního pole je >= pravý
  okraj ikony lupy relativně k poli (regresní test proti neplatné Tailwind třídě).
- **AC-4** Plná E2E `--workers=1` zelená na všech 6 profilech (vč. přegenerovaných baseline
  `sheet-glass-on/off` — obsah mobilního sheetu se po odstranění `PinnedSummary` z vybraného stavu vizuálně
  změnil); `vitest` (domain) i `tsc --noEmit` (domain + web) čisté.

## 3. Non-goals / notes

- Karta katalogu (`CatalogPanel`) byla opravena spolu s `DetailsPanel`, i když uživatel explicitně zmínil
  jen „okno" s detailem — stejný anti-pattern (přepočet ceny) by jinak zůstal nekonzistentně na jednom
  místě opravený a na druhém ne.
- `T-300`/`T-301` (axe) potřebovaly `page.mouse.move(0, 0)` před scanem — po odstranění `PinnedSummary`
  se `SelectedActivity` posunula výš a kurzor zanechaný posledním kliknutím (`enrollFirst`) skončil nad
  tlačítkem „Odebrat z rozvrhu" (`hover:bg-red-50` mění kontrast), ne kvůli skutečné barevné regresi.
