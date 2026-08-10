---
applyTo: ".github/specs/**/*.md,CHANGELOG.md,docs/backlog.md,docs/backlog-guideline.md,packages/domain/package.json"
---

# Development process — spec, backlog, changelog & SOTA workflow

How we design, track, ship, and record every change to **Krouzky Planner** —
the engine `@krouzky/domain` (`packages/domain`) and the app `@krouzky/web` (`apps/web`).
This is the **process contract**. The rules it references live in their own files:

- Backlog how-to → [docs/backlog-guideline.md](../../docs/backlog-guideline.md)
- Living backlog → [docs/backlog.md](../../docs/backlog.md)
- Shipped history → [CHANGELOG.md](../../CHANGELOG.md)
- Coding rules → [.github/docs/copilot-instructions.md](../docs/copilot-instructions.md)
- Product & design specs → [.github/docs/](../docs/) (00–08)

---

## 1. Source-of-truth chain (never mix these)

| Artifact | Role | Changes |
|---|---|---|
| **spec** `.github/specs/design_review_<n>.md` | the design + decision + non-goals | per change |
| **CHANGELOG.md** | shipped history keyed by `CHANGE-<id>` | on ship |
| **docs/backlog.md** | living list of deferred work (`BL-<NNN>`) | every release |
| **docs/backlog-guideline.md** | the backlog *convention* | rarely |
| **packages/domain/package.json** `version` | the released engine version | on ship |
| **/memories/repo/** | agent know-how / gotchas (not user-facing) | as learned |

**Golden rule:** a decision *not to do X now* → spec `§3 Non-goals`; if X should happen later → a
`BL-<NNN>` row; when you actually do X → new spec + `CHANGE-<id>` + CHANGELOG + version bump, then flip
the `BL-` row to `done`. Nothing lives only in someone's head.

---

## 2. The change lifecycle (every non-trivial change)

```
idea / bug / backlog pickup
   └─ 1. SPEC      write design_review_<n>.md, assign CHANGE-<id>
       └─ 2. BUILD  implement in packages/ or apps/ (follow coding rules)
           └─ 3. TEST   eslint + tsc --noEmit + vitest all green
               └─ 4. RECORD  CHANGELOG entry + version bump + backlog sync
                   └─ 5. SHIP  branch → PR → review → merge
```

Docs-only or trivial fixes may skip the spec but **still** get a CHANGELOG entry. Never ship engine
behaviour changes without a spec + `CHANGE-<id>`.

---

## 3. Writing a spec (`design_review_<n>.md`)

**Name:** next free integer `n` in `.github/specs/` — never reuse or renumber.
**Assign:** one new `CHANGE-<id>` (highest existing + 1; monotonic, never recycled).

Required sections, in order:

```md
# Design Review <n> — <short imperative title>

**Status:** DRAFT | IMPLEMENTED
**Change ID:** CHANGE-<id> (one-line what + scope: engine `@krouzky/domain` / app `@krouzky/web` / docs-only)
**Date:** YYYY-MM-DD
**Repo:** monorepo `Children_schedule` (note which package(s) it touches)
**Trigger:** why this change exists (the problem, in 1–3 sentences)

## 0. SOTA analysis      # 0.1 Problem · 0.2 Approach — why this design over alternatives
## 1. Requirements       # FR-1, FR-2, … numbered, testable functional requirements
## 2. Acceptance criteria# AC-1, AC-2, … each maps to an FR and to a test
## 3. Non-goals / notes  # what we deliberately do NOT do; tracked items → "(tracked as BL-<NNN>)"
```

Rules:
- Every `FR-<n>` is **testable**; every `AC-<n>` names the test or command that proves it.
- `§3 Non-goals` is mandatory. Each "we won't do X now" bullet that should happen later must cite its
  `BL-<NNN>`. Each deferred decision is a candidate backlog row.
- Flip `Status: DRAFT → IMPLEMENTED` only when tests are green and the change is merged.
- Higher-numbered spec wins on conflict (delta model: each spec is a delta on the prior design).

---

## 3A. Turning an analysis into precise spec-dev instructions (+ the generation prompt)

This is the meta-step. A separate tool analyzes code/behaviour and produces an **analysis**. Using
**this guideline** you convert that analysis into a **precise instruction package for a spec-dev
document** — not "how to change the code", but an unambiguous, complete brief that a Copilot session
(fed this guideline) can turn into a correct `design_review_<n>.md`.

```
analysis (other tool)  ─►  spec-dev INSTRUCTIONS (written per this guideline)  ─►  upload to Copilot
                                                                                      + the PROMPT below
                                                                                          ▼
                                                                          design_review_<n>.md
```

### What "precise instructions for spec dev" must contain

The instruction package is the single source Copilot reads. It is complete only when every field below
is filled from the analysis — Copilot should never have to guess:

1. **Title + intent** — one imperative line describing the change.
2. **Scope** — engine vs docs-only (this fixes the `Change ID` line and the version-bump decision).
3. **IDs to assign** — next free spec number `n` and next free `CHANGE-<id>` (state the current highest
   of each so Copilot increments deterministically).
4. **Prior-spec anchors** — the highest-numbered `design_review_<m>.md` this deltas, plus every
   `CHANGE-<id>` / `BL-<NNN>` the analysis touches, closes, or supersedes.
5. **Tasks → requirements** — each analyzed task written as a directive that maps to a testable
   `FR-<n>` ("the engine MUST …"), with the exact observable proof that becomes its `AC-<n>`
   (a named test or command).
6. **Chosen solution + rejected alternative** — per task, so Copilot can fill `## 0. SOTA analysis`
   with a real justification, not a restatement.
7. **Non-goals / deferrals** — what stays out, and any new deferral that needs a candidate `BL-<NNN>`.

Write these as **imperatives and facts**, not prose. If a task has no verifiable proof, the analysis is
not ready — refine it before writing the instructions. Reference prior design; never re-describe it.

### The prompt (upload the instructions + this guideline to Copilot, then send)

```text
You are authoring a spec-dev document for Krouzky Planner (engine `@krouzky/domain`,
app `@krouzky/web`).

Follow `.github/instructions/dev-process.instructions.md` §3 exactly for the file
structure, and treat the attached SPEC-DEV INSTRUCTIONS as the authoritative brief.

Produce ONE new file `.github/specs/design_review_<n>.md` (use the spec number and
CHANGE-<id> given in the brief) with the required sections in order:
  - header block (Status: DRAFT, Change ID, Date, Repo, Trigger)
  - ## 0. SOTA analysis        → 0.1 Problem, 0.2 Approach; justify each solution
                                  against its rejected alternative from the brief
  - ## 1. Requirements         → one testable FR-<n> per task in the brief
  - ## 2. Acceptance criteria  → one AC-<n> per FR, each naming the test/command
  - ## 3. Non-goals / notes    → the brief's deferrals; add candidate BL-<NNN> where noted

Rules:
  - This is a DELTA on the prior spec(s) named in the brief: restate only what changes,
    and reference settled design as "supersedes design_review_<m>.md §X (CHANGE-<id>)"
    instead of copying it.
  - If a task closes a backlog item, write "Closes BL-<NNN>".
  - Do not invent IDs, tests, or decisions not present in the brief. If something is
    missing, list it under a "NEEDS INPUT" note instead of guessing.

Output only the spec file content.
```

### Definition of done for the instructions (before you hand them to Copilot)

- [ ] Scope, spec number `n`, and `CHANGE-<id>` are stated (with the current highest of each).
- [ ] Every task is a directive with a paired, named verification (future FR + AC).
- [ ] Each solution carries its rejected alternative (feeds a real `## 0. SOTA analysis`).
- [ ] Prior spec(s) and touched `CHANGE-<id>` / `BL-<NNN>` are named as the delta base.
- [ ] Non-goals + any new `BL-<NNN>` deferrals are listed.
- [ ] Nothing requires Copilot to guess — gaps are marked, not left implicit.

---

## 4. Backlog (`BL-<NNN>`) — defer consciously

Full rules in [docs/backlog-guideline.md](../../docs/backlog-guideline.md); the essentials:

- **One `type`** per row: `tech-debt` · `optimization` · `limitation` · `deferred-bug`.
- **Mandatory `origin`** back-link (`CHANGE-<id>` / spec `§3` / PR #).
- A **shipping-blocking or user-facing defect is NEVER a backlog row** — it gets a spec + `CHANGE-<id>`
  + fix + CHANGELOG now.
- Stable, monotonic `BL-<NNN>` id — never reuse, renumber, or delete. Shipped items stay with
  `status: done` as the audit trail.
- Pick up an item: `open → in-progress`, write a spec + new `CHANGE-<id>`, implement, then `done` on
  merge with the closing `CHANGE-<id>`.

---

## 5. CHANGELOG — the shipped record

Keep-a-Changelog style, newest on top. Two zones:

- **`## [Unreleased]`** — accumulate entries here while unshipped.
- **`## [x.y.z] - YYYY-MM-DD`** — on release, promote `[Unreleased]` under the new version header.

Each entry:

```md
### <human title> (CHANGE-<id>)
<what changed + why (root cause) + scope>. Note engine vs docs-only. End with the
spec reference and the test verdict.
- Spec: `.github/specs/design_review_<n>.md`. Closes **BL-<NNN>** (if any).
  `eslint` + `tsc --noEmit` + `vitest` green.
```

Rules:
- Every `CHANGE-<id>` that ships appears exactly once. The id ties spec ↔ code ↔ CHANGELOG.
- State scope explicitly: **engine change** (bump version) vs **docs/process only** (no bump).
- If it closes a backlog item, say `Closes BL-<NNN>` and flip the row to `done`.

---

## 6. Versioning (SemVer-ish, single source)

- The engine version lives in [packages/domain/package.json](../../packages/domain/package.json)
  `version` and is echoed in the CHANGELOG header.
- Bump **only** for an engine (`@krouzky/domain`) change: PATCH for fixes, MINOR for features, MAJOR
  for breaking behaviour. App-only (`apps/web`) and docs/process-only changes **do not** bump the engine.
- Bump at ship time; tag the release `vX.Y.Z`.

---

## 7. Quality gates (must pass before merge)

```bash
pnpm -C packages/domain test        # vitest — full suite green
pnpm -C packages/domain typecheck   # tsc --noEmit — clean
pnpm -C apps/web typecheck          # tsc --noEmit — clean
pnpm -C packages/domain lint        # eslint — clean (incl. the domain-purity rule)
```

- No merge with a red gate. New behaviour ships with tests that map back to the spec's `AC-<n>`.
- Keep the domain pure and deterministic (see `.github/docs/copilot-instructions.md`): no React/DOM/
  network/LLM imports, no `Math.random()` / `Date.now()` inside the domain — the current date/time is
  always a parameter.

---

## 8. Ship (branch → PR → merge)

- Branch name: `topic/<domain>/task/<id>-<kebab-description>` (or `change-<id>-<slug>` for engine work).
- PR body states: **Problem · Root cause · Fix · Changes · Verification · Unchanged** (mirror the spec).
- Assign a reviewer. Merge only with green gates + review.
- After merge: set spec `Status: IMPLEMENTED`, flip any `BL-<NNN>` to `done`, record repo know-how in
  `/memories/repo/` if it's a reusable gotcha.

---

## 9. Do / Don't

**Do**
- One `CHANGE-<id>` per shippable change; thread it through spec → code → CHANGELOG.
- Fill `§3 Non-goals`; link both ways (spec `§3` ↔ `BL-<NNN>`).
- Record field defects with evidence before deferring or fixing.

**Don't**
- Don't ship engine behaviour without a spec + `CHANGE-<id>`.
- Don't park a blocking / user-facing bug as `deferred-bug`.
- Don't renumber or reuse `CHANGE-<id>`, `BL-<NNN>`, or spec numbers.
- Don't bump the version for docs-only changes.
- Don't turn a backlog `note` or CHANGELOG entry into an essay — analysis belongs in the spec.
