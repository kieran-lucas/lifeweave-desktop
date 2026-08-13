# Slice 041 Specification — Visual Experience Overhaul

Authority: the immutable source, then the Product Owner's **Lifeweave Visual Baseline v1** image for
appearance, then ADR 0045, then this file. Where this file and a higher authority disagree, the
higher authority wins and the conflict is reported rather than reconciled. ADR 0044's geometry
invariants remain binding throughout.

## 1. Scope

In scope: the presentation of every existing surface — application shell, sidebar, Today, the new
context inspector, Calendar, Analytics, Focus Plans, Life Browse/Edit/Pinned/Graph, Basic Leaf
Reader and Editor, Narrative Reader/Studio/Visual Worlds, Search, Settings, Backup settings, and
every dialog, popover and menu. Plus: the visual token authority, typography, icon vocabulary,
surface and depth system, dark theme, motion system, restrained ambient art, visual regression
testing, and interaction-performance instrumentation.

Out of scope: product semantics of any kind except the explicit §§1.2–1.4 Product Owner amendments, and
every remaining item in the Task 51 hard-exclusion list (§11).

### 1.1 Product Owner usability amendment (2026-08-11)

ADR 0046 records a later explicit Product Owner direction that narrowly overrides the
presentation-only boundary above for the existing Life tree and Basic Leaf editor. It authorizes no
new domain semantics, storage, schema, IPC, dependency, Graph behavior, or Browse projection beyond
the explicit later amendments recorded below.

- The separate full-tree workspace is named **Tree**, lays generations left-to-right, and no longer
  presents a permanent edit inspector.
- Selecting a node reveals exactly two adjacent actions: **Add child** and **Edit node**. Add child
  is a one-field dialog; Edit node reveals the existing advanced node controls on demand. The
  centered floating action surface dismisses on repeat activation, action selection, outside
  pointer press, and Escape, with keyboard focus restored to the node after Escape.
- Basic Leaf removes duplicate editor extensions and transaction-driven React rerenders. Text
  deletion remains native ProseMirror behavior, and an active table exposes direct add/delete row,
  add/delete column, and delete-table controls with local horizontal overflow.
- Existing revision checks, mutation boundaries, recovery draft/commit serialization, keyboard
  drag parity, link protocol restrictions, and all backend authority remain unchanged.
- The Tree viewport renders no local scrollbars. Mouse-wheel and two-axis trackpad input scroll at a
  damped, bounded speed; Shift plus a vertical wheel scrolls horizontally. A primary-pointer hold and drag beginning on empty
  tree space pans both axes; the same gesture beginning on a node remains node movement. Arrow keys,
  Shift plus arrow, and Home provide keyboard pan and reset without changing tree data. A compact
  Tree heading remains at the top of the Life pane, the bordered pan viewport receives the
  remaining available height, and Tree mode creates no outer Life-canvas scroll region.
- Life Back restores the immediately previous Life session state; a sibling leaf-to-leaf transition
  returns to the first leaf Reader before returning to the containing branch.
- Focus Plan detail presents lifecycle and title as compact identity. Its authored outcome is the
  dominant reading/editing surface in a 70% focused frame, and read mode preserves authored single
  line breaks. Facts and lifecycle actions remain available at a quieter visual level. Definition
  of done and Linked work are omitted from this surface without deleting their stored authority.
- The Life navigator remains 15% wide and increases the type size of Life/Tree controls,
  breadcrumbs, selected-node context, child items, and supporting copy for legibility.

### 1.2 Product Owner Focus Plan score amendment (2026-08-13)

ADR 0047 records the Product Owner's explicit reversal of the prior blanket scoring prohibition.
The authorized behavior is deliberately manual and bounded:

- each Plan owns zero or one current integer score from 1 through 100;
- migration 28 appends a nullable SQLite column with a matching CHECK; Rust repeats validation;
- score writes reuse the existing optimistic, idempotent, revisioned Plan mutation authority;
- the portfolio places a keyboard-reachable circular score control at the right of each Plan;
- the circle prints the numeric value and uses restrained band colour only as redundant emphasis;
- saving a non-null score atomically changes lifecycle to `completed`; clearing it does not
  reactivate the Plan;
