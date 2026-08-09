# Task 51 — Craft reconstruction coverage ledger

This is the closure ledger for the Craft-class full-application reconstruction. It extends the
earlier state matrix with rendered-review status. A surface is not `VERIFIED` merely because it
inherits the palette, glass material, typography, or shared controls.

Status vocabulary:

- `VERIFIED` — traced, rendered in the real app, inspected, corrected where needed, and backed by
  the listed geometry/behavior evidence.
- `PARTIAL` — reachable and at least one real render exists, but required states or review axes are
  incomplete or a visible below-bar defect remains.
- `NOT REVIEWED` — production UI exists but has not received a deliberate current rendered pass.
- `CLASSIFIED` — intentionally non-production or unreachable by design, with the reason recorded.

Evidence shorthand:

- `RMAX` — `target/e2e-artifacts/task-50b/task51-recovery-pass2-20260809/`
- `R960` — `target/e2e-artifacts/task-50b/task51-recovery-960-20260809/`
- `RPR` — `target/e2e-artifacts/task-50b/task51-plans-reader-pass1-20260809/`
- `RDL` — `target/e2e-artifacts/task-50b/task51-reader-dialog-pass2-20260809/`
- `RNA` — `target/e2e-artifacts/task-50b/task51-narrative-pass3-20260809/`
- `LIFEP3` — `target/e2e-artifacts/task-50b/task51-life-family-pass3-20260809/`
- `SSEP2` — `target/e2e-artifacts/task-50b/task51-settings-search-pass2-20260809/`
- `VR` — 87 tracked light/maximized, light/minimum, dark/maximized, forced-colors and Vietnamese goldens under
  `e2e-tests/visual-baselines/windows-webview2/` plus their zero-diff comparison evidence under
  `target/e2e-artifacts/task-50b/`
- `DOM` — focused React/Vitest behavior and accessibility contracts
- `GEO` — real WebView spacing audit; collisions/document overflow/viewport overflow

`L/D/N/K/F` below means Light / Dark / Narrow / Keyboard-focus / Forced-colors reviewed.

## Global axes and shared shell

| Surface / entry | Primary states and nested UI | Shared primitives | L/D/N/K/F | Evidence | Status | Defects / next proof |
|---|---|---|---|---|---|---|
| App shell — startup or any destination | sidebar expanded/collapsed, active/hover/focus nav, separators, atmosphere, scrollbars | app frame, page frame, icon buttons, atmosphere | Y/Y/Y/P/Y | RMAX/R960; VR light/dark/FC `01-today`; GEO | PARTIAL | Deliberate scrollbar inspection and complete keyboard walk remain. |
| Global route/error/core states — injected failure paths | route error boundary, IPC/core unavailable, loading/error announcements | error boundary, loading/empty state | P/N/N/P/N | DOM only | NOT REVIEWED | Add deterministic real-browser error captures. |
| Global theme/motion/language axes | light, dark, reduced motion, Vietnamese, long text, DPI | theme contract, motion contract, typography roles | Y/Y/Y/P/Y | VR light/dark/minimum/FC/Vietnamese; 36-state reduced-motion native walk; typography audit; existing DOM contracts | PARTIAL | Narrator and physical DPI remain. |

## Task workspace

