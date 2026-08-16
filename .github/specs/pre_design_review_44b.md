CHILDREN SCHEDULE PLANNER
Finální Product + UX + Technical Development Specification
Produkt: Children Schedule Planner
URL: children-schedule-web.vercel.app
Verze specifikace: 2.0
Platformy: Mobile Web / PWA / iOS / Android / Desktop Web
Cíl: Transformovat současný katalog aktivit na osobního, deterministického plánovače aktivit pro rodiče s minimální kognitivní zátěží.
1. EXECUTIVE SUMMARY
Současná aplikace funguje primárně jako katalog kroužků.
Cílový produkt musí fungovat jako:
osobní plánovač týdne dítěte, který rodiči pomáhá rozhodnout, co se dítěti hodí, co se vejde do jeho týdne a jak jednotlivé možnosti zkombinovat.
Hlavní produktový princip:
Katalog je prostředek. Rozvrh je produkt.
Aplikace nesmí přenášet rozhodovací práci na rodiče. Nemá pouze zobrazit desítky aktivit a očekávat, že rodič sám zjistí:
co odpovídá věku,
co odpovídá zájmům,
co se časově vejde,
co nekoliduje,
co se vejde do rozpočtu,
které alternativní termíny jsou lepší.
Aplikace musí tyto informace automaticky vyhodnotit a srozumitelně prezentovat.
2. PRODUCT GOAL
Uživatel musí být schopen:
vytvořit dítě,
zadat jeho věk, zájmy a dostupnost,
získat relevantní doporučení,
přidat aktivitu do rozvrhu,
okamžitě vidět případné konflikty,
zvolit alternativní termín,
vytvořit použitelný týdenní plán,
plán automaticky uložit,
případně jej exportovat nebo později sdílet.
Primární UX KPI
Time to First Useful Schedule
Čas od otevření aplikace po vytvoření prvního použitelného rozvrhu.
Cílová hodnota:
≤ 90 sekund pro nového uživatele
Sekundární KPI:
Schedule completion rate
First activity add rate
Conflict resolution rate
Export rate
Return rate
Onboarding completion rate
3. CORE PRODUCT PRINCIPLES
3.1 Schedule-first
Výsledkem používání aplikace není katalog.
Výsledkem je:
funkční týden dítěte.
3.2 Personal-first
Aplikace musí vždy vědět, pro které dítě uživatel plánuje.
3.3 Progressive disclosure
Uživatel nesmí být zahlcen.
V jednom okamžiku mají být viditelné maximálně:
1 hlavní úkol,
1 hlavní CTA,
několik sekundárních možností.
Pokročilé funkce se zobrazují až v okamžiku, kdy jsou relevantní.
3.4 Deterministic first
V1 nesmí být závislá na AI.
Veškeré zásadní rozhodování musí být deterministické:
čas,
konflikt,
věk,
rozpočet,
dostupnost,
preference.
AI lze přidat později jako nadstavbu.
3.5 Explainable recommendations
Aplikace nesmí pouze říct:
„Doporučujeme Karate.“
Musí být schopna vysvětlit:
✓ vhodné pro věk
✓ odpovídá zájmu o sport
✓ čtvrtek je volný
✓ vejde se do rozpočtu
✓ bez konfliktu
3.6 Mobile-first
Mobile není zmenšená desktopová verze.
Mobile musí používat interaction patterns optimalizované pro dotyk:
bottom navigation,
bottom sheets,
agenda,
sticky CTA,
full-screen detail,
tap-to-edit.
4. PLATFORM STRATEGY
Primární implementace:
Responsive React/Next.js application + PWA.
Cílové platformy:
iOS Safari / PWA
Android Chrome / PWA
Desktop Chrome
Desktop Safari
Desktop Edge
Nativní iOS/Android aplikace nejsou součástí V1.
Architektura však nesmí bránit budoucímu zabalení do native wrapperu nebo migraci na React Native.
5. TECHNOLOGY STACK
Pokud současný stack funguje, není povinné jej kompletně měnit.
Doporučený stack:
Frontend
React
Next.js App Router
TypeScript
Styling
Tailwind CSS
shadcn/ui nebo ekvivalentní accessible component system
State
Preferováno:
Zustand
Alternativa:
React Context + useReducer
Business logika nesmí být implementována přímo v React components.
Persistence
V1:
localStorage / IndexedDB podle potřeby.
V2:
server-side persistence.
Export
.ics
PDF
Testing
Vitest/Jest
Playwright
PWA
service worker
manifest
offline shell
cached user data
6. INFORMATION ARCHITECTURE
Mobile
Bottom navigation:
┌─────────────────────────────────────┐
│                                     │
│              CONTENT                │
│                                     │
├─────────────────────────────────────┤
│ Domů │ Katalog │ Rozvrh │ Děti      │
└─────────────────────────────────────┘
Domů
Týdenní přehled dítěte.
Katalog
Vyhledávání a výběr aktivit.
Rozvrh
Kompletní plán týdne.
Děti
Profily a nastavení.
7. DESKTOP INFORMATION ARCHITECTURE
Desktop:
┌────────────────┬────────────────────────────────────┐
│                │                                    │
│   KATALOG      │            ROZVRH                  │
│                │                                    │
│ Search         │                                    │
│ Filters        │       Weekly timeline              │
│                │                                    │
│ Activities     │                                    │
│                │                                    │
└────────────────┴────────────────────────────────────┘
Levý panel
Doporučená šířka:
340–380 px
Obsah:
search
filters
activity results
Pravý panel
Flex:
weekly schedule
conflicts
budget summary
free time
8. RESPONSIVE BREAKPOINTS
< 768 px
Mobile

