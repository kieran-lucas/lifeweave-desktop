# Slice 033 — Explicit Actual Time Sessions Core

## Status

```text
Task 43: ACTIVE
Slice 033: ACTIVE
activation baseline: ec2ae86417d7e65315582c808250b33009ebf1c3
Task 42 feature checkpoint: 9c5d0cfb6c5e64ba7a5acfd23464e6a8474954b9
starting schema: 25
target schema: 26
active spec package: specs/033-explicit-actual-time-sessions
Task 44: prohibited, unstarted, unallocated, and unrecommended
```

Task 43 adds **manual, stopwatch-style actual time for one-off Tasks only**. A user explicitly
starts work, may stop and later start again, and each completed interval persists as an immutable
segment. There is one active session globally.

Actual time is independent of the planned schedule: schedule edits never rewrite recorded time, it
never changes conflict rules, and it never completes, evaluates, or scores a Task. An active session
measures wall-clock elapsed time, including app close and machine sleep, with no idle subtraction
and no correction heuristic.

There is **no surveillance**: no idle detection, no keyboard, mouse, window, or process monitoring,
no screenshots, and no automatic start, stop, or task switching. The user is the only thing that
starts a timer.

Recurring Tasks are deliberately excluded because occurrence identity is
`series_id + original_local_date` and a `ThisAndFuture` edit mints a new series identity; universal
timers would require inventing a recurrence-history identity model. That is scope control, and it
allocates no downstream task.

Analytics is untouched: this slice captures trustworthy source data and does not redefine
scheduled-minute or completion semantics.

- [Specification](spec.md)
- [Plan](plan.md)
- [Tasks](tasks.md)
- [Acceptance](acceptance.md)
- [ADR 0037](../../docs/adr/0037-explicit-actual-time-sessions.md)
