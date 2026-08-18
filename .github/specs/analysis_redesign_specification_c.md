# Children Schedule — Mobile & Tablet UX Redesign Specification

**Status:** Proposed  
**Scope:** Mobile + Tablet UX redesign  
**Priority:** P0 / P1 / P2  
**Target:** State-of-the-art, mobile-first family activity planner  
**Reference:** https://children-schedule-web.vercel.app

---

## 1. Product Goal

Transform the application from a **children's activity catalog** into an **intelligent family schedule planner**.

### Current mental model

> Search → filter → inspect activity → add to schedule

### Target mental model

> Select child → understand availability → discover suitable activities → detect conflicts → add to schedule

The application should answer the parent's primary question:

> **"What activities are suitable for my child and actually fit into our week?"**

The redesign should **not primarily add functionality**. It should reorganize the existing functionality around the parent's decision-making process.

---

# 2. UX Principles

## P0 — Core principles

1. **Mobile is not a scaled-down desktop.**
2. **The child is the primary context.**
3. **The schedule is the primary product output.**
4. **Activities are recommendations, not merely search results.**
5. **Conflicts are explained, not silently prevented.**
6. **Progressive disclosure reduces cognitive load.**
7. **Every important action should be obvious without instructions.**
8. **The user always retains control.**
9. **No critical functionality should depend exclusively on gestures.**
10. **Accessibility is a core requirement, not a post-launch enhancement.**

---

# 3. Target Information Architecture

## Mobile navigation

Use persistent bottom navigation:

```text
┌─────────────────────────────────┐
│                                 │
│           PAGE CONTENT          │
│                                 │
├─────────────────────────────────┤
│  🏠       🔎       📅       👨‍👩‍👧  │
│ Domů    Kroužky   Rozvrh    Děti │
└─────────────────────────────────┘
```

### Tabs

| Tab | Purpose |
|---|---|
| Domů | Personalized overview and recommendations |
| Kroužky | Search, filtering and discovery |
| Rozvrh | Weekly schedule and conflicts |
| Děti | Children, ages, preferences and settings |

---

# 4. Home Screen

## Objective

The home screen must answer:

1. Who am I planning for?
2. What is happening today?
3. What does the week look like?
4. What activities fit?
5. What requires attention?

## Proposed structure

```text
Ahoj 👋

Matěj · 9 let ▼

TODAY

16:30
🏀 Basketbal

THIS WEEK

Po   2 activities
Út   1 activity
St   Volno
Čt   1 activity

WHAT FITS?

3 activities fit your schedule

🏀 Basketbal
Po 16:30
✓ Bez kolize

🥋 Karate
Po 17:30
✓ Bez kolize

[ Zobrazit všechny ]
```

## Requirements

- Active child must always be visible.
- Child selector must be accessible from Home.
- Today should be prioritized over generic catalog content.
- Recommendations should be contextualized.
- "What fits?" should become a primary CTA.
- Avoid showing the entire activity catalog on Home.

---

# 5. Child Context

## Child selector

Example:

```text
👦 Matěj · 9 let ▼
```

If multiple children exist:

```text
Vybrat dítě

● Matěj · 9 let
○ Anička · 7 let
```

Changing child must update:

- recommended activities
- age compatibility
- schedule
- conflict detection
- available activities
- relevant empty states

## Requirement

Age must not remain only a global filter.

It must become a property of the selected child.

---

# 6. Activity Discovery

## Mobile

The activity list should prioritize scanability.

### Activity card

```text
┌──────────────────────────────┐
│ 🏀 Basketbal — přípravka     │
│                              │
│ Po 16:30–17:30               │
│ 8–11 let                     │
│                              │
│ 100 Kč / měsíc               │
│ 📍 DDM Rakovník              │
│                              │
│ ✓ Bez kolize                 │
│                              │
│ + Přidat                     │
└──────────────────────────────┘
```

## Primary information

Show immediately:

