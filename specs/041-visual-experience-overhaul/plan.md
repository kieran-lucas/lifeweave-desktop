# Task 51 Execution Plan

Status: ACTIVE — Stage A and Stage B complete, Stage C in progress.

Two hard stops divide this plan. Nothing in Stage F or later may begin before
`VISUAL LOCK APPROVED`, and nothing in Stage H or later before `MOTION LOCK APPROVED`.

## Stage A — Baseline, no product edits

Confirm clean parity at `43d0d1e822336c97527f85e1ab154fc74a61f058`. Read the constitution, the
source-integrity contract, ADR 0044, the Task 50 audits and Slice 040. Run the full gate sequence
before changing anything: install, verify, typecheck, test, build, performance budget, and the
Task 50 maximized layout audit. Record the Windows environment, WebView2 version, DPR, measured
inner viewport, bundle inventory, test counts and the collision/overflow result. Census the existing
visual system by extraction — radii, shadows, hardcoded colours, custom properties. Create the local
branch. Write `docs/audits/task-51-visual-baseline.md`.

**Complete.** 766 tests, `violations: []`, 24 screens with 0 collisions and 0 overflow at
1536 × 794 / DPR 1.25.

## Stage B — Governance packet

Record ADR 0045 and Slice 041. Report the `START_HERE` / `STATUS` / Slice 040 contradiction with the
activation prompt rather than reconciling it silently, and update the ledger, status, roadmap and
entry document so they agree with the authorized state. Regenerate the spec index and coverage
matrix. Run the source, governance and index gates. Commit locally.

**Complete.**

## Stage C — Visual state matrix

Extend the Task 50 surface census into the Task 51 state inventory: Today in its populated, dense,
selected, completed, timer-running, empty, creating, editing, recurring, Upcoming, Overdue,
Deadlines and Saved Views states; Calendar, Analytics, Focus Plans, Life, Narrative, Search,
Settings, Backup, dialogs, destructive confirmation, keyboard help, tag picker, menus and popovers;
and the global axes of dark mode, forced colors and reduced motion. Note where the existing
`task50b` walk already covers a state and where Task 51 must add one — Narrative Studio and the
Visual Worlds are not covered today. This inventory is the visual regression inventory.

## Stage D — Prototype infrastructure

Add only justified dependencies, each with the `docs/DEPENDENCY_POLICY.md` note: vanilla-extract
recipes, self-hosted Literata Variable, a curated Fluent System icon subset, and the WebdriverIO v9
visual service. Build the visual token contract with light and dark themes, the type scale, the
motion tokens, the icon pipeline and the primitive recipes. Create the isolated prototype surface
under `frontend/src/prototypes/task51/` with realistic seeded fixtures including the §17 stress
cases. No production presentation file is touched.

## Stage E — Full-screen Today prototype

Build the whole `Sidebar | Today | Inspector` composition at once, never widget by widget. Measure
the reference image and reconcile its proportions with the real 1536 × 794 viewport. Produce every
lock state: populated without selection, selected task with inspector, dense, empty, running timer,
dark selected, and the reduced-motion composition. Render at 1440 × 900, 1280 × 720 and 960 × 640
and prove the degradation preserves the visual DNA. Run the semantic-collision detector, the
geometry invariants, contrast checks and an enclosure-level count over the prototype. Compare
side-by-side with the reference and record every deviation with its reason and reversibility.

## Stage F — VISUAL LOCK

Present captures, exact viewport and DPR, token values, deviations, contrast results, geometry
results and open questions. **STOP.** Wait for `VISUAL LOCK APPROVED`. Do not infer it.

## Stage G — Motion prototype

On the locked composition only. Assign each interaction to its cheapest correct layer. Prove the
completion sequence commits state before the check settles and that rows resettle smoothly and
interruptibly afterwards. Prove the inspector reads as the plane rebalancing rather than a card
appearing. Feature-detect element-scoped View Transitions and prove the fallback. Instrument click
to first acknowledgement, inspector open, completion and reorder, drag responsiveness, route change
and Life traversal. Compare normal and reduced motion. Do not fabricate a number the tooling cannot
measure.

## Stage H — MOTION LOCK

Present frame evidence, measured timings, the reduced-motion comparison and known tradeoffs.
**STOP.** Wait for `MOTION LOCK APPROVED`.

## Stage I — Visual foundation in production

Promote the token contract, typography, icon pipeline, radius/elevation/hairline primitives, motion
tokens and primitive recipes into production. Replace the `check_layout_authority.py` art-direction
freeze with the Task 51 art-direction authority check — intentionally, with its own tests, never by
deletion. Rebuild reduced motion as a designed state.

## Stage J — Shell and Today

Reconstruct the shell to the locked proportions, including the inspector column, preserving
navigation semantics, the eight shortcuts, focus behaviour, scroll containment and every Task 50
overflow protection. Rebuild Today as the reference implementation of the language, keeping hooks,
queries and business behaviour and rewriting only presentation composition. Old wrappers that create
nested boxes are removed rather than restyled.

## Stage K — Context inspector

Build the inspector against the facets a Lifeweave Task actually has. Extract a reusable
architecture only after a second surface proves the shared pattern; not before.

## Stage L — Secondary surfaces

Calendar, Analytics, Focus Plans, then Life Browse/Edit/Pinned/Graph, then Reader, Basic Editor and
Narrative, then Search, Settings, Backup, dialogs, popovers and menus. Each applies the same grammar
at its own intensity without being forced into Today's composition. Run the gate sequence after each
slice rather than discovering at the end that one foundation change broke twenty screens.

## Stage M — Regression, performance and accessibility

Integrate WebdriverIO visual regression with recorded baseline metadata and approved goldens for
every matrix state. Re-run the Task 50 geometry audit and the semantic-collision detector and keep
them at zero. Measure interaction timings, idle CPU and GPU, and bundle deltas against the recorded
baseline. Complete the accessibility gates including Narrator spot checks, forced colors, DPI and
Vietnamese, and record honestly anything not run.

## Stage N — Closure

Review the full diff against the activation SHA for accidental scope. Write the closure audit with
measured values and known tradeoffs. Update STATUS, ROADMAP, the decision registry and PROJECT_STATE
per repository governance. Report the local checkpoint. Do not push unless the Product Owner
explicitly requests it.
