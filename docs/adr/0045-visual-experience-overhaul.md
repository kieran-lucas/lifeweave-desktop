# ADR 0045 — Visual experience overhaul (Quiet Luminous Atlas)

## Status

Accepted and activated for Task 51 / Slice 041 from explicit Product Owner activation baseline
`43d0d1e822336c97527f85e1ab154fc74a61f058`.

Task 51 is a **presentation slice**. It changes no schema, no migration, no domain rule, no IPC
contract and no Rust product code, so under the Task 40 and Task 50 precedent it does not advance
`latest_feature_task`, which stays at 49 with checkpoint
`7622db3d8b2b42d69c8f497b6899c5be82e9f9a9`.

### Authorization and the contradiction it resolves

`START_HERE.md`, `docs/STATUS.md` and `specs/040-global-layout-system/README.md` each record
"Task 51: prohibited, unstarted, unallocated, and unrecommended". That was the correct state at
Task 50 closure, whose ADR deferred art direction "to a later Product Owner gate".

The Task 51 activation prompt is that gate: an explicit later Product Owner decision, which
`AI_CONSTITUTION.md` §1 ranks above the files above. Per the same section the contradiction is
**reported rather than silently reconciled** — it is recorded here, in
`docs/audits/task-51-visual-baseline.md` §6.3, and the three files are updated by this activation
rather than left to disagree with the ledger.

## Context

Task 50 gave Lifeweave exactly one geometry authority and proved it: at the canonical maximized
viewport of 1536 × 794 the application has zero document overflow, zero viewport overflow and zero
semantic spacing collisions across 24 audited screens. It also said, explicitly and correctly, that
the application would still look plain, because "decorating a broken layout was the failure mode
this ADR exists to prevent".

The layout is no longer broken. What remains is that Lifeweave has **no visual system at all**.
Measured at this baseline across `frontend/src`:

```text
CSS custom properties in the whole design system   13
distinct borderRadius values                       31
distinct boxShadow values                          14
distinct hardcoded hex colours in features/*       29   (87 occurrences)
editorial type scale                                0
motion vocabulary                                   0
icon vocabulary                                     0   (destinations render their first letter
                                                        in a filled grey square)
```

This is structurally the same defect Task 50 fixed one layer down — many private answers to one
question — and it produces the same class of incoherence. Life Browse renders a filled rounded
container holding four navigation buttons, floated above a white card with a 24 px radius and a
large shadow, which itself contains a second card with its own shadow. A populated Today row places
outlined metadata chips inside a row that already carries a bottom hairline.

The Product Owner has supplied a single visual target, **Lifeweave Visual Baseline v1**, and has
stated that fidelity to it outranks preserving the current composition.

## Research basis

ADR 0044's sources are not restated; its classical-aesthetics rubric (Ngo, Teo & Byrne 2003) and its
common-region justification (Palmer 1992) remain in force and are the reason this ADR forbids
solving hierarchy with rectangles. Task 51 adds constraints from the platform and the measured
target machine rather than new aesthetic theory:

- **W3C WCAG 2.2, SC 1.4.11 Non-text Contrast** and **SC 1.4.3 Contrast (Minimum)** — a restrained
  palette must still clear 3:1 for interface boundaries and state, and 4.5:1 for body text. The
  reference's pale tonal selection is adopted only where it does that, which is why the decision
  below requires selection to be legible without relying on the fill alone.
- **W3C WCAG 2.2, SC 2.3.3 Animation from Interactions** — motion driven by interaction must be
  disableable. This is why reduced motion is a designed state here rather than a blanket zeroing.
- **CSS Color Level 4 `oklch()`** — perceptual lightness lets a tonal ramp be derived rather than
  hand-picked, which is the mechanism that stops 31 radii and 29 hex colours recurring as 29 hex
  colours in a new hue.
- **The measured target machine** — 2 cores, integrated GPU, 7.8 GB RAM, 1.25 DPR. Continuous blur,
  glass, large animated filters and per-frame shadow interpolation are excluded on measurement
  grounds, not only on taste grounds.

No claim is made that any value below is an experimentally proven optimum. The reference image is
the authority for appearance; this ADR is the authority for how that appearance is expressed.

## Decision