- activity name
- day
- time
- age range
- price
- location
- compatibility/conflict status
- primary action

## Secondary information

Move into detail:

- organization
- category hierarchy
- additional terms
- long descriptions
- metadata

---

# 7. Progressive Disclosure

Cards must use three information levels.

## Level 1 — List

Show only decision-critical information:

```text
Name
Time
Age
Price
Location
Compatibility
```

## Level 2 — Detail

Show:

```text
Organization
All available terms
Full category
Additional information
Conflict explanation
```

## Level 3 — Secondary metadata

Show only on demand:

```text
Additional notes
Administrative details
Data provenance
```

---

# 8. Additional Activity Terms

Current notation such as:

```text
Po 16:30 · +1
```

is ambiguous.

Replace with:

```text
Po 16:30
+ 1 další termín
```

Tapping it opens:

```text
Další termíny

Po 16:30–17:30
St 15:30–16:30
```

Requirements:

- Never use unexplained `+1`, `+2` notation.
- Additional terms must be tappable.
- Each term must have its own conflict state.

---

# 9. Activity Detail — Mobile

Use a **bottom sheet** rather than a full-page navigation whenever possible.

```text
┌──────────────────────────────┐
│            ───               │
│                              │
│ Basketbal — přípravka        │
│                              │
│ 8–11 let                     │
│                              │
│ 🗓 Po 16:30–17:30            │
│ + 1 další termín             │
│ 📍 DDM Rakovník              │
│ 💰 100 Kč / měsíc            │
│                              │
│ ──────────────────────────── │
│                              │
│ Matěj · 9 let                │
│ ✓ Věk odpovídá               │
│ ✓ Bez časové kolize          │
│                              │
│ [ Přidat do rozvrhu ]        │
└──────────────────────────────┘
```

## Interaction

- Tap card → open bottom sheet.
- Swipe down → close.
- Back button → close.
- Primary CTA remains visible.
- CTA must provide immediate feedback.

---

# 10. Add to Schedule

Adding an activity should be a one-step operation.

### Before

```text
[ + Přidat ]
```

### After

```text
✓ Přidáno do Matějova rozvrhu

[ Zobrazit rozvrh ]
```

Use snackbar/toast feedback.

Do not use confirmation dialogs for ordinary additions.

---

# 11. Undo

For reversible actions:

```text
Basketbal odstraněn

[ ZPĚT ]
```

Avoid:

```text
Opravdu chcete odstranit?

[Zrušit] [Ano]
```

Confirmation dialogs should be reserved for destructive operations such as deleting a child or permanently deleting data.

---

# 12. Filtering

## Mobile

Filters should open as a dedicated bottom sheet/full-height sheet.

```text
Filtry                         Vymazat vše

DÍTĚ
Matěj · 9 let

KDY
[Po] [Út] [St] [Čt] [Pá]

KATEGORIE
Sport
Umění
Hudba
Věda

CENA
0 Kč ───────── 500 Kč

KOLIZE
○ Vše
● Pouze volné
○ Včetně konfliktních

──────────────────────────────

[ Zobrazit 12 kroužků ]
```

## Requirements

- Show active filter count.
- Example: `Filtry · 3`
- Sticky bottom CTA.
- CTA must contain result count.
- "Vymazat vše" must be easy to find.
- Do not force users to scroll to discover the Apply button.

---

# 13. Day Filter

Use compact segmented controls:

```text
[Po] [Út] [St] [Čt] [Pá]
```

Weekend may be placed in an additional horizontal scroll or secondary control.

Requirements:

- Selected state must be unmistakable.
- Do not rely solely on color.
- Buttons must have minimum 44×44 px touch area.

---

# 14. Categories

Avoid showing the entire category hierarchy simultaneously on mobile.

## Level 1

```text
Sport
Umění
Hudba
Věda
Technologie
Příroda
Hry
```

Tap:

```text
Sport

Míčové sporty
Atletika
Bojové sporty
Gymnastika
```

Tap again to see activities.

## Requirements