768–1023 px
Tablet

≥ 1024 px
Desktop
320 px minimum
Aplikace musí fungovat bez horizontálního scrollu od:
320 px
až po:
2560 px.
9. TOUCH TARGETS
Minimální touch target:
44 × 44 px
Preferovaný:
48 × 48 px
Platí pro:
buttons
icon buttons
tabs
navigation
checkboxes
calendar interactions
10. FIRST-RUN ONBOARDING
Pokud není vytvořeno žádné dítě, aplikace zobrazí onboarding.
Cíl:
≤ 30 sekund
Step 1 — Dítě
Pro koho plánujeme?

Jméno
Věk
CTA:
Pokračovat
Step 2 — Zájmy
Co má dítě rádo?

⚽ Sport
🎨 Tvoření
🎵 Hudba
💃 Tanec
💻 Technologie
🔬 Věda
🌍 Jazyky
🌳 Příroda
Možnost:
Přeskočit
Step 3 — Dostupnost
Ne pouze dny.
Uživatel zadá časová okna:
Pondělí
15:00 ───────── 18:30

Úterý
16:00 ───────── 19:00

Středa
14:00 ───────── 18:00
Tím vzniká skutečná availability.
Step 4 — Rozpočet
Volitelné.
Maximální rozpočet

2 000 Kč / měsíc
Možnost:
Nevím / nechci zadat
Step 5 — Dokončení
Místo okamžitého otevření celého katalogu:
Pro Elišku jsme našli
8 vhodných aktivit.
CTA:
Zobrazit doporučení
Sekundární:
Procházet všechny aktivity
11. CHILD PROFILE
type Child = {
  id: string

  name: string
  birthDate?: string
  age: number
  grade?: string

  interests: string[]

  availability: AvailabilityWindow[]

  preferredDays?: DayOfWeek[]

  budget?: {
    amount: number
    currency: string
    period: "month" | "year"
  }

  maxActivitiesPerWeek?: number

  color?: string
}
12. MULTI-CHILD
Aplikace musí podporovat více dětí.
Například:
Eliška · 9 let
Tomáš · 7 let
Aktivní dítě:
Eliška ▾
Kliknutí otevře child switcher.
Family view
Je připravena pro budoucí použití.
Zobrazení:
Eliška
⚽ Fotbal 16:00

Tomáš
🥋 Karate 16:00
V2 může upozornit:
⚠ Rodič nemůže být na dvou místech současně.
13. ACTIVITY DATA MODEL
Aktivita nesmí obsahovat pouze jeden termín.
type Activity = {
  id: string

  name: string
  organizer: string

  category: string
  subcategory?: string

  description?: string

  ageRange?: {
    min?: number
    max?: number
  }

  pricing?: Pricing

  location?: Location

  variants: ActivityVariant[]
}
14. ACTIVITY VARIANT
Každý termín je samostatná varianta.
type ActivityVariant = {
  id: string

  activityId: string

  day: DayOfWeek

  startTime: string
  endTime: string

  locationId?: string

  capacity?: number
  available?: boolean
}
Příklad:
Karate