| Surface / entry | Primary states and nested UI | Shared primitives | L/D/N/K/F | Evidence | Status | Defects / next proof |
|---|---|---|---|---|---|---|
| Today — sidebar `Today`, workspace tab `Today` | populated, dense/long titles, completed, selected/unselected, no selection, empty/loading/error, timer-running | page header, week strip, row group, chips, buttons, assessment control | Y/Y/Y/P/Y | RMAX/R960; VR `01-today`, `01d` timer and `01e` assessment light/dark plus route FC/Vietnamese; GEO; DOM | PARTIAL | Current fixture proves dense/long/Vietnamese rows, running timer and open assessment; empty/loading/error/completed remain. |
| Today inspector — select a Task row | Note, Details, Time, Links, close, stacked narrow inspector, no selection | shared split workspace, tabs, glass surface, link rows | Y/N/Y/Y/N | RMAX/R960 `01b`, `01c-*`; DOM focus/restore contracts; GEO | PARTIAL | Inspect dark/forced colors; verify tab wrapping and long link names at 960. |
| WeekStrip — Today header | previous/next week, selected day, today marker, compact and narrow | chromeless icon buttons, date buttons | Y/N/Y/P/N | RMAX/R960 `01-today.png`; GEO | VERIFIED | Recovery `efcb1a2`: capped seven-day cluster; focused tests 31-suite subset. Global dark/FC axes remain tracked above. |
| Today workspaces — tabs above page | Upcoming, Overdue, Deadlines, Views, active/focus/wrap | shared low-chrome tabs, planning panels | Y/Y/Y/P/N | RMAX/R960 `05`–`08`; VR `08b-saved-view-editor` light/dark; GEO | PARTIAL | Saved View create editor now renders; selection/edit, empty/dense queues and keyboard tab movement remain. |
| Task create/edit dialog — `Plan task` or row `Edit` | empty, populated, recurrence, occurrence scope, validation, deletion, date/time, comboboxes, tags | dialog grammar, fields, select, checkbox, combobox, chips | Y/Y/Y/P/Y | RMAX/R960; VR `02-task-create` light/dark/FC; FC native-label recurrence path; DOM | PARTIAL | Validation/delete/occurrence-scope states and keyboard focus containment need current captures. |
| Assessment / actual-time edge UI — row controls | fan open, undo notice, Start/Stop, active timer strip | radial fan, live region, buttons | Y/Y/N/P/N | VR `01d-today-running-timer` and `01e-today-assessment` light/dark; DOM; GEO | PARTIAL | Real Start → running strip → discard and open/Escape assessment paths are clean; add narrow/FC and rollback/undo evidence. |

## Calendar and Analytics

| Surface / entry | Primary states and nested UI | Shared primitives | L/D/N/K/F | Evidence | Status | Defects / next proof |
|---|---|---|---|---|---|---|
| Calendar — sidebar `Calendar` | ordinary/six-week month, current/selected/outside day, dense/empty days, missed state, load bars, month controls | page header, grid buttons, progress material | Y/Y/Y/Y/Y | RMAX/R960; VR `09-calendar` light/dark/FC; DOM 13 Calendar tests; GEO | VERIFIED | Recovery `efcb1a2`: 96px cells and 5px load bars. |
| Analytics — sidebar `Analytics` | week/month/year, period navigation, summary, planned-vs-actual, categories, distribution, streaks, Focus Plan activity, empty/loading | compact period group, tabs, progress, tables, loading/empty states | Y/Y/Y/P/Y | RMAX/R960; VR `10-analytics` light/dark/FC; focused DOM; GEO | PARTIAL | Recovery fixed stretched toolbar. Still capture month/year, empty, plan table local scroll and keyboard. |

## Focus Plans

| Surface / entry | Primary states and nested UI | Shared primitives | L/D/N/K/F | Evidence | Status | Defects / next proof |
|---|---|---|---|---|---|---|
| Plans overview — sidebar `Plans` | lifecycle tabs, list, selected/unselected, empty, long names, create | tabs, list selection, input/button, empty state | Y/Y/Y/P/N | RPR; VR `11-plans`; GEO | PARTIAL | Card nesting, stretched create group, boxed tabs, dead detail frame and the shared-button edge collision were removed. Empty-portfolio, keyboard and FC captures remain. |
| Plan detail/edit — select plan | variants, phases, lifecycle controls, linked work, reviews/activity, drafts/errors | fields, selects, tabs, tables, chips | Y/N/N/P/N | RPR `11b-plans-selected.png`; DOM | PARTIAL | Populated details are now reachable and rendered; capture approaches/phases, linked work, reviews, recovery/error and narrow/dark/FC states. |

## Life, Graph, Reader, and Editor

