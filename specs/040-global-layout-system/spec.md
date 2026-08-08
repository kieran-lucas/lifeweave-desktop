# Slice 040 Specification — Global Layout System + UI Surface Completeness

Authority: the immutable source, then ADR 0044, then this file. Where this file and a higher
authority disagree, the higher authority wins and the conflict is reported rather than reconciled.

## 1. Scope

In scope: the geometry of every existing surface, the containment of every existing dialog and
form, the horizontal-overflow invariant, the layout token authority, real-browser geometry
evidence, and making every already-decided user-facing capability visible in its valid context.

Out of scope: product semantics of any kind, art direction of any kind, and every item in the
Task 50 hard-exclusion list (§9).

## 2. Layout authority

There is exactly one location that answers "what controls a Lifeweave page's main width?":
`frontend/src/app/layout/`. After this slice, no domain CSS file declares a page maximum width, a
page gutter, a dialog width, or a page-level section gap. Domain CSS may still declare
domain-specific grids, and must consume the shared authority for the values above.

### 2.1 Tokens

All layout tokens carry the `--lw-` prefix so nothing collides with the existing palette in
`frontend/src/design-system/global.css`, which is not modified.

```text
--lw-space-1 … --lw-space-8      4 8 12 16 24 32 48 64
--lw-space-control               within one control group
--lw-space-field                 between fields
--lw-space-group                 within a section
--lw-space-section               between major sections
--lw-space-page                  page bottom rhythm
--lw-gutter                      clamp(24px, 3vw, 48px)
--lw-frame-standard              1152px
--lw-frame-wide                  1440px
--lw-frame-reading               768px
--lw-dialog-compact              520px
--lw-dialog-standard             720px
--lw-dialog-wide                 960px
```

A measurement that is not on the ramp requires a documented geometric reason in the closure audit.

### 2.2 Primitives

A primitive exists only when at least two concrete surfaces consume it immediately. No generic UI
framework, no generic modal framework, and no production layout-measurement code are created.

```text
PageFrame      standard | wide | reading      ≥ 4 consumers each for standard and wide
PageHeader     identity + actions             every top-level surface
SectionStack   vertical section rhythm        Analytics, Settings, Plans detail
DialogSurface  backdrop/surface/header/body/footer   ≥ 5 dialogs
FormGrid       full / half / third field units Task dialog, Plan detail
ScrollRegion   local horizontal scroll owner   Settings tables, Analytics plan table, graph tables
```

`DialogSurface` is geometry only. It carries no focus trap, no Escape handling and no portal, so
each dialog keeps the behaviour it already has and the ADR 0039 modal-detection contract
(`role="dialog"` + `aria-modal="true"`) is untouched.

## 3. Page taxonomy

Every top-level surface declares exactly one type; unclassified geometry is a defect.

| Type | Frame | Surfaces |
|---|---|---|
| `STANDARD_PAGE` | 1152 | Today, Analytics, Plans, Settings |
| `WIDE_WORKSPACE` | 1440 | Calendar, Life Browse, Life Edit, Life Graph, Life Pinned |
| `READING_PAGE` | 768 | Basic Leaf Reader, Narrative Reader |
| `MODAL_SURFACE` | 520 / 720 / 960 | Task dialog, Search, Shortcut help, Restore confirm, import previews |
| `LOCAL_SCROLL_WORKSPACE` | n/a | Life graph canvas, Life Edit tree canvas, wide tables |

## 4. Geometry invariants

At 1280×720, 1440×900 and 1920×1080, with the sidebar expanded and collapsed, and in both empty and
populated states:

1. `document.documentElement.scrollWidth <= clientWidth + 1`.
2. `MainViewport.scrollWidth <= clientWidth + 1`.
3. `PageFrame.scrollWidth <= clientWidth + 1`.
4. A capped `PageFrame` is centred within the main viewport's content box to within 2 CSS px.
5. The four `STANDARD_PAGE` surfaces share the same frame geometry at the same viewport.
6. Every dialog's surface lies inside the visual viewport, or its bounded scrollable rectangle does.
7. No two visible sibling controls inside a dialog intersect.
8. Local two-dimensional regions own `overflow-x: auto|scroll` and do not move the main viewport.

