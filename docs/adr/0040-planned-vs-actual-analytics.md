# ADR 0040 — Planned versus Actual Analytics

## Status

Accepted and activated for Task 46 / Slice 036 from explicit Product Owner activation baseline
`b5002c3b05232aa0b8ae74b924764f927cc00f1d`.

## Context

Task 12 established objective Analytics over scheduled time and completion evaluation. Task 43 later
added trustworthy explicit actual-time sessions for one-off Tasks, but deliberately left Analytics
unchanged because reporting attribution, cross-midnight behavior, running-session treatment, and the
comparison denominator were still OPEN.

The immutable source requires Analytics to distinguish scheduled time from genuinely measured time.
It also makes raw Tasks and evaluations the rebuild authority for derived Analytics. Task 43 now
provides the missing measured source, and this ADR is the Product Owner decision that resolves only
its planned-versus-actual Analytics projection.

## Decision

> **Lifeweave v1 Analytics compares scheduled time with completed explicit actual-time sessions for
> existing one-off Tasks, using each Task's current scheduled local date and current category as
> reporting attribution.**

Actual time is a derived, read-only projection of completed Task 43 session segments. A segment
contributes only when `ended_at_ms IS NOT NULL`, its owning `tasks` row still exists, and that Task's
current `local_date` is inside the requested Analytics period. A running session contributes zero;
discarding one therefore changes no Analytics value. Recurring occurrences cannot contribute.

Reporting never splits a segment by wall-clock date. Cross-midnight sessions remain wholly
attributed to the owning Task's current scheduled local date and current category. Rescheduling or
recategorizing a Task moves reporting attribution without rewriting immutable session rows. Deleting
the Task removes its history through the existing `ON DELETE CASCADE`; no snapshot preserves it.

The planned-versus-actual denominator includes each tracked Task's scheduled duration exactly once.
A tracked Task is an existing one-off Task in the period with at least one completed session,
including a zero-duration completed session. Untracked scheduled Tasks remain in the established
scheduled totals but are excluded from the tracked-plan denominator.

Whole-second arithmetic sums segment milliseconds per Task before flooring to seconds, then folds
the Task totals into the overall and category summaries. Variance is actual seconds minus tracked
scheduled seconds. Checked arithmetic rejects invalid or overflowing data rather than clamping,
skipping, or fabricating zero.

The first successful Stop closes the active segment and increments the existing Analytics source
revision exactly once in the same transaction. Start, Discard, replayed Stop, and a failed backwards
clock Stop do not increment it. Task date and category edits continue to use the existing revision
authority.

Task 12 scheduled aggregate tables remain rebuildable scheduled-time caches. Task 46 folds actual
time from schema-26 raw authority into the existing `get_analytics_projection` response through one
bounded grouped read, and advances the Analytics algorithm version from 1 to 2 so stale v1 derived
state rebuilds naturally.

## Consequences

- Schema remains 26; there is no migration, snapshot, persistent actual-time aggregate, or new
  index.
- `AnalyticsProjection` and `AnalyticsCategoryView` gain a non-null generated actual-time summary.
- Existing scheduled totals, Task/evaluated/missed counts, completion distribution, weekly goal
  attainment, and streaks retain their Task 12 semantics.
- Analytics gains one semantic Recorded actual time section and compact actual-time lines only for
  categories with tracked work. Text carries variance meaning; running timers are explicitly
  excluded until stopped.
- The existing Analytics IPC and capability are reused. No dependency, route, destination, or
  capability is added.
- Recurring actual time, manual time entry, editing or deleting completed segments independently,
  and every other actual-time extension remain OPEN and unallocated.
- Task 47 is prohibited, unstarted, unallocated, and unrecommended.

## Alternatives rejected

- Attribute by session wall-clock date or split at midnight. This makes UTC/local-time policy the
  reporting authority and contradicts the Product Owner's Task-owned attribution decision.
- Snapshot date or category on session rows. This requires schema 27 and preserves a history model
  the decision explicitly rejects.
- Compare actual time with every scheduled Task in the period. This dilutes the comparison with
  work that was never tracked; the locked denominator is scheduled time once per tracked Task.
- Floor each segment separately. This loses legitimate sub-second accumulation and violates Task
  43's user-visible duration authority.
- Count the active elapsed timer. The source is not complete until Stop succeeds and would make a
  read-only projection change at 1 Hz without a committed source mutation.
- Add a second Analytics IPC or persistent actual aggregate. The existing projection and raw schema
  provide the bounded path without either expansion.

## Reversal conditions

Reopen only for a reproducible attribution, arithmetic, source-revision, or data-integrity defect;
evidence that the bounded indexed read cannot meet the existing performance contract; or an explicit
Product Owner decision about another actual-time extension. Such a decision does not retroactively
broaden Task 46.