| Surface / entry | Primary states and nested UI | Shared primitives | L/D/N/K/F | Evidence | Status | Defects / next proof |
|---|---|---|---|---|---|---|
| Life Browse — sidebar `Life System`, `Browse` | focal node, direct children, leaf/no children, pinned state, long descriptions | mode tabs, breadcrumbs, node/child actions | Y/Y/Y/P/N | LIFEP3/R960; VR `12-life-browse`; GEO | PARTIAL | Focal and children now form one bounded, left-anchored hierarchy with the shared icon vocabulary. Leaf/no-child, pagination, long/dense and FC states remain. |
| Life Edit — `Edit` | tree, selected node inspector, add/update/archive, drag source/target/overlay, undo | local-scroll canvas, select/textarea, tag picker, dnd overlay | Y/N/Y/P/N | LIFEP3 `13-life-edit.png`; R960; GEO; DOM | PARTIAL | Tree glyphs were replaced by shared node icons. Inspect drag/undo, keyboard parity, dense/deep tree and dark/FC. |
| Life Pinned — `Pinned` | populated/empty, open Browse, unpin | node list/card, empty state | Y/N/Y/P/N | LIFEP3 `14-life-pinned.png`; R960; GEO | PARTIAL | Populated state is now a left-anchored readable list instead of a centered card island. Empty/unavailable, interaction and dark/FC remain. |
| Life Graph — `Graph` from Browse | nodes/edges/labels, selection/hover/focus, details, dense graph, relationship table | local-scroll canvas, SVG graph, select, details list | Y/Y/Y/P/Y | LIFEP3/R960; VR `15-life-graph` light/dark/FC; GEO; DOM | PARTIAL | Selection is now tonal and the inspector/relationship rows use the shared low-chrome grammar. Add explicit-link/dense/error states. Zoom/pan is `N/A`: no such production behavior exists and Task 51 cannot add Graph semantics. Empty is `N/A`: the projection always contains the Life root. |
| Basic Leaf Reader — open documented leaf | reading measure, outline, links/related tasks, long/Vietnamese/empty/error | reading page, Literata roles, outline, link panels | Y/Y/Y/P/Y | RPR; VR `16-life-reader` light/dark/FC/Vietnamese; DOM; GEO | PARTIAL | Deterministic root → Layout Area → documented-leaf path works. Vietnamese title, outline, uppercase hierarchy, bold/italic body and list are verified; empty/error and a longer multi-page document remain. |
| Basic Leaf Editor — Reader `Edit document` | empty/long document, headings/lists/links/code/quotes, selection/caret, toolbar, outline, save/error | Tiptap, editor toolbar, reading page | Y/Y/Y/Y/N | RDL; VR `17-basic-editor`, `17b-basic-editor-link-dialog`, Vietnamese authored editor; DOM; GEO | PARTIAL | Real no-save entry/exit and shared link dialog render with Escape/focus-return proof; authored Vietnamese heading/body/bold/italic/list content is verified. Selection/caret manipulation, dirty-exit visual, save/error and FC remain. |
| Life Links panel — Reader links action | outgoing/backlinks, search/add/remove, unavailable/archive state | modal surface, search, list buttons | Y/Y/N/P/N | VR `16b-life-link-dialog` light/dark; DOM; GEO | PARTIAL | Initial Add Link dialog and cancel/focus-return path render coherently; search results/no-match, unavailable/archive, remove and narrow/FC remain. |
| Life package flows — Life controls | portable, branch, whole-tree export/import previews, warnings/errors/confirmations | modal grammar, file controls, tables/lists | N/N/N/P/N | DOM/native functional tests only | NOT REVIEWED | Add safe fixture-driven preview captures; never mutate user data. |

## Narrative / Visual Worlds

