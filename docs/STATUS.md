# Project Status

## Task 40/60 — Release-Candidate Hardening + Evidence Baseline v2 (complete)

- Closed slice: `030-release-candidate-hardening`.
- Execution baseline: `fb2a240920414c05e7fd4235357b952a15611e8f`.
- Full evidence: `docs/audits/task-40-release-candidate-hardening.md`.
- Budget v2 froze against a deterministic build: three production builds from the clean baseline
  produced byte-identical normalized inventories (16 chunks, 1,181,334 raw, 361,595 deterministic
  gzip). Maxima are derived by documented `ceil` formulas and clamped by the locked ceilings; the
  derived per-chunk limit is binding everywhere.
- No safe bundle reduction was admissible. Zero duplicated modules; the one eager-import candidate
  (`LifeEditWorkspace`, sole importer of `d3-hierarchy` and the sortable layer) removes 65,218 bytes
  from the startup chunk but raises total raw by 879 and gzip by 1,898, which the locked baseline
  rule forbids. It is recorded as a measured, rejected candidate and left as an explicit Product
  Owner trade-off.
- Both `clippy::type_complexity` findings were corrected with a named row alias and one shared
  reader. No suppression, no lint-level change, no test exclusion; backup coverage is equivalent.
- Four native phases now cover Task 38 deadlines and Task 39 Saved Views through accessible
  selectors only, including restart persistence and full backup/restore with a restart companion.
  Each was proven to fail on a deliberate break of its central behaviour, and every break was
  reverted.
- Two pre-existing native test-determinism defects were found by the mandated release run: a
  `normalize-space()` label selector in phase 8 restart that stops matching once a textarea holds
  persisted text (corrected), and a structural time-of-day dependency in phase 6 that cannot pass
  before 05:00 local because `validate_range` starts the day at 04:00 (left unchanged; no bounded
  fix exists).
- Accessibility: 604 frontend tests pass, including five new cross-cutting contracts covering modal
  keyboard containment, focused error announcement, Deadline queue naming and reachability with zero
  axe violations, colour-independent status, and roving tablist state. Native UIA inspection through
  the Windows SDK client API found zero unnamed focusable elements inside the app document subtree
  and no priority-1 findings.
- P2 manual physical Narrator/DPI execution remains external evidence debt. The protocol and
  machine-verifiable coverage are complete.
- One P2 product defect was recorded and deliberately not fixed: creating or restoring a Saved View
  drops the result selection, because the panel clears a selected id that is absent from the
  still-stale active list. It awaits a Product Owner decision.
- Task 40 is **not** a feature checkpoint. The latest feature task remains 39 at
  `374abcbae263be18fa785a56d656678f9bfd9c29`. Task 41 is neither allocated nor recommended.
- Canonical decision: ADR 0034, taking up the Hardening candidate ADR 0028 scored at 8.055.
- Schema stays 23; no migration was added and no released migration was touched.
- Four debts were reproduced from the clean baseline before any edit: the aggregate JavaScript
  budget failed at `total_js_bytes=1181334` against a `1150000` maximum while tracking four of
  sixteen chunks; the exact all-target/all-feature Clippy command failed on two `type_complexity`
  findings in backup test code; native Windows E2E ended at Focus Plans and covered neither Deadline
  nor Saved Views; and Task 30 physical Narrator/DPI evidence debt was still open.
- Budget v2 is a new versioned file. `docs/audits/task-16-performance-budgets.json` is preserved
  byte-identically as history rather than edited, and no longer feeds the gate.
- Gates: governance, source integrity, index, typecheck, 604 frontend tests, production build,
  performance v2, `cargo fmt`, exact all-target/all-feature clippy, 590 Rust tests serial (4
  ignored), production installer, 13 of 15 native phases, and RC dogfood all pass.
- Installer `Lifeweave_0.0.0_x64-setup.exe`, 5,087,854 bytes, sha256
  `fc7745d596c5684d6100f61d3b985ab67942ac52ac0a2de7d9c693a45f77193c`, release mode, schema 23, with
  the `e2e-test` capability confirmed absent from the release binary.
- Residual debt: physical Narrator/DPI execution; native phases 6 and 6-restart unrun in this
  session for the structural time-of-day reason above; reduced-motion and forced-colors contracts
  not machine-assertable in jsdom; and two recorded Product Owner decisions (the startup-size
  trade-off and the P2 Saved View selection defect).
- Out of scope and unchanged: product features, schema 24, recurring deadlines, actual time,
  backlinks, interchange, Graph, Noteboard, score, prediction, reminders, notifications, sync,
  sharing, telemetry, updater, signing, store distribution, dependencies, lockfile, workflows, and
  the workflow seal.

## Task 39/60 — Task Saved Views + Bounded Typed Filter Core (complete)

Closed through Slice `029-task-saved-views` from baseline
`eed299d950bb43c54540a0466901f651aa60ce4a` at product checkpoint
`374abcbae263be18fa785a56d656678f9bfd9c29`. The bounded Task-only model reuses four canonical
source scopes, applies a versioned Rust-owned typed AND predicate, stable sort/group modes,
local lifecycle and order, and adds a fifth Views tab inside Today. Schema 23 adds only the
standalone `task_saved_views` table and active-order index.

Lifecycle, AST bounds, unsupported persistence, archived/missing/merged references, source
preservation, exact recurring navigation, bulk loading, 5,000-item errors, generated bindings,
full backup/restore/reopen, keyboard behavior, and axe checks have deterministic coverage. The
full baseline diff review found one test-evidence gap in the backup equality tuple; it was fixed
before the checkpoint and the focused test passed. Canonical governance, typecheck, frontend
tests (596), production build, Rust fmt/clippy/tests (587 passed plus 4 designated ignored),
generated drift, and diff checks passed.

No query language, raw SQL/expression path, custom range, route/sidebar/default change, sharing,
Task card/dashboard, recurring deadline, analytics expansion, dependency, or workflow change is
authorised. Task 39 is closed; Task 40 is prohibited, unstarted, unallocated, and unrecommended.

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

Post-closure remediation: Task 38 widened the Today query key to `["today-items", localDate, observedLocalDate]` but left the evaluation and undo optimistic-cache paths on the old two-part key, so a successful evaluation could update a different cache entry than the one Today rendered. Repaired with a single canonical `todayItemsKey` helper used by the query, cancel, read, optimistic write, rollback, success, and undo paths, plus `deadline-queue` invalidation on evaluation and undo since a current evaluation controls active queue membership. Frontend-only; no schema, Rust, IPC signature, binding, dependency, or workflow change. Regression coverage proves the rendered row transitions and reverts, and three of the four new tests fail against the pre-fix implementation. Verified with focused Today tests, frontend typecheck, 589 frontend tests, and the production build.

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

## Historical status

Task 1–33 history remains preserved at [`docs/status-history/STATUS-through-task33.md`](status-history/STATUS-through-task33.md). Task 34–35 evidence remains in accepted ADR and audit records.
