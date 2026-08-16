Master Specifikace vývoje
Children Schedule Planner
(Personal Assistant for Weekly Activity Planning)
Verze: 2.0
Datum: 16. 8. 2026
Cíl: Transformovat aplikaci z „lepšího plánovače katalogu“ na osobního asistenta rodiče při plánování týdne dítěte.

1. Product Vision
Aplikace není primárně katalog kroužků.
Je to osobní asistent, který:

Zjistí, kdy má dítě reálně čas a co ho baví.
Sám vybere malý počet relevantních aktivit.
Ukáže rodiči, jak vypadá použitelný týden.
Okamžitě detekuje konflikty a pomáhá je řešit.
Umožní export a sdílení.

Katalog je prostředek. Rozvrh je produkt.
Hlavní mentální model:
textKopírovatCHILD → AVAILABILITY → PREFERENCES → MATCH ENGINE
                ↓
        RECOMMENDATIONS + CATALOG
                ↓
            SHORTLIST
                ↓
            SCHEDULE
                ↓
        CONFLICT ENGINE → FINAL WEEK
                ↓
          EXPORT / SHARE

2. UX Principles

Progressive disclosure – nikdy nezobrazovat vše najednou.
Explainable recommendations – vždy říct proč se aktivita hodí.
Schedule-first – po onboardingu uživatel vidí hodnotu okamžitě.
Deterministický engine – žádné magické AI skóre v V1.
Zero data loss – autosave.
Mobile-first, ale desktop má silný 2-panel layout.
Accessibility first (WCAG 2.2 AA).


3. Information Architecture
Desktop (≥ 1024 px)
2-panel layout (zachovat):
textKopírovat┌────────────────────┬──────────────────────────────┐
│ KATALOG            │ ROZVRH                       │
│ Search + Filters   │ Week Timeline                │
│ Activity cards     │                              │
└────────────────────┴──────────────────────────────┘
Minimální sticky header:
Jméno dítěte + přepínač dětí + ✓ Uloženo + Sdílet / Export
Mobile
Bottom Navigation (4 položky):

Domů – „Co mám tento týden?“ (schedule-first, ne dashboard statistik)
Katalog
Rozvrh
Děti


4. Responsive Behavior

Touch targets: minimálně 44–48 px
Mobile default pohled rozvrhu = Agenda
Desktop default = Week Timeline
Žádný zbytečný přepínač 3 dny / Den na mobilu (snižuje cognitive load)


5. Onboarding (30 sekund)
Kroky:

Jméno dítěte
Věk
Reálná dostupnost (ne jen „preferované dny“):

textKopírovatPondělí   15:00 ──────── 18:30
Úterý     16:00 ──────── 19:00
...

Zájmy (sport, zvířata, umění, jazyky…)
(Volitelně) Měsíční rozpočet

Po dokončení → okamžitě obrazovka:
„Pro Elišku jsme našli 8 vhodných aktivit“
Top 3 recommendations
[Zobrazit všechny]

6. Child Profiles
TypeScriptKopírovattype Child = {
  id: string
  name: string
  age: number
  color: string
  availability: {
    day: DayOfWeek
    startTime: string
    endTime: string
  }[]
  interests: string[]
  budgetMonthly?: number
}
Multi-child podpora je v V1.
Family conflict (rodič nemůže být na dvou místech) = V2.

7. Catalog & Activity Cards
Karty nesmí mít dominantní barevný pruh kategorie.
Správný pattern:
textKopírovat⚽  SPORT
Fotbal
Út · 16:00–17:00
✓ Bez konfliktu
✓ Vhodné pro 9 let
1 200 Kč / rok

[ Přidat do rozvrhu ]

Primární akce = textové tlačítko „Přidat do rozvrhu“ (ne holé „+“)
Na mobilu icon button ＋ musí mít accessibility label „Přidat do rozvrhu“
Barva kategorie pouze jako sekundární metadata


8. Search & Filters
Po onboardingu neříkat uživateli „filtry jsou zapnuté“.
Výsledky prostě zobrazit jako:
Doporučené pro Elišku
Až potom možnost „Zobrazit všechny aktivity“.
Chytré stavy filtrů:

Bez konfliktu
Odpovídá věku
V rozpočtu
Odpovídá zájmům
Ve volném čase

Na mobilu: Bottom Sheet s dynamickým počitadlem („Zobrazit 14 kroužků“).

9. Matching Engine (jádro produktu)
Dimenze matchování:

Interest fit
Age fit
Time fit (reálná dostupnost)
Conflict fit
Budget fit
Location fit (připraveno)

Nikdy nezobrazovat „Match score 87 %“.
Místo toho explainable reasons:
textKopírovatProč se to hodí
✓ pro 9 let
✓ odpovídá zájmu o sport
✓ čtvrtek je volný
✓ v rozpočtu

