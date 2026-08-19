Children Schedule — Spec-Driven Development Specification
Design System + Device Ergonomics + Intuitive UX
Status: Ready for implementation
Scope: Mobile, Tablet, Desktop
Primary goal: Jednotný designový systém, ale ergonomicky odlišná kompozice podle zařízení. Maximální intuitivnost, minimální kognitivní zátěž a rychlá práce jednou rukou na mobilu.
1. Product UX North Star
Aplikace nesmí působit jako databáze kroužků.
Musí působit jako:
osobní plánovač aktivit dítěte, který rodiči pomáhá rozhodnout, co se do týdne skutečně vejde.
Primární user flow:
Vyberu dítě
    ↓
Vidím jeho aktuální týden
    ↓
„Co se ještě vejde?“
    ↓
Dostanu vhodné možnosti
    ↓
Vidím proč jsou vhodné
    ↓
Vidím případnou kolizi
    ↓
Vyberu konkrétní termín
    ↓
Jedním akcí přidám
    ↓
Okamžitě vidím aktualizovaný rozvrh
2. Core UX Principles
SD-UX-001 — One Design System, Multiple Compositions
Design systém musí být jednotný napříč platformami.
Jednotné musí být:
barvy
typografie
spacing
radius
shadows
ikony
buttony
inputy
statusy
wording
accessibility
interaction semantics
Odlišné mohou a musí být:
navigace
počet sloupců
informační hustota
pořadí prvků
pozice CTA
způsob otevření detailu
reprezentace rozvrhu
použití gest
Pravidlo:
Components are shared. Composition is adaptive.
3. Device UX Strategy
Mobile
Priorita:
one-hand use + scanning + quick actions
Charakter:
single-column
bottom navigation
sticky bottom actions
bottom sheets
vertical agenda
large touch targets
minimum persistent chrome
Tablet Portrait
Priorita:
reading + selection
Charakter:
1–2 panely
seznam + detail podle dostupného prostoru
více současně viditelného kontextu
touch + pointer
Tablet Landscape
Priorita:
comparison + planning
Charakter:
2–3 panely
seznam + detail + rozvrh
persistentní kontext
minimální navigační overhead
Desktop
Priorita:
power-user efficiency
Charakter:
multi-panel
hustší tabulkové rozložení
keyboard shortcuts
permanentní filtry
drag & drop
4. Responsive Breakpoint Model
Používat capability/layout breakpoints, ne device sniffing.
Doporučená výchozí škála:
< 600px       Mobile compact
600–767px     Mobile large
768–1023px    Tablet portrait
1024–1279px   Tablet landscape
1280px+       Desktop
Breakpoint musí být možné upravit bez změny komponent.
5. Design Tokens
SD-DS-001 — Color Roles
Používat pouze sémantické tokeny.
--color-brand
--color-brand-hover
--color-brand-pressed

--color-surface
--color-surface-raised
--color-surface-muted

--color-text-primary
--color-text-secondary
--color-text-muted

--color-border
--color-divider

--color-success
--color-success-bg

--color-warning
--color-warning-bg

--color-danger
--color-danger-bg