Po 16:00–17:00
Út 17:30–18:30
Čt 17:00–18:00
UI nesmí používat nejasné:
+1
+2
Místo toho:
3 termíny
15. PRICING MODEL
Cena nesmí být ukládána jako text.
type Pricing = {
  amount: number
  currency: "CZK" | "EUR"

  period:
    | "lesson"
    | "month"
    | "quarter"
    | "semester"
    | "year"
    | "one_time"
}
Případně:
priceOptions?: Pricing[]
UI může zobrazovat:
1 200 Kč / rok
a sekundárně:
≈ 100 Kč / měsíc
16. SCHEDULE EVENT
type ScheduleEvent = {
  id: string

  childId: string

  source: "activity" | "custom"

  activityId?: string
  variantId?: string

  title: string

  day: DayOfWeek

  startTime: string
  endTime: string

  location?: Location

  notes?: string
}
17. SCHEDULE VARIANTS
Varianty jsou podporované, ale nejsou součástí kritického V1 flow.
type ScheduleVariant = {
  id: string
  name: string
  childId: string

  items: ScheduleEvent[]
}
Příklad:
Varianta A
Fotbal + Karate + Výtvarka
Varianta B
Fotbal + Plavání + Výtvarka
Varianty musí být možné:
kopírovat,
přejmenovat,
smazat,
porovnat.
Priorita:
V1.5
18. HOME SCREEN
Home není statistický dashboard.
Je to:
„Jak vypadá tento týden?“
Header
Dobrý den 👋

Eliška · 9 let ▾
Week summary
Tento týden

3 aktivity
1 750 Kč

✓ Bez konfliktů
Pokud konflikt:
⚠ 1 konflikt
Kliknutí otevře problém.
19. HOME — WEEK AGENDA
Mobile default:
PO 15.

⚽ Fotbal
16:00–17:00

ÚT 16.

🥋 Karate
17:30–18:30

ST 17.

Volno

ČT 18.

🎨 Výtvarka
14:00–15:00
20. MOBILE SCHEDULE STRATEGY
Na mobile je default:
Agenda
Ne klasický time-grid.
Důvod:
lepší čitelnost,
menší hustota,
lepší touch interaction,
žádný horizontální scroll.
Volitelně může uživatel přepnout:
Agenda / Mřížka
21. DESKTOP SCHEDULE
Desktop používá time-grid.
       PO       ÚT       ST       ČT       PÁ

15:00
16:00  Fotbal
17:00           Karate
18:00
Časový rozsah musí být dynamický podle dat.
Výchozí například:
13:00–20:00
22. SCHEDULE SUMMARY
Sticky summary:
3 aktivity
1 750 / 2 000 Kč

✓ 0 konfliktů
2 volná odpoledne
23. CUSTOM EVENTS
CTA:
+ Přidat vlastní aktivitu
Form:
název
den
začátek
konec
místo
poznámka
Custom event podléhá stejnému conflict engine.
24. CATALOG
Katalog není hlavní produktový cíl.
Je nástroj pro nalezení dalších možností.
Struktura:
Search
↓
Quick categories
↓
Active filters
↓
Recommended results
↓
All results
25. SEARCH
Placeholder:
Co by chtělo dítě dělat?
Search přes:
název,
organizaci,
kategorii,
podkategorii,
lokalitu.
Debounce:
150–250 ms
26. QUICK CATEGORIES
Například:
⚽ Sport
🎨 Tvoření
🎵 Hudba
💻 Technologie
🔬 Věda
🌍 Jazyky
Zbytek:
Zobrazit vše
Neprezentovat kompletní strom kategorií jako první obrazovku.
27. FILTER SYSTEM
Inteligentní filtry:
Bez konfliktu
Vhodné pro věk
V rozpočtu
Dostupný termín
Den
Čas
Kategorie
Organizátor
Lokalita
28. SMART FILTERS
Výchozí po onboardingu:
Věk
+
Dostupnost
+
Bez konfliktu
Aplikace ale nesmí uživatele nutit rozumět technickému mechanismu.
Místo:
„3 aktivní filtry“
preferovat:
Doporučeno pro Elišku
29. MOBILE FILTER BOTTOM SHEET
Obsah:
Filtrovat