> **Lifeweave is one continuous calm surface, articulated by space, type, tone, hairline and
> motion. Boxes are exceptions, not structure. There is exactly one visual authority — a token
> contract separate from the geometry authority — and no feature declares its own colour, radius,
> elevation, editorial type or transition. The whole screen is locked before any production surface
> is restyled, and state always commits before motion.**

### 1. Two authorities, not one

```text
frontend/src/app/layout/          geometry     Task 50, unchanged in kind
frontend/src/design-system/visual/  appearance   Task 51
```

Geometry answers "how wide, how far apart". Appearance answers "what colour, what radius, what
weight, how fast". They are kept apart so a future agent editing a hue cannot move a page edge, and
because `check_layout_authority.py` already enforces that `app/layout/tokens.css.ts` contains
geometry only. That rule is retained.

### 2. Finite visual vocabularies

Each vocabulary is small and closed. A value outside it requires a documented reason in the closure
audit, exactly as a non-ramp spacing value already does.

```text
radius        small · control · surface · floating          (4 levels, replacing 31)
elevation     none · floating · modal                        (3 levels, replacing 14 shadows)
hairline      structural · subtle                            (2, replacing ad-hoc grey borders)
type          UI family + editorial family, one scale each
motion        named durations, easings and springs
colour        semantic roles only; no page-specific colour where a role exists
```

Colour roles are derived in `oklch()` so lightness and chroma relationships hold across light and
dark, and are exposed through a vanilla-extract `createThemeContract` so a missing role is a type
error rather than a silent fallback.

### 3. Enclosure budget

Visible content may not exceed **two enclosure levels** without a recorded reason. Hierarchy is
established in this order:

```text
space → tone → hairline → typography → elevation
```

Elevation is reserved for surfaces that genuinely float — menus, popovers, transient dialogs, and a
drag overlay. Main content is `none`. A selected row may not simultaneously carry a strong border,
a saturated fill and a shadow.

### 4. Full-screen lock before production edit

Production presentation files are not overhauled component-by-component. The sequence is
prototype → `VISUAL LOCK` → motion prototype → `MOTION LOCK` → production. Approval is explicit and
is never inferred. If implementation reveals a genuine layout problem, the locked design is updated
first and re-evidenced; it is not improvised around in production.

The prototype lives in `frontend/src/prototypes/task51/` and may not change production appearance
before approval.

### 5. State before motion

A click is acknowledged on the next display frame where physically possible. A task mutation commits
optimistically and the settling animation follows it; the animation never gates the state. Direct
manipulation uses interruptible transform-based layout animation, never snapshot-based view
transitions. Per-pointer-move IPC or database work is prohibited.

Work is assigned to the cheapest correct layer:

```text
CSS / WAAPI            hover, press, focus, checkbox microstate, small popover entry
Motion layout          reorder settling, inspector geometry, selected indicator, spatial reflow
element View Transition  bounded large-surface continuity, feature-detected, with a working fallback
React <Activity>       selective warm state preservation, only where profiled
```

### 6. Reduced motion is a designed state

The current blanket `animation-duration: 0.01ms !important` is replaced. Large transforms, spatial
sweeps and ambient loops become short fades, tonal state change or instant state. The application
never exceeds the system preference and never produces a disorienting jump in place of a movement.
This aligns the implementation with `docs/ACCESSIBILITY_AND_INPUT.md`, which already forbids zeroing
every duration.

### 7. Art is bounded, retreating, and light blue

Baseline art is static SVG contours, soft gradients, sparse dots and pastel graph nodes, built from
CSS, SVG and ordinary DOM. No WebGL engine, no particle field, no looping video, no animated blur,
no character art, no wallpaper. Art occupies empty space and reduces as information density rises;
Today and Reader carry no required continuous animation. Any approved ambient movement animates only
transform and opacity, is bounded in amplitude and period, and stops when its surface is hidden or
the window is inactive.

**The art hue is light blue**, by explicit Product Owner direction recorded during activation. It is
scoped to the three ambient roles and reaches no canvas, surface, text, border, accent or state
colour. The scoping is the decision: the content plane stays warm-neutral as the reference has it,
and a cool light-blue atmosphere therefore reads as air behind the interface. Applying the same hue
to the canvas would reproduce the cool blue-grey system this slice exists to replace.

