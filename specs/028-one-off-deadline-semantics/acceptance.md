# Task 38 Acceptance

Task 38 closes when the five product-risk groups below have deterministic evidence. A specific test runner is not itself a product requirement.

## 1. Migration and schema safety

- a fresh database reaches schema 22 exactly once and re-running is idempotent;
- schema 21 upgrades to 22 without modifying migrations 1–21 and existing Task data is unchanged;
- existing Tasks receive a null deadline;
- `deadline_local_date` exists on `tasks` and on none of `task_series`, `task_occurrence_overrides`, `task_evaluations`, or `evaluation_operations`;
- the deadline index exists as designed and the bounded range query uses it;
- an invalid date cannot enter through any supported Rust mutation path;
- schema-too-new behaviour remains safe.

Persistence may be demonstrated by repository/database reopen tests, backup/restore round trips, or inspected database artifacts. A native UI restart smoke test is useful but is not an absolute closure gate when its harness is flaky or nondiagnostic.

## 2. One-off mutation and schedule independence

- create without a deadline, create with a deadline, update it, and clear it;
- an invalid deadline date is rejected and the save is transactional;
- rescheduling earlier or later preserves the exact deadline;
- changing the deadline does not change the schedule;
- scheduling after the deadline is accepted and flagged rather than repaired;
- a deadline never participates in overlap detection and never alters category, priority, tags, Life relation, or Focus Plan relation;
- an unrelated edit preserves an existing deadline;
- existing deletion semantics are unchanged.

## 3. Recurring exclusion

- recurring schema, create DTO, and update DTO carry no deadline;
- occurrences and overrides project no deadline;
- the shared editor cannot persist a one-off draft deadline into recurring creation;
- all three Task 37 recurrence edit scopes and Focus Plan recurrence behaviour remain intact.

## 4. Deadline state and queue

- against explicit observed local dates, a past deadline is overdue, an equal deadline is due today, and a future deadline is upcoming;
- a scheduled date after the deadline is flagged and a scheduled date equal to the deadline is not;
- leap-day and month/year boundaries are valid and malformed dates fail safely;
- a current evaluation excludes a Task from the active queue without erasing its deadline, and undo restores eligibility;
- the window is anchor -30 through anchor +14 inclusive at both edges;
- null deadlines, evaluated Tasks, recurring work, and out-of-window deadlines are excluded;
- the three groups are correct, overdue is oldest first, upcoming is nearest first, and tie-breakers are stable;
- the item cap returns a clear error rather than truncating;
- the queue projects category, priority, Life, Focus Plan, and tags without N+1 SQL or IPC;
- a row navigates to the Task's scheduled date and exact one-off identity.

## 5. Existing surfaces and user path

- Today, Upcoming, existing Overdue, the Calendar selected-day surface, and Search results carry truthful deadline context for one-off Tasks;
- recurring rows are unchanged;
- existing Overdue still means missed scheduled work and is not renamed;
- Calendar `has_missed`, scheduled minutes, load ratios, and category aggregation remain schedule and evaluation based;
- a Task may appear in both existing Overdue and Deadlines without identity or navigation error;
- Search navigation is unchanged and no deadline query syntax exists;
- Today remains startup and default, the Deadlines tab follows tablist semantics, and Task rows remain non-card;
- the editor deadline input is labelled and explained, and a rejected save retains all entered input including the deadline;
- close/reopen, full backup/restore, and Search rebuild preserve deadlines exactly.

## Final repository condition

- relevant Rust migration, domain, mutation, queue, Search, and backup tests pass;
- frontend typecheck, focused tests, and production build pass;
- generated bindings remain valid and were not hand-edited, and generated command permission files are tracked;
- repository governance and integrity checks pass;
- `.github/workflows/` and `.github/WORKFLOW_SEAL.sha256` are unchanged;
- no dependency, lockfile, capability-scope, patch script, temporary workflow, or placeholder drift remains;
- `main` and Project State are internally consistent, Task 37 remains closed, and Task 39 remains unstarted and unrecommended;
- no confirmed P0/P1 product, migration, persistence, privacy, or data-safety defect remains.

Do not repeat a failing environment command without new diagnostic evidence. After two nondiagnostic attempts, record it as optional tooling debt and close the task using the smallest deterministic evidence that covers the underlying risk.

Release packaging, broad performance simulation, repeated full suites, and duplicated multi-round review ceremonies are not Task 38 closure requirements unless a concrete product defect makes one necessary.
