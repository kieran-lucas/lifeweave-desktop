# Task 38 Specification — One-Off Task Deadline Semantics

## 1. Product contract

A one-off Task may carry an optional deadline: the latest local calendar date by which the work
should be completed. A deadline is a constraint the user records, never a constraint the product
infers, enforces, schedules, or reminds about.

## 2. Ownership and cardinality

```text
one-off Task → deadline: zero or one date-only value

recurring series     → no deadline authority
recurring occurrence → no deadline authority
occurrence override  → no deadline authority
evaluation           → no deadline authority
Focus Plan           → no Task deadline authority
Life node            → no Task deadline authority
```

The canonical persisted field is `tasks.deadline_local_date`. No other table receives a deadline
column and no generic temporal-constraint framework is introduced.

## 3. Schedule and deadline are independent

```text
scheduled local date + start/end = planned execution block
deadline local date             = latest date the work should be completed
```

Changing the schedule never changes the deadline. Changing or clearing the deadline never
changes the schedule. Moving a Task across days preserves its deadline. A deadline reserves no
time, participates in no overlap detection, and alters no priority, category, tag, Life
relation, Focus Plan relation, or recurrence. No deadline is inferred from schedule, priority,
Focus Plan target date, title, or description.

`scheduled_date <= deadline_date` is not an invariant. A user may schedule work after its
deadline. Both values are preserved and the condition is exposed:

```text
scheduled_after_deadline = scheduled_local_date > deadline_local_date
```

Neither date is silently repaired, swapped, or moved.

## 4. Date-only local semantics

A deadline is a valid Gregorian `YYYY-MM-DD` local calendar date. It has no time-of-day, no
timezone identifier, and is never converted to UTC. Deadline calculations use an observed local
date supplied explicitly through the existing trusted boundary rather than reading a system
clock inside projection logic. Task 38 claims no iCalendar conformance.

## 5. Deadline state

For a one-off Task with a deadline and no current evaluation:

```text
deadline < observed local date → overdue
deadline = observed local date → due_today
deadline > observed local date → upcoming
```

On the deadline date itself the state is `due_today`, never overdue.

A Task with a current evaluation is excluded from the active queue, keeps its stored deadline,
and receives no completed-on-time or completed-late inference. Undoing the evaluation restores
queue eligibility. Task 38 creates no deadline history, analytics, or second completion model.

## 6. Deletion and lifecycle

Existing one-off Task deletion semantics are unchanged and deleting a Task deletes its deadline
with the row. Task archive and restore are not introduced. No deadline operation changes Focus
Plan lifecycle or review history, and no evaluation clears a deadline.

## 7. Deadline queue

A fourth manually activated tab joins the existing Today workspace:

```text
Today | Upcoming | Overdue | Deadlines
```

Today remains startup and default. Deadlines is not a sidebar destination or global route and
follows the existing accessible tablist and roving-tabindex behaviour.

The queue uses an explicit local anchor and includes active one-off Tasks whose deadline falls
within `anchor - 30` through `anchor + 14` local days inclusive, producing three groups:

```text
Overdue deadlines | Due today | Upcoming deadlines
```

It excludes Tasks without a deadline, Tasks with a current evaluation, recurring work, and
deadlines outside the window. An explicit item cap matching current planning safety limits
returns a deterministic error rather than truncating silently. Older deadlines remain
discoverable through Calendar, Search, and Task editing; Task 38 creates no unbounded backlog.

Ordering is deterministic: deadline date, then `scheduled_after_deadline` before not, then
priority, then scheduled local date, then scheduled start minute, then a stable tie-breaker.

Each row exposes title, deadline date, deadline state, scheduled date and time, the
`scheduled_after_deadline` warning where applicable, category, priority, and existing Life,
Focus Plan, and tag context. Rows remain rows, not cards. Activating a row navigates to the
Task's scheduled local date and exact one-off identity through the existing pending-navigation
envelope. The queue never creates or edits deadlines inline.

## 8. Task editor

The existing Task editor gains one optional labelled `Deadline` date input with concise text
distinguishing schedule from deadline, explicit clearing, and validation announcement matching
current form behaviour. Creating without a deadline is unchanged. Editing preserves the current
deadline. A failed save preserves all entered data including the deadline. Rescheduling with an
unchanged deadline preserves the exact deadline. Scheduling after the deadline is accepted and
displayed as a warning.

## 9. Recurring boundary

Task 38 does not support recurring deadlines. Deadline authority is never sent to recurring
DTOs, no deadline column is added to `task_series` or overrides, and a one-off draft deadline is
never persisted to a series when the editor switches modes. Where the shared editor exposes the
field for recurring work it is inoperable with an accessible explanation. No
`OnlyThisOccurrence`, `ThisAndFuture`, or `EntireSeries` deadline semantics are invented.
Recurring deadline policy remains open.

## 10. Existing surfaces

Today, Upcoming, existing Overdue, the Calendar selected-day Task surface, and Search results
project deadline context for one-off Tasks as supplementary metadata. Recurring rows are
unchanged.

Existing view meanings are preserved exactly:

```text
Upcoming = scheduled work in +1 through +14 days
Overdue  = scheduled work in -30 through -1 days with no current evaluation
```

Existing Overdue is not renamed and continues to mean missed scheduled work, not missed
deadline. A Task may legitimately appear in both Overdue and Deadlines because the two views
answer different questions.

Calendar month aggregation, `has_missed`, scheduled minutes, load ratios, and category
aggregation remain schedule and evaluation based. Day cells do not become deadline dashboards
and no calendar destination is added.

Search keeps the existing Task entity kind and navigation, gains no deadline query syntax and no
natural-language date parsing, and reflects deadline changes without stale projection.

## 11. Persistence boundary

Migration 22 is forward-only and appends to the released set, adding
`tasks.deadline_local_date` and an index supporting bounded non-null range retrieval.
Migrations 1–21 are never edited. Existing Tasks upgrade with a null deadline. Database reopen,
full backup, restore, and Search rebuild preserve deadlines exactly. Portable Package v1 and
Focus Plan export are unchanged.

## 12. Accessibility

The Deadlines tab follows tablist semantics. Queue headings, lists, and rows use native
structure and dates use `<time>`. Deadline state and the scheduled-after-deadline warning are
available as text and never depend on colour alone. The editor input is labelled and explained,
validation or persistence failure retains input, and the keyboard can reach the queue, open an
item, and edit the Task.

## 13. Hard exclusions

Recurring, occurrence, and override deadlines; deadline time-of-day; timezone conversion or UTC
storage; reminders, notifications, sound, snooze, and background schedulers; automatic deadline
creation or rescheduling; automatic priority changes; natural-language date parsing; calendar
sync; dependency chains; duration estimation; actual-time tracking; deadline completion or
lateness analytics; score, streak changes, prediction, and risk probability; generated deadline
suggestions; Focus Plan progress; Task-to-phase relationships; Saved Views; new sidebar
destinations; Task cards; dashboard startup; query languages and Search deadline operators;
Portable Package changes; generic temporal frameworks; and Task 39 activation are prohibited.

No future-ready column or enum for recurring deadlines is added while the schema is open.