- One hierarchy level visible at a time.
- Provide back navigation.
- Avoid "Expand all" on mobile.
- Preserve category selection when navigating back.

---

# 15. Remove/Deprioritize "Expand All"

Current functionality:

```text
Rozbalit vše
Sbalit vše
```

### Mobile

Remove from primary UI.

### Tablet/Desktop

May remain available as a power-user action.

Reason:

Expanding all categories creates excessive vertical content and increases cognitive load.

---

# 16. Search

Search should become a primary discovery mechanism.

## Basic

```text
🔎 Hledat kroužek...
```

## Search should support

- activity name
- category
- organization
- location

Potential future enhancement:

```text
sport pondělí
```

→ interpret as:

```text
category = sport
day = Monday
```

Do not require AI for the first implementation.

---

# 17. Personalized Recommendations

"Recommendations" should not behave like another generic section.

## Primary component

```text
Co se hodí Matějovi?

3 možnosti bez kolize

🏀 Basketbal
Po 16:30
100 Kč / měsíc
✓ věk
✓ volno

🥋 Karate
Po 17:30
108 Kč / měsíc
✓ věk
✓ volno
```

## Recommendation explanation

Every recommendation should be explainable.

Example:

```text
Proč doporučeno?

✓ Věk 9 let odpovídá
✓ Pondělí je volné
✓ Cena je pod limitem
✓ Žádná časová kolize
```

Do not use opaque:

> "Doporučeno pro vás"

without explanation.

---

# 18. "What Fits?" — Primary Product Feature

Introduce a dedicated action:

```text
[ Najít, co se vejde ]
```

The system should evaluate:

- child's age
- existing schedule
- selected days
- time availability
- category preference
- price limit
- conflicts

Output:

```text
Pro Matěje jsme našli 4 možnosti.

🥇 Basketbal
Po 16:30
✓ bez kolize

🥈 Karate
Po 17:30
✓ bez kolize

🥉 Atletika
Út 15:00
⚠ nad rozpočet
```

---

# 19. Conflict Engine

Conflict handling is a P0 feature.

## Conflict types

### Green — Available

```text
✓ Bez kolize
```

### Yellow — Tight transition

```text
⚠ Těsná návaznost
```

### Red — Time conflict

```text
⚠ Kolize s Fotbalem
```

Do not use color as the only signal.

---

# 20. Conflict Rules

At minimum test:

| A | B | Expected |
|---|---|---|
| 16:00–17:00 | 16:00–17:00 | Conflict |
| 16:00–17:00 | 16:30–17:30 | Conflict |
| 16:00–18:00 | 16:30–17:00 | Conflict |
| 16:30–17:00 | 16:00–18:00 | Conflict |
| 16:00–17:00 | 17:00–18:00 | No time overlap |
| 16:00–17:00 | 17:01–18:00 | No overlap |
| same activity/term | same activity/term | Conflict/duplicate prevention |
| different children | same time | No conflict |
| recurring event | recurring activity | Evaluate every occurrence |

---

# 21. Boundary Conditions

The conflict algorithm must define explicitly whether:

```text
A ends at 17:00
B starts at 17:00
```

is:

- no time overlap
- tight transition

Recommended:

```text
0 min gap = Tight
> configured travel buffer = OK
```

Do not leave this behavior ambiguous.

---

# 22. Travel Time

Introduce optional setting:

```text
Minimální čas na přesun

[ 0 min ]
[ 10 min ]
[ 15 min ]
[ 20 min ]
```

Example:

```text
Basketbal
16:00–17:00
📍 Rakovník

Karate
17:00–18:00
📍 Nové Strašecí

⚠ Nestíháte přesun
```

This is a future P1 feature.

---

# 23. Conflict Override

A conflict should inform, not necessarily block.

Example:

```text
⚠ Kolize s Fotbalem
16:00–17:00

[ Přidat i tak ]
```

The parent must retain final control.

---

# 24. Schedule

The schedule is the core product output.

