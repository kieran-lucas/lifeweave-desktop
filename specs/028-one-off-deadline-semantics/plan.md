# Task 38 Execution Plan

## Phase 0 — Safety and activation

1. Confirm `main`, a clean tree, and parity with `origin/main`.
2. Record the activation baseline `954b596677c34dd20ce3d0807d36b20676114f2b` and schema 21.
3. Create this slice packet.
4. Set `active_spec` to `specs/028-one-off-deadline-semantics` and `next_action` to
   `implement_active_spec`.
5. Mark Task 38 active in `docs/STATUS.md`, `docs/ROADMAP.md`, `START_HERE.md`, and
   `docs/AI_PROJECT_HANDOFF.md`.
6. Keep Task 39 prohibited and unrecommended.

**Gate:** `pnpm verify` passes before any product code changes.

## Phase 1 — Persistence

Add `src-tauri/src/infrastructure/sqlite/task38_migration.rs` declaring
`TASK38_SCHEMA_VERSION = 22`. Chain it after the Task 37 entry point and gate on a stored schema
of exactly 21. Add `tasks.deadline_local_date` with a date-shape constraint and a partial index
supporting bounded non-null range retrieval. Repoint the application, backup lifecycle, restore,
and test entry points at the Task 38 module.

**Gate:** fresh and upgrade paths reach 22 once, are idempotent, keep migrations 1–21 unedited,
and leave recurring, override, and evaluation tables without a deadline column.

## Phase 2 — Domain and mutation

Add the deadline state type and pure state/conflict functions beside the existing date
validator. Persist and validate the deadline in one-off create and update, project it in the
single-task and per-date reads, and pass an explicit observed local date into the projections
that previously carried only the viewed date. Leave every recurring path untouched.

**Gate:** every mutation, independence, and state acceptance row has a passing deterministic
test, including leap-day and boundary cases.

## Phase 3 — Deadline queue

Add a dedicated queue projection module with its own truthful DTOs rather than overloading the
schedule-based planning projection. Implement the inclusive anchor window, the evaluation and
recurring exclusions, the three groups, deterministic ordering, and the explicit item cap.
Reuse the existing batched category, Life, Focus Plan, and tag loaders.

**Gate:** window edges, exclusions, ordering, and the cap are proven, and no query runs inside a
per-item loop.

## Phase 4 — Surfaces

Project deadline context on Today, Upcoming, and existing Overdue rows. Compose Search result
context at query time from the observed local date so state can never go stale, and validate the
observed date that Search already receives. Confirm the Calendar selected-day surface inherits
context without changing month aggregation.

**Gate:** existing Overdue, Calendar aggregation, and Search navigation are provably unchanged.

## Phase 5 — Contract surface

Add the queue command and the observed-date parameters, register commands consistently across
the handler, build manifest, and capability, and regenerate TypeScript bindings from the
canonical generator.

**Gate:** `python scripts/verify_security.py` passes and generated bindings and permission files
are consistent and unedited by hand.

## Phase 6 — Frontend

Add the labelled deadline input to the existing Task editor with its recurring boundary, add
compact deadline text to one-off rows, extend the workspace tablist with a fourth tab, and add
the bounded queue panel with navigation to the scheduled date.

**Gate:** frontend typecheck, focused tests including accessibility assertions, and the
production build pass.

## Phase 7 — Verification

Run the full deterministic verification set, capture migration, reopen, backup/restore, and
Search rebuild evidence, and audit the complete diff from the activation baseline for recurring
leakage, redefined Overdue semantics, N+1 risk, dependency and lockfile drift, workflow and seal
integrity, and Task 39 scope.

**Gate:** one primary structured review returns no confirmed P0/P1 finding.

## Phase 8 — Closure

- record ADR 0032;
- move deadline semantics out of the open and deferred registers;
- close Task 38 and Slice 028;
- set latest feature task 38 and the Task 38 product checkpoint;
- set schema 22;
- set active spec null and next action Product Owner gate;
- keep `recommended_next_candidate` null and Task 39 unstarted;
- run final governance;
- commit and push to `main` without force;
- report the final remote SHA.
