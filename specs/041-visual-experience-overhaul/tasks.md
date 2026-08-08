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
- [ ] Do not begin production visual reconstruction before `VISUAL LOCK APPROVED` is received.

## Stage G — Motion prototype

- [ ] Assign each interaction to its cheapest correct layer.
- [ ] Prove completion commits state before the check settles, and that rollback is coherent.
- [ ] Prove the inspector reads as the plane rebalancing, not a card appearing.
- [ ] Feature-detect element-scoped View Transitions and prove the fallback.
- [ ] Instrument acknowledgement, inspector open, completion, reorder, drag, route and traversal.
- [ ] Compare normal and reduced motion; do not fabricate unmeasurable numbers.

## Stage H — MOTION LOCK

- [ ] Present frame evidence, timings and tradeoffs, then **STOP**.
- [ ] Do not begin production reconstruction before `MOTION LOCK APPROVED` is received.

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

- [ ] Change no product semantics, and invent no Task facet to match the reference image.
- [ ] Keep schema 27 with no migration, Rust product change, IPC command or capability.
- [ ] Add no dependency outside the four justified above.
- [ ] Keep `.github/workflows/` and the seal byte-identical.
- [ ] Keep Task rows non-card and Today task-first and default.
- [ ] Never claim visual fidelity without the Product Owner's image.