## Mobile

Use a weekly view with strong temporal hierarchy.

```text
<   Tento týden   >

PO 18
━━━━━━━━━━━━━━━━

15:00
Škola

16:30
🏀 Basketbal

17:30
🏠 Domů

ÚT 19
━━━━━━━━━━━━━━━━

16:00
⚽ Fotbal
```

## Requirements

- Current day visually emphasized.
- Current time indicator.
- Conflict indicators visible directly in schedule.
- Easy access to event detail.
- Fast edit action.

---

# 25. Event Editing

On mobile, do not make drag-and-drop the primary interaction.

Primary:

```text
Tap event

Upravit

Den
[ Po ▼ ]

Čas
[ 16:30 ▼ ]

[ Uložit ]
```

Drag-and-drop may remain as an optional enhancement.

---

# 26. Drag & Drop

## Tablet/Desktop

Recommended.

## Mobile

Optional only.

Requirements:

- Must not interfere with scrolling.
- Must provide clear drag target.
- Must provide immediate conflict feedback.
- Must have accessible non-drag alternative.

---

# 27. Custom Events

Current "Vlastní událost" should become a first-class action.

Mobile:

```text
＋
```

Options:

```text
Přidat

Kroužek
Vlastní událost
```

Example:

```text
Škola

Po–Pá
08:00–13:00
```

Once added, activity recommendations should automatically recalculate.

---

# 28. Empty States

Never show only:

```text
0 výsledků
```

Instead:

```text
Nic přesně nevyhovuje.

Můžeme zkusit:

[ + 1 den ]
[ + 100 Kč ]
[ Zrušit filtr kolize ]
```

If a near-match exists:

```text
Nejbližší možnost:

Karate
Čt 17:30
108 Kč

[ Zobrazit ]
```

---

# 29. Price Handling

Current states such as:

```text
Cena neuvedena
```

must be treated as a valid data state, not an error.

Display:

```text
Cena neuvedena
```

or:

```text
Cena — zjistit u organizátora
```

## Filtering behavior

Define explicitly whether unknown prices:

- are excluded from price filters,
- remain included,
- or are shown separately.

Recommended:

> Include them, but mark them as unknown.

---

# 30. Price Normalization

Standard display:

```text
100 Kč / měsíc
```

Avoid inconsistent abbreviations where possible.

Future enhancement:

```text
≈ 1 200 Kč / rok
```

only when calculation is valid from source data.

---

# 31. Age Compatibility

Use human-readable explanation.

Instead of only:

```text
Vhodné pro věk 9
```

show:

```text
✓ Věk odpovídá

Doporučený věk: 8–11 let
Matějovi je 9 let.
```

This increases trust in automatic filtering.

---

# 32. Tablet Layout

Tablet should use a three-column or adaptive master-detail layout.

```text
┌─────────────┬────────────────────┬──────────────────┐
│ FILTRY      │ KROUŽKY            │ DETAIL           │
│             │                    │                  │
│ Věk 9       │ Basketbal          │ Basketbal        │
│ Po          │ Karate             │                  │
│ Sport       │ Atletika           │ Po 16:30         │
│             │                    │ ✓ Bez kolize     │
│             │                    │                  │
│             │                    │ [ Přidat ]       │
└─────────────┴────────────────────┴──────────────────┘
```

## Tablet requirements

- Do not navigate away from list when opening detail.
- Keep schedule/context visible where space permits.
- Support keyboard navigation.
- Support pointer and touch.
- Adapt column widths responsively.
- Preserve selected item when resizing.

---

# 33. Persistent Context

When choosing activities, users should be able to see their current schedule without navigating away.

Example:

```text
Kroužky                         Matějův týden

Basketbal                      Po
Karate                         16:30 Basketbal
Atletika
                               Út
                               16:00 Fotbal
```

This enables immediate visual conflict detection.

---

# 34. Accessibility

Minimum requirements:

