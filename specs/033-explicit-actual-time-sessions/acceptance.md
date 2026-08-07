# Task 43 Acceptance Mapping

Status: ACTIVE — executable evidence will be recorded in
`docs/audits/task-43-explicit-actual-time-sessions.md`.

## Session model

- [ ] One-off actual time is explicitly user-started; nothing starts a timer automatically.
- [ ] Only one session can be active globally, enforced by the partial unique index.
- [ ] Completed segments are persisted and immutable; they cannot be edited or deleted.
- [ ] Start retries with the same operation identity return the same session; reuse against another Task fails.
- [ ] Stop and repeated Stop of the same completed session are stable and idempotent.
- [ ] Discard removes only the currently active segment, which then contributes zero time.
- [ ] Multiple sessions accumulate with checked arithmetic; the 10,000-session bound is enforced.

## Clock

- [ ] Persisted timestamps are Rust `SystemTime` epoch milliseconds; `Instant` is never persisted or serialized.
- [ ] Active elapsed survives ordinary app close and reopen using the same `started_at_ms`.
- [ ] App close and machine sleep count as wall-clock elapsed by design, with no idle subtraction.
- [ ] A backwards clock rejects Stop without clamping, fabricating, or mutating the row, and Discard remains available.

## Existing semantics

- [ ] Schedule edits never rewrite recorded actual time.
- [ ] A Task with an active session cannot be evaluated; the message names the timer.
- [ ] An evaluated Task cannot Start until its evaluation is undone; undo re-enables Start.
- [ ] Actual time never chooses or changes completion state.
- [ ] A Task with an active session cannot be deleted; after Stop, delete cascades its history.
- [ ] Ordinary edits while a session is active preserve the session by stable Task ID.
- [ ] Recurring actual time is absent: no recurring session row, control, or projection exists, and recurrence semantics are unchanged.

## Projection, UI, and accessibility

- [ ] Today one-off totals and running state load with no per-row session query.
- [ ] The active-session query is independent of the viewed date and surfaces a timer scheduled elsewhere.
- [ ] No Rust background timer or poller exists; there is no 1 Hz backend polling.
- [ ] Exactly one frontend 1 Hz interval exists, only while a session is active, and is cleaned up immediately when inactive.
- [ ] Elapsed display is derived from `started_at_ms` and `Date.now()`, proven by a clock jump rather than tick counting.
- [ ] The active strip survives date navigation inside Today.
- [ ] Screen readers are not spammed: individual ticks are never announced.
- [ ] Keyboard parity, accessible names, non-colour-only running state, deterministic focus, and zero applicable axe violations.

## Backup and durability

- [ ] An active timer blocks full backup creation before publication.
- [ ] Closed sessions survive backup, mutation or delete, restore, and reopen exactly.
- [ ] A schema-25 backup restores and migrates to 26 with zero actual-time rows.
- [ ] Backup and restore never fabricate elapsed time.
- [ ] A failed Start creates no row; a failed Stop or Discard leaves the active row unchanged; reopen never invents or closes a session.

## Migration and governance

- [ ] Fresh and schema-25 databases reach schema 26 exactly once and idempotently.
- [ ] Migrations 1–25 are unchanged and the table has exactly the specified columns, checks, foreign key, and indexes.
- [ ] A too-new database is refused without writes and `PRAGMA foreign_key_check` stays clean.
- [ ] Analytics, Calendar, Search, Saved Views, Focus Plan, and Life semantics are unchanged.
- [ ] No surveillance capability of any kind exists.
- [ ] No dependency, workflow, seal, route, sidebar, or Tauri capability expansion beyond the four command permissions.
- [ ] Performance stays inside the authorized envelope with no inflated budget.
- [ ] Native phases pass through accessible UI and are proven load-bearing by a reverted deliberate break.
- [ ] All gates pass, Task 44 remains unstarted, `HEAD == origin/main`, and the worktree is clean.
