# Task 43 Specification — Explicit Actual Time Sessions Core

Status: CLOSED at product checkpoint `b4510ddbffbd0e8c4d5ae84213973b723df4cbad` from activation baseline
`ec2ae86417d7e65315582c808250b33009ebf1c3`.

This file records the Product Owner's activated Task 43 contract. Everything not required here is
out of scope. Canonical decision: `docs/adr/0037-explicit-actual-time-sessions.md`.

## 1. Canonical model

Actual time is **manual, stopwatch-style, and one-off only**. A user explicitly starts work, may
stop and later start again, and each completed interval persists as an immutable segment. There is
**one active session globally**.

Actual time is independent of the planned schedule. Schedule edits never rewrite recorded time;
actual time may be shorter or longer than planned; it never changes conflict rules; and it never
completes, evaluates, or scores a Task.

Recurring Tasks have no actual time at all. No recurring session row, control, or projection exists,
and recurrence semantics are unchanged.

## 2. Schema 26

One append-only migration adds exactly one table and two indexes. Migrations 1–25 are unchanged.

```sql
CREATE TABLE task_actual_time_sessions (
    id                 TEXT PRIMARY KEY NOT NULL,
    task_id            TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    start_operation_id TEXT NOT NULL UNIQUE,
    started_at_ms      INTEGER NOT NULL CHECK(started_at_ms >= 0),
    ended_at_ms        INTEGER CHECK(ended_at_ms IS NULL OR ended_at_ms >= started_at_ms)
);
CREATE INDEX task_actual_time_by_task ON task_actual_time_sessions(task_id, started_at_ms, id);
CREATE UNIQUE INDEX task_actual_time_single_active
    ON task_actual_time_sessions((1)) WHERE ended_at_ms IS NULL;
```

Required semantics: only one globally active row; many completed segments per one-off Task;
completed segments immutable; Task delete cascades sessions; unique Start operation identity;
non-negative epoch milliseconds; end at or after start. **The partial unique index is the
authoritative concurrency defense.**

No recurring subject column, pause state, manual adjustment or history column, snapshot, analytics
aggregate, timer setting, or telemetry column is added.

## 3. Clock authority

Rust owns persisted Start and Stop timestamps as UTC epoch milliseconds from `SystemTime`.
`Instant` is never persisted or serialized. Frontend `Date.now()` is presentation only.

An active session measures wall-clock elapsed time from explicit Start to explicit Stop, **including
app close and reopen, backgrounding, and machine sleep**. There is no idle subtraction.

If the authoritative Stop time is earlier than `started_at_ms`, Stop is rejected with a clear
clock-change error; the duration is never clamped, fabricated, or mutated; the session stays active;
and **Discard current segment** remains available. Forward clock movement is ordinary wall-clock
behaviour and gets no correction heuristic.

## 4. Session lifecycle

```text
MAX_ACTUAL_TIME_SESSIONS_PER_TASK = 10_000
```

**Start** requires an existing one-off Task, no current evaluation for it, no other active session,
a valid `operation_id`, and a session count below the bound. Start resolves `start_operation_id`
replay first, ensures the replay belongs to the same Task, validates Task, evaluation, and
global-active state, reads authoritative Rust time, and inserts one active segment transactionally.
The same operation retried returns the same session. Another Task already active is rejected;
the running session is **never** auto-stopped or switched.

**Stop** targets the exact active `session_id`. Rust supplies `ended_at_ms`, the segment remains
stored, repeated Stop of the same completed session returns the same result, and Stop never starts
another session.

**Start again** — there is no persisted pause state. After Stop, Start creates a new segment. Total
actual time is the checked sum of completed segments plus the current active interval when present.

**Discard** applies only to the currently active segment: it removes that segment, which then
contributes zero time. Completed segments can never be edited or deleted.

## 5. Interaction with existing semantics

