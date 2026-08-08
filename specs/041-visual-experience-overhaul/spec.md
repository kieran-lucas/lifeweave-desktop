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

Out of scope: product semantics of any kind, and every item in the Task 51 hard-exclusion list (§11).

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

### 10.1 The art hue is light blue

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

Schema 28, any migration, any Rust product change, any new IPC command, any new Tauri capability,
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