| Surface / entry | Primary states and nested UI | Shared primitives | L/D/N/K/F | Evidence | Status | Defects / next proof |
|---|---|---|---|---|---|---|
| Narrative Reader — open Narrative leaf | multi-scene reader, timeline/image/rich-text blocks, long/empty/error | reading frame, editorial type, world chrome | Y/Y/Y/P/N | RNA; VR `18-narrative-reader`; DOM; GEO | PARTIAL | Deterministic Narrative entry and first composition pass now exist; export tools form one editorial utility band. Populated multi-block, long/error and FC remain. |
| Narrative Studio — Reader edit | scene navigation, block editors/controls, template chooser, save/error | editor controls, tabs, fields, drag controls | Y/Y/Y/P/N | RNA; VR `19`, `19b`, `19c`–`19g`; DOM; GEO | PARTIAL | Shared controls, all four light/dark worlds, only-block decision and dirty-exit decision now render. Populated block types, drag, save/error and FC remain. |
| Narrative markdown import/export | import dialog, preview/warnings/errors, export | modal grammar, file controls, buttons | N/N/N/P/N | DOM/native functional tests only | NOT REVIEWED | Add real preview capture and keyboard/focus proof. |
| Visual Worlds — Reader/Studio appearance | Paper/Sakura/Aurora/Nocturne × light/dark | semantic world palette + shared radius/elevation/type/motion | Y/Y/N/P/N | VR Studio `19c`–`19f` light/dark; palette tests; GEO | PARTIAL | All eight Studio variants are inspected and coherent with the shell; add explicit Reader variants, narrow and FC. |

## Search, Settings, and floating/edge surfaces

| Surface / entry | Primary states and nested UI | Shared primitives | L/D/N/K/F | Evidence | Status | Defects / next proof |
|---|---|---|---|---|---|---|
| Global Search — sidebar `Search` or `Ctrl+K` | initial, typing/loading, grouped results, keyboard active result, no result, long text, close/restore | modal/search field, result groups, loading/empty | Y/Y/Y/P/Y | SSEP2/R960; VR `21b-search-results` light/dark/FC/Vietnamese; DOM; GEO | PARTIAL | Initial, 16-result grouped/keyboard-active, no-result and three-entity accent-insensitive Vietnamese states render with the shared search icon and no native cancel glyph. Loading/error and keyboard traversal/focus restoration remain. |
| Settings — sidebar `Settings` | goals, tags, backup/restore, keyboard, Foundation tools, forms/tables/destructive actions | settings sections, fields, check/radio/select, tables, chips | Y/Y/Y/P/Y | SSEP2/R960; VR `18-settings` light/dark/FC; GEO; DOM | PARTIAL | Settings now reads as one editorial form: bounded goal controls and hairline section transitions replace full-width strips/card islands. Tag merge/open states, restore dialog and validation/error remain. |
| Tag picker/chips — Task/Life/Settings forms | closed/open region, search/no result, many chips, merge/archive states | disclosure region, checkbox list, chip buttons | Y/Y/N/P/N | VR `02b-task-tags` light/dark; DOM; GEO | PARTIAL | Task create open/search panel with three long choices is inspected; no-result/create/error/selected, Life/Settings contexts, narrow and FC remain. |
| Shortcut help — Settings button or `Ctrl+/` | open/close, eight commands, narrow/long labels | shared dialog, key badges | Y/Y/Y/P/Y | RMAX/R960; VR `22-keyboard-help` light/dark/FC; DOM | PARTIAL | Focus containment/restore current capture remains. |
| Restore confirmation — Settings `Restore` | destructive confirmation, compatibility warning, failure | shared dialog, danger button, status | N/N/N/P/N | DOM/native functional tests only | NOT REVIEWED | Add safe current real capture without completing restore. |
| Saved View editor — Today `Views` | create/edit, predicates, validation, archive/restore confirmation | shared dialog, fields/selects/checkboxes | Y/Y/N/P/N | VR `08b-saved-view-editor` light/dark; DOM; GEO | PARTIAL | Create editor with native selects is inspected; edit/predicate/validation/archive/restore, narrow and FC remain. |
| Editor decision dialogs — Reader/Studio destructive/link actions | Basic link prompt, dirty exits, only-block alert, block/scene delete confirmations | shared decision dialog and modal focus trap | Y/Y/P/Y/P | RDL/VR `17b` light/dark/FC/narrow, `19b`, `19g` light/dark; DOM | PARTIAL | No browser prompt/alert/confirm remains. Basic Link, only-block and real dirty-exit confirmation render and restore/advance focus; block/scene delete and remaining narrow/FC decisions remain. |
| Menus/context menus/tooltips/toasts | none | none | — | static census | CLASSIFIED | No production `role=menu`, context-menu owner, tooltip owner, or toast framework exists. Do not invent a primitive without a real use. |
| Non-modal popups | assessment fan; Life-area/Focus Plan comboboxes; TagPicker disclosure region | listbox/combobox/radial portal | Y/Y/N/P/N | VR `01e`, `02b` light/dark; DOM; static census | PARTIAL | Assessment and TagPicker open states are inspected; capture Life-area/Focus Plan open and loading/error/no-match/selection states. |

