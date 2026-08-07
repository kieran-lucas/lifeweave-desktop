# Task 43 / Slice 033 — Explicit Actual Time Sessions closure evidence

## Baseline and commits

```text
activation baseline           ec2ae86417d7e65315582c808250b33009ebf1c3
activation commit             8bb7182e47a62f6265e06e947c14d30f4477df71
implementation                d61efb17d0c76dea67b557664623ceb7efac5275
native evidence               b4510ddbffbd0e8c4d5ae84213973b723df4cbad
product checkpoint            b4510ddbffbd0e8c4d5ae84213973b723df4cbad
closure commit                289f3e3b964721797a48ec92cc86ff47134da5e9
Task 42 feature checkpoint    9c5d0cfb6c5e64ba7a5acfd23464e6a8474954b9
schema                        25 → 26
```

The activation commit contains only ADR 0037, the Slice 033 package, and governance surfaces — no
product code. The product checkpoint is the first commit whose tree passes every gate including the
full 23-phase native suite; product code was last changed at `d61efb1`, and `b4510dd` adds only the
phase 14 specs, their support module, and the runner registration.

## Delivered semantics

Manual, stopwatch-style actual time for **one-off Tasks only**. The user explicitly starts work, may
stop and later start again, and each completed interval persists as an immutable segment. Exactly
one session is active globally.

- **Independence.** Schedule edits never rewrite recorded time; actual time may be shorter or longer
  than planned; conflict rules are untouched; and it never completes, evaluates, or scores a Task.
- **Clock.** Rust owns UTC epoch-millisecond timestamps from `SystemTime`. `Instant` is never
  persisted or serialized. Elapsed time is wall-clock **by design** — app close and reopen,
  backgrounding, and machine sleep all count — with no idle subtraction and no correction heuristic.
- **Backwards clock.** If the authoritative stop time precedes the recorded start, Stop is rejected,
  the row is left active and unmodified, and Discard remains available. Nothing is clamped or
  fabricated.
- **No surveillance.** No idle detection, no keyboard, mouse, window, or process monitoring, no
  screenshots, and no automatic start, stop, or task switching. The user is the only thing that
  starts a timer.

Recurring Tasks are excluded structurally, not by convention: a session can only reference
`tasks.id`, so a recurring occurrence — identified by `series_id + original_local_date`, and given a
new series identity by `ThisAndFuture` — cannot own one.

## Migration 26

`src-tauri/src/infrastructure/sqlite/task43_migration.rs` adds exactly one table and two indexes,
append-only, in one transaction. Migrations 1–25 are untouched.

```sql
CREATE TABLE task_actual_time_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    start_operation_id TEXT NOT NULL UNIQUE,
    started_at_ms INTEGER NOT NULL CHECK(started_at_ms >= 0),
    ended_at_ms INTEGER CHECK(ended_at_ms IS NULL OR ended_at_ms >= started_at_ms));
CREATE INDEX task_actual_time_by_task ON task_actual_time_sessions(task_id, started_at_ms, id);
CREATE UNIQUE INDEX task_actual_time_single_active
    ON task_actual_time_sessions((1)) WHERE ended_at_ms IS NULL;
```

The partial unique index over a constant expression is the **authoritative** single-active defense,
verified in SQLite 3.50 before the schema was designed around it: it admits one row satisfying
`ended_at_ms IS NULL` and leaves closed rows unconstrained. A test inserts a second active row
directly, bypassing the Rust pre-check entirely, and the database refuses it.

Five migration tests prove: fresh and schema-25 databases reach 26 exactly once and idempotently;
existing data survives; the table has exactly the five specified columns and no pause, adjustment,
recurring-subject, snapshot, aggregate, or telemetry column; the `CASCADE` foreign key, both index
definitions, and the partial predicate; non-negative start and end-at-or-after-start rejection;
unique start-operation identity across the same and different tasks; delete cascading only the
owning task's history; a too-new database refused without creating the table; and a clean
`PRAGMA foreign_key_check`.

## Test evidence

All figures are executed results.

