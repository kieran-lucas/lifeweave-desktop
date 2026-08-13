# Task 51 Work Items

## Stage A — Baseline

- [x] Confirm clean parity at `43d0d1e822336c97527f85e1ab154fc74a61f058` before any edit.
- [x] Run install, verify, typecheck, test, build and the performance budget at the baseline.
- [x] Run the Task 50 maximized layout audit and record collisions, overflow and frame utilisation.
- [x] Record the Windows environment, WebView2 version, DPR and measured inner viewport.
- [x] Census the existing visual system by extraction: radii, shadows, hardcoded colours, tokens.
- [x] Create the local `task-51-visual-experience` branch as a rollback point. Do not push.
- [x] Write `docs/audits/task-51-visual-baseline.md`.

## Stage B — Governance

- [x] Record ADR 0045 and Slice 041 without any product code change.
- [x] Report the Task 51 prohibition contradiction rather than reconciling it silently.
- [x] Update PROJECT_STATE, START_HERE, STATUS and ROADMAP so the ledger agrees with the
      authorized state.
- [x] Regenerate the spec index and coverage matrix; keep `pnpm verify` green.

## Stage C — State matrix

- [x] Extend the Task 50 census into the Task 51 visual state matrix.
- [x] Cover Today populated, dense, selected, completed, timer-running, empty, create, edit,
      recurring, Upcoming, Overdue, Deadlines and Saved Views.
- [x] Cover Calendar, Analytics, Focus Plans, Life Browse/Edit/Pinned/Graph/Reader/Basic editor.
- [x] Cover Narrative Reader, Studio and representative Visual Worlds — not covered by the existing
      walk.
- [x] Cover Search, Settings, Backup, dialogs, destructive confirmation, keyboard help, tag picker,
      menus and popovers.
- [x] Cover dark mode, forced colors and reduced motion as global axes.
- [x] Record that the four Narrative Visual Worlds are an approved per-world palette to harmonise,
      not stray colour to delete.

## Stage D — Prototype infrastructure

- [x] Obtain the Product Owner reference image and store it at `docs/visual/task-51/`.
- [x] Add `@vanilla-extract/recipes` with a dependency-policy note. *(provisional — removed before
      closure if the production primitives never need a second variant axis)*
- [x] Add self-hosted `@fontsource-variable/literata`, importing only the required axis CSS.
      *(3 of 7 subsets: latin, latin-ext, vietnamese — 106,560 bytes)*
- [x] Add a curated `@fluentui/svg-icons` subset; do not load the full set at runtime.
      *(devDependency only; 22 of 20,621 icons vendored by `scripts/generate_visual_icons.py`)*
- [x] Add `@wdio/visual-service@^9`; do not migrate WebdriverIO during Task 51.
- [x] Build the visual token contract with light and dark themes derived in `oklch()`.
- [x] Build the type scale, motion tokens and icon pipeline.
- [x] Build the isolated prototype under `frontend/src/prototypes/task51/` with stress fixtures.
- [x] Touch no production presentation file. *(production build byte-identical, same content hash)*
- [x] Record the light-blue art direction as an explicit Product Owner decision.

## Stage E — Full-screen Today prototype

- [x] Measure the reference image and reconcile its proportions with the real 1536 × 794 viewport.
- [x] Build the whole `Sidebar | Today | Inspector` composition at once, never widget by widget.
- [x] Produce the lock states, including dark.
- [x] Render at 1440 × 900, 1280 × 720 and 960 × 640 and prove the degradation keeps the visual DNA.
- [x] Count enclosure levels explicitly. *(3 counting tonal zones, 1 counting bordered boxes; both
      reported rather than tuning the detector)*
- [x] Verify contrast against the derived tokens: 4.5:1 text, 3:1 boundaries and state.
- [x] Run the semantic-collision detector and the geometry invariants over the prototype.
      *(12 captures, 0 collisions, 0 overflow)*