Dny
Po Út St Čt Pá

Čas
14:00 ───── 19:00

Kategorie
Sport
Hudba
...

Cena
...

☑ Bez konfliktu
☑ Vhodné pro věk
Sticky CTA:
Zobrazit 14 aktivit
30. ACTIVITY CARD
Standardní komponenta:
[category]

Fotbal pro děti

⚽ Sport
9–12 let

Út · 16:00–17:00

1 200 Kč / rok

✓ Bez konfliktu
✓ Vhodné pro Elišku

[ Přidat ]
31. CARD STATES
Podporované interní stavy:
type ActivityStatus =
  | "MATCH"
  | "NO_MATCH"
  | "CONFLICT"
  | "OUTSIDE_AVAILABILITY"
  | "OVER_BUDGET"
  | "ADDED"
  | "FAVORITE"
UI zobrazí pouze relevantní stav.
32. FAVORITES
Uživatel může uložit aktivitu.
Icon:
♡
po kliknutí:
♥
Accessibility label:
Přidat do oblíbených
33. RECOMMENDATION ENGINE
V1 musí být deterministický.
Každá aktivita se vyhodnotí podle:
Age fit
Interest fit
Time fit
Conflict fit
Budget fit
Availability
Interní score:
type MatchResult = {
  activityId: string
  score: number
  reasons: MatchReason[]
}
34. MATCH WEIGHTS
Doporučený výchozí model:
Age fit          25 %
Interest fit     25 %
Time fit         20 %
Conflict fit     15 %
Budget fit       10 %
Availability      5 %
Weights musí být konfigurovatelné.
35. EXPLAINABLE MATCH
Uživatel nevidí:
87/100
Místo toho:
Proč se to hodí?
✓ Vhodné pro 9 let
✓ Odpovídá zájmu o sport
✓ Úterý má volné
✓ V rozpočtu
✓ Bez konfliktu
36. RECOMMENDATION UI
Po onboardingu:
Pro Elišku jsme našli
8 vhodných aktivit.

Doporučujeme

1. Karate
   Út · 17:30
   ✓ Bez konfliktu

2. Fotbal
   Čt · 16:00
   ✓ Bez konfliktu

3. Výtvarka
   St · 14:00
   ✓ Bez konfliktu
Maximálně:
3–5 doporučení
37. ACTIVITY DETAIL
Detail je decision screen.
Sekce:
Název
Kategorie
Věk
Termíny
Cena
Lokalita
Proč doporučeno
Popis
Organizátor
Sticky mobile CTA:
Přidat do rozvrhu
38. VARIANT SELECTION
Pokud má aktivita více termínů:
Vyberte termín

○ Po 16:00–17:00
  ✓ bez konfliktu

○ Út 17:30–18:30
  ⚠ koliduje s Karate

○ Čt 17:00–18:00
  ✓ bez konfliktu
CTA:
Přidat vybraný termín
39. CONFLICT ENGINE
Základní overlap:
startA < endB && endA > startB
Pro každý nový event:
findConflicts(event, schedule)
40. EDGE CASE
Fotbal
16:00–17:00

Karate
17:00–18:00
Výsledek:
bez časové kolize
Dotyk koncových bodů není overlap.
41. CONFLICT TYPES
type ConflictType =
  | "OVERLAP"
  | "TRAVEL_WARNING"
  | "OUTSIDE_AVAILABILITY"
  | "BUDGET_WARNING"
TRAVEL_WARNING je připraven pro V2.
42. CONFLICT UI
Při konfliktu:
⚠ Časová kolize

Karate
Út 17:30–18:30

se překrývá s:

Fotbal
Út 18:00–19:00
CTA:
Vybrat jiný termín
Sekundární:
Přidat přesto
43. ALTERNATIVE TERM ENGINE
Pokud má stejná aktivita více variant, konflikt engine musí automaticky vyhledat alternativy.
Karate

