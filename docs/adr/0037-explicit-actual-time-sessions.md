# ADR 0037 — Explicit Actual Time Sessions

## Status

Accepted and activated for Task 43 / Slice 033 from explicit Product Owner activation baseline
`ec2ae86417d7e65315582c808250b33009ebf1c3`.

## Context

Lifeweave records what the user **planned** — a local date and a start/end minute range — and,
retrospectively, **how it went** through completion evaluation. It has never recorded how long the
work actually took.

`docs/DECISION_REGISTRY.md` has listed **"actual-time semantics"** under `OPEN — Product/UX` since
the registry was created. ADR 0028 scored eleven candidates and placed Actual Time in the PASS
portfolio at 7.405. Every other PASS candidate has now shipped: Deadline as Task 38, Saved Views as
Task 39, Hardening as Task 40, Explicit Links as Task 41, and Bounded Branch Interchange as Task 42.
Generic Outline remains CONDITIONAL; Noteboard, Graph, Score, and Prediction remain FAIL.

Actual Time is therefore the last unshipped PASS candidate, and this ADR is the Product Owner
decision that resolves the OPEN registry entry.

The historical framing is preserved as the v1 boundary:

> explicit user-started sessions, one active timer, persisted segments, no surveillance.

## Decision

Lifeweave v1 records **manual, stopwatch-style actual time for one-off Tasks only**.

A user explicitly starts work on a one-off Task, may stop and later start again, and each completed
interval is persisted as an immutable session segment. There is **one active session globally**.

Actual time is independent of the planned schedule:

- editing a schedule never rewrites recorded time;
- actual time may be shorter or longer than planned;
- it never changes overlap or conflict rules;
- it never completes, evaluates, or scores a Task.

Rust owns the persisted Start and Stop timestamps as UTC epoch milliseconds read from `SystemTime`.
`Instant` is never persisted or serialized. An active session measures **wall-clock** elapsed time
from explicit Start to explicit Stop, including app close and reopen, backgrounding, and machine
sleep. There is no idle subtraction and no correction heuristic. If the authoritative Stop time is
earlier than the recorded start — a backwards clock change — Stop is rejected with a clear error,
the session stays active and unmodified, and the user may discard it.

Schema 26 adds one table, `task_actual_time_sessions`, whose partial unique index on the active
predicate is the authoritative concurrency defense for the single-active invariant.

Creating a full database backup is **blocked while any session is active**. Otherwise restoring a
historical snapshot could silently reinterpret backup and restore downtime as worked time.

### Why recurring Tasks are excluded

Recurring occurrence identity is `series_id + original_local_date`, and a `ThisAndFuture` edit mints
a **new series identity** while transferring future structure. Attaching durable time segments to
that identity would require inventing a recurrence-history identity model — deciding what happens to
recorded time when a series splits, an occurrence is cancelled, or an override is created.

Task 43 refuses to invent that model merely to make timers universal. No recurring session row or
control exists, and no recurrence semantics change. This is deliberate scope control, not a deferred
allocation: it creates no downstream task.

### Why Analytics is untouched

Current Analytics owns scheduled-minute and completion semantics. Aggregating actual time would
require separate policy for cross-midnight sessions, timezone changes, deleted history, category
snapshots, and how an in-flight session is counted. Task 43 captures trustworthy source data only
and does not silently redefine Analytics. Session writes deliberately do not bump the analytics
source revision.

## Consequences

- Schema advances 25 → 26 through one append-only migration adding exactly one table and two
  indexes; migrations 1–25 remain immutable.
- Four commands and one Rust module are added; `TodayItemView` gains one optional field, populated
  for one-off rows and `None` for recurring ones.
- A one-off Task with an active session cannot be evaluated or deleted; an evaluated Task cannot
  start a session until its evaluation is undone. These are enforced in Rust transactions.
- Full backup gains one precondition. Closed session history is ordinary SQLite data and round-trips
  exactly; a schema-25 backup restores and migrates to 26 with zero session rows.
- Today gains per-row controls and one compact active-session strip. No new route, sidebar
  destination, global-shell timer, dependency, or Tauri capability is introduced.
- No surveillance capability of any kind is created: no idle detection, no input, window, or process
  monitoring, no screenshots, and no automatic start, stop, or task switching.
- Recurring actual time, manual time entry, editing completed segments, Pomodoro, billing and
  timesheets, export, per-project reporting, and Analytics actual-time aggregation all remain
  **OPEN or excluded**, and none is allocated.
- Task 44 is neither allocated, started, nor recommended.

## Reversal conditions

Reopen only for a reproducible migration, data-loss, or single-active-invariant defect; for evidence
that persisted wall-clock semantics are wrong for users; for a Product Owner decision to extend
actual time to recurring occurrences or to Analytics; or for a defect in the backup precondition.
Such a decision does not retroactively broaden Task 43.
