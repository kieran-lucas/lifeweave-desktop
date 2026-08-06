# Task 37 Acceptance

Task 37 closes when the five product-risk groups below have deterministic evidence. A specific test runner is not itself a product requirement.

## 1. Migration and data safety

- schema 20 upgrades to 21 without modifying migrations 1–20;
- reopening an upgraded database is idempotent and preserves relations and reviews;
- existing Tasks and series remain valid and default to unlinked;
- `focus_plan_id` exists on `tasks` and `task_series` and on no occurrence, override, or evaluation table;
- relationship and review indexes exist and foreign keys are enforced;
- full backup, integrity verification, restore, and reopen preserve relations and reviews exactly.

Persistence may be demonstrated by repository/database reopen tests, backup/restore round trips, or inspected database artifacts. A native UI restart smoke test is useful but is not an absolute closure gate when its harness is flaky or nondiagnostic.

## 2. One-off Task relationship

- create linked and unlinked Tasks; update, replace, and clear the link;
- a missing target is rejected and newly assigning an archived Plan is rejected;
- an existing link survives Plan archive and survives unrelated edits;
- restoring the Plan restores ordinary projection and navigation without relinking;
- Task-to-Life and Task-to-Plan remain independent;
- tags, category, priority, conflict, and evaluation behaviour are unchanged.

## 3. Recurring series relationship

- create linked and unlinked series and confirm occurrences inherit the series relation;
- `OnlyThisOccurrence` cannot create or change Plan authority and writes no override;
- moved, cancelled, and overridden occurrences gain no Plan authority;
- `EntireSeries` assigns, changes, and clears the series relation;
- `ThisAndFuture` leaves the old series relation intact, the new series inherits by default, and an explicit future choice applies only to the new series;
- recurrence expansion, override transfer, series tags, and Life links do not regress.

## 4. Projection, navigation, and reviews

- Focus Plan detail returns linked one-off Tasks and recurring series with deterministic order, bounded queries, factual counts, and truthful archived state;
- linked-work projection performs no SQL inside the per-series loop and no N+1 IPC;
- a Task row navigates to the exact Plan and a linked-work item navigates to the correct existing Task destination and date;
- Today, Upcoming, and Overdue continue to work for linked and unlinked work;
- a valid review is created; whitespace-only reflection and an invalid date are rejected; optional next focus works; same-date reviews are allowed;
- a repeated `operation_id` is idempotent and distinct operation IDs create distinct reviews;
- history is newest-first with a stable tie-breaker and bounded;
- creating a review leaves lifecycle, revision, variants, phases, tags, recovery draft, and Tasks unchanged.

## 5. User path

- focused frontend coverage verifies plan selection during create and edit, scope-correct behaviour for recurring items, and input retention after a rejected save;
- the review form retains draft fields after a failed mutation, blocks duplicate pending submission, and restores focus deterministically;
- linked-work and review regions expose accessible structure and complete keyboard operation;
- Today remains startup/default and Task rows remain non-card;
- every Task 37 hard exclusion remains absent.

## Final repository condition

- relevant Rust migration, domain, recurrence, projection, review, and backup tests pass;
- frontend typecheck, focused tests, and production build pass;
- generated bindings remain valid and were not hand-edited;
- repository governance and integrity checks pass;
- `.github/workflows/` and `.github/WORKFLOW_SEAL.sha256` are unchanged;
- no dependency, lockfile, capability, patch script, temporary workflow, or placeholder drift remains;
- `main` and Project State are internally consistent, Task 36 remains closed, and Task 38 remains unstarted;
- no confirmed P0/P1 product, migration, persistence, recurrence-authority, privacy, or data-safety defect remains.

Do not repeat a failing E2E command without new diagnostic evidence. After two nondiagnostic attempts, record it as optional tooling debt and close the task using the smallest deterministic evidence that covers the underlying risk.

Release packaging, NSIS hashing, broad performance simulation, repeated full suites, and duplicated multi-round test ceremonies are not Task 37 closure requirements unless a concrete product defect makes one necessary.
