# Project Status

## Task 37/60 — Focus Plan ↔ Task Integration + Manual Review History (active)

- Activation baseline: `82b055fe15d4997daf083bf777e9ef78c1f92bb6`.
- Active spec: `specs/027-focus-plan-task-review`.
- Scope: optional zero-or-one Focus Plan on one-off Tasks and recurring series, plus create-and-read manual Plan review history.
- Schema moves from 20 to 21 through an append-only migration; migrations 1–20 remain unchanged.
- Relationship authority stays on `tasks` and `task_series`; occurrences, overrides, and evaluations inherit and own nothing.
- Today remains startup/default, Task rows remain non-card, and Life semantics remain unchanged.
- Task 38 is prohibited: no analytics expansion, deadline semantics, automatic progress, review scheduling, or new destination.
- Closure requires deterministic migration, recurrence-authority, projection, review, and backup evidence, a full diff audit, and an independent review with no confirmed P0/P1 defect.

## Task 36/60 — Focus Plans Core + Draft/Active Lifecycle (complete)

- Closed slice: `026-focus-plans-core`.
- Feature checkpoint: `57bd42d8eed5643d2fee3b04f74bd3c44e738da2`.
- Canonical model: standalone Focus Plan entity.
- Schema 20 is active through an append-only migration; migrations 1–19 remain unchanged.
- Backend core, IPC, tags, Search, backup/restore, generated bindings, Plans UI, recovery-draft loading, and native smoke scenarios are implemented.
- Focused frontend typecheck/tests, Rust migration/core/backup/tag/Search tests, generated-binding stability, diff checks, production frontend build, and repository governance passed during Task 36 stabilization.
- Persisted SQLite artifacts confirmed committed Plan state, lifecycle, outcome, phase ordering, and revision updates.
- Native Windows restart automation is non-blocking tooling coverage. Its harness failures did not demonstrate a reproducible product defect and do not keep Task 36 open.
- Runtime patch scripts and all temporary Task 36 workflows were removed.
- GitHub Actions on `main` contains only the sealed manual, read-only Windows installer build.
- Today remains startup/default; Life semantics remain unchanged.
- No Task 37 relation, review workflow, or automatic progress behavior entered schema 20.

Task 36 is hard-closed. Reopen only for a reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision.

## Task 38/60

Not started. Requires a separate Product Owner activation.

## Historical status

Task 1–33 history remains preserved at [`docs/status-history/STATUS-through-task33.md`](status-history/STATUS-through-task33.md). Task 34–35 evidence remains in accepted ADR and audit records.