Po 16:00
✓ volno

Út 17:30
⚠ konflikt

Čt 17:00
✓ volno
44. BUDGET ENGINE
Všechny ceny se musí normalizovat na společné období.
Například:
1 200 Kč / rok
≈ 100 Kč / měsíc
Budget UI
Rozpočet

1 750 / 2 000 Kč
Při překročení:
2 250 / 2 000 Kč

⚠ O 250 Kč nad limitem
Přidání nesmí být automaticky blokováno.
Rozhodnutí zůstává na rodiči.
45. FREE TIME
Rozvrh musí umět zobrazit volná odpoledne.
Například:
✓ Středa volná
✓ Pátek volný
Nezobrazovat vizuálně přeplněnou mřížku.
46. TRAVEL TIME — V2 READY
Datový model musí být připraven na:
travelTimeMinutes?: number
Příklad:
Fotbal 16:00–17:00
↓ 20 min přesun
Karate 17:15
Výsledek:
⚠ Těsný přesun
Toto není stejný typ problému jako overlap.
47. SCHEDULE VARIANTS
V1.5:
Varianta A
Varianta B
Varianta C
Každá varianta je nezávislý schedule.
Akce:
Duplicate
Rename
Delete
Compare
Activate
48. VARIANT COMPARISON
Desktop:
              VARIANTA A     VARIANTA B

Aktivity          3               3

Cena          1 750 Kč        1 950 Kč

Konflikty         0               0

Volná odpoledne   2               1
Mobile:
Přepínání variant tab-like navigation.
49. PERSISTENCE
V1:
localStorage
Namespace:
childrenSchedule:v1
State:
{
  version: 1,

  activeChildId: string,

  children: Child[],

  scheduleVariants: ScheduleVariant[],

  favorites: string[],

  settings: Settings
}
50. AUTOSAVE
Po změně:
state update
↓
debounce 100–300ms
↓
persist
UI:
Ukládám…
→
✓ Uloženo
Nezobrazovat permanentně:
„Uloženo před 2 s“.
51. DATA VALIDATION
Při načtení localStorage:
load
↓
validate
↓
migrate
↓
normalize
↓
state
Data nesmí být považována za validní pouze proto, že existují.
52. DATA MIGRATION
Každý persisted state musí mít:
version: number
Budoucí změna datového modelu:
v1
↓
migration
↓
v2
Nikdy neprovádět breaking změnu localStorage bez migration layer.
53. BUSINESS LOGIC LAYER
Business logika nesmí být v UI komponentách.
Struktura:
src/
  components/

  features/
    children/
    catalog/
    schedule/
    planner/
    favorites/

  domain/
    conflicts/
    matching/
    pricing/
    planning/

  state/

  data/

  types/

  utils/
54. DOMAIN API
Minimálně:
findConflicts(
  event,
  schedule
)
canAddActivity(
  activity,
  child,
  schedule
)
getAvailableVariants(
  activity,
  child,
  schedule
)
calculateMatch(
  activity,
  child,
  schedule
)
calculateMonthlyCost(
  schedule
)
buildRecommendations(
  child,
  activities,
  schedule
)
55. CUSTOM EVENTS
Custom events musí procházet stejnou validací jako kroužky.
Například:
Zubař
Út 16:00–17:00
musí zabránit nebo upozornit na konflikt s aktivitou.
56. EXPORT — ICS
Exportovaný .ics musí obsahovat:
UID
SUMMARY
DTSTART
DTEND
LOCATION
DESCRIPTION
RRULE, pokud jde o opakovanou aktivitu
Cíl:
korektní import do Apple Calendar a Google Calendar.
57. PDF
PDF musí obsahovat:
Eliška
Týden 15.–21. září

PO
16:00 Fotbal

ÚT
17:30 Karate

ST
Volno

ČT
14:00 Výtvarka

────────────────

