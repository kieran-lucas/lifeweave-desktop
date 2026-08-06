# Task 37 Execution Plan

## Phase 0 — Safety and activation

1. Confirm `main`, clean tree, and parity with `origin/main`.
2. Record the activation baseline `82b055fe15d4997daf083bf777e9ef78c1f92bb6` and schema 20.
3. Create this slice packet.
4. Set `active_spec` to `specs/027-focus-plan-task-review` and `next_action` to
   `implement_active_spec`.
5. Mark Task 37 active in `docs/STATUS.md`, `docs/ROADMAP.md`, `START_HERE.md`, and
   `docs/AI_PROJECT_HANDOFF.md`.
6. Keep Task 38 prohibited and unrecommended.

**Gate:** `pnpm verify` passes before any product code changes.

## Phase 1 — Persistence

Add `src-tauri/src/infrastructure/sqlite/task37_migration.rs` declaring
`TASK37_SCHEMA_VERSION = 21`. Chain it after the Task 36 entry point and gate on a stored
schema of exactly 20. Apply a nullable `focus_plan_id` foreign key to `tasks` and
`task_series` with supporting indexes, following migration 16, and create
`focus_plan_reviews` with a bounded newest-first history index. Repoint the application,
backup lifecycle, restore, and test entry points at the Task 37 module. Generalise released
migration discovery in `scripts/check_project_state.py` so schema 21 validates.

**Gate:** fresh and upgrade paths reach 21 once, are idempotent, keep migrations 1–20
unedited, and leave occurrence, override, and evaluation tables without a Plan column.

## Phase 2 — Domain authority

Add `validate_focus_plan_target` beside `validate_life_target`. Persist and validate
`focus_plan_id` in one-off create and update and in recurring series creation. Implement the
three edit scopes exactly: reject occurrence-scope changes, set series authority absolutely
for entire-series edits, and carry the supplied value onto the new series during a
this-and-future split while leaving the old series relation untouched.

**Gate:** every recurrence-authority and one-off relationship acceptance row has a passing
deterministic test.

## Phase 3 — Projection and reviews

Add a batched Plan lookup mirroring `life_area_map` and wire it into the per-date list,
occurrence projection, Today, and planning projections. Parameterise the existing related-work
core by owner so Focus Plan linked work reuses bulk override loading and deterministic
ordering. Add review creation with `operation_id` idempotency and bounded newest-first review
listing.

**Gate:** no new N+1 SQL, bounded queries everywhere, and review persistence proven across
reopen and backup/restore.

## Phase 4 — Contract surface

Add the relationship and review DTOs, four thin Tauri commands, and matching entries in
`generate_handler!`, `build.rs`, and the main capability. Regenerate TypeScript bindings from
the existing export tests.

**Gate:** `python scripts/verify_security.py` passes and generated bindings are consistent and
unedited by hand.

## Phase 5 — Frontend

Add a Focus Plan combobox modelled on the Life area combobox and wire it into the existing
Task editor with scope-correct behaviour. Add Focus Plan context to Today, Upcoming, and
Overdue rows with navigation to the exact Plan. Add `navigateToFocusPlan` using the existing
entry-request envelope. Add bounded Linked work and Reviews regions to Focus Plan detail.

**Gate:** frontend typecheck, focused tests including accessibility assertions, and the
production build pass.

## Phase 6 — Verification

Run the full deterministic verification set, capture migration, reopen, and backup/restore
evidence, and audit the complete diff from the activation baseline for scope, workflow seal,
dependencies, generated files, and every hard exclusion.

**Gate:** one independent read-only review covering domain ownership, migration and data
safety, recurrence splitting, and scope drift returns no confirmed P0/P1 finding.

## Phase 7 — Closure

- record ADR 0031;
- move Task 37 out of the deferred register;
- close Task 37 and Slice 027;
- set latest feature task 37 and the Task 37 product checkpoint;
- set schema 21;
- set active spec null and next action Product Owner gate;
- keep `recommended_next_candidate` null and Task 38 unstarted;
- run final governance;
- commit and push to `main` without force;
- report the final remote SHA.