Concealment is prohibited: no global `overflow-x: hidden`, no negative-margin clipping, no
`translateX` compensation, no `scale()` to fit. Absolute positioning remains legitimate only for
modal backdrops, canvas/connector geometry, true overlays, and the existing semantic pin badge.

## 5. Named baseline defects that must be repaired

1. **Task create/edit dialog** — a bare `<form>` in a fixed backdrop with no surface, width,
   padding, scroll container or grid. Rebuilt as a real contained dialog with a deterministic
   responsive field grid. No field is removed, renamed, semantically reordered, or has its
   validation changed.
2. **Settings document-level horizontal scrollbar** — 15 px at every tested viewport once the
   document gains a vertical scrollbar. Removed at source, never hidden.
3. **Today period headings** — `Morning04:00–12:00`. Separated by layout, not by literal spaces.
4. **Today timeline row grid** — three declared tracks for up to four rendered children. Declared
   explicitly.
5. **Frame centring drift** — a capped frame currently sits off centre by the width of the main
   viewport's scrollbar. The viewport reserves its scrollbar gutter.

## 6. Preserved product semantics

Task rows stay non-card. Today stays task-first, startup and default. The sidebar keeps its order:
Today, Calendar, Analytics, Plans, Life System, Settings, Search, Collapse/Expand. Life's existing
auto-collapse behaviour is unchanged. Life Browse still shows the selected node and direct children.
Reduced Motion remains mandatory. Keyboard parity, focus order, focus containment, focus
restoration, semantic labels, tab semantics and dialog semantics are preserved or improved; DOM
order is not reordered for visual reasons.

## 7. Surface completeness

Every DECIDED, implemented, user-facing capability must have a visible path in its valid context.
Contextual operations stay contextual; surface completeness is not UI duplication. Keyboard
shortcuts supplement visible affordances rather than replacing them.

Surfacing uses existing IPC only. Anything requiring new Rust behaviour, a new command, a schema
change, a new route, or a new persistent preference is recorded as `BLOCKED_SURFACE` with the exact
missing authority and is not implemented.

The census (`docs/audits/task-50-ui-surface-census.md`) found exactly one `MISSING_USER_SURFACE`
group: Task edit, Task delete and recurring-occurrence edit are reachable only by double-click or
`Enter` on a Task row that advertises neither. One visible row Edit control, calling the existing
handler, resolves all three. Double-click and `Enter` are retained.

## 8. Evidence classes

Recorded separately and never conflated:

```text
frontend/jsdom   structural contracts only — jsdom reports every rectangle as zero
axe              accessibility rule violations only
native phase 21  real WebView box-model geometry
screenshots      research-rubric review, never sole completion evidence
physical DPI     recorded as NOT RUN unless actually executed at Windows 125% / 150%
```

## 9. Hard exclusions

Schema 28, any migration, any Rust product change, any new IPC command, any new Tauri capability,
any new dependency, and any workflow or seal change. Any change to palette, brand, logo, font
family, icon language, radius or shadow language, illustration, Visual World art, motion
personality or sound. Manual actual-time entry, editing completed sessions, recurring actual time,
automatic Plan progress, Plan score or health, prediction, review edit/delete/archive/scheduling/
search, generic outline expansion, Noteboard, advanced Graph, Graph editing, custom export
profiles, arbitrary multi-branch selection, shortcut remapping, a command palette, configurable or
scheduled or cloud backup, manual backup delete, new Narrative templates, new Visual Worlds, and
any Task 51 work.

Task 49's performance ceilings remain binding and unchanged: `index.js <= 535,000`,
`BasicLeafEditor.js <= 490,000`, `markdown.js <= 129,000`.