3 aktivity
1 750 Kč / měsíc
✓ Bez konfliktů
Musí být čitelné:
barevně,
černobíle,
na A4.
58. SHARING
Sharing není součástí čistě localStorage architecture.
Proto:
V1
Export.
V2
Backend:
POST /plans
GET /plans/:shareId
Share modes:
READ_ONLY
EDITABLE
Budoucí možnost:
Máma vytvoří plán → pošle tátovi link → oba ho vidí.
59. PWA / OFFLINE
Po prvním načtení musí aplikace umožnit práci s uloženým plánem offline.
Offline minimum:
zobrazit dítě,
zobrazit schedule,
upravovat schedule,
upravovat preference,
pracovat s cached katalogem.
Online-only operace musí mít jasný stav.
60. ACCESSIBILITY
Target:
WCAG 2.2 AA
Povinné:
semantic HTML
keyboard navigation
visible focus
accessible labels
screen reader compatibility
sufficient contrast
no information conveyed by color alone
reduced motion
44–48px touch targets
61. VISUAL DESIGN SYSTEM
Design musí působit:
calm · modern · trustworthy · family-friendly · premium
Ne:
colorful dashboard / enterprise admin / overloaded marketplace.
Spacing
Používat 4/8 systém:
4
8
12
16
24
32
40
48
Radius
Cards:
16 px
Buttons:
12–14 px
Bottom sheets:
24 px top radius
62. TYPOGRAPHY
Preferovat system fonts:
system-ui
iOS:
SF Pro fallback
Android:
Roboto/system fallback
Desktop:
system-ui
63. COLOR
Použít semantic palette:
primary
success
warning
danger
neutral
Barvy kategorií nesmí být jediným způsobem rozlišení.
64. STATUS DESIGN
Success
✓ Bez konfliktu
Warning
⚠ Těsný termín
Error
× Časová kolize
Neutral
Věk není uveden
65. MOTION
Pouze pro:
bottom sheet
modal
adding activity
favorite
week transition
conflict feedback
Target:
150–250 ms
Respect:
prefers-reduced-motion
66. LOADING STATES
Použít skeleton UI.
Ne:
Loading...
67. EMPTY STATES
Žádné dítě
Začněme vytvořením profilu dítěte.
Přidat dítě
Prázdný rozvrh
Tento týden je zatím volný 🌱
Najít aktivitu
Žádné výsledky
Nic vhodného jsme nenašli.
Upravit filtry
68. ERROR STATES
Human-readable:
Kroužky se nepodařilo načíst.
Zkusit znovu
Nikdy nezobrazovat raw API error.
69. PERFORMANCE
Target:
Lighthouse Performance ≥ 90
Accessibility ≥ 95
Best Practices ≥ 95
Core Web Vitals:
LCP < 2.5s
INP < 200ms
CLS < 0.1
70. INTERACTION PERFORMANCE
Při 200+ aktivitách:
filtrování < 50 ms
conflict calculation < 50 ms
match calculation < 50 ms
UI musí působit okamžitě.
71. TESTING
Unit tests
Povinně:
conflict engine
budget engine
age validation
match engine
alternative variants
schedule calculations
persistence
migration
72. CONFLICT TEST CASES
16:00–17:00
17:00–18:00
=> NO CONFLICT
16:00–17:00
16:30–17:30
=> CONFLICT
16:30–17:30
16:00–18:00
=> CONFLICT
16:00–18:00
16:30–17:00
=> CONFLICT
73. E2E TESTS
Playwright:
E2E-01
Create child.
E2E-02
Set interests.
E2E-03
Set availability.
E2E-04
Search activity.
E2E-05
Filter activity.
E2E-06
Open detail.
E2E-07
Add activity.
E2E-08
Add conflicting activity.
E2E-09
Select alternative.
E2E-10
Create custom event.
E2E-11
Reload browser.
E2E-12
Verify persistence.
E2E-13
Export ICS.
E2E-14
Verify mobile navigation.
74. ANALYTICS
Implement event instrumentation from the beginning.
Events:
onboarding_started
child_created
preferences_completed

catalog_opened
search_used
filter_used

activity_viewed
activity_favorited
activity_added

conflict_shown
alternative_viewed
alternative_selected

schedule_completed

export_clicked
share_clicked
75. PRODUCT FUNNEL
Track:
App opened
    ↓
Child created
    ↓
Preferences completed
    ↓
Activity viewed
    ↓
Activity added
    ↓
Conflict resolved
    ↓
