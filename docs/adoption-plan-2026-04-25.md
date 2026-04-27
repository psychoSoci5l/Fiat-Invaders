# Adoption Plan

> **Generated**: 2026-04-25
> **Project phase**: Production
> **Engine**: Vanilla JS / Canvas 2D
> **Template version**: v1.0+

Work through these steps in order. Check off each item as you complete it.
Re-run `/adopt` anytime to check remaining gaps.

---

## Step 1: Fix Blocking Gaps

### 1.1 GDD Headings Don't Match Template Format

**Problem**: All 7 GDDs use `## A. Overview` / `## B. Player Fantasy` heading format. Template skills (`/review-all-gdds`, `/create-stories`, `/consistency-check`) scan for exact patterns like `## Overview`, `## Acceptance` and silently find nothing.

**Fix**: Rename headings in-place across all GDDs:
- `## A. Overview` → `## Overview`
- `## B. Player Fantasy` → `## Player Fantasy`
- `## C. Detailed Rules` → `## Detailed Rules`
- `## D. Formulas` → `## Formulas` (where present)
- `## E. Edge Cases` → `## Edge Cases` (where present)
- `## F. Dependencies` → `## Dependencies` (where present)
- `## G. Tuning Knobs` → `## Tuning Knobs` (or similar)
- `## H. Acceptance Criteria` → `## Acceptance Criteria` (where present)

**Time**: 30 min (simple find-and-replace, preserving all existing content)

- [x] arcade-rogue-protocol.md — headings renamed
- [x] boss-proximity.md — headings renamed
- [x] drop-system-apc.md — headings renamed
- [x] enemy-agents.md — headings renamed
- [x] v8-scroller.md — headings renamed
- [x] wave-legacy-arcade.md — headings renamed
- [x] weapon-elementals-godchain.md — headings renamed

---

## Step 2: Fix High-Priority Gaps

### 2.1 Configure Technical Preferences

**Problem**: `.claude/docs/technical-preferences.md` does not exist. Engine, language, rendering, and physics are unconfigured. ADR engine compatibility checks will fail.

**Fix**: Create `.claude/docs/technical-preferences.md` with project details:
- **Engine**: Vanilla JS (Canvas 2D, no framework)
- **Language**: JavaScript (ES6+)
- **Rendering**: Canvas 2D
- **Physics**: Custom 2D collision (spatial-grid)
- Build tooling: None (static files, PWA)

**Time**: 5 min

- [x] `.claude/docs/technical-preferences.md` created

### 2.2 Create Architecture Directory and Seed ADRs

**Problem**: No `docs/architecture/` directory exists. No ADRs, no TR registry, no architecture traceability.

**Fix**: Create the directory and run `/architecture-decision` for key architecture decisions already made in the codebase:
1. Rendering pipeline (Canvas 2D)
2. State machine pattern (`GameStateMachine`)
3. Event bus pub/sub (`EventBus`)
4. Spatial-grid collision (`CollisionSystem`)
5. PWA + service worker architecture
6. Cloudflare Workers leaderboard backend

**Time**: 1 session per ADR (~5-10 min each via `/architecture-decision`)

- [x] `docs/architecture/` directory created
- [x] ADR-0001: GameStateMachine pattern
- [x] ADR-0002: Canvas 2D rendering
- [x] ADR-0003: EventBus pub/sub
- [x] ADR-0004: Spatial-grid collision
- [x] ADR-0005: PWA + service worker
- [x] ADR-0006: Cloudflare Workers leaderboard

### 2.3 Create Engine Reference Docs

**Problem**: No `docs/engine-reference/` directory. ADR engine compatibility checks have no reference to validate against.

**Fix**: Document the browser/Canvas 2D engine constraints:
- Canvas 2D API baseline
- Browser target (modern Chrome/Firefox/Safari)
- PWA manifest requirements

**Time**: 15 min

- [x] `docs/engine-reference/` directory created with baseline docs

---

## Step 3: Bootstrap Infrastructure

### 3a. Register existing requirements (creates tr-registry.yaml)

Run `/architecture-review` — bootstraps the TR registry from existing GDDs and ADRs.