Ambient hue sits near 238, deliberately clear of the 270–286 blue-violet the interface accent
occupies, so atmosphere can never be mistaken for selection. Ambient chroma is permitted to exceed
the rest of the palette — the single sanctioned chroma exception — because at these lightnesses a
lower chroma reads as dirty grey rather than as blue. Every ambient value stays within roughly
1.15:1 of the canvas in light and 1.3:1 in dark.

### 8. The window stays opaque

The current opaque Tauri window foundation is kept. Mica, Acrylic, transparency and global glass are
not adopted; on the measured target hardware they would cost compositing work for an effect the
reference does not contain.

### 9. Behavioural primitives stay native first

Native semantic HTML remains the first choice. A behavioural primitive library is admitted only if
the prototype identifies a concrete primitive where it beats the existing implementation, and if
admitted it owns that primitive class exclusively — there may not be two owners of dialog focus
behaviour. Default library appearance never ships.

### 10. The art-direction freeze is replaced, not bypassed

`scripts/check_layout_authority.py` currently fails the build if `global.css` stops containing
`font-family: Inter,`, `--accent: #476dd6;`, `--surface: #ffffff;` or `--focus-ring: #476dd6;`.
That freeze existed because Task 50 was not authorized to choose art direction. Task 51 is. The
freeze is therefore **replaced by a Task 51 art-direction authority check** asserting that the
visual contract is the sole declarer of colour, radius, elevation, editorial type and motion, and
that no feature reintroduces a hardcoded hex. It is never deleted to make a red gate green.

## Product Owner decisions at VISUAL LOCK

`VISUAL LOCK APPROVED` was granted on the composition captured in
`docs/audits/task-51-visual-lock.md`, with four decisions recorded here because they close open
items this ADR raised.

### 1. The native decorated titlebar is kept

The reference draws its own 52 px in-app titlebar. Lifeweave keeps the **native Windows titlebar**
for the production baseline: no `decorations: false`, no custom HTML titlebar, and therefore no
window-control capability. §11's exclusion of new Tauri capabilities stands unamended, and the
composition is authored for the content area beneath the native chrome. This may be revisited later
as its own decision; it is not deferred work inside Task 51.

### 2. `@vanilla-extract/recipes` is kept

Retained rather than removed, on the condition that it is used **only for primitives that genuinely
have variants**. It may not become a default wrapper around single-axis styling that
`styleVariants` already expresses. The dependency note's provisional status is resolved to *kept
with a usage constraint*.

### 3. The locked composition stands

Approved and not reopened: the continuous-surface composition, the inspector sharing the workspace
canvas, periods with no container, and selection as `#EFEFF4` fill plus a 2 px accent edge. Motion
work may not redesign any of it.

### 4. The art must lean further into light blue

The ambient direction from activation is strengthened. Atmosphere must read *clearly* light blue,
not merely non-warm, and remains bound by every constraint that already governed it:

- it applies to **ambient roles only** — contour atmosphere, glow field, sparse spatial dots, and
  the peripheral aura added for this decision;
- it may not reach canvas, surface, text, border, or any state colour; the content plane stays
  warm-neutral exactly as the lock has it;
- it must read as **air and light behind the interface**, never as a cool blue-grey system UI;
- it must stay separated from the blue-violet accent so atmosphere is never confused with
  interactive state. Implemented as **33 degrees** of hue separation: ambient at 237, accent at
  270.15.

Measured after the change: aura 1.14:1, glow 1.22:1, secondary glow 1.24:1, contour 1.55:1 against
the canvas. The contour's raw token ratio is the highest of the four, but it renders as a 1 px
stroke at 0.18–0.55 opacity, so its perceived presence is a fraction of that figure — the token
ratio bounds what a solid fill of that colour would read as, not what the art draws.

## Superseding reference: Lifeweave Visual Baseline v2

After VISUAL LOCK was approved and the motion prototype was measured, the Product Owner supplied a
**new reference image** and made it the source of truth:
`docs/visual/task-51/lifeweave-visual-baseline-v2.png`.

v2 is not a refinement of v1. It is a different art direction, and it reverses several decisions
this ADR previously recorded. Both images are retained so the change is traceable rather than
implied.