Useful schedule created
76. PRIVACY
V1 by default nevyžaduje účet.
Data uložená lokálně.
Pokud bude implementováno analytics:
neodesílat zbytečné osobní údaje,
nepoužívat dítě jako identifikovatelný analytics property,
neodesílat jméno dítěte,
respektovat GDPR requirements.
77. SECURITY
Share token nesmí být předvídatelný.
Používat kryptograficky bezpečný random identifier.
Při cloud sharing:
authorization,
access control,
rate limiting,
expiration/revocation podle potřeby.
78. IMPLEMENTAČNÍ FÁZE
PHASE 0 — Foundation
audit současného codebase
data normalization
types
domain layer
state architecture
design tokens
testing setup
PHASE 1 — CORE UX
Must have:
nový responsive shell,
mobile bottom navigation,
desktop split view,
child onboarding,
child profile,
availability,
catalog redesign,
search,
filters,
activity detail,
activity variants,
schedule,
add activity,
conflict engine,
alternative term selection,
autosave.
PHASE 1.5 — PRODUCT QUALITY
recommendations
explainable match
favorites
budget engine
custom events
empty/loading/error states
accessibility
analytics
full test coverage
PHASE 2 — ADVANCED PLANNING
schedule variants
variant comparison
multi-child family view
ICS
PDF
PWA/offline improvements
PHASE 3 — CLOUD
accounts
cloud persistence
share links
read-only sharing
collaborative editing
PHASE 4 — ADVANCED INTELLIGENCE
travel time
parent availability
automatic schedule optimization
Google Calendar integration
Apple Calendar integration
intelligent planner / AI assistance
79. PRIORITY MODEL
P0 — Critical
Bez toho není produkt hotový:
Child
Onboarding
Availability
Catalog
Search
Filters
Activity variants
Schedule
Conflict engine
Autosave
Mobile navigation
P1 — High
Recommendations
Match engine
Budget
Favorites
Custom events
Accessibility
Analytics
Testing
Export
P2 — Advanced
Variants
Multi-child comparison
Sharing
PWA offline
Travel time
Calendar integrations
Auto planner
80. DEFINITION OF DONE
Feature je hotová pouze pokud:
UX
funguje mobile,
funguje desktop,
má loading state,
má empty state,
má error state,
má jasné CTA,
nevyžaduje zbytečné rozhodování.
Data
data jsou validní,
data jsou persistována,
reload neztratí stav,
migration je připravena.
Business logic
je oddělená od UI,
má unit tests,
řeší edge cases.
Accessibility
WCAG 2.2 AA,
keyboard,
screen reader,
focus,
contrast.
Performance
žádné perceptible lagy,
žádný unnecessary rerender,
žádný layout shift.
81. FINAL UX ACCEPTANCE CRITERIA
AC-01 — Onboarding
Nový uživatel vytvoří dítě a dostupnost do:
30 sekund
AC-02 — First recommendation
Po dokončení onboardingu aplikace zobrazí relevantní aktivity bez nutnosti ručního nastavování dalších filtrů.
AC-03 — Add activity
Uživatel může přidat aktivitu maximálně několika interakcemi.
AC-04 — Conflict
Při konfliktu je problém viditelný okamžitě.
AC-05 — Alternative
Pokud existuje nekolidující termín, aplikace jej nabídne.
AC-06 — Budget
Po přidání aktivity se okamžitě aktualizuje rozpočet.
AC-07 — Persistence
Po zavření a opětovném otevření aplikace je poslední stav zachován.
AC-08 — Mobile
Aplikace funguje od:
320 px
bez horizontálního scrollu.
AC-09 — Touch
Primární interakce mají minimálně:
44 × 44 px.
AC-10 — Accessibility
Aplikace splňuje:
WCAG 2.2 AA
AC-11 — Export
ICS soubor lze importovat do:
Apple Calendar
Google Calendar
82. UX ANTI-PATTERNS — ZAKÁZÁNO
Developer nesmí implementovat následující:
❌ „+1 / +2“
Místo toho:
3 termíny
❌ Nejasné „Vejde se mi to“
Místo toho:
Bez konfliktu
❌ Technické statusy
Místo toho:
✓ Bez konfliktu
❌ Přeplněná horní lišta
❌ Malé touch targets
❌ Katalog jako jediný hlavní workflow
❌ Mobilní desktop calendar zmenšený na 320 px
❌ Business logika v komponentách
❌ Parsování ceny z textového stringu
❌ Parsování termínu z textového stringu
❌ Barevné rozlišení jako jediný způsob komunikace
❌ Permanentní „Uloženo před 2 s“
❌ Zbytečné potvrzovací modaly pro každou akci
83. TARGET EXPERIENCE
Finální Home screen má působit přibližně:
Dobrý den 👋

