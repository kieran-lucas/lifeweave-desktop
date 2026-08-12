# Task 51 Acceptance

Task 51 closes only when all of the following are evidenced. Screenshots are review evidence and are
never the sole proof of anything.

## Product Owner Life usability amendment

- Life Tree geometry proves root x < child x < grandchild x while siblings occupy distinct rows;
- node actions are absent before selection and selection reveals only Add child and Edit node;
- the action surface is centered against its node and closes on repeat activation, outside pointer
  press, action selection, and Escape; Escape returns focus to the invoking node;
- the Tree viewport has no local scrollbar; hold-drag on empty space pans both axes, hold-drag on a
  node remains structural drag, and arrow/Shift-arrow/Home provide keyboard pan parity;
- the compact Tree heading stays above a bordered viewport that fills the remaining Life pane, and
  Tree mode produces no outer Life-canvas scrollbar;
- the node editor is absent by default, opens on explicit request, and retains reorder, reparent,
  archive/restore, tag, interchange, Browse, and undo paths;
- the production Tiptap extension set contains no duplicate Link extension and a real-editor test
  proves deletion and table structural transactions;
- editor updates do not request a React rerender on every ProseMirror transaction; recovery draft
  and committed autosave remain serialized and debounced;
- an active table exposes keyboard-reachable controls for rows, columns, and deletion, and wide
  table content scrolls within the editor rather than the application document.
- opening a Focus Plan shows a compact title/lifecycle identity and a clearly dominant authored
  outcome surface in both read and edit states, without removing facts, criteria, linked work, or
  lifecycle controls;

## Process

- the Product Owner's reference image is stored in the repository and cited as the appearance
  authority; no approximation was generated and presented as authoritative;
- the full-screen Today prototype was presented and `VISUAL LOCK APPROVED` was received in words;
- the motion prototype was presented and `MOTION LOCK APPROVED` was received in words;
- no production presentation file was visually overhauled before VISUAL LOCK;
- every layout problem discovered during implementation updated the locked design and its evidence
  before production was changed;
- work remained local on `task-51-visual-experience`; nothing was pushed, no PR was opened, no
  remote branch was modified, and `.github/workflows/` and the seal are byte-identical.

## Visual authority

- exactly one visual authority exists under `frontend/src/design-system/visual/`, and after the
  slice no domain CSS file declares a hardcoded colour, a raw radius, a raw shadow, an editorial
  font stack or an ad-hoc transition;
- the radius vocabulary is 4 levels, elevation 3, hairline 2 — replacing the measured baseline of
  31 radii and 14 shadows; any value outside a vocabulary has a documented reason;
- the 29 hardcoded hex colours measured in `features/*` are gone, and the roles that replaced them
  participate in dark theme and forced colors;
- light and dark are two implementations of one theme contract, and dark is composed deliberately
  rather than derived by inversion;
- the geometry authority still declares geometry only, and the visual authority declares no
  geometry;
- the `check_layout_authority.py` art-direction freeze was replaced by a Task 51 art-direction
  authority check with its own tests, and was never deleted or weakened to make a red gate green.

## Fidelity and composition

- the result is immediately recognizable as the reference direction, with no generic SaaS, Notion,
  Linear, Fluent-demo, glassmorphic, gamer, cyberpunk or card-grid drift;
- the three-panel selected-task state matches the reference composition closely at the measured
  maximized viewport;
- the surface reads as continuous rather than card-stacked; structural boundaries are subtle and
  legible;
- visible content does not exceed two enclosure levels anywhere without a recorded reason, and an
  explicit enclosure count was taken rather than eyeballed;
- no boxed horizontal navigation strip sits inside or beneath another box — specifically, the Life
  mode switch and the Today workspace tabs are low-chrome;
- task rows are precise, scannable and non-card; the inspector reads as one composition;
- the selected state is restrained and does not combine strong border, saturated fill and shadow;
- empty and dense states both remain balanced;
- every deviation from the reference is recorded with what, why, evidence and reversibility, and no
  deviation is merely personal taste.

## Whole-application coherence

- Today, Calendar, Analytics, Focus Plans, Life Browse/Edit/Pinned/Graph, Reader, Basic Editor,
  Narrative Reader/Studio/Visual Worlds, Search, Settings, Backup settings and every dialog, popover
  and menu share one type scale, colour grammar, spacing, hairline language, icon weight, depth
  language and motion vocabulary;
- no surface still shows unstyled browser-default controls;
- Task 51 does not close as a Today reskin.

## Product behaviour preserved