- [x] Record every deviation from the reference with what, why, evidence and reversibility.
- [ ] Reduced-motion composition capture — deferred to the motion phase, where it is meaningful;
      reduced motion currently changes timing only, not composition.

## Stage F — VISUAL LOCK

- [x] Present captures, viewport, DPR, token values, deviations and open questions, then **STOP**.
- [x] **`VISUAL LOCK APPROVED` received.**

### Product Owner decisions recorded at the gate

- [x] Keep the **native decorated titlebar**; no `decorations: false`, no custom HTML titlebar, no
      window-control capability. §11's capability exclusion stands unamended.
- [x] Keep `@vanilla-extract/recipes`, constrained to primitives that genuinely have variants.
- [x] Locked composition stands unchanged: continuous surface, inspector on the workspace canvas,
      periods with no container, `#EFEFF4` selection fill plus the 2 px accent edge.
- [x] Strengthen the art toward a clear light-blue vibe, ambient roles only, content plane stays
      warm-neutral, 33° of hue separation from the accent.

## Stage G — Motion prototype

- [x] Assign each interaction to its cheapest correct layer.
- [x] Prove completion commits state before the check settles, and that rollback is coherent.
- [x] Prove the inspector reads as the plane rebalancing, not a card appearing.
- [x] Feature-detect element-scoped View Transitions and prove the fallback.
- [x] Instrument acknowledgement, inspector open, completion, layout settling, drag and day change.
- [x] Compare normal and reduced motion; do not fabricate unmeasurable numbers.
- [x] Keep the art static so it can never take a frame from an interaction.

## Stage H — MOTION LOCK

- [ ] Present frame evidence, timings and tradeoffs, then **STOP**.
- [ ] Do not begin production reconstruction before `MOTION LOCK APPROVED` is received.

## Product Owner Life usability amendment — complete

- [x] Record the presentation-scope contradiction and accepted decision in ADR 0046, the registry,
      active spec, acceptance criteria, and status.
- [x] Keep Browse and Graph semantics unchanged while rotating only the full Tree workspace.
- [x] Replace the visible Edit mode and permanent inspector with Tree plus node-local Add child and
      Edit node controls; retain all advanced mutations on demand.
- [x] Center and restyle the node action surface; dismiss it on repeat activation, outside pointer
      press, action selection, and Escape with deterministic keyboard focus return.
- [x] Remove Tree scrollbars, add empty-canvas hold-drag panning, disable direct node drag-and-drop,
      and preserve keyboard access through arrow, Shift-arrow, and Home viewport controls.
- [x] Widen Tree cards, wrap complete titles, replace the persistent black selected fill, and make
      repeat activation/outside press/Escape/editor close clear selection.
- [x] Add schema 29 to converge the stable-ID Life Focus tree to exactly 53 English-only nodes,
      correct Finance under Security, preserve all leaf documents, and assign semantic icons.
- [x] Compact and raise the Tree heading, fit the bordered pan viewport to the remaining Life pane,
      and prevent Tree mode from creating an outer Life-canvas scroll region.
- [x] Densify the 53-node Tree with measured generation widths and collision-tested vertical rhythm;
      add damped wheel/two-axis trackpad scrolling while keeping local scrollbars hidden.
- [x] Correct Life session snapshots so sibling leaf-to-leaf Back restores the immediately previous
      Reader before the containing branch.
- [x] Recompose Focus Plan detail around a compact identity and a dominant outcome writing surface
      while preserving every existing fact, criterion, linked-work, and lifecycle path.
- [x] Remove the duplicate Tiptap Link extension, stable-initialize editor options, and stop
      transaction-wide React rerenders without weakening recovery or revision safety.
- [x] Add contextual table structure controls, local overflow, real-editor deletion/table tests,
      focused interaction tests, and automated accessibility coverage.