```text
cargo test --locked -- --test-threads=1      712 passed, 0 failed, 4 ignored (716 total)
  task::actual_time                           22 passed
  task43_migration                             5 passed
  infrastructure::backup                     150 passed (148 before, +2 actual-time guards)
cargo fmt -- --check                          clean
cargo clippy --all-targets --all-features     clean, -D warnings, no suppression added
pnpm test                                    658 passed, 45 files (633 before, +25)
pnpm typecheck                                clean
pnpm build                                    success
pnpm verify                                   all six gates pass
pnpm hardening:performance                    violations: []
pnpm tauri build                              installer produced
pnpm e2e:windows                              23 passed, 0 failed (all phases, first run)
RUST_TEST_THREADS=1 pnpm hardening:rc         candidate core-rc-d61efb1
  document                                     35 passed
  infrastructure::backup                      150 passed
  narrative                                    62 passed
  portable::service::tests::                   11 passed
  life_branch::                                72 passed
  task::actual_time                            22 passed   (selector added by Task 43)
  task::                                      122 passed
  schema reopen sessions                        2 x 25s, no panic/CSP/ACL/corruption
  installer sha256    e5ddbb3192e33b3b20a62132eb3e10745248fbc348188ebf977d13987a6a1ba5
```

The 22 session tests cover Start persisting one active segment; same-operation replay both while
running and after Stop; operation reuse against another Task refused; a second Task refused without
auto-stopping the first; the database refusing a forced second active row; Stop using the
authoritative clock and repeating stably without extending the segment; a backwards clock rejected
with the row left untouched and Discard still available; Discard limited to the active segment and
refused for a completed one; many segments accumulating with checked arithmetic while a running
segment is never folded into the completed total; the 10,000-session bound; an evaluated Task unable
to Start and undo re-enabling it; a running timer blocking assessment and Stop clearing the
obstruction; a running timer blocking delete and Stop restoring cascade delete; a reschedule and
retitle leaving the session attached with its original start; the active query surfacing a timer
scheduled on a different date; batched totals loaded in one grouped indexed query; a recurring
subject being impossible at both the service and schema level; and an active session surviving a
real database close and reopen with a later Stop recording the whole wall-clock interval.

**Backup**: a running timer refuses backup creation before the staging directory is created — the
test asserts the backups directory listing is unchanged — and stopping restores ordinary behaviour.
Closed segments survive backup → delete the owning Task → restore → reopen with byte-identical
totals, no resurrected active session, and a clean foreign-key check.

**Frontend**: 25 new tests cover elapsed derivation and formatting; no interval registered while
inactive; ticking and full teardown of interval, `focus`, and `visibilitychange` listeners; teardown
the moment a session stops; StrictMode balance; the strip naming task, date, and elapsed time; a
clock jump proving elapsed derives from the timestamp rather than the tick count; the combined total
appearing only when earlier segments exist; **no `aria-live` anywhere near the counter**; Stop and
Discard including the disabled in-flight state; Start offered on an unevaluated one-off and never on
a recurring row; start payload identity; Stop and the strip appearing together; the strip surviving
date navigation; cumulative display only when non-zero; evaluated and other-timer-running rows
disabled with explicit reasons; assessment blocked with a named reason; Stop and Discard invalidating
both caches; a single alert on failure; and axe zero violations.

## Two defects found and fixed during implementation

Both were found by running the existing suite, not by the new tests, and both are recorded because
they changed the shipped code:

1. **The guards initially failed closed on a pre-26 database.** `backup_db` and the evaluation and
   delete guards queried `task_actual_time_sessions` unconditionally, so any test or restored
   snapshot at an older schema errored — and the backup guard's `unwrap_or(true)` turned that into a
   refusal to back up at all. All read paths now treat a missing session table as "no timer
   running", which is factually what an older database means, while genuine query failures still
   propagate.
2. **Two buttons shared one accessible name.** With a session running, the row Stop and the strip
   Stop were both named "Stop timer", and every idle row was named "Start timer". Row controls are
   now named per task (`Start timer for …`, `Stop timer for …`), which the tests then followed.

## Performance

Measured over three independent builds with byte-identical normalized inventories.

```text
                     start (ec2ae86)   Task 43 final   delta   authorized
chunks                       20              21          +1        —
total raw JS          1,199,082       1,204,073      +4,991    20,480
deterministic gzip      368,463         370,223      +1,760     7,168
startup raw JS          545,679         549,642      +3,963     4,096
index.js                515,537         519,500          —    535,000 (locked)
```

**The first honest measurement breached the startup allowance**: an inline active-timer strip cost
**+4,349** startup raw against the authorized 4,096. Rather than widen the budget, the strip — which
only renders while a session is actually running — was moved behind a `lazy()` boundary, emitting
`ActiveTimerStrip.js` at 1,034 raw bytes and bringing startup raw to +3,963. No budget was inflated
and no locked ceiling changed.

