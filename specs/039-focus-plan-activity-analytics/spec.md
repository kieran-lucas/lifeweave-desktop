# Task 49 Specification — Focus Plan Activity Analytics Core

Status: ACTIVE. Product Owner authority is ADR 0043 and the Task 49 builder specification.

## Core invariant

Focus Plan Analytics is a bounded, read-only projection of existing authority. It may summarize
current Plan-linked scheduled work, evaluation and missed facts, manual reviews, and completed
one-off actual-time sessions. It never writes Plan state, assigns work to phases, infers
completion, creates a percentage, score, or health signal, or rewrites historical rows to
manufacture attribution.

## Attribution

Existing relation authority is unchanged and no historical snapshot is added:

```text
one-off Task     → tasks.focus_plan_id
recurring series → task_series.focus_plan_id
occurrence       → inherits series relation
override         → owns no Plan relation
evaluation       → owns no Plan relation
```

A one-off Task contributes to Plan `P` when `tasks.focus_plan_id = P` and its current `local_date`
is inside the period. Each generated non-cancelled occurrence contributes through its series'
current `focus_plan_id`. Relinking reattributes historical-period reporting through the current
link. `OnlyThisOccurrence` changes no relation, `ThisAndFuture` leaves each series with its own
relation authority, and `EntireSeries` applies the current series relation to occurrences generated
from that series. No Plan ID is materialized onto an occurrence, override, or evaluation row.

## Period, work, and evaluation

Period authority is exactly Objective Analytics — `week | month | year` with `period_kind`,
`anchor_local_date`, `observed_local_date`, `observed_local_minute`, and a 366-day maximum span. A
work item is one scheduled one-off Task or one generated non-cancelled recurring occurrence; a
series is not one work item. Recurrence generation, moves, cancellations, effective date and time,
evaluation snapshots, and missed semantics reuse existing Objective Analytics authority through a
small `pub(crate)` fact seam, not a generic analytics framework.

```text
evaluated → authoritative evaluation exists
missed    → no evaluation and scheduled end is already past under observed date/minute
future    → neither
```

No completion percentage, success rate, overdue-Plan state, or target-date lateness score is
derived.

## Actual time and reviews

Only completed sessions on linked one-off Tasks contribute, under unchanged Task 46 arithmetic:
per Task, current `focus_plan_id` selects the Plan, current `local_date` selects the period,
segment milliseconds sum before one floor to seconds, and each tracked Task enters the tracked
schedule exactly once. Running sessions are zero; recurring work is zero and never enters the
denominator. `AnalyticsActualTimeSummaryView` is reused with
`variance_seconds = actual_seconds - tracked_scheduled_seconds`.

A review contributes when `reviewed_local_date` is inside the period; `created_at` is not period
authority. Same-date reviews count independently. Only `review_count` and
`latest_reviewed_local_date` are reported; reflection and next-focus content never enter the DTO.

## Projection contract

A Plan appears only with at least one attributed work item, manual review, or completed attributed
one-off actual-time session in the period. Archived, completed, and paused Plans with period
activity remain visible with factual current state. Required arithmetic:

```text
work_item_count = one_off_task_count + recurring_occurrence_count
overall fields  = exact sums of Plan rows
plan_count      = plans.len()
```

Ordering is `scheduled_minutes` DESC, `work_item_count` DESC, case-insensitive title ASC, then
`plan_id` ASC. `MAX_FOCUS_PLAN_ANALYTICS_ROWS` is 500 and the projection rejects rather than
truncates. No percentage, health, or score field exists.

## Backend, IPC, and freshness

Schema stays 27 with no migration, no persistent Plan aggregate, and no second source-revision
system. The bounded read shape is one Task-domain period work projection, one batched Plan metadata
read, one grouped review read, one grouped completed one-off actual-time read, and a bounded Rust
fold. A query per Plan, Task, occurrence, or review and any renderer aggregation are prohibited.
Existing Objective Analytics output is unchanged. Exactly one read-only command,
`get_focus_plan_analytics_projection`, is added with a narrow generated permission, Rust-owned DTOs,
and generated TypeScript. The query key is `["analytics", "focus-plans", …]` so the established
`invalidateQueries({queryKey:["analytics"]})` contract covers it; Focus Plan mutation and review
creation must invalidate `["analytics"]`.

## Frontend

Analytics remains the only Analytics destination. `FocusPlanAnalyticsSection.tsx` is lazy-loaded
from `AnalyticsScreen` under the heading `Focus Plan activity`, showing Plans with activity, linked
scheduled time, linked work items, evaluated, missed, reviews, and recorded actual time overall,
and per Plan its title, current lifecycle or Archived state, scheduled duration, work items,
evaluated, missed, recorded actual and tracked plan when applicable, reviews, and latest review
date when applicable. `Open Plan` reuses the existing `plans` destination and pending
`focus_plan` entry request. There is no progress bar, ratio, URL routing, or second navigation
authority. The empty state is `No Focus Plan-linked work or reviews in this period.` Transparency
copy must explain current-link attribution, review-date authority, one-off-only actual time, and
that these are retrospective facts rather than automatic progress.

## Hard boundaries

No automatic Plan progress or phase completion, Task→phase relation, automatic lifecycle, Plan
health/score/prediction/recommendation, success or completion percentage, target-date lateness
analytics, review sentiment or content analytics, review edit/delete/archive/search/scheduler,
generated content or reminders, many-to-many Task→Plan, historical Plan-link snapshots,
occurrence-owned Plan relation, persistent Plan analytics aggregate, schema 28 or migration, new
destination/dashboard/chart library/dependency, deep UI or design-system work, workflow or seal
edit, or Task 50 work.