- every existing flow still works; no business semantics changed;
- the eight global keyboard shortcuts and their chords are unchanged;
- Task rows remain non-card; Today remains task-first, startup and default;
- semantic periods keep their boundaries; Life Browse still shows the selected node and direct
  children;
- no category was renamed, no recurrence control removed, no metadata dropped, no error or recovery
  information hidden, and no accessibility alternative collapsed to make a screenshot match;
- no Task facet was invented — in particular no subtasks and no task-to-task links;
- schema remains 27 with no migration, no Rust product change, no new IPC command, no new capability,
  no broadened permission, no network service and no backup-format change.

## Geometry

- the Task 50 maximized audit reports zero semantic spacing collisions and zero document and
  viewport overflow across the full matrix;
- `scrollWidth <= clientWidth + 1` holds at the document root, main viewport and page frame at the
  measured maximized viewport, 1440 × 900, 1280 × 720 and 960 × 640, in every sidebar state and with
  the inspector open and closed;
- no overflow is concealed: no global `overflow-x: hidden`, negative-margin clipping, `translateX`
  compensation or `scale()` to fit appears in the diff;
- any intended change to layout authority is explicit, justified and accompanied by updated tests.

## Motion

- state commits before motion in every mutation path, and a rollback is coherent when a mutation
  fails;
- direct manipulation is interruptible and uses transform-based layout animation, never snapshot
  view transitions;
- no `transition: all`, continuous animated blur, large animated filter, per-frame large shadow
  interpolation, page-wide parallax or looping Today animation appears in the diff;
- element-scoped View Transitions are feature-detected and the fallback was proven to work;
- reduced motion is a designed state that produces no disorienting jump, and both paths were tested.

## Performance

- measured, not asserted: click to first visual acknowledgement, inspector open, task completion and
  reorder, drag responsiveness, route change and Life traversal;
- no avoidable main-thread task over 50 ms on a hot interaction path, and tasks over 16 ms were
  investigated;
- no IPC or database work occurs per pointer-move frame;
- idle CPU and GPU settle on Today and Reader, demonstrated by measurement rather than claimed;
- editor, Narrative, Graph, exporters and optional art remain lazy and out of Today startup;
- Today is the only eager product screen; Life/tree engines, non-default routes, shortcut help and
  task-composer-only pickers remain outside its startup graph;
- the advisory health probe preserves the core-unavailable failure path without blocking the first
  Today mount;
- bundle deltas are reported in raw and gzip bytes against the recorded baseline of `index.js`
  529,527 with 5,473 bytes of headroom; any ceiling change is an explicit Product Owner decision
  supported by that measurement, never a response to a red gate.
- the optimized production artifact measures 274,368 raw / 84,033 deterministic gzip bytes for
  `index.js`, with an operational maximum of 279,856 and the locked 550,000-byte ceiling unchanged.

## Accessibility

- WCAG 2.2 AA core flows pass; native semantics first; keyboard parity for every core flow;
- focus restoration is deterministic and `:focus-visible` is visible on the new palette;
- derived colours meet 4.5:1 for body text and 3:1 for interface boundaries and state, verified by
  measurement of the actual tokens;
- no meaning is carried by colour alone; icon-only controls have accessible names;
- forced colors, high contrast, light, dark and reduced motion are all valid;
- Narrator spot checks, Windows DPI checks and Vietnamese glyph checks were performed, or are
  recorded honestly as NOT RUN;
- pointer targets remain usable despite small icon sizes.

## Testing and evidence

- typecheck, frontend tests, production build, performance budget, `pnpm verify`, the relevant native
  E2E phases and the Task 50 geometry audit all pass;
- visual regression goldens exist for every state in the matrix, with recorded Windows version,
  WebView2 version, DPR, inner viewport, theme, motion preference and fixture version;
- no golden was silently overwritten, no mismatch tolerance was widened to make a suite green, and
  masking covers only genuinely nondeterministic content;
- each evidence class is recorded separately and none is conflated;
- pre-existing verification debt — the Phase 14 / Phase 17 fixture collision, and physical DPI
  evidence — is disclosed rather than weakened or silently inherited;
- the full diff against the activation SHA was reviewed for accidental scope.

## Documentation

- ADR 0045, Slice 041 spec, plan, acceptance and tasks are current;
- the closure audit records actual measurements, deviations and known tradeoffs, with no fabricated
  evidence;
- STATUS, ROADMAP, the decision registry and PROJECT_STATE are updated per repository governance;
- worktree clean, and the final state and local checkpoint are reported to the Product Owner.