## Expanded reachable state families

These rows prevent a broad family row from concealing unreviewed nested states.

| Family / entry | Independently reviewable states | Current evidence | Status |
|---|---|---|---|
| Saved Views manager — Today `Views` | active/archived; selected/unselected; reorder; unsupported/warning; grouped/no-match/loading/error results | DOM plus basic `08-saved-views` capture | PARTIAL |
| Saved View editor | reference-option loading/error; every predicate field; validation; create/edit/archive/restore | light/dark create capture plus DOM | PARTIAL |
| Task nested comboboxes | Life-area and Focus Plan closed/open/loading/error/no-match/selected | DOM only | NOT REVIEWED |
| TagPicker | open/search/create/error/empty/selected; many-chip list | light/dark open capture plus DOM | PARTIAL |
| Focus Plan portfolios/detail | five portfolios; selected/empty; archived/disabled; saving/error; long names | overview capture only | PARTIAL |
| Focus Plan recovery/approaches/phases | recovery draft available/conflict/load/discard; variant select/add/rename/archive/restore; phase add/rename/reorder/archive/restore | DOM only | NOT REVIEWED |
| Focus Plan linked work/reviews | loading/error/empty/populated; review validation/pending/error/empty/history | DOM only | NOT REVIEWED |
| Life Browse/Pinned/related Tasks | loading/error; breadcrumb/history; pagination; pin pending; archived unavailable; related active/completed empty/populated/error | basic Browse/Pinned captures | PARTIAL |
| Life Edit mutations | create/rename/details/tags; move/reorder; archive/restore; archived empty/populated; undo; pending/error | basic Edit capture | PARTIAL |
| Life interchange controls | branch/tree/portable export blocked/success/error and import preview/warning/error | functional tests only | NOT REVIEWED |
| Basic Reader/Editor | empty-leaf chooser; dual-document error; draft available/conflict; outline collapsed/expanded/truncated; asset loading/failure; dirty exit/link prompt | DOM only | NOT REVIEWED |
| Life Links | persistent outgoing/backlinks plus nested Add Link dialog; eligibility/unavailable/remove pending/error; search initial/loading/error/no-match/selected/create-error | light/dark initial dialog capture plus DOM | PARTIAL |
| Narrative blocks/editor | timeline/image/rich-text/metric/callout; unknown/unsupported preservation; asset loading/failure; draft conflict; reorder; undo/redo; delete/dirty-exit dialogs | all worlds and dirty-exit light/dark plus DOM | PARTIAL |
| Settings category goals/tags | configured/unconfigured/validation/saving/error; tag create/rename/archive/restore/merge confirm/error/aliases | top capture plus DOM | PARTIAL |
| Settings backup/Foundation | create pending/cleanup notice/list error/compatibility variants/restore pending/error; Foundation loading/error/empty/create/edit/archive/restore | basic captures plus functional tests | PARTIAL |
| Global Search | initial/loading/error/grouped/truncated-more/keyboard-active/no-match/long result | SSEP2 initial/grouped/active/no-match captures plus DOM | PARTIAL |
| Task deletion | matrix row 1.24 requires confirmation; runtime currently deletes directly from the edit dialog | no confirm surface exists | NOT REVIEWED |

## Closure infrastructure and evidence blockers

These are part of Task 51's completion contract, not optional follow-up work.

