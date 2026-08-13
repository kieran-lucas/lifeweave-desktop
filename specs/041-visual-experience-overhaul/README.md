# Slice 041 — Visual Experience Overhaul (Quiet Luminous Atlas)

## Status

```text
Task 51: ACTIVE
Slice 041: ACTIVE
activation baseline: 43d0d1e822336c97527f85e1ab154fc74a61f058
local branch: task-51-visual-experience (not pushed)
Task 49 feature checkpoint: 7622db3d8b2b42d69c8f497b6899c5be82e9f9a9 (unchanged)
starting schema: 27
target schema: 28 (Product Owner Focus Plan score amendment only)
VISUAL LOCK: not requested — reference image not yet supplied
MOTION LOCK: blocked on VISUAL LOCK
```

Task 51 is a presentation slice, not a feature slice. Under the Task 40 and Task 50 precedent it
does **not** advance `latest_feature_task`, which stays at 49.

## Shape

```text
one visual authority beside the geometry authority
+ finite radius / elevation / hairline / type / motion / colour vocabularies
+ an enclosure budget instead of nested rectangles
+ whole-screen lock before any production restyle
+ state committed before motion, never after it
+ restrained static art that retreats as density rises
+ reduced motion designed rather than zeroed
= one continuous calm surface that reaches the reference image
```

## Authority

The Product Owner's **Lifeweave Visual Baseline v1** image is the authority for appearance.
[ADR 0045](../../docs/adr/0045-visual-experience-overhaul.md) is the authority for how that
appearance is expressed. Where a personal-taste deviation from the image exists, it is reverted
toward the image; where a deviation is required by accessibility, real content fit, responsive
behaviour or measured performance, it is recorded with its evidence.

Task 50's geometry authority under `frontend/src/app/layout/` and ADR 0044's invariants remain
binding and are re-proven rather than re-argued.

## Not in this slice

Except for the bounded manual Focus Plan score amendment in spec §1.2 / ADR 0047, product semantics
of any kind. No schema beyond 28, second Plan IPC command, Tauri capability, network service,
backup-format change, or workflow/seal change. No framework, editor,
drag, query, graph or layout-engine replacement. No glass, Mica, Acrylic or transparent window. No
WebGL or animation-engine art. No new Task facet — in particular no subtasks and no task-to-task
links, which the reference inspector shows and Lifeweave does not have.

## Process gates

Two hard stops. Neither may be inferred, and production visual reconstruction may not begin before
the first is granted in words.

```text
VISUAL LOCK APPROVED    full-screen Today composition, all lock states, evidence presented
MOTION LOCK APPROVED    motion language on the locked composition, timings measured
```

## Canonical decision

[ADR 0045](../../docs/adr/0045-visual-experience-overhaul.md).

## Evidence

```text
docs/audits/task-51-visual-baseline.md            Phase 0 baseline: environment, gates, visual census
docs/audits/task-51-visual-state-matrix.md        the surface/state inventory the locks are proven over
docs/audits/task-51-visual-experience-overhaul.md closure evidence
docs/visual/task-51/                              Product Owner reference image
target/e2e-artifacts/task-51/                     captures and geometry (not committed)
```