| | v1 (approved, superseded) | **v2 (current source of truth)** |
|---|---|---|
| Plane | warm neutral `#FBFAF9` | **cool near-white `#FCFCFD`** |
| Accent | muted blue-violet `#3B4D92`, hue 270 | **saturated blue `#1157CE`, hue 261** |
| Completed task | accent-toned check | **blue check, and green is banned from task state** |
| Titles | Literata editorial serif | **UI sans, bold** |
| Period rows | no container | **white container, hairline, radius 12** |
| Ambient art | light-blue contour + glow field | **none on Today** |
| Selection companion | 2 px left accent bar | **accent-toned checkbox ring** |

### What carried over unchanged

The three-column composition and its proportions, the inspector sharing the workspace plane, row
geometry, the low-chrome inspector tabs, the hairline-first separation language, the finite
vocabularies, the enclosure budget, and the whole motion system measured at MOTION LOCK. v2 changes
palette, type and ornament — not structure.

### Consequences of the reversal

- **The light-blue art direction is withdrawn.** ADR §7's "the art hue is light blue" applied to v1.
  v2 contains no ambient field at all, and the brief states the top decoration must be removed and
  nothing may encroach on content. The `ambient*` roles and the `Ambient` component are retained but
  are **not rendered on Today**; their values are re-derived to near-neutral so they cannot
  reintroduce a coloured atmosphere by accident.
- **Literata is now unused.** Removing the serif drops 106,560 bytes of woff2 subsets from the
  prototype bundle. The package is left installed rather than removed unilaterally, because dropping
  an editorial face is a decision about Reader and Narrative as much as about Today. Raised for
  decision, not taken here.
- **`success` resolves to the accent.** Completion is blue by explicit instruction, so no task state
  uses green. The `success` token remains for non-task semantics.
- **VISUAL LOCK is reopened to the extent v2 differs.** The approval granted on the v1 composition
  cannot cover a palette and type system it did not show. Structure remains locked; appearance
  requires re-approval.

## Consequences

- `frontend/src/design-system/visual/` becomes the single answer to "what colour, radius, weight or
  duration is this?". A future agent opens one directory, not thirty `*.css.ts` files.
- The 29 hardcoded hex colours in `features/*` become semantic roles and therefore start
  participating in dark theme and forced colors, which several of them currently do not.
- The application shell gains a third column for the context inspector. The 220 px sidebar and the
  absence of an inspector are presentation decisions Task 50 did not lock, and both may change.
- Task 50's geometry invariants remain binding and are re-proven, not re-argued: zero document
  overflow, zero viewport overflow, zero semantic collisions, stable framing, local scroll
  ownership.
- New dependencies are limited to self-hosted Literata, a curated Fluent System icon subset,
  vanilla-extract recipes, and the WebdriverIO v9 visual service, each with a written rationale.
- The bundle budget is measured and reported at each gate. `index.js` has 5,473 bytes of headroom at
  baseline; raising a ceiling remains a Product Owner decision supported by measurement.

## Explicitly not decided here

No product semantics. No category rename, no removed recurrence control, no removed metadata, no
hidden error or recovery information, no collapsed accessibility alternative, and no new Task facet.
The reference inspector shows Note / Details / Subtasks / Links; Lifeweave Tasks have no subtasks and
no task-to-task links, and none will be invented to match the picture. The inspector expresses the
facets a Lifeweave Task actually has.

No schema 28, no migration, no Rust product change, no new IPC command, no new Tauri capability, no
broadened filesystem or shell permission, no network service, no accounts or sync, no backup format
change, and no workflow or seal change.

No replacement of React, Tauri, Tiptap, dnd-kit, TanStack Query, d3-hierarchy or vanilla-extract. No
Tailwind, shadcn, Material UI, full Fluent UI React, GSAP, Rive, PixiJS, Three.js, React Flow,
Sigma, Cytoscape, `window-vibrancy`, second drag-and-drop library, second editor, chart library, or
React canary.

Still deferred and untouched: Narrative Canvas expansion, prediction, advanced Graph, tags beyond
the existing unified system, backlinks beyond ADR 0035, Noteboard, sound design, brand and logo
work, and every item ADR 0044 listed as not decided.

## Rollback

Task 51 is presentation-only and adds no persisted data, so rollback is a Git operation with no
migration and no user-data consequence. Work is committed as ordered local checkpoints on
`task-51-visual-experience` from `43d0d1e`, and any checkpoint may be reverted independently. The
visual contract is additive until the production slice consumes it, so the prototype phases are
removable without touching a production surface.