- Touch targets ≥ 44×44 px.
- WCAG-compliant contrast.
- Keyboard navigation.
- Visible focus states.
- Screen-reader labels.
- Logical heading hierarchy.
- Semantic buttons/links.
- No color-only state indication.
- Reduced-motion support.
- Text scaling without layout breakage.
- Accessible alternatives to drag-and-drop.

---

# 35. Gesture Requirements

Supported optional gestures:

- swipe down → close bottom sheet
- long press → contextual action
- swipe between schedule days
- optional drag → move schedule event

Rules:

- No critical function may be gesture-only.
- Gestures must not conflict with scrolling.
- Gesture feedback must be immediate.
- Provide conventional buttons as alternatives.

---

# 36. Responsive Breakpoints

Recommended conceptual breakpoints:

```text
< 768 px
Mobile

768–1199 px
Tablet

≥ 1200 px
Desktop
```

Exact breakpoint values may be adjusted based on the existing CSS architecture.

The important requirement is that responsive behavior must be **layout-driven**, not simply width-driven.

---

# 37. Mobile Layout Rules

Mobile must prioritize:

1. selected child
2. current schedule
3. recommendations
4. search
5. filters
6. activity results
7. secondary metadata

Avoid:

- multi-column tables
- persistent desktop sidebars
- large expanded category trees
- excessive metadata
- tiny controls
- horizontal overflow

---

# 38. Tablet Layout Rules

Tablet should prioritize:

1. context
2. activity list
3. schedule
4. detail

Use available screen width to avoid unnecessary navigation.

Recommended pattern:

```text
Master list + detail + contextual schedule
```

---

# 39. QA / Functional Test Matrix

## Child

- [ ] Create child
- [ ] Edit child
- [ ] Delete child
- [ ] Change selected child
- [ ] Switch between multiple children
- [ ] Verify all recommendations update
- [ ] Verify all conflicts update
- [ ] Verify age filtering updates

## Activity

- [ ] Open activity
- [ ] Open activity detail
- [ ] Show all terms
- [ ] Add activity
- [ ] Remove activity
- [ ] Undo removal
- [ ] Add activity with no conflict
- [ ] Add activity with conflict
- [ ] Add activity with tight transition

## Search

- [ ] Search exact activity
- [ ] Search partial activity
- [ ] Search category
- [ ] Search organization
- [ ] Search location
- [ ] Empty search
- [ ] No results
- [ ] Near-match results

## Filters

- [ ] Age
- [ ] Child
- [ ] Day
- [ ] Category
- [ ] Price
- [ ] Conflict
- [ ] Multiple simultaneous filters
- [ ] Clear all filters
- [ ] Filter count
- [ ] Result count
- [ ] Filter persistence

## Schedule

- [ ] Create custom event
- [ ] Edit event
- [ ] Delete event
- [ ] Move event
- [ ] Detect overlap
- [ ] Detect boundary condition
- [ ] Detect recurring conflict
- [ ] Recalculate after activity removal
- [ ] Recalculate after child switch

---

# 40. Collision QA Matrix

Mandatory automated tests:

```text
same start
same end
partial overlap
full containment
reverse containment
adjacent events
1-minute gap
multiple simultaneous events
recurring events
different children
different locations
custom event + activity
activity + activity
activity + school
activity + travel buffer
```

Conflict detection should be implemented as deterministic business logic and covered by unit tests.

---

# 41. Performance Requirements

Target:

- First meaningful render: fast on mid-range mobile.
- No visible layout shift when filters/results load.
- Bottom sheet open animation should feel immediate.
- Schedule interactions should update without full-page reload.
- Filter changes should feel instantaneous for local data.
- Avoid unnecessary rerenders of the entire activity list.

If the dataset grows significantly, use:

- virtualization
- memoized filtering
- debounced search
- cached derived schedule state

where appropriate.

---

# 42. State Management

Derived state should be deterministic.

Recommended conceptual model:

```text
Children
    ↓
Selected child
    ↓
Existing schedule
    ↓
Filters
    ↓
Available activities
    ↓
Compatibility
    ↓
Conflict detection
    ↓
Recommendations
```

Do not duplicate derived values in multiple independent UI states.

---

# 43. UX State Model

Every major component should define:

```text
default
loading
empty
error
success
disabled
conflict
warning
```

Example activity:

```text
✓ Available
⚠ Tight
⚠ Conflict
＋ Not added
✓ Added
```

---

# 44. Error Handling

Errors must be human-readable.

Avoid:

```text
Error 500
```

Prefer:

```text
Kroužky se nepodařilo načíst.

[ Zkusit znovu ]
```

If cached data is available:

```text
Zobrazuji poslední dostupná data.
```

---

# 45. Analytics

Recommended events:

```text
child_created
child_selected
activity_search
filter_opened
filter_applied
activity_opened
activity_added
activity_removed
conflict_detected
conflict_overridden
custom_event_created
recommendation_clicked
recommendation_added
schedule_opened
```

Critical funnel:

```text
Activity viewed
        ↓
Activity detail opened
        ↓
Activity added
        ↓
Conflict?
        ↓
Schedule retained
```

---

# 46. UX Success Metrics

Primary metrics:

### Discovery

- Time to first relevant activity
- Search → activity open conversion
- Recommendation → activity conversion

### Scheduling

- Time to create usable weekly schedule
- Activities added per session
- Conflict rate
- Conflict override rate

### Usability

- Task completion rate
- Error rate
- Backtracking rate
- Number of unnecessary navigations

### Product value

Most important metric:

> **Percentage of users who successfully build a usable schedule.**

---

# 47. P0 Implementation Backlog

## P0.1 Mobile architecture

- [ ] Implement mobile-specific navigation
- [ ] Add bottom navigation
- [ ] Introduce selected child context
- [ ] Redesign Home

## P0.2 Activity discovery

- [ ] Simplify activity cards
- [ ] Implement progressive disclosure
- [ ] Replace `+1/+2` with explicit additional terms
- [ ] Implement mobile filter sheet
- [ ] Improve search

## P0.3 Activity detail

- [ ] Implement mobile bottom sheet
- [ ] Add compatibility explanation
- [ ] Add conflict explanation
- [ ] Add one-tap add action
- [ ] Add immediate success feedback

## P0.4 Schedule

- [ ] Redesign mobile weekly schedule
- [ ] Add visible conflict states
- [ ] Improve event editing
- [ ] Add undo

## P0.5 Tablet

- [ ] Implement master-detail layout
- [ ] Persistent activity list
- [ ] Persistent detail
- [ ] Contextual schedule

---

# 48. P1 Backlog

- [ ] Multiple children
- [ ] Travel time
- [ ] Intelligent empty states
- [ ] Smart recommendation ranking
- [ ] Recommendation explanations
- [ ] Advanced search interpretation
- [ ] Tablet drag & drop
- [ ] Advanced accessibility
- [ ] Performance optimization for large datasets

---

# 49. P2 Backlog

- [ ] Natural-language activity search
- [ ] Automated schedule optimization
- [ ] "Find best options" assistant
- [ ] Preference learning
- [ ] Travel-aware optimization
- [ ] Budget optimization

---

# 50. Final Product Direction

The application should evolve from:

> **Children's activity catalog**

into:

> **Personalized family activity planner**

The key UX transformation is:

```text
CURRENT

Search
 ↓
Filter
 ↓
Browse
 ↓
Choose
 ↓
Add


TARGET

Child
 ↓
Availability
 ↓
Preferences
 ↓
Recommendations
 ↓
Conflict detection
 ↓
Choose
 ↓
Schedule
```

The redesign should prioritize **clarity, speed, confidence and context** over the number of visible features.

The ideal user experience is:

> **"I selected my child, immediately saw what fits, understood why it fits, added it with one tap, and instantly saw my updated week."**

That should be the benchmark for every mobile and tablet UX decision.