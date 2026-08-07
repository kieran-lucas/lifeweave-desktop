# Task 46 Specification — Planned versus Actual Analytics Core

Status: ACTIVE from baseline `b5002c3b05232aa0b8ae74b924764f927cc00f1d`.

This file records the Product Owner's activated Task 46 contract. Everything not required here is
out of scope. Canonical decision: `docs/adr/0040-planned-vs-actual-analytics.md`.

## 1. Core invariant

Actual time is a derived, read-only projection of completed Task 43 session segments. A segment
contributes only through its owning existing one-off Task; reporting uses that Task's current
scheduled date and current category, never wall-clock date splitting or a running timer, and never
changes schedule, evaluation, goals, streaks, scoring, recurrence, or immutable session rows.

## 2. Contribution and attribution

A session contributes iff `ended_at_ms IS NOT NULL`, the owning `tasks` row exists, and the Task's
current `local_date` is inside the requested period. Recurring occurrences cannot own session rows
and never contribute. Active and discarded-active sessions contribute nothing.

Date authority is current `tasks.local_date`; category authority is current `tasks.category_id`.
Cross-midnight sessions are not split. UTC timestamps and current timezone do not determine period
membership. Rescheduling or recategorizing a Task moves attribution without rewriting session rows.
Task deletion removes contribution through the existing cascade and creates no historical snapshot.

## 3. Read model

Rust owns and generates this DTO:

```rust
AnalyticsActualTimeSummaryView {
    actual_seconds: i64,
    tracked_scheduled_seconds: i64,
    tracked_task_count: i64,
    completed_session_count: i64,
    variance_seconds: i64,
}
```

`variance_seconds = actual_seconds - tracked_scheduled_seconds`. `AnalyticsProjection` and every
`AnalyticsCategoryView` carry a non-null `actual_time`; an untracked category carries all zeroes.

A tracked Task is an existing one-off Task whose current scheduled date is inside the period and
which owns at least one completed session. A zero-duration completed segment counts as one completed
segment and makes its Task tracked.

Tracked scheduled seconds sum `(end_minute - start_minute) * 60` once per tracked Task, never once
per session. Untracked Tasks still contribute to established period scheduled minutes and counts but
not to this denominator.

For each Task, sum all completed segment milliseconds with checked arithmetic and floor that Task
total once by dividing by 1000. Overall and categories sum the resulting per-Task seconds. Overall
actual seconds must equal the category actual-second sum. Invalid or overflowing data returns a
sanitized error; nothing is clamped, skipped, or fabricated.

## 4. Backend and revision contract

Schema stays 26. Migrations 1–26 are untouched. Add no session snapshots, persistent actual-time
aggregate table, migration, or index. Read actual time once per Analytics request:

```text
bounded Tasks in requested period
JOIN completed task_actual_time_sessions
GROUP BY Task
-> Rust fold into overall and category summaries
```

There is no query per Task, category, day, or session. The path must be proven index-backed with
meaningful `EXPLAIN QUERY PLAN` assertions using `tasks_by_date` and
`task_actual_time_by_task` without pinning SQLite's full plan text.

Reuse `get_analytics_projection`; add no IPC or capability. Advance
`analytics::ALGORITHM_VERSION` from 1 to 2 so stale v1 scheduled aggregates rebuild. Task 12
scheduled tables remain derived scheduled-time caches; actual time folds from raw schema-26
authority at projection time.

The first successful Stop must update `ended_at_ms` and call the existing Analytics source-revision
authority in the same transaction. Exact changes are Start +0, Discard +0, first Stop +1, replayed
Stop +0, backwards-clock failure +0. Existing Task date/category mutations retain their revision
behavior.

## 5. Existing Analytics semantics

Actual time does not alter total scheduled minutes, Task count, evaluated or missed counts,
completion distribution, weekly minimum/target attainment, or objective streaks. No score,
productivity grade, efficiency percentage, prediction, or recommendation is introduced.

## 6. Frontend contract

Preserve period navigation, Scheduled overview, category scheduled goals, streaks, and completion
distribution. Add one semantic **Recorded actual time** section exposing:

- Recorded time;
- Tracked plan;
- Variance;
- Tracked Tasks;
- Completed segments.

Variance must read `Over tracked plan by …`, `Under tracked plan by …`, or `Matched tracked plan`.
With zero tracked Tasks, show: `No completed actual-time sessions for one-off Tasks scheduled in
this period.`

Transparency copy states that only completed sessions count, reporting follows the Task's current
scheduled date and category, and running timers are excluded until stopped. A tracked category gets
one compact line with recorded duration, tracked scheduled duration, and textual variance; an
untracked category gets no actual-time line. Existing scheduled goal and streak wording remains
scheduled.

Use one deterministic formatter. Non-zero sub-minute durations stay visible as seconds. The first
successful timer Stop invalidates `['analytics']`; invalidating after all timer mutations is allowed
only if it is the smallest existing-path change.

Use semantic heading/fact structure, textual meaning rather than color alone, no autofocus/focus
trap, no live 1 Hz announcement, and zero applicable axe violations. Add no card, chart library,
motion, route, or destination.

## 7. Performance and evidence

Record the activation-state bundle inventory before product edits. Preserve the locked `index.js <=
535000` ceiling, every other existing locked ceiling, the 10 KiB unknown-chunk threshold,
hash-independent identities, and historical Task 16/40/41/42/43/44/45 evidence. Task 45 used Task
44's budget unchanged.

If a new Task 46 budget is required, derive maxima exactly from final measurements:

```text
total_raw_max  = final + max(8192, ceil(final * 0.0075))
total_gzip_max = final + max(4096, ceil(final * 0.0100))
chunk_max      = final + max(1024, ceil(final * 0.0200))
```

Update the checker default only after final budget evidence exists. Do not widen a locked ceiling.

## 8. Native Phase 17

Add exactly `e2e-tests/specs/phase17-planned-vs-actual-analytics.e2e.ts`, register it in the Windows
runner, and use accessible UI only. Create two current-date one-off 60-minute Tasks, track only the
first until the UI shows non-zero elapsed time, Stop, then verify Analytics shows one tracked Task,
one segment, a 60-minute tracked plan, non-zero recorded time, and the existing scheduled overview
still includes both Tasks. Assert no application error. There is no restart companion.

Before closure, deliberately break the central actual-time Analytics projection, prove Phase 17
fails at a meaningful Analytics assertion, restore it, rerun focused proof and Phase 17, and leave no
residue.

## 9. Hard exclusions

No recurring actual time or occurrence identity; no manual time entry; no independent completed
segment editing/deletion; no automatic switching, Pomodoro, idle/activity/process/window/input
monitoring, screenshots, billing, timesheets, or actual-time export; no actual time in Search,
Calendar, Saved Views, Plans, or Life; no deadline or Plan analytics; no score, prediction, or grade;
no new route, destination, chart library, dependency, capability, IPC, schema 27, workflow/seal
change, generic reporting framework, deep visual polish, or Task 47 work.
