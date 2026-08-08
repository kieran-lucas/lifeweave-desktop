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
- [ ] Update PROJECT_STATE, START_HERE, STATUS and ROADMAP so the ledger agrees with the
      authorized state.
- [ ] Regenerate the spec index and coverage matrix; keep `pnpm verify` green.

## Stage C — State matrix

- [ ] Extend the Task 50 census into the Task 51 visual state matrix.
- [ ] Cover Today populated, dense, selected, completed, timer-running, empty, create, edit,
      recurring, Upcoming, Overdue, Deadlines and Saved Views.
- [ ] Cover Calendar, Analytics, Focus Plans, Life Browse/Edit/Pinned/Graph/Reader/Basic editor.
- [ ] Cover Narrative Reader, Studio and representative Visual Worlds — not covered by the existing
      walk.
- [ ] Cover Search, Settings, Backup, dialogs, destructive confirmation, keyboard help, tag picker,
      menus and popovers.
- [ ] Cover dark mode, forced colors and reduced motion as global axes.

## Stage D — Prototype infrastructure

- [ ] Obtain the Product Owner reference image and store it at `docs/visual/task-51/`.
- [ ] Add `@vanilla-extract/recipes` with a dependency-policy note.
- [ ] Add self-hosted `@fontsource-variable/literata`, importing only the required axis CSS.
- [ ] Add a curated `@fluentui/svg-icons` subset; do not load the full set at runtime.
- [ ] Add `@wdio/visual-service@^9`; do not migrate WebdriverIO during Task 51.
- [ ] Build the visual token contract with light and dark themes derived in `oklch()`.
- [ ] Build the type scale, motion tokens, icon pipeline and primitive recipes.
- [ ] Build the isolated prototype under `frontend/src/prototypes/task51/` with stress fixtures.
- [ ] Touch no production presentation file.

## Stage E — Full-screen Today prototype

- [ ] Measure the reference image and reconcile its proportions with the real 1536 × 794 viewport.
- [ ] Build the whole `Sidebar | Today | Inspector` composition at once, never widget by widget.
- [ ] Produce all seven lock states, including dark and the reduced-motion composition.
- [ ] Render at 1440 × 900, 1280 × 720 and 960 × 640 and prove the degradation keeps the visual DNA.
- [ ] Count enclosure levels explicitly; keep visible content within two without a recorded reason.
- [ ] Verify contrast against the derived tokens: 4.5:1 text, 3:1 boundaries and state.
- [ ] Run the semantic-collision detector and the geometry invariants over the prototype.
- [ ] Record every deviation from the reference with what, why, evidence and reversibility.

## Stage F — VISUAL LOCK

- [ ] Present captures, viewport, DPR, token values, deviations and open questions, then **STOP**.
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
