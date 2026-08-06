# Slice 028 — One-Off Task Deadline Semantics + Deadline Queue

## Status

```text
Task 38: COMPLETE
Slice 028: COMPLETE
activation baseline: 954b596677c34dd20ce3d0807d36b20676114f2b
feature checkpoint: cace17bd4225cb8e3d89795c0e833e68ed588ba2
schema: 22
active spec: none
Task 39: not started
```

## Outcome

A one-off Task can carry the date by which it should be finished, separate from the date it is
scheduled to be worked on.

```text
schedule = when the user plans to perform the work
deadline = the latest local calendar date by which the work should be completed
```

Rescheduling no longer silently discards the real constraint, and a bounded Deadlines queue
inside the Today workspace shows what is actually due.

## Decision basis

ADR 0028 recorded Deadline Semantics as the strongest product candidate and already framed this
slice: *"schedule and deadline remain separate; first deadline slice was proposed as one-off
Tasks only; recurring deadline policy remains open."* ADR 0029 deferred it behind Focus Plans.
Tasks 35–37 are closed and nothing supersedes the deferred candidate.

## Included

- migration 22 adding `tasks.deadline_local_date` with a partial index;
- optional date-only deadline on one-off Task create and edit;
- schedule and deadline held independent in both directions;
- deterministic deadline state against an explicitly supplied observed local date;
- `scheduled_after_deadline` surfaced rather than repaired;
- a bounded Deadlines tab in the Today workspace covering anchor -30 through anchor +14;
- deadline context on Today, Upcoming, existing Overdue, and Search results;
- navigation from a queue row to the Task at its scheduled date;
- evaluation removing a Task from the active queue while preserving its deadline, and undo
  restoring it.

## Excluded

Recurring series, occurrence, and override deadlines; time-of-day and timezone; reminders,
notifications, sound, snooze, and background scheduling; automatic deadline creation or
rescheduling; natural-language date parsing; Search deadline operators; deadline or lateness
analytics, scoring, and prediction; Focus Plan progress; Saved Views; new sidebar destinations;
Portable Package changes; and every Task 39 candidate.

## Closure basis

Task 38 closed with deterministic migration, one-off mutation, schedule/deadline independence,
deadline-state, queue window and ordering, recurring-exclusion, Search, close/reopen, and
backup/restore evidence; generated-binding stability; Rust format, clippy, and test success;
frontend typecheck, tests, and production build success; repository governance; and a full diff
audit against the activation baseline. A primary structured review was performed directly.

## Authority

- `spec.md` — normative product and domain contract;
- `plan.md` — phased execution order and gates;
- `tasks.md` — work breakdown and resumable ledger;
- `acceptance.md` — risk-based closure checks;
- ADR 0028 — expansion portfolio decision that scored and scoped Deadline;
- ADR 0032 — canonical one-off deadline decision.

Task 37 remains closed. Task 39 remains unstarted and unrecommended.