- automatic scoring/formulas, score history, score Analytics, health, prediction, notifications,
  automatic lifecycle beyond this one manual score → completed rule, new dependencies, and
  additional top-level navigation remain prohibited.

### 1.3 Product Owner Task and Plan usability amendment (2026-08-13)

- Plan dates below the authored content have clear Start/Target labels, human-readable formatting,
  stronger type, and enough vertical separation to remain scannable.
- The Task create/edit Description textarea is taller so multi-line context can be reviewed while
  editing; task copy must not call this field Notes.
- Life Area selection presents exactly one canonical level at a time—Domain, then Section, then
  Area—rather than mixing every node in one list; global search and keyboard selection remain
  available. The closed field shows the concise selected title, not the full breadcrumb.
- Saving a non-null manual Plan score completes the Plan in the same revisioned mutation and moves
  it to the Completed portfolio. Migration 30 converges already-scored Plans.
- Active Plans have an explicit `Active` label with redundant green emphasis in both portfolio and
  detail identity; forced-colors mode retains the text and boundary.

### 1.4 Product Owner Task composer coherence amendment (2026-08-13)

- Plan Task and Edit Task use one coherent component set for schedule, Category, Priority,
  Deadline, Life Area, and Focus Plan; recurrence-scope restrictions remain unchanged.
- Schedule date and optional Deadline use the same styled local calendar; Start and End retain
  exact one-minute 04:00–24:00 wheel selection. All popovers support keyboard operation, outside
  dismissal, Escape, visible focus, and focus restoration.
- Category remains a first-class Task field in both create and edit. Schema 31 adds the approved
  small workstream catalog to fresh and upgraded databases with `INSERT OR IGNORE`, preserving all
  existing category identity and goal metadata.
- Priority and Repeat share the same labelled choice-control language instead of unrelated native
  selects; stored values and recurrence authority do not change.
- Focus Plan selection reads the canonical bounded non-archived Plan target projection and is
  invalidated after every successful canonical Plan create/mutation/score/archive/restore path.
- A Life Tree leaf places its contextual Add child / Edit node actions above the leaf; branches
  retain below-node placement.
- Create and edit use the same standard-width matte composition: a black identity header and three
  ruled regions named Essentials, Schedule, and Context. All field labels, control heights,
  borders, selection inversion, floating surfaces, footer actions, and responsive stacking belong
  to one monochrome grammar; Category color metadata remains persisted but is not decorative UI.
- The composer entrance uses the shared route settle and its popovers use the shared inspector
  settle. Layered elevation remains opaque and monochrome: no blur, gradient, or chromatic
  decoration is introduced merely to imply quality.
- Exact-time wheel rows have fixed 40 px geometry and fixed 15 px numerals. Selected values may use
  contrast and bounded font-weight changes but must not change font size or transform scale. Wheel
  and keyboard input moves one row smoothly; direct dragging remains snap-bounded.
- Edit Plan remains document-first, but its editing state is one aligned matte instrument. Title and
  Outcome use explicit labels; Start date, Target date, Life Area, and Status use a two-column grid
  with the same 52 px field height, border, radius, focus, and spacing grammar as Edit Task. Read-only
  fact-row flex rules must not leak into this grid. Content toolbar groups and buttons share one
  vertical center, fixed button height, upright font style, and consistent glyph baseline.
- Schedule and Context share one six-column grid authority. Schedule fields span two columns each;
  paired Context fields span three columns each; Tags spans all six. Compact section headings sit
  above the fields instead of reserving an empty left rail. Category, Priority, Life Area, Focus
  Plan, Deadline, and Repeat share a 52 px control row and aligned label baseline.
- Life Area and Focus Plan values remain single-line and truncate safely. Their clear affordance is
  compact and internal to the control; Focus Plan rows show lifecycle as secondary metadata without
  changing the canonical target projection.