--color-focus
Komponenty nesmí obsahovat náhodné hard-coded barvy.
6. Color Rules
Primary color
Používá se pro:
hlavní CTA
aktivní navigaci
vybrané prvky
hlavní focus state
Success
Používat pro:
✓ Bez kolize
Warning
Používat pro:
⚠ Těsná návaznost
Danger
Používat pro:
⚠ Kolize s Fotbalem
Barva nikdy nesmí být jediným nositelem významu.
7. Typography Tokens
Výchozí scale:
Display    32 / 700
H1         24 / 700
H2         20 / 700
H3         18 / 650
Body       16 / 400
BodySmall  14 / 400
Caption    13 / 500
Button     16 / 600
Mobile nesmí redukovat základní body text pod 15–16 px pouze kvůli vyšší informační hustotě.
Raději zobrazit méně informací.
8. Spacing Tokens
Používat konzistentní scale:
4
8
12
16
20
24
32
40
48
64
Komponenty nesmí náhodně používat hodnoty jako 13px, 19px, 27px bez systémového důvodu.
9. Radius Tokens
radius-sm      8px
radius-md      12px
radius-lg      16px
radius-pill    999px
Karty, sheets a ovládací prvky musí používat tento systém.
10. Elevation
Doporučené vrstvy:
elevation-0   base surface
elevation-1   card
elevation-2   floating control
elevation-3   bottom sheet / modal
elevation-4   critical overlay
Nepoužívat shadow pouze jako dekoraci.
Shadow musí signalizovat prostorovou hierarchii.
11. Buttons
Primary
[ Přidat do rozvrhu ]
Použití:
hlavní rozhodnutí
submit
potvrzení
Secondary
[ Upravit ]
Tertiary
Zobrazit další
Destructive
[ Smazat ]
Button hierarchy musí zůstat stejná na všech zařízeních.
12. Button Ergonomics
Mobile
Primary action:
full width nebo téměř full width
v thumb-reachable oblasti
ideálně sticky při dlouhém detailu
Tablet
content-sized
lze mít vedle sekundární akce
Desktop
content-sized
vhodné inline akce
13. Touch Target Specification
Minimum:
44 × 44px
Preferováno:
48 × 48px
Platí pro:
icon buttons
tabs
day selectors
filter chips
close buttons
dropdowns
add/remove
edit/delete
calendar interactions
14. Accessibility Baseline
Každá verze musí podporovat:
keyboard navigation
visible focus state
screen readers
semantic HTML
text scaling
reduced motion
sufficient contrast
no color-only communication
accessible alternatives to drag & drop
15. Component Architecture
Sdílené komponenty:
AppShell
TopBar
BottomNav
ChildSwitcher
SearchField
FilterChip
FilterSheet
CategoryList
CategoryRow
ActivityCard
ActivityDetail
SessionPicker
ConflictBadge
ConflictBanner
ScheduleDay
ScheduleWeek
ScheduleEvent
CustomEventForm
EmptyState
Snackbar
Button
IconButton
Každá komponenta musí být device-agnostic na úrovni API.
16. Composition Layer
Komponenta nesmí rozhodovat sama o tom, zda bude v jednom nebo třech sloupcích.
To řeší parent/layout layer.
Příklad:
ActivityCard
    ↓
MobileActivityList
TabletActivityList
DesktopActivityList
Obsah a vizuální jazyk zůstávají stejné.
Kompozice je jiná.
17. Mobile Navigation
Povinná bottom navigation:
┌────────────────────────────────┐
│                                │
│             CONTENT            │
│                                │
├────────────────────────────────┤
│ 🏠     🔎      📅       👨‍👩‍👧   │
│ Domů  Kroužky  Rozvrh     Děti  │
└────────────────────────────────┘
Tabs:
Domů
Kroužky
Rozvrh
Děti
Bottom navigation musí respektovat safe area.
18. Mobile Home
Priority hierarchy
selected child
today
week overview
recommendations
discovery
Required structure
Matěj · 9 let ▼

Dnes

16:30
Basketbal

Tento týden

Po   2
Út   1
St   volno
Čt   1

Co se ještě vejde?

4 možnosti
Homepage nesmí začínat dlouhým katalogem.
19. Child Context
Aktivní dítě musí být vždy vizuálně dostupné.
👦 Matěj · 9 let ▼
Přepnutí dítěte musí aktualizovat:
recommendations
age matching
schedule
conflicts
filtering
activity suitability
20. Mobile Activity Discovery
Pořadí:
Search
↓
Active filter chips
↓
Recommendations
↓
Results
Dlouhé hierarchické kategorie nejsou primární obsah.
21. Mobile Filter UX
Otevření:
[ Filtry · 3 ]
Bottom sheet/full-screen sheet:
Filtry                       Vymazat vše

Dítě
Matěj · 9

Dny
[Po] [Út] [St] [Čt] [Pá]

Kategorie
Sport
Hudba
Umění
Věda

Cena
0 — 5 000 Kč

Kolize
● Pouze volné
○ Vše

[ Zobrazit 12 kroužků ]
CTA musí být sticky.
22. Filter Rules
Aktivní filtry musí být viditelné bez otevření sheetu.
Příklad:
Matěj 9
Po
Sport
Bez kolize
Každý chip musí být odstranitelný samostatně.
23. Search UX
Placeholder:
Hledat kroužek…
Search musí podporovat:
activity name
category
organization
location
Budoucí rozšíření:
sport po 16
→ interpretuje category + day + time.
24. Activity Card
Canonical mobile card:
🏀 Basketbal — přípravka

Po 16:30–18:00
8–11 let

1 200 Kč / rok
📍 Rakovník

✓ Hodí se Matějovi

[ Přidat ]
Zobrazovat jako první:
název
termín
věk
cena
lokace
suitability/conflict
CTA
25. Activity Card — Secondary Data
Do detailu přesunout:
organizaci
detail kategorie
další termíny
dlouhé popisy
sekundární metadata
26. Session Selection
Pokud aktivita má více termínů:
Atletika — přípravka

Vyberte termín:

