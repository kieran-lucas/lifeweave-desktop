# Task 43 Execution Plan

Status: ACTIVE.

## Stage 0 — Activation and baseline

Confirm clean `main` and remote parity at `ec2ae86417d7e65315582c808250b33009ebf1c3`, record the
Task 42 feature checkpoint, read the authority surfaces, localize the Task/evaluation/Today/backup
owners, verify the partial unique index behaves as required before designing around it, create
Slice 033 and ADR 0037, activate Project State, synchronize governance surfaces, and pass activation
governance with no product code in the commit.

## Stage 1 — Migration 26

Add `task43_migration.rs` creating exactly one table and two indexes, chain-guarded on schema 25 and
committed in one transaction, without editing migrations 1–25. Rewire the chain head through
startup and backup compatibility. Prove the single-active invariant, the cascade, the unique start
operation identity, idempotence, and too-new safety before any product code depends on them.

## Stage 2 — Rust session authority

Add `task/actual_time.rs` owning Start, Stop, Discard, replay resolution, the global-active check,
the per-task bound, and checked duration sums. Timestamps come from `SystemTime` epoch milliseconds
through public functions, with `*_at` variants taking an injected `now_ms` for deterministic tests,
mirroring the existing `evaluate_at` seam. A backwards clock rejects Stop without mutating the row.

## Stage 3 — Guards on existing behaviour

Reject evaluation of a one-off Task with an active session inside the evaluation transaction, after
the replay early-return so a replayed evaluation is never blocked. Reject deletion of a Task whose
session is active. Reject full backup creation while any session is active, before any staging
directory is created so nothing is published. Leave recurrence untouched.

## Stage 4 — DTO, IPC, and batched Today projection

Register four commands across the handler, build manifest, and exact capability permissions, export
canonical TypeScript bindings through the accepted test-driven generator, and add the optional
actual-time field to `TodayItemView`. Load all one-off totals for a date in one grouped indexed
query, and keep the active-session query separate because the running Task may sit on another date.

## Stage 5 — Today UI

Add one-off row controls, an active-session strip that survives date navigation, and a single 1 Hz
interval that exists only while a session runs and always derives its display from the persisted
start timestamp. Extend the assessment control with an explicit unavailability reason. Keep the
planned-time column and row alignment unchanged, announce mutations but never ticks, and add no new
route or destination.

## Stage 6 — Evidence, performance, review, and closure

Prove the full Rust matrix, backup and restart durability, focused frontend behaviour and axe, and
two native Windows phases driven through accessible UI with one deliberate break shown load-bearing
and reverted. Measure the bundle across three builds against the authorized delta and record
truthful Task 43 versioned budget evidence. Run focused and broad gates, review the full baseline
diff once, fix confirmed in-scope defects only, create the product checkpoint, close every governance
surface without allocating Task 44, commit, push, and confirm clean parity.

## Stop conditions

Stop before broadening scope if the database or runtime cannot safely enforce one global active
session; if backup cannot reject an active-timer backup before publication; if evaluation or delete
integration would require redefining completion semantics; if higher repository authority
contradicts persisted wall-clock behaviour; if one-off-only actual time materially conflicts with
higher authority; if performance remains irreducibly over budget; or if a newer valid Task 43 or 44
allocation conflicts.

Helper, DTO, file, and binding names, and local Task or Today refactoring, are not stop conditions.
Do not broaden into recurring timers to avoid a stop.