## 2. Visual authority

There is exactly one location that answers "what colour, radius, weight, elevation or duration is
this?": `frontend/src/design-system/visual/`. After this slice no domain CSS file declares a
hardcoded colour, a raw radius, a raw shadow, an editorial font stack, or an ad-hoc transition.
Domain CSS keeps its domain-specific composition and consumes the shared authority for the values
above.

The geometry authority under `frontend/src/app/layout/` is separate and unchanged in kind. A visual
token may not declare geometry and a geometry token may not declare appearance.

### 2.1 Token families

Exposed through a vanilla-extract `createThemeContract`, so a missing role is a type error rather
than a silent fallback, and light and dark are two `createTheme` implementations of one contract.

```text
colour     canvas · surface · surfaceSubtle · surfaceRaised · surfaceSelected · surfaceHover
           textPrimary · textSecondary · textTertiary · textDisabled
           borderHairline · borderStrong
           accent · accentMuted · accentSoft
           success · warning · danger
           lifeLavender · lifeMint · lifePeach · lifeBlue · lifeCream
type       UI family, editorial family, title scale, body, metadata, tabular numeric
radius     small · control · surface · floating
elevation  none · floating · modal
hairline   structural · subtle
motion     named durations, easings and springs
```

Colour roles are derived in `oklch()` so lightness and chroma relationships are perceptually
controlled across both themes. Reference hex anchors calibrate the ramp; a role may deviate from an
anchor where measured contrast requires it, and the deviation is recorded.

### 2.2 Reference calibration anchors

Anchors, not literals to paste into components:

```text
warm neutral    #FBFAF9  #FCFBFA  #F5F4F3  #F4F3F2  #EBEBF0  #EFEFF4
text            #201F1F  #333232  #424242  #5D5C5C  #7A7979
blue-violet     #44579F  #5D6EAD  #7A8EB8  #C8CEE4
warm accent     #DB8A68  #E6B193
green           #7BAC84  #93BA9A  #D8E8DD
```

Exact values are measured from the supplied image; the list above is a fallback constraint and does
not override direct measurement.

## 3. Continuous-surface law

Hierarchy is established in this order, and a later mechanism is used only when the earlier ones
genuinely cannot express the distinction:

```text
space → tone → hairline → typography → elevation
```

**Required.** Light hairlines may separate sidebar, workspace and inspector. Subtle section rules
may clarify Morning / Afternoon / Evening. Tonal zoning may distinguish functional regions.
Whitespace is the primary mechanism.

**Prohibited.** Card grids for content that is naturally a list. A box inside a box purely to create
hierarchy. A persistent toolbar strip with no semantic reason. A full-width bordered tab bar under a
bordered header. Unnecessary inner panel backgrounds. Repeated large rounded rectangles. Shadow as a
universal separator.

**Enclosure budget.** Visible content may not exceed two enclosure levels without a recorded reason.
The test at review time is: if removing a border does not reduce comprehension, remove it; if
removing a hairline makes two semantic regions merge ambiguously, keep it.

**Elevation.** Main content is `none`. Only menus, popovers, transient dialogs and a drag overlay
receive meaningful elevation. A selected row may not combine a strong border, a saturated fill and a
shadow.

## 4. Composition target

At the canonical maximized viewport the primary Today composition is:

```text
Sidebar | Today workspace | Context inspector
```

Proportions are measured from the reference and reconciled with the real 1536 × 794 inner viewport;
the reference-space guides are a sidebar near 240–260 px and an inspector near 400–470 px, and
neither is hardcoded before measurement. Separators are hairlines. The inspector is a continuation
of the application surface, not a floating card.

Responsive degradation preserves the visual DNA rather than the column count. The sidebar may narrow
or collapse and the inspector may narrow or become an overlay; the task area is never sacrificed to
keep three columns. Required sizes: the measured maximized viewport, 1440 × 900, 1280 × 720, and the
supported minimum near 960 × 640, which is the `tauri.conf.json` minimum window.

## 5. Surface intent