○ Út 15:00–16:30
○ Čt 15:00–16:30
○ Pá 16:00–17:30

[ Přidat vybraný termín ]
+ 2 další termíny nesmí být interpretováno jako přidání všech termínů.
Každý slot je samostatná entita.
27. Activity Detail Composition
Mobile
Bottom sheet.
Tablet portrait
Bottom/side sheet podle available space.
Tablet landscape
Persistent right pane.
Desktop
Persistent detail pane nebo modal podle layoutu.
Stejná komponenta.
Jiná kompozice.
28. Mobile Bottom Sheet Rules
drag-to-close
explicit close button
focus trap
accessible title
sticky primary CTA
safe-area aware
preserve scroll position
background must not scroll independently
29. Tablet Architecture
Portrait
Prefer:
List + detail overlay
než nucené tři sloupce.
Landscape
Prefer:
Filters | Activities | Schedule/Detail
30. Tablet Landscape Master-Detail
Canonical layout:
┌────────────┬────────────────────┬────────────────────┐
│ FILTRY     │ KROUŽKY            │ DETAIL / ROZVRH     │
│            │                    │                    │
│ Dítě       │ Basketbal          │ Basketbal          │
│ Den        │ Karate             │                    │
│ Kategorie  │ Atletika           │ Po 16:30–18:00     │
│            │                    │ ✓ Bez kolize       │
└────────────┴────────────────────┴────────────────────┘
Kliknutí na aktivitu nesmí opustit seznam.
31. Tablet Ergonomics
Landscape:
comparison + planning
Portrait:
reading + selection
Nelze automaticky předpokládat, že tablet portrait a landscape mají stejný layout.
32. Schedule UX
Schedule je hlavní destination produktu.
Mobile
Agenda / day-based layout.
Tablet Portrait
Compact weekly/agenda hybrid.
Tablet Landscape
Weekly grid.
Desktop
Weekly grid + side context.
33. Mobile Schedule
Prefer vertikální časovou osu:
PO 18

15:00
Škola

16:30
🏀 Basketbal

18:00
🏠 Domů
Ne desktopový calendar grid zmenšený na 375 px.
34. Schedule Event Actions
Tap:
Detail
Upravit
Odstranit
Drag & drop není jediná cesta.
35. Drag & Drop
Tablet/Desktop
Podporovat.
Mobile
Pouze jako optional enhancement.
Musí existovat alternativní explicitní editace:
Den: Po
Čas: 16:30
36. Collision Semantics
Musí existovat přesně tři UX stavy:
AVAILABLE
✓ Bez kolize
TIGHT
⚠ Těsná návaznost
CONFLICT
⚠ Kolize s Fotbalem
37. Conflict Algorithm
Pro časové intervaly:
A.start < B.end
AND
B.start < A.end
→ overlap.
Pokud:
A.end === B.start
→ žádný časový overlap.
Ale může vzniknout TRAVEL warning.
38. Conflict Types
Domain model musí rozlišovat:
TIME
TRAVEL
DUPLICATE
FAMILY
Severity:
INFO
WARNING
ERROR
39. Conflict UX
Nikdy pouze:
Kolize
Používat:
⚠ Kolize s Fotbalem
Út 16:00–17:30
Při více konfliktech:
⚠ Kolize se 2 aktivitami
Tap zobrazí všechny související eventy.
40. Conflict Override
Time conflict informuje, ale standardně neblokuje.
⚠ Kolize s Fotbalem

[ Přidat i tak ]
41. Duplicate Handling
Pokud je konkrétní session už v rozvrhu:
Tento termín už v rozvrhu máte.
Bez možnosti dalšího duplicate add.
42. Travel Conflict
Připravit business logic:
timeConflict()
travelConflict()
Nikdy jedinou obecnou funkci conflict().
Budoucí setting:
Čas na přesun
0 / 10 / 15 / 20 min
43. Data Model
Doporučený základ:
type Activity = {
  id: string
  title: string
  organization: string
  venue: Venue
  category: Category
  ageMin: number
  ageMax: number
  price?: Price
  sessions: Session[]
}

type Session = {
  id: string
  day: Weekday
  startTime: string
  endTime: string
  venue: Venue
}

type Child = {
  id: string
  name: string
  age: number
}

type ScheduleEvent = {
  id: string
  childId: string
  type: "ACTIVITY" | "CUSTOM"
  sessionId?: string
  startTime: string
  endTime: string
  venue?: Venue
}