**Evaluation** — a one-off Task with an active session cannot be evaluated; this is enforced inside
the Rust evaluation transaction. The UI explains: *"Stop or discard the running timer before
assessing this task."* A currently evaluated Task cannot Start; undoing its evaluation re-enables
Start. Actual time never chooses or changes completion state.

**Task edit and delete** — ordinary edits while active are allowed and the session stays attached by
stable Task ID. Deleting a Task while its session is active is rejected. After Stop or Discard,
existing delete behaviour applies and `ON DELETE CASCADE` removes the actual-time history.

**Recurrence** — no actual-time mutation or projection attaches to recurring occurrences, and
split, cancel, and archive behaviour is untouched.

## 6. Commands and projection

Rust DTOs are canonical; TypeScript is generated and never hand-edited.

```text
get_active_task_actual_time   start_task_actual_time
stop_task_actual_time         discard_task_actual_time
```

`TaskActualTimeView` carries total completed seconds, completed session count, and optional active
session id and start. `ActiveTaskActualTimeView` carries session id, task id, title, local date,
`started_at_ms`, and completed seconds before the active segment.

Start input is `task_id` + `operation_id`. Stop and Discard use the exact `session_id`.

`TodayItemView` gains optional actual-time state: populated for one-off rows, `None` for recurring.
All one-off totals for the viewed date load in bounded batches with **no per-row session query**. A
separate active-session query is kept because the active Task may belong to another viewed date.

Calendar, Search, Saved View predicate AST, Focus Plan, Life, deadline, and recurring DTOs gain no
actual-time semantics.

## 7. Today UI

Integration is confined to the existing Today workspace. No new route, sidebar destination, or
global-shell timer.

A one-off row offers `Start` when idle and unevaluated, `Stop` while it owns the active session, and
an explicit unavailability reason when evaluated; cumulative actual time appears only when non-zero.
The existing planned-time column is unchanged. A recurring row offers no control.

While a session runs, Today shows one compact strip with the Task title, its scheduled date, an
elapsed counter, Stop, and Discard. The strip remains visible while navigating dates inside Today.

Rendering uses exactly one frontend 1 Hz interval, only while a session is active. Display is
derived from `started_at_ms` and `Date.now()`, never from an incremented local counter; the interval
is cleaned up immediately when inactive; after throttling or refocus the current wall time is
re-derived directly. There is no 1 Hz backend polling.

The counter uses `role="timer"`. Start, Stop, and Discard feedback may use a polite status region,
and **individual ticks are never announced**. Keyboard parity, descriptive names, non-colour-only
running state, deterministic focus after mutation, once-only error announcement, and zero applicable
axe violations are required. No sound, notification, vibration, reminder, focus-mode takeover, or
animation dependency.

## 8. Backup, restart, recovery

Active sessions survive ordinary app close and reopen using the same persisted `started_at_ms`; no
shutdown hook stops them.

**Full backup creation is blocked while any session is active**, with the Rust-owned error *"Stop or
discard the running task timer before creating a backup."* Otherwise restoring a historical snapshot
could reinterpret backup and restore downtime as worked time. Closed session history is canonical
SQLite data and round-trips exactly, and a schema-25 backup restores and migrates to 26 with zero
actual-time rows.

A failed Start creates no row; a failed Stop or Discard leaves the active row unchanged; reopen
never invents or closes a session; `PRAGMA foreign_key_check` stays clean.

## 9. Hard exclusions

No recurring actual time, manual time entry, editing or deletion of completed segments, automatic
task switching, schedule-triggered auto Start or Stop, idle detection, keyboard/mouse/app/window/
process monitoring, screenshots or surveillance, Pomodoro/focus/break tracking, billing, timesheets,
CSV or export, per-project reporting, Actual Time in Calendar/Search/Saved Views/Focus Plan/Life,
Analytics actual-time aggregation, category goal or streak formula changes, scoring, prediction,
notifications, reminders, sounds, new dependency, capability, route, or sidebar item, or Task 44
work.

Analytics remains unchanged. Task 43 captures trustworthy source data only; it does not redefine
Analytics semantics.