Domains differ in expressive intensity and share one grammar.

```text
Task        precision            ~2/10
Calendar    clarity              ~2–3/10
Analytics   clarity              ~2–3/10
Reader      quiet                ~1–2/10
Life        spatial, editorial   ~4–5/10
Narrative   most expressive      ~5–6/10
```

All share type, colour grammar, spacing, hairlines, icon weight, depth language and motion
principles. Task 51 does not close as a Today reskin: Settings and dialogs must not look like a
different product from Today.

## 6. Typography

```text
UI         "Segoe UI Variable", "Segoe UI", Inter, system-ui, sans-serif   (system font only)
editorial  Literata Variable, self-hosted via Fontsource, no CDN
```

No Microsoft font file is redistributed. Literata is used selectively — the Today title, the
inspector object title, Reader and document titles, and important Life/Narrative headings — and
never for dense controls, metadata, task rows or forms. Vietnamese glyph rendering is verified in
both families. Font loading must not cause repeated layout jumps; network transfer is irrelevant
because the application is local.

Approximate reference scale, tuned against the image: Today H1 38–42 px editorial; secondary
page/date heading 18–20 px; inspector H1 25–28 px editorial; body and task rows 14–15 px; metadata
12–13 px; section headings ~14–15 px semibold. Times and durations are tabular.

## 7. Icons

Fluent System Icons are adopted as a vocabulary, not as a reason to import a component framework.
Predominantly 20 px regular weight, themed by `currentColor`; filled counterparts only where state
semantics genuinely benefit. No colour-icon variants and no runtime load of the full set. The
rendering strategy is a curated local subset — inline SVG components or CSS masks over imported
asset URLs — and never general raw-HTML injection. Icon-only controls carry accessible names;
decorative SVG is `aria-hidden`.

Pointer targets remain usable regardless of how small an icon looks. A premium style may not depend
on a 10 px hit area.

## 8. Motion

State commits first; motion carries the change afterwards and never gates it. A click is
acknowledged on the next display frame where physically possible. Direct manipulation is
interruptible. No IPC or database work occurs per pointer-move frame.

```text
press feedback              60–90 ms
hover / selection           80–120 ms
completion check           120–160 ms
tooltip / popover          120–160 ms
small inspector change     150–190 ms
inspector open / close     180–220 ms
task reorder settle        180–260 ms, low-bounce spring
route / workspace change   190–250 ms
Life spatial traversal     220–300 ms
ambient drift              8–30 s, peripheral, optional, pausable
```

Springs are near-critically damped. A checkbox may snap; a panel may not bounce.

**Prohibited.** `transition: all`. Continuous animated blur. Large animated filters. Per-frame large
shadow interpolation. Page-wide parallax during ordinary work. Any looping animation on Today.
Delays that block interaction. Non-interruptible snapshot transitions on high-frequency controls.

**Layer assignment.** CSS/WAAPI for hover, press, focus, checkbox microstate and small popover
entry. Motion layout projection for reorder, row settling, inspector geometry, selected indicator
and spatial reflow. Native element-scoped View Transitions, feature-detected with a working
fallback, only for bounded large-surface continuity. React `<Activity>` selectively and only where
profiling shows value.

## 9. Reduced motion

Reduced motion is a designed first-class visual state, not a global zeroing. Large transforms,
spatial sweeps and ambient loops are replaced by short fades, tonal state change, static continuity
or instant state — never by a disorienting jump. The application never exceeds the system
preference. Both paths are tested.

## 10. Art

Static SVG contours, soft gradients, sparse dots, pastel graph nodes; CSS, SVG and ordinary DOM
only. Decorative art is `pointer-events: none`, `aria-hidden`, and carries no semantic role. It
occupies empty space and retreats as information density rises: a dense Today shows less ambient art
than a quiet Life surface, and Today and Reader require no continuous animation at all.

### 10.0 WITHDRAWN for baseline v2