type Conflict = {
  type: "TIME" | "TRAVEL" | "DUPLICATE" | "FAMILY"
  severity: "INFO" | "WARNING" | "ERROR"
  relatedEventIds: string[]
}
44. Venue Model
Oddělit:
organization
venue
address
Například:
organization = DDM Rakovník
venue = Sportovní hala
address = ...
Organizace nesmí být považována za místo konání.
45. “What Fits?” Engine
Primary CTA:
[ Najít, co se vejde ]
Inputs:
selected child
current schedule
preferred days
age
categories
price
conflicts
optional travel buffer
Output:
4 možnosti

🥇 Basketbal
✓ věk
✓ volný termín

🥈 Karate
✓ věk
✓ volný termín

🥉 Atletika
⚠ nad rozpočtem
46. Recommendation Explainability
Každé doporučení musí mít možnost:
Proč doporučeno?
Příklad:
✓ Věk odpovídá
✓ Pondělí je volné
✓ Bez časové kolize
✓ Cena pod limitem
47. Recommendation Ranking
MVP ranking:
1. No conflict
2. Age match
3. Preferred day
4. Preferred category
5. Budget compliance
6. Distance
Ranking musí být deterministický.
48. Empty State
Špatně:
0 výsledků
Správně:
Nic přesně nevyhovuje.

Zkusit:

[ + 1 den ]
[ + 100 Kč ]
[ Zobrazit těsné termíny ]
Pokud existuje near-match:
Nejbližší možnost: Karate, Po 17:30.
49. Custom Events
Custom event musí být first-class action.
Mobile:
＋
Menu:
Kroužek
Vlastní událost
Custom event má stejné vizuální a interaction primitives jako activity event.
50. Home vs Catalog
Home
Personalized.
Catalog
Search/discovery.
Schedule
Planning/output.
Children
Context/configuration.
Tyto role nesmí být zaměňovány.
51. State Persistence
Po návratu z detailu musí zůstat:
selected child
active filters
scroll position
selected category
selected day
search query
Po otočení zařízení musí zůstat:
selected child
filters
opened detail
current day
unsaved form state
52. Loading States
Každá hlavní obrazovka musí mít:
loading
success
empty
error
Skeleton musí zachovávat přibližné rozměry výsledného layoutu.
Nesmí docházet k výraznému layout shiftu.
53. Error UX
Používat:
Kroužky se nepodařilo načíst.
[ Zkusit znovu ]
Nikdy jen:
Error 500
54. Snackbar
Použití:
Basketbal přidán do rozvrhu.
[ Zobrazit ]
nebo:
Basketbal odstraněn.
[ Zpět ]
Snackbar nesmí překrývat bottom navigation ani primary CTA.
55. Safe Area
Bottom UI musí počítat s:
env(safe-area-inset-bottom)
Výška navigace + CTA + safe area musí být zahrnuta do content padding.
56. Sticky Elements
Sticky prvky nesmí překrývat data.
Required bottom padding:
contentBottomPadding =
  navHeight
  + primaryActionHeight
  + safeArea
57. Orientation
Při změně orientation:
zachovat stav
neztratit detail
nezresetovat filtr
nezresetovat scroll
neztratit rozpracovaný formulář
58. Design System Governance
Každá nová UI komponenta musí odpovědět:
Existuje už podobná komponenta?
Lze použít existující token?
Je behavior stejný na všech zařízeních?
Liší se pouze composition?
Je accessibility vyřešena?
Nový vizuální pattern nesmí být zaveden bez důvodu.
59. UX Anti-Patterns
Zakázat:
desktop UI pouze zmenšené na mobile
color-only status
nepojmenované selecty
tiny touch targets
důležité funkce pouze gestem
confirmation dialog pro běžnou vratnou akci
unexplained +1, +2
duplicate session add
obří mobilní category tree
sticky UI zakrývající content
resetování stavu při návratu
více různých button styles bez sémantického důvodu
60. QA — Responsive Matrix
Testovat minimálně:
320 × 568
360 × 800
375 × 812
390 × 844
412 × 915

768 × 1024
820 × 1180
1024 × 768
1180 × 820