**Time**: 1 session

- [ ] `docs/architecture/tr-registry.yaml` created

### 3b. Create control manifest

Run `/create-control-manifest`

**Time**: 30 min

- [ ] `docs/architecture/control-manifest.md` created

### 3c. Create sprint tracking file

Run `/sprint-plan update`

**Time**: 5 min

- [ ] `production/sprint-status.yaml` created

### 3d. Set authoritative project stage

Run `/gate-check production`

**Time**: 5 min

- [x] `production/stage.txt` written

---

## Step 4: Medium-Priority Gaps — GDD Completeness

### 4.1 Add Missing Sections Per GDD

Several GDDs are missing sections that degrade pipeline quality:

| GDD | Missing Sections |
|---|---|
| boss-proximity.md | Formulas, Edge Cases, Acceptance Criteria |
| drop-system-apc.md | Formulas, Edge Cases, Dependencies, Acceptance Criteria |
| enemy-agents.md | _(none — all sections present)_ |
| wave-legacy-arcade.md | Formulas, Edge Cases, Dependencies, Acceptance Criteria |
| weapon-elementals-godchain.md | Formulas, Edge Cases, Dependencies, Acceptance Criteria |

**Fix options**:
- **Manual**: Add the missing headings and populate from existing code
- **Retrofit**: `/design-system retrofit design/gdd/[filename].md` (may restructure content)

**Time**: ~15-30 min per GDD depending on approach

- [x] boss-proximity.md — missing sections added
- [x] drop-system-apc.md — missing sections added
- [x] enemy-agents.md — already had all sections
- [x] wave-legacy-arcade.md — missing sections added
- [x] weapon-elementals-godchain.md — missing sections added

### 4.2 Systems-Index Status Legend

**Problem**: The systems-index.md status legend uses "Draft" which isn't in the template's valid status list (`Not Started`, `In Progress`, `In Review`, `Designed`, `Approved`, `Needs Revision`).

**Fix**: Update the legend to use `In Progress` instead of `Draft`.

- [x] systems-index.md status legend updated

---

## Step 5: Optional Improvements

- [ ] Add `**Status**` field to GDD headers in template format (currently inline `Status:` without bold markers in some GDDs)
- [ ] Add cross-references between related GDDs (weapon/godchain references wave, drop, and boss systems)
- [ ] Standardize `Tuning Notes and Open Debts` sections to `## Tuning Knobs` format

---

## Completed in Session 1 (2026-04-25)

- ✅ Step 1: All 7 GDD headings renamed to template format
- ✅ Step 2.1: Technical preferences created
- ✅ Step 2.2: 6 ADRs written (docs/architecture/adr-0001 through adr-0006)
- ✅ Step 2.3: Engine reference docs created
- ✅ Step 3d: production/stage.txt written
- ✅ GDD sections: Edge Cases, Dependencies, Acceptance Criteria added to 4 GDDs
- ✅ systems-index.md legend updated (Draft → In Progress)
- ✅ production/review-mode.txt set to lean
- ✅ docs/adoption-plan-2026-04-25.md written and tracked

### Next Session (fresh session recommended)

- `/architecture-review` → bootstraps tr-registry.yaml
- `/create-control-manifest` → creates control manifest
- `/sprint-plan update` → creates sprint-status.yaml
- `/create-stories` → generate stories from approved GDDs

---

## Step 5: Optional Improvements

- [ ] Add `**Status**` field to GDD headers in template format (currently inline `Status:` without bold markers in some GDDs)
- [ ] Add cross-references between related GDDs (weapon/godchain references wave, drop, and boss systems)
- [ ] Standardize `Tuning Notes and Open Debts` sections to `## Tuning Knobs` format

---

## What to Expect from Existing Stories

No stories exist yet, so no migration is needed. Once ADRs and GDDs are in template format, stories can be generated via `/create-stories` from approved GDDs with Acceptance Criteria.

---

## Re-run

Run `/adopt` again after completing Steps 1-3 to verify all blocking and high gaps are resolved. The new run will reflect the current state of the project.