| Requirement | Current evidence | Status | Smallest complete correction |
|---|---|---|---|
| Deterministic visual regression | `@wdio/visual-service` compares 87 tracked, fixture-backed production goldens across canonical light `1536×794`, achieved-minimum light `959×639`, canonical dark `1536×794`, canonical forced colors and Vietnamese typography. Coverage now includes all major route families, timer/assessment, TagPicker, Saved View editor, Life Link dialog, all eight Studio world variants, editor decisions, Search and Keyboard Help. Acceptance is off by default, runtime diffs stay under `target`, environment metadata is tracked, and comparisons remain exact-zero. | PARTIAL | Add remaining empty/dense and import/restore edge-flow coverage; retain zero mismatch and the explicit acceptance policy. |
| Release geometry assertion | `a78cf58` updates `phase21-global-layout.e2e.ts` to the approved Today/Calendar `wide` taxonomy, reuses one measured inner-viewport helper for all established sizes, and hard-asserts collision/document/viewport-overflow totals. The current native run passed all four viewport groups across expanded/collapsed routes, scrolled Settings, Task recurrence, Search, Life surfaces and edge dialogs. | VERIFIED | Keep this release gate green through final closure. |
| Full viewport matrix | The current hardened Phase 21 native run passed maximized `1536×794`, requested `1280×800`, requested `1280×720`, and requested `960×640`; the helper measures and verifies the achieved inner viewport before assertions. VR additionally supplies inspected, zero-diff production goldens at maximized and achieved-minimum `959×639`. | VERIFIED | Re-run after any later geometry-affecting production change. |
| Production dark / forced-colors / reduced-motion | The DevTools-scoped WebView2 media override independently hard-asserts production `matchMedia` for all three axes. Dark supplies 15 inspected zero-diff goldens; forced colors supplies 10 inspected zero-diff goldens covering structure, native controls, graph, editor/dialog, Settings, Search and Keyboard Help. Reduced motion passed the full 36-state interaction/geometry walk; its five representative static captures matched the light goldens byte-for-byte and therefore are retained as labeled runtime evidence rather than duplicate tracked PNGs. | VERIFIED | Keep all media preconditions and exact-zero comparisons green. |
| Vietnamese typography evidence | `docs/audits/task-51-typography.md` restores the ADR evidence link without reopening selection. Four inspected, exact-zero production goldens cover dense Segoe Task/Search UI and Literata Reader/Editor title, uppercase H2, H3, body, bold, italic and lists; the full native walk is geometry-clean. | VERIFIED | Keep the dedicated Vietnamese fixture and zero-diff pass green. |
| Narrator and physical DPI | No truthful current manual evidence exists. | NOT REVIEWED | Run the repository's manual Windows protocol where the environment permits and record exact observations; retain an explicit external limitation instead of claiming a pass if unavailable. |
| Static visual residue | Current ratchet passes while permitting 13 feature hex values, 14 literal feature transitions, 27 candidate glyph-icon lines, prototype-only shared button recipes, duplicate tabs/comboboxes, and native select/search affordance questions. | PARTIAL | Migrate or explicitly justify every hit, add static guards where appropriate, and render the production control matrix on WebView2. |

## Intentionally non-production

| Component | Classification | Reason |
|---|---|---|
| `frontend/src/prototypes/narrative-canvas-schema/CanvasEditorA/B` | CLASSIFIED | Task 20 schema-strategy prototypes; deliberately isolated and unrouted. |
| `frontend/src/prototypes/task51/` | CLASSIFIED | Superseded visual/motion lock evidence; separate Vite entry, not production UI. |

## Current checkpoint

At local commit `efcb1a2`, the real-app recovery evidence is:

```text
maximized 1536×794   28 states   0 collisions   0 document overflow   0 viewport overflow
minimum    960×639   28 states   0 collisions   0 document overflow   0 viewport overflow
focused behavior     31 tests across Calendar, WeekStrip, Analytics
verify · typecheck · build · performance   PASS
```

The ledger is intentionally not a closure claim. `PARTIAL` and `NOT REVIEWED` rows are active work,
not accepted debt.