**§10.1 below applied to reference v1 and no longer governs.** The Product Owner supplied
`lifeweave-visual-baseline-v2.png` as the new source of truth. It contains **no ambient art**, and
the accompanying brief requires that the decorative field above the header be removed, that art be
almost invisible, and that no contour or glow encroach on content.

Today therefore renders no ambient layer at all. The `ambient*` roles and the `Ambient` component
are retained for a quieter surface to opt into later, and their values are re-derived to
near-neutral so a coloured atmosphere cannot return by accident. §10.1 is kept below as the record
of a superseded decision, not as an instruction.

### 10.1 The art hue is light blue — SUPERSEDED, see §10.0

Explicit Product Owner direction, strengthened at VISUAL LOCK: **the art vibe is light blue, and
must lean clearly that way rather than merely reading as non-warm.** This is the one place in
Task 51 where a hue deliberately departs from the reference's warm-neutral plane.

It is confined to four ambient roles — `ambientContour`, `ambientGlowPrimary`,
`ambientGlowSecondary`, `ambientAura` — and touches no canvas, surface, text, border, accent or
state colour. The separation is what makes it work: because the content plane stays warm, a cool
light-blue atmosphere reads as **air and light behind the interface**, rather than as a second
theme competing with it. A light-blue canvas would instead read as the cool blue-grey system
Task 51 is replacing.

Constraints that still bind it:

- hue sits at **237** — a true sky blue. The interface accent is at **270.15**, giving **33 degrees**
  of separation, so ambient atmosphere and interactive state can never be confused;
- ambient values sit between **1.14:1 and 1.55:1 of the canvas** in light, and 1.24:1 to 1.77:1 in
  dark. The contour occupies the top of that range and renders as a 1 px stroke at 0.18–0.55
  opacity, so the token ratio bounds a solid fill of that colour rather than describing what the art
  actually draws;
- chroma may exceed the rest of the palette, because at these lightnesses a lower chroma reads as
  dirty grey rather than as blue — this is the one sanctioned chroma exception;
- it retreats under density and all but disappears behind a dense Today, exactly as any other
  ambient treatment must;
- it introduces **no animation requirement of its own**, and may never take a frame from an
  interaction. The whole ambient layer is static paint with `pointer-events: none`.

Any approved ambient movement animates only transform and opacity, at small amplitude and long
period, and stops when its surface is not visible, when the window is inactive where detectable, or
when reduced motion is requested.

## 11. Hard exclusions

Schema beyond 30, any migration or Rust product change beyond the explicit schema-29 Life Focus
identity-preserving correction and schema-30 scored-Plan convergence, any new IPC command, any new Tauri capability,
any broadened filesystem or shell permission, any network service, any accounts or sync, any backup
format change, and any workflow or seal change.

Any change to product semantics: category renaming, removed recurrence controls, removed metadata,
hidden error or recovery information, collapsed accessibility alternatives, or a new Task facet.
Specifically, no subtasks and no task-to-task links, which the reference inspector displays and
Lifeweave does not have.

Replacement of React, Tauri, Vite, TypeScript, vanilla-extract, Motion, TanStack Query, Tiptap,
dnd-kit or d3-hierarchy. Tailwind, shadcn as a foundation, Material UI, full Fluent UI React, GSAP,
Rive, PixiJS, Three.js, React Flow, Sigma, Cytoscape, Electron, `window-vibrancy`, a second
drag-and-drop library, a second rich-text editor, a generic chart library, or React canary.

Window transparency, Mica, Acrylic and global glass. WebGL or animation-engine art.

Every prohibited feature the decision registry already lists: Narrative Canvas expansion beyond
approved specs, prediction, advanced or editable Graph, Noteboard, generic outline expansion,
shortcut remapping, a command palette, sound design, and brand or logo work.

## 12. Process

Production presentation files are not overhauled component-by-component and are not touched before
approval. The sequence is: baseline → governance → state matrix → prototype infrastructure →
full-screen Today prototype → **STOP for `VISUAL LOCK APPROVED`** → motion prototype → **STOP for
`MOTION LOCK APPROVED`** → production reconstruction → regression → polish → closure.

