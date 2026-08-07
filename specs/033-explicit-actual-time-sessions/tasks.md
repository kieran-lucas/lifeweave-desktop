# Task 43 Work Breakdown

Unchecked entries are unfinished work and this file is the resumable execution ledger.

## A. Activation

- [x] T43-A01 confirm clean main, baseline `ec2ae86`, remote parity, and workflow-seal identity;
- [x] T43-A02 read authority and localize Task/evaluation/Today/backup/migration owners;
- [x] T43-A03 verify the partial unique index enforces one active row before designing around it;
- [x] T43-A04 confirm `actual-time semantics` is OPEN and no authority forbids explicit timers;
- [x] T43-A05 create Slice 033 and ADR 0037;
- [x] T43-A06 measure the clean production bundle inventory before any product change
      (20 chunks, 1,199,082 raw, 368,463 deterministic gzip, 515,537 `index.js`, 545,679 startup raw);
- [x] T43-A07 activate Project State and synchronize governance surfaces;
- [x] T43-A08 pass activation governance and commit activation with no product code.

`database_schema_version` stays 25 at activation because `scripts/check_project_state.py` derives it
from the highest released migration source; it becomes 26 in the implementation commit.

## B. Migration 26

- [x] T43-B01 add `task43_migration.rs` with one table and two indexes, append-only;
- [x] T43-B02 prove fresh and schema-25 databases reach 26 exactly once and idempotently;
- [x] T43-B03 prove exact columns, checks, foreign key, and both index definitions;
- [x] T43-B04 prove one active row maximum, many closed rows, and unique start operation identity;
- [x] T43-B05 prove Task delete cascades sessions and `PRAGMA foreign_key_check` stays clean;
- [x] T43-B06 prove a too-new database is refused without writes;
- [x] T43-B07 rewire the migration chain head through startup and backup compatibility.

## C. Rust session authority

- [x] T43-C01 add `task/actual_time.rs` with the bound, epoch-ms clock, and `*_at` test seam;
- [x] T43-C02 implement Start with replay-first resolution and same-Task enforcement;
- [x] T43-C03 implement Start validation: one-off, unevaluated, no other active, under bound;
- [x] T43-C04 implement Stop with authoritative clock and stable repeat;
- [x] T43-C05 reject Stop on a backwards clock without mutating the row;
- [x] T43-C06 implement Discard for the active segment only;
- [x] T43-C07 implement checked total accumulation across many segments;
- [x] T43-C08 prove the 10,000-session bound.

## D. Guards on existing behaviour

- [x] T43-D01 reject evaluation while a session is active, after the replay early-return;
- [x] T43-D02 prove undoing an evaluation re-enables Start;
- [x] T43-D03 reject deleting a Task while its session is active;
- [x] T43-D04 prove delete after Stop cascades the history;
- [x] T43-D05 prove ordinary edits while active preserve the session;
- [x] T43-D06 block full backup creation while any session is active, before publication;
- [x] T43-D07 prove recurrence semantics and recurring rows are untouched.

## E. DTO, IPC, and Today projection

- [x] T43-E01 add actual-time DTOs and register four commands in handler, manifest, capability;
- [x] T43-E02 export canonical TypeScript bindings without hand-editing generated files;
- [x] T43-E03 add optional actual-time state to `TodayItemView` for one-off rows only;
- [x] T43-E04 batch-load one-off totals for the viewed date with no per-row query;
- [x] T43-E05 keep a separate global active-session query for out-of-date timers.

## F. Today UI

- [x] T43-F01 add one-off row Start/Stop controls and cumulative display;
- [x] T43-F02 add the active-session strip that survives date navigation;
- [x] T43-F03 add the single 1 Hz interval derived from `started_at_ms`, cleaned up when inactive;
- [x] T43-F04 add the assessment unavailability reason while a timer runs;
- [x] T43-F05 add frontend adapters and cache invalidation;
- [x] T43-F06 pass focused frontend behaviour, fake-clock, interval-cleanup, and axe tests.

Performance note: an inline active-timer strip measured +4,349 startup raw against the authorized
4,096. The strip only renders while a session is running, so it moved behind a `lazy()` boundary
rather than widening the budget; startup raw settled at +3,963.

## G. Native and performance evidence

- [ ] T43-G01 add phase 14 workflow and restart phases and register them in the phase list;
- [ ] T43-G02 prove both phases load-bearing by a deliberate break, then revert it;
- [x] T43-G03 add a `task::actual_time` selector to the release-candidate dogfood script;
- [x] T43-G04 record the final bundle inventory and truthful Task 43 versioned budget evidence.

## H. Gates and closure

- [x] T43-H01 run focused migration, Rust, binding, and frontend checks;
- [ ] T43-H02 run all broad governance, build, Rust, release, native, and RC gates;
- [ ] T43-H03 perform one full baseline diff review and fix confirmed in-scope findings;
- [ ] T43-H04 create the Task 43 product checkpoint commit;
- [ ] T43-H05 close all authority and evidence surfaces without allocating Task 44;
- [ ] T43-H06 run final governance and diff checks, commit closure, push, and confirm parity.
