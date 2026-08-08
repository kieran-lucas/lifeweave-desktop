# ADR 0043 — Focus Plan Activity Analytics

## Status

Accepted and activated for Task 49 / Slice 039 from explicit Product Owner activation baseline
`86261298ccd99204da503f508b4dfb9ac50cee04`.

## Context

ADR 0029 and ADR 0030 fixed the Focus Plan as a coordination workspace and kept Analytics a
separate destination. ADR 0031 added the Task/series → Plan relationship and manual reviews, but
deliberately prohibited Plan analytics: at that point no decision existed about what a Plan number
would mean, and the obvious naive reading — "percentage of the Plan done" — is exactly the
automatic progress the Focus Plan architecture rejects.

Three sources of factual Plan-linked evidence now exist and are individually decided:

```text
ADR 0031  current tasks.focus_plan_id / task_series.focus_plan_id
ADR 0031  manual reviews with a user-selected reviewed_local_date
ADR 0040  completed explicit one-off actual-time sessions
```

Objective Analytics (ADR 0012 lineage, extended by ADR 0040) already owns period bounds,
recurrence generation, move/cancellation semantics, evaluation snapshots, missed derivation, and
per-Task actual-time arithmetic. The remaining question was not *how* to compute Plan facts but
*whether reporting them is progress*. It is not, provided the projection reports only what already
happened and never scores it.

## Decision

> **Lifeweave v1 Analytics may report factual Focus Plan activity over the same week/month/year
> periods used by Objective Analytics. Reporting attributes one-off Tasks and recurring occurrences
> through their current authoritative Task/series → Focus Plan relationship, manual reviews through
> `reviewed_local_date`, and completed actual time only through linked one-off Tasks under Task 46
> semantics. This is retrospective evidence, not Plan progress, scoring, health, completion,
> lifecycle automation, or phase advancement.**

Focus Plan Analytics is a bounded, read-only projection of existing authority. It summarizes
current Plan-linked scheduled work, evaluation and missed facts, manual reviews, and completed
one-off actual-time sessions. It never writes Plan state, assigns work to phases, infers
completion, produces a percentage, score, or health signal, or rewrites historical rows to
manufacture attribution.

### Attribution

Attribution is *current*, never snapshotted:

```text
one-off Task     → tasks.focus_plan_id
recurring series → task_series.focus_plan_id
occurrence       → inherits its authoritative series relation
override         → owns no Plan relation
evaluation       → owns no Plan relation
```

A one-off Task contributes to Plan `P` exactly when `tasks.focus_plan_id = P` and the Task's
current `local_date` falls inside the requested period. Each generated non-cancelled occurrence
contributes through its series' current `focus_plan_id`. Relinking therefore changes what a past
period reports, because the relationship — not a historical copy of it — is the authority.
`OnlyThisOccurrence` still owns no relation, `ThisAndFuture` leaves each series with its own
relation authority, and `EntireSeries` applies the current series relation to the occurrences that
series generates. No Plan ID is ever materialized onto an occurrence, override, or evaluation row.

### Period, work, and evaluation

Period authority is exactly Objective Analytics: `week | month | year` anchored by
`anchor_local_date` and observed through `observed_local_date` / `observed_local_minute`, bounded
at 366 days. One work item is one scheduled one-off Task or one generated non-cancelled recurring
occurrence; a series is not one work item. Evaluated means an authoritative evaluation exists;
missed means no evaluation exists and the scheduled end is already past under the observed date and
minute; anything else is future. No completion percentage, success rate, overdue-Plan state, or
target-date lateness score is derived.

### Actual time

Only completed sessions on linked one-off Tasks contribute, under unchanged ADR 0040 arithmetic:
segment milliseconds sum per Task before a single floor to seconds, each tracked Task enters the
tracked-schedule denominator exactly once, running sessions contribute zero, and recurring work
contributes zero and never enters the denominator. The existing
`AnalyticsActualTimeSummaryView` is reused with `variance_seconds = actual_seconds -
tracked_scheduled_seconds`.

### Reviews

A review contributes when its `reviewed_local_date` falls inside the requested period; `created_at`
is not period authority. Two reviews sharing a date count independently. Only `review_count` and
`latest_reviewed_local_date` are reported — reflection and next-focus text never enter the
projection.

### Qualifying Plans and bounds

A Plan appears only when the period contains at least one attributed work item, manual review, or
completed attributed one-off actual-time session. Existing-but-inactive Plans are not listed.
Archived, completed, and paused Plans with period activity remain visible with their factual
current state. `MAX_FOCUS_PLAN_ANALYTICS_ROWS` is 500 and the projection rejects rather than
truncates. Ordering is `scheduled_minutes` descending, `work_item_count` descending,
case-insensitive title ascending, then `plan_id` ascending.

## Consequences

- Schema remains 27. There is no migration, no historical Plan-link snapshot, no occurrence-owned
  relation, no persistent Plan analytics aggregate, and no second source-revision system.
- Exactly one read-only command, `get_focus_plan_analytics_projection`, is added with a narrow
  generated permission and Rust-owned generated DTOs.
- Existing Objective Analytics output, aggregates, algorithm version, and source-revision
  semantics are unchanged.
- Analytics remains the only Analytics destination; the Plan activity section is lazy and reuses
  the existing `plans` destination and pending Focus Plan entry request to open a Plan.
- The projection is fed by `["analytics", "focus-plans", …]` so the established
  `invalidateQueries({queryKey:["analytics"]})` contract already covers it.
- Automatic Plan progress, phase-to-Task relationships, scoring, health, prediction, automatic
  lifecycle, target-date lateness analytics, review content analytics, and review
  edit/delete/archive/scheduling/search remain DEFERRED.
- No dependency, capability broadening, route, destination, chart library, or workflow/seal change
  is required.

## Alternatives rejected

- Snapshot the Plan link on occurrence, evaluation, or session rows so a past period keeps its
  historical attribution. This requires schema 28 and builds the history model ADR 0031 rejected;
  the user's current organisation of their own work is the honest reporting authority.
- Give occurrences their own Plan relation so an occurrence can be re-pointed independently. This
  reverses the ADR 0031 cardinality decision and would need its own Product Owner decision.
- Derive a completion percentage, Plan health, or on-track signal from evaluated versus scheduled
  counts. This is precisely the automatic progress the Focus Plan architecture prohibits, and a
  count of evaluated work is not a measure of strategy.
- Compare Plan actual time against recurring scheduled duration. Recurring work has no actual time
  at all under ADR 0037, so the comparison would be arithmetic against a denominator with no
  possible numerator.
- Add a persistent Plan analytics aggregate table mirroring `analytics_period_aggregates`. The
  bounded raw read is fast enough, and a second derived cache would need a second freshness
  authority for no user-visible gain.
- Add a second Analytics destination or dashboard. Analytics is a separate destination exactly
  once; a Plan-shaped copy of it would fragment the read model.

## Reversal conditions

Reopen only for a reproducible attribution, recurrence-parity, arithmetic, or bounds defect;
evidence that the bounded read cannot meet the existing performance contract; or an explicit
Product Owner decision about Plan progress, phase relationships, scoring, or another Plan analytics
extension. Such a decision does not retroactively broaden Task 49.
