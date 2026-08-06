# Lifeweave AI Project Handoff

## Authority

- repository: `kieran-lucas/lifeweave-desktop`
- branch: `main`
- latest closed task/slice: 38 / 028
- active task/slice: 39 / 029
- schema: 22
- active specification: `specs/029-task-saved-views`
- latest feature checkpoint: `cace17bd4225cb8e3d89795c0e833e68ed588ba2`
- next action: implement active specification
- Task 40: prohibited, unstarted, unallocated, and unrecommended

## Task 36 final state

The standalone Focus Plan core is complete across migration 20, Rust domain and IPC, tags, Search/FTS, backup/restore, generated TypeScript bindings, lazy Plans UI, recovery-draft loading, and native smoke scenarios.

Verified product evidence includes focused frontend typecheck/tests, Rust migration/core/backup/tag/Search tests, generated-binding stability, production frontend build, repository governance, and persisted SQLite artifacts showing committed Plan state across the tested operations.

The repeated Windows native harness failures were tooling/infrastructure failures and did not demonstrate data loss or another reproducible product defect. They are not a closure gate. Do not rerun or modify product code for this harness without new diagnostic evidence of an actual product invariant violation.

Repository cleanup is complete: only the sealed manual installer workflow remains; no Task 36 patch script, temporary workflow, compiler artifact, placeholder, or duplicate planning/test document remains.

## Task 37 activation

The Product Owner activated Task 37 / Slice 027 from baseline `82b055fe15d4997daf083bf777e9ef78c1f92bb6`. Scope is exactly two capabilities: optional zero-or-one Focus Plan association for one-off Tasks and recurring series, and create-and-read manual Focus Plan review history.

Task 36 remains hard-closed and is not reopened by this activation.

## Task 38 activation

The Product Owner activated Task 38 / Slice 028 from baseline `954b596677c34dd20ce3d0807d36b20676114f2b`, taking up the Deadline Semantics candidate that ADR 0028 scored highest and ADR 0029 deferred. Scope is the one-off-only first slice: an optional date-only deadline on one-off Tasks plus a bounded Deadlines queue. Recurring deadline policy stays open.

Task 37 remains closed and is not reopened by this activation.

## Task 39 activation

The Product Owner activated Task 39 / Slice 029 from baseline
`eed299d950bb43c54540a0466901f651aa60ce4a` after Task 38 and its Today cache remediation.
Scope is the bounded Task Saved View model in ADR 0033 and the Slice 029 package: four existing
sources, typed predicate v1, stable sort/group, local lifecycle/order, and a fifth internal Today
tab. Schema 23 is implemented from the schema 22 activation baseline. Task 40 remains prohibited
and unrecommended.

## Next action

Implement the active Slice 029 in dependency order, verify it deterministically, perform one
full baseline diff review, then close and synchronize authority. Do not allocate Task 40.
