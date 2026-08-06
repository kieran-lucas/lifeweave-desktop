# Project Status

## Task 38/60 — One-Off Task Deadline Semantics + Deadline Queue (complete)

- Closed slice: `028-one-off-deadline-semantics`.
- Feature checkpoint: `cace17bd4225cb8e3d89795c0e833e68ed588ba2`.
- Canonical decision: ADR 0032, taking up the candidate ADR 0028 scored highest and ADR 0029 deferred.
- Schema 22 is active through an append-only migration; migrations 1–21 remain unchanged.
- Deadline authority is `tasks.deadline_local_date` only. Recurring series, occurrences, overrides, and evaluations own no deadline, and no future-ready recurring column was added.
- Schedule and deadline are independent in both directions; `scheduled_date <= deadline_date` is not an invariant and scheduling after a deadline is surfaced as `scheduled_after_deadline`, never repaired.
- Deadline state is computed from an explicitly supplied observed local date, so `list_today_items` and `list_tasks_for_date` gained that parameter rather than mislabelling a Task inspected on a future day.
- The Deadlines tab covers anchor -30 through anchor +14 inclusive, excludes null deadlines, evaluated Tasks, and recurring work, and returns a deterministic error instead of truncating at the 5,000 item cap.
- Existing Overdue keeps its schedule-based meaning and is not renamed; a Task may legitimately appear in both views.
- Search composes deadline context at query time from the observed date, so state can never go stale; no index, `algorithm_version`, or rebuild change was needed.
- Calendar required no change: its month grid delegates day activation to the Today list, and `has_missed`, scheduled minutes, and load ratios remain schedule and evaluation based.
- Rust format/clippy/tests (572 serial), frontend typecheck/tests (585), production frontend build, generated-binding stability, and repository governance passed.
- Migration, close/reopen, and full backup/restore evidence covers deadlines.
- No workflow, seal, dependency, lockfile, or capability-scope drift entered the change.

Task 38 is closed. Reopen only for a reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision.

## Task 37/60 — Focus Plan ↔ Task Integration + Manual Review History (complete)

- Closed slice: `027-focus-plan-task-review`.
- Feature checkpoint: `09c393737fd6f096780408a803aea9b6e1355bb8`.
- Canonical decision: ADR 0031.
- Schema 21 is active through an append-only migration; migrations 1–20 remain unchanged.
- Relationship authority is stored on `tasks` and `task_series`; occurrences, overrides, and evaluations inherit and own nothing.
- All three recurring edit scopes hold: occurrence scope cannot change the relation, entire-series owns it absolutely, and a this-and-future split keeps the old series relation while the new series inherits or takes an explicit forward choice.
- An existing link survives Plan archive and unrelated edits, projects explicitly as archived, and returns to ordinary projection on restore.
- Manual reviews are create-and-read only, idempotent by `operation_id`, bounded newest-first, and change no Plan state.
- Rust format/clippy/tests (546 serial), frontend typecheck/tests (573), production frontend build, generated-binding stability, and repository governance passed.
- Migration, close/reopen, and full backup/restore round-trip evidence covers relations and reviews.
- Today remains startup/default, Task rows remain non-card, and Life semantics remain unchanged.
- The separate independent-review agent could not run: its environment hit a session quota. An equivalent structured review was performed directly and is recorded as disclosed verification debt.
- No workflow, seal, dependency, lockfile, or capability-scope drift entered the change.

Task 37 is closed. Reopen only for a reproducible product defect, migration/data-loss risk, violated invariant, or explicit Product Owner decision.

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

## Task 39/60

Not started. Requires a separate Product Owner activation.

## Historical status

Task 1–33 history remains preserved at [`docs/status-history/STATUS-through-task33.md`](status-history/STATUS-through-task33.md). Task 34–35 evidence remains in accepted ADR and audit records.
