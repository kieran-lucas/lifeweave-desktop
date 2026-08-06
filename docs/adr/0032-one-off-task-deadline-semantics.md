# ADR 0032 — One-Off Task Deadline Semantics

## Status

Accepted and implemented through Task 38 / Slice 028. Feature checkpoint:
`cace17bd4225cb8e3d89795c0e833e68ed588ba2`.

## Context

ADR 0028 scored Deadline Semantics as the strongest product candidate and already framed the
shape of a first slice: *"schedule and deadline remain separate; first deadline slice was
proposed as one-off Tasks only; recurring deadline policy remains open."* ADR 0029 deferred it
so Focus Plans could take Tasks 35–37. Those are closed and nothing supersedes the deferred
candidate.

Before this decision the product modelled only when work was *scheduled*. A Task pushed across
days silently lost the constraint that actually mattered, and the existing Overdue view could
only ever answer "what did I miss doing", never "what is actually due".

## Decision

Add an optional date-only deadline owned solely by the one-off Task.

```text
schedule = when the user plans to perform the work   (tasks.local_date + start/end)
deadline = the latest local date the work should be completed by
           (tasks.deadline_local_date)

one-off Task → deadline: zero or one
recurring series / occurrence / override / evaluation / Focus Plan / Life node
    → no deadline authority
```

Schedule and deadline are independent in both directions. `scheduled_date <= deadline_date` is
deliberately **not** an invariant: a user may knowingly or accidentally schedule work after its
own deadline, so both values are preserved and the condition is surfaced as
`scheduled_after_deadline` rather than repaired, swapped, or moved.

State is computed against an explicitly supplied observed local date rather than a clock read
inside projection logic:

```text
deadline < observed → overdue
deadline = observed → due_today
deadline > observed → upcoming
```

`list_today_items` and `list_tasks_for_date` therefore gained an `observed_local_date`
parameter. They previously carried only the *viewed* day, which would have mislabelled a Task
inspected on a future date as overdue.

A Task with a current evaluation leaves the active queue but keeps its stored deadline. Task 38
draws no completed-on-time or completed-late conclusion and creates no deadline history.

## Queue

A fourth manually activated tab joins the Today workspace, covering `anchor - 30` through
`anchor + 14` local days **inclusive of the anchor**, grouped as overdue / due today / upcoming.
It reuses the existing planning horizons and item cap, and returns a deterministic error rather
than truncating.

The queue is a **separate projection with its own DTOs**, not another `TaskPlanningMode` branch.
Planning rows group by scheduled day and carry `local_date` and `scheduled_minutes` with
schedule meaning; a deadline queue groups by state and must report both dates independently, so
reusing those types would have made their field names lie. `TaskPlanningPanel`'s mode type now
excludes `deadlines`, making that collapse a compile error.

## Existing surfaces

Today, Upcoming, existing Overdue, and Search carry deadline context as supplementary metadata
only. Existing Overdue keeps its schedule-based meaning and is not renamed; a Task may
legitimately appear in both Overdue and Deadlines because the two views answer different
questions.

Search composes deadline context at **query time** from `observed_local_date` via a bounded
`LEFT JOIN tasks`, so state can never be frozen stale into the index. The alternative — storing
the deadline in `search_documents` — was rejected: it needs a second table in the migration, an
`algorithm_version` bump, a forced rebuild, and it pushes deadline text into `normalized_context`,
closer to making deadline a hidden FTS authority than intended.

Calendar required no change. Its month grid delegates day activation to the Today list, so the
selected-day surface inherits deadline context automatically while `has_missed`, scheduled
minutes, load ratios, and category aggregation stay schedule and evaluation based.

## Consequences

- migration 22 adds `tasks.deadline_local_date` with a date-shape constraint and a partial index;
- no deadline column exists on `task_series`, `task_occurrence_overrides`, or evaluation tables,
  and no future-ready recurring column was added while the schema was open;
- a deadline reserves no time and never participates in overlap detection;
- no reminders, notifications, scheduling, automatic rescheduling, analytics, scoring, or
  prediction are introduced;
- Today remains startup/default and Task rows remain non-card;
- full-database backup remains the portability authority; Portable Package v1 is unchanged;
- no dependency or OS capability expansion was required.

## Migration and rollback

Migration 22 is append-only and applied in one transaction after schema 21. Code rollback is
safe before the migration reaches user data. After schema 22 has been applied, roll forward:
dropping the column would destroy user-authored deadlines, so it is not a safe user-data
rollback.

## Open

Recurring deadline policy is deliberately unresolved. Occurrence-level deadlines, deadline
time-of-day, reminders, and deadline analytics all remain out of scope pending a separate
Product Owner decision.

## Reversal conditions

Reopen only if deadlines must become recurring or occurrence-owned, if schedule and deadline
must become coupled, if a reproducible P0/P1 safety or data-loss defect appears, or if the
Product Owner explicitly reverses the decision.

## Next action

No active spec. Tasks 39–60 remain available for later Product Owner allocation.
