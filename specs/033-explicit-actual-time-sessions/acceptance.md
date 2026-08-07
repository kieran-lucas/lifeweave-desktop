# Task 43 Acceptance Mapping

Status: CLOSED — executable evidence is recorded in
`docs/audits/task-43-explicit-actual-time-sessions.md`.

## Session model

- [x] One-off actual time is explicitly user-started; nothing starts a timer automatically.
- [x] Only one session can be active globally, enforced by the partial unique index.
- [x] Completed segments are persisted and immutable; they cannot be edited or deleted.
- [x] Start retries with the same operation identity return the same session; reuse against another Task fails.
- [x] Stop and repeated Stop of the same completed session are stable and idempotent.
- [x] Discard removes only the currently active segment, which then contributes zero time.
- [x] Multiple sessions accumulate with checked arithmetic; the 10,000-session bound is enforced.

## Clock

- [x] Persisted timestamps are Rust `SystemTime` epoch milliseconds; `Instant` is never persisted or serialized.
- [x] Active elapsed survives ordinary app close and reopen using the same `started_at_ms`.
- [x] App close and machine sleep count as wall-clock elapsed by design, with no idle subtraction.
- [x] A backwards clock rejects Stop without clamping, fabricating, or mutating the row, and Discard remains available.

## Existing semantics

- [x] Schedule edits never rewrite recorded actual time.
- [x] A Task with an active session cannot be evaluated; the message names the timer.
- [x] An evaluated Task cannot Start until its evaluation is undone; undo re-enables Start.
- [x] Actual time never chooses or changes completion state.
- [x] A Task with an active session cannot be deleted; after Stop, delete cascades its history.
- [x] Ordinary edits while a session is active preserve the session by stable Task ID.
- [x] Recurring actual time is absent: no recurring session row, control, or projection exists, and recurrence semantics are unchanged.

## Projection, UI, and accessibility

- [x] Today one-off totals and running state load with no per-row session query.
- [x] The active-session query is independent of the viewed date and surfaces a timer scheduled elsewhere.
- [x] No Rust background timer or poller exists; there is no 1 Hz backend polling.
- [x] Exactly one frontend 1 Hz interval exists, only while a session is active, and is cleaned up immediately when inactive.
- [x] Elapsed display is derived from `started_at_ms` and `Date.now()`, proven by a clock jump rather than tick counting.
- [x] The active strip survives date navigation inside Today.
- [x] Screen readers are not spammed: individual ticks are never announced.
- [x] Keyboard parity, accessible names, non-colour-only running state, deterministic focus, and zero applicable axe violations.

## Backup and durability

- [x] An active timer blocks full backup creation before publication.
- [x] Closed sessions survive backup, mutation or delete, restore, and reopen exactly.
- [x] A schema-25 backup restores and migrates to 26 with zero actual-time rows.
- [x] Backup and restore never fabricate elapsed time.
- [x] A failed Start creates no row; a failed Stop or Discard leaves the active row unchanged; reopen never invents or closes a session.

## Migration and governance

- [x] Fresh and schema-25 databases reach schema 26 exactly once and idempotently.
- [x] Migrations 1–25 are unchanged and the table has exactly the specified columns, checks, foreign key, and indexes.
- [x] A too-new database is refused without writes and `PRAGMA foreign_key_check` stays clean.
- [x] Analytics, Calendar, Search, Saved Views, Focus Plan, and Life semantics are unchanged.
- [x] No surveillance capability of any kind exists.
- [x] No dependency, workflow, seal, route, sidebar, or Tauri capability expansion beyond the four command permissions.
- [x] Performance stays inside the authorized envelope with no inflated budget.
- [x] Native phases pass through accessible UI and are proven load-bearing by a reverted deliberate break.
- [x] All gates pass, Task 44 remains unstarted, `HEAD == origin/main`, and the worktree is clean.