1280 × 800
1440 × 900
Kontrolovat:
horizontal overflow
clipped text
overlapping
inaccessible actions
focus issues
modal/sheet behavior
safe-area behavior
orientation persistence
61. QA — Collision Matrix
Automated unit tests:
same start
same end
partial overlap
full containment
reverse containment
adjacent intervals
1-minute gap
multiple overlaps
same session duplicate
different children
custom event + activity
activity + recurring event
travel-buffer conflict
62. QA — Interaction Flow
Flow A — Add available activity
Home
→ What fits?
→ Activity
→ Detail
→ Add
→ Snackbar
→ Schedule updated
Flow B — Add conflicting activity
Search
→ Activity
→ Detail
→ Conflict explained
→ Add anyway
→ Schedule updated
Flow C — Multi-session activity
Activity
→ Select session
→ Session conflict check
→ Add selected session
Flow D — Multiple children
Child A
→ activity
→ switch Child B
→ recommendations and schedule update
63. UX Performance Goals
Target experience:
interaction response feels immediate
no full page reload for filters
no visible layout jump
bottom sheet opens immediately
schedule updates immediately after add
filter result count updates without blocking UI
64. Analytics
Track:
child_selected
search_started
search_submitted
filter_opened
filter_applied
activity_opened
session_selected
activity_added
activity_removed
conflict_detected
conflict_overridden
custom_event_created
recommendation_opened
recommendation_added
schedule_opened
Primary funnel:
Activity viewed
→ Detail opened
→ Session selected
→ Added
→ Schedule retained
65. Success Metrics
Primary:
% users who successfully create a usable schedule
Secondary:
time to first relevant activity
time to first successful add
search → detail conversion
detail → add conversion
conflict rate
conflict override rate
number of backtracks
unnecessary navigations
task completion rate
66. Implementation Priorities
P0 — Required before next UX validation
Design system
 token system
 unified typography
 unified spacing
 unified radius
 unified button system
 unified status system
 accessibility baseline
Mobile IA
 Home
 Kroužky
 Rozvrh
 Děti
 Bottom navigation
 selected child context
Core interaction
 What Fits
 mobile filter sheet
 activity bottom sheet
 session picker
 immediate add feedback
 schedule update
Collision engine
 interval overlap
 boundary handling
 duplicate prevention
 conflict severity
 conflict explanation
 tests
67. P1
 travel buffer
 intelligent empty states
 recommendation explanations
 multiple children
 family conflict
 tablet landscape master-detail
 keyboard/pointer optimization
 advanced accessibility audit
68. P2
 natural language search
 schedule optimization
 preference learning
 travel-aware recommendations
 budget optimization
69. Definition of Done — Design System
Design system je hotový, pokud:
 žádná hlavní komponenta nepoužívá náhodné barvy
 typography odpovídá tokenům
 spacing odpovídá tokenům
 radius odpovídá tokenům
 button hierarchy je konzistentní
 statusy mají jednotnou semantiku
 focus state je jednotný
 všechny interaktivní prvky mají správnou velikost
 komponenty mají accessible names
 není nutné vytvářet device-specific varianty pouze kvůli vizuální nekonzistenci
70. Definition of Done — Mobile
Mobile je hotový, pokud testovací uživatel bez návodu dokáže:
 vybrat dítě
 pochopit dnešní program
 najít vhodnou aktivitu
 pochopit, proč je vhodná
 pochopit kolizi
 vybrat konkrétní session
 přidat ji
 najít ji v rozvrhu
 odstranit ji
 vrátit odstranění
 přepnout dítě
 použít filtry
 vrátit se zpět bez ztráty stavu
71. Definition of Done — Tablet
Tablet je hotový, pokud:
 portrait layout není pouze zvětšený mobile
 landscape layout využívá paralelní kontext
 seznam zůstává dostupný při otevření detailu
 rozvrh může zůstat současně viditelný
 pointer i touch fungují
 keyboard navigation funguje
 orientation change neztratí stav
72. Final Product Rule
Každé UX rozhodnutí musí být možné vysvětlit jednou z těchto vět:
Ušetří to rodiči čas.
nebo:
Sníží to počet rozhodnutí.
nebo:
Zvýší to důvěru v aplikaci.
nebo:
Zlepší to ergonomii konkrétního zařízení.
Pokud neplatí ani jedna, komponenta nebo funkce pravděpodobně nemá být v primárním UX.
73. Final North Star
                 ONE DESIGN SYSTEM
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       MOBILE         TABLET         DESKTOP
          │              │              │
       one-hand       compare         power
       bottom nav     split view      multi-panel
       sheets         persistent      dense
       agenda         context         calendar
          │              │              │
          └──────────────┼──────────────┘
                         │
                  SHARED UX LOGIC
                         │
              CHILD + SCHEDULE + SESSION
                         │
                  CONFLICT ENGINE
                         │
                   RECOMMENDATIONS
Jediný hlavní UX benchmark
Rodič na telefonu jednou rukou, bez návodu a bez přemýšlení nad systémem během několika sekund pochopí, co se jeho dítěti hodí, proč se to hodí, zda to nekoliduje, vybere konkrétní termín a přidá jej do rozvrhu.