`docs/audits/task-43-performance-{budgets,baseline}.json` supersede the Task 42 files, which remain
byte-identical historical evidence, and `DEFAULT_BUDGET` was repointed.

**Correction to Task 42 evidence.** `docs/audits/task-42-performance-budgets.json` carried
`measured_at_commit: "PENDING_CHECKPOINT"` — a placeholder left unfilled at Task 42 closure. It is
now set to the real Task 42 checkpoint `9c5d0cf`. This fills in a value that was always meant to be
the checkpoint SHA; no measurement changed.

## Native Windows E2E

```text
e2e-tests/specs/phase14-actual-time.e2e.ts
e2e-tests/specs/phase14-actual-time-restart.e2e.ts
e2e-tests/support/actualTime.ts
```

Both registered in `$allPhases` (21 → 23 phases). Fixtures — two one-off Tasks and one recurring
series — are built through established raw IPC; every Start, Stop, and assessment under test runs
through the product UI.

Phase 14 starts the first one-off, proves the recurring row exposes no timer control, proves the
second one-off cannot become concurrently active, proves assessment is refused while the timer runs,
and **leaves the session running**. Phase 14 restart — reached across a real process restart —
proves the same session is still active, stops it through the UI, asserts a non-zero recorded total
and idle state, assesses through the UI, and proves Start is then unavailable.

**The first deliberate break exposed a real gap in my own phase.** Removing the global-active
pre-check from `start_at` left phase 14 green, because the phase only asserted that the second row's
Start button was *disabled* — a frontend guarantee. The phase now also drives the command directly
and asserts the refusal message, and with that in place the same break fails it. Two harness details
were needed to get there: WebDriver corrupts its response when an async `browser.execute` rejects,
so the call is kicked off synchronously with both outcomes handled in-page and the result read back
afterwards; and the week strip's locale-formatted day labels are reached by position via
`aria-current="date"` rather than by text.

**Defence in depth, observed.** Under that break the concurrent Start was *still* refused — by the
`task_actual_time_single_active` partial unique index rather than by the Rust pre-check. The phase
failed only because the specific guard message was gone, which is exactly the intended layering: the
database, not the service layer, is the authoritative defense.

**Disclosed limitation.** The suite provides exactly one process boundary per phase pair, so the
final "closed total and assessment persist" check is a webview reload inside the restart phase
rather than a second process restart. Process-level durability is covered separately by the Rust
test that closes and reopens a real database file.

```text
pnpm e2e:windows -- phase14-actual-time.e2e.ts   1 passing
pnpm e2e:windows                                23 passed, 0 failed
```

All 23 phases passed on the first full run.

## Integrity state

```text
schema                     25 → 26 (one append-only migration, one table, two indexes)
released migrations 1–25   unedited
dependencies               unchanged (Cargo.toml, Cargo.lock, package.json, pnpm-lock.yaml)
.github/workflows/         unchanged
.github/WORKFLOW_SEAL      unchanged
Tauri capabilities         +4 allow-* command permissions, no OS or plugin authority
generated bindings         regenerated by cargo test, never hand-edited
Analytics                  unchanged; sessions deliberately do not bump the source revision
Calendar / Search / Saved Views / Focus Plan / Life   unchanged
routes / sidebar           unchanged; integration is Today-only
Task 44                    unstarted, unallocated, unrecommended
```

New IPC surface, registered identically and in the same order across `lib.rs` `generate_handler!`,
`build.rs`, and `capabilities/main.json`:

```text
get_active_task_actual_time   start_task_actual_time
stop_task_actual_time         discard_task_actual_time
```

`TodayItemView` gains one optional field, populated for one-off rows and `None` for recurring ones.
No backend poller or background timer exists; the only recurring work is a single frontend 1 Hz
interval that runs solely while a session is active.

## Residual risk

- Native Windows E2E remains the least deterministic surface in this repository. Per
  `AI_CONSTITUTION.md` §7, a harness failure that does not reproduce a product invariant violation is
  disclosed verification debt rather than a product defect.
- Wall-clock semantics mean a forgotten running timer accrues time indefinitely. That is the
  specified behaviour; Discard exists precisely so an accidental or abandoned segment can be removed
  without touching recorded history.