10. Activity Detail
Slide-over / bottom sheet s:

Všemi variantami termínů
Cenou
Lokací
Vysvětlením matchování
Tlačítkem „Přidat do rozvrhu“


11. Schedule
Desktop: Week Timeline (time-grid)
Mobile: Agenda (default)
textKopírovatPO
16:00  Fotbal
ÚT
17:30  Karate
ST
Volno
ČT
14:00  Výtvarka
Volitelné přepnutí na mřížku.
Žádné tečkované „volné sloty“ – stačí prázdný prostor nebo text „Volno“.

12. Conflict Engine
Algoritmus zůstává deterministický:
$$\exists a \in R : (S_n < E_a) \land (E_n > S_a)$$
UI:

Okamžité červené zvýraznění
Tooltip s konkrétní kolidující aktivitou
Nabídka alternativních termínů
Možnost „Přesto přidat“

Travel time (těsný přesun) = V2.

13. Budget Engine
Živý součet + progress bar:
textKopírovat1 750 / 2 000 Kč
Při překročení:
textKopírovat2 250 / 2 000 Kč
⚠ O 250 Kč nad limitem
Nikdy neblokovat přidání – rodič má kontrolu.

14. Variants (rozvrhové varianty)
Zachovat jako silný feature, ale až V1.5.
Příklad porovnání:






























Varianta AVarianta BAktivity33Cena1 850 Kč2 100 KčKonflikty00Volné odpoledne21

15. Multi-child
V1: přepínač dětí + barevné odlišení.
V2: Family conflict + parent availability + pickup/transport.

16. Persistence

Autosave do localStorage při každé změně
Indikátor: ✓ Uloženo (po změně krátce „Ukládám…“)
Žádný manuální „Uložit“ jako primární akce


17. Export

iCal (.ics) – prioritní
PDF přehled (týdenní mřížka + seznam + náklady)

Google Calendar API = později.

18. Sharing

V1: localStorage
V1.5: export
V2: cloud sharing s tokenem, oprávněními a konfliktním řešením


19. Data Model (finální)
TypeScriptKopírovattype Activity = {
  id: string
  name: string
  organizer: string
  category: Category
  description?: string
  ageRange?: { min?: number; max?: number }
  pricing?: Pricing | Pricing[]
  location?: Location
  variants: ActivityVariant[]
}

type ActivityVariant = {
  id: string
  day: DayOfWeek
  startTime: string
  endTime: string
  locationId?: string
  capacity?: number
  available?: boolean
}

type Pricing = {
  amount: number
  currency: "CZK" | "EUR"
  period: "lesson" | "month" | "quarter" | "semester" | "year" | "one_time"
}

20. State Architecture
Doporučeno: Zustand (nebo ekvivalent) s jasnou domain vrstvou
(Match Engine, Conflict Engine, Budget Engine oddělené od UI).

21. Accessibility

WCAG 2.2 AA
44–48 px targets
Focus states
Keyboard navigation
Screen reader
prefers-reduced-motion
Semantic HTML
Status nikdy pouze barvou


22. Performance

Filtry a detekce kolizí < 50 ms
UX performance důležitější než čistá čísla:
žádný perceptible delay
instantní feedback při přidání
žádné layout jumps



23. Testing
Unit

Conflict engine
Budget engine
Matching engine
Variant selection
Persistence + migrace

E2E

Onboarding → Child created
First activity viewed → added
Conflict shown → resolved
Reload (data se neztratí)
Export


24. Analytics (povinné)
Klíčové eventy:
textKopírovatonboarding_started
child_created
preferences_completed
catalog_opened
search_used
filter_used
activity_viewed
activity_added
conflict_shown
alternative_selected
schedule_completed
export_clicked
share_clicked
Hlavní funnel:
textKopírovatStart → Child created → First activity viewed → First activity added → First conflict resolved → Schedule completed

25. Security & Privacy

Žádné osobní údaje na serveru v V1
localStorage only
Sdílecí tokeny až ve V2 s expirací a revokací


26. Definition of Done & Prioritizace
V1 (Must have)

Home jako schedule-first
Onboarding s reálnou dostupností
Matching Engine + explainable recommendations
Conflict Engine
Budget Engine
Autosave
Desktop 2-panel + Mobile bottom nav
Agenda (mobile) + Timeline (desktop)
iCal + PDF export
Multi-child základní

V1.5

Schedule Variants + porovnání
Lepší shortlist / favorizace

V2

Travel time
Family conflict
Cloud sharing
Parent availability


Hlavní UX KPI

Time to first useful schedule (sekundy od otevření do prvního použitelného týdne)
Schedule completion rate (% uživatelů, kteří po vytvoření dítěte dokončí alespoň jeden použitelný týden)