- [x] Pass 665 tests across 52 files, build, typecheck, repository verification, diff check, and performance budget
      with BasicLeafEditor at 52,657 / 53,410 raw bytes.
- [x] Trace the production startup graph and move non-default routes, Life/Narrative/tree engines,
      shortcut help, and task-composer-only controls behind point-of-use lazy boundaries.
- [x] Stop the advisory health probe from serially blocking the first Today mount while preserving
      the existing core-unavailable failure path.
- [x] Reduce startup `index.js` from 433,337 to 274,368 raw bytes and startup CSS from 99.10 kB to
      33.68 kB; lock the graph with contract tests and a 279,856-byte operational maximum without
      raising the hard ceiling.
- [x] Record native WebView click/typing/visual verification as **NOT RUN** because the configured
      in-app Browser runtime reported no available browser; do not infer it from jsdom.
- [x] Record ADR 0047 and the Product Owner's manual Focus Plan score amendment.
- [x] Add migration 28 plus checked, revisioned Rust score authority and generated bindings.
- [x] Add the right-aligned accessible score circle, bounded 1–100 dialog, and completed-only title
      strike without adding a second IPC command.
- [x] Prove migration/reopen, backend validation, keyboard/focus behavior, accessibility, build,
      backup compatibility, generated-binding stability, and performance budgets.

## Product Owner Task and Plan usability amendment — deterministic verification complete

- [x] Increase the Task Description editing viewport without changing stored Task semantics, and
  remove the incorrect Notes label from the task composer.
- [x] Replace the mixed Task-composer rail/grids with one six-column form authority and align every
  Context label/control row to the shared 52 px geometry.
- [x] Convert Life Area from an all-level list to a staged Domain → Section → Area picker and reduce
  Life Area / Focus Plan closed values, clear actions, and popup metadata to a compact grammar.
- [x] Present Life Area choices as visible domain/section/leaf levels in the shared picker.
- [x] Improve Plan Start/Target date labels, formatting, type hierarchy, and vertical separation.
- [x] Give Active Plans an explicit text badge with redundant green emphasis and forced-colors path.
- [x] Make a non-null score complete the Plan in the existing revisioned mutation and route the UI
      to Completed after success with deterministic focus.
- [x] Add append-only schema 30 to converge already-scored Plans without changing unscored Plans.
- [x] Pass focused and full frontend/Rust tests, migration/backup checks, typecheck, build,
      governance, automated accessibility, formatting, diff checks, and strict Rust Clippy.
- [ ] Run native visual inspection: **NOT RUN** because the configured in-app Browser runtime
      reports no available browser.
- [ ] Resolve the pre-existing Task 51 performance-budget mismatch: a clean `43a6677` worktree and
      this amendment emit identical over-budget `LifeScreen.js` (65,116 B) and
      `NarrativeCanvasStudio.js` (65,326 B) chunks. Do not inflate their locked ceilings here.

## Product Owner repository cleanup

- [x] Trace both frontend entry graphs and remove only production files with no reachable importer.
- [x] Remove unused locals, exports, compatibility styles, the null Atmosphere shell, and the exact
      duplicate monochrome brand SVG.
- [x] Remove the redundant direct `@dnd-kit/accessibility` declaration while retaining its exact
      transitive ownership through `@dnd-kit/core`; preserve the locked recipes dependency.
- [x] Make unused frontend locals and parameters a permanent TypeScript error.
- [x] Preserve Rust domains, registered IPC, migration history, generated bindings, backup
      compatibility, historical audit evidence, and user data.
- [x] Pass frontend typecheck and 645 tests across 48 files; pass strict Rust Clippy and 801 tests
      with 4 intentionally ignored; pass production build, governance, security, and Python checks.

## Product Owner Task composer coherence amendment

- [x] Use one Category picker in both Plan Task and Edit Task, with governed icon, selected text,
      keyboard navigation, outside/Escape dismissal, and focus restoration.