Before VISUAL LOCK, permitted work is source reading, measurement, token design, dependency and
config preparation, test infrastructure, governance documents, and the isolated prototype under
`frontend/src/prototypes/task51/`. Production bug fixes unrelated to Task 51 are not permitted.

Approval is explicit and never inferred. A layout problem discovered during implementation updates
the locked design and its evidence first.

Work stays local on `task-51-visual-experience` as ordered checkpoints. Nothing is pushed, no PR is
opened, no remote branch is modified and the sealed workflow is untouched unless the Product Owner
explicitly asks.

## 13. Evidence classes

Recorded separately and never conflated, as ADR 0044 requires.

```text
frontend/jsdom      structural contracts only — jsdom reports every rectangle as zero
axe                 accessibility rule violations only
native geometry     real WebView box model, Task 50 invariants re-proven
spacing audit       semantic separation, via the existing collision detector
visual regression   WebdriverIO v9 visual service against approved goldens
performance         measured interaction timings and bundle bytes, never adjectives
physical DPI        recorded as NOT RUN unless actually executed at Windows 125% / 150%
screenshots         review evidence, never sole completion evidence
```

Baseline captures record Windows version, WebView2 version, DPR, inner viewport, theme, motion
preference and fixture version. Goldens are not silently overwritten on failure, mismatch tolerance
is not widened to make a suite green, and masking is used only for genuinely nondeterministic
content.

## 14. Performance policy

Runtime experience is the hard constraint; bundle bytes are a measured signal.

```text
input feedback          visible next display frame where physically possible
hot-path main thread    investigate >16 ms; avoid >50 ms
idle                    CPU and GPU settle on Today and Reader; no required decorative loop
pointer move            no IPC and no database work per frame
lazy                    editor, Narrative, Graph, exporters and optional art stay out of Today startup
```

Bundle deltas — startup JS raw and gzip, new chunks, dependency delta, font and icon asset delta —
are measured and reported at each gate. `index.js` has 5,473 bytes of headroom at baseline. Raising
a locked ceiling remains a Product Owner decision supported by measurement, per
`docs/PERFORMANCE_BUDGETS.md`.

The finalized Today startup graph contains the application shell and Today only. Non-default
routes, Life/Narrative/tree engines, help, and task-composer-only controls are point-of-use lazy
boundaries. The advisory health probe must retain its failure state but must not serially gate the
first Today mount. The 2026-08-11 production trace reduced startup `index.js` from 433,337 to
274,368 raw bytes and from 130,681 to 84,033 deterministic gzip bytes without raising a locked
ceiling; this boundary is protected by source-level contract tests and the bundle budget.

## 15. Accessibility

WCAG 2.2 AA for core flows, preserved and re-tested: native semantics first, keyboard parity,
deterministic focus restoration, visible `:focus-visible`, no colour-only meaning, accessible names
for icon-only controls, Narrator spot checks, forced colors and high contrast, light and dark,
reduced motion, Windows DPI scaling, and Vietnamese text.

Contrast is verified against the derived palette, not assumed from the reference: 4.5:1 for body
text and 3:1 for interface boundaries and state indication. A pale tonal selection is adopted only
where selection remains legible without relying on the fill alone.

## 16. Preserved product behaviour

Task rows stay non-card. Today stays task-first, startup and default. Semantic periods keep their
boundaries — Morning 04:00–12:00, Afternoon 12:00–18:00, Evening 18:00–24:00. Life Browse still
shows the selected node and direct children. The eight global keyboard shortcuts and their chords
are unchanged. Existing focus order, dialog semantics, tab semantics and DOM order are preserved;
DOM order is not reordered for visual reasons.

## 17. Density and content stress

The design is not locked on ideal demo text. Fixtures include long task titles, long Vietnamese
text, multiple tags, a Life area and a Focus Plan on the same row, timer metadata, recurrence, many
tasks, empty states and long object titles. No truncation may silently destroy meaning. The Task 50
semantic-collision detector runs over the new composition, and the result stays at zero.