Eliška · 9 let ▾


TENTO TÝDEN

PO
⚽ Fotbal
16:00–17:00

ÚT
🥋 Karate
17:30–18:30

ST
Volno

ČT
🎨 Výtvarka
14:00–15:00


3 aktivity
1 750 / 2 000 Kč

✓ Bez konfliktů


────────────────────────

✨ DOPORUČENO PRO ELIŠKU

🥋 Karate
Út · 17:30
✓ Bez konfliktu
Ne:
Hledat kroužek

Filtry

Vejde se mi to

Sport
Míčové sporty
...

37 aktivit
84. FINÁLNÍ PRODUCT MODEL
Celý produkt musí fungovat jako tento tok:
                    DÍTĚ
                      │
                      ▼
               DOSTUPNOST
                      │
                      ▼
                PREFERENCE
                      │
                      ▼
              MATCH ENGINE
                      │
             ┌────────┴────────┐
             ▼                 ▼
      DOPORUČENÍ             KATALOG
             │                 │
             └────────┬────────┘
                      ▼
                  VÝBĚR
                      │
                      ▼
                  ROZVRH
                      │
                      ▼
              CONFLICT ENGINE
                      │
             ┌────────┴────────┐
             ▼                 ▼
          VYŘEŠIT            POTVRDIT
             │                 │
             └────────┬────────┘
                      ▼
                HOTOVÝ TÝDEN
                      │
                ┌─────┴─────┐
                ▼           ▼
              EXPORT      SHARE
85. ABSOLUTNÍ PRODUCT PRINCIPLE
Celý vývoj musí respektovat tuto jednu větu:
Rodič nemá plánovat kroužky ručně. Aplikace má rodiči pomoci sestavit dobrý týden.
To je hlavní rozdíl mezi katalogem kroužků a Children Schedule Plannerem.
86. FINAL DEVELOPER BRIEF
Pokud by developer měl přečíst pouze jednu část dokumentu, musí pochopit následující:
Redesign není vizuální facelift současné aplikace.
Musí dojít ke změně informační architektury, datového modelu, business logiky i UX flow.
Současný katalog se transformuje na personalizovaný planner.
Uživatel nejprve definuje dítě, jeho zájmy a dostupnost. Aplikace následně automaticky identifikuje relevantní aktivity, vysvětlí jejich vhodnost, kontroluje časové konflikty a rozpočet a umožní rodiči vytvořit funkční týdenní plán.
Mobile používá agenda-first UX a bottom navigation. Desktop používá katalog + rozvrh ve split view.
Veškerá business logika musí být deterministická, testovatelná a oddělená od UI.
Aplikace musí minimalizovat kognitivní zátěž a nesmí vyžadovat, aby rodič sám ručně kombinoval desítky aktivit.
FINÁLNÍ PRIORITA
                    CHILDREN SCHEDULE
                           │
                           ▼
                    1. CHILD PROFILE
                           │
                           ▼
                    2. AVAILABILITY
                           │
                           ▼
                     3. INTERESTS
                           │
                           ▼
                  4. RECOMMENDATIONS
                           │
                           ▼
                      5. CATALOG
                           │
                           ▼
                       6. SELECT
                           │
                           ▼
                     7. SCHEDULE
                           │
                           ▼
                   8. CONFLICTS
                           │
                           ▼
                    9. RESOLUTION
                           │
                           ▼
                   10. FINAL WEEK
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
                EXPORT            SHARE
Toto je finální baseline pro vývoj. Vše, co není v P0/P1, se nesmí dostat do implementace na úkor kvality základního flow. Nejdříve musí být perfektní cesta „dítě → doporučení → aktivita → konflikt → hotový týden“; až potom se přidávají pokročilé funkce.