- [x] Add append-only schema 31 with ten approved workstreams through non-overwriting,
      idempotent inserts and migration preservation tests.
- [x] Replace the scheduled-date and optional Deadline native calendars with one accessible local
      date grid; retain exact one-minute Start/End wheel authority and improve dismissal/focus.
- [x] Replace mixed Priority/Repeat selects with the shared labelled choice language without
      changing domain values or recurrence semantics.
- [x] Share the Focus Plan target query key and invalidate it after every successful canonical Plan
      create/mutation/score/archive/restore path.
- [x] Place selected-leaf actions above dense rows and retain branch actions below.
- [x] Recompose both Task paths as one standard-width matte instrument with a black identity header,
      Essentials / Schedule / Context hierarchy, coherent monochrome controls, internal scroll,
      sticky action footer, and automated semantic/accessibility coverage.
- [x] Replace Task-composer snap-like entrances with governed route/inspector settling and layered
      opaque elevation while preserving Reduced Motion and the no-blur/no-gradient authority.
- [x] Remove time-wheel typography reflow: keep every row at 40 px and every numeral at 15 px,
      prohibit selected-state scaling, and prove one smooth row per discrete wheel step.
- [x] Align Edit Plan as one document-first instrument with labelled Title/Outcome fields and a
      two-column, 52 px Start/Target/Life Area/Status control grid matching Edit Task's grammar.
- [x] Scope read-only Plan fact layout away from edit fields and normalize the Content toolbar's
      group heights, button centers, glyph baselines, and inherited font style.

## Stage I–L — Production reconstruction

- [ ] Promote the visual foundation into production.
- [ ] Replace the `check_layout_authority.py` art-direction freeze with a Task 51 authority check
      and its tests; never delete or weaken it to clear a red gate.
- [ ] Rebuild reduced motion as a designed state rather than a blanket zeroing.
- [ ] Reconstruct the shell to the locked proportions, including the inspector column.
- [ ] Preserve navigation semantics, the eight shortcuts, focus behaviour and scroll containment.
- [ ] Rebuild Today's presentation, keeping every hook, query and business behaviour.
- [ ] Build the context inspector from the facets a Lifeweave Task actually has.
- [ ] Extract a shared inspector architecture only after a second surface proves the pattern.
- [ ] Migrate Calendar, Analytics and Focus Plans.
- [ ] Migrate Life Browse, Edit, Pinned and Graph; reduce cardification and heavy shadow.
- [ ] Migrate Reader, Basic Editor and Narrative.
- [ ] Migrate Search, Settings, Backup, dialogs, popovers and menus; leave no browser-default control.
- [ ] Run the gate sequence after each slice, not only at the end.

## Stage M–N — Regression, polish and closure

- [ ] Integrate WebdriverIO visual regression with recorded baseline metadata and approved goldens.
- [ ] Keep the Task 50 geometry audit and the collision detector at zero across the full matrix.
- [ ] Measure interaction timings, idle CPU and GPU, and bundle deltas against the baseline.
- [ ] Complete the accessibility gates; record honestly anything not run.
- [ ] Review the full diff against the activation SHA for accidental scope.
- [ ] Write the closure audit with measured values, deviations and known tradeoffs.
- [ ] Update STATUS, ROADMAP, the decision registry and PROJECT_STATE.
- [ ] Report the local checkpoint. Do not push unless the Product Owner explicitly requests it.

## Standing constraints

- [ ] Change no product semantics beyond the explicit manual Plan score amendment and later
      Product Owner Life Focus/Tree correction; invent no Task facet to match the reference image.
- [ ] Keep schema 31 with no further migration, second Plan IPC command or capability unless the
      Product Owner explicitly authorizes another persisted change.
- [ ] Add no dependency outside the four justified above.
- [ ] Keep `.github/workflows/` and the seal byte-identical.
- [ ] Keep Task rows non-card and Today task-first and default.
- [ ] Never claim visual fidelity without the Product Owner's